<?php
/**
 * Belgium420 — Rewards / referral ledger API
 *
 * Public:
 *   GET  /api/referrals.php?code=TEST          — available credit for a code
 *   GET  /api/referrals.php?loyalty_id=ID      — paid/placed counts for loyalty pricing
 *
 * Admin (key = same as orders.php):
 *   GET    /api/referrals.php?key=ADMIN_KEY    — full ledger
 *   POST   /api/referrals.php?key=ADMIN_KEY    — upsert / clear / redeem / import
 *   PATCH  /api/referrals.php?key=ADMIN_KEY    — same actions as POST
 */

declare(strict_types=1);

require_once __DIR__ . '/b420-store.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

const B420_ALLOWED_ORIGIN = 'https://belgium420.com';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === B420_ALLOWED_ORIGIN || $origin === 'http://localhost:4321') {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Key');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function b420_respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function b420_admin_ok(): bool {
    $provided = $_GET['key'] ?? ($_SERVER['HTTP_X_ADMIN_KEY'] ?? '');
    return is_string($provided) && hash_equals(B420_ADMIN_KEY, $provided);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (!empty($_GET['code']) && empty($_GET['key'])) {
        b420_respond(200, b420_public_credit((string)$_GET['code']));
    }
    if (!empty($_GET['loyalty_id']) && empty($_GET['key'])) {
        b420_respond(200, b420_public_loyalty((string)$_GET['loyalty_id']));
    }
    if (!b420_admin_ok()) {
        b420_respond(401, ['ok' => false, 'error' => 'Bad admin key.']);
    }
    b420_respond(200, b420_admin_snapshot());
}

