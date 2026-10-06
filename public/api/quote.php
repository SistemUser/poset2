<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ==========================================
// GEMINI API ANAHTARI AYARI
// ==========================================
// Eğer gerçek yapay zeka ile teklif oluşturmak istiyorsanız, 
// Gemini API anahtarınızı buraya yazabilir veya sunucunun 
// çevre değişkenlerine (Environment Variables) ekleyebilirsiniz:
$gemini_api_key = getenv('GEMINI_API_KEY') ?: ''; 
// Örnek: $gemini_api_key = 'AIzaSy...';
// ==========================================

$input = json_decode(file_get_contents('php://input'), true);

function sendSmtpEmail($to, $subject, $body, $replyToEmail = '', $attachments = []) {
    $docRoot = !empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') : '';
    $candidatePaths = array_filter([
        __DIR__ . '/../data/settings.json',
        __DIR__ . '/data/settings.json',
        $docRoot ? $docRoot . '/data/settings.json' : null,
        $docRoot ? $docRoot . '/public/data/settings.json' : null,
        dirname(__DIR__, 2) . '/data/settings.json'
    ]);
    $settingsFile = '';
    foreach ($candidatePaths as $p) {
        if ($p && file_exists($p)) {
            $settingsFile = $p;
            break;
        }
    }
    $cfg = [];
    if (!empty($settingsFile) && file_exists($settingsFile)) {
        $data = json_decode(file_get_contents($settingsFile), true);
        if (!empty($data['smtp']) && is_array($data['smtp'])) {
            $cfg = $data['smtp'];
        }
    }

    $rawHost = !empty($cfg['host']) ? $cfg['host'] : (getenv('SMTP_HOST') ?: 'server.reksa.net');
    $smtpPort = !empty($cfg['port']) ? intval($cfg['port']) : (getenv('SMTP_PORT') ? intval(getenv('SMTP_PORT')) : 465);
    $username = !empty($cfg['user']) ? $cfg['user'] : (getenv('SMTP_USER') ?: 'info@poset.com');
    $password = !empty($cfg['pass']) ? $cfg['pass'] : (getenv('SMTP_PASS') ?: 'z4DdYyvU32XD');
    $from = !empty($cfg['fromEmail']) ? $cfg['fromEmail'] : $username;
    $fromName = !empty($cfg['fromName']) ? $cfg['fromName'] : 'Poset.com Teklif Sistemi';

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

    $socket = null;
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
            break;
        }
    }

    if (!$socket) {
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$fromName} <{$from}>\r\n";
        if (!empty($replyToEmail) && filter_var($replyToEmail, FILTER_VALIDATE_EMAIL)) {
            $headers .= "Reply-To: {$replyToEmail}\r\n";
        }
        return @mail($to, $subject, $body, $headers);
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
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$fromName} <{$from}>\r\n";
        if (!empty($replyToEmail) && filter_var($replyToEmail, FILTER_VALIDATE_EMAIL)) {
            $headers .= "Reply-To: {$replyToEmail}\r\n";
        }
        return @mail($to, $subject, $body, $headers);
    }

    fwrite($socket, "MAIL FROM: <{$from}>\r\n");
    $readResp($socket);

    fwrite($socket, "RCPT TO: <{$to}>\r\n");
    $readResp($socket);

    fwrite($socket, "DATA\r\n");
    $readResp($socket);

    if (!empty($attachments)) {
        $boundary = "====_Part_" . time() . "_" . bin2hex(random_bytes(6));
        $headersArr = [
            "MIME-Version: 1.0",
            "Content-Type: multipart/mixed; boundary=\"{$boundary}\"",
            "From: {$fromName} <{$from}>",
            "To: <{$to}>",
            "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
            "Date: " . date("r")
        ];
        if (!empty($replyToEmail) && filter_var($replyToEmail, FILTER_VALIDATE_EMAIL)) {
            $headersArr[] = "Reply-To: {$replyToEmail}";
        }

        $emailData = implode("\r\n", $headersArr) . "\r\n\r\n";
        $emailData .= "--{$boundary}\r\n";
        $emailData .= "Content-Type: text/html; charset=UTF-8\r\n";
        $emailData .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $emailData .= $body . "\r\n\r\n";

        foreach ($attachments as $att) {
            $attNameB64 = "=?UTF-8?B?" . base64_encode($att['filename']) . "?=";
            $emailData .= "--{$boundary}\r\n";
            $emailData .= "Content-Type: " . ($att['contentType'] ?: "application/octet-stream") . "; name=\"{$attNameB64}\"\r\n";
            $emailData .= "Content-Transfer-Encoding: base64\r\n";
            $emailData .= "Content-Disposition: attachment; filename=\"{$attNameB64}\"\r\n\r\n";
            $cleanB64 = preg_replace('/\s+/', '', $att['base64Content']);
            $chunked = chunk_split($cleanB64, 76, "\r\n");
            $emailData .= $chunked . "\r\n";
        }
        $emailData .= "--{$boundary}--\r\n.\r\n";
    } else {
        $headersArr = [
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "From: {$fromName} <{$from}>",
            "To: <{$to}>",
            "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
            "Date: " . date("r")
        ];
        if (!empty($replyToEmail) && filter_var($replyToEmail, FILTER_VALIDATE_EMAIL)) {
            $headersArr[] = "Reply-To: {$replyToEmail}";
        }
        $emailData = implode("\r\n", $headersArr) . "\r\n\r\n" . $body . "\r\n.\r\n";
    }

    fwrite($socket, $emailData);
    $readResp($socket);

    fwrite($socket, "QUIT\r\n");
    fclose($socket);
    return true;
}

