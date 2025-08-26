<?php
// deleteJobConnection.php - Delete a job connection
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php'; // Your database config

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$connection_id = $_GET['id'] ?? null;

if (!$connection_id) {
    http_response_code(400);
    echo json_encode(['error' => 'connection id parameter is required']);
    exit;
}

try {
    $pdo = new PDO($dsn, $username, $password, $options);
    
    // Soft delete by setting active = 0
    $stmt = $pdo->prepare("
        UPDATE fs_job_connections 
        SET active = 0 
        WHERE id = ?
    ");
    
    $stmt->execute([$connection_id]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Job connection deleted successfully'
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Connection not found']);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
