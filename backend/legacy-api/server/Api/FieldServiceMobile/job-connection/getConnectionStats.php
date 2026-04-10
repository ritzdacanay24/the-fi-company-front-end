<?php
// getConnectionStats.php - Get connection statistics for a job
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php'; // Your database config

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$job_id = $_GET['job_id'] ?? null;

if (!$job_id) {
    http_response_code(400);
    echo json_encode(['error' => 'job_id parameter is required']);
    exit;
}

try {
    $pdo = new PDO($dsn, $username, $password, $options);
    
    // Get connection statistics
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_connections,
            COUNT(CASE WHEN parent_job_id = ? THEN 1 END) as outgoing_connections,
            COUNT(CASE WHEN connected_job_id = ? THEN 1 END) as incoming_connections,
            GROUP_CONCAT(DISTINCT relationship_type) as relationship_types
        FROM fs_job_connections 
        WHERE (parent_job_id = ? OR connected_job_id = ?)
        AND active = 1
    ");
    
    $stmt->execute([$job_id, $job_id, $job_id, $job_id]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get relationship type breakdown
    $stmt = $pdo->prepare("
        SELECT 
            relationship_type,
            COUNT(*) as count
        FROM fs_job_connections 
        WHERE (parent_job_id = ? OR connected_job_id = ?)
        AND active = 1
        GROUP BY relationship_type
    ");
    
    $stmt->execute([$job_id, $job_id]);
    $relationshipBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [
        'job_id' => $job_id,
        'total_connections' => (int)$stats['total_connections'],
        'outgoing_connections' => (int)$stats['outgoing_connections'],
        'incoming_connections' => (int)$stats['incoming_connections'],
        'relationship_types' => $stats['relationship_types'] ? explode(',', $stats['relationship_types']) : [],
        'relationship_breakdown' => $relationshipBreakdown
    ];
    
    echo json_encode($result);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
