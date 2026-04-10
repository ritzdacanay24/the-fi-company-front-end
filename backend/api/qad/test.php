<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$dsn = getenv('QAD_DSN') ?: 'DEV';
$user = getenv('QAD_USER') ?: 'change_me';
$pass = getenv('QAD_PASSWORD') ?: 'change_me';
$sql = isset($_GET['sql']) ? trim((string)$_GET['sql']) : 'select top 1 * from sod_det';

if (!function_exists('odbc_connect')) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'PHP ODBC extension is not loaded',
    ]);
    exit;
}

$conn = @odbc_connect($dsn, $user, $pass);
if (!$conn) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'dsn' => $dsn,
        'error' => odbc_errormsg(),
    ]);
    exit;
}

$result = @odbc_exec($conn, $sql);
if (!$result) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'dsn' => $dsn,
        'sql' => $sql,
        'error' => odbc_errormsg($conn),
    ]);
    odbc_close($conn);
    exit;
}

$rows = [];
while ($row = odbc_fetch_array($result)) {
    $rows[] = $row;
    if (count($rows) >= 5) {
        break;
    }
}

odbc_free_result($result);
odbc_close($conn);

echo json_encode([
    'ok' => true,
    'dsn' => $dsn,
    'sql' => $sql,
    'count' => count($rows),
    'rows' => $rows,
], JSON_PRETTY_PRINT);
