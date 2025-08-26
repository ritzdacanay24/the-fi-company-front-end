<?php
/**
 * UL Labels Report API
 * Generates comprehensive reports for UL labels with usage statistics
 * 
 * Endpoint: GET /backend/api/ul-labels/reports/labels.php
 * Parameters: start_date, end_date, status, category
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
require_once '../../../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Build query with optional filters
        $conditions = [];
        $params = [];
        $types = "";
        
        // Date range filter
        if (isset($_GET['start_date']) && !empty($_GET['start_date'])) {
            $conditions[] = "ul.created_at >= ?";
            $params[] = $_GET['start_date'] . ' 00:00:00';
            $types .= "s";
        }
        
        if (isset($_GET['end_date']) && !empty($_GET['end_date'])) {
            $conditions[] = "ul.created_at <= ?";
            $params[] = $_GET['end_date'] . ' 23:59:59';
            $types .= "s";
        }
        
        // Status filter
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $conditions[] = "ul.status = ?";
            $params[] = $_GET['status'];
            $types .= "s";
        }
        
        // Category filter
        if (isset($_GET['category']) && !empty($_GET['category'])) {
            $conditions[] = "ul.category = ?";
            $params[] = $_GET['category'];
            $types .= "s";
        }
        
        $where_clause = count($conditions) > 0 ? "WHERE " . implode(" AND ", $conditions) : "";
        
        $query = "SELECT 
            ul.id,
            ul.ul_number,
            ul.description,
            ul.category,
            ul.manufacturer,
            ul.part_number,
            ul.certification_date,
            ul.expiry_date,
            ul.status,
            ul.created_at,
            COALESCE(SUM(ulu.quantity_used), 0) as total_quantity_used,
            COUNT(ulu.id) as usage_count,
            MAX(ulu.date_used) as last_used_date,
            CASE 
                WHEN ul.expiry_date IS NOT NULL AND ul.expiry_date < CURDATE() THEN 'expired'
                WHEN ul.expiry_date IS NOT NULL AND ul.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring_soon'
                ELSE ul.status
            END as computed_status
        FROM ul_labels ul
        LEFT JOIN ul_label_usages ulu ON ul.id = ulu.ul_label_id
        $where_clause
        GROUP BY ul.id, ul.ul_number, ul.description, ul.category, ul.manufacturer, 
                 ul.part_number, ul.certification_date, ul.expiry_date, ul.status, ul.created_at
        ORDER BY ul.created_at DESC";
        
        $stmt = $db->prepare($query);
        
        if (count($params) > 0) {
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $labels = [];
        while ($row = $result->fetch_assoc()) {
            $labels[] = $row;
        }
        
        // Get summary statistics
        $stats_query = "SELECT 
            COUNT(*) as total_labels,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_labels,
            COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_labels,
            COUNT(CASE WHEN status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date < CURDATE()) THEN 1 END) as expired_labels,
            COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND expiry_date >= CURDATE() THEN 1 END) as expiring_soon_labels
        FROM ul_labels ul
        $where_clause";
        
        $stats_stmt = $db->prepare($stats_query);
        if (count($params) > 0) {
            $stats_stmt->bind_param($types, ...$params);
        }
        $stats_stmt->execute();
        $stats = $stats_stmt->get_result()->fetch_assoc();
        
        echo json_encode([
            'success' => true,
            'data' => $labels,
            'summary' => $stats,
            'message' => 'UL Labels report generated successfully'
        ]);
        
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'INVALID_REQUEST',
            'message' => 'Method not allowed'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'SERVER_ERROR',
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}
