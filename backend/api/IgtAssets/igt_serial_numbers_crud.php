<?php

namespace EyefiDb\Api\IgtAssets;

use PDO;
use PDOException;
 require_once __DIR__ . '/../../Databases/DatabaseEyefi.php';
    
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\IgtAssets\IgtAssets;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
    
class IgtAssetsController
{
    protected $db;
    protected $igtAssets;
    protected $igtSerialNumbers;

    public function __construct($db)
    {
        $this->db = $db;
        $this->igtAssets = new IgtAssets($db);
        $this->igtSerialNumbers = new IgtSerialNumbers($db);
    }

    /**
     * Handle HTTP requests for IGT Assets and Serial Numbers
     */
    public function handleRequest()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = $_GET['path'] ?? '';
        
        try {
            switch ($path) {
                case 'assets':
                    return $this->handleAssetsRequest($method);
                case 'serial-numbers':
                    return $this->handleSerialNumbersRequest($method);
                case 'assets/stats':
                    return $this->getAssetStats();
                case 'serial-numbers/stats':
                    return $this->getSerialNumberStats();
                case 'serial-numbers/available':
                    return $this->getAvailableSerialNumbers();
                case 'serial-numbers/reserve':
                    return $this->reserveSerialNumber();
                case 'serial-numbers/release':
                    return $this->releaseSerialNumber();
                case 'serial-numbers/bulk-import':
                    return $this->bulkImportSerialNumbers();
                case 'serial-numbers/low-stock-notification':
                    return $this->sendLowSerialNumberNotification();
                default:
                    http_response_code(404);
                    return ['error' => 'Endpoint not found'];
            }
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Handle IGT Assets requests
     */
    private function handleAssetsRequest($method)
    {
        switch ($method) {
            case 'GET':
                if (isset($_GET['id'])) {
                    return $this->igtAssets->getById($_GET['id']);
                } elseif (isset($_GET['asset_number'])) {
                    return $this->igtAssets->getByAssetNumber($_GET['asset_number']);
                } elseif (isset($_GET['wo_number'])) {
                    return $this->igtAssets->getByWorkOrder($_GET['wo_number']);
                } else {
                    $filters = [
                        'serial_number' => $_GET['serial_number'] ?? null,
                        'generated_IGT_asset' => $_GET['generated_IGT_asset'] ?? null,
                        'wo_number' => $_GET['wo_number'] ?? null,
                        'property_site' => $_GET['property_site'] ?? null,
                        'inspector_name' => $_GET['inspector_name'] ?? null,
                        'date_from' => $_GET['date_from'] ?? null,
                        'date_to' => $_GET['date_to'] ?? null,
                    ];
                    $page = (int)($_GET['page'] ?? 1);
                    $limit = (int)($_GET['limit'] ?? 100);
                    $includeInactive = (int)($_GET['includeInactive'] ?? false);
                    return $this->igtAssets->getAll($filters, $page, $limit, $includeInactive);
                }

            case 'POST':
                $data = json_decode(file_get_contents('php://input'), true);
                
                // Validate that serial number is provided and available
                if (!isset($data['serial_number']) || empty($data['serial_number'])) {
                    http_response_code(400);
                    return ['error' => 'Serial number is required'];
                }
                
                // Check if serial number exists and is available
                $serialNumber = $this->igtSerialNumbers->getBySerialNumber($data['serial_number']);
                if (!$serialNumber) {
                    http_response_code(400);
                    return ['error' => 'Serial number not found in inventory'];
                }
                
                if ($serialNumber['status'] !== 'available') {
                    http_response_code(400);
                    return ['error' => 'Serial number is not available (current status: ' . $serialNumber['status'] . ')'];
                }
                
                // Create the IGT asset
                $assetId = $this->igtAssets->create($data);
                
                // Mark the serial number as used
                $this->igtSerialNumbers->update($serialNumber['id'], ['status' => 'used']);
                
                return ['id' => $assetId, 'message' => 'IGT Asset created successfully and serial number marked as used'];

            case 'PUT':
                if (!isset($_GET['id'])) {
                    http_response_code(400);
                    return ['error' => 'Asset ID is required for update'];
                }
                $data = json_decode(file_get_contents('php://input'), true);
                $success = $this->igtAssets->update($_GET['id'], $data);
                return ['success' => $success, 'message' => 'IGT Asset updated successfully'];

            case 'DELETE':
                if (!isset($_GET['id'])) {
                    http_response_code(400);
                    return ['error' => 'Asset ID is required for deletion'];
                }
                
                // Get the asset to retrieve its serial number before deletion
                $asset = $this->igtAssets->getById($_GET['id']);
                if (!$asset) {
                    http_response_code(404);
                    return ['error' => 'IGT Asset not found'];
                }
                
                $deletedBy = $_GET['deleted_by'] ?? 'system';
                $success = $this->igtAssets->delete($_GET['id'], $deletedBy);
                
                // If deletion successful, mark serial number as available again
                if ($success && !empty($asset['serial_number'])) {
                    $serialNumber = $this->igtSerialNumbers->getBySerialNumber($asset['serial_number']);
                    if ($serialNumber) {
                        $this->igtSerialNumbers->update($serialNumber['id'], ['status' => 'available']);
                    }
                }
                
                return ['success' => $success, 'message' => 'IGT Asset deleted successfully and serial number released'];

            default:
                http_response_code(405);
                return ['error' => 'Method not allowed'];
        }
    }

    /**
     * Handle Serial Numbers requests
     */
    private function handleSerialNumbersRequest($method)
    {
        switch ($method) {
            case 'GET':
                if (isset($_GET['id'])) {
                    return $this->igtSerialNumbers->getById($_GET['id']);
                } elseif (isset($_GET['serial_number'])) {
                    return $this->igtSerialNumbers->getBySerialNumber($_GET['serial_number']);
                } else {
                    $filters = [
                        'status' => $_GET['status'] ?? null,
                        'category' => $_GET['category'] ?? null,
                        'manufacturer' => $_GET['manufacturer'] ?? null,
                        'serial_number' => $_GET['serial_number'] ?? null,
                    ];
                    $page = (int)($_GET['page'] ?? 1);
                    $limit = (int)($_GET['limit'] ?? 100);
                    $includeInactive = (int)($_GET['includeInactive'] ?? false);
                    
                    return $this->igtSerialNumbers->getAll($filters, $page, $limit, $includeInactive);
                }

            case 'POST':
                $data = json_decode(file_get_contents('php://input'), true);
                
                // Check if data is an array of serial numbers
                if (isset($data[0]) && is_array($data[0])) {
                    // Handle bulk creation
                    $results = [];
                    $successCount = 0;
                    $errorCount = 0;
                    $skippedCount = 0;
                    
                    foreach ($data as $serialData) {
                        try {
                            // Check for duplicate using existing method
                            $duplicateStrategy = $serialData['duplicateStrategy'] ?? 'skip';
                            $existingSerial = $this->igtSerialNumbers->getBySerialNumber($serialData['serial_number']);
                            
                            // Additional check for category if existing serial found
                            if ($existingSerial && isset($existingSerial['category']) && 
                                $existingSerial['category'] === ($serialData['category'] ?? 'gaming')) {
                                
                                if ($duplicateStrategy === 'skip') {
                                    $results[] = [
                                        'serial_number' => $serialData['serial_number'],
                                        'status' => 'skipped',
                                        'message' => 'Serial number already exists'
                                    ];
                                    $skippedCount++;
                                    continue;
                                } elseif ($duplicateStrategy === 'update') {
                                    $success = $this->igtSerialNumbers->update($existingSerial['id'], $serialData);
                                    $results[] = [
                                        'id' => $existingSerial['id'],
                                        'serial_number' => $serialData['serial_number'],
                                        'status' => 'updated'
                                    ];
                                    $successCount++;
                                    continue;
                                } elseif ($duplicateStrategy === 'error') {
                                    throw new \Exception('Serial number already exists');
                                }
                            }
                            
                            $serialId = $this->igtSerialNumbers->create($serialData);
                            $results[] = [
                                'id' => $serialId, 
                                'serial_number' => $serialData['serial_number'] ?? null,
                                'status' => 'success'
                            ];
                            $successCount++;
                        } catch (\Exception $e) {
                            $results[] = [
                                'serial_number' => $serialData['serial_number'] ?? null,
                                'status' => 'error',
                                'message' => $e->getMessage()
                            ];
                            $errorCount++;
                        }
                    }
                    
                    return [
                        'success' => $successCount,
                        'errors' => $errorCount,
                        'skipped' => $skippedCount,
                        'total' => count($data),
                        'results' => $results,
                        'message' => "Processed {$successCount} successfully, {$errorCount} errors, {$skippedCount} skipped"
                    ];
                } else {
                    // Handle single serial number creation
                    $duplicateStrategy = $data['duplicateStrategy'] ?? 'skip';
                    $existingSerial = $this->igtSerialNumbers->getBySerialNumber($data['serial_number']);
                    
                    // Additional check for category if existing serial found
                    if ($existingSerial && isset($existingSerial['category']) && 
                        $existingSerial['category'] === ($data['category'] ?? 'gaming')) {
                        
                        if ($duplicateStrategy === 'skip') {
                            return ['message' => 'Serial number already exists, skipped'];
                        } elseif ($duplicateStrategy === 'update') {
                            $success = $this->igtSerialNumbers->update($existingSerial['id'], $data);
                            return ['id' => $existingSerial['id'], 'message' => 'Serial number updated successfully'];
                        } elseif ($duplicateStrategy === 'error') {
                            http_response_code(409);
                            return ['error' => 'Serial number already exists'];
                        }
                    }
                    
                    $serialId = $this->igtSerialNumbers->create($data);
                    return ['id' => $serialId, 'message' => 'Serial number created successfully'];
                }

            case 'PUT':
                if (!isset($_GET['id'])) {
                    http_response_code(400);
                    return ['error' => 'Serial number ID is required for update'];
                }
                $data = json_decode(file_get_contents('php://input'), true);
                $success = $this->igtSerialNumbers->update($_GET['id'], $data);
                return ['success' => $success, 'message' => 'Serial number updated successfully'];

            case 'DELETE':
                if (!isset($_GET['id'])) {
                    http_response_code(400);
                    return ['error' => 'Serial number ID is required for deletion'];
                }
                
                // Check if serial number is being used in assets
                $serialNumber = $this->igtSerialNumbers->getById($_GET['id']);
                if (!$serialNumber) {
                    http_response_code(404);
                    return ['error' => 'Serial number not found'];
                }
                
                // Check if serial number is used in any assets
                $assetsUsingSerial = $this->igtAssets->getAll(['serial_number' => $serialNumber['serial_number']], 1, 1, false);
                if (!empty($assetsUsingSerial['data']) && count($assetsUsingSerial['data']) > 0) {
                    http_response_code(409);
                    return ['error' => 'Cannot delete serial number: it is being used in assets'];
                }
                
                $deletedBy = $_GET['deleted_by'] ?? 'system';
                $success = $this->igtSerialNumbers->delete($_GET['id'], $deletedBy);
                return ['success' => $success, 'message' => 'Serial number deleted successfully'];

            default:
                http_response_code(405);
                return ['error' => 'Method not allowed'];
        }
    }

    /**
     * Get available serial numbers by category
     */
    private function getAvailableSerialNumbers()
    {
        $category = $_GET['category'] ?? 'gaming';
        $limit = (int)($_GET['limit'] ?? 50);
        
        // Clean up expired reservations (older than 15 minutes)
        $this->cleanupExpiredReservations();
        
        return $this->igtSerialNumbers->getAvailableByCategory($category, $limit);
    }

    /**
     * Clean up expired reservations
     */
    private function cleanupExpiredReservations()
    {
        try {
            // Release reservations older than 15 minutes
            $stmt = $this->db->prepare("
                UPDATE igt_serial_numbers 
                SET status = 'available', reserved_at = NULL, reserved_by = NULL 
                WHERE status = 'reserved' AND reserved_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
            ");
            $stmt->execute();
        } catch (\Exception $e) {
            error_log('Error cleaning up expired reservations: ' . $e->getMessage());
        }
    }

    /**
     * Reserve a serial number temporarily
     */
    private function reserveSerialNumber()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            return ['error' => 'Method not allowed'];
        }

        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['serial_number']) || empty($data['serial_number'])) {
            http_response_code(400);
            return ['error' => 'Serial number is required'];
        }

        // Get the serial number record
        $serialNumber = $this->igtSerialNumbers->getBySerialNumber($data['serial_number']);
        if (!$serialNumber) {
            http_response_code(404);
            return ['error' => 'Serial number not found'];
        }

        if ($serialNumber['status'] !== 'available') {
            http_response_code(409);
            return ['error' => 'Serial number is not available (current status: ' . $serialNumber['status'] . ')'];
        }

        // Mark as reserved
        $success = $this->igtSerialNumbers->update($serialNumber['id'], [
            'status' => 'reserved',
            'reserved_at' => date('Y-m-d H:i:s'),
            'reserved_by' => $_POST['user_id'] ?? 'system'
        ]);

        if ($success) {
            return ['success' => true, 'message' => 'Serial number reserved successfully'];
        } else {
            http_response_code(500);
            return ['error' => 'Failed to reserve serial number'];
        }
    }

    /**
     * Release a reserved serial number
     */
    private function releaseSerialNumber()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            return ['error' => 'Method not allowed'];
        }

        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['serial_number']) || empty($data['serial_number'])) {
            http_response_code(400);
            return ['error' => 'Serial number is required'];
        }

        // Get the serial number record
        $serialNumber = $this->igtSerialNumbers->getBySerialNumber($data['serial_number']);
        if (!$serialNumber) {
            http_response_code(404);
            return ['error' => 'Serial number not found'];
        }

        if ($serialNumber['status'] !== 'reserved') {
            // If it's already available, that's fine
            if ($serialNumber['status'] === 'available') {
                return ['success' => true, 'message' => 'Serial number is already available'];
            }
            
            http_response_code(409);
            return ['error' => 'Serial number cannot be released (current status: ' . $serialNumber['status'] . ')'];
        }

        // Mark as available
        $success = $this->igtSerialNumbers->update($serialNumber['id'], [
            'status' => 'available',
            'reserved_at' => null,
            'reserved_by' => null
        ]);

        if ($success) {
            return ['success' => true, 'message' => 'Serial number released successfully'];
        } else {
            http_response_code(500);
            return ['error' => 'Failed to release serial number'];
        }
    }

    /**
     * Bulk import serial numbers
     */
    private function bulkImportSerialNumbers()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            return ['error' => 'Method not allowed'];
        }

        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['serial_numbers']) || !is_array($data['serial_numbers'])) {
            http_response_code(400);
            return ['error' => 'Serial numbers array is required'];
        }

        $result = $this->igtSerialNumbers->bulkImport(
            $data['serial_numbers'],
            $data['created_by'] ?? 'system',
            $data['category'] ?? 'gaming',
            $data['manufacturer'] ?? null
        );

        return $result;
    }

    /**
     * Get asset creation statistics
     */
    private function getAssetStats()
    {
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo = $_GET['date_to'] ?? null;
        
        return $this->igtAssets->getCreationStats($dateFrom, $dateTo);
    }

    /**
     * Get serial number usage statistics
     */
    private function getSerialNumberStats()
    {
        return $this->igtSerialNumbers->getUsageStats();
   
    }

    /**
     * Send email notification when serial numbers are low
     */
    private function sendLowSerialNumberNotification()
    {
        $category = $_GET['category'] ?? 'gaming';
        $threshold = (int)($_GET['threshold'] ?? 10);
        $recipients = $_GET['recipients'] ?? 'admin@the-fi-company.com'; // comma-separated

        // Get count of available serial numbers
        $available = $this->igtSerialNumbers->getAvailableByCategory($category, 10000);
        $count = is_array($available) ? count($available) : 0;

        if ($count > $threshold) {
            return ['message' => 'Stock is sufficient', 'count' => $count];
        }

        // Prepare email using existing service
        $subject = "Low Serial Number Alert: {$category}";
        $message = "Attention:\n\nThe available serial numbers for category {$category} are low.\nCurrent count: {$count}\nThreshold: {$threshold}\nPlease add more serial numbers as soon as possible.";

        // Use existing email notification function
        try {
            $emailResult = emailNotification('low_serial_numbers', $recipients, $subject, $message);
            
            if ($emailResult) {
                return ['success' => true, 'message' => 'Low stock notification sent', 'count' => $count];
            } else {
                http_response_code(500);
                return ['error' => 'Failed to send email notification'];
            }
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Failed to send email: ' . $e->getMessage()];
        }
    }
}

// Handle the request if this file is accessed directly
if (basename(__FILE__) === basename($_SERVER['SCRIPT_NAME'])) {
    // Include database connection (adjust path as needed)
   
    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    
    $controller = new IgtAssetsController($db);
    $result = $controller->handleRequest();
    
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }
    
    echo json_encode($result);
}