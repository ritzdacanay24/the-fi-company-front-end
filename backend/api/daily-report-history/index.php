<?php
/**
 * Daily Report History API
 * 
 * Endpoint: GET /api/daily-report-history/
 * Purpose: Retrieve historical daily reports with filtering, searching, and pagination
 * 
 * Query Parameters:
 * - startDate: ISO date string (YYYY-MM-DD) - filter reports from this date
 * - endDate: ISO date string (YYYY-MM-DD) - filter reports until this date
 * - search: string - search within JSON data fields
 * - page: integer - pagination page number (default: 1)
 * - limit: integer - results per page (default: 10, max: 50)
 */

use EyefiDb\Databases\DatabaseQad;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Include database config
    
    $db_connect_qad = new DatabaseQad();
    $pdo = $db_connect_qad->getConnection();
    $pdo->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);
        
    // Get query parameters
    $startDate = isset($_GET['startDate']) ? trim($_GET['startDate']) : null;
    $endDate = isset($_GET['endDate']) ? trim($_GET['endDate']) : null;
    $searchTerm = isset($_GET['search']) ? trim($_GET['search']) : null;
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(50, max(1, intval($_GET['limit']))) : 10;
    $offset = ($page - 1) * $limit;
    
    // Build query
    $query = "SELECT id, createdDate, data 
              FROM dailyReport 
              WHERE 1=1";
    $params = [];
    
    // Date range filter
    if ($startDate) {
        $query .= " AND DATE(createdDate) >= ?";
        $params[] = $startDate;
    }
    
    if ($endDate) {
        $query .= " AND DATE(createdDate) <= ?";
        $params[] = $endDate;
    }
    
    // Search filter (search in JSON data fields)
    if ($searchTerm) {
        $query .= " AND (
            data LIKE ? OR 
            createdDate LIKE ?
        )";
        $searchLike = "%{$searchTerm}%";
        $params[] = $searchLike;
        $params[] = $searchLike;
    }
    
    // Order by date descending (newest first)
    $query .= " ORDER BY createdDate DESC";
    
    // Execute query to get all matching records (without pagination limit first)
    $countQueryParams = $params; // Copy params for count
    $allQuery = $query; // Get all matching records
    
    $stmtAll = $pdo->prepare($allQuery);
    $stmtAll->execute($countQueryParams);
    $allResults = $stmtAll->fetchAll(PDO::FETCH_ASSOC);
    $totalRecords = count($allResults);
    $totalPages = ceil($totalRecords / $limit);
    
    // Apply pagination on results
    $results = array_slice($allResults, $offset, $limit);
    
    // Parse JSON data and format response
    $reports = array_map(function($report) {
        return [
            'id' => intval($report['id'] ?? 0),
            'createdDate' => $report['createddate'] ?? $report['createdDate'] ?? null,
            'status' => 'Live Report',  // Default status since not in database
            'data' => json_decode($report['data'] ?? '{}', true) ?? []
        ];
    }, $results);
    
    // Return response with pagination metadata
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $reports,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($totalRecords),
            'totalPages' => intval($totalPages),
            'hasNext' => $page < $totalPages,
            'hasPrev' => $page > 1
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to retrieve daily reports',
        'message' => $e->getMessage()
    ]);
}
?>
