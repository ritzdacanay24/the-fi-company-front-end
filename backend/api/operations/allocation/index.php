<?php
require_once __DIR__ . '/../../../../vendor/autoload.php';

use EyefiDb\Databases\DatabaseQad;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}


$dbConnect = new DatabaseQad();
$conn_qad = $dbConnect->getConnection();

try {
    // Support both URL path and query parameter methods
    $endpoint = null;
    
    // First try query parameter
    if (isset($_GET['endpoint'])) {
        $endpoint = $_GET['endpoint'];
    } else {
        // Fall back to URL path parsing
        $request_uri = $_SERVER['REQUEST_URI'];
        $path = parse_url($request_uri, PHP_URL_PATH);
        $path_parts = explode('/', trim($path, '/'));
        $endpoint = end($path_parts);
    }
    
    switch ($endpoint) {
        case 'parts-with-orders':
            getPartsWithOrders();
            break;
        case 'allocation-analysis':
            getAllocationAnalysis();
            break;
        case 'inventory-availability':
            getInventoryAvailability();
            break;
        case 'test-data':
            testDataForParts();
            break;
        case 'unmatched-sales-orders':
            getUnmatchedSalesOrders();
            break;
        case 'capacity-vs-demand':
            getCapacityVsDemandReport();
            break;
        case 'manual-allocations':
            handleManualAllocations();
            break;
        case 'reassign':
            reassignWorkOrder();
            break;
        case 'lock':
            lockAllocation();
            break;
        case 'unlock':
            unlockAllocation();
            break;
        case 'update-priority':
            updateSalesOrderPriority();
            break;
        case 'audit-trail':
            handleAuditTrail();
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * Get all parts that have either open work orders or sales orders
 */
function getPartsWithOrders() {
    global $conn_qad;
    
    try {
        $sql = "
             SELECT DISTINCT  wo_part
            FROM (
            
                SELECT wo_part
                FROM wo_mstr 
                WHERE wo_status IN ('R', 'O', 'P', 'F') 
                  AND (wo_qty_ord - wo_qty_comp) > 0
                  AND wo_domain = 'EYE'
                UNION
                
                SELECT sod_part 
                FROM sod_det 
                JOIN so_mstr ON sod_nbr = so_nbr and so_domain = 'EYE'
                WHERE (sod_qty_ord - sod_qty_ship) > 0
                  AND sod_domain = 'EYE'
            ) as parts_with_orders
            ORDER BY wo_part
        ";
        
        $stmt = $conn_qad->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Trim whitespace from each part number
        $result = array_map('trim', $result);
        
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch parts with orders: ' . $e->getMessage()]);
    }
}

/**
 * Get comprehensive allocation analysis for specified parts
 */
function getAllocationAnalysis() {
    global $conn_qad;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $partNumbers = $input['partNumbers'] ?? [];
    
    if (empty($partNumbers)) {
        http_response_code(400);
        echo json_encode(['error' => 'Part numbers required']);
        return;
    }
    
    try {
        $placeholders = implode(',', array_fill(0, count($partNumbers), '?'));
        
        // Get work order data
        $woSql = "
            SELECT 
                wo_nbr,
                wo_part,
                wo_due_date as WR_DUE,
                wo_qty_ord as WR_QTY_ORD,
                wo_qty_comp as WR_QTY_COMP,
                wo_status as WR_STATUS,
                (wo_qty_ord - wo_qty_comp) as available_qty
            FROM wo_mstr 
            WHERE wo_part IN ($placeholders)
              AND wo_status IN ('R', 'O', 'P', 'F')
              AND (wo_qty_ord - wo_qty_comp) > 0
              AND wo_domain = 'EYE'
            ORDER BY wo_part, wo_due_date
        ";
        
        $woStmt = $conn_qad->prepare($woSql);
        $woStmt->execute($partNumbers);
        $workOrders = $woStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get sales order data
        $soSql = "
            SELECT 
                sod_nbr,
                sod_part,
                sod_due_date as SOD_DUE_DATE,
                sod_qty_ord as TOTALORDERED,
                sod_qty_ship as TOTALSHIPPED,
                sod_qty_pick as TOTALPICKED,
                (sod_qty_ord - sod_qty_ship) as OPENBALANCE
            FROM sod_det 
            JOIN so_mstr ON sod_nbr = so_nbr and so_domain = 'EYE'
            WHERE sod_part IN ($placeholders)
              AND (sod_qty_ord - sod_qty_ship) > 0
              AND sod_domain = 'EYE'
            ORDER BY sod_part, sod_due_date
        ";
        
        $soStmt = $conn_qad->prepare($soSql);
        $soStmt->execute($partNumbers);
        $salesOrders = $soStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get inventory/stock data
        $inventorySql = "
            SELECT 
                CAST(a.ld_loc AS CHAR(25)) as ld_loc,
                a.ld_part,
                a.ld_qty_oh,
                a.ld_site,
                a.ld_status,
                a.ld_qty_all,
                (a.ld_qty_oh - a.ld_qty_all) as available_stock,
                CONCAT(pt_desc1, pt_desc2) as fullDesc,
                a.ld_lot
            FROM ld_det a
            LEFT JOIN ( 
                SELECT pt_part,
                    MAX(pt_desc1) as pt_desc1,
                    MAX(pt_desc2) as pt_desc2
                FROM pt_mstr
                WHERE pt_domain = 'EYE'
                GROUP BY pt_part
            ) b ON b.pt_part = a.ld_part
            WHERE a.ld_part IN ($placeholders)
              AND ld_domain = 'EYE'
              AND a.ld_qty_oh > 0
            ORDER BY a.ld_part, (a.ld_qty_oh - a.ld_qty_all) DESC
        ";
        
        $inventoryStmt = $conn_qad->prepare($inventorySql);
        $inventoryStmt->execute($partNumbers);
        $inventory = $inventoryStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Group by part number and calculate analysis
        $analysis = [];
        foreach ($partNumbers as $partNumber) {
            $partWOs = array_filter($workOrders, function($wo) use ($partNumber) { return $wo['wo_part'] === $partNumber; });
            $partSOs = array_filter($salesOrders, function($so) use ($partNumber) { return $so['sod_part'] === $partNumber; });
            $partInventory = array_filter($inventory, function($inv) use ($partNumber) { return $inv['ld_part'] === $partNumber; });
            
            $totalWoQuantity = array_sum(array_column($partWOs, 'available_qty'));
            $totalSoQuantity = array_sum(array_column($partSOs, 'OPENBALANCE'));
            $totalAvailableStock = array_sum(array_column($partInventory, 'available_stock'));
            
            // Calculate comprehensive allocation considering stock
            $totalSupply = $totalWoQuantity + $totalAvailableStock; // WO production + stock
            $allocationGap = $totalSupply - $totalSoQuantity;       // Total supply vs demand
            $stockCoverage = min($totalAvailableStock, $totalSoQuantity); // How much demand stock can cover
            $woNeeded = max(0, $totalSoQuantity - $totalAvailableStock);  // Remaining demand after stock
            
            // Calculate urgency analysis for intelligent recommendations
            $urgentOrders = array_filter($partSOs, function($so) {
                $daysUntilDue = ceil((strtotime($so['SOD_DUE_DATE']) - time()) / (60 * 60 * 24));
                return $daysUntilDue <= 30; // Orders due within 30 days
            });
            
            $futureOrders = array_filter($partSOs, function($so) {
                $daysUntilDue = ceil((strtotime($so['SOD_DUE_DATE']) - time()) / (60 * 60 * 24));
                return $daysUntilDue > 180; // Orders due beyond 6 months
            });
            
            $urgentDemand = array_sum(array_column($urgentOrders, 'OPENBALANCE'));
            $futureDemand = array_sum(array_column($futureOrders, 'OPENBALANCE'));
            
            // Generate intelligent decision recommendations
            $decision = generateSmartDecision(
                $totalAvailableStock, 
                $totalSoQuantity, 
                $urgentDemand, 
                $futureDemand, 
                $totalWoQuantity,
                $urgentOrders
            );
            
            $analysis[] = [
                'partNumber' => $partNumber,
                'totalWoQuantity' => $totalWoQuantity,
                'totalSoQuantity' => $totalSoQuantity,
                'totalAvailableStock' => $totalAvailableStock,
                'totalSupply' => $totalSupply,
                'allocationGap' => $allocationGap,
                'stockCoverage' => $stockCoverage,
                'woNeeded' => $woNeeded,
                'urgentDemand' => $urgentDemand,
                'futureDemand' => $futureDemand,
                'decision' => $decision,
                'workOrders' => array_values($partWOs),
                'salesOrders' => array_values($partSOs),
                'inventory' => array_values($partInventory),
                'allocationStatus' => $allocationGap < -5 ? 'SHORTAGE' : ($allocationGap > 5 ? 'EXCESS' : 'MATCHED'),
                'stockStatus' => $totalAvailableStock >= $totalSoQuantity ? 'SUFFICIENT_STOCK' : 'INSUFFICIENT_STOCK'
            ];
        }
        
        echo json_encode($analysis);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to get allocation analysis: ' . $e->getMessage()]);
    }
}

/**
 * Get sales orders without sufficient work order coverage
 */
function getUnmatchedSalesOrders() {
    global $conn_qad;
    
    try {
        $sql = "
            WITH part_allocation AS (
                SELECT 
                    wo_part,
                    COALESCE(SUM(wo_qty_ord - wo_qty_comp), 0) as wo_capacity,
                    COALESCE((
                        SELECT SUM(sod_qty_ord - sod_qty_ship) 
                        FROM sod_det 
                        JOIN so_mstr ON sod_so_nbr = so_nbr 
                        WHERE sod_det.sod_part = wo_mstr.wo_part 
                          AND so_status = 'O'
                          AND (sod_qty_ord - sod_qty_ship) > 0
                    ), 0) as so_demand
                FROM wo_mstr 
                WHERE wo_status IN ('R', 'O', 'P', 'F')
                  AND (wo_qty_ord - wo_qty_comp) > 0
                GROUP BY wo_part
            )
            SELECT 
                sod.sod_nbr,
                sod.sod_part,
                sod.sod_due_date as SOD_DUE_DATE,
                sod.sod_qty_ord as TOTALORDERED,
                sod.sod_qty_ship as TOTALSHIPPED,
                (sod.sod_qty_ord - sod.sod_qty_ship) as OPENBALANCE,
                pa.wo_capacity,
                pa.so_demand,
                (pa.wo_capacity - pa.so_demand) as allocation_gap
            FROM sod_det sod
            JOIN so_mstr so ON sod.sod_so_nbr = so.so_nbr
            LEFT JOIN part_allocation pa ON sod.sod_part = pa.wo_part
            WHERE so.so_status = 'O' 
              AND (sod.sod_qty_ord - sod.sod_qty_ship) > 0
              AND (pa.wo_capacity IS NULL OR pa.wo_capacity < pa.so_demand)
            ORDER BY sod.sod_due_date, sod.sod_part
        ";
        
        $stmt = $conn_qad->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to get unmatched sales orders: ' . $e->getMessage()]);
    }
}

/**
 * Get capacity vs demand report for all parts
 */
function getCapacityVsDemandReport() {
    global $conn_qad;
    
    try {
        $sql = "
            SELECT 
                COALESCE(wo_summary.wo_part, so_summary.sod_part) as part_number,
                COALESCE(wo_summary.total_capacity, 0) as total_capacity,
                COALESCE(so_summary.total_demand, 0) as total_demand,
                (COALESCE(wo_summary.total_capacity, 0) - COALESCE(so_summary.total_demand, 0)) as gap,
                CASE 
                    WHEN COALESCE(wo_summary.total_capacity, 0) = 0 THEN 0
                    ELSE (COALESCE(so_summary.total_demand, 0) * 100.0 / wo_summary.total_capacity)
                END as utilization_percent,
                CASE 
                    WHEN (COALESCE(wo_summary.total_capacity, 0) - COALESCE(so_summary.total_demand, 0)) < -5 THEN 'SHORTAGE'
                    WHEN (COALESCE(wo_summary.total_capacity, 0) - COALESCE(so_summary.total_demand, 0)) > 5 THEN 'EXCESS'
                    ELSE 'MATCHED'
                END as status
            FROM (
                SELECT 
                    wo_part,
                    SUM(wo_qty_ord - wo_qty_comp) as total_capacity
                FROM wo_mstr 
                WHERE wo_status IN ('R', 'O', 'P', 'F')
                  AND (wo_qty_ord - wo_qty_comp) > 0
                GROUP BY wo_part
            ) wo_summary
            FULL OUTER JOIN (
                SELECT 
                    sod_part,
                    SUM(sod_qty_ord - sod_qty_ship) as total_demand
                FROM sod_det 
                JOIN so_mstr ON sod_so_nbr = so_nbr
                WHERE so_status = 'O' 
                  AND (sod_qty_ord - sod_qty_ship) > 0
                GROUP BY sod_part
            ) so_summary ON wo_summary.wo_part = so_summary.sod_part
            WHERE COALESCE(wo_summary.total_capacity, 0) > 0 
               OR COALESCE(so_summary.total_demand, 0) > 0
            ORDER BY gap ASC, part_number
        ";
        
        $stmt = $conn_qad->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to get capacity vs demand report: ' . $e->getMessage()]);
    }
}

/**
 * Handle manual allocation CRUD operations
 */
function handleManualAllocations() {
    global $conn_qad;
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Get manual allocations for a part using query parameter
            $partNumber = $_GET['partNumber'] ?? '';
            
            if (empty($partNumber)) {
                http_response_code(400);
                echo json_encode(['error' => 'partNumber query parameter is required']);
                return;
            }
            
            try {
                $sql = "
                    SELECT * FROM manual_allocations 
                    WHERE part_number = ? AND is_active = 1
                    ORDER BY priority ASC, locked_date DESC
                ";
                
                $stmt = $conn_qad->prepare($sql);
                $stmt->execute([$partNumber]);
                $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode($result);
                
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to get manual allocations: ' . $e->getMessage()]);
            }
            break;
            
        case 'POST':
            // Create new manual allocation
            $input = json_decode(file_get_contents('php://input'), true);
            
            try {
                $sql = "
                    INSERT INTO manual_allocations 
                    (wo_number, so_number, part_number, allocated_quantity, allocation_type, priority, locked_by, locked_date, reason, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                
                $stmt = $conn_qad->prepare($sql);
                $stmt->execute([
                    $input['woNumber'],
                    $input['soNumber'],
                    $input['partNumber'],
                    $input['allocatedQuantity'],
                    $input['allocationType'],
                    $input['priority'],
                    $input['lockedBy'],
                    $input['lockedDate'],
                    $input['reason'],
                    1
                ]);
                
                $newId = $conn_qad->lastInsertId();
                $input['id'] = $newId;
                
                echo json_encode($input);
                
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create manual allocation: ' . $e->getMessage()]);
            }
            break;
    }
}

/**
 * Reassign work order from one sales order to another
 */
function reassignWorkOrder() {
    global $conn_qad;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        $conn_qad->beginTransaction();
        
        // Deactivate old allocation
        $sql1 = "
            UPDATE manual_allocations 
            SET is_active = 0 
            WHERE wo_number = ? AND so_number = ? AND part_number = ?
        ";
        $stmt1 = $conn_qad->prepare($sql1);
        $stmt1->execute([$input['woNumber'], $input['fromSoNumber'], $input['partNumber']]);
        
        // Create new allocation
        $sql2 = "
            INSERT INTO manual_allocations 
            (wo_number, so_number, part_number, allocated_quantity, allocation_type, priority, locked_by, locked_date, reason, is_active)
            VALUES (?, ?, ?, ?, 'MANUAL', ?, ?, NOW(), ?, 1)
        ";
        $stmt2 = $conn_qad->prepare($sql2);
        $stmt2->execute([
            $input['woNumber'],
            $input['toSoNumber'],
            $input['partNumber'],
            $input['quantity'],
            $input['priority'],
            $input['userId'],
            $input['reason']
        ]);
        
        $conn_qad->commit();
        echo json_encode(['success' => true]);
        
    } catch (Exception $e) {
        $conn_qad->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Failed to reassign work order: ' . $e->getMessage()]);
    }
}

/**
 * Lock allocation to prevent automatic reallocation
 */
function lockAllocation() {
    global $conn_qad;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        $sql = "
            INSERT INTO allocation_locks (wo_number, so_number, locked_by, locked_date, reason)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                locked_by = VALUES(locked_by),
                locked_date = VALUES(locked_date),
                reason = VALUES(reason)
        ";
        
        $stmt = $conn_qad->prepare($sql);
        $stmt->execute([
            $input['woNumber'],
            $input['soNumber'],
            $input['userId'],
            $input['lockDate'],
            $input['reason']
        ]);
        
        echo json_encode(['success' => true]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to lock allocation: ' . $e->getMessage()]);
    }
}

/**
 * Unlock allocation to allow automatic reallocation
 */
function unlockAllocation() {
    global $conn_qad;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        $sql = "DELETE FROM allocation_locks WHERE wo_number = ? AND so_number = ?";
        
        $stmt = $conn_qad->prepare($sql);
        $stmt->execute([$input['woNumber'], $input['soNumber']]);
        
        echo json_encode(['success' => true]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to unlock allocation: ' . $e->getMessage()]);
    }
}

/**
 * Update sales order priority
 */
function updateSalesOrderPriority() {
    global $conn_qad;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        $sql = "
            INSERT INTO so_priorities (so_number, priority, updated_by, updated_date, reason)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                priority = VALUES(priority),
                updated_by = VALUES(updated_by),
                updated_date = VALUES(updated_date),
                reason = VALUES(reason)
        ";
        
        $stmt = $conn_qad->prepare($sql);
        $stmt->execute([
            $input['soNumber'],
            $input['priority'],
            $input['userId'],
            $input['timestamp'],
            $input['reason']
        ]);
        
        echo json_encode(['success' => true]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update priority: ' . $e->getMessage()]);
    }
}

/**
 * Handle allocation audit trail operations
 */
function handleAuditTrail() {
    global $conn_qad;
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Get audit trail with optional filters
            $partNumber = $_GET['partNumber'] ?? null;
            $woNumber = $_GET['woNumber'] ?? null;
            $soNumber = $_GET['soNumber'] ?? null;
            
            try {
                $sql = "
                    SELECT * FROM allocation_audit_trail 
                    WHERE 1=1
                ";
                $params = [];
                
                if ($partNumber) {
                    $sql .= " AND part_number = ?";
                    $params[] = $partNumber;
                }
                if ($woNumber) {
                    $sql .= " AND wo_number = ?";
                    $params[] = $woNumber;
                }
                if ($soNumber) {
                    $sql .= " AND so_number = ?";
                    $params[] = $soNumber;
                }
                
                $sql .= " ORDER BY timestamp DESC LIMIT 100";
                
                $stmt = $conn_qad->prepare($sql);
                $stmt->execute($params);
                $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode($result);
                
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to get audit trail: ' . $e->getMessage()]);
            }
            break;
            
        case 'POST':
            // Add audit trail entry
            $input = json_decode(file_get_contents('php://input'), true);
            
            try {
                $sql = "
                    INSERT INTO allocation_audit_trail 
                    (wo_number, so_number, part_number, action, previous_allocation, new_allocation, quantity, user_id, timestamp, reason)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                
                $stmt = $conn_qad->prepare($sql);
                $stmt->execute([
                    $input['woNumber'],
                    $input['soNumber'],
                    $input['partNumber'],
                    $input['action'],
                    $input['previousAllocation'] ?? null,
                    $input['newAllocation'],
                    $input['quantity'],
                    $input['userId'],
                    $input['timestamp'],
                    $input['reason']
                ]);
                
                $newId = $conn_qad->lastInsertId();
                $input['id'] = $newId;
                
                echo json_encode($input);
                
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to log audit entry: ' . $e->getMessage()]);
            }
            break;
    }
}

