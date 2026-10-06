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

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$rawInput = file_get_contents('php://input');
$input = !empty($rawInput) ? json_decode((string)$rawInput, true) : [];
if (!is_array($input)) $input = [];

// Support HTTP Method Override for shared hosting (PUT/DELETE over POST)
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

$action = isset($_GET['action']) ? (string)$_GET['action'] : (isset($_GET['route']) ? (string)$_GET['route'] : '');
if (empty($action) && isset($input['action'])) {
    $action = (string)$input['action'];
}
$action = preg_replace('/^admin\//', '', $action);

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
        if (str_contains($path, '/test-smtp')) { $action = 'test-smtp'; break; }
        if (str_contains($path, '/smtp')) { $action = 'smtp'; break; }
        if (str_contains($path, '/rfq')) { $action = 'rfq'; break; }
        if (str_contains($path, '/refresh-rate')) { $action = 'refresh-rate'; break; }
        if (str_contains($path, '/settings')) { $action = 'settings'; break; }
        if (str_contains($path, '/products')) { $action = 'products'; break; }
        if (str_contains($path, '/categories')) { $action = 'categories'; break; }
        if (str_contains($path, '/articles')) { $action = 'articles'; break; }
        if (str_contains($path, '/multiplier-templates')) { $action = 'multiplier-templates'; break; }
    }
}

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

