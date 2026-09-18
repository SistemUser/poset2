<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$dataDir = __DIR__ . '/../../data';
if (!file_exists($dataDir)) {
    @mkdir($dataDir, 0777, true);
}

$settingsFile = $dataDir . '/settings.json';
$productsFile = $dataDir . '/products.json';
$categoriesFile = $dataDir . '/categories.json';
$templatesFile = $dataDir . '/multiplier_templates.json';

/**
 * PHP 8.3 Safe JSON Reader with Shared OS Lock (LOCK_SH) and json_validate()
 */
function getDbData(string $file, array $default = []): array {
    if (!file_exists($file)) {
        return $default;
    }

    $fp = @fopen($file, 'rb');
    if (!$fp) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'error' => 'Veritabanı dosyası okuma için açılamadı.',
            'code' => 503
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!flock($fp, LOCK_SH)) {
        fclose($fp);
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'error' => 'Veritabanı okuma kilidi alınamadı (LOCK_SH).',
            'code' => 503
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $size = filesize($file);
    $content = $size > 0 ? fread($fp, $size) : '';

    flock($fp, LOCK_UN);
    fclose($fp);

    if (empty(trim((string)$content))) {
        return $default;
    }

    // PHP 8.3 json_validate() check
    $isValidJson = function_exists('json_validate') 
        ? json_validate((string)$content) 
        : (json_decode((string)$content) !== null);

    if (!$isValidJson) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Veritabanı JSON formatı geçersiz veya bozuk.',
            'code' => 400
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $decoded = json_decode((string)$content, true);
    return is_array($decoded) ? $decoded : $default;
}

/**
 * PHP 8.3 Atomic JSON Writer with Exclusive OS Lock (LOCK_EX) and Backup Creation
 */
function saveDbData(string $file, array $data): bool {
    $dir = dirname($file);
    if (!file_exists($dir)) {
        @mkdir($dir, 0777, true);
    }

    // Backup creation
    $backupDir = $dir . '/backups';
    if (!file_exists($backupDir)) {
        @mkdir($backupDir, 0777, true);
    }
    if (file_exists($file)) {
        @copy($file, $backupDir . '/' . basename($file) . '.bak');
    }

    $fp = @fopen($file, 'c+b');
    if (!$fp) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'error' => 'Veritabanı dosyası yazma için açılamadı.',
            'code' => 503
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'error' => 'Veritabanı özel yazma kilidi alınamadı (LOCK_EX).',
            'code' => 503
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $jsonString = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, $jsonString);
    fflush($fp);

    flock($fp, LOCK_UN);
    fclose($fp);

    return true;
}

function fetchCollectApiRate(string $apiKey = ''): ?float {
    $rateVal = null;
    $apiKey = !empty($apiKey) ? trim($apiKey) : '5FzmRhNGQrHuKmbf03PmYU:0lXeOca14Soi4nfEc81MH1';
    $cleanKey = (string)preg_replace('/^apikey\s+/i', '', $apiKey);

    if (!empty($cleanKey)) {
        $headers = [
            'Content-Type: application/json',
            'Authorization: apikey ' . $cleanKey
        ];
        $ctx = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $headers),
                'timeout' => 8
            ]
        ]);
        $raw = @file_get_contents('https://api.collectapi.com/economy/allCurrency', false, $ctx);
        if ($raw) {
            $json = @json_decode((string)$raw, true);
            if (isset($json['success']) && $json['success'] && isset($json['result']) && is_array($json['result'])) {
                foreach ($json['result'] as $item) {
                    if (isset($item['code']) && strtoupper((string)$item['code']) === 'USD') {
                        $rawRate = $item['selling'] ?? ($item['calculated'] ?? ($item['rate'] ?? null));
                        if ($rawRate) {
                            $rateVal = floatval(str_replace(',', '.', (string)$rawRate));
                            break;
                        }
                    }
                }
            }
        }
    }

    if (!$rateVal) {
        $ctx = stream_context_create(['http' => ['timeout' => 5]]);
        $raw = @file_get_contents('https://open.er-api.com/v6/latest/USD', false, $ctx);
        if ($raw) {
            $json = @json_decode((string)$raw, true);
            if (isset($json['rates']['TRY'])) {
                $rateVal = floatval($json['rates']['TRY']);
            }
        }
    }

    return $rateVal ? round($rateVal, 4) : null;
}