/**
 * Test function to see what data exists for specific parts
 */
function testDataForParts() {
    global $conn_qad;
    
    // Test with the parts you mentioned
    $testParts = ['12345-ABC', '67890-DEF', '11111-GHI'];
    
    try {
        $result = [];
        
        foreach ($testParts as $part) {
            $partData = ['partNumber' => trim($part)];
            
            // Check work orders
            $woSql = "SELECT COUNT(*) as wo_count FROM wo_mstr WHERE TRIM(wo_part) = ?";
            $woStmt = $conn_qad->prepare($woSql);
            $woStmt->execute([trim($part)]);
            $partData['wo_total_count'] = $woStmt->fetch(PDO::FETCH_ASSOC)['wo_count'];
            
            // Check open work orders
            $woOpenSql = "
                SELECT COUNT(*) as wo_open_count 
                FROM wo_mstr 
                WHERE TRIM(wo_part) = ? 
                  AND wo_status IN ('R', 'O', 'P', 'F')
                  AND (wo_qty_ord - wo_qty_comp) > 0
            ";
            $woOpenStmt = $conn_qad->prepare($woOpenSql);
            $woOpenStmt->execute([trim($part)]);
            $partData['wo_open_count'] = $woOpenStmt->fetch(PDO::FETCH_ASSOC)['wo_open_count'];
            
            // Check sales orders
            $soSql = "SELECT COUNT(*) as so_count FROM sod_det WHERE TRIM(sod_part) = ?";
            $soStmt = $conn_qad->prepare($soSql);
            $soStmt->execute([trim($part)]);
            $partData['so_total_count'] = $soStmt->fetch(PDO::FETCH_ASSOC)['so_count'];
            
            // Check open sales orders
            $soOpenSql = "
                SELECT COUNT(*) as so_open_count 
                FROM sod_det 
                JOIN so_mstr ON sod_so_nbr = so_nbr
                WHERE TRIM(sod_part) = ? 
                  AND so_status = 'O' 
                  AND (sod_qty_ord - sod_qty_ship) > 0
            ";
            $soOpenStmt = $conn_qad->prepare($soOpenSql);
            $soOpenStmt->execute([trim($part)]);
            $partData['so_open_count'] = $soOpenStmt->fetch(PDO::FETCH_ASSOC)['so_open_count'];
            
            $result[] = $partData;
        }
        
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Test failed: ' . $e->getMessage()]);
    }
}

