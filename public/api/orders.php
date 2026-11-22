<?php

declare(strict_types=1);

require_once __DIR__ . '/b420-store.php';

const OWNER_EMAIL  = 'belgium@belgium420.com';
const FROM_EMAIL    = 'orders@belgium420.com';
const FROM_NAME     = 'Belgium420 Orders';
const ADMIN_KEY     = '420Belgium';
const ALLOWED_ORIGIN = 'https://belgium420.com';
const ORDER_NOTIFY_EMAIL_ENV = 'BELGIUM420_ORDER_NOTIFY_EMAIL';
const DEFAULT_ORDER_NOTIFY_EMAILS = ['belgium@belgium420.com','support@belgium420.com'];

const DISCOUNT_CODES = [
    'BELGIUM10' => 0.10,
    'BELGIUM20' => 0.20,
    'BELGIUM25' => 0.25,
];

// Storage lives OUTSIDE the served web root so it's not web-accessible.
// This file is at <docroot>/dist/api/orders.php after the Astro build, so
// __DIR__/../../../data goes one level ABOVE the docroot (e.g.
// /home/<user>/domains/<domain>/data). On local dev (__DIR__ is
// <project>/public/api/) the same path resolves to <project>/data which is
// also non-served. If you change the file's location, update the depth here.
function orders_dir(): string {
    return __DIR__ . '/../../../data';
}
function orders_file(): string {
    return orders_dir() . '/orders.json';
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === ALLOWED_ORIGIN || $origin === 'http://localhost:4321') {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function bad_request(string $msg): void {
    respond(400, ['ok' => false, 'error' => $msg]);
}

function read_orders(): array {
    $f = orders_file();
    if (!is_file($f)) return [];
    $raw = file_get_contents($f);
    if ($raw === false || $raw === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function write_orders(array $orders): bool {
    $dir = orders_dir();
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $f = orders_file();
    $tmp = $f . '.tmp.' . bin2hex(random_bytes(4));
    $json = json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $ok = file_put_contents($tmp, $json, LOCK_EX) !== false;
    if (!$ok) {
        @unlink($tmp);
        return false;
    }
    return rename($tmp, $f);
}

function new_order_id(): string {
    return 'B420-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));
}

function check_admin_key(): bool {
    $provided = $_GET['key'] ?? ($_SERVER['HTTP_X_ADMIN_KEY'] ?? '');
    return is_string($provided) && hash_equals(ADMIN_KEY, $provided);
}

function sanitize_string(?string $v, int $max = 500): string {
    if ($v === null) return '';
    $v = trim($v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    if (mb_strlen($v) > $max) $v = mb_substr($v, 0, $max);
    return $v;
}

function validate_email(string $email): bool {
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function env_string(string $name): string {
    $value = getenv($name);
    if (!is_string($value) || $value === '') {
        if (isset($_SERVER[$name]) && is_string($_SERVER[$name]) && $_SERVER[$name] !== '') {
            $value = $_SERVER[$name];
        } elseif (isset($_ENV[$name]) && is_string($_ENV[$name]) && $_ENV[$name] !== '') {
            $value = $_ENV[$name];
        } else {
            $value = '';
        }
    }
    return trim((string)$value);
}

function mail_header_value(string $v): string {
    return trim(str_replace(["\r", "\n", "\0"], '', $v));
}

function order_notify_emails(): array {
    $raw = env_string(ORDER_NOTIFY_EMAIL_ENV);
    if ($raw === '') {
        $candidates = DEFAULT_ORDER_NOTIFY_EMAILS;
    } else {
        $split = preg_split('/[,;\s]+/', $raw, -1, PREG_SPLIT_NO_EMPTY);
        $candidates = is_array($split) ? $split : [];
    }
    $emails = [];
    $seen = [];
    foreach ($candidates as $candidate) {
        $email = strtolower(trim((string)$candidate));
        if ($email === '' || isset($seen[$email]) || !validate_email($email)) {
            continue;
        }
        $seen[$email] = true;
        $emails[] = $email;
    }
    return $emails;
}

function order_amount(array $order): float {
    if (array_key_exists('final_total', $order) && $order['final_total'] !== null && $order['final_total'] !== '') {
        return (float)$order['final_total'];
    }
    return (float)($order['total'] ?? 0) + (float)($order['shipping'] ?? 0);
}

function format_order_date(array $order): string {
    $tz = new DateTimeZone('America/New_York');
    try {
        $raw = $order['created_at'] ?? null;
        if (is_string($raw) && trim($raw) !== '') {
            $dt = new DateTimeImmutable($raw);
        } else {
            $dt = new DateTimeImmutable('now');
        }
        return $dt->setTimezone($tz)->format('D, M j, Y g:i A T');
    } catch (Throwable $e) {
        return (new DateTimeImmutable('now', $tz))->format('D, M j, Y g:i A T');
    }
}

function send_mail(string $to, string $subject, string $body, array $headers, string $context): bool {
    $to = mail_header_value($to);
    $subject = mail_header_value($subject);
    $clean = [];
    foreach ($headers as $header) {
        $line = mail_header_value((string)$header);
        if ($line !== '') {
            $clean[] = $line;
        }
    }
    if ($to === '' || !validate_email($to)) {
        error_log('Belgium420 send_mail failed (' . $context . '): invalid recipient');
        return false;
    }
    try {
        $ok = @mail($to, $subject, $body, implode("\r\n", $clean));
    } catch (Throwable $e) {
        error_log('Belgium420 send_mail failed (' . $context . '): ' . $e->getMessage());
        return false;
    }
    if (!$ok) {
        error_log('Belgium420 send_mail failed (' . $context . '): mail() returned false');
        return false;
    }
    return true;
}

function owner_notify_email(array $order): bool {
    $amount = order_amount($order);
    $subject = sprintf(
        'New order #%s - $%s',
        $order['id'],
        number_format($amount, 2, '.', '')
    );
    $items_lines = '';
    foreach ($order['items'] as $it) {
        $qty = max(1, (int)($it['qty'] ?? 1));
        $qty_label = $qty > 1 ? $qty . '× ' : '';
        $items_lines .= sprintf(
            "  - %s%s  (%s)  $%.2f  [batch %s]\n",
            $qty_label, $it['name'], $it['type'], ($qty * (float)$it['price']), $it['batch']
        );
    }
    $pays = !empty($order['payments']) ? implode(', ', $order['payments']) : '(no payment method selected)';
    $discount_line = '';
    if (!empty($order['discount_percent']) && (float)$order['discount_percent'] > 0) {
        $discount_line = sprintf(
            "Discount: %s (%.0f%% off, -$%.2f)\nFinal total: $%.2f\n",
            $order['discount_code'],
            (float)$order['discount_percent'] * 100,
            (float)$order['discount_amount'],
            (float)$order['final_total']
        );
    }
    $rewards_line = '';
    if (!empty($order['loyalty_percent']) && (float)$order['loyalty_percent'] > 0) {
        $poundsSub = (float)($order['loyalty_pounds_subtotal'] ?? 0);
        $rewards_line .= sprintf(
            "Loyalty: %.0f%% off (-$%.2f) from $%.2f lifetime merch (cap 25%%%s)\n",
            (float)$order['loyalty_percent'] * 100,
            (float)($order['loyalty_amount'] ?? 0),
            (float)($order['loyalty_lifetime_spend'] ?? 0),
            $poundsSub > 0 ? ', pounds max 10%' : ''
        );
    }
    if (!empty($order['referral_code'])) {
        $rewards_line .= sprintf(
            "Referral code: %s\nReferrer credit: $%.2f %s%s\n",
            $order['referral_code'],
            (float)($order['referrer_credit_pending'] ?? 0),
            $order['referrer_credit_status'] ?? 'pending',
            !empty($order['self_referral_blocked']) ? " (SELF-REFERRAL — reject)\n" : " (honor after payment clears)\n"
        );
    }
    if (!empty($order['referral_credit_applied']) && (float)$order['referral_credit_applied'] > 0) {
        $rewards_line .= sprintf(
            "Referral credit applied: %s −$%.2f\n",
            $order['referral_credit_code'] ?? '',
            (float)$order['referral_credit_applied']
        );
    }
    if (!empty($order['admin_note'])) {
        $rewards_line .= 'Ops note: ' . $order['admin_note'] . "\n";
    }
    $ship_amt = (float)($order['shipping'] ?? 0);
    $ship_line = $ship_amt <= 0
        ? "Shipping: FREE\n"
        : sprintf("Shipping: \$%.2f\n", $ship_amt);
    $date_line = "Date: " . format_order_date($order) . "\n";
    $ship_to = "Ship to:\n";
    $ship_to .= "  " . (string)($order['address1'] ?? '') . "\n";
    $address2 = trim((string)($order['address2'] ?? ''));
    if ($address2 !== '') {
        $ship_to .= "  " . $address2 . "\n";
    }
    $ship_to .= "  " . (string)($order['city'] ?? '') . ", " . (string)($order['state'] ?? '') . " " . (string)($order['zip'] ?? '') . "\n";
    $total_line = "Total: $" . number_format($amount, 2, '.', '') . "\n";
    $body = sprintf(
        "New order received: %s\n%s\n" .
        "Name:     %s\nEmail:    %s\nPhone:    %s\n\n" .
        "%s\n" .
        "Payment preferences: %s\n\n" .
        "Items:\n%s\n" .
        "Subtotal: $%.2f\n%s%s%s%s\n" .
        "Note: %s\n\n" .
        "Manage: https://belgium420.com/admin/\n",
        $order['id'],
        $date_line,
        $order['name'], $order['email'], $order['phone'] ?: '(none)',
        $ship_to,
        $pays,
        $items_lines,
        (float)$order['total'],
        $ship_line,
        $discount_line,
        $rewards_line,
        $total_line,
        $order['note'] ?: '(none)'
    );
    $headers = [
        'From: ' . mail_header_value(FROM_NAME) . ' <' . mail_header_value(FROM_EMAIL) . '>',
        'Reply-To: ' . mail_header_value((string)($order['email'] ?? '')),
        'X-Mailer: Belgium420-Orders/1.0',
        'Content-Type: text/plain; charset=UTF-8',
    ];
    $recipients = order_notify_emails();
    if ($recipients === []) {
        error_log('Belgium420 owner notify failed (' . ($order['id'] ?? '') . '): no notify recipients');
        return false;
    }
    $all_ok = true;
    foreach ($recipients as $to) {
        $sent = send_mail($to, $subject, $body, $headers, 'owner notify ' . ($order['id'] ?? ''));
        if (!$sent) {
            $all_ok = false;
        }
    }
    return $all_ok;
}

function customer_confirm_email(array $order): bool {
    if (empty($order['email']) || !validate_email($order['email'])) return false;
    $to = $order['email'];
    $subject = 'We got your Belgium420 order ' . $order['id'];
    $discount_line = '';
    if (!empty($order['discount_percent']) && (float)$order['discount_percent'] > 0) {
        $discount_line = sprintf(
            "  Discount: %s (%.0f%% off, -$%.2f)\n",
            $order['discount_code'],
            (float)$order['discount_percent'] * 100,
            (float)$order['discount_amount']
        );
    }
    $ship_amt = (float)($order['shipping'] ?? 0);
    $ship_line = $ship_amt <= 0
        ? "  Shipping: FREE\n"
        : sprintf("  Shipping: \$%.2f\n", $ship_amt);
    $body = sprintf(
        "Hey %s,\n\n" .
        "We received your order %s. Here's what happens next:\n\n" .
        "  1. We'll email you within 24h with payment instructions (Zelle, CashApp, or crypto).\n" .
        "  2. Once payment clears, your order ships within 1–2 business days.\n" .
        "  3. You'll get a tracking number by email the moment it's dropped off.\n\n" .
        "Order summary:\n  Subtotal: $%.2f\n%s%s  Final total: $%.2f\n  Items: %d\n\n" .
        "If anything looks wrong, just reply to this email.\n\n" .
        "— Belgium420\n",
        explode(' ', $order['name'])[0],
        $order['id'],
        (float)$order['total'],
        $discount_line,
        $ship_line,
        (float)($order['final_total'] ?? 0),
        array_sum(array_map(fn($it) => max(1, (int)($it['qty'] ?? 1)), $order['items']))
    );
    $headers = [
        'From: ' . mail_header_value(FROM_NAME) . ' <' . mail_header_value(FROM_EMAIL) . '>',
        'Reply-To: ' . mail_header_value(OWNER_EMAIL),
        'X-Mailer: Belgium420-Orders/1.0',
        'Content-Type: text/plain; charset=UTF-8',
    ];
    return send_mail($to, $subject, $body, $headers, 'customer confirm ' . ($order['id'] ?? ''));
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) bad_request('Invalid JSON body.');

    $name     = sanitize_string($data['name'] ?? '', 120);
    $email    = sanitize_string($data['email'] ?? '', 200);
    $phone    = sanitize_string($data['phone'] ?? '', 40);
    $address1 = sanitize_string($data['address1'] ?? '', 200);
    $address2 = sanitize_string($data['address2'] ?? '', 200);
    $city     = sanitize_string($data['city'] ?? '', 120);
    $state    = strtoupper(sanitize_string($data['state'] ?? '', 4));
    $zip      = sanitize_string($data['zip'] ?? '', 20);
    $note     = sanitize_string($data['note'] ?? '', 1000);
    $payments = isset($data['payments']) && is_array($data['payments'])
        ? array_values(array_filter(array_map(fn($p) => sanitize_string((string)$p, 32), $data['payments'])))
        : [];
    $items_in = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];
    $total_in = isset($data['total']) ? (float)$data['total'] : 0.0;
    $discount_code = strtoupper(sanitize_string($data['discount_code'] ?? '', 32));
    $discount_percent = isset(DISCOUNT_CODES[$discount_code]) ? DISCOUNT_CODES[$discount_code] : 0.0;

    $missing = [];
    if ($name === '')     $missing[] = 'name';
    if ($email === '')    $missing[] = 'email';
    elseif (!validate_email($email)) bad_request('Invalid email address.');
    if ($address1 === '') $missing[] = 'address1';
    if ($city === '')     $missing[] = 'city';
    if ($state === '')    $missing[] = 'state';
    if ($zip === '')      $missing[] = 'zip';
    if (empty($items_in)) bad_request('Cart is empty.');
    if (!empty($missing)) bad_request('Missing required fields: ' . implode(', ', $missing));

    $items = [];
    $recomputed_total = 0.0;
    foreach ($items_in as $it) {
        if (!is_array($it)) continue;
        $iname = sanitize_string($it['name'] ?? '', 200);
        $itype = sanitize_string($it['type'] ?? '', 200);
        $ibatch = sanitize_string($it['batch'] ?? '', 80);
        $iprice = (float)($it['price'] ?? 0);
        $itone = sanitize_string($it['tone'] ?? 'black', 16);
        $iimg = sanitize_string($it['img'] ?? '', 500);
        $iqty = isset($it['qty']) ? (int)$it['qty'] : 1;
        if ($iqty < 1) $iqty = 1;
        if ($iqty > 999) $iqty = 999;
        if ($iname === '' || $iprice <= 0) continue;
        $item = [
            'name' => $iname,
            'type' => $itype,
            'batch' => $ibatch,
            'price' => round($iprice, 2),
            'tone' => $itone,
            'img' => $iimg,
            'qty' => $iqty,
        ];
        $icats = b420_item_categories(is_array($it) ? $it : []);
        if ($icats) $item['categories'] = $icats;
        if (!empty($it['isPound']) || !empty($it['is_pound'])) $item['isPound'] = true;
        $items[] = $item;
        $recomputed_total += $iprice * $iqty;
    }
    if (empty($items)) bad_request('No valid items in cart.');

    $discount_amount = round($recomputed_total * $discount_percent, 2);
    $final_total = round($recomputed_total - $discount_amount, 2);

    $order = [
        'id' => new_order_id(),
        'created_at' => gmdate('c'),
        'status' => 'received',
        'paid_at' => null,
        'shipped_at' => null,
        'tracking' => '',
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'address1' => $address1,
        'address2' => $address2,
        'city' => $city,
        'state' => $state,
        'zip' => $zip,
        'payments' => $payments,
        'note' => $note,
        'items' => $items,
        'total' => round($recomputed_total, 2),
        'discount_code' => $discount_code,
        'discount_percent' => $discount_percent,
        'discount_amount' => $discount_amount,
        'final_total' => $final_total,
        'loyalty_id' => sanitize_string((string)($data['loyalty_id'] ?? ''), 80),
        'loyalty_lifetime_spend' => (float)($data['loyalty_lifetime_spend'] ?? 0),
        'loyalty_percent' => (float)($data['loyalty_percent'] ?? 0),
        'loyalty_amount' => (float)($data['loyalty_amount'] ?? 0),
        'referral_code' => b420_normalize_code((string)($data['referral_code'] ?? $data['referralCode'] ?? '')),
        'referralCode' => b420_normalize_code((string)($data['referral_code'] ?? $data['referralCode'] ?? '')),
        'own_referral_code' => b420_normalize_code((string)($data['own_referral_code'] ?? '')),
        'referral_credit_code' => b420_normalize_code((string)($data['referral_credit_code'] ?? '')),
        'referral_credit_applied' => (float)($data['referral_credit_applied'] ?? $data['referralCreditApplied'] ?? 0),
        'referralCreditApplied' => (float)($data['referral_credit_applied'] ?? $data['referralCreditApplied'] ?? 0),
        'referrer_credit_pending' => (float)($data['referrer_credit_pending'] ?? 0),
        'referrer_credit_status' => sanitize_string((string)($data['referrer_credit_status'] ?? ''), 32),
        'self_referral_blocked' => !empty($data['self_referral_blocked']),
        'admin_note' => sanitize_string((string)($data['admin_note'] ?? ''), 1000),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    ];

    b420_on_order_created($order);
    $order['discount_amount'] = $discount_amount;

    $orders = read_orders();
    $orders[] = $order;
    if (!write_orders($orders)) {
        respond(500, ['ok' => false, 'error' => 'Could not save order. Try again or email us directly.']);
    }

    // Best-effort emails. A mail failure must not fail the order response.
    try {
        owner_notify_email($order);
    } catch (Throwable $e) {
        error_log('Belgium420 owner notify failed for ' . $order['id'] . ': ' . $e->getMessage());
    }
    try {
        customer_confirm_email($order);
    } catch (Throwable $e) {
        error_log('Belgium420 customer confirm failed for ' . $order['id'] . ': ' . $e->getMessage());
    }

    $resp = ['ok' => true, 'order_id' => $order['id']];
    if ($order['discount_percent'] > 0) {
        $resp['discount_applied'] = $order['discount_code'];
        $resp['discount_percent'] = $order['discount_percent'];
    }
    $resp['final_total'] = $order['final_total'];
    $resp['loyalty_lifetime_spend'] = $order['loyalty_lifetime_spend'] ?? 0;
    $resp['loyalty_percent'] = $order['loyalty_percent'] ?? 0;
    $resp['referral_code'] = $order['referral_code'] ?? '';
    $resp['referral_credit_applied'] = $order['referral_credit_applied'] ?? 0;
    respond(200, $resp);
}

if ($method === 'GET') {
    if (!check_admin_key()) respond(401, ['ok' => false, 'error' => 'Bad admin key.']);

    $orders = read_orders();
    usort($orders, fn($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));

    if (!empty($_GET['id'])) {
        $id = (string)$_GET['id'];
        foreach ($orders as $o) {
            if (($o['id'] ?? '') === $id) {
                respond(200, ['ok' => true, 'order' => $o]);
            }
        }
        respond(404, ['ok' => false, 'error' => 'Order not found.']);
    }

    respond(200, ['ok' => true, 'orders' => $orders, 'count' => count($orders)]);
}

if ($method === 'PATCH') {
    if (!check_admin_key()) respond(401, ['ok' => false, 'error' => 'Bad admin key.']);
    $id = (string)($_GET['id'] ?? '');
    if ($id === '') bad_request('Missing order id.');

    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) bad_request('Invalid JSON body.');

    $orders = read_orders();
    $found = false;
    foreach ($orders as &$o) {
        if (($o['id'] ?? '') !== $id) continue;
        $found = true;
        if (isset($data['status'])) {
            $newStatus = sanitize_string((string)$data['status'], 32);
            if (!in_array($newStatus, ['received', 'paid', 'shipped'], true)) {
                bad_request('Invalid status.');
            }
            $o['status'] = $newStatus;
            if ($newStatus === 'paid' && empty($o['paid_at'])) $o['paid_at'] = gmdate('c');
            if ($newStatus === 'shipped' && empty($o['shipped_at'])) $o['shipped_at'] = gmdate('c');
            if ($newStatus === 'received') {
                $o['paid_at'] = null;
                $o['shipped_at'] = null;
            }
            if (in_array($newStatus, ['paid', 'shipped'], true) && empty($o['rewards_cleared'])) {
                b420_on_order_paid($o);
                $o['rewards_cleared'] = true;
            }
            if ($newStatus === 'received' && !empty($o['rewards_cleared'])) {
                b420_on_order_unpaid($o);
                $o['rewards_cleared'] = false;
            }
        }
        if (isset($data['tracking'])) {
            $o['tracking'] = sanitize_string((string)$data['tracking'], 200);
        }
        if (array_key_exists('note', $data)) {
            $o['note'] = sanitize_string((string)$data['note'], 1000);
        }
        $updated = $o;
        break;
    }
    unset($o);

    if (!$found) respond(404, ['ok' => false, 'error' => 'Order not found.']);
    if (!write_orders($orders)) respond(500, ['ok' => false, 'error' => 'Could not save.']);

    if (($updated['status'] ?? '') === 'shipped' && !empty($updated['tracking'])) {
        try {
            $to = (string)($updated['email'] ?? '');
            $subject = 'Your Belgium420 order ' . $updated['id'] . ' has shipped';
            $body = sprintf(
                "Hey %s,\n\nGood news — your order %s is on the way.\n\nTracking: %s\n\n" .
                "You'll get it in 1–4 business days depending on your location. Reply to this email if anything looks off.\n\n— Belgium420\n",
                explode(' ', (string)$updated['name'])[0],
                $updated['id'],
                $updated['tracking']
            );
            $headers = [
                'From: ' . mail_header_value(FROM_NAME) . ' <' . mail_header_value(FROM_EMAIL) . '>',
                'Reply-To: ' . mail_header_value(OWNER_EMAIL),
                'X-Mailer: Belgium420-Orders/1.0',
                'Content-Type: text/plain; charset=UTF-8',
            ];
            send_mail($to, $subject, $body, $headers, 'shipping notify ' . ($updated['id'] ?? ''));
        } catch (Throwable $e) {
            error_log('Belgium420 shipping notify failed for ' . ($updated['id'] ?? '') . ': ' . $e->getMessage());
        }
    }

    respond(200, ['ok' => true, 'order' => $updated]);
}

if ($method === 'DELETE') {
    if (!check_admin_key()) respond(401, ['ok' => false, 'error' => 'Bad admin key.']);
    $id = (string)($_GET['id'] ?? '');
    if ($id === '') bad_request('Missing order id.');

    $orders = read_orders();
    $before = count($orders);
    $orders = array_values(array_filter($orders, fn($o) => ($o['id'] ?? '') !== $id));
    if (count($orders) === $before) respond(404, ['ok' => false, 'error' => 'Order not found.']);
    if (!write_orders($orders)) respond(500, ['ok' => false, 'error' => 'Could not save.']);
    respond(200, ['ok' => true, 'deleted' => $id]);
}

respond(405, ['ok' => false, 'error' => 'Method not allowed.']);