function autoUpdateRateIfExpired(array &$settings, string $settingsFile): void {
    if (isset($settings['rate_mode']) && $settings['rate_mode'] === 'manual') {
        return;
    }

    $lastTime = 0;
    if (!empty($settings['last_updated'])) {
        $dt = DateTime::createFromFormat('d.m.Y H:i:s', (string)$settings['last_updated']);
        if ($dt) {
            $lastTime = $dt->getTimestamp();
        }
    }

    if ((time() - $lastTime) >= 900) {
        $newRate = fetchCollectApiRate((string)($settings['collect_api_key'] ?? ''));
        if ($newRate && $newRate > 0) {
            $settings['usd_try_rate'] = $newRate;
            $settings['rate_mode'] = 'api';
            $settings['last_updated'] = date('d.m.Y H:i:s');
            saveDbData($settingsFile, $settings);
        }
    }
}

$defaultSettings = [
    'usd_try_rate' => 35.45,
    'rate_mode' => 'api',
    'collect_api_key' => '5FzmRhNGQrHuKmbf03PmYU:0lXeOca14Soi4nfEc81MH1',
    'last_updated' => date('d.m.Y H:i:s')
];

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? (string)$_GET['action'] : '';
$rawInput = file_get_contents('php://input');
$input = !empty($rawInput) ? json_decode((string)$rawInput, true) : [];