/**
 * Get inventory availability for specified parts
 */
function getInventoryAvailability() {
    global $conn_qad;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $partNumbers = $input['partNumbers'] ?? [];
    
    if (empty($partNumbers)) {
        http_response_code(400);
        echo json_encode(['error' => 'Part numbers required']);
        return;
    }
    
    try {
        $placeholders = implode(',', array_fill(0, count($partNumbers), '?'));
        
        $sql = "
            SELECT 
                CAST(a.ld_loc AS CHAR(25)) as ld_loc,
                a.ld_part,
                a.ld_qty_oh,
                a.ld_site,
                a.ld_status,
                a.ld_qty_all,
                (a.ld_qty_oh - a.ld_qty_all) as available_stock,
                CONCAT(ISNULL(pt_desc1, ''), ISNULL(pt_desc2, '')) as fullDesc,
                a.ld_lot,
                CASE 
                    WHEN (a.ld_qty_oh - a.ld_qty_all) > 0 THEN 'AVAILABLE'
                    WHEN a.ld_qty_oh > 0 THEN 'ALLOCATED'
                    ELSE 'OUT_OF_STOCK'
                END as stock_status
            FROM ld_det a
            LEFT JOIN ( 
                SELECT pt_part,
                    MAX(pt_desc1) as pt_desc1,
                    MAX(pt_desc2) as pt_desc2
                FROM pt_mstr
                WHERE pt_domain = 'EYE'
                GROUP BY pt_part
            ) b ON b.pt_part = a.ld_part
            WHERE a.ld_part IN ($placeholders)
              AND ld_domain = 'EYE'
              AND a.ld_qty_oh > 0
            ORDER BY a.ld_part, (a.ld_qty_oh - a.ld_qty_all) DESC
        ";
        
        $stmt = $conn_qad->prepare($sql);
        $stmt->execute($partNumbers);
        $inventory = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Group by part and calculate summary
        $summary = [];
        foreach ($partNumbers as $partNumber) {
            $partInventory = array_filter($inventory, function($inv) use ($partNumber) { 
                return $inv['ld_part'] === $partNumber; 
            });
            
            $totalOnHand = array_sum(array_column($partInventory, 'ld_qty_oh'));
            $totalAllocated = array_sum(array_column($partInventory, 'ld_qty_all'));
            $totalAvailable = array_sum(array_column($partInventory, 'available_stock'));
            
            $summary[] = [
                'partNumber' => $partNumber,
                'totalOnHand' => $totalOnHand,
                'totalAllocated' => $totalAllocated,
                'totalAvailable' => $totalAvailable,
                'stockStatus' => $totalAvailable > 0 ? 'IN_STOCK' : ($totalOnHand > 0 ? 'ALLOCATED' : 'OUT_OF_STOCK'),
                'locations' => array_values($partInventory)
            ];
        }
        
        echo json_encode([
            'summary' => $summary,
            'details' => $inventory
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to get inventory: ' . $e->getMessage()]);
    }
}

/**
 * Generate smart allocation decision recommendations
 * This is the core intelligence that answers: "Do I have enough? What WO should I create now vs later?"
 */
function generateSmartDecision($availableStock, $totalDemand, $urgentDemand, $futureDemand, $currentWoCapacity, $urgentOrders) {
    $today = new DateTime();
    
    // Calculate key metrics
    $stockCoverage = min($availableStock, $totalDemand);
    $stockShortfall = max(0, $totalDemand - $availableStock);
    $urgentShortfall = max(0, $urgentDemand - $availableStock);
    
    // Determine overall situation
    $situation = '';
    $priority = 'NORMAL';
    $actions = [];
    $reasoning = '';
    
    // SCENARIO 1: Stock covers all demand
    if ($availableStock >= $totalDemand) {
        $situation = 'STOCK_SUFFICIENT';
        $priority = 'LOW';
        $actions[] = [
            'action' => 'USE_STOCK',
            'quantity' => $totalDemand,
            'urgency' => 'LOW',
            'timing' => 'IMMEDIATE'
        ];
        $reasoning = "Stock covers all demand ({$availableStock} >= {$totalDemand}). No immediate work orders needed.";
        
        // But check if existing WOs are overkill
        if ($currentWoCapacity > 0) {
            $actions[] = [
                'action' => 'REVIEW_EXISTING_WO',
                'quantity' => $currentWoCapacity,
                'urgency' => 'LOW', 
                'timing' => 'REVIEW',
                'note' => 'Consider delaying or reducing existing work orders'
            ];
        }
    }
    
    // SCENARIO 2: Stock covers urgent, but not total demand
    elseif ($availableStock >= $urgentDemand && $urgentDemand > 0) {
        $situation = 'URGENT_COVERED';
        $priority = 'NORMAL';
        
        $actions[] = [
            'action' => 'USE_STOCK_URGENT',
            'quantity' => $urgentDemand,
            'urgency' => 'HIGH',
            'timing' => 'IMMEDIATE'
        ];
        
        $remainingNeed = $totalDemand - $availableStock;
        if ($remainingNeed > 0) {
            $actions[] = [
                'action' => 'CREATE_WO_FUTURE',
                'quantity' => $remainingNeed,
                'urgency' => 'NORMAL',
                'timing' => 'PLANNED'
            ];
        }
        
        $reasoning = "Stock covers urgent orders ({$availableStock} >= {$urgentDemand}). Plan work order for remaining {$remainingNeed} units for future orders.";
    }
    
    // SCENARIO 3: Stock insufficient for urgent orders
    elseif ($urgentDemand > 0 && $availableStock < $urgentDemand) {
        $situation = 'URGENT_SHORTAGE';
        $priority = 'CRITICAL';
        
        if ($availableStock > 0) {
            $actions[] = [
                'action' => 'USE_ALL_STOCK',
                'quantity' => $availableStock,
                'urgency' => 'CRITICAL',
                'timing' => 'IMMEDIATE'
            ];
        }
        
        $urgentWoNeeded = $urgentDemand - $availableStock;
        $actions[] = [
            'action' => 'CREATE_WO_URGENT',
            'quantity' => $urgentWoNeeded,
            'urgency' => 'CRITICAL',
            'timing' => 'EXPEDITE',
            'due_date' => getEarliestUrgentDueDate($urgentOrders)
        ];
        
        // Handle remaining future demand
        $futureWoNeeded = $totalDemand - $urgentDemand;
        if ($futureWoNeeded > 0) {
            $actions[] = [
                'action' => 'CREATE_WO_FUTURE',
                'quantity' => $futureWoNeeded,
                'urgency' => 'NORMAL',
                'timing' => 'PLANNED'
            ];
        }
        
        $reasoning = "CRITICAL: Stock insufficient for urgent orders! Need emergency work order for {$urgentWoNeeded} units immediately.";
    }
    
    // SCENARIO 4: Only future orders, no urgent ones
    elseif ($urgentDemand == 0 && $totalDemand > 0) {
        $situation = 'FUTURE_ONLY';
        $priority = 'LOW';
        
        if ($availableStock > 0) {
            $actions[] = [
                'action' => 'RESERVE_STOCK',
                'quantity' => min($availableStock, $totalDemand),
                'urgency' => 'LOW',
                'timing' => 'WHEN_NEEDED'
            ];
        }
        
        $futureWoNeeded = max(0, $totalDemand - $availableStock);
        if ($futureWoNeeded > 0) {
            $actions[] = [
                'action' => 'PLAN_WO_FUTURE',
                'quantity' => $futureWoNeeded,
                'urgency' => 'LOW',
                'timing' => 'SCHEDULE_LATER'
            ];
        }
        
        $reasoning = "Only future orders in pipeline. Use available stock and schedule work orders closer to due dates to optimize cash flow.";
    }
    
    // SCENARIO 5: No demand at all
    else {
        $situation = 'NO_DEMAND';
        $priority = 'LOW';
        
        if ($currentWoCapacity > 0) {
            $actions[] = [
                'action' => 'CANCEL_WO',
                'quantity' => $currentWoCapacity,
                'urgency' => 'LOW',
                'timing' => 'REVIEW',
                'note' => 'No sales orders to fulfill - consider canceling work orders'
            ];
        }
        
        $reasoning = "No open sales orders. Review and potentially cancel unnecessary work orders.";
    }
    
    // Calculate capacity analysis
    $capacityAnalysis = analyzeCapacityNeeds($availableStock, $currentWoCapacity, $urgentDemand, $totalDemand);
    
    return [
        'situation' => $situation,
        'priority' => $priority,
        'reasoning' => $reasoning,
        'actions' => $actions,
        'metrics' => [
            'stockCoverage' => $stockCoverage,
            'stockShortfall' => $stockShortfall,
            'urgentShortfall' => $urgentShortfall,
            'totalGap' => $totalDemand - ($availableStock + $currentWoCapacity)
        ],
        'capacity' => $capacityAnalysis,
        'summary' => generateDecisionSummary($situation, $priority, $availableStock, $totalDemand, $urgentDemand)
    ];
}

/**
 * Get the earliest due date from urgent orders
 */
function getEarliestUrgentDueDate($urgentOrders) {
    if (empty($urgentOrders)) {
        return date('Y-m-d', strtotime('+30 days'));
    }
    
    $earliestDate = null;
    foreach ($urgentOrders as $order) {
        $dueDate = strtotime($order['SOD_DUE_DATE']);
        if ($earliestDate === null || $dueDate < $earliestDate) {
            $earliestDate = $dueDate;
        }
    }
    
    return date('Y-m-d', $earliestDate);
}

/**
 * Analyze capacity needs and recommendations
 */
function analyzeCapacityNeeds($stock, $woCapacity, $urgentDemand, $totalDemand) {
    $totalSupply = $stock + $woCapacity;
    
    return [
        'currentSupply' => $totalSupply,
        'totalDemand' => $totalDemand,
        'gap' => $totalDemand - $totalSupply,
        'utilization' => $totalDemand > 0 ? round(($totalSupply / $totalDemand) * 100, 1) : 0,
        'recommendation' => $totalSupply >= $totalDemand ? 'SUFFICIENT' : 'INCREASE_CAPACITY'
    ];
}

/**
 * Generate a concise decision summary
 */
function generateDecisionSummary($situation, $priority, $stock, $totalDemand, $urgentDemand) {
    switch ($situation) {
        case 'STOCK_SUFFICIENT':
            return "✅ COVERED: Stock sufficient for all orders";
        
        case 'URGENT_COVERED':
            return "🟡 PARTIAL: Stock covers urgent, plan WO for future";
        
        case 'URGENT_SHORTAGE':
            return "🚨 CRITICAL: Urgent WO needed immediately!";
        
        case 'FUTURE_ONLY':
            return "📅 PLANNED: Schedule WO closer to due dates";
        
        case 'NO_DEMAND':
            return "⚪ IDLE: No demand - review existing WOs";
        
        default:
            return "❓ REVIEW: Manual analysis required";
    }
}

?>