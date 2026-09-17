<?php
/**
 * Shared storage + rewards ledger for Belgium420.
 * Included by orders.php and referrals.php. Direct HTTP access is refused.
 */

declare(strict_types=1);

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Forbidden';
    exit;
}

const B420_ADMIN_KEY = '420Belgium';
const B420_REFERRAL_GRANT = 25.0;
const B420_SHIP_THRESHOLD = 50.0;
const B420_SHIP_FEE = 25.0;

function b420_data_dir(): string {
    return __DIR__ . '/../../../data';
}

function b420_referrals_file(): string {
    return b420_data_dir() . '/referrals.json';
}

function b420_round_money(float $n): float {
    return round($n, 2);
}

function b420_normalize_code(string $raw): string {
    $code = strtoupper(trim($raw));
    $code = preg_replace('/[^A-Z0-9_-]/', '', $code) ?? '';
    if (strlen($code) > 24) $code = substr($code, 0, 24);
    return strlen($code) >= 2 ? $code : '';
}

function b420_normalize_email(string $email): string {
    return strtolower(trim($email));
}

function b420_loyalty_percent(int $orderNumber): float {
    if ($orderNumber <= 0) return 0.0;
    if ($orderNumber % 10 === 0) return 0.10;
    if ($orderNumber % 5 === 0) return 0.05;
    return 0.0;
}

function b420_next_milestone(int $completed): array {
    $n = max(0, $completed) + 1;
    while ($n % 5 !== 0) $n++;
    $percent = ($n % 10 === 0) ? 10 : 5;
    return [
        'orderNumber' => $n,
        'percent' => $percent,
        'ordersAway' => $n - $completed,
        'label' => $percent . '% off on order ' . $n,
    ];
}

function b420_empty_ledger(): array {
    return [
        'version' => 1,
        'codes' => new stdClass(), // replaced with [] below — JSON object
        'events' => [],
        'loyalty' => [],
        'updated_at' => gmdate('c'),
    ];
}

function b420_read_ledger(): array {
    $f = b420_referrals_file();
    if (!is_file($f)) {
        $empty = ['version' => 1, 'codes' => [], 'events' => [], 'loyalty' => [], 'updated_at' => gmdate('c')];
        return $empty;
    }
    $raw = file_get_contents($f);
    if ($raw === false || $raw === '') {
        return ['version' => 1, 'codes' => [], 'events' => [], 'loyalty' => [], 'updated_at' => gmdate('c')];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return ['version' => 1, 'codes' => [], 'events' => [], 'loyalty' => [], 'updated_at' => gmdate('c')];
    }
    if (!isset($data['codes']) || !is_array($data['codes'])) $data['codes'] = [];
    if (!isset($data['events']) || !is_array($data['events'])) $data['events'] = [];
    if (!isset($data['loyalty']) || !is_array($data['loyalty'])) $data['loyalty'] = [];
    return $data;
}

