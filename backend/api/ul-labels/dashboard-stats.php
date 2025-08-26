<?php
/**
 * UL Management Dashboard Statistics API
 * Returns comprehensive statistics for the UL management dashboard
 * 
 * Endpoint: GET /backend/api/ul-labels/dashboard-stats.php
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
require_once '../../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get comprehensive dashboard statistics
        $stats_query = "SELECT 
            (SELECT COUNT(*) FROM ul_labels WHERE status = 'active') as active_labels,
            (SELECT COUNT(*) FROM ul_labels WHERE status = 'inactive') as inactive_labels,
            (SELECT COUNT(*) FROM ul_labels WHERE status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date < CURDATE())) as expired_labels,
            (SELECT COUNT(*) FROM ul_labels WHERE expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND expiry_date >= CURDATE()) as expiring_soon_labels,
            (SELECT COUNT(*) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as usage_last_30_days,
            (SELECT COUNT(*) FROM ul_label_usages WHERE date_used = CURDATE()) as usage_today,
            (SELECT COUNT(*) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as usage_last_7_days,
            (SELECT COUNT(DISTINCT customer_name) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as active_customers_30_days,
            (SELECT COALESCE(SUM(quantity_used), 0) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as total_quantity_used_30_days,
            (SELECT COALESCE(SUM(quantity_used), 0) FROM ul_label_usages WHERE date_used = CURDATE()) as total_quantity_used_today,
            (SELECT COUNT(*) FROM ul_labels) as total_labels,
            (SELECT COUNT(*) FROM ul_label_usages) as total_usage_records";
        
        $stmt = $db->prepare($stats_query);
        $stmt->execute();
        $stats = $stmt->get_result()->fetch_assoc();
        
        // Get recent activity (last 10 usage records)
        $recent_activity_query = "SELECT 
            ulu.ul_number,
            ul.description as ul_description,
            ulu.customer_name,
            ulu.user_name,
            ulu.quantity_used,
            ulu.date_used,
            ulu.created_at
        FROM ul_label_usages ulu
        INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id
        ORDER BY ulu.created_at DESC
        LIMIT 10";
        
        $activity_stmt = $db->prepare($recent_activity_query);
        $activity_stmt->execute();
        $activity_result = $activity_stmt->get_result();
        
        $recent_activity = [];
        while ($row = $activity_result->fetch_assoc()) {
            $recent_activity[] = $row;
        }
        
        // Get expiring labels (next 30 days)
        $expiring_labels_query = "SELECT 
            ul_number,
            description,
            category,
            expiry_date,
            DATEDIFF(expiry_date, CURDATE()) as days_until_expiry
        FROM ul_labels 
        WHERE expiry_date IS NOT NULL 
        AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
        AND expiry_date >= CURDATE()
        ORDER BY expiry_date ASC
        LIMIT 10";
        
        $expiring_stmt = $db->prepare($expiring_labels_query);
        $expiring_stmt->execute();
        $expiring_result = $expiring_stmt->get_result();
        
        $expiring_labels = [];
        while ($row = $expiring_result->fetch_assoc()) {
            $expiring_labels[] = $row;
        }
        
        // Get top customers by usage in last 30 days
        $top_customers_query = "SELECT 
            customer_name,
            COUNT(*) as usage_count,
            SUM(quantity_used) as total_quantity
        FROM ul_label_usages 
        WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY customer_name
        ORDER BY total_quantity DESC, usage_count DESC
        LIMIT 5";
        
        $customers_stmt = $db->prepare($top_customers_query);
        $customers_stmt->execute();
        $customers_result = $customers_stmt->get_result();
        
        $top_customers = [];
        while ($row = $customers_result->fetch_assoc()) {
            $top_customers[] = $row;
        }
        
        // Get most used UL numbers in last 30 days
        $top_ul_numbers_query = "SELECT 
            ulu.ul_number,
            ul.description,
            COUNT(*) as usage_count,
            SUM(ulu.quantity_used) as total_quantity
        FROM ul_label_usages ulu
        INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id
        WHERE ulu.date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY ulu.ul_number, ul.description
        ORDER BY total_quantity DESC, usage_count DESC
        LIMIT 5";
        
        $ul_numbers_stmt = $db->prepare($top_ul_numbers_query);
        $ul_numbers_stmt->execute();
        $ul_numbers_result = $ul_numbers_stmt->get_result();
        
        $top_ul_numbers = [];
        while ($row = $ul_numbers_result->fetch_assoc()) {
            $top_ul_numbers[] = $row;
        }
        
        // Get usage trend for last 7 days
        $usage_trend_query = "SELECT 
            DATE(date_used) as usage_date,
            COUNT(*) as usage_count,
            SUM(quantity_used) as total_quantity
        FROM ul_label_usages 
        WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(date_used)
        ORDER BY usage_date ASC";
        
        $trend_stmt = $db->prepare($usage_trend_query);
        $trend_stmt->execute();
        $trend_result = $trend_stmt->get_result();
        
        $usage_trend = [];
        while ($row = $trend_result->fetch_assoc()) {
            $usage_trend[] = $row;
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'stats' => $stats,
                'recent_activity' => $recent_activity,
                'expiring_labels' => $expiring_labels,
                'top_customers' => $top_customers,
                'top_ul_numbers' => $top_ul_numbers,
                'usage_trend' => $usage_trend
            ],
            'message' => 'Dashboard statistics retrieved successfully'
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
