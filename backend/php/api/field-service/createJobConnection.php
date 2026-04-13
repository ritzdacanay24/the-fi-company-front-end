<?php
// createJobConnection.php - Create a new job connection
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php'; // Your database config

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

$parent_job_id = $input['parent_job_id'] ?? null;
$connected_job_id = $input['connected_job_id'] ?? null;
$relationship_type = $input['relationship_type'] ?? 'Related';
$notes = $input['notes'] ?? '';
$created_by = $input['created_by'] ?? 'system';

// Validation
if (!$parent_job_id || !$connected_job_id) {
    http_response_code(400);
    echo json_encode(['error' => 'parent_job_id and connected_job_id are required']);
    exit;
}

if ($parent_job_id == $connected_job_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Cannot connect a job to itself']);
    exit;
}

try {
    $pdo = new PDO($dsn, $username, $password, $options);
    
    // Check if connection already exists
    $stmt = $pdo->prepare("
        SELECT id FROM fs_job_connections 
        WHERE ((parent_job_id = ? AND connected_job_id = ?) 
           OR (parent_job_id = ? AND connected_job_id = ?))
        AND relationship_type = ?
        AND active = 1
    ");
    $stmt->execute([
        $parent_job_id, $connected_job_id, 
        $connected_job_id, $parent_job_id, 
        $relationship_type
    ]);
    
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Connection already exists']);
        exit;
    }
    
    // Create the connection
    $stmt = $pdo->prepare("
        INSERT INTO fs_job_connections 
        (parent_job_id, connected_job_id, relationship_type, notes, created_by) 
        VALUES (?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $parent_job_id, 
        $connected_job_id, 
        $relationship_type, 
        $notes, 
        $created_by
    ]);
    
    $connection_id = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'connection_id' => $connection_id,
        'message' => 'Job connection created successfully'
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
