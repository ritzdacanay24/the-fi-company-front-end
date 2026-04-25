<?php

declare(strict_types=1);

// Simple viewer for the `dailyReport` table.
// Usage (web): /tasks/dailyReportViewer.php?date=2026-01-30
// Shows the latest saved report for that day.

$autoloadCandidates = [
    __DIR__ . '/../vendor/autoload.php',
    '/var/www/html/vendor/autoload.php',
    '/var/www/html/api/eyefi/vendor/autoload.php',
];

foreach ($autoloadCandidates as $autoload) {
    if (is_file($autoload)) {
        require_once $autoload;
        break;
    }
}

use EyefiDb\Databases\DatabaseEyefi;

if (!class_exists(DatabaseEyefi::class)) {
    http_response_code(500);
    echo 'Autoload failed: could not find EyefiDb\\Databases\\DatabaseEyefi. '; 
    echo 'Checked: ' . implode(', ', array_map('htmlspecialchars', $autoloadCandidates));
    exit;
}

function h(?string $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function isIsoDate(?string $value): bool
{
    return is_string($value) && (bool)preg_match('/^\d{4}-\d{2}-\d{2}$/', $value);
}

function getArrayValue(array $array, string $key, $default = null)
{
    return array_key_exists($key, $array) ? $array[$key] : $default;
}

function asMoney($value): string
{
    if ($value === null || $value === '') {
        return '';
    }

    if (is_numeric($value)) {
        return number_format((float)$value, 2, '.', ',');
    }

    return (string)$value;
}

function asNumber($value): string
{
    if ($value === null || $value === '') {
        return '';
    }

    if (is_numeric($value)) {
        // Keep integers clean.
        if ((string)(int)$value === (string)$value) {
            return (string)(int)$value;
        }
        return rtrim(rtrim(number_format((float)$value, 6, '.', ','), '0'), '.');
    }

    return (string)$value;
}

function isAssocArray(array $array): bool
{
    if ($array === []) {
        return false;
    }
    return array_keys($array) !== range(0, count($array) - 1);
}

/**
 * Flattens mixed JSON (arrays/objects/scalars) into key-path rows.
 *
 * @return array<int, array{key:string,type:string,value:string}>
 */
function flattenJsonForTable($value, string $prefix = '', int $depth = 0, int $maxDepth = 10, int $maxRows = 5000, array &$rows = []): array
{
    if (count($rows) >= $maxRows) {
        return $rows;
    }

    if ($depth > $maxDepth) {
        $rows[] = [
            'key' => $prefix === '' ? '(root)' : $prefix,
            'type' => 'truncated',
            'value' => '[max depth reached]'
        ];
        return $rows;
    }

    if (is_array($value)) {
        if ($value === []) {
            $rows[] = [
                'key' => $prefix === '' ? '(root)' : $prefix,
                'type' => 'array',
                'value' => '[]'
            ];
            return $rows;
        }

        $assoc = isAssocArray($value);

        foreach ($value as $k => $v) {
            $keyPart = $assoc ? (string)$k : '[' . (string)$k . ']';
            $nextPrefix = $prefix === '' ? $keyPart : ($assoc ? ($prefix . '.' . $keyPart) : ($prefix . $keyPart));
            flattenJsonForTable($v, $nextPrefix, $depth + 1, $maxDepth, $maxRows, $rows);
            if (count($rows) >= $maxRows) {
                break;
            }
        }
        return $rows;
    }

    if (is_object($value)) {
        return flattenJsonForTable((array)$value, $prefix, $depth, $maxDepth, $maxRows, $rows);
    }

    $type = gettype($value);
    if ($value === null) {
        $type = 'null';
    }

    $stringValue = '';
    if (is_bool($value)) {
        $stringValue = $value ? 'true' : 'false';
    } elseif ($value === null) {
        $stringValue = 'null';
    } elseif (is_numeric($value)) {
        $stringValue = (string)$value;
    } else {
        $stringValue = (string)$value;
    }

    $rows[] = [
        'key' => $prefix === '' ? '(root)' : $prefix,
        'type' => $type,
        'value' => $stringValue,
    ];

    return $rows;
}

$date = $_GET['date'] ?? null;

// Always show a single report (latest within the selected day/range).
$limitInt = 1;

// Default to today.
$selectedDate = isIsoDate($date) ? $date : (new DateTimeImmutable('now'))->format('Y-m-d');
$fromDate = $selectedDate;
$toDate = (new DateTimeImmutable($selectedDate))->modify('+1 day')->format('Y-m-d');

$db = (new DatabaseEyefi(['displayError' => true]))->getConnection();

$sql = "
    SELECT id, createdDate, data
    FROM dailyReport
    WHERE createdDate >= :fromDate
      AND createdDate < :toDate
    ORDER BY createdDate DESC
        LIMIT 1
";

$sth = $db->prepare($sql);
$sth->bindValue(':fromDate', $fromDate . ' 00:00:00', PDO::PARAM_STR);
$sth->bindValue(':toDate', $toDate . ' 00:00:00', PDO::PARAM_STR);
$sth->execute();
$row = $sth->fetch(PDO::FETCH_ASSOC);

$decoded = [];
if (is_array($row) && isset($row['data'])) {
    $decoded = json_decode((string)$row['data'], true);
    $decoded = is_array($decoded) ? $decoded : [];
}

$status = (string)getArrayValue($decoded, 'status', '');
$lastRefreshed = (string)getArrayValue($decoded, 'last_refreshed', '');
$beginning = (string)getArrayValue($decoded, 'beginning', '');
$last = (string)getArrayValue($decoded, 'last', '');
$inventoryValue = getArrayValue($decoded, 'inventory_value', '');
$wip = getArrayValue($decoded, 'wip', '');
$totalOpen = getArrayValue($decoded, 'total_open', '');
$totalOpenValue = getArrayValue($decoded, 'total_open_value', '');
$totalOpenValueToday = getArrayValue($decoded, 'total_open_value_today', '');
$shippingTotalShippedValue = getArrayValue($decoded, 'shipping_total_shipped_value', '');
$totalShippedTodayLines = getArrayValue($decoded, 'total_shipped_today_lines', '');
$otdPercent = getArrayValue($decoded, 'on_time_delivery_today_percent', '');
$otdLinesToday = getArrayValue($decoded, 'total_lines_due_today', '');
$otdOnTimeToday = getArrayValue($decoded, 'on_time_delivery_today', '');
$valuePercentageTodayCompleted = getArrayValue($decoded, 'value_percentage_today_completed', '');
$percentPlanOverallCompleted = getArrayValue($decoded, 'percent_plan_overall_completed', '');

$all = getArrayValue($decoded, 'all', []);
$eye01 = getArrayValue($decoded, 'eye01', []);
$fgLV = getArrayValue($decoded, 'fgLV', []);
$shippingInfo = getArrayValue($decoded, 'shippingInfo', []);
$productionDue = getArrayValue($decoded, 'production', []);

$shippingOverdueLines = getArrayValue(
    $decoded,
    'shipping_open_overdue_and_due_today_lines',
    getArrayValue((array)$shippingInfo, 'shipping_open_overdue_and_due_today_lines', '')
);
$shippingOverdueValue = getArrayValue(
    $decoded,
    'shipping_open_overdue_and_due_today_value',
    getArrayValue((array)$shippingInfo, 'shipping_open_overdue_and_due_today_value', '')
);

$getThreeMonthsRevenue = getArrayValue($decoded, 'getThreeMonthsRevenue', []);
$threeMonthsRevenue = is_array($getThreeMonthsRevenue) ? getArrayValue($getThreeMonthsRevenue, 'value', '') : '';

$rejectTotalExtCost = getArrayValue($decoded, 'reject_total_ext_cost', '');
$transitTotalExtCost = getArrayValue($decoded, 'transit_total_ext_cost', '');
$intgrtdTotalExtCost = getArrayValue($decoded, 'intgrtd_total_ext_cost', '');

$scheduledJobs = getArrayValue($decoded, 'scheduledJobs', []);
$scheduledJobs = is_array($scheduledJobs) ? $scheduledJobs : [];
$scheduledJobsCount = count($scheduledJobs);

// Inventory site buckets: include any top-level JSON object that has total/age breakdown.
$inventoryBuckets = [];
if (!empty($decoded)) {
    foreach ($decoded as $bucketName => $bucketValue) {
        if (!is_array($bucketValue)) {
            continue;
        }

        if (
            array_key_exists('total', $bucketValue)
            || array_key_exists('lessthanone', $bucketValue)
            || array_key_exists('greaterthanorequaltoone', $bucketValue)
        ) {
            $inventoryBuckets[$bucketName] = $bucketValue;
        }
    }

    $preferredOrder = ['all', 'eye01', 'fgLV', 'ss', 'jx01'];
    uksort($inventoryBuckets, function ($a, $b) use ($preferredOrder) {
        $ai = array_search($a, $preferredOrder, true);
        $bi = array_search($b, $preferredOrder, true);
        $ai = ($ai === false) ? 999 : $ai;
        $bi = ($bi === false) ? 999 : $bi;
        if ($ai === $bi) {
            return strcmp((string)$a, (string)$b);
        }
        return $ai <=> $bi;
    });
}

$onTime = getArrayValue($decoded, 'onTime', []);
$onTime = is_array($onTime) ? $onTime : [];

$prettyJson = '';
if (!empty($decoded)) {
    $prettyJson = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

$allFields = [];
if (!empty($decoded)) {
    $allFields = flattenJsonForTable($decoded);
}

?><!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Daily Report Viewer</title>
    <style>
        :root {
            --bg: #0b1220;
            --card: #0f172a;
            --muted: #94a3b8;
            --text: #e2e8f0;
            --border: rgba(148, 163, 184, 0.18);
            --accent: #60a5fa;
            --accent2: #34d399;
        }

        * { box-sizing: border-box; }
        body {
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Helvetica, sans-serif;
            margin: 0;
            background: radial-gradient(1200px 700px at 10% 0%, rgba(96,165,250,0.15), transparent 40%),
                        radial-gradient(900px 500px at 90% 10%, rgba(52,211,153,0.12), transparent 45%),
                        var(--bg);
            color: var(--text);
        }
        .container { max-width: 1500px; margin: 0 auto; padding: 18px; }

        h2 { margin: 0 0 6px 0; font-weight: 700; letter-spacing: 0.2px; }
        .muted { color: var(--muted); font-size: 13px; }
        code { padding: 1px 6px; border-radius: 999px; background: rgba(148,163,184,0.12); border: 1px solid var(--border); }

        .card {
            margin-top: 12px;
            background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
            border: 1px solid var(--border);
            border-radius: 14px;
            box-shadow: 0 12px 35px rgba(0,0,0,0.35);
            overflow: hidden;
        }

        .controls {
            display: grid;
            grid-template-columns: repeat(2, minmax(220px, 1fr));
            gap: 12px;
            align-items: end;
            padding: 14px;
        }
        @media (max-width: 980px) {
            .controls { grid-template-columns: repeat(2, minmax(160px, 1fr)); }
        }
        @media (max-width: 520px) {
            .controls { grid-template-columns: 1fr; }
        }

        label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
        input {
            width: 100%;
            padding: 9px 10px;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: rgba(2, 6, 23, 0.55);
            color: var(--text);
            outline: none;
        }
        input:focus { border-color: rgba(96,165,250,0.55); box-shadow: 0 0 0 3px rgba(96,165,250,0.15); }

        /* Make native date picker icon visible on dark UI (Chrome/WebKit).
           Some environments still render this icon too dark; we also provide a custom calendar button. */
        input[type="date"] { color-scheme: dark; }
        input[type="date"]::-webkit-calendar-picker-indicator {
            filter: invert(1) brightness(1.25);
            opacity: 0.9;
            cursor: pointer;
        }

        .dateField { display: flex; gap: 10px; align-items: center; }
        .dateField input[type="date"] { min-width: 220px; }
        .iconBtn {
            width: 44px;
            height: 40px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            border: 1px solid rgba(96,165,250,0.55);
            background: rgba(96,165,250,0.18);
            color: var(--text);
            cursor: pointer;
            padding: 0;
        }
        .iconBtn:hover { background: rgba(96,165,250,0.25); }
        .iconBtn svg { width: 18px; height: 18px; opacity: 0.95; }
        button {
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid rgba(96,165,250,0.55);
            background: rgba(96,165,250,0.18);
            color: var(--text);
            cursor: pointer;
            font-weight: 600;
        }
        button:hover { background: rgba(96,165,250,0.25); }

        .controls .tip { grid-column: 1 / -1; }
        .kpis {
            display: grid;
            grid-template-columns: repeat(4, minmax(220px, 1fr));
            gap: 12px;
            padding: 14px;
        }
        @media (max-width: 980px) {
            .kpis { grid-template-columns: repeat(2, minmax(220px, 1fr)); }
        }
        @media (max-width: 520px) {
            .kpis { grid-template-columns: 1fr; }
        }
        .kpi {
            border: 1px solid var(--border);
            background: rgba(2, 6, 23, 0.45);
            border-radius: 14px;
            padding: 12px;
        }
        .kpi .label { color: var(--muted); font-size: 12px; }
        .kpi .value { margin-top: 6px; font-size: 22px; font-weight: 800; letter-spacing: 0.3px; }
        .kpi .sub { margin-top: 6px; color: var(--muted); font-size: 12px; }
        .meta {
            padding: 12px 14px;
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
        }

        .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; background: rgba(148,163,184,0.12); border: 1px solid var(--border); font-size: 12px; }
        .pill.ok { border-color: rgba(52,211,153,0.35); background: rgba(52,211,153,0.12); }
        .pill.warn { border-color: rgba(251,191,36,0.35); background: rgba(251,191,36,0.10); }

        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: separate; border-spacing: 0; }
        th, td { padding: 10px 10px; vertical-align: top; border-bottom: 1px solid var(--border); }
        th {
            background: rgba(2, 6, 23, 0.75);
            position: sticky;
            top: 0;
            z-index: 2;
            text-align: left;
            font-size: 12px;
            color: var(--muted);
            letter-spacing: 0.35px;
            text-transform: uppercase;
        }
        tbody tr:nth-child(odd) td { background: rgba(2, 6, 23, 0.22); }
        tbody tr:nth-child(even) td { background: rgba(2, 6, 23, 0.35); }
        tbody tr:hover td { background: rgba(96,165,250,0.10); }

        .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .nowrap { white-space: nowrap; }
        .detailsCell { max-width: 520px; }
        details > summary { cursor: pointer; user-select: none; color: var(--accent); font-weight: 600; }
        details[open] > summary { color: var(--accent2); }

        .detail-panel {
            margin-top: 10px;
            padding: 10px;
            border-radius: 12px;
            border: 1px solid var(--border);
            background: rgba(2, 6, 23, 0.55);
        }
        pre {
            margin: 10px 0 0 0;
            padding: 10px;
            background: rgba(15, 23, 42, 0.65);
            border: 1px solid var(--border);
            color: var(--text);
            overflow: auto;
            border-radius: 10px;
            max-height: 360px;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .innerTable { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .innerTable th, .innerTable td { border-bottom: 1px solid var(--border); padding: 8px; }
        .innerTable th { position: static; background: transparent; text-transform: none; font-size: 12px; }
        .empty { padding: 18px 14px; }
        .section { padding: 14px; border-top: 1px solid var(--border); }
        .section h3 { margin: 0 0 10px 0; font-size: 14px; letter-spacing: 0.2px; }
        .kv { width: 100%; }
        .kv td:first-child { width: 340px; color: var(--muted); }
        .toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 10px; }
        .toolbar input { max-width: 420px; }
        .small { font-size: 12px; color: var(--muted); }
    </style>
</head>
<body>
<div class="container">
    <h2>Daily Report Viewer</h2>
    <div class="muted">Queries MySQL table <b>dailyReport</b> by date and renders stored JSON summary.</div>

    <div class="card">
        <form method="get" class="controls">
            <div>
                <label for="date">Date (single day)</label>
                <div class="dateField">
                    <input id="date" name="date" type="date" value="<?= h($selectedDate) ?>" />
                    <button class="iconBtn" id="datePickerBtn" type="button" aria-label="Open calendar">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M8 3V5M16 3V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M4 9H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M6 5H18C19.1046 5 20 5.89543 20 7V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V7C4 5.89543 4.89543 5 6 5Z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div>
                <button type="submit">Run</button>
            </div>
            <div class="muted tip">Tip: use <code>?date=YYYY-MM-DD</code>.</div>
        </form>

        <script>
            (function () {
                var btn = document.getElementById('datePickerBtn');
                var input = document.getElementById('date');
                if (!btn || !input) return;

                btn.addEventListener('click', function () {
                    // Chrome/Edge support showPicker() for date inputs.
                    if (typeof input.showPicker === 'function') {
                        input.showPicker();
                    } else {
                        input.focus();
                        input.click();
                    }
                });
            })();
        </script>

        <div class="meta">
            <div class="muted">
                Showing the <b>latest</b> report for <span class="pill"><?= h($selectedDate) ?></span>
            </div>
            <div>
                <?php if (is_array($row) && !empty($row)): ?>
                    <span class="pill ok">OK</span>
                <?php else: ?>
                    <span class="pill warn">No Results</span>
                <?php endif; ?>
            </div>
        </div>

        <?php if (!is_array($row) || empty($row)): ?>
            <div class="empty muted">No dailyReport rows found for that date range.</div>
        <?php else: ?>

            <div class="kpis">
                <div class="kpi">
                    <div class="label">Report Status</div>
                    <div class="value" style="font-size: 18px;"><?= h($status !== '' ? $status : '—') ?></div>
                    <div class="sub">Created: <?= h((string)$row['createdDate']) ?></div>
                </div>
                <div class="kpi">
                    <div class="label">Inventory Value</div>
                    <div class="value">$<?= h(asMoney($inventoryValue)) ?></div>
                    <div class="sub">All inventory (summary)</div>
                </div>
                <div class="kpi">
                    <div class="label">Open Orders</div>
                    <div class="value"><?= h(asNumber($totalOpen)) ?></div>
                    <div class="sub">Open Value: $<?= h(asMoney($totalOpenValue)) ?></div>
                </div>
                <div class="kpi">
                    <div class="label">On-Time Delivery</div>
                    <div class="value"><?= h(asNumber($otdPercent)) ?>%</div>
                    <div class="sub">On-time: <?= h(asNumber($otdOnTimeToday)) ?> / <?= h(asNumber($otdLinesToday)) ?></div>
                </div>
            </div>

            <div class="section">
                <h3>Report Summary</h3>
                <div class="table-wrap">
                    <table class="kv">
                        <tbody>
                        <tr><td>Report ID</td><td><?= h((string)$row['id']) ?></td></tr>
                        <tr><td>Created Date</td><td class="nowrap"><?= h((string)$row['createdDate']) ?></td></tr>
                        <tr><td>Last Refreshed</td><td class="nowrap"><?= h($lastRefreshed) ?></td></tr>
                        <tr><td>Beginning</td><td class="nowrap"><?= h($beginning) ?></td></tr>
                        <tr><td>Last (target date)</td><td class="nowrap"><?= h($last) ?></td></tr>
                        <tr><td>WIP $</td><td>$<?= h(asMoney($wip)) ?></td></tr>
                        <tr><td>Total Shipped Value (today)</td><td>$<?= h(asMoney($shippingTotalShippedValue)) ?></td></tr>
                        <tr><td>Total Shipped Lines (today)</td><td><?= h(asNumber($totalShippedTodayLines)) ?></td></tr>
                        <tr><td>Total Open Value (today)</td><td>$<?= h(asMoney($totalOpenValueToday)) ?></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <h3>Inventory Breakdown</h3>
                <div class="table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Bucket</th>
                            <th class="num">Total $</th>
                            <th class="num">&lt; 1 Year $</th>
                            <th class="num">≥ 1 Year $</th>
                        </tr>
                        </thead>
                        <tbody>
                        <?php if (empty($inventoryBuckets)): ?>
                            <tr><td colspan="4" class="muted">No inventory buckets found in this report.</td></tr>
                        <?php else: ?>
                            <?php foreach ($inventoryBuckets as $bucketName => $bucketValue):
                                $bucketValue = is_array($bucketValue) ? $bucketValue : [];
                                // Nicer label for a couple known buckets.
                                $label = (string)$bucketName;
                                if ($label === 'fgLV') { $label = 'FG LV'; }
                                if ($label === 'eye01') { $label = 'EYE01'; }
                                if ($label === 'all') { $label = 'All'; }
                                if ($label === 'ss') { $label = 'SS'; }
                                if ($label === 'jx01') { $label = 'JX01'; }
                            ?>
                                <tr>
                                    <td><?= h($label) ?></td>
                                    <td class="num">$<?= h(asMoney(getArrayValue($bucketValue, 'total', ''))) ?></td>
                                    <td class="num">$<?= h(asMoney(getArrayValue($bucketValue, 'lessthanone', ''))) ?></td>
                                    <td class="num">$<?= h(asMoney(getArrayValue($bucketValue, 'greaterthanorequaltoone', ''))) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <h3>Shipping</h3>
                <div class="table-wrap">
                    <table class="kv">
                        <tbody>
                        <tr><td>Open overdue / due today (lines)</td><td><?= h(asNumber($shippingOverdueLines)) ?></td></tr>
                        <tr><td>Open overdue / due today (value)</td><td>$<?= h(asMoney($shippingOverdueValue)) ?></td></tr>
                        <tr><td>Min ship date</td><td><?= h((string)getArrayValue((array)$shippingInfo, 'min_date', '')) ?></td></tr>
                        <tr><td>Max ship date</td><td><?= h((string)getArrayValue((array)$shippingInfo, 'max_date', '')) ?></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <h3>Revenue / Costs / Progress</h3>
                <div class="table-wrap">
                    <table class="kv">
                        <tbody>
                        <tr><td>3-Month Revenue</td><td>$<?= h(asMoney($threeMonthsRevenue)) ?></td></tr>
                        <tr><td>Reject Total Ext Cost</td><td>$<?= h(asMoney($rejectTotalExtCost)) ?></td></tr>
                        <tr><td>Transit Total Ext Cost</td><td>$<?= h(asMoney($transitTotalExtCost)) ?></td></tr>
                        <tr><td>Integrated Total Ext Cost</td><td>$<?= h(asMoney($intgrtdTotalExtCost)) ?></td></tr>
                        <tr><td>Value % Today Completed</td><td><?= h(asNumber($valuePercentageTodayCompleted)) ?>%</td></tr>
                        <tr><td>% Plan Overall Completed</td><td><?= h(asNumber($percentPlanOverallCompleted)) ?>%</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <h3>Scheduled Jobs</h3>
                <?php if ($scheduledJobsCount === 0): ?>
                    <div class="muted">No scheduled jobs listed for this report.</div>
                <?php else: ?>
                    <div class="muted">Jobs: <b><?= (int)$scheduledJobsCount ?></b></div>
                    <div class="table-wrap" style="margin-top: 10px;">
                        <table>
                            <thead>
                            <tr>
                                <th>#</th>
                                <th>Job</th>
                            </tr>
                            </thead>
                            <tbody>
                            <?php foreach ($scheduledJobs as $i => $job): ?>
                                <tr>
                                    <td class="num"><?= (int)($i + 1) ?></td>
                                    <td><?= h(is_string($job) ? $job : json_encode($job)) ?></td>
                                </tr>
                            <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>

            <div class="section">
                <h3>Production (Routing 20 Due)</h3>
                <?php
                $due = [];
                if (is_array($productionDue)) {
                    $r20 = getArrayValue($productionDue, 'production_routing_20', []);
                    if (is_array($r20)) {
                        $due = getArrayValue($r20, 'due', []);
                        $due = is_array($due) ? $due : [];
                    }
                }
                ?>
                <div class="table-wrap">
                    <table class="kv">
                        <tbody>
                        <tr><td>Due Open</td><td><?= h(asNumber(getArrayValue($due, 'due_open', ''))) ?></td></tr>
                        <tr><td>Due Total</td><td><?= h(asNumber(getArrayValue($due, 'due_total', ''))) ?></td></tr>
                        <tr><td>Due Percent</td><td><?= h(asNumber(getArrayValue($due, 'due_percent', ''))) ?>%</td></tr>
                        <tr><td>Completed Today</td><td><?= h(asNumber(getArrayValue($due, 'due_completed_today', ''))) ?></td></tr>
                        <tr><td>Total Overdue Orders</td><td><?= h(asNumber(getArrayValue($due, 'total_overdue_orders', ''))) ?></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <h3>On-Time Today (by Customer)</h3>
                <?php if (empty($onTime)): ?>
                    <div class="muted">No on-time details available for this report.</div>
                <?php else: ?>
                    <div class="table-wrap">
                        <table>
                            <thead>
                            <tr>
                                <th>Customer</th>
                                <th class="num">Lines Today</th>
                                <th class="num">Shipped Today</th>
                                <th class="num">Shipped Late</th>
                                <th class="num">Value Shipped</th>
                            </tr>
                            </thead>
                            <tbody>
                            <?php foreach ($onTime as $entry):
                                $entry = is_array($entry) ? $entry : [];
                            ?>
                                <tr>
                                    <td><?= h((string)getArrayValue($entry, 'so_cust', '')) ?></td>
                                    <td class="num"><?= h(asNumber(getArrayValue($entry, 'toal_lines_today', ''))) ?></td>
                                    <td class="num"><?= h(asNumber(getArrayValue($entry, 'total_shipped_today', ''))) ?></td>
                                    <td class="num"><?= h(asNumber(getArrayValue($entry, 'shipped_after_due_date', ''))) ?></td>
                                    <td class="num">$<?= h(asMoney(getArrayValue($entry, 'total_value_shipped_today', ''))) ?></td>
                                </tr>
                            <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>

            <div class="section">
                <h3>Raw JSON (for troubleshooting)</h3>
                <details>
                    <summary>Show raw JSON</summary>
                    <div class="detail-panel">
                        <?php if ($prettyJson !== ''): ?>
                            <pre><?= h($prettyJson) ?></pre>
                        <?php else: ?>
                            <div class="muted">No JSON parsed for this row (invalid/empty data).</div>
                        <?php endif; ?>
                    </div>
                </details>
            </div>

            <div class="section">
                <h3>Other Fields (Searchable)</h3>
                <?php if (empty($allFields)): ?>
                    <div class="muted">No JSON fields available.</div>
                <?php else: ?>
                    <details>
                        <summary>Open searchable key/value table</summary>
                        <div class="detail-panel">
                            <div class="toolbar">
                                <div class="small">Search keys/values to quickly find metrics.</div>
                                <input id="allFieldsFilter" type="text" placeholder="Filter (e.g. shipping, revenue, due_percent, transit...)" />
                            </div>
                            <div class="table-wrap">
                                <table id="allFieldsTable">
                                    <thead>
                                    <tr>
                                        <th style="width: 420px;">Key</th>
                                        <th style="width: 90px;">Type</th>
                                        <th>Value</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <?php foreach ($allFields as $field): ?>
                                        <tr>
                                            <td class="nowrap"><?= h($field['key']) ?></td>
                                            <td><?= h($field['type']) ?></td>
                                            <td><?= h($field['value']) ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>

                            <script>
                                (function () {
                                    var input = document.getElementById('allFieldsFilter');
                                    var table = document.getElementById('allFieldsTable');
                                    if (!input || !table) return;
                                    var tbody = table.tBodies && table.tBodies[0];
                                    if (!tbody) return;

                                    function normalize(s) {
                                        return (s || '').toString().toLowerCase();
                                    }

                                    input.addEventListener('input', function () {
                                        var q = normalize(input.value).trim();
                                        var rows = tbody.rows;
                                        for (var i = 0; i < rows.length; i++) {
                                            var row = rows[i];
                                            var text = normalize(row.textContent);
                                            row.style.display = (q === '' || text.indexOf(q) !== -1) ? '' : 'none';
                                        }
                                    });
                                })();
                            </script>
                        </div>
                    </details>
                <?php endif; ?>
            </div>

        <?php endif; ?>
    </div>
</div>
</body>
</html>