if ($method === 'POST' || $method === 'PATCH') {
    if (!b420_admin_ok()) {
        b420_respond(401, ['ok' => false, 'error' => 'Bad admin key.']);
    }
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) {
        b420_respond(400, ['ok' => false, 'error' => 'Invalid JSON body.']);
    }
    $action = strtolower(trim((string)($data['action'] ?? '')));
    $ledger = b420_read_ledger();

    if ($action === 'upsert_code') {
        $code = b420_normalize_code((string)($data['code'] ?? ''));
        if ($code === '') b420_respond(400, ['ok' => false, 'error' => 'Invalid code.']);
        b420_ensure_code($ledger, $code, [
            'owner_email' => (string)($data['owner_email'] ?? ''),
            'note' => (string)($data['note'] ?? ''),
        ]);
        if (isset($data['owner_email'])) {
            $ledger['codes'][$code]['owner_email'] = b420_normalize_email((string)$data['owner_email']);
        }
        if (isset($data['note'])) {
            $ledger['codes'][$code]['note'] = substr((string)$data['note'], 0, 500);
        }
        if (!b420_write_ledger($ledger)) b420_respond(500, ['ok' => false, 'error' => 'Could not save.']);
        b420_respond(200, b420_admin_snapshot());
    }

    if ($action === 'clear_pending' || $action === 'mark_cleared') {
        $code = b420_normalize_code((string)($data['code'] ?? ''));
        if ($code === '') b420_respond(400, ['ok' => false, 'error' => 'Invalid code.']);
        b420_ensure_code($ledger, $code);
        $orderId = trim((string)($data['order_id'] ?? ''));
        if ($orderId !== '') {
            b420_clear_pending_for_order($ledger, $code, $orderId);
        } else {
            $moved = b420_round_money((float)$ledger['codes'][$code]['pending']);
            if ($moved > 0) {
                $ledger['codes'][$code]['pending'] = 0.0;
                $ledger['codes'][$code]['available'] = b420_round_money((float)$ledger['codes'][$code]['available'] + $moved);
                $ledger['codes'][$code]['updated_at'] = gmdate('c');
                $ledger['events'][] = [
                    'id' => b420_event_id(),
                    'at' => gmdate('c'),
                    'type' => 'cleared',
                    'code' => $code,
                    'order_id' => '',
                    'amount' => $moved,
                    'note' => 'admin: clear all pending → available',
                ];
            }
        }
        if (!b420_write_ledger($ledger)) b420_respond(500, ['ok' => false, 'error' => 'Could not save.']);
        b420_respond(200, b420_admin_snapshot());
    }

    if ($action === 'mark_redeemed' || $action === 'redeem') {
        $code = b420_normalize_code((string)($data['code'] ?? ''));
        if ($code === '') b420_respond(400, ['ok' => false, 'error' => 'Invalid code.']);
        b420_ensure_code($ledger, $code);
        $amount = isset($data['amount']) ? (float)$data['amount'] : (float)$ledger['codes'][$code]['available'];
        $applied = b420_round_money(min(max(0.0, $amount), (float)$ledger['codes'][$code]['available']));
        if ($applied > 0) {
            $ledger['codes'][$code]['available'] = b420_round_money((float)$ledger['codes'][$code]['available'] - $applied);
            $ledger['codes'][$code]['redeemed'] = b420_round_money((float)$ledger['codes'][$code]['redeemed'] + $applied);
            $ledger['codes'][$code]['updated_at'] = gmdate('c');
            $ledger['events'][] = [
                'id' => b420_event_id(),
                'at' => gmdate('c'),
                'type' => 'redeemed',
                'code' => $code,
                'order_id' => (string)($data['order_id'] ?? ''),
                'amount' => $applied,
                'note' => (string)($data['note'] ?? 'admin: mark redeemed'),
            ];
        }
        if (!b420_write_ledger($ledger)) b420_respond(500, ['ok' => false, 'error' => 'Could not save.']);
        b420_respond(200, array_merge(b420_admin_snapshot(), ['applied' => $applied]));
    }

    if ($action === 'adjust') {
        $code = b420_normalize_code((string)($data['code'] ?? ''));
        if ($code === '') b420_respond(400, ['ok' => false, 'error' => 'Invalid code.']);
        b420_ensure_code($ledger, $code);
        $delta = (float)($data['delta'] ?? $data['available_delta'] ?? 0);
        $ledger['codes'][$code]['available'] = b420_round_money(max(0.0, (float)$ledger['codes'][$code]['available'] + $delta));
        $ledger['codes'][$code]['updated_at'] = gmdate('c');
        $ledger['events'][] = [
            'id' => b420_event_id(),
            'at' => gmdate('c'),
            'type' => 'adjust',
            'code' => $code,
            'order_id' => '',
            'amount' => b420_round_money($delta),
            'note' => (string)($data['note'] ?? 'manual adjust'),
        ];
        if (!b420_write_ledger($ledger)) b420_respond(500, ['ok' => false, 'error' => 'Could not save.']);
        b420_respond(200, b420_admin_snapshot());
    }

    if ($action === 'upsert_loyalty') {
        if (empty($data['loyalty_id']) && empty($data['email'])) {
            b420_respond(400, ['ok' => false, 'error' => 'Need loyalty_id or email.']);
        }
        b420_upsert_loyalty($ledger, $data);
        if (!b420_write_ledger($ledger)) b420_respond(500, ['ok' => false, 'error' => 'Could not save.']);
        b420_respond(200, b420_admin_snapshot());
    }

    if ($action === 'import' || $action === 'merge') {
        $incoming = $data['ledger'] ?? $data['data'] ?? null;
        if (!is_array($incoming)) b420_respond(400, ['ok' => false, 'error' => 'Missing ledger.']);
        if (!empty($data['replace'])) {
            $ledger = [
                'version' => 1,
                'codes' => is_array($incoming['codes'] ?? null) ? $incoming['codes'] : [],
                'events' => is_array($incoming['events'] ?? null) ? $incoming['events'] : [],
                'loyalty' => is_array($incoming['loyalty'] ?? null) ? $incoming['loyalty'] : [],
                'updated_at' => gmdate('c'),
            ];
        } else {
            foreach (($incoming['codes'] ?? []) as $c => $row) {
                if (!is_array($row)) continue;
                $code = b420_normalize_code((string)($row['code'] ?? $c));
                if ($code === '') continue;
                b420_ensure_code($ledger, $code, $row);
                foreach (['pending', 'available', 'redeemed', 'referred_orders', 'owner_email', 'note'] as $k) {
                    if (isset($row[$k])) $ledger['codes'][$code][$k] = $row[$k];
                }
            }
            $seen = [];
            foreach ($ledger['events'] as $e) {
                if (!empty($e['id'])) $seen[$e['id']] = true;
            }
            foreach (($incoming['events'] ?? []) as $e) {
                if (!is_array($e) || empty($e['id']) || isset($seen[$e['id']])) continue;
                $ledger['events'][] = $e;
            }
            foreach (($incoming['loyalty'] ?? []) as $row) {
                if (is_array($row)) b420_upsert_loyalty($ledger, $row);
            }
        }
        if (!b420_write_ledger($ledger)) b420_respond(500, ['ok' => false, 'error' => 'Could not save.']);
        b420_respond(200, b420_admin_snapshot());
    }

    b420_respond(400, ['ok' => false, 'error' => 'Unknown action.']);
}

b420_respond(405, ['ok' => false, 'error' => 'Method not allowed.']);