if (isset($input['action']) && $input['action'] === 'submit_rfq') {
    $docRoot = !empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') : '';
    $candidatePaths = array_filter([
        __DIR__ . '/../data/settings.json',
        __DIR__ . '/data/settings.json',
        $docRoot ? $docRoot . '/data/settings.json' : null,
        $docRoot ? $docRoot . '/public/data/settings.json' : null,
        dirname(__DIR__, 2) . '/data/settings.json'
    ]);
    $settingsFile = '';
    foreach ($candidatePaths as $p) {
        if ($p && file_exists($p)) {
            $settingsFile = $p;
            break;
        }
    }
    $savedSettings = [];
    if (!empty($settingsFile) && file_exists($settingsFile)) {
        $savedSettings = json_decode(file_get_contents($settingsFile), true) ?: [];
    }

    $to = !empty($input['recipient_email']) && filter_var($input['recipient_email'], FILTER_VALIDATE_EMAIL)
        ? $input['recipient_email']
        : (!empty($savedSettings['rfq']['notificationEmail'])
            ? $savedSettings['rfq']['notificationEmail']
            : (!empty($savedSettings['notificationEmail'])
                ? $savedSettings['notificationEmail']
                : (!empty($savedSettings['smtp']['fromEmail'])
                    ? $savedSettings['smtp']['fromEmail']
                    : (getenv('SMTP_RECIPIENT') ?: 'info@poset.com'))));

    $customer = isset($input['customer']) ? $input['customer'] : [];
    $items = isset($input['items']) ? $input['items'] : [];

    $custName = isset($customer['name']) ? htmlspecialchars($customer['name']) : 'Belirtilmedi';
    $custPhone = isset($customer['phone']) ? htmlspecialchars($customer['phone']) : 'Belirtilmedi';
    $custCompany = isset($customer['company']) ? htmlspecialchars($customer['company']) : 'Belirtilmedi';
    $custEmail = isset($customer['email']) ? htmlspecialchars($customer['email']) : 'Belirtilmedi';
    $custMonthly = isset($customer['monthlyConsumption']) ? htmlspecialchars($customer['monthlyConsumption']) : 'Belirtilmedi';
    $custNote = isset($customer['notes']) ? htmlspecialchars($customer['notes']) : (isset($customer['note']) ? htmlspecialchars($customer['note']) : 'Belirtilmedi');
    $taxNoteText = isset($input['tax_note']) ? htmlspecialchars($input['tax_note']) : 'KDV Hariç';
    $validityNoteText = isset($input['validity_note']) ? htmlspecialchars($input['validity_note']) : 'Fiyatlarımız 15 gün geçerlidir.';

    $subject = "Yeni Teklif Talebi (poset.com) - " . $custName;

    $body = "<html><head><meta charset='utf-8'><style>"
          . "body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #f8fafc; padding: 20px; }"
          . ".card { max-width: 750px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }"
          . ".header { background: #0b1c3f; color: #ffffff; padding: 24px; text-align: left; }"
          . ".header h2 { margin: 0 0 6px 0; font-size: 20px; letter-spacing: -0.5px; }"
          . ".header p { margin: 0; font-size: 13px; color: #94a3b8; }"
          . ".content { padding: 24px; }"
          . ".section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #0b1c3f; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin: 20px 0 12px 0; }"
          . ".info-grid { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }"
          . ".info-grid td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }"
          . ".info-label { font-weight: bold; color: #64748b; width: 180px; }"
          . ".info-val { color: #0f172a; font-weight: 600; }"
          . "table.items { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }"
          . "table.items th { background: #0b1c3f; color: #ffffff; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }"
          . "table.items td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; vertical-align: top; }"
          . "table.items tr:nth-child(even) { background-color: #f8fafc; }"
          . ".total-box { margin-top: 20px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; }"
          . ".total-title { font-size: 16px; font-weight: bold; color: #166534; }"
          . ".footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }"
          . "</style></head><body>"
          . "<div class='card'>"
          . "<div class='header'><h2>AMBALAJ MARKET - FİYAT TEKLİFİ VE SİPARİŞ TALEBİ</h2><p>Tarih & Saat: " . date('d.m.Y H:i') . "</p></div>"
          . "<div class='content'>"
          . "<div class='section-title'>MÜŞTERİ BİLGİLERİ</div>"
          . "<table class='info-grid'>"
          . "<tr><td class='info-label'>Yetkili / Adı Soyadı:</td><td class='info-val'>{$custName}</td></tr>"
          . "<tr><td class='info-label'>Firma / Marka:</td><td class='info-val'>{$custCompany}</td></tr>"
          . "<tr><td class='info-label'>Telefon Numarası:</td><td class='info-val'>{$custPhone}</td></tr>"
          . "<tr><td class='info-label'>E-Posta Adresi:</td><td class='info-val'>{$custEmail}</td></tr>"
          . "<tr><td class='info-label'>Aylık Tüketim Potansiyeli:</td><td class='info-val'>{$custMonthly}</td></tr>";

    if ($custNote !== 'Belirtilmedi') {
        $body .= "<tr><td class='info-label' style='vertical-align: top; padding-top: 10px;'>Müşteri Notu:</td><td class='info-val'><div style='font-size: 14px; font-weight: bold; color: #be123c; background: #fff1f2; border-left: 4px solid #e11d48; padding: 10px 14px; border-radius: 6px; line-height: 1.5;'>🔴 {$custNote}</div></td></tr>";
    }

    $itemCount = is_array($items) ? count($items) : 0;
    $body .= "</table><div class='section-title'>TALEP EDİLEN ÜRÜNLER ({$itemCount} KALEM)</div>"
          . "<table class='items'>"
          . "<tr><th>#</th><th>Ürün Adı</th><th>Ölçü</th><th>Miktar</th><th>Hammadde</th><th>Baskı / Cep</th><th>Stok/Üretim</th><th>Birim Fiyat</th><th>Tutar</th></tr>";
    
    $grandTotal = 0;
    $attachments = [];

    if (is_array($items)) {
        foreach ($items as $idx => $item) {
            $uName = htmlspecialchars($item['urun_adi'] ?? '');
            $uCode = !empty($item['urun_kodu']) ? " (" . htmlspecialchars($item['urun_kodu']) . ")" : "";
            $uDim = htmlspecialchars($item['olculer'] ?? '');
            $uQty = number_format($item['miktar'] ?? 0) . " " . htmlspecialchars($item['satis_sekli'] ?? 'Adet');
            $uMat = htmlspecialchars($item['hammadde'] ?? ($item['material'] ?? '-'));
            $uPrint = htmlspecialchars(($item['baski_durumu'] ?? '') === 'Baskısız' ? 'Baskısız' : ($item['renk_sayisi'] ?? 'Baskılı'));
            if (!empty($item['fatura_cebi_dahil'])) {
                $uPrint .= " + Cep";
            }
            $uStock = htmlspecialchars($item['stok_durumu'] ?? 'Sipariş Üzerine Üretim');
            $uPrice = (!empty($item['birim_fiyat']) && $item['birim_fiyat'] > 0) ? "₺" . number_format($item['birim_fiyat'], 2) : "Özel İmalat";
            $uTotal = (!empty($item['toplam_fiyat']) && $item['toplam_fiyat'] > 0) ? "₺" . number_format(round($item['toplam_fiyat'])) : "Teklif Bekliyor";
            $grandTotal += ($item['toplam_fiyat'] ?? 0);

            $noteHtml = !empty($item['musteri_notu']) ? "<div style='margin-top: 8px; padding: 8px 12px; background: #fff1f2; border-left: 4px solid #e11d48; border-radius: 6px; font-size: 13px; font-weight: bold; color: #be123c; line-height: 1.4;'>🔴 <strong>Özel Müşteri Notu:</strong> " . htmlspecialchars($item['musteri_notu']) . "</div>" : "";

            $logoHtml = "";
            if (!empty($item['logo_dosya_adi'])) {
                $lName = htmlspecialchars($item['logo_dosya_adi']);
                $logoHtml = "<div style='margin-top: 8px; padding: 8px 12px; background: #f0fdf4; border: 1px dashed #16a34a; border-radius: 6px;'><div style='font-size: 12px; font-weight: bold; color: #166534;'>📎 <strong>Ekli Logo / Tasarım:</strong> <span style='color:#0b1c3f;'>{$lName}</span></div>";
                if (!empty($item['logo_base64']) && strpos($item['logo_base64'], 'data:image') === 0) {
                    $logoHtml .= "<div style='margin-top: 6px;'><img src='{$item['logo_base64']}' alt='{$lName}' style='max-height: 120px; max-width: 260px; object-fit: contain; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px;' /></div>";
                }
                $logoHtml .= "</div>";
            }

            if (!empty($item['logo_base64']) && !empty($item['logo_dosya_adi'])) {
                $parts = explode(';base64,', $item['logo_base64']);
                if (count($parts) === 2) {
                    $cType = str_replace('data:', '', $parts[0]);
                    $attachments[] = [
                        'filename' => $item['logo_dosya_adi'],
                        'contentType' => $cType ?: 'application/octet-stream',
                        'base64Content' => $parts[1]
                    ];
                }
            }

            $itemIdx = $idx + 1;
            $body .= "<tr><td>{$itemIdx}</td><td><strong style='font-size: 13px; color: #0b1c3f;'>{$uName}</strong>{$uCode}{$noteHtml}{$logoHtml}</td><td>{$uDim}</td><td>{$uQty}</td><td>{$uMat}</td><td>{$uPrint}</td><td>{$uStock}</td><td>{$uPrice}</td><td><strong>{$uTotal}</strong></td></tr>";
        }
    }

    $totalDisplay = ($grandTotal > 0)
        ? "TOPLAM TAHMİNİ TUTAR: ₺" . number_format(round($grandTotal)) . " ({$taxNoteText})"
        : "TOPLAM TAHMİNİ TUTAR: Özel İmalat / Teklif İle Belirlenecektir ({$taxNoteText})";

    $body .= "</table>"
          . "<div class='total-box'>"
          . "<div class='total-title'>{$totalDisplay}</div>"
          . "<p style='margin: 6px 0 0 0; font-size: 12px; color: #475569;'>ℹ️ <strong>Teklif Notu:</strong> {$validityNoteText}</p>"
          . "</div></div>"
          . "<div class='footer'>Bu teklif talebi <strong>poset.com</strong> Fiyat Teklif Merkezi üzerinden otomatik oluşturulmuştur.</div>"
          . "</div></body></html>";

    $sent = sendSmtpEmail($to, $subject, $body, $custEmail, $attachments);

    echo json_encode([
        'success' => true,
        'message' => "Teklif talebiniz {$to} adresine başarıyla iletildi.",
        'recipient' => $to,
        'attachments_count' => count($attachments),
        'smtp_sent' => $sent
    ]);
    exit;
}

$prompt = isset($input['prompt']) ? trim($input['prompt']) : '';

if (empty($prompt)) {
    http_response_code(400);
    echo json_encode(['error' => 'Lütfen bir prompt belirtin.']);
    exit;
}

