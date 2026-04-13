<?php
// updateJobConnection.php - Update a job connection
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php'; // Your database config

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$connection_id = $_GET['id'] ?? null;

if (!$connection_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Connection id parameter is required']);
    exit;
}

// Get PUT data
$input = json_decode(file_get_contents('php://input'), true);

$relationship_type = $input['relationship_type'] ?? null;
$notes = $input['notes'] ?? null;

// Build dynamic update query
$updateFields = [];
$params = [];

if ($relationship_type !== null) {
    $updateFields[] = "relationship_type = ?";
    $params[] = $relationship_type;
}

if ($notes !== null) {
    $updateFields[] = "notes = ?";
    $params[] = $notes;
}

if (empty($updateFields)) {
    http_response_code(400);
    echo json_encode(['error' => 'No valid fields to update']);
    exit;
}

$params[] = $connection_id; // For WHERE clause

try {
    $pdo = new PDO($dsn, $username, $password, $options);
    
    $sql = "UPDATE fs_job_connections SET " . implode(', ', $updateFields) . " WHERE id = ? AND active = 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Job connection updated successfully'
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Connection not found or no changes made']);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
