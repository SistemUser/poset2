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

// Route API requests
$action = isset($_GET['action']) ? (string)$_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input');
$input = !empty($rawInput) ? json_decode($rawInput, true) : [];

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
    if ($method === 'POST') {
        $products = getDbData($productsFile, []);
        $newProd = is_array($input) ? $input : [];
        $maxSira = 0;
        foreach ($products as $p) {
            $s = intval($p['sira_no'] ?? 0);
            if ($s > $maxSira) $maxSira = $s;
        }
        $newProd['sira_no'] = $maxSira + 1;
        $products[] = $newProd;
        saveDbData($productsFile, $products);
        echo json_encode(['success' => true, 'product' => $newProd, 'products' => $products], JSON_UNESCAPED_UNICODE);
        exit;
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

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Geçersiz işlem.'], JSON_UNESCAPED_UNICODE);