// Complete ground-truth products taxonomy matching the 20 listed types
$products_taxonomy = [
    [
        "name" => "Baskılı (Logolu) Kargo Poşetleri",
        "keywords" => ["baskılı (logolu) kargo poşetleri", "baskılı kargo", "logolu kargo", "baskılı poşet", "krg-2030-01", "krg-2432-02", "krg-2838-03", "krg-3040-04", "krg-3545-05", "krg-4050-06", "krg-4555-07", "krg-5060-08"],
        "category" => "kargoPlastik",
        "material" => "Co-Ex (LDPE)",
        "thickness" => "65 Mikron",
        "closure" => "Tek Bant (Kalıcı)",
        "price" => 1.45,
        "eco" => 65,
        "type" => "kargo",
        "details" => [
            "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
            "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
            "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "KRG-2030-01",
                "olculer" => "20 x 30 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "65 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 0.87,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-2432-02",
                "olculer" => "24 x 32 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "65 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 0.93,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-2838-03",
                "olculer" => "28 x 38 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "65 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.29,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-3040-04",
                "olculer" => "30 x 40 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "65 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.45,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-3545-05",
                "olculer" => "35 x 45 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "65 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.9,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-4050-06",
                "olculer" => "40 x 50 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "70 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.42,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 7 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-4555-07",
                "olculer" => "45 x 55 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "70 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.99,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 7 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-5060-08",
                "olculer" => "50 x 60 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "75 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 3.19,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 75 Mikron | Termin: 7 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Cepli (Kendinden Fatura Cepli) Kargo Poşetleri",
        "keywords" => ["cepli (kendinden fatura cepli) kargo poşetleri", "cepli kargo", "cepli kurye", "cepli poşet", "krg-2030-09", "krg-2432-10", "krg-2838-11", "krg-3040-12", "krg-3545-13", "krg-4050-14", "krg-4555-15", "krg-5060-16"],
        "category" => "kargoCepli",
        "material" => "Co-Ex (LDPE)",
        "thickness" => "70 Mikron",
        "closure" => "Tek Bant (Kalıcı)",
        "price" => 1.35,
        "eco" => 65,
        "type" => "kargo",
        "details" => [
            "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
            "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
            "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "KRG-2030-09",
                "olculer" => "20 x 30 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "70 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 0.81,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-2432-10",
                "olculer" => "24 x 32 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "70 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 0.86,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-2838-11",
                "olculer" => "28 x 38 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "70 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.2,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-3040-12",
                "olculer" => "30 x 40 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "70 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.35,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-3545-13",
                "olculer" => "35 x 45 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "70 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.77,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-4050-14",
                "olculer" => "40 x 50 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "70 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.25,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-4555-15",
                "olculer" => "45 x 55 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "75 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.78,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 75 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-5060-16",
                "olculer" => "50 x 60 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "75 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.97,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 75 Mikron | Termin: 2 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Standart (Baskısız) Kargo Poşetleri",
        "keywords" => ["standart (baskısız) kargo poşetleri", "standart kargo", "baskısız kargo", "düz kargo", "gri kargo", "kargo poşeti", "krg-2030-17", "krg-2432-18", "krg-2838-19", "krg-3040-20", "krg-3545-21", "krg-4050-22", "krg-4555-23", "krg-5060-24"],
        "category" => "kargoPlastik",
        "material" => "Co-Ex (LDPE)",
        "thickness" => "60 Mikron",
        "closure" => "Tek Bant (Kalıcı)",
        "price" => 1.25,
        "eco" => 65,
        "type" => "kargo",
        "details" => [
            "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
            "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
            "Hammadde: Co-Ex (LDPE) | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "KRG-2030-17",
                "olculer" => "20 x 30 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "60 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 0.75,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-2432-18",
                "olculer" => "24 x 32 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "60 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 0.8,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-2838-19",
                "olculer" => "28 x 38 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "60 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.11,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-3040-20",
                "olculer" => "30 x 40 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "60 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.25,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-3545-21",
                "olculer" => "35 x 45 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE) ",
                "thickness" => "60 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.64,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE)  | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-4050-22",
                "olculer" => "40 x 50 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "70 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.08,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-4555-23",
                "olculer" => "45 x 55 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "70 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.58,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-5060-24",
                "olculer" => "50 x 60 + 5 (Kapak)",
                "material" => "Co-Ex (LDPE)",
                "thickness" => "75 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.75,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Co-Ex (LDPE) | Kalınlık: 75 Mikron | Termin: 2 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Kağıt Kargo Poşetleri",
        "keywords" => ["kağıt kargo poşetleri", "kağıt kargo", "kraft kargo", "kağıt kurye", "krg-2030-25", "krg-2432-26", "krg-3040-27"],
        "category" => "kargoKagit",
        "material" => "Kahverengi Kraft",
        "thickness" => "110 Gr/m²",
        "closure" => "Tek Bant (Kalıcı)",
        "price" => 2.8,
        "eco" => 95,
        "type" => "kraft",
        "details" => [
            "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
            "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
            "Hammadde: Kahverengi Kraft | Kalınlık: 110 Gr/m² | Termin: 2 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "KRG-2030-25",
                "olculer" => "20 x 30 + 5 (Kapak)",
                "material" => "Kahverengi Kraft",
                "thickness" => "110 Gr/m²",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.85,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 95,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Kahverengi Kraft | Kalınlık: 110 Gr/m² | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-2432-26",
                "olculer" => "24 x 32 + 5 (Kapak)",
                "material" => "Kahverengi Kraft",
                "thickness" => "110 Gr/m²",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.36,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 95,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Kahverengi Kraft | Kalınlık: 110 Gr/m² | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-3040-27",
                "olculer" => "30 x 40 + 5 (Kapak)",
                "material" => "Kahverengi Kraft",
                "thickness" => "120 Gr/m²",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 3.69,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 95,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Kahverengi Kraft | Kalınlık: 120 Gr/m² | Termin: 2 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Fatura Cebi ve İrsaliye Zarfları",
        "keywords" => ["fatura cebi ve i̇rsaliye zarfları", "fatura cebi", "irsaliye zarfı", "fatura poşeti", "fatura zarfı", "krg-1424-28", "krg-1824-29", "krg-2432-30"],
        "category" => "faturaCebi",
        "material" => "LDPE (Şeffaf)",
        "thickness" => "40 Mikron",
        "closure" => "Kendinden Yapışkanlı",
        "price" => 0.45,
        "eco" => 65,
        "type" => "kargo",
        "details" => [
            "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
            "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
            "Hammadde: LDPE (Şeffaf) | Kalınlık: 40 Mikron | Termin: 2 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "KRG-1424-28",
                "olculer" => "14 x 24 (C5 Boyut)",
                "material" => "LDPE (Şeffaf)",
                "thickness" => "40 Mikron",
                "closure" => "Kendinden Yapışkanlı",
                "price" => 0.27,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: LDPE (Şeffaf) | Kalınlık: 40 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-1824-29",
                "olculer" => "18 x 24 (Standart)",
                "material" => "LDPE (Şeffaf)",
                "thickness" => "40 Mikron",
                "closure" => "Kendinden Yapışkanlı",
                "price" => 0.27,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: LDPE (Şeffaf) | Kalınlık: 40 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-2432-30",
                "olculer" => "24 x 32 (A4 Boyut)",
                "material" => "LDPE (Şeffaf)",
                "thickness" => "45 Mikron",
                "closure" => "Kendinden Yapışkanlı",
                "price" => 0.29,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 65,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: LDPE (Şeffaf) | Kalınlık: 45 Mikron | Termin: 2 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Balonlu Kargo Zarfları",
        "keywords" => ["balonlu kargo zarfları", "balonlu kargo", "balonlu zarf", "patpatlı kargo", "korumalı zarf", "krg-1525-31", "krg-2025-32", "krg-2535-33", "krg-3040-34"],
        "category" => "balonluZarf",
        "material" => "Kraft + Balon PE",
        "thickness" => "110 Mikron",
        "closure" => "Tek Bant (Kalıcı)",
        "price" => 2.75,
        "eco" => 95,
        "type" => "kargo",
        "details" => [
            "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
            "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
            "Hammadde: Kraft + Balon PE | Kalınlık: 110 Mikron | Termin: 2 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "KRG-1525-31",
                "olculer" => "15 x 25 + 4 (Kapak)",
                "material" => "Kraft + Balon PE",
                "thickness" => "110 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.65,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 95,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Kraft + Balon PE | Kalınlık: 110 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-2025-32",
                "olculer" => "20 x 25 + 4 (Kapak)",
                "material" => "Kraft + Balon PE",
                "thickness" => "110 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 1.65,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 95,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Kraft + Balon PE | Kalınlık: 110 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-2535-33",
                "olculer" => "25 x 35 + 4 (Kapak)",
                "material" => "Kraft + Balon PE",
                "thickness" => "110 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.01,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 95,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Kraft + Balon PE | Kalınlık: 110 Mikron | Termin: 2 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRG-3040-34",
                "olculer" => "30 x 40 + 4 (Kapak)",
                "material" => "Kraft + Balon PE",
                "thickness" => "120 Mikron",
                "closure" => "Tek Bant (Kalıcı)",
                "price" => 2.75,
                "multipliers" => ["5000" => 1.0, "10000" => 0.92, "25000" => 0.85],
                "eco" => 95,
                "details" => [
                    "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
                    "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
                    "Hammadde: Kraft + Balon PE | Kalınlık: 120 Mikron | Termin: 2 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Mağaza Poşeti - El Geçme",
        "keywords" => ["mağaza poşeti - el geçme", "el geçme", "el geçmeli", "butik poşeti", "perakende poşet", "mgz-2030-35", "mgz-2638-36", "mgz-3345-37", "mgz-4050-38", "mgz-5060-39"],
        "category" => "magazaElGecme",
        "material" => "LDPE (Parlak)",
        "thickness" => "60 Mikron",
        "closure" => "El Geçme (Punch)",
        "price" => 1.85,
        "eco" => 65,
        "type" => "plastik",
        "details" => [
            "Marka logolu perakende alışveriş taşımacılığı",
            "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
            "Hammadde: LDPE (Parlak) | Kalınlık: 60 Mikron | Termin: 12 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "MGZ-2030-35",
                "olculer" => "20 x 30 + 5 (Alt Körük)",
                "material" => "LDPE (Parlak)",
                "thickness" => "60 Mikron",
                "closure" => "El Geçme (Punch)",
                "price" => 1.11,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Parlak) | Kalınlık: 60 Mikron | Termin: 12 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MGZ-2638-36",
                "olculer" => "26 x 38 + 6 (Alt Körük)",
                "material" => "LDPE (Parlak)",
                "thickness" => "60 Mikron",
                "closure" => "El Geçme (Punch)",
                "price" => 1.16,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Parlak) | Kalınlık: 60 Mikron | Termin: 12 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MGZ-3345-37",
                "olculer" => "33 x 45 + 6 (Alt Körük)",
                "material" => "LDPE (Parlak)",
                "thickness" => "60 Mikron",
                "closure" => "El Geçme (Punch)",
                "price" => 1.74,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Parlak) | Kalınlık: 60 Mikron | Termin: 12 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MGZ-4050-38",
                "olculer" => "40 x 50 + 8 (Alt Körük)",
                "material" => "LDPE (Parlak)",
                "thickness" => "70 Mikron",
                "closure" => "El Geçme (Punch)",
                "price" => 2.35,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Parlak) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MGZ-5060-39",
                "olculer" => "50 x 60 + 8 (Alt Körük)",
                "material" => "LDPE (Parlak)",
                "thickness" => "70 Mikron",
                "closure" => "El Geçme (Punch)",
                "price" => 3.52,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Parlak) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Mağaza Poşeti - Takviyeli",
        "keywords" => ["mağaza poşeti - takviyeli", "takviyeli", "takviyeli sap", "takviyeli poşet", "mgz-2638-40", "mgz-3345-41", "mgz-4050-42", "mgz-5060-43"],
        "category" => "magazaElGecme",
        "material" => "LDPE (Alçak Yoğ.)",
        "thickness" => "70 Mikron",
        "closure" => "Takviyeli El Geçme",
        "price" => 2.1,
        "eco" => 65,
        "type" => "plastik",
        "details" => [
            "Marka logolu perakende alışveriş taşımacılığı",
            "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
            "Hammadde: LDPE (Alçak Yoğ.) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "MGZ-2638-40",
                "olculer" => "26 x 38 + 6 (Alt Körük)",
                "material" => "LDPE (Alçak Yoğ.)",
                "thickness" => "70 Mikron",
                "closure" => "Takviyeli El Geçme",
                "price" => 1.32,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Alçak Yoğ.) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MGZ-3345-41",
                "olculer" => "33 x 45 + 6 (Alt Körük)",
                "material" => "LDPE (Alçak Yoğ.)",
                "thickness" => "70 Mikron",
                "closure" => "Takviyeli El Geçme",
                "price" => 1.98,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Alçak Yoğ.) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MGZ-4050-42",
                "olculer" => "40 x 50 + 8 (Alt Körük)",
                "material" => "LDPE (Alçak Yoğ.)",
                "thickness" => "70 Mikron",
                "closure" => "Takviyeli El Geçme",
                "price" => 2.67,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Alçak Yoğ.) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MGZ-5060-43",
                "olculer" => "50 x 60 + 10 (Alt Körük)",
                "material" => "LDPE (Alçak Yoğ.)",
                "thickness" => "80 Mikron",
                "closure" => "Takviyeli El Geçme",
                "price" => 4.0,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Alçak Yoğ.) | Kalınlık: 80 Mikron | Termin: 12 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Mağaza Poşeti - Yumuşak Saplı",
        "keywords" => ["mağaza poşeti - yumuşak saplı", "yumuşak sap", "saplı mağaza", "kulplu poşet", "şerit kulplu", "mgz-2638-44", "mgz-3345-45", "mgz-4050-46", "mgz-5060-47"],
        "category" => "magazaSapli",
        "material" => "LDPE (Yumuşak)",
        "thickness" => "80 Mikron",
        "closure" => "Yumuşak Sap (Soft)",
        "price" => 2.3,
        "eco" => 65,
        "type" => "plastik",
        "details" => [
            "Marka logolu perakende alışveriş taşımacılığı",
            "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
            "Hammadde: LDPE (Yumuşak) | Kalınlık: 80 Mikron | Termin: 12 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "MGZ-2638-44",
                "olculer" => "26 x 38 + 8 (Alt Körük)",
                "material" => "LDPE (Yumuşak)",
                "thickness" => "80 Mikron",
                "closure" => "Yumuşak Sap (Soft)",
                "price" => 1.44,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Yumuşak) | Kalınlık: 80 Mikron | Termin: 12 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MGZ-3345-45",
                "olculer" => "33 x 45 + 8 (Alt Körük)",
                "material" => "LDPE (Yumuşak)",
                "thickness" => "80 Mikron",
                "closure" => "Yumuşak Sap (Soft)",
                "price" => 2.17,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Yumuşak) | Kalınlık: 80 Mikron | Termin: 12 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MGZ-4050-46",
                "olculer" => "40 x 50 + 10 (Alt Körük)",
                "material" => "LDPE (Yumuşak)",
                "thickness" => "80 Mikron",
                "closure" => "Yumuşak Sap (Soft)",
                "price" => 2.92,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Yumuşak) | Kalınlık: 80 Mikron | Termin: 12 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MGZ-5060-47",
                "olculer" => "50 x 60 + 10 (Alt Körük)",
                "material" => "LDPE (Yumuşak)",
                "thickness" => "90 Mikron",
                "closure" => "Yumuşak Sap (Soft)",
                "price" => 4.38,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Marka logolu perakende alışveriş taşımacılığı",
                    "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
                    "Hammadde: LDPE (Yumuşak) | Kalınlık: 90 Mikron | Termin: 12 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Market Poşetleri - Atlet",
        "keywords" => ["market poşetleri - atlet", "atlet poşet", "hışır poşet", "market poşeti", "atlet market", "mkt-2035-48", "mkt-2545-49", "mkt-2750-50", "mkt-3060-51", "mkt-3570-52"],
        "category" => "marketAtlet",
        "material" => "HDPE (Hışır)",
        "thickness" => "16 Mikron",
        "closure" => "Atlet Tipi (Saplı)",
        "price" => 0.25,
        "eco" => 65,
        "type" => "market",
        "details" => [
            "Hızlı Tüketim ve market ürünleri taşıması",
            "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
            "Hammadde: HDPE (Hışır) | Kalınlık: 16 Mikron | Termin: 10 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "MKT-2035-48",
                "olculer" => "20 x 35 + 10 (Yan Körük)",
                "material" => "HDPE (Hışır)",
                "thickness" => "16 Mikron",
                "closure" => "Atlet Tipi (Saplı)",
                "price" => 0.16,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Hızlı Tüketim ve market ürünleri taşıması",
                    "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
                    "Hammadde: HDPE (Hışır) | Kalınlık: 16 Mikron | Termin: 10 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MKT-2545-49",
                "olculer" => "25 x 45 + 12 (Yan Körük)",
                "material" => "HDPE (Hışır)",
                "thickness" => "16 Mikron",
                "closure" => "Atlet Tipi (Saplı)",
                "price" => 0.25,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Hızlı Tüketim ve market ürünleri taşıması",
                    "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
                    "Hammadde: HDPE (Hışır) | Kalınlık: 16 Mikron | Termin: 10 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MKT-2750-50",
                "olculer" => "27 x 50 + 12 (Yan Körük)",
                "material" => "HDPE (Hışır)",
                "thickness" => "16 Mikron",
                "closure" => "Atlet Tipi (Saplı)",
                "price" => 0.3,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Hızlı Tüketim ve market ürünleri taşıması",
                    "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
                    "Hammadde: HDPE (Hışır) | Kalınlık: 16 Mikron | Termin: 10 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MKT-3060-51",
                "olculer" => "30 x 60 + 14 (Yan Körük)",
                "material" => "HDPE (Hışır) ",
                "thickness" => "16 Mikron",
                "closure" => "Atlet Tipi (Saplı)",
                "price" => 0.4,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Hızlı Tüketim ve market ürünleri taşıması",
                    "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
                    "Hammadde: HDPE (Hışır)  | Kalınlık: 16 Mikron | Termin: 10 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "MKT-3570-52",
                "olculer" => "35 x 70 + 16 (Yan Körük)",
                "material" => "HDPE (Hışır)",
                "thickness" => "18 Mikron",
                "closure" => "Atlet Tipi (Saplı)",
                "price" => 0.54,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Hızlı Tüketim ve market ürünleri taşıması",
                    "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
                    "Hammadde: HDPE (Hışır) | Kalınlık: 18 Mikron | Termin: 10 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Kilitli & Fermuarlı Poşetler",
        "keywords" => ["kilitli & fermuarlı poşetler", "kilitli", "fermuarlı", "doypack", "zipli", "kilitli torba", "kahve torbası", "klt-811-53", "klt-1114-54", "klt-1318-55", "klt-1622-56", "klt-2025-57", "klt-2535-58"],
        "category" => "doypackKilitli",
        "material" => "LDPE (Şeffaf)",
        "thickness" => "50 Mikron",
        "closure" => "Kilitli (Zip-lock)",
        "price" => 4.2,
        "eco" => 65,
        "type" => "kilitli",
        "details" => [
            "Küçük hacimli ürünlerin hijyenik paketlenmesi",
            "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
            "Hammadde: LDPE (Şeffaf) | Kalınlık: 50 Mikron | Termin: 3 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "KLT-811-53",
                "olculer" => "8 x 11",
                "material" => "LDPE (Şeffaf)",
                "thickness" => "50 Mikron",
                "closure" => "Kilitli (Zip-lock)",
                "price" => 2.52,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: LDPE (Şeffaf) | Kalınlık: 50 Mikron | Termin: 3 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KLT-1114-54",
                "olculer" => "11 x 14",
                "material" => "LDPE (Şeffaf)",
                "thickness" => "50 Mikron",
                "closure" => "Kilitli (Zip-lock)",
                "price" => 4.2,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: LDPE (Şeffaf) | Kalınlık: 50 Mikron | Termin: 3 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KLT-1318-55",
                "olculer" => "13 x 18",
                "material" => "LDPE (Şeffaf)",
                "thickness" => "50 Mikron",
                "closure" => "Kilitli (Zip-lock)",
                "price" => 6.38,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: LDPE (Şeffaf) | Kalınlık: 50 Mikron | Termin: 3 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KLT-1622-56",
                "olculer" => "16 x 22",
                "material" => "LDPE (Şeffaf)",
                "thickness" => "50 Mikron",
                "closure" => "Kilitli (Zip-lock)",
                "price" => 9.24,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: LDPE (Şeffaf) | Kalınlık: 50 Mikron | Termin: 3 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KLT-2025-57",
                "olculer" => "20 x 25",
                "material" => "LDPE (Şeffaf)",
                "thickness" => "55 Mikron",
                "closure" => "Kilitli (Zip-lock)",
                "price" => 9.24,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: LDPE (Şeffaf) | Kalınlık: 55 Mikron | Termin: 3 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KLT-2535-58",
                "olculer" => "25 x 35",
                "material" => "LDPE (Şeffaf)",
                "thickness" => "60 Mikron",
                "closure" => "Kilitli (Zip-lock)",
                "price" => 9.24,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: LDPE (Şeffaf) | Kalınlık: 60 Mikron | Termin: 3 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Jelatin & OPP Poşetler",
        "keywords" => ["jelatin & opp poşetler", "jelatin", "opp", "baskısız jelatin", "yapışkanlı jelatin", "jlt-1015-59", "jlt-1520-60", "jlt-2030-61", "jlt-2535-62", "jlt-3040-63"],
        "category" => "oppJelatin",
        "material" => "OPP / PP",
        "thickness" => "30 Mikron",
        "closure" => "Kapak Bandı (Yapışkan)",
        "price" => 0.6,
        "eco" => 65,
        "type" => "jelatin",
        "details" => [
            "Küçük hacimli ürünlerin hijyenik paketlenmesi",
            "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
            "Hammadde: OPP / PP | Kalınlık: 30 Mikron | Termin: 3 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "JLT-1015-59",
                "olculer" => "10 x 15",
                "material" => "OPP / PP",
                "thickness" => "30 Mikron",
                "closure" => "Kapak Bandı (Yapışkan)",
                "price" => 0.36,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: OPP / PP | Kalınlık: 30 Mikron | Termin: 3 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "JLT-1520-60",
                "olculer" => "15 x 20",
                "material" => "OPP / PP",
                "thickness" => "30 Mikron",
                "closure" => "Kapak Bandı (Yapışkan)",
                "price" => 0.6,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: OPP / PP | Kalınlık: 30 Mikron | Termin: 3 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "JLT-2030-61",
                "olculer" => "20 x 30",
                "material" => "OPP / PP",
                "thickness" => "30 Mikron",
                "closure" => "Kapak Bandı (Yapışkan)",
                "price" => 1.2,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: OPP / PP | Kalınlık: 30 Mikron | Termin: 3 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "JLT-2535-62",
                "olculer" => "25 x 35",
                "material" => "OPP / PP",
                "thickness" => "35 Mikron",
                "closure" => "Kapak Bandı (Yapışkan)",
                "price" => 1.32,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: OPP / PP | Kalınlık: 35 Mikron | Termin: 3 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "JLT-3040-63",
                "olculer" => "30 x 40",
                "material" => "OPP / PP",
                "thickness" => "35 Mikron",
                "closure" => "Kapak Bandı (Yapışkan)",
                "price" => 1.32,
                "multipliers" => ["1000" => 1.0, "10000" => 0.88, "50000" => 0.8],
                "eco" => 65,
                "details" => [
                    "Küçük hacimli ürünlerin hijyenik paketlenmesi",
                    "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
                    "Hammadde: OPP / PP | Kalınlık: 35 Mikron | Termin: 3 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Biyobozunur Poşetler",
        "keywords" => ["biyobozunur poşetler", "biyobozunur", "çözünür", "doğada çözünen", "kompost", "pla poşet", "bio-2030-64", "bio-2638-65", "bio-3345-66", "bio-4050-67"],
        "category" => "biyobozunur",
        "material" => "PLA / Nişasta",
        "thickness" => "45 Mikron",
        "closure" => "El Geçme (Punch)",
        "price" => 2.5,
        "eco" => 98,
        "type" => "biyobozunur",
        "details" => [
            "Doğa dostu, kompostlanabilir taşımacılık çözümü",
            "Uyumlu Sektörler: Çevreci Markalar, Organik Gıda, Butikler",
            "Hammadde: PLA / Nişasta | Kalınlık: 45 Mikron | Termin: 14 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "BIO-2030-64",
                "olculer" => "20 x 30 + 5 (Alt Körük)",
                "material" => "PLA / Nişasta",
                "thickness" => "45 Mikron",
                "closure" => "El Geçme (Punch)",
                "price" => 1.52,
                "multipliers" => [],
                "eco" => 98,
                "details" => [
                    "Doğa dostu, kompostlanabilir taşımacılık çözümü",
                    "Uyumlu Sektörler: Çevreci Markalar, Organik Gıda, Butikler",
                    "Hammadde: PLA / Nişasta | Kalınlık: 45 Mikron | Termin: 14 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "BIO-2638-65",
                "olculer" => "26 x 38 + 6 (Alt Körük)",
                "material" => "PLA / Nişasta",
                "thickness" => "45 Mikron",
                "closure" => "El Geçme (Punch)",
                "price" => 2.5,
                "multipliers" => [],
                "eco" => 98,
                "details" => [
                    "Doğa dostu, kompostlanabilir taşımacılık çözümü",
                    "Uyumlu Sektörler: Çevreci Markalar, Organik Gıda, Butikler",
                    "Hammadde: PLA / Nişasta | Kalınlık: 45 Mikron | Termin: 14 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "BIO-3345-66",
                "olculer" => "33 x 45 + 6 (Alt Körük)",
                "material" => "PLA / Nişasta",
                "thickness" => "45 Mikron",
                "closure" => "El Geçme (Punch)",
                "price" => 3.76,
                "multipliers" => [],
                "eco" => 98,
                "details" => [
                    "Doğa dostu, kompostlanabilir taşımacılık çözümü",
                    "Uyumlu Sektörler: Çevreci Markalar, Organik Gıda, Butikler",
                    "Hammadde: PLA / Nişasta | Kalınlık: 45 Mikron | Termin: 14 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "BIO-4050-67",
                "olculer" => "40 x 50 + 8 (Alt Körük)",
                "material" => "PLA / Nişasta",
                "thickness" => "50 Mikron",
                "closure" => "El Geçme (Punch)",
                "price" => 5.06,
                "multipliers" => [],
                "eco" => 98,
                "details" => [
                    "Doğa dostu, kompostlanabilir taşımacılık çözümü",
                    "Uyumlu Sektörler: Çevreci Markalar, Organik Gıda, Butikler",
                    "Hammadde: PLA / Nişasta | Kalınlık: 50 Mikron | Termin: 14 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Kraft Çantalar",
        "keywords" => ["kraft çantalar", "kraft çanta", "kraft poşet", "büküm saplı", "burgu saplı", "kraft kağıt", "krf-1825-68", "krf-2532-69", "krf-3242-70"],
        "category" => "kraftCanta",
        "material" => "Kraft Kağıt",
        "thickness" => "100 Gr/m²",
        "closure" => "Büküm Kağıt Sap",
        "price" => 3.4,
        "eco" => 95,
        "type" => "kraft",
        "details" => [
            "Premium ve ekolojik paketleme/taşıma çantası",
            "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
            "Hammadde: Kraft Kağıt | Kalınlık: 100 Gr/m² | Termin: 15 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "KRF-1825-68",
                "olculer" => "18 x 25 + 8 (Yan Körük)",
                "material" => "Kraft Kağıt",
                "thickness" => "100 Gr/m²",
                "closure" => "Büküm Kağıt Sap",
                "price" => 2.04,
                "multipliers" => ["3000" => 1.0, "10000" => 0.9, "30000" => 0.83],
                "eco" => 95,
                "details" => [
                    "Premium ve ekolojik paketleme/taşıma çantası",
                    "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
                    "Hammadde: Kraft Kağıt | Kalınlık: 100 Gr/m² | Termin: 15 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRF-2532-69",
                "olculer" => "25 x 32 + 8 (Yan Körük)",
                "material" => "Kraft Kağıt",
                "thickness" => "100 Gr/m²",
                "closure" => "Büküm Kağıt Sap",
                "price" => 2.99,
                "multipliers" => ["3000" => 1.0, "10000" => 0.9, "30000" => 0.83],
                "eco" => 95,
                "details" => [
                    "Premium ve ekolojik paketleme/taşıma çantası",
                    "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
                    "Hammadde: Kraft Kağıt | Kalınlık: 100 Gr/m² | Termin: 15 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRF-3242-70",
                "olculer" => "32 x 42 + 12 (Yan Körük)",
                "material" => "Kraft Kağıt",
                "thickness" => "110 Gr/m²",
                "closure" => "Büküm Kağıt Sap",
                "price" => 5.02,
                "multipliers" => ["3000" => 1.0, "10000" => 0.9, "30000" => 0.83],
                "eco" => 95,
                "details" => [
                    "Premium ve ekolojik paketleme/taşıma çantası",
                    "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
                    "Hammadde: Kraft Kağıt | Kalınlık: 110 Gr/m² | Termin: 15 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Lüks Karton Çantalar",
        "keywords" => ["lüks karton çantalar", "lüks karton", "karton çanta", "kuşe çanta", "bristol", "ipli çanta", "krt-1825-71", "krt-2532-72", "krt-3242-73"],
        "category" => "luksKarton",
        "material" => "Kuşe Karton",
        "thickness" => "230 Gr/m²",
        "closure" => "İpli Sap (Kordon)",
        "price" => 4.8,
        "eco" => 65,
        "type" => "kraft",
        "details" => [
            "Premium ve ekolojik paketleme/taşıma çantası",
            "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
            "Hammadde: Kuşe Karton | Kalınlık: 230 Gr/m² | Termin: 15 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "KRT-1825-71",
                "olculer" => "18 x 25 + 8 (Yan Körük)",
                "material" => "Kuşe Karton",
                "thickness" => "230 Gr/m²",
                "closure" => "İpli Sap (Kordon)",
                "price" => 2.88,
                "multipliers" => ["3000" => 1.0, "10000" => 0.9, "30000" => 0.83],
                "eco" => 65,
                "details" => [
                    "Premium ve ekolojik paketleme/taşıma çantası",
                    "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
                    "Hammadde: Kuşe Karton | Kalınlık: 230 Gr/m² | Termin: 15 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRT-2532-72",
                "olculer" => "25 x 32 + 8 (Yan Körük)",
                "material" => "Kuşe Karton",
                "thickness" => "230 Gr/m²",
                "closure" => "İpli Sap (Kordon)",
                "price" => 4.22,
                "multipliers" => ["3000" => 1.0, "10000" => 0.9, "30000" => 0.83],
                "eco" => 65,
                "details" => [
                    "Premium ve ekolojik paketleme/taşıma çantası",
                    "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
                    "Hammadde: Kuşe Karton | Kalınlık: 230 Gr/m² | Termin: 15 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KRT-3242-73",
                "olculer" => "32 x 42 + 12 (Yan Körük)",
                "material" => "Kuşe Karton",
                "thickness" => "250 Gr/m²",
                "closure" => "İpli Sap (Kordon)",
                "price" => 7.09,
                "multipliers" => ["3000" => 1.0, "10000" => 0.9, "30000" => 0.83],
                "eco" => 65,
                "details" => [
                    "Premium ve ekolojik paketleme/taşıma çantası",
                    "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
                    "Hammadde: Kuşe Karton | Kalınlık: 250 Gr/m² | Termin: 15 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Kese Kağıtları",
        "keywords" => ["kese kağıtları", "kese kağıdı", "fırın poşeti", "fast food kese", "sülfit kağıt", "kse-1020-74", "kse-1525-75", "kse-2030-76"],
        "category" => "keseKagidi",
        "material" => "Sülfit Kağıt",
        "thickness" => "50 Gr/m²",
        "closure" => "Körüklü (Yan Körük)",
        "price" => 0.85,
        "eco" => 95,
        "type" => "kraft",
        "details" => [
            "Premium ve ekolojik paketleme/taşıma çantası",
            "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
            "Hammadde: Sülfit Kağıt | Kalınlık: 50 Gr/m² | Termin: 5 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "KSE-1020-74",
                "olculer" => "10 x 20 + 4 (Yan Körük)",
                "material" => "Sülfit Kağıt",
                "thickness" => "50 Gr/m²",
                "closure" => "Körüklü (Yan Körük)",
                "price" => 0.51,
                "multipliers" => [],
                "eco" => 95,
                "details" => [
                    "Premium ve ekolojik paketleme/taşıma çantası",
                    "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
                    "Hammadde: Sülfit Kağıt | Kalınlık: 50 Gr/m² | Termin: 5 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KSE-1525-75",
                "olculer" => "15 x 25 + 5 (Yan Körük)",
                "material" => "Sülfit Kağıt",
                "thickness" => "50 Gr/m²",
                "closure" => "Körüklü (Yan Körük)",
                "price" => 0.51,
                "multipliers" => [],
                "eco" => 95,
                "details" => [
                    "Premium ve ekolojik paketleme/taşıma çantası",
                    "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
                    "Hammadde: Sülfit Kağıt | Kalınlık: 50 Gr/m² | Termin: 5 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "KSE-2030-76",
                "olculer" => "20 x 30 + 6 (Yan Körük)",
                "material" => "Sülfit Kağıt",
                "thickness" => "55 Gr/m²",
                "closure" => "Körüklü (Yan Körük)",
                "price" => 0.56,
                "multipliers" => [],
                "eco" => 95,
                "details" => [
                    "Premium ve ekolojik paketleme/taşıma çantası",
                    "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
                    "Hammadde: Sülfit Kağıt | Kalınlık: 55 Gr/m² | Termin: 5 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Nonwoven (Tela) Çantalar",
        "keywords" => ["nonwoven (tela) çantalar", "tela çanta", "nonwoven", "bez çanta tela", "elyaf çanta", "tla-2535-77", "tla-3040-78", "tla-3540-79", "tla-4050-80"],
        "category" => "telaCanta",
        "material" => "%100 PP Tela",
        "thickness" => "80 Gr/m²",
        "closure" => "Tela Saplı",
        "price" => 5.5,
        "eco" => 65,
        "type" => "bez",
        "details" => [
            "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
            "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
            "Hammadde: %100 PP Tela | Kalınlık: 80 Gr/m² | Termin: 14 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "TLA-2535-77",
                "olculer" => "25 x 35",
                "material" => "%100 PP Tela",
                "thickness" => "80 Gr/m²",
                "closure" => "Tela Saplı",
                "price" => 4.01,
                "multipliers" => ["1000" => 1.0, "5000" => 0.9, "10000" => 0.84],
                "eco" => 65,
                "details" => [
                    "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
                    "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
                    "Hammadde: %100 PP Tela | Kalınlık: 80 Gr/m² | Termin: 14 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "TLA-3040-78",
                "olculer" => "30 x 40",
                "material" => "%100 PP Tela",
                "thickness" => "80 Gr/m²",
                "closure" => "Tela Saplı",
                "price" => 5.5,
                "multipliers" => ["1000" => 1.0, "5000" => 0.9, "10000" => 0.84],
                "eco" => 65,
                "details" => [
                    "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
                    "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
                    "Hammadde: %100 PP Tela | Kalınlık: 80 Gr/m² | Termin: 14 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "TLA-3540-79",
                "olculer" => "35 x 40",
                "material" => "%100 PP Tela",
                "thickness" => "80 Gr/m²",
                "closure" => "Tela Saplı",
                "price" => 6.42,
                "multipliers" => ["1000" => 1.0, "5000" => 0.9, "10000" => 0.84],
                "eco" => 65,
                "details" => [
                    "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
                    "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
                    "Hammadde: %100 PP Tela | Kalınlık: 80 Gr/m² | Termin: 14 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "TLA-4050-80",
                "olculer" => "40 x 50",
                "material" => "%100 PP Tela",
                "thickness" => "90 Gr/m²",
                "closure" => "Tela Saplı",
                "price" => 9.17,
                "multipliers" => ["1000" => 1.0, "5000" => 0.9, "10000" => 0.84],
                "eco" => 65,
                "details" => [
                    "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
                    "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
                    "Hammadde: %100 PP Tela | Kalınlık: 90 Gr/m² | Termin: 14 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Ham Bez (Pamuk) Çantalar",
        "keywords" => ["ham bez (pamuk) çantalar", "ham bez", "pamuk çanta", "kumaş çanta", "promosyon bez", "bez-3040-81", "bez-3540-82", "bez-4050-83"],
        "category" => "hamBez",
        "material" => "%100 Pamuk Bez",
        "thickness" => "140 Gr/m²",
        "closure" => "Pamuk Omuz Sapı",
        "price" => 12.0,
        "eco" => 95,
        "type" => "bez",
        "details" => [
            "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
            "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
            "Hammadde: %100 Pamuk Bez | Kalınlık: 140 Gr/m² | Termin: 14 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "BEZ-3040-81",
                "olculer" => "30 x 40",
                "material" => "%100 Pamuk Bez",
                "thickness" => "140 Gr/m²",
                "closure" => "Pamuk Omuz Sapı",
                "price" => 12.0,
                "multipliers" => ["1000" => 1.0, "5000" => 0.9, "10000" => 0.84],
                "eco" => 95,
                "details" => [
                    "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
                    "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
                    "Hammadde: %100 Pamuk Bez | Kalınlık: 140 Gr/m² | Termin: 14 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "BEZ-3540-82",
                "olculer" => "35 x 40",
                "material" => "%100 Pamuk Bez",
                "thickness" => "140 Gr/m²",
                "closure" => "Pamuk Omuz Sapı",
                "price" => 14.0,
                "multipliers" => ["1000" => 1.0, "5000" => 0.9, "10000" => 0.84],
                "eco" => 95,
                "details" => [
                    "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
                    "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
                    "Hammadde: %100 Pamuk Bez | Kalınlık: 140 Gr/m² | Termin: 14 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "BEZ-4050-83",
                "olculer" => "40 x 50",
                "material" => "%100 Pamuk Bez",
                "thickness" => "140 Gr/m²",
                "closure" => "Pamuk Omuz Sapı",
                "price" => 20.0,
                "multipliers" => ["1000" => 1.0, "5000" => 0.9, "10000" => 0.84],
                "eco" => 95,
                "details" => [
                    "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
                    "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
                    "Hammadde: %100 Pamuk Bez | Kalınlık: 140 Gr/m² | Termin: 14 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Balonlu Patpat Naylonlar",
        "keywords" => ["balonlu patpat naylonlar", "balonlu patpat", "patpat naylon", "patpat rulo", "balonlu ambalaj", "ind-100cmx50mtrulo-84", "ind-120cmx50mtrulo-85", "ind-150cmx50mtrulo-86"],
        "category" => "balonluPatpat",
        "material" => "LDPE",
        "thickness" => "50 Gr/m²",
        "closure" => "Standart Kapama",
        "price" => 3.5,
        "eco" => 65,
        "type" => "plastik",
        "details" => [
            "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
            "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
            "Hammadde: LDPE | Kalınlık: 50 Gr/m² | Termin: 4 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "IND-100cmx50mtRulo-84",
                "olculer" => "100 cm x 50 mt Rulo",
                "material" => "LDPE",
                "thickness" => "50 Gr/m²",
                "closure" => "Standart",
                "price" => 3.5,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
                    "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
                    "Hammadde: LDPE | Kalınlık: 50 Gr/m² | Termin: 4 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "IND-120cmx50mtRulo-85",
                "olculer" => "120 cm x 50 mt Rulo",
                "material" => "LDPE",
                "thickness" => "50 Gr/m²",
                "closure" => "Standart",
                "price" => 3.5,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
                    "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
                    "Hammadde: LDPE | Kalınlık: 50 Gr/m² | Termin: 4 İş Günü"
                ]
            ],
            [
                "urun_kodu" => "IND-150cmx50mtRulo-86",
                "olculer" => "150 cm x 50 mt Rulo",
                "material" => "LDPE",
                "thickness" => "55 Gr/m²",
                "closure" => "Standart",
                "price" => 3.5,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
                    "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
                    "Hammadde: LDPE | Kalınlık: 55 Gr/m² | Termin: 4 İş Günü"
                ]
            ]
        ]
    ],
    [
        "name" => "Şrink Filmler (P.E, POF, PVC)",
        "keywords" => ["şrink filmler (p.e, pof, pvc)", "şrink", "shrink", "pof film", "pvc film", "paketleme filmi", "ind-bobin/rulo-87"],
        "category" => "srinkFilm",
        "material" => "POF (Polyolefin)",
        "thickness" => "19 Mikron",
        "closure" => "Standart Kapama",
        "price" => 2.1,
        "eco" => 65,
        "type" => "plastik",
        "details" => [
            "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
            "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
            "Hammadde: POF (Polyolefin) | Kalınlık: 19 Mikron | Termin: 4 İş Günü"
        ],
        "variants" => [
            [
                "urun_kodu" => "IND-Bobin/Rulo-87",
                "olculer" => "Bobin / Rulo (Özel En)",
                "material" => "POF (Polyolefin)",
                "thickness" => "19 Mikron",
                "closure" => "Standart",
                "price" => 2.1,
                "multipliers" => [],
                "eco" => 65,
                "details" => [
                    "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
                    "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
                    "Hammadde: POF (Polyolefin) | Kalınlık: 19 Mikron | Termin: 4 İş Günü"
                ]
            ]
        ]
    ]
];;;


function parseDimensions($dimStr) {
    $clean = strtolower($dimStr);
    if (strpos($clean, "rulo") !== false || strpos($clean, "eni") !== false) {
        preg_match('/(\d+)/', $clean, $matches);
        $w = !empty($matches) ? floatval($matches[1]) : 100;
        return ['width' => $w, 'height' => 0, 'isRoll' => true];
    }
    if (preg_match('/(\d+(?:\.\d+)?)\s*[x*]\s*(\d+(?:\.\d+)?)/', $clean, $matches)) {
        return ['width' => floatval($matches[1]), 'height' => floatval($matches[2]), 'isRoll' => false];
    } else {
        preg_match_all('/[0-9.]+/', $clean, $matches);
        if (isset($matches[0]) && count($matches[0]) >= 2) {
            return ['width' => floatval($matches[0][0]), 'height' => floatval($matches[0][1]), 'isRoll' => false];
        }
    }
    return ['width' => 0, 'height' => 0, 'isRoll' => false];
}

function findClosestVariant($p, $prompt) {
    $norm = strtolower($prompt);
    if (isset($p['variants']) && is_array($p['variants'])) {
        foreach ($p['variants'] as $v) {
            $code = isset($v['urun_kodu']) ? strtolower($v['urun_kodu']) : "";
            if ($code && strpos($norm, $code) !== false) {
                return $v;
            }
        }
    }
    $userDim = parseDimensions($prompt);
    if (($userDim['width'] > 0 || $userDim['height'] > 0 || $userDim['isRoll']) && isset($p['variants']) && is_array($p['variants'])) {
        $bestVariant = $p['variants'][0];
        $minDiff = 99999999;
        foreach ($p['variants'] as $v) {
            $vDim = parseDimensions(isset($v['olculer']) ? $v['olculer'] : "");
            if ($userDim['isRoll'] && $vDim['isRoll']) {
                $diff = abs($userDim['width'] - $vDim['width']);
                if ($diff < $minDiff) {
                    $minDiff = $diff;
                    $bestVariant = $v;
                }
            } else if (!$userDim['isRoll'] && !$vDim['isRoll']) {
                $diff = abs($userDim['width'] - $vDim['width']) + abs($userDim['height'] - $vDim['height']);
                if ($diff < $minDiff) {
                    $minDiff = $diff;
                    $bestVariant = $v;
                }
            }
        }
        return $bestVariant;
    }
    return (isset($p['variants']) && is_array($p['variants']) && count($p['variants']) > 0) ? $p['variants'][0] : null;
}

function generateDynamicPayload($extracted, $prompt, $products_taxonomy) {
    $rawCategory = isset($extracted['urun_kategorisi']) ? $extracted['urun_kategorisi'] : "El Geçmeli Mağaza Poşeti";
    $baskiDurumu = isset($extracted['baski_durumu']) ? $extracted['baski_durumu'] : "Baskılı";
    $baskiDetayi = isset($extracted['baski_detayi']) ? $extracted['baski_detayi'] : ['renk_sayisi' => 2, 'baski_tarafi' => "Tek Yön"];

    $promptNorm = strtolower($prompt);
    
    // Find closest product in core taxonomy
    $matched = null;
    foreach ($products_taxonomy as $p) {
        $found = false;
        foreach ($p['keywords'] as $kw) {
            if (strpos($promptNorm, $kw) !== false) {
                $found = true;
                break;
            }
        }
        if ($found || strpos($promptNorm, strtolower($p['name'])) !== false) {
            $matched = $p;
            break;
        }
    }

    $norm = strtolower($rawCategory . " " . $prompt);

    if (!$matched) {
        if (strpos($norm, "kraft") !== false || strpos($norm, "kağıt") !== false || strpos($norm, "çanta") !== false || strpos($norm, "karton") !== false) {
            $matched = getProductByName("Kraft Çantalar", $products_taxonomy);
        } else if (strpos($norm, "gıda") !== false || strpos($norm, "kahve") !== false || strpos($norm, "doypack") !== false || strpos($norm, "kilit") !== false) {
            $matched = getProductByName("Kilitli & Fermuarlı Poşetler", $products_taxonomy);
        } else if (strpos($norm, "patpat") !== false || strpos($norm, "balonlu") !== false) {
            $matched = getProductByName("Balonlu Patpat Naylonlar", $products_taxonomy);
        } else if (strpos($norm, "şrink") !== false || strpos($norm, "shrink") !== false) {
            $matched = getProductByName("Şrink Filmler (P.E, POF, PVC)", $products_taxonomy);
        } else if (strpos($norm, "tela") !== false || strpos($norm, "nonwoven") !== false) {
            $matched = getProductByName("Nonwoven (Tela) Çantalar", $products_taxonomy);
        } else if (strpos($norm, "bez") !== false || strpos($norm, "pamuk") !== false) {
            $matched = getProductByName("Ham Bez (Pamuk) Çantalar", $products_taxonomy);
        } else if (strpos($norm, "kargo") !== false || strpos($norm, "zarf") !== false) {
            $matched = getProductByName("Standart (Baskısız) Kargo Poşetleri", $products_taxonomy);
        } else {
            $matched = getProductByName("Mağaza Poşeti - El Geçme", $products_taxonomy);
        }
    }

    $p = $matched;
    $v = findClosestVariant($p, $prompt);
    if (!$v) {
        $v = $p;
    }
    
    $isKgProduct = (strpos(strtolower($p['name']), "şrink") !== false) || 
                   (strpos(strtolower($p['name']), "shrink") !== false) || 
                   (strpos(strtolower($p['name']), "patpat") !== false) || 
                   (strpos(strtolower($p['name']), "balonlu") !== false) ||
                   (strpos(strtolower($p['name']), "rulo") !== false) ||
                   (strpos($norm, "kg") !== false) || 
                   (strpos($norm, "rulo") !== false) || 
                   (strpos($norm, "film") !== false);

    $adetMiktari = isset($extracted['adet_miktari']) ? intval($extracted['adet_miktari']) : ($isKgProduct ? 500 : 10000);
    
    if ($isKgProduct && $adetMiktari === 10000 && strpos($prompt, "10000") === false && strpos($prompt, "10.000") === false) {
        $adetMiktari = 500;
    }

    $specType = $p['category'];
    $material = isset($v['material']) ? $v['material'] : $p['material'];
    $thickness = isset($v['thickness']) ? $v['thickness'] : $p['thickness'];
    $closure = isset($v['closure']) ? $v['closure'] : $p['closure'];
    $color = "Parlak Beyaz / Özel Pantone";
    
    $stokDurumu = isset($v['stok_durumu']) ? $v['stok_durumu'] : (isset($p['stok_durumu']) ? $p['stok_durumu'] : (
        ($baskiDurumu === "Baskılı" || strpos($p['name'], "Mağaza") !== false || strpos($p['name'], "Lüks") !== false || strpos($p['name'], "Bez") !== false || strpos($p['name'], "Tela") !== false)
            ? "Siparişle" 
            : "Var"
    ));
    $leadTime = ($stokDurumu === "Var") ? "Aynı Gün / 24 Saat Kargo" : (isset($v['termin_suresi']) ? $v['termin_suresi'] : "7-12 İş Günü");
    $priceUnit = isset($v['price']) ? $v['price'] : $p['price'];
    $ecoScore = isset($v['eco']) ? $v['eco'] : $p['eco'];
    $customDetails = isset($v['details']) ? $v['details'] : $p['details'];
    
    if (isset($v['olculer'])) {
        $dimensions = $v['olculer'];
    } else if (isset($p['dimensions'])) {
        $dimensions = $p['dimensions'];
    } else if ($p['type'] === "kraft") {
        $dimensions = "26x35x9 cm";
    } else if ($p['type'] === "kargo") {
        $dimensions = "30x40 cm";
    } else {
        $dimensions = "35x45 cm";
    }

    // Extract dimensions from prompt if exists and is different
    if (preg_match('/(\d+)\s*[x*]\s*(\d+)/', $prompt, $dimMatch)) {
        $userW = intval($dimMatch[1]);
        $userH = intval($dimMatch[2]);
        $vDim = parseDimensions($dimensions);
        if ($vDim['width'] !== $userW || $vDim['height'] !== $userH) {
            $dimensions = $userW . "x" . $userH . " cm";
        }
    }

    if ($baskiDurumu === "Baskılı") {
        $colors = isset($baskiDetayi['renk_sayisi']) ? intval($baskiDetayi['renk_sayisi']) : 2;
        $premiumTaraf = (isset($baskiDetayi['baski_tarafi']) && $baskiDetayi['baski_tarafi'] === "Çift Yön") ? 1.25 : 1.0;
        $priceUnit = $priceUnit * (1 + ($colors - 1) * 0.08) * $premiumTaraf;
    } else {
        $priceUnit = $priceUnit * 0.85;
    }

    $volMultiplier = 1.0;
    $multipliers = isset($v['multipliers']) ? $v['multipliers'] : (isset($p['multipliers']) ? $p['multipliers'] : null);
    if (isset($multipliers) && is_array($multipliers) && count($multipliers) > 0) {
        $sortedQtys = array_keys($multipliers);
        sort($sortedQtys, SORT_NUMERIC);
        $matchedQty = $sortedQtys[0];
        foreach ($sortedQtys as $q) {
            if ($q <= $adetMiktari) {
                $matchedQty = $q;
            }
        }
        $volMultiplier = $multipliers[$matchedQty];
    }
    $priceUnit = $priceUnit * $volMultiplier;

    // Add dynamic fatura cebi addon pricing rules
    $showAdhesivePocketAddon = false;
    $nameLower = strtolower($p['name']);
    if (strpos($nameLower, "cepli") === false && 
        strpos($nameLower, "fatura cebi ve irsaliye zarfları") === false && 
        strpos($nameLower, "fatura cebi") === false && 
        strpos($nameLower, "irsaliye zarfları") === false) {
        
        $category = $p['category'];
        $isKargoCategory = ($p['type'] === "kargo") || 
                           ($category === "kargoPlastik") || 
                           ($category === "kargoCepli") || 
                           ($category === "kargoKagit") || 
                           ($category === "fatura");
        
        if ($isKargoCategory) {
            if (strpos($nameLower, "baskılı") !== false || 
                strpos($nameLower, "standart") !== false || 
                strpos($nameLower, "baskısız") !== false || 
                strpos($nameLower, "kağıt") !== false || 
                strpos($nameLower, "balonlu") !== false ||
                strpos($nameLower, "baskili") !== false ||
                strpos($nameLower, "baskisiz") !== false ||
                strpos($nameLower, "kagit") !== false) {
                
                $showAdhesivePocketAddon = true;
            }
        }
    }

    $promptLower = strtolower($prompt);
    $userWantsPocket = (strpos($promptLower, "fatura cebi") !== false) || 
                       (strpos($promptLower, "fatura cepli") !== false) || 
                       (strpos($promptLower, "irsaliye cebi") !== false) || 
                       ((strpos($promptLower, "cepli") !== false) && strpos($nameLower, "cepli") === false);

    $addAdhesivePocket = $showAdhesivePocketAddon && $userWantsPocket;
    if ($addAdhesivePocket) {
        $priceUnit += 0.24;
        $customDetails = is_array($customDetails) ? $customDetails : [];
        if (!in_array("Ekstra Yapışkanlı Fatura Cebi (Paket/Koli Uyumlu)", $customDetails)) {
            $customDetails[] = "Ekstra Yapışkanlı Fatura Cebi (Paket/Koli Uyumlu)";
        }
    }

    $unitLabel = $isKgProduct ? "Kg" : "Adet";
    $formattedPrice = "₺" . number_format($priceUnit, 2, '.', '');
    $formattedTotal = "₺" . number_format(round($adetMiktari * $priceUnit));

    $assistantText = "";
    if ($baskiDurumu === "Baskılı") {
        $colorsVal = isset($baskiDetayi['renk_sayisi']) ? $baskiDetayi['renk_sayisi'] : 2;
        $tarafVal = isset($baskiDetayi['baski_tarafi']) ? $baskiDetayi['baski_tarafi'] : 'Tek Yön';
        $assistantText = "**Tebrikler! Marka logolu ve prestijli bir kurumsal ambalaj tasarımı seçtiniz.** \n\nYapay zeka asistanı analizimiz sonucunda, firmanızın kurumsal değerini sokağa taşıyacak **" . $p['name'] . "** spesifikasyon şartnamesini hazırladım. Detayları yan tarafta yer alan teknik panelde inceleyebilirsiniz. \n\nSokaklarda markanızın ücretsiz reklamını yapacak **" . $colorsVal . " Renk " . $tarafVal . "** baskılı üretimimiz için şu bilgileri paylaşabilir misiniz?\n1. **Marka logonuz hazır mı?** Vektörel formatta (.PDF, .AI, .CDR, .EPS) logonuzu bize iletebilir misiniz? Kaç renkli bir baskı planlıyorsunuz?\n2. Tasarım ekibimizin size tamamen **ücretsiz** hazırlayacağı **3D ambalaj ön izleme mock-up** çalışmasıyla logo yerleşimini görmek ister misiniz?\n\nBelirttiğiniz **" . number_format($adetMiktari) . " " . $unitLabel . "** sipariş hacmi için tüm üretim hattı optimize edilmiştir.";
    } else {
        $assistantText = "Talebiniz doğrultusunda **" . number_format($adetMiktari) . " " . $unitLabel . "** baskısız (düz) **" . $p['name'] . "** teknik şartnamesini derledim. Detaylara yan taraftan göz atabilirsiniz.\n\n**💡 Ambalaj & Marka Gücü Hakkında Önemli Bir Hatırlatma:**\nDüz (baskısız) ambalajlar ilk aşamada bütçeye uygun görünse de, müşterilerinizin ürününüzü taşırken yapacağı reklamın değeri paha biçilemezdir. **Logo baskılı özel tasarım ambalajlar, firmanıza kurumsal bir imaj kazandırır ve marka bilinirliğini ücretsiz olarak %85 oranında artırır!**\n\nGelin markanıza elit bir değer katmak adına küçük bir dokunuş yapalım:\n- Markanızın logosunu bizimle paylaşın, grafik ekibimiz size **tamamen taahhütsüz ve ücretsiz olarak 3D logolu ambalaj görselleştirmesi** hazırlasın.\n- Baskılı seçeneğin birim fiyattaki ufak farkını kıyaslamak ve markanızın kurumsal prestijini katlamak için tasarladığınız **renk sayısını** bize iletmeniz yeterli!";
    }

    $renkSayisiString = "2 Renk";
    if (isset($baskiDetayi['renk_sayisi'])) {
        $rc = intval($baskiDetayi['renk_sayisi']);
        if ($rc === 1) $renkSayisiString = "1 Renk";
        else if ($rc === 2) $renkSayisiString = "2 Renk";
        else if ($rc === 3) $renkSayisiString = "3 Renk";
        else if ($rc === 4) $renkSayisiString = "4 Renk (CMYK)";
        else if ($rc >= 5) $renkSayisiString = "5+ Renk / Özel Renk";
    }

    return [
        'assistantText' => $assistantText,
        'spec' => [
            'name' => $p['name'],
            'dimensions' => $dimensions,
            'material' => $material,
            'thickness' => $thickness,
            'closure' => $closure,
            'color' => $color,
            'leadTime' => $leadTime,
            'stokDurumu' => $stokDurumu,
            'stok_durumu' => $stokDurumu,
            'moq' => number_format($adetMiktari) . " " . $unitLabel,
            'unitPrice' => $formattedPrice,
            'totalPrice' => $formattedTotal,
            'imageType' => $specType,
            'customDetails' => $customDetails,
            'ecoScore' => $ecoScore,
            'baskiDurumu' => ($baskiDurumu === "Baskısız" ? "Baskısız" : "Baskılı"),
            'renkSayisi' => $renkSayisiString
        ]
    ];
}

function getProductByName($name, $taxonomy) {
    foreach ($taxonomy as $p) {
        if ($p['name'] === $name) {
            return $p;
        }
    }
    return $taxonomy[0];
}

$norm = strtolower($prompt);
$isExplicitUnprinted = (strpos($norm, "baskısız") !== false) || (strpos($norm, "baskı istemiyorum") !== false) || (strpos($norm, "baskı olmasın") !== false);
$baskiDurumu = $isExplicitUnprinted ? "Baskısız" : "Baskılı";

$urunKategorisi = "El Geçmeli Mağaza Poşeti";
if (strpos($norm, "kargo") !== false) $urunKategorisi = "Kargo Poşeti";
else if (strpos($norm, "kraft") !== false || strpos($norm, "kağıt") !== false) $urunKategorisi = "Kraft Taşıma Çantası";
else if (strpos($norm, "gıda") !== false || strpos($norm, "kahve") !== false || strpos($norm, "doypack") !== false) $urunKategorisi = "Doypack Kilitli Gıda Ambalajı";
else if (strpos($norm, "balonlu") !== false || strpos($norm, "bubble") !== false || strpos($norm, "patpat") !== false) $urunKategorisi = "Balonlu Patpat Ambalaj";

$extracted = [
    'urun_kategorisi' => $urunKategorisi,
    'adet_miktari' => (strpos($norm, "kraft") !== false) ? 5000 : 10000,
    'baski_durumu' => $baskiDurumu,
    'baski_detayi' => [
        'renk_sayisi' => $isExplicitUnprinted ? 0 : 2,
        'baski_tarafi' => "Tek Yön"
    ]
];

$gemini_success = false;
$response_data = null;

if (!empty($gemini_api_key)) {
    // If Gemini key is set, call Gemini API
    $instructions = "You are the specialized \"poset.com Industrial Design & Commercial Ambalaj AI\". The user wants to customize a packaging solution. Analyze their raw natural language prompt: \"" . $prompt . "\" \n\nCRITICAL Guidelines: 1. Default to Printed (Baskılı): If the user does not specify, you MUST assume 'Baskılı'. 2. If they explicitly request unprinted, set 'baski_durumu' to 'Baskısız'. 3. For printed, set 'renk_sayisi' to 2 by default unless specified. Output strictly a JSON matching the required schema.";
    
    $payload = [
        'contents' => [
            [
                'parts' => [
                    ['text' => $instructions]
                ]
            ]
        ],
        'generationConfig' => [
            'responseMimeType' => 'application/json',
            'responseSchema' => [
                'type' => 'OBJECT',
                'properties' => [
                    'urun_kategorisi' => [
                        'type' => 'STRING',
                        'description' => 'E-ticaret Kargo Poşeti, FSC Sertifikalı Kraft Çanta, Doypack Gıda Ambalajı, El Geçmeli Mağaza Poşeti veya Balonlu Patpat Ambalaj.'
                    ],
                    'adet_miktari' => [
                        'type' => 'INTEGER',
                        'description' => 'Sektörel MOQ değerini varsayılan yap: Kraft için 5000, Plastikler için 10000.'
                    ],
                    'baski_durumu' => [
                        'type' => 'STRING',
                        'enum' => ['Baskılı', 'Baskısız']
                    ],
                    'baski_detayi' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'renk_sayisi' => ['type' => 'INTEGER'],
                            'baski_tarafi' => ['type' => 'STRING', 'enum' => ['Tek Yön', 'Çift Yön']]
                        ],
                        'required' => ['renk_sayisi', 'baski_tarafi']
                    ]
                ],
                'required' => ['urun_kategorisi', 'adet_miktari', 'baski_durumu', 'baski_detayi']
            ]
        ]
    ];

    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . urlencode($gemini_api_key);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
    
    $res = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code === 200 && $res) {
        $res_json = json_decode($res, true);
        if (isset($res_json['candidates'][0]['content']['parts'][0]['text'])) {
            $gemini_text = $res_json['candidates'][0]['content']['parts'][0]['text'];
            $gemini_extracted = json_decode($gemini_text, true);
            if ($gemini_extracted) {
                $extracted = $gemini_extracted;
                $gemini_success = true;
            }
        }
    }
}

$response_data = generateDynamicPayload($extracted, $prompt, $products_taxonomy);
$response_data['structuredAnalysis'] = $extracted;

echo json_encode($response_data);
