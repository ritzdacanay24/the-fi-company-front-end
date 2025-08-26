<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';
require_once 'email-service.php';

class InventoryAlerts {
    private $conn;
    private $emailService;
    
    // Configuration - adjust these values as needed
    private $lowInventoryThreshold = 10; // Alert when available count drops below this
    private $criticalInventoryThreshold = 5; // Critical alert threshold
    
    // Email recipients configuration
    private $alertRecipients = [
        'low_inventory' => [
            'manager@company.com',
            'inventory@company.com',
            'operations@company.com'
        ],
        'critical_inventory' => [
            'manager@company.com',
            'inventory@company.com',
            'operations@company.com',
            'ceo@company.com'
        ]
    ];

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
        $this->emailService = new EmailService();
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = $_GET['path'] ?? '';
        
        try {
            switch ($method) {
                case 'GET':
                    if ($path === 'check-inventory') {
                        $this->checkInventoryLevels();
                    } elseif ($path === 'send-test-alert') {
                        $this->sendTestAlert();
                    } elseif ($path === 'get-alert-settings') {
                        $this->getAlertSettings();
                    } else {
                        $this->getInventoryStatus();
                    }
                    break;
                    
                case 'POST':
                    if ($path === 'update-alert-settings') {
                        $this->updateAlertSettings();
                    } elseif ($path === 'trigger-manual-alert') {
                        $this->triggerManualAlert();
                    }
                    break;
                    
                default:
                    http_response_code(405);
                    echo json_encode(['error' => 'Method not allowed']);
                    break;
            }
        } catch (Exception $e) {
            error_log("Inventory Alerts Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
        }
    }

    /**
     * Check current inventory levels and send alerts if necessary
     */
    public function checkInventoryLevels() {
        try {
            $inventoryStats = $this->getDetailedInventoryStats();
            $alerts = [];
            
            foreach ($inventoryStats as $category => $stats) {
                $availableCount = $stats['available'];
                
                if ($availableCount <= $this->criticalInventoryThreshold) {
                    $alerts[] = [
                        'level' => 'critical',
                        'category' => $category,
                        'available' => $availableCount,
                        'threshold' => $this->criticalInventoryThreshold,
                        'message' => "CRITICAL: Only {$availableCount} serial numbers available in {$category} category"
                    ];
                } elseif ($availableCount <= $this->lowInventoryThreshold) {
                    $alerts[] = [
                        'level' => 'low',
                        'category' => $category,
                        'available' => $availableCount,
                        'threshold' => $this->lowInventoryThreshold,
                        'message' => "LOW INVENTORY: Only {$availableCount} serial numbers available in {$category} category"
                    ];
                }
            }
            
            // Send email alerts if any issues found
            if (!empty($alerts)) {
                $this->sendInventoryAlerts($alerts, $inventoryStats);
            }
            
            echo json_encode([
                'success' => true,
                'alerts' => $alerts,
                'inventory_stats' => $inventoryStats,
                'thresholds' => [
                    'low' => $this->lowInventoryThreshold,
                    'critical' => $this->criticalInventoryThreshold
                ]
            ]);
            
        } catch (Exception $e) {
            throw new Exception("Failed to check inventory levels: " . $e->getMessage());
        }
    }