function sendAdminSmtpEmail($cfg, $to, $subject, $body) {
    $rawHost = !empty($cfg['host']) ? trim((string)$cfg['host']) : 'server.reksa.net';
    $smtpPort = !empty($cfg['port']) ? intval($cfg['port']) : 465;
    $username = !empty($cfg['user']) ? trim((string)$cfg['user']) : 'info@poset.com';
    $password = !empty($cfg['pass']) ? (string)$cfg['pass'] : '';
    $from = !empty($cfg['fromEmail']) ? trim((string)$cfg['fromEmail']) : $username;
    $fromName = !empty($cfg['fromName']) ? trim((string)$cfg['fromName']) : 'Poset.com Teklif Sistemi';

    // List of candidate endpoints to try (handles NAT loopback if server cannot connect to its own external IP)
    $hostAttempts = [];
    if (strpos($rawHost, '://') !== false) {
        $hostAttempts[] = ['host' => $rawHost, 'port' => $smtpPort];
    } else {
        if ($smtpPort == 465) {
            $hostAttempts[] = ['host' => 'ssl://' . $rawHost, 'port' => 465];
            $hostAttempts[] = ['host' => 'ssl://127.0.0.1', 'port' => 465];
            $hostAttempts[] = ['host' => 'ssl://localhost', 'port' => 465];
            $hostAttempts[] = ['host' => 'tcp://' . $rawHost, 'port' => 587];
            $hostAttempts[] = ['host' => 'tcp://127.0.0.1', 'port' => 587];
        } else {
            $hostAttempts[] = ['host' => 'tcp://' . $rawHost, 'port' => $smtpPort];
            $hostAttempts[] = ['host' => 'tcp://127.0.0.1', 'port' => $smtpPort];
            $hostAttempts[] = ['host' => 'ssl://' . $rawHost, 'port' => 465];
        }
    }

    $lastErr = '';
    $socket = null;
    $connectedHost = '';

    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ]);

    foreach ($hostAttempts as $attempt) {
        $errno = 0;
        $errstr = '';
        $s = @stream_socket_client("{$attempt['host']}:{$attempt['port']}", $errno, $errstr, 6, STREAM_CLIENT_CONNECT, $context);
        if ($s) {
            $socket = $s;
            $connectedHost = $attempt['host'] . ':' . $attempt['port'];
            break;
        } else {
            $lastErr = "{$attempt['host']}:{$attempt['port']} (" . ($errstr ?: 'Bağlantı reddedildi/zaman aşımı') . " - {$errno})";
        }
    }

    if (!$socket) {
        // Fallback to PHP native mail()
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$fromName} <{$from}>\r\n";
        $headers .= "Reply-To: {$from}\r\n";
        $headers .= "X-Mailer: Poset.com Mailer (PHP Fallback)\r\n";
        $mailSuccess = @mail($to, $subject, $body, $headers);
        if ($mailSuccess) {
            return [
                'success' => true,
                'message' => "Test iletisi sunucu yerel mail servisi (PHP mail fallback) ile {$to} adresine başarıyla gönderildi."
            ];
        }
        return [
            'success' => false,
            'error' => "SMTP sunucusuna bağlanılamadı. [Deneme: {$lastErr}]. Lütfen sunucu güvenlik duvarı (port 465/587) ve host ayarlarını kontrol edin.",
            'message' => "SMTP sunucusuna bağlanılamadı. [Deneme: {$lastErr}]"
        ];
    }

    $readResp = function($s) {
        $res = "";
        while ($line = fgets($s, 515)) {
            $res .= $line;
            if (substr($line, 3, 1) === " ") break;
        }
        return $res;
    };

    $readResp($socket);
    $ehloDomain = !empty($rawHost) ? preg_replace('/^(ssl|tcp):\/\//', '', $rawHost) : 'poset.com';
    fwrite($socket, "EHLO {$ehloDomain}\r\n");
    $readResp($socket);

    fwrite($socket, "AUTH LOGIN\r\n");
    $readResp($socket);

    fwrite($socket, base64_encode($username) . "\r\n");
    $readResp($socket);

    fwrite($socket, base64_encode($password) . "\r\n");
    $authStatus = $readResp($socket);
    if (substr($authStatus, 0, 3) !== '235') {
        fclose($socket);
        return [
            'success' => false, 
            'error' => 'SMTP Kimlik Doğrulama Başarısız: ' . trim($authStatus) . ' (Kullanıcı: ' . $username . ')',
            'message' => 'SMTP Kimlik Doğrulama Başarısız: ' . trim($authStatus)
        ];
    }

    fwrite($socket, "MAIL FROM: <{$from}>\r\n");
    $readResp($socket);

    fwrite($socket, "RCPT TO: <{$to}>\r\n");
    $readResp($socket);

    fwrite($socket, "DATA\r\n");
    $readResp($socket);

    $headersArr = [
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "From: {$fromName} <{$from}>\r\n",
        "To: <{$to}>",
        "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
        "Date: " . date("r")
    ];
    $emailData = implode("\r\n", $headersArr) . "\r\n\r\n" . $body . "\r\n.\r\n";
    fwrite($socket, $emailData);
    $dataResp = $readResp($socket);

    fwrite($socket, "QUIT\r\n");
    fclose($socket);

    if (substr($dataResp, 0, 3) !== '250') {
        return [
            'success' => false, 
            'error' => 'E-posta iletilemedi: ' . trim($dataResp),
            'message' => 'E-posta iletilemedi: ' . trim($dataResp)
        ];
    }

    return ['success' => true, 'message' => "Test e-postası ({$connectedHost} üzerinden) {$to} adresine başarıyla gönderildi."];
}