if ($action === 'refresh-rate') {
    $providedKey = isset($input['collect_api_key']) ? (string)$input['collect_api_key'] : '';
    $rateVal = fetchCollectApiRate($providedKey);

    if ($rateVal && $rateVal > 0) {
        $settings = getDbData($settingsFile, $defaultSettings);
        $settings['usd_try_rate'] = $rateVal;
        $settings['rate_mode'] = 'api';
        if (!empty($providedKey)) {
            $settings['collect_api_key'] = preg_replace('/^apikey\s+/i', '', trim($providedKey));
        }
        $settings['last_updated'] = date('d.m.Y H:i:s');
        saveDbData($settingsFile, $settings);

        echo json_encode([
            'success' => true,
            'fetched_rate' => $rateVal,
            'settings' => $settings,
            'message' => 'CollectAPI canlı döviz kuru başarıyla güncellendi.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(503);
    echo json_encode([
        'success' => false,
        'error' => 'CollectAPI servisinden yanıt alınamadı.',
        'code' => 503
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'settings') {
    if ($method === 'POST') {
        $current = getDbData($settingsFile, $defaultSettings);
        $newRate = isset($input['usd_try_rate']) ? floatval($input['usd_try_rate']) : $current['usd_try_rate'];
        $updated = [
            'usd_try_rate' => $newRate,
            'rate_mode' => isset($input['rate_mode']) ? (string)$input['rate_mode'] : 'manual',
            'collect_api_key' => isset($input['collect_api_key']) ? trim((string)$input['collect_api_key']) : ($current['collect_api_key'] ?? ''),
            'last_updated' => date('d.m.Y H:i:s')
        ];
        saveDbData($settingsFile, $updated);
        echo json_encode(['success' => true, 'settings' => $updated], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $settings = getDbData($settingsFile, $defaultSettings);
        autoUpdateRateIfExpired($settings, $settingsFile);
        echo json_encode($settings, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if ($action === 'products') {
    if ($method === 'POST') {
        $products = getDbData($productsFile, []);
        $newProd = is_array($input) ? $input : [];
        $maxSira = 0;
        foreach ($products as $p) {
            $s = intval($p['sira_no'] ?? 0);
            if ($s > $maxSira) $maxSira = $s;
        }
        $newProd['sira_no'] = $maxSira + 1;
        $rawPrice = $newProd['birim_fiyat'] ?? ($newProd['birim_fiyati'] ?? 0);
        $cleanPrice = is_numeric($rawPrice) ? floatval($rawPrice) : floatval(str_replace(',', '.', (string)$rawPrice));
        $finalPrice = is_nan($cleanPrice) ? 0.0 : $cleanPrice;
        $newProd['birim_fiyat'] = $finalPrice;
        $newProd['birim_fiyati'] = $finalPrice;
        $newProd['fiyat_aliniz'] = $finalPrice > 0 ? false : (isset($newProd['fiyat_aliniz']) ? (bool)$newProd['fiyat_aliniz'] : true);
        $products[] = $newProd;
        saveDbData($productsFile, $products);
        echo json_encode(['success' => true, 'product' => $newProd, 'products' => $products], JSON_UNESCAPED_UNICODE);
        exit;
    } elseif ($method === 'PUT') {
        $products = getDbData($productsFile, []);
        $targetSku = trim((string)($input['urun_kodu'] ?? ($input['sku'] ?? ($input['id'] ?? ''))));
        $foundIndex = -1;
        foreach ($products as $idx => $p) {
            $pCode = (string)($p['urun_kodu'] ?? ($p['sku'] ?? ($p['id'] ?? '')));
            if (strcasecmp(trim($pCode), $targetSku) === 0) {
                $foundIndex = $idx;
                break;
            }
        }
        if ($foundIndex === -1) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'HATA: Ürün bulunamadı -> ' . $targetSku], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $updatedProd = array_merge($products[$foundIndex], is_array($input) ? $input : []);
        $rawPrice = $updatedProd['birim_fiyat'] ?? ($updatedProd['birim_fiyati'] ?? 0);
        $cleanPrice = is_numeric($rawPrice) ? floatval($rawPrice) : floatval(str_replace(',', '.', (string)$rawPrice));
        $finalPrice = is_nan($cleanPrice) ? 0.0 : $cleanPrice;
        $updatedProd['birim_fiyat'] = $finalPrice;
        $updatedProd['birim_fiyati'] = $finalPrice;
        $updatedProd['fiyat_aliniz'] = $finalPrice > 0 ? false : (isset($input['fiyat_aliniz']) ? (bool)$input['fiyat_aliniz'] : true);

        $products[$foundIndex] = $updatedProd;
        saveDbData($productsFile, $products);
        echo json_encode(['success' => true, 'product' => $updatedProd, 'products' => $products], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $products = getDbData($productsFile, []);
        header('Cache-Control: no-store, no-cache, must-revalidate, private');
        echo json_encode($products, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if ($action === 'categories') {
    $defaultCategorySchemas = [
        [
            "id" => "cat-1",
            "name" => "E-TİCARET VE KARGO AMBALAJLARI",
            "units" => ["Adet"],
            "thickness" => "Mikron",
            "fields" => [ "kargo_bant" => true, "irsaliye_cebi" => true, "kulp" => false, "koruk" => true, "baski" => true ]
        ],
        [
            "id" => "cat-2",
            "name" => "PLASTİK POŞETLER",
            "units" => ["Kg", "Adet"],
            "thickness" => "Mikron",
            "fields" => [ "kargo_bant" => false, "irsaliye_cebi" => false, "kulp" => true, "koruk" => true, "baski" => true ]
        ],
        [
            "id" => "cat-3",
            "name" => "KAĞIT VE KARTON ÇANTALAR",
            "units" => ["Adet", "Kg"],
            "thickness" => "Gr/m²",
            "fields" => [ "kargo_bant" => false, "irsaliye_cebi" => false, "kulp" => true, "koruk" => true, "baski" => true ]
        ],
        [
            "id" => "cat-4",
            "name" => "BEZ VE TELA ÇANTALAR",
            "units" => ["Adet"],
            "thickness" => "Gr/m²",
            "fields" => [ "kargo_bant" => false, "irsaliye_cebi" => false, "kulp" => true, "koruk" => false, "baski" => true ]
        ],
        [
            "id" => "cat-5",
            "name" => "KORUYUCU VE ENDÜSTRİYEL AMBALAJ",
            "units" => ["Adet (Rulo)", "Kg (Bobin)"],
            "thickness" => "Mikron",
            "fields" => [ "kargo_bant" => false, "irsaliye_cebi" => false, "kulp" => false, "koruk" => false, "baski" => false ]
        ]
    ];

    $categories = getDbData($categoriesFile, $defaultCategorySchemas);
    if (empty($categories) || !is_array($categories) || (isset($categories[0]) && is_string($categories[0]))) {
        $categories = $defaultCategorySchemas;
        saveDbData($categoriesFile, $categories);
    }

    if ($method === 'POST') {
        $rawName = trim((string)($input['name'] ?? ''));
        if (empty($rawName)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Kategori adı zorunludur.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $cleanName = $rawName;
        foreach ($categories as $c) {
            $cName = is_array($c) ? ($c['name'] ?? '') : (string)$c;
            if (mb_strtolower($cName) === mb_strtolower($cleanName)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Bu kategori zaten mevcut.'], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }

        $slug = isset($input['slug']) && !empty($input['slug'])
            ? (string)$input['slug']
            : strtolower(preg_replace('/[^a-z0-9]/i', '-', $rawName));

        $newCat = [
            "id" => isset($input['id']) && !empty($input['id']) ? (string)$input['id'] : ("kat_" . time()),
            "name" => $cleanName,
            "slug" => $slug,
            "units" => isset($input['units']) && is_array($input['units']) && count($input['units']) > 0 ? $input['units'] : ["Adet"],
            "thickness_unit" => (string)($input['thickness_unit'] ?? ($input['thickness'] ?? "Mikron")),
            "thickness" => (string)($input['thickness'] ?? ($input['thickness_unit'] ?? "Mikron")),
            "default_moq" => isset($input['default_moq']) ? (int)$input['default_moq'] : 1000,
            "fields" => [
                "kargo_bant" => isset($input['fields']['kargo_bant']) ? (bool)$input['fields']['kargo_bant'] : false,
                "kulp" => isset($input['fields']['kulp']) ? (bool)$input['fields']['kulp'] : true,
                "koruk" => isset($input['fields']['koruk']) ? (bool)$input['fields']['koruk'] : true,
                "irsaliye_cebi" => isset($input['fields']['irsaliye_cebi']) ? (bool)$input['fields']['irsaliye_cebi'] : false,
                "baski" => isset($input['fields']['baski']) ? (bool)$input['fields']['baski'] : true,
            ],
            "allowed_materials" => isset($input['allowed_materials']) && is_array($input['allowed_materials']) ? $input['allowed_materials'] : []
        ];

        $categories[] = $newCat;
        saveDbData($categoriesFile, $categories);
        echo json_encode(['success' => true, 'categories' => $categories, 'category' => $newCat], JSON_UNESCAPED_UNICODE);
        exit;
    } elseif ($method === 'PUT') {
        $targetOldName = (string)($input['oldName'] ?? ($input['id'] ?? ''));
        $targetNewName = trim((string)($input['newName'] ?? ($input['name'] ?? '')));
        
        if (empty($targetNewName)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Yeni kategori adı zorunludur.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $previousName = $targetOldName;
        $foundIdx = -1;
        foreach ($categories as $idx => $c) {
            $cName = is_array($c) ? ($c['name'] ?? '') : (string)$c;
            $cId = is_array($c) ? ($c['id'] ?? '') : (string)$c;
            if ($cId === $targetOldName || $cName === $targetOldName) {
                $foundIdx = $idx;
                $previousName = $cName;
                break;
            }
        }

        if ($foundIdx !== -1 && is_array($categories[$foundIdx])) {
            $categories[$foundIdx]['name'] = $targetNewName;
            if (isset($input['units'])) $categories[$foundIdx]['units'] = $input['units'];
            if (isset($input['thickness'])) $categories[$foundIdx]['thickness'] = $input['thickness'];
            if (isset($input['fields'])) $categories[$foundIdx]['fields'] = $input['fields'];
        } else {
            $categories[] = [
                "id" => "cat-" . time(),
                "name" => $targetNewName,
                "units" => ["Adet"],
                "thickness" => "Mikron",
                "fields" => [ "kargo_bant" => false, "irsaliye_cebi" => false, "kulp" => true, "koruk" => true, "baski" => true ]
            ];
        }

        // CASCADE UPDATE products.json
        $products = getDbData($productsFile, []);
        $productsUpdated = false;
        if (!empty($previousName) && $previousName !== $targetNewName) {
            foreach ($products as &$p) {
                if (isset($p['urun_kategorisi']) && $p['urun_kategorisi'] === $previousName) {
                    $p['urun_kategorisi'] = $targetNewName;
                    $productsUpdated = true;
                }
            }
            unset($p);
            if ($productsUpdated) {
                saveDbData($productsFile, $products);
            }
        }

        saveDbData($categoriesFile, $categories);
        echo json_encode(['success' => true, 'categories' => $categories, 'products' => $products], JSON_UNESCAPED_UNICODE);
        exit;
    } elseif ($method === 'DELETE') {
        $targetParam = (string)($_GET['id'] ?? ($input['id'] ?? ($input['name'] ?? '')));
        $products = getDbData($productsFile, []);

        $targetName = $targetParam;
        foreach ($categories as $c) {
            if (is_array($c) && (($c['id'] ?? '') === $targetParam || ($c['name'] ?? '') === $targetParam)) {
                $targetName = $c['name'];
                break;
            }
        }

        $hasProducts = false;
        foreach ($products as $p) {
            if (isset($p['urun_kategorisi']) && $p['urun_kategorisi'] === $targetName) {
                $hasProducts = true;
                break;
            }
        }

        if ($hasProducts) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Bu kategoriye ait ürünler varken silinemez'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $filteredCats = [];
        foreach ($categories as $c) {
            $cName = is_array($c) ? ($c['name'] ?? '') : (string)$c;
            $cId = is_array($c) ? ($c['id'] ?? '') : (string)$c;
            if ($cName !== $targetName && $cId !== $targetParam) {
                $filteredCats[] = $c;
            }
        }
        $categories = array_values($filteredCats);
        saveDbData($categoriesFile, $categories);
        echo json_encode(['success' => true, 'categories' => $categories], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode($categories, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'multiplier-templates') {
    $defaultTemplates = [
        ["id" => "tpl-1", "title" => "Kargo Poşetleri Standart", "multiplierString" => "5k:1.00 / 10k:0.92 / 25k:0.85", "description" => "5k (Standart) - 10k (%8 İndirim) - 25k (%15 İndirim)"],
        ["id" => "tpl-2", "title" => "Mağaza Poşeti Kademe", "multiplierString" => "1k:1.00 / 5k:0.90 / 10k:0.82 / 25k:0.75", "description" => "1k (%0) - 5k (%10) - 10k (%18) - 25k (%25)"],
        ["id" => "tpl-3", "title" => "Karton Çanta / Özel", "multiplierString" => "500:1.00 / 1k:0.88 / 3k:0.80", "description" => "500 Adet (%0) - 1.000 (%12) - 3.000 (%20)"],
        ["id" => "tpl-4", "title" => "Atlet / Yüksek Hacim", "multiplierString" => "10k:1.00 / 25k:0.92 / 50k:0.85", "description" => "10k (%0) - 25k (%8) - 50k (%15)"]
    ];
    $templates = getDbData($templatesFile, $defaultTemplates);
    echo json_encode($templates, JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Geçersiz işlem.'], JSON_UNESCAPED_UNICODE);
