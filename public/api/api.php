<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

function resolveDataFile(string $filename): string {
    $cleanName = basename($filename);
    $docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/\\');
    
    // Priority order for live server:
    // 1. Data directory in parent of api directory (standard: /public_html/data/)
    // 2. Data directory in DOCUMENT_ROOT
    // 3. Local api/data/ directory
    // 4. Same directory as script
    // 5. Fallback for repository local dev (/poset/data/)
    $candidates = array_filter([
        __DIR__ . '/../data/' . $cleanName,
        (!empty($docRoot) ? $docRoot . '/data/' . $cleanName : null),
        __DIR__ . '/data/' . $cleanName,
        __DIR__ . '/' . $cleanName,
        (!empty($docRoot) ? $docRoot . '/public/data/' . $cleanName : null),
        (!empty($docRoot) ? $docRoot . '/api/data/' . $cleanName : null),
        __DIR__ . '/../../data/' . $cleanName
    ]);
    foreach ($candidates as $c) {
        if (file_exists($c) && filesize($c) > 2) {
            return $c;
        }
    }
    
    // Target primary directory
    $primaryDir = __DIR__ . '/../data';
    if (!empty($docRoot) && is_dir($docRoot . '/data')) {
        $primaryDir = $docRoot . '/data';
    }
    if (!file_exists($primaryDir)) {
        @mkdir($primaryDir, 0777, true);
    }
    return $primaryDir . '/' . $cleanName;
}

$settingsFile = 'settings.json';
$productsFile = 'products.json';
$categoriesFile = 'categories.json';
$templatesFile = 'multiplier_templates.json';
$articlesFile = 'articles.json';

/**
 * PHP 8.3 Safe JSON Reader with Shared OS Lock (LOCK_SH), json_validate() and Seed Recovery
 */
function getDbData(string $filename, array $default = []): array {
    $file = resolveDataFile($filename);
    $cleanName = basename($filename);

    if (!file_exists($file) || filesize($file) <= 2) {
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        $seedCandidates = [
            __DIR__ . '/../../data/' . $cleanName,
            __DIR__ . '/../data/' . $cleanName,
            __DIR__ . '/data/' . $cleanName,
            $docRoot . '/data/' . $cleanName,
            $docRoot . '/public/data/' . $cleanName,
            $docRoot . '/api/data/' . $cleanName
        ];
        foreach ($seedCandidates as $sc) {
            if (!empty($sc) && file_exists($sc) && filesize($sc) > 2) {
                $raw = @file_get_contents($sc);
                if (!empty($raw)) {
                    $dec = @json_decode($raw, true);
                    if (is_array($dec) && count($dec) > 0) {
                        saveDbData($file, $dec);
                        return $dec;
                    }
                }
            }
        }
        return $default;
    }

    $fp = @fopen($file, 'rb');
    if (!$fp) {
        return $default;
    }

    if (!flock($fp, LOCK_SH)) {
        fclose($fp);
        return $default;
    }

    $size = filesize($file);
    $content = $size > 0 ? fread($fp, $size) : '';

    flock($fp, LOCK_UN);
    fclose($fp);

    if (empty(trim((string)$content))) {
        return $default;
    }

    $isValidJson = function_exists('json_validate') 
        ? json_validate((string)$content) 
        : (json_decode((string)$content) !== null);

    if (!$isValidJson) {
        return $default;
    }

    $decoded = json_decode((string)$content, true);
    if (!is_array($decoded) || count($decoded) === 0) {
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        $seedCandidates = [
            __DIR__ . '/../../data/' . $cleanName,
            __DIR__ . '/../data/' . $cleanName,
            __DIR__ . '/data/' . $cleanName,
            $docRoot . '/data/' . $cleanName,
            $docRoot . '/public/data/' . $cleanName,
            $docRoot . '/api/data/' . $cleanName
        ];
        foreach ($seedCandidates as $sc) {
            if (!empty($sc) && file_exists($sc) && filesize($sc) > 2) {
                $raw = @file_get_contents($sc);
                if (!empty($raw)) {
                    $dec = @json_decode($raw, true);
                    if (is_array($dec) && count($dec) > 0) {
                        saveDbData($file, $dec);
                        return $dec;
                    }
                }
            }
        }
        return $default;
    }

    return $decoded;
}

/**
 * PHP 8.3 Atomic JSON Writer with Exclusive OS Lock (LOCK_EX) and Backup Creation
 */