    /**
     * Get detailed inventory statistics by category
     */
    private function getDetailedInventoryStats() {
        try {
            $query = "
                SELECT 
                    category,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'available' AND is_active = '1' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN status = 'used' AND is_active = '1' THEN 1 ELSE 0 END) as used,
                    SUM(CASE WHEN status = 'reserved' AND is_active = '1' THEN 1 ELSE 0 END) as reserved,
                    SUM(CASE WHEN is_active = '0' THEN 1 ELSE 0 END) as soft_deleted
                FROM igt_serial_numbers 
                GROUP BY category
                ORDER BY category ASC
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $stats = [];
            foreach ($results as $row) {
                $stats[$row['category']] = [
                    'total' => (int)$row['total'],
                    'available' => (int)$row['available'],
                    'used' => (int)$row['used'],
                    'reserved' => (int)$row['reserved'],
                    'soft_deleted' => (int)$row['soft_deleted']
                ];
            }
            
            return $stats;
            
        } catch (Exception $e) {
            throw new Exception("Failed to get inventory statistics: " . $e->getMessage());
        }
    }

    /**
     * Send inventory alert emails
     */
    private function sendInventoryAlerts($alerts, $inventoryStats) {
        try {
            $hasCritical = false;
            $hasLow = false;
            
            foreach ($alerts as $alert) {
                if ($alert['level'] === 'critical') {
                    $hasCritical = true;
                } elseif ($alert['level'] === 'low') {
                    $hasLow = true;
                }
            }
            
            // Determine alert level and recipients
            $alertLevel = $hasCritical ? 'critical' : 'low';
            $recipients = $hasCritical ? 
                $this->alertRecipients['critical_inventory'] : 
                $this->alertRecipients['low_inventory'];
            
            // Generate email content
            $subject = $hasCritical ? 
                "🔴 CRITICAL: Serial Number Inventory Alert" : 
                "⚠️ LOW INVENTORY: Serial Number Alert";
            
            $emailBody = $this->generateAlertEmailBody($alerts, $inventoryStats, $alertLevel);
            
            // Send emails
            $emailResults = [];
            foreach ($recipients as $email) {
                $result = $this->emailService->sendAlert($email, $subject, $emailBody);
                $emailResults[] = [
                    'email' => $email,
                    'sent' => $result['success'],
                    'error' => $result['error'] ?? null
                ];
            }
            
            // Log the alert
            $this->logAlert($alertLevel, $alerts, $emailResults);
            
            return $emailResults;
            
        } catch (Exception $e) {
            error_log("Failed to send inventory alerts: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Generate HTML email body for alerts
     */
    private function generateAlertEmailBody($alerts, $inventoryStats, $alertLevel) {
        $currentDate = date('F j, Y \a\t g:i A T');
        $dashboardUrl = "https://yourcompany.com/inventory/serial-numbers"; // Update with actual URL
        
        $priorityColor = $alertLevel === 'critical' ? '#dc3545' : '#fd7e14';
        $priorityIcon = $alertLevel === 'critical' ? '🔴' : '⚠️';
        $priorityText = $alertLevel === 'critical' ? 'CRITICAL ALERT' : 'LOW INVENTORY ALERT';
        
        ob_start();
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Inventory Alert</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
                .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: <?php echo $priorityColor; ?>; color: white; padding: 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 30px; }
                .alert-summary { background: #f8f9fa; border-left: 4px solid <?php echo $priorityColor; ?>; padding: 15px; margin: 20px 0; }
                .stats-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .stats-table th, .stats-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
                .stats-table th { background-color: #f8f9fa; font-weight: 600; }
                .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                .status-critical { background: #f8d7da; color: #721c24; }
                .status-low { background: #fff3cd; color: #856404; }
                .status-good { background: #d1edff; color: #0c5460; }
                .action-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6c757d; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1><?php echo $priorityIcon; ?> <?php echo $priorityText; ?></h1>
                    <p>Serial Number Inventory Management System</p>
                    <p><?php echo $currentDate; ?></p>
                </div>
                
                <div class="content">
                    <div class="alert-summary">
                        <h3>Alert Summary</h3>
                        <p>The following inventory levels require immediate attention:</p>
                        <ul>
                            <?php foreach ($alerts as $alert): ?>
                                <li>
                                    <strong><?php echo ucfirst($alert['category']); ?>:</strong> 
                                    Only <span style="color: <?php echo $priorityColor; ?>; font-weight: bold;"><?php echo $alert['available']; ?></span> 
                                    available (threshold: <?php echo $alert['threshold']; ?>)
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                    
                    <h3>Current Inventory Status</h3>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Available</th>
                                <th>Used</th>
                                <th>Reserved</th>
                                <th>Total Active</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($inventoryStats as $category => $stats): ?>
                                <?php
                                $status = 'good';
                                $statusText = 'Normal';
                                if ($stats['available'] <= $this->criticalInventoryThreshold) {
                                    $status = 'critical';
                                    $statusText = 'Critical';
                                } elseif ($stats['available'] <= $this->lowInventoryThreshold) {
                                    $status = 'low';
                                    $statusText = 'Low';
                                }
                                ?>
                                <tr>
                                    <td><strong><?php echo ucfirst($category); ?></strong></td>
                                    <td><?php echo $stats['available']; ?></td>
                                    <td><?php echo $stats['used']; ?></td>
                                    <td><?php echo $stats['reserved']; ?></td>
                                    <td><?php echo ($stats['available'] + $stats['used'] + $stats['reserved']); ?></td>
                                    <td><span class="status-badge status-<?php echo $status; ?>"><?php echo $statusText; ?></span></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                    
                    <h3>Recommended Actions</h3>
                    <ul>
                        <?php if ($alertLevel === 'critical'): ?>
                            <li><strong>Immediate Action Required:</strong> Order new serial number batches immediately</li>
                            <li><strong>Review Usage:</strong> Check if any serial numbers can be released from reserved status</li>
                            <li><strong>Emergency Protocol:</strong> Consider activating emergency inventory procedures</li>
                        <?php else: ?>
                            <li><strong>Plan Ahead:</strong> Consider ordering new serial number batches soon</li>
                            <li><strong>Monitor Usage:</strong> Keep close track of inventory consumption</li>
                            <li><strong>Review Process:</strong> Evaluate if inventory thresholds need adjustment</li>
                        <?php endif; ?>
                        <li><strong>Check Soft-Deleted:</strong> Review if any soft-deleted serial numbers can be reactivated</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="<?php echo $dashboardUrl; ?>" class="action-button">
                            View Inventory Dashboard
                        </a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is an automated alert from the Serial Number Inventory Management System.</p>
                    <p>If you have any questions, please contact the IT department.</p>
                    <p><small>Alert generated at <?php echo $currentDate; ?></small></p>
                </div>
            </div>
        </body>
        </html>
        <?php
        return ob_get_clean();
    }

    /**
     * Log alert to database for tracking
     */
    private function logAlert($alertLevel, $alerts, $emailResults) {
        try {
            $query = "
                INSERT INTO inventory_alert_log 
                (alert_level, alert_data, email_recipients, created_at) 
                VALUES (?, ?, ?, NOW())
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                $alertLevel,
                json_encode($alerts),
                json_encode($emailResults)
            ]);
            
        } catch (Exception $e) {
            // Don't throw exception for logging failures
            error_log("Failed to log alert: " . $e->getMessage());
        }
    }

    /**
     * Get current alert settings
     */
    public function getAlertSettings() {
        echo json_encode([
            'success' => true,
            'settings' => [
                'low_inventory_threshold' => $this->lowInventoryThreshold,
                'critical_inventory_threshold' => $this->criticalInventoryThreshold,
                'recipients' => $this->alertRecipients
            ]
        ]);
    }

    /**
     * Update alert settings
     */
    public function updateAlertSettings() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (isset($input['low_threshold'])) {
            $this->lowInventoryThreshold = (int)$input['low_threshold'];
        }
        
        if (isset($input['critical_threshold'])) {
            $this->criticalInventoryThreshold = (int)$input['critical_threshold'];
        }
        
        if (isset($input['recipients'])) {
            $this->alertRecipients = $input['recipients'];
        }
        
        // In a real implementation, you'd save these to a configuration file or database
        
        echo json_encode([
            'success' => true,
            'message' => 'Alert settings updated successfully'
        ]);
    }

    /**
     * Send a test alert
     */
    public function sendTestAlert() {
        try {
            $testAlert = [
                [
                    'level' => 'low',
                    'category' => 'gaming',
                    'available' => 8,
                    'threshold' => $this->lowInventoryThreshold,
                    'message' => "TEST ALERT: This is a test of the inventory alert system"
                ]
            ];
            
            $testStats = [
                'gaming' => ['total' => 50, 'available' => 8, 'used' => 30, 'reserved' => 5, 'soft_deleted' => 7],
                'peripheral' => ['total' => 25, 'available' => 15, 'used' => 8, 'reserved' => 2, 'soft_deleted' => 0]
            ];
            
            $emailResults = $this->sendInventoryAlerts($testAlert, $testStats);
            
            echo json_encode([
                'success' => true,
                'message' => 'Test alert sent successfully',
                'email_results' => $emailResults
            ]);
            
        } catch (Exception $e) {
            throw new Exception("Failed to send test alert: " . $e->getMessage());
        }
    }

    /**
     * Get overall inventory status
     */
    public function getInventoryStatus() {
        try {
            $stats = $this->getDetailedInventoryStats();
            $totalAvailable = array_sum(array_column($stats, 'available'));
            
            $status = 'good';
            if ($totalAvailable <= $this->criticalInventoryThreshold) {
                $status = 'critical';
            } elseif ($totalAvailable <= $this->lowInventoryThreshold) {
                $status = 'low';
            }
            
            echo json_encode([
                'success' => true,
                'status' => $status,
                'total_available' => $totalAvailable,
                'categories' => $stats,
                'thresholds' => [
                    'low' => $this->lowInventoryThreshold,
                    'critical' => $this->criticalInventoryThreshold
                ]
            ]);
            
        } catch (Exception $e) {
            throw new Exception("Failed to get inventory status: " . $e->getMessage());
        }
    }
}

// Handle the request
$api = new InventoryAlerts();
$api->handleRequest();
?>
