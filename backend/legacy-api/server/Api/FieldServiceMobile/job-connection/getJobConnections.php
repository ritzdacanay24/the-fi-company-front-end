<?php
// getJobConnections.php - Get all connections for a specific job
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
$db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);



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
    $pdo = $db;
    
    // Get all jobs connected to this job (bidirectional)
    $stmt = $pdo->prepare("
        SELECT 
            c.id as connection_id,
            c.relationship_type,
            c.notes,
            c.created_date,
            c.created_by,
            CASE 
                WHEN c.parent_job_id = ? THEN c.connected_job_id
                ELSE c.parent_job_id
            END as connected_job_id,
            CASE 
                WHEN c.parent_job_id = ? THEN s2.id
                ELSE s1.id
            END as fs_id,
            CASE 
                WHEN c.parent_job_id = ? THEN s2.customer
                ELSE s1.customer
            END as customer,
            CASE 
                WHEN c.parent_job_id = ? THEN s2.service_type
                ELSE s1.service_type
            END as service_type,
            CASE 
                WHEN c.parent_job_id = ? THEN s2.status
                ELSE s1.status
            END as status,
            CASE 
                WHEN c.parent_job_id = ? THEN s2.request_date
                ELSE s1.request_date
            END as request_date
        FROM fs_job_connections c
        JOIN fs_scheduler s1 ON s1.id = c.parent_job_id
        JOIN fs_scheduler s2 ON s2.id = c.connected_job_id
        WHERE (c.parent_job_id = ? OR c.connected_job_id = ?)
        AND c.active = 1
        ORDER BY c.created_date DESC
    ");
    
    $stmt->execute([
        $job_id, $job_id, $job_id, $job_id, $job_id, $job_id, $job_id, $job_id
    ]);
    
    $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($connections);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