function saveDbData(string $filename, array $data): bool {
    $file = resolveDataFile($filename);
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

    // Also mirror to other existing data locations so reads from any candidate are always identical!
    $cleanName = basename($filename);
    $docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/\\');
    $mirrorTargets = array_filter([
        __DIR__ . '/../data/' . $cleanName,
        (!empty($docRoot) ? $docRoot . '/data/' . $cleanName : null),
        __DIR__ . '/../../data/' . $cleanName
    ]);
    foreach ($mirrorTargets as $mt) {
        if ($mt !== $file && file_exists(dirname($mt))) {
            @file_put_contents($mt, $jsonString, LOCK_EX);
        }
    }

    return true;
}

// Route API requests
$action = isset($_GET['action']) ? (string)$_GET['action'] : '';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$rawInput = file_get_contents('php://input');
$input = !empty($rawInput) ? json_decode((string)$rawInput, true) : [];
if (!is_array($input)) $input = [];

// Support HTTP Method Override
if ($method === 'POST') {
    if (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
        $method = strtoupper((string)$_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
    } elseif (isset($input['_method'])) {
        $method = strtoupper((string)$input['_method']);
    } elseif (isset($_GET['_method'])) {
        $method = strtoupper((string)$_GET['_method']);
    } elseif (isset($input['action']) && in_array(strtolower((string)$input['action']), ['delete', 'delete_product'])) {
        $method = 'DELETE';
    }
}

if ($action === 'delete_product') {
    $action = 'products';
    $method = 'DELETE';
}
if (empty($action)) {
    $uris = [
        $_SERVER['REQUEST_URI'] ?? '',
        $_SERVER['REDIRECT_URL'] ?? '',
        $_SERVER['PATH_INFO'] ?? '',
        $_SERVER['PHP_SELF'] ?? ''
    ];
    foreach ($uris as $u) {
        $path = parse_url($u, PHP_URL_PATH) ?? '';
        if (str_contains($path, '/products')) { $action = 'products'; break; }
        if (str_contains($path, '/categories')) { $action = 'categories'; break; }
        if (str_contains($path, '/settings')) { $action = 'settings'; break; }
        if (str_contains($path, '/articles')) { $action = 'articles'; break; }
    }
}

if ($action === 'settings') {
    if ($method === 'POST') {
        $current = getDbData($settingsFile, ['usd_try_rate' => 35.45, 'rate_mode' => 'manual', 'collect_api_key' => '']);
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
        $settings = getDbData($settingsFile, ['usd_try_rate' => 35.45, 'rate_mode' => 'api', 'collect_api_key' => '5FzmRhNGQrHuKmbf03PmYU:0lXeOca14Soi4nfEc81MH1']);
        echo json_encode($settings, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if ($action === 'products') {
    if ($method === 'POST' || $method === 'PUT') {
        $products = getDbData($productsFile, []);
        $targetSku = trim((string)($input['urun_kodu'] ?? ($input['sku'] ?? ($input['id'] ?? ($_GET['sku'] ?? '')))));
        
        $foundIndex = -1;
        if (!empty($targetSku)) {
            foreach ($products as $idx => $p) {
                $pCode = (string)($p['urun_kodu'] ?? ($p['sku'] ?? ($p['id'] ?? '')));
                if (strcasecmp(trim($pCode), $targetSku) === 0) {
                    $foundIndex = $idx;
                    break;
                }
            }
        }

        $rawPrice = $input['birim_fiyat'] ?? ($input['birim_fiyati'] ?? ($input['base_price'] ?? 0));
        $cleanPrice = is_numeric($rawPrice) ? floatval($rawPrice) : floatval(str_replace(',', '.', (string)$rawPrice));
        $finalPrice = is_nan($cleanPrice) ? 0.0 : $cleanPrice;

        if ($foundIndex !== -1) {
            $updatedProd = array_merge($products[$foundIndex], is_array($input) ? $input : []);
            $updatedProd['birim_fiyat'] = $finalPrice;
            $updatedProd['birim_fiyati'] = $finalPrice;
            $updatedProd['base_price'] = $finalPrice;
            $updatedProd['fiyat_aliniz'] = $finalPrice > 0 ? false : (isset($input['fiyat_aliniz']) ? (bool)$input['fiyat_aliniz'] : true);
            $updatedProd['is_quote_only'] = $updatedProd['fiyat_aliniz'];
            $products[$foundIndex] = $updatedProd;
            saveDbData($productsFile, $products);
            echo json_encode(['success' => true, 'product' => $updatedProd, 'products' => $products], JSON_UNESCAPED_UNICODE);
            exit;
        } else {
            $newProd = is_array($input) ? $input : [];
            $maxSira = 0;
            foreach ($products as $p) {
                $s = intval($p['sira_no'] ?? 0);
                if ($s > $maxSira) $maxSira = $s;
            }
            $newProd['sira_no'] = $maxSira + 1;
            if (empty($newProd['urun_kodu'])) {
                $newProd['urun_kodu'] = !empty($targetSku) ? $targetSku : 'PRD-' . substr((string)time(), -5);
            }
            $newProd['birim_fiyat'] = $finalPrice;
            $newProd['birim_fiyati'] = $finalPrice;
            $newProd['base_price'] = $finalPrice;
            $newProd['fiyat_aliniz'] = $finalPrice > 0 ? false : (isset($newProd['fiyat_aliniz']) ? (bool)$newProd['fiyat_aliniz'] : true);
            $newProd['is_quote_only'] = $newProd['fiyat_aliniz'];
            $products[] = $newProd;
            saveDbData($productsFile, $products);
            echo json_encode(['success' => true, 'product' => $newProd, 'products' => $products], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } elseif ($method === 'DELETE') {
        $products = getDbData($productsFile, []);
        $targetSku = trim(urldecode((string)($_GET['sku'] ?? ($_GET['urun_kodu'] ?? ($input['urun_kodu'] ?? ($input['sku'] ?? ($input['id'] ?? ($_GET['id'] ?? ''))))))));
        $targetSira = trim((string)($_GET['sira_no'] ?? ($input['sira_no'] ?? '')));

        if (empty($targetSku) && empty($targetSira)) {
            $uris = array_filter([
                $_SERVER['REQUEST_URI'] ?? '',
                $_SERVER['REDIRECT_URL'] ?? '',
                $_SERVER['PATH_INFO'] ?? '',
                $_SERVER['PHP_SELF'] ?? ''
            ]);
            foreach ($uris as $u) {
                $path = parse_url($u, PHP_URL_PATH) ?? '';
                if (preg_match('#/products/by-sira/([^/?]+)#i', $path, $m)) {
                    $targetSira = trim(urldecode($m[1]));
                    break;
                } elseif (preg_match('#/products/([^/?]+)#i', $path, $m)) {
                    $targetSku = trim(urldecode($m[1]));
                    break;
                }
            }
        }
        $targetSku = trim($targetSku);
        $targetSira = trim($targetSira);

        $newProducts = [];
        $deleted = false;
        foreach ($products as $p) {
            $pCode = trim((string)($p['urun_kodu'] ?? ($p['sku'] ?? ($p['id'] ?? ''))));
            $pSira = trim((string)($p['sira_no'] ?? ''));

            $matchCode = (!empty($targetSku) && strcasecmp($pCode, $targetSku) === 0);
            $matchSira = (!empty($targetSira) && $pSira === $targetSira);

            if ($matchCode || $matchSira) {
                $deleted = true;
                continue;
            }
            $newProducts[] = $p;
        }

        if ($deleted) {
            saveDbData($productsFile, $newProducts);
            echo json_encode([
                'success' => true, 
                'deleted_sku' => $targetSku ?: $targetSira, 
                'count' => count($newProducts),
                'products' => $newProducts,
                'message' => 'Ürün veritabanından başarıyla silindi.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false, 
                'error' => 'Silinecek ürün veritabanında bulunamadı: ' . ($targetSku ?: $targetSira),
                'products' => $products
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        $products = getDbData($productsFile, []);
        echo json_encode($products, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if ($action === 'categories') {
    $defaultCategories = [
        "E-TİCARET VE KARGO AMBALAJLARI",
        "PLASTİK POŞETLER",
        "KAĞIT VE KARTON ÇANTALAR",
        "BEZ VE TELA ÇANTALAR",
        "KORUYUCU VE ENDÜSTRİYEL AMBALAJ"
    ];
    $categories = getDbData($categoriesFile, $defaultCategories);
    echo json_encode($categories, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'articles') {
    $articles = getDbData($articlesFile, []);
    echo json_encode($articles, JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Geçersiz işlem.'], JSON_UNESCAPED_UNICODE);

