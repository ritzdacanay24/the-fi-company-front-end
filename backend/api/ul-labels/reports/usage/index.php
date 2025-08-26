<?php
/**
 * UL Usage Report API
 * Generates comprehensive usage reports with filtering capabilities
 * 
 * Endpoint: GET /backend/api/ul-labels/reports/usage/index.php
 * Parameters: start_date, end_date, customer_name, ul_number, user_name
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
require_once '../../../../config/database.php';

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
            $conditions[] = "ulu.date_used >= ?";
            $params[] = $_GET['start_date'];
            $types .= "s";
        }
        
        if (isset($_GET['end_date']) && !empty($_GET['end_date'])) {
            $conditions[] = "ulu.date_used <= ?";
            $params[] = $_GET['end_date'];
            $types .= "s";
        }
        
        // Customer filter
        if (isset($_GET['customer_name']) && !empty($_GET['customer_name'])) {
            $conditions[] = "ulu.customer_name LIKE ?";
            $params[] = "%" . $_GET['customer_name'] . "%";
            $types .= "s";
        }
        
        // UL Number filter
        if (isset($_GET['ul_number']) && !empty($_GET['ul_number'])) {
            $conditions[] = "ulu.ul_number = ?";
            $params[] = $_GET['ul_number'];
            $types .= "s";
        }
        
        // User filter
        if (isset($_GET['user_name']) && !empty($_GET['user_name'])) {
            $conditions[] = "ulu.user_name LIKE ?";
            $params[] = "%" . $_GET['user_name'] . "%";
            $types .= "s";
        }
        
        $where_clause = count($conditions) > 0 ? "WHERE " . implode(" AND ", $conditions) : "";
        
        $query = "SELECT 
            ulu.id,
            ulu.ul_label_id,
            ulu.ul_number,
            ul.description as ul_description,
            ul.category,
            ul.manufacturer,
            ul.part_number,
            ulu.eyefi_serial_number,
            ulu.quantity_used,
            ulu.date_used,
            ulu.user_signature,
            ulu.user_name,
            ulu.customer_name,
            ulu.notes,
            ulu.created_at,
            ul.status as ul_status
        FROM ul_label_usages ulu
        INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id
        $where_clause
        ORDER BY ulu.date_used DESC, ulu.created_at DESC";
        
        $stmt = $db->prepare($query);
        
        if (count($params) > 0) {
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $usage_records = [];
        while ($row = $result->fetch_assoc()) {
            $usage_records[] = $row;
        }
        
        // Get summary statistics
        $stats_query = "SELECT 
            COUNT(*) as total_usage_records,
            SUM(ulu.quantity_used) as total_quantity_used,
            COUNT(DISTINCT ulu.ul_number) as unique_ul_numbers_used,
            COUNT(DISTINCT ulu.customer_name) as unique_customers,
            COUNT(DISTINCT ulu.user_name) as unique_users,
            COUNT(DISTINCT ulu.eyefi_serial_number) as unique_serial_numbers,
            MIN(ulu.date_used) as earliest_usage_date,
            MAX(ulu.date_used) as latest_usage_date
        FROM ul_label_usages ulu
        INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id
        $where_clause";
        
        $stats_stmt = $db->prepare($stats_query);
        if (count($params) > 0) {
            $stats_stmt->bind_param($types, ...$params);
        }
        $stats_stmt->execute();
        $stats = $stats_stmt->get_result()->fetch_assoc();
        
        // Get top customers by usage
        $top_customers_query = "SELECT 
            ulu.customer_name,
            COUNT(*) as usage_count,
            SUM(ulu.quantity_used) as total_quantity
        FROM ul_label_usages ulu
        INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id
        $where_clause
        GROUP BY ulu.customer_name
        ORDER BY total_quantity DESC, usage_count DESC
        LIMIT 10";
        
        $top_customers_stmt = $db->prepare($top_customers_query);
        if (count($params) > 0) {
            $top_customers_stmt->bind_param($types, ...$params);
        }
        $top_customers_stmt->execute();
        $top_customers_result = $top_customers_stmt->get_result();
        
        $top_customers = [];
        while ($row = $top_customers_result->fetch_assoc()) {
            $top_customers[] = $row;
        }
        
        // Get top UL numbers by usage
        $top_ul_numbers_query = "SELECT 
            ulu.ul_number,
            ul.description,
            COUNT(*) as usage_count,
            SUM(ulu.quantity_used) as total_quantity
        FROM ul_label_usages ulu
        INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id
        $where_clause
        GROUP BY ulu.ul_number, ul.description
        ORDER BY total_quantity DESC, usage_count DESC
        LIMIT 10";
        
        $top_ul_numbers_stmt = $db->prepare($top_ul_numbers_query);
        if (count($params) > 0) {
            $top_ul_numbers_stmt->bind_param($types, ...$params);
        }
        $top_ul_numbers_stmt->execute();
        $top_ul_numbers_result = $top_ul_numbers_stmt->get_result();
        
        $top_ul_numbers = [];
        while ($row = $top_ul_numbers_result->fetch_assoc()) {
            $top_ul_numbers[] = $row;
        }
        
        echo json_encode([
            'success' => true,
            'data' => $usage_records,
            'summary' => $stats,
            'top_customers' => $top_customers,
            'top_ul_numbers' => $top_ul_numbers,
            'message' => 'Usage report generated successfully'
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