function b420_write_ledger(array $ledger): bool {
    $dir = b420_data_dir();
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $ledger['updated_at'] = gmdate('c');
    $f = b420_referrals_file();
    $tmp = $f . '.tmp.' . bin2hex(random_bytes(4));
    $json = json_encode($ledger, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $ok = file_put_contents($tmp, $json, LOCK_EX) !== false;
    if (!$ok) {
        @unlink($tmp);
        return false;
    }
    return rename($tmp, $f);
}

function b420_event_id(): string {
    return 'EVT-' . strtoupper(bin2hex(random_bytes(4)));
}

function b420_ensure_code(array &$ledger, string $code, array $extra = []): ?array {
    $c = b420_normalize_code($code);
    if ($c === '') return null;
    if (!isset($ledger['codes'][$c]) || !is_array($ledger['codes'][$c])) {
        $ledger['codes'][$c] = [
            'code' => $c,
            'owner_email' => b420_normalize_email((string)($extra['owner_email'] ?? '')),
            'note' => substr((string)($extra['note'] ?? ''), 0, 500),
            'pending' => 0.0,
            'available' => 0.0,
            'redeemed' => 0.0,
            'referred_orders' => 0,
            'created_at' => gmdate('c'),
            'updated_at' => gmdate('c'),
        ];
    } else {
        if (!empty($extra['owner_email']) && empty($ledger['codes'][$c]['owner_email'])) {
            $ledger['codes'][$c]['owner_email'] = b420_normalize_email((string)$extra['owner_email']);
        }
        if (!empty($extra['note'])) {
            $ledger['codes'][$c]['note'] = substr((string)$extra['note'], 0, 500);
        }
    }
    $ledger['codes'][$c]['updated_at'] = gmdate('c');
    return $ledger['codes'][$c];
}

function b420_find_loyalty(array &$ledger, string $loyaltyId, string $email): ?int {
    $loyaltyId = trim($loyaltyId);
    $email = b420_normalize_email($email);
    foreach ($ledger['loyalty'] as $i => $row) {
        if (!is_array($row)) continue;
        $rid = (string)($row['loyalty_id'] ?? '');
        $re = b420_normalize_email((string)($row['email'] ?? ''));
        if ($loyaltyId !== '' && $rid === $loyaltyId) return $i;
        if ($email !== '' && $re !== '' && $re === $email) return $i;
    }
    return null;
}

function b420_loyalty_enrich(array $row): array {
    $placed = (int)($row['placed_count'] ?? 0);
    $paid = (int)($row['paid_count'] ?? 0);
    $next = b420_next_milestone($paid > 0 ? $paid : $placed);
    $row['next_reward'] = $next['label'];
    $row['next_order_number'] = $next['orderNumber'];
    $row['next_percent'] = $next['percent'];
    return $row;
}

function b420_upsert_loyalty(array &$ledger, array $patch): array {
    $loyaltyId = trim((string)($patch['loyalty_id'] ?? ''));
    $email = b420_normalize_email((string)($patch['email'] ?? ''));
    $idx = b420_find_loyalty($ledger, $loyaltyId, $email);
    if ($idx === null) {
        $row = [
            'loyalty_id' => $loyaltyId,
            'email' => $email,
            'own_code' => b420_normalize_code((string)($patch['own_code'] ?? '')),
            'placed_count' => 0,
            'paid_count' => 0,
            'last_order_id' => '',
            'last_order_at' => '',
            'note' => '',
        ];
        $ledger['loyalty'][] = $row;
        $idx = count($ledger['loyalty']) - 1;
    }
    $row = $ledger['loyalty'][$idx];
    if ($loyaltyId !== '') $row['loyalty_id'] = $loyaltyId;
    if ($email !== '') $row['email'] = $email;
    if (!empty($patch['own_code'])) $row['own_code'] = b420_normalize_code((string)$patch['own_code']);
    if (array_key_exists('note', $patch)) $row['note'] = substr((string)$patch['note'], 0, 500);
    if (!empty($patch['last_order_id'])) $row['last_order_id'] = (string)$patch['last_order_id'];
    if (!empty($patch['last_order_at'])) $row['last_order_at'] = (string)$patch['last_order_at'];
    if (!empty($patch['bump_placed'])) $row['placed_count'] = (int)$row['placed_count'] + 1;
    if (!empty($patch['bump_paid'])) $row['paid_count'] = (int)$row['paid_count'] + 1;
    if (isset($patch['unbump_paid']) && $patch['unbump_paid'] && (int)$row['paid_count'] > 0) {
        $row['paid_count'] = (int)$row['paid_count'] - 1;
    }
    $ledger['loyalty'][$idx] = b420_loyalty_enrich($row);
    return $ledger['loyalty'][$idx];
}

function b420_is_self_referral(string $code, string $ownCode, string $buyerEmail, string $ownerEmail): bool {
    $c = b420_normalize_code($code);
    $own = b420_normalize_code($ownCode);
    if ($c !== '' && $own !== '' && $c === $own) return true;
    $buyer = b420_normalize_email($buyerEmail);
    $owner = b420_normalize_email($ownerEmail);
    if ($c !== '' && $buyer !== '' && $owner !== '' && $buyer === $owner) return true;
    return false;
}

/**
 * Apply loyalty + referral fields onto a new order and update the ledger.
 * Mutates $order in place.
 */
function b420_on_order_created(array &$order): void {
    $ledger = b420_read_ledger();

    $loyaltyId = trim((string)($order['loyalty_id'] ?? ''));
    $email = b420_normalize_email((string)($order['email'] ?? ''));
    $ownCode = b420_normalize_code((string)($order['own_referral_code'] ?? ''));
    $refCode = b420_normalize_code((string)($order['referral_code'] ?? $order['referralCode'] ?? ''));
    $creditCode = b420_normalize_code((string)($order['referral_credit_code'] ?? ''));

    $idx = b420_find_loyalty($ledger, $loyaltyId, $email);
    $priorPlaced = 0;
    $priorPaid = 0;
    if ($idx !== null) {
        $priorPlaced = (int)($ledger['loyalty'][$idx]['placed_count'] ?? 0);
        $priorPaid = (int)($ledger['loyalty'][$idx]['paid_count'] ?? 0);
        if ($ownCode === '') $ownCode = b420_normalize_code((string)($ledger['loyalty'][$idx]['own_code'] ?? ''));
    }
    $thisOrderNumber = $priorPlaced + 1;
    $loyaltyPercent = b420_loyalty_percent($thisOrderNumber);

    $subtotal = b420_round_money((float)($order['total'] ?? 0));
    $promoPercent = (float)($order['discount_percent'] ?? 0);
    $promoAmount = b420_round_money($subtotal * $promoPercent);
    $loyaltyAmount = b420_round_money($subtotal * $loyaltyPercent);

    $ownerEmail = '';
    if ($refCode !== '' && isset($ledger['codes'][$refCode]['owner_email'])) {
        $ownerEmail = (string)$ledger['codes'][$refCode]['owner_email'];
    }
    $self = $refCode !== '' && b420_is_self_referral($refCode, $ownCode, $email, $ownerEmail);

    $referralPending = 0.0;
    if ($refCode !== '') {
        b420_ensure_code($ledger, $refCode, [
            'owner_email' => $self ? $email : '',
        ]);
        $ledger['codes'][$refCode]['referred_orders'] = (int)$ledger['codes'][$refCode]['referred_orders'] + 1;
        if (!$self) {
            $ledger['codes'][$refCode]['pending'] = b420_round_money((float)$ledger['codes'][$refCode]['pending'] + B420_REFERRAL_GRANT);
            $referralPending = B420_REFERRAL_GRANT;
            $ledger['events'][] = [
                'id' => b420_event_id(),
                'at' => gmdate('c'),
                'type' => 'referred_order',
                'code' => $refCode,
                'order_id' => (string)($order['id'] ?? ''),
                'amount' => B420_REFERRAL_GRANT,
                'note' => 'pending $25 until order is marked paid/cleared. Honor after payment clears.',
            ];
        } else {
            $ledger['events'][] = [
                'id' => b420_event_id(),
                'at' => gmdate('c'),
                'type' => 'self_referral_blocked',
                'code' => $refCode,
                'order_id' => (string)($order['id'] ?? ''),
                'amount' => 0,
                'note' => 'ops: reject self-referrals (same code or buyer email = code owner).',
            ];
        }
        // If the buyer claimed this code, remember owner email for later self-ref checks.
        if ($ownCode !== '' && $ownCode === $refCode) {
            $ledger['codes'][$refCode]['owner_email'] = $ledger['codes'][$refCode]['owner_email'] ?: $email;
        }
    }

    if ($ownCode !== '') {
        b420_ensure_code($ledger, $ownCode, ['owner_email' => $email]);
        $ledger['codes'][$ownCode]['owner_email'] = $ledger['codes'][$ownCode]['owner_email'] ?: $email;
    }

    $creditApplied = 0.0;
    if ($creditCode !== '') {
        b420_ensure_code($ledger, $creditCode, ['owner_email' => $email]);
        $available = (float)($ledger['codes'][$creditCode]['available'] ?? 0);
        $afterPercents = max(0.0, b420_round_money($subtotal - $promoAmount - $loyaltyAmount));
        $creditApplied = b420_round_money(min($available, $afterPercents));
        if ($creditApplied > 0) {
            $ledger['codes'][$creditCode]['available'] = b420_round_money($available - $creditApplied);
            $ledger['codes'][$creditCode]['redeemed'] = b420_round_money((float)$ledger['codes'][$creditCode]['redeemed'] + $creditApplied);
            $ledger['events'][] = [
                'id' => b420_event_id(),
                'at' => gmdate('c'),
                'type' => 'redeemed',
                'code' => $creditCode,
                'order_id' => (string)($order['id'] ?? ''),
                'amount' => $creditApplied,
                'note' => 'checkout referral credit',
            ];
        }
    }

    $merch = max(0.0, b420_round_money($subtotal - $promoAmount - $loyaltyAmount - $creditApplied));
    $shipping = ($merch > 0 && $merch < B420_SHIP_THRESHOLD) ? B420_SHIP_FEE : 0.0;
    $final = b420_round_money($merch + $shipping);

    $opsNote = '';
    if ($refCode !== '') {
        $opsNote .= $self
            ? "SELF-REFERRAL blocked for code {$refCode}. Ops should reject self-referrals. "
            : "Referral {$refCode}: referrer earns \$25 store credit PENDING until this order is marked paid. Credit is honored after payment clears. ";
    }
    if ($loyaltyPercent > 0) {
        $opsNote .= sprintf('Loyalty order #%d: %.0f%% off ($%.2f). ', $thisOrderNumber, $loyaltyPercent * 100, $loyaltyAmount);
    }
    if ($creditApplied > 0) {
        $opsNote .= sprintf('Referral credit %s applied: −$%.2f. ', $creditCode, $creditApplied);
    }

    $order['loyalty_id'] = $loyaltyId;
    $order['loyalty_order_number'] = $thisOrderNumber;
    $order['loyalty_percent'] = $loyaltyPercent;
    $order['loyalty_amount'] = $loyaltyAmount;
    $order['referral_code'] = $refCode;
    $order['referralCode'] = $refCode;
    $order['own_referral_code'] = $ownCode;
    $order['self_referral_blocked'] = $self;
    $order['referrer_credit_pending'] = $self ? 0.0 : $referralPending;
    $order['referrer_credit_status'] = ($refCode !== '' && !$self) ? 'pending' : '';
    $order['referral_credit_code'] = $creditCode;
    $order['referral_credit_applied'] = $creditApplied;
    $order['referralCreditApplied'] = $creditApplied;
    $order['shipping'] = $shipping;
    $order['final_total'] = $final;
    $order['admin_note'] = trim($opsNote);

    b420_upsert_loyalty($ledger, [
        'loyalty_id' => $loyaltyId,
        'email' => $email,
        'own_code' => $ownCode,
        'last_order_id' => (string)($order['id'] ?? ''),
        'last_order_at' => (string)($order['created_at'] ?? gmdate('c')),
        'bump_placed' => true,
    ]);

    b420_write_ledger($ledger);
}

function b420_clear_pending_for_order(array &$ledger, string $code, string $orderId): float {
    $c = b420_normalize_code($code);
    if ($c === '' || !isset($ledger['codes'][$c])) return 0.0;
    foreach ($ledger['events'] as $e) {
        if (($e['type'] ?? '') === 'cleared' && ($e['code'] ?? '') === $c && ($e['order_id'] ?? '') === $orderId) {
            return 0.0; // already cleared
        }
    }
    $moved = 0.0;
    foreach ($ledger['events'] as $e) {
        if (($e['type'] ?? '') === 'referred_order' && ($e['code'] ?? '') === $c && ($e['order_id'] ?? '') === $orderId) {
            $moved += (float)($e['amount'] ?? 0);
        }
    }
    if ($moved <= 0 && (float)$ledger['codes'][$c]['pending'] > 0) {
        $moved = min((float)$ledger['codes'][$c]['pending'], B420_REFERRAL_GRANT);
    }
    $moved = min($moved, (float)$ledger['codes'][$c]['pending']);
    $moved = b420_round_money($moved);
    if ($moved <= 0) return 0.0;
    $ledger['codes'][$c]['pending'] = b420_round_money((float)$ledger['codes'][$c]['pending'] - $moved);
    $ledger['codes'][$c]['available'] = b420_round_money((float)$ledger['codes'][$c]['available'] + $moved);
    $ledger['codes'][$c]['updated_at'] = gmdate('c');
    $ledger['events'][] = [
        'id' => b420_event_id(),
        'at' => gmdate('c'),
        'type' => 'cleared',
        'code' => $c,
        'order_id' => $orderId,
        'amount' => $moved,
        'note' => 'pending → available (order marked paid/cleared)',
    ];
    return $moved;
}

function b420_on_order_paid(array &$order): void {
    $ledger = b420_read_ledger();
    $code = b420_normalize_code((string)($order['referral_code'] ?? ''));
    $id = (string)($order['id'] ?? '');
    if ($code !== '' && empty($order['self_referral_blocked'])) {
        $moved = b420_clear_pending_for_order($ledger, $code, $id);
        if ($moved > 0) {
            $order['referrer_credit_status'] = 'available';
            $order['referrer_credit_cleared'] = $moved;
        }
    }
    b420_upsert_loyalty($ledger, [
        'loyalty_id' => (string)($order['loyalty_id'] ?? ''),
        'email' => (string)($order['email'] ?? ''),
        'own_code' => (string)($order['own_referral_code'] ?? ''),
        'last_order_id' => $id,
        'last_order_at' => gmdate('c'),
        'bump_paid' => true,
    ]);
    b420_write_ledger($ledger);
}

function b420_on_order_unpaid(array &$order): void {
    // Revert paid loyalty bump. Do not automatically pull available credit back
    // (ops can Adjust). Prevents double-bump if toggled.
    $ledger = b420_read_ledger();
    b420_upsert_loyalty($ledger, [
        'loyalty_id' => (string)($order['loyalty_id'] ?? ''),
        'email' => (string)($order['email'] ?? ''),
        'unbump_paid' => true,
    ]);
    if (!empty($order['referrer_credit_status']) && $order['referrer_credit_status'] === 'available') {
        $order['referrer_credit_status'] = 'pending';
    }
    b420_write_ledger($ledger);
}

function b420_public_loyalty(string $loyaltyId): array {
    $ledger = b420_read_ledger();
    $idx = b420_find_loyalty($ledger, $loyaltyId, '');
    $paid = 0;
    $placed = 0;
    if ($idx !== null) {
        $row = b420_loyalty_enrich($ledger['loyalty'][$idx]);
        $paid = (int)$row['paid_count'];
        $placed = (int)$row['placed_count'];
    }
    $thisN = $placed + 1;
    $next = b420_next_milestone($paid > 0 ? $paid : $placed);
    return [
        'ok' => true,
        'paid_count' => $paid,
        'placed_count' => $placed,
        'this_order_number' => $thisN,
        'loyalty_percent' => b420_loyalty_percent($thisN),
        'next_milestone' => $next,
    ];
}

function b420_public_credit(string $code): array {
    $c = b420_normalize_code($code);
    if ($c === '') return ['ok' => false, 'error' => 'Invalid code.'];
    $ledger = b420_read_ledger();
    $available = 0.0;
    if (isset($ledger['codes'][$c])) {
        $available = b420_round_money((float)$ledger['codes'][$c]['available']);
    }
    return ['ok' => true, 'code' => $c, 'available' => $available];
}

function b420_admin_snapshot(): array {
    $ledger = b420_read_ledger();
    $codes = [];
    foreach ($ledger['codes'] as $c => $row) {
        if (!is_array($row)) continue;
        $row['share_url'] = 'https://belgium420.com/?ref=' . rawurlencode((string)$row['code']);
        $codes[] = $row;
    }
    usort($codes, fn($a, $b) => strcmp((string)($b['updated_at'] ?? ''), (string)($a['updated_at'] ?? '')));
    $loyalty = [];
    foreach ($ledger['loyalty'] as $row) {
        if (!is_array($row)) continue;
        $loyalty[] = b420_loyalty_enrich($row);
    }
    usort($loyalty, fn($a, $b) => strcmp((string)($b['last_order_at'] ?? ''), (string)($a['last_order_at'] ?? '')));
    $events = $ledger['events'];
    usort($events, fn($a, $b) => strcmp((string)($b['at'] ?? ''), (string)($a['at'] ?? '')));
    return [
        'ok' => true,
        'codes' => $codes,
        'loyalty' => $loyalty,
        'events' => array_slice($events, 0, 200),
        'updated_at' => $ledger['updated_at'] ?? '',
        'grant' => B420_REFERRAL_GRANT,
    ];
}
