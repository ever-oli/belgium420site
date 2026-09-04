<?php
/**
 * Belgium420 — Orders API
 *
 * Routes:
 *   POST   /api/orders.php                      — create new order (public)
 *   GET    /api/orders.php?key=ADMIN_KEY        — list all orders (admin)
 *   GET    /api/orders.php?key=ADMIN_KEY&id=X   — fetch one order (admin)
 *   PATCH  /api/orders.php?key=ADMIN_KEY&id=X   — update status / tracking (admin)
 *
 * Storage: data/orders.json (flat file). Atomic writes via tmp+rename.
 * Email:   PHP mail() to OWNER_EMAIL on new orders.
 *
 * Auth: the admin key is checked against ADMIN_KEY. The site is shared hosting;
 * the API file itself is the only auth surface, so we keep things minimal.
 */

declare(strict_types=1);

// ---------- config ----------

const OWNER_EMAIL  = 'mstwntdpacks@gmail.com';
const FROM_EMAIL    = 'orders@belgium420.com';
const FROM_NAME     = 'Belgium420 Orders';
const ADMIN_KEY     = '420Belgium';
const ALLOWED_ORIGIN = 'https://belgium420.com';

// Valid discount codes (case-insensitive) → fraction off subtotal.
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

// ---------- CORS / headers ----------

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

// ---------- helpers ----------

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
    // atomic rename
    return rename($tmp, $f);
}

function new_order_id(): string {
    // B420-YYYYMMDD-XXXX
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

function owner_notify_email(array $order): bool {
    $to = OWNER_EMAIL;
    $subject = 'New Belgium420 order ' . $order['id'];
    $items_lines = '';
    foreach ($order['items'] as $it) {
        $items_lines .= sprintf(
            "  - %s  (%s)  $%.2f  [batch %s]\n",
            $it['name'], $it['type'], (float)$it['price'], $it['batch']
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
    $body = sprintf(
        "New order received: %s\n\n" .
        "Name:     %s\nEmail:    %s\nPhone:    %s\n\n" .
        "Ship to:\n  %s\n  %s\n  %s, %s %s\n\n" .
        "Payment preferences: %s\n\n" .
        "Items:\n%s\n" .
        "Subtotal: $%.2f\n%s\n" .
        "Note: %s\n\n" .
        "Manage: https://belgium420.com/admin/?key=%s\n",
        $order['id'],
        $order['name'], $order['email'], $order['phone'] ?: '(none)',
        $order['address1'], $order['address2'] ?: '',
        $order['city'], $order['state'], $order['zip'],
        $pays,
        $items_lines,
        (float)$order['total'],
        $discount_line,
        $order['note'] ?: '(none)',
        ADMIN_KEY
    );
    $headers = [];
    $headers[] = 'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>';
    $headers[] = 'Reply-To: ' . $order['email'];
    $headers[] = 'X-Mailer: Belgium420-Orders/1.0';
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    return @mail($to, $subject, $body, implode("\r\n", $headers));
}

function customer_confirm_email(array $order): bool {
    if (empty($order['email']) || !validate_email($order['email'])) return false;
    $to = $order['email'];
    $subject = 'We got your Belgium420 order ' . $order['id'];
    $discount_line = '';
    if (!empty($order['discount_percent']) && (float)$order['discount_percent'] > 0) {
        $discount_line = sprintf(
            "  Discount: %s (%.0f%% off, -$%.2f)\n  Final total: $%.2f\n",
            $order['discount_code'],
            (float)$order['discount_percent'] * 100,
            (float)$order['discount_amount'],
            (float)$order['final_total']
        );
    }
    $body = sprintf(
        "Hey %s,\n\n" .
        "We received your order %s. Here's what happens next:\n\n" .
        "  1. We'll email you within 24h with payment instructions (Zelle, CashApp, or crypto).\n" .
        "  2. Once payment clears, your order ships within 1–2 business days.\n" .
        "  3. You'll get a tracking number by email the moment it's dropped off.\n\n" .
        "Order summary:\n  Subtotal: $%.2f\n%s  Items: %d\n\n" .
        "If anything looks wrong, just reply to this email.\n\n" .
        "— Belgium420\n",
        explode(' ', $order['name'])[0],
        $order['id'],
        (float)$order['total'],
        $discount_line,
        count($order['items'])
    );
    $headers = [];
    $headers[] = 'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>';
    $headers[] = 'Reply-To: ' . OWNER_EMAIL;
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    return @mail($to, $subject, $body, implode("\r\n", $headers));
}

// ---------- routing ----------

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    // ---- create new order ----
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

    // ---- validate ----
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

    // ---- normalize items ----
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
        if ($iname === '' || $iprice <= 0) continue;
        $items[] = [
            'name' => $iname,
            'type' => $itype,
            'batch' => $ibatch,
            'price' => round($iprice, 2),
            'tone' => $itone,
            'img' => $iimg,
        ];
        $recomputed_total += $iprice;
    }
    if (empty($items)) bad_request('No valid items in cart.');

    $discount_amount = round($recomputed_total * $discount_percent, 2);
    $final_total = round($recomputed_total - $discount_amount, 2);

    $order = [
        'id' => new_order_id(),
        'created_at' => gmdate('c'),
        'status' => 'received',     // received | paid | shipped
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
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    ];

    $orders = read_orders();
    $orders[] = $order;
    if (!write_orders($orders)) {
        respond(500, ['ok' => false, 'error' => 'Could not save order. Try again or email us directly.']);
    }

    // Best-effort emails. Don't fail the order if mail() hiccups.
    @owner_notify_email($order);
    @customer_confirm_email($order);

    $resp = ['ok' => true, 'order_id' => $order['id']];
    if ($order['discount_percent'] > 0) {
        $resp['discount_applied'] = $order['discount_code'];
        $resp['discount_percent'] = $order['discount_percent'];
        $resp['final_total'] = $order['final_total'];
    }
    respond(200, $resp);
}

if ($method === 'GET') {
    if (!check_admin_key()) respond(401, ['ok' => false, 'error' => 'Bad admin key.']);

    $orders = read_orders();
    // newest first
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

    // If we just marked as shipped, email the customer with tracking.
    if (($updated['status'] ?? '') === 'shipped' && !empty($updated['tracking'])) {
        $to = $updated['email'];
        $subject = 'Your Belgium420 order ' . $updated['id'] . ' has shipped';
        $body = sprintf(
            "Hey %s,\n\nGood news — your order %s is on the way.\n\nTracking: %s\n\n" .
            "You'll get it in 1–4 business days depending on your location. Reply to this email if anything looks off.\n\n— Belgium420\n",
            explode(' ', (string)$updated['name'])[0],
            $updated['id'],
            $updated['tracking']
        );
        $headers = [
            'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>',
            'Reply-To: ' . OWNER_EMAIL,
            'Content-Type: text/plain; charset=UTF-8',
        ];
        @mail($to, $subject, $body, implode("\r\n", $headers));
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
