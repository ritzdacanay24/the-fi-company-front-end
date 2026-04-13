<?php
// getRelatedJobs.php
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
    
    // First, get the main job's connecting_jobs data
    $stmt = $pdo->prepare("
        SELECT connecting_jobs 
        FROM fs_scheduler 
        WHERE id = ? OR fs_id = ?
    ");
    $stmt->execute([$job_id, $job_id]);
    $mainJob = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$mainJob || !$mainJob['connecting_jobs']) {
        echo json_encode([]);
        exit;
    }
    
    // Parse the JSON to get connected job IDs
    $connections = json_decode($mainJob['connecting_jobs'], true);
    if (!$connections || !isset($connections['relationships'])) {
        echo json_encode([]);
        exit;
    }
    
    $relatedJobs = [];
    
    foreach ($connections['relationships'] as $relation) {
        // Get details for each connected job
        $stmt = $pdo->prepare("
            SELECT 
                id,
                fs_id,
                customer,
                service_type,
                status,
                request_date,
                created_date
            FROM fs_scheduler 
            WHERE fs_id = ?
        ");
        $stmt->execute([$relation['job_id']]);
        $job = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($job) {
            $job['relationship_type'] = $relation['relationship_type'] ?? 'Related';
            $job['connection_created'] = $relation['created_date'] ?? null;
            $relatedJobs[] = $job;
        }
    }
    
    echo json_encode($relatedJobs);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