if ($action === 'rfq') {
    $settings = getDbData($settingsFile, $defaultSettings);
    $defaultRfq = [
        'whatsappNumber' => '905424086160',
        'notificationEmail' => 'info@poset.com',
        'showMonthlyConsumption' => true,
        'requireMonthlyConsumption' => false,
        'taxNote' => 'KDV Hariç',
        'validityNote' => 'Fiyatlarımız 15 gün geçerlidir.',
        'submitButtonText' => 'Teklif Talebini Gönder'
    ];
    if ($method === 'POST') {
        $rfq = [
            'whatsappNumber' => trim((string)($input['whatsappNumber'] ?? $defaultRfq['whatsappNumber'])),
            'notificationEmail' => trim((string)($input['notificationEmail'] ?? $defaultRfq['notificationEmail'])),
            'showMonthlyConsumption' => isset($input['showMonthlyConsumption']) ? (bool)$input['showMonthlyConsumption'] : true,
            'requireMonthlyConsumption' => isset($input['requireMonthlyConsumption']) ? (bool)$input['requireMonthlyConsumption'] : false,
            'taxNote' => trim((string)($input['taxNote'] ?? $defaultRfq['taxNote'])),
            'validityNote' => trim((string)($input['validityNote'] ?? $defaultRfq['validityNote'])),
            'submitButtonText' => trim((string)($input['submitButtonText'] ?? $defaultRfq['submitButtonText']))
        ];
        $settings['rfq'] = $rfq;
        saveDbData($settingsFile, $settings);
        echo json_encode(['success' => true, 'rfq' => $rfq], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $rfq = isset($settings['rfq']) && is_array($settings['rfq']) ? array_merge($defaultRfq, $settings['rfq']) : $defaultRfq;
        echo json_encode(['success' => true, 'rfq' => $rfq], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if ($action === 'smtp') {
    $settings = getDbData($settingsFile, $defaultSettings);
    if ($method === 'POST') {
        $smtp = [
            'host' => trim((string)($input['host'] ?? 'server.reksa.net')),
            'port' => intval($input['port'] ?? 465),
            'secure' => isset($input['secure']) ? (bool)$input['secure'] : true,
            'user' => trim((string)($input['user'] ?? 'info@poset.com')),
            'pass' => trim((string)($input['pass'] ?? '')),
            'fromName' => trim((string)($input['fromName'] ?? 'Poset.com Teklif Sistemi')),
            'fromEmail' => trim((string)($input['fromEmail'] ?? ($input['user'] ?? 'info@poset.com')))
        ];
        $settings['smtp'] = $smtp;
        saveDbData($settingsFile, $settings);
        echo json_encode(['success' => true, 'smtp' => $smtp], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $defaultSmtp = [
            'host' => 'server.reksa.net',
            'port' => 465,
            'secure' => true,
            'user' => 'info@poset.com',
            'pass' => 'z4DdYyvU32XD',
            'fromName' => 'Poset.com Teklif Sistemi',
            'fromEmail' => 'info@poset.com'
        ];
        $smtp = isset($settings['smtp']) && is_array($settings['smtp']) ? array_merge($defaultSmtp, $settings['smtp']) : $defaultSmtp;
        echo json_encode(['success' => true, 'smtp' => $smtp], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if ($action === 'test-smtp') {
    $settings = getDbData($settingsFile, $defaultSettings);
    $cfg = !empty($input['host']) ? $input : ($settings['smtp'] ?? []);
    if (empty($cfg['pass']) && !empty($settings['smtp']['pass'])) {
        $cfg['pass'] = $settings['smtp']['pass'];
    }
    $testTo = !empty($input['testEmail']) ? trim($input['testEmail']) : (!empty($cfg['fromEmail']) ? $cfg['fromEmail'] : (!empty($cfg['user']) ? $cfg['user'] : 'info@poset.com'));

    $body = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">'
          . '<div style="background-color: #0b1c3f; color: white; padding: 20px; text-align: center;"><h2 style="margin: 0; font-size: 20px;">poset.com Mail Sunucu Testi</h2></div>'
          . '<div style="padding: 24px; color: #334155; line-height: 1.6;">'
          . '<p style="font-size: 16px; color: #16a34a; font-weight: bold;">✓ Tebrikler! Mail sunucu (SMTP) ayarlarınız başarıyla doğrulandı.</p>'
          . '<p>Bu test iletisi canlı sunucu üzerinden gönderilmiştir.</p>'
          . '<hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />'
          . '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">'
          . '<tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">SMTP Sunucu:</td><td>' . htmlspecialchars($cfg['host'] ?? '') . ':' . htmlspecialchars($cfg['port'] ?? '') . '</td></tr>'
          . '<tr><td style="padding: 6px 0; font-weight: bold;">Gönderici:</td><td>' . htmlspecialchars($cfg['user'] ?? '') . '</td></tr>'
          . '<tr><td style="padding: 6px 0; font-weight: bold;">Test Alıcısı:</td><td>' . htmlspecialchars($testTo) . '</td></tr>'
          . '<tr><td style="padding: 6px 0; font-weight: bold;">Tarih:</td><td>' . date('d.m.Y H:i:s') . '</td></tr>'
          . '</table></div></div>';

    $res = sendAdminSmtpEmail($cfg, $testTo, 'poset.com SMTP Bağlantı Testi (Başarılı)', $body);
    if ($res['success']) {
        echo json_encode(['success' => true, 'message' => $res['message'] ?? "Test e-postası {$testTo} adresine başarıyla gönderildi."], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'success' => false, 
            'error' => $res['error'] ?? 'SMTP bağlantısı başarısız oldu.',
            'message' => $res['message'] ?? ($res['error'] ?? 'SMTP bağlantısı başarısız oldu.')
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

if ($action === 'products') {
    if ($method === 'POST' || $method === 'PUT') {
        $products = getDbData($productsFile, []);
        $targetSku = trim((string)($input['urun_kodu'] ?? ($input['sku'] ?? ($input['id'] ?? ($_GET['sku'] ?? '')))));
        if (empty($targetSku)) {
            $requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
            if (preg_match('#/products/([^/?]+)#', $requestUri, $matches)) {
                $targetSku = urldecode($matches[1]);
            }
        }
        $targetSku = trim($targetSku);

        // Search for existing product by SKU/urun_kodu/id
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
            // Update existing in-place: NEVER duplicate!
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
            // Insert new product
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

if ($action === 'articles') {
    if ($method === 'POST') {
        $articles = getDbData($articlesFile, []);
        $newArt = is_array($input) ? $input : [];
        if (empty($newArt['id'])) {
            $newArt['id'] = 'art-' . time();
        }
        if (empty($newArt['tarih'])) {
            $newArt['tarih'] = date('Y-m-d');
        }
        array_unshift($articles, $newArt);
        saveDbData($articlesFile, $articles);
        echo json_encode(['success' => true, 'article' => $newArt, 'articles' => $articles], JSON_UNESCAPED_UNICODE);
        exit;
    } elseif ($method === 'PUT') {
        $articles = getDbData($articlesFile, []);
        $targetId = trim((string)($_GET['id'] ?? ($input['id'] ?? ($input['slug'] ?? ''))));
        $foundIdx = -1;
        foreach ($articles as $idx => $a) {
            $aId = (string)($a['id'] ?? ($a['slug'] ?? ''));
            if (strcasecmp(trim($aId), $targetId) === 0) {
                $foundIdx = $idx;
                break;
            }
        }
        if ($foundIdx === -1) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'HATA: Makale bulunamadı -> ' . $targetId], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $updatedArt = array_merge($articles[$foundIdx], is_array($input) ? $input : []);
        $articles[$foundIdx] = $updatedArt;
        saveDbData($articlesFile, $articles);
        echo json_encode(['success' => true, 'article' => $updatedArt, 'articles' => $articles], JSON_UNESCAPED_UNICODE);
        exit;
    } elseif ($method === 'DELETE') {
        $articles = getDbData($articlesFile, []);
        $targetId = trim((string)($_GET['id'] ?? ($input['id'] ?? ($input['slug'] ?? ''))));
        $filtered = [];
        foreach ($articles as $a) {
            $aId = (string)($a['id'] ?? ($a['slug'] ?? ''));
            if (strcasecmp(trim($aId), $targetId) !== 0) {
                $filtered[] = $a;
            }
        }
        $articles = array_values($filtered);
        saveDbData($articlesFile, $articles);
        echo json_encode(['success' => true, 'articles' => $articles], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $articles = getDbData($articlesFile, []);
        header('Cache-Control: no-store, no-cache, must-revalidate, private');
        echo json_encode($articles, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Geçersiz işlem.'], JSON_UNESCAPED_UNICODE);

