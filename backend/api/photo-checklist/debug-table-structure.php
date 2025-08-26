<?php
require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Check table structure
    $sql = "DESCRIBE checklist_items";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response = [
        'success' => true,
        'table_structure' => $columns,
        'has_sample_images_column' => false,
        'has_sample_image_url_column' => false
    ];
    
    foreach ($columns as $column) {
        if ($column['Field'] === 'sample_images') {
            $response['has_sample_images_column'] = true;
        }
        if ($column['Field'] === 'sample_image_url') {
            $response['has_sample_image_url_column'] = true;
        }
    }
    
    // Check latest records to see what data is being stored
    $sql = "SELECT id, template_id, title, sample_images, sample_image_url FROM checklist_items ORDER BY id DESC LIMIT 5";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $recentRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response['recent_records'] = $recentRecords;
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
