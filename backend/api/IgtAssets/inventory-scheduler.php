<?php
/**
 * Scheduled Job Runner for Inventory Alerts
 * This script should be run via cron job to automatically check inventory levels
 */

require_once __DIR__ . '/inventory-alerts.php';

class InventoryScheduler {
    private $alertsApi;
    private $logFile;
    
    public function __construct() {
        $this->alertsApi = new InventoryAlerts();
        $this->logFile = __DIR__ . '/../../logs/inventory-scheduler.log';
        
        // Ensure log directory exists
        $logDir = dirname($this->logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
    }
    
    /**
     * Run the scheduled inventory check
     */
    public function runScheduledCheck() {
        $startTime = microtime(true);
        $this->log("Starting scheduled inventory check");
        
        try {
            // Capture output from the alerts API
            ob_start();
            
            // Simulate a GET request to check inventory
            $_SERVER['REQUEST_METHOD'] = 'GET';
            $_GET['path'] = 'check-inventory';
            
            $this->alertsApi->checkInventoryLevels();
            
            $output = ob_get_clean();
            $result = json_decode($output, true);
            
            if ($result && $result['success']) {
                $alertCount = count($result['alerts'] ?? []);
                $this->log("Inventory check completed successfully. {$alertCount} alerts found.");
                
                if ($alertCount > 0) {
                    $this->log("Alert details: " . json_encode($result['alerts']));
                }
            } else {
                $this->log("Inventory check failed: " . $output, 'ERROR');
            }
            
        } catch (Exception $e) {
            $this->log("Exception during inventory check: " . $e->getMessage(), 'ERROR');
        }
        
        $endTime = microtime(true);
        $duration = round(($endTime - $startTime) * 1000, 2);
        $this->log("Scheduled check completed in {$duration}ms");
    }
    
    /**
     * Check if alerts should be sent based on frequency settings
     */
    public function shouldRunCheck() {
        $lastRunFile = __DIR__ . '/../../logs/last-inventory-check.txt';
        
        if (!file_exists($lastRunFile)) {
            // First run
            file_put_contents($lastRunFile, time());
            return true;
        }
        
        $lastRun = (int)file_get_contents($lastRunFile);
        $alertFrequencyHours = 24; // Default 24 hours
        
        // Check if enough time has passed
        $timeSinceLastRun = time() - $lastRun;
        $frequencySeconds = $alertFrequencyHours * 3600;
        
        if ($timeSinceLastRun >= $frequencySeconds) {
            file_put_contents($lastRunFile, time());
            return true;
        }
        
        return false;
    }
    
    /**
     * Log messages with timestamp
     */
    private function log($message, $level = 'INFO') {
        $timestamp = date('Y-m-d H:i:s T');
        $logEntry = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
        
        file_put_contents($this->logFile, $logEntry, FILE_APPEND | LOCK_EX);
        
        // Also output to console if running from command line
        if (php_sapi_name() === 'cli') {
            echo $logEntry;
        }
    }
    
    /**
     * Clean old log files
     */
    public function cleanOldLogs($daysToKeep = 30) {
        $logDir = dirname($this->logFile);
        $files = glob($logDir . '/*.log');
        $cutoffTime = time() - ($daysToKeep * 24 * 3600);
        
        foreach ($files as $file) {
            if (filemtime($file) < $cutoffTime) {
                unlink($file);
                $this->log("Deleted old log file: " . basename($file));
            }
        }
    }
    
    /**
     * Get system status for monitoring
     */
    public function getSystemStatus() {
        return [
            'timestamp' => date('Y-m-d H:i:s T'),
            'scheduler_running' => true,
            'log_file' => $this->logFile,
            'log_file_exists' => file_exists($this->logFile),
            'log_file_size' => file_exists($this->logFile) ? filesize($this->logFile) : 0,
            'php_version' => phpversion(),
            'memory_usage' => memory_get_usage(true),
            'memory_peak' => memory_get_peak_usage(true)
        ];
    }
}

// Main execution
if (php_sapi_name() === 'cli') {
    // Running from command line
    $scheduler = new InventoryScheduler();
    
    // Check command line arguments
    $command = $argv[1] ?? 'check';
    
    switch ($command) {
        case 'check':
            if ($scheduler->shouldRunCheck()) {
                $scheduler->runScheduledCheck();
            } else {
                echo "Skipping check - not enough time elapsed since last run\n";
            }
            break;
            
        case 'force-check':
            $scheduler->runScheduledCheck();
            break;
            
        case 'clean-logs':
            $scheduler->cleanOldLogs();
            break;
            
        case 'status':
            print_r($scheduler->getSystemStatus());
            break;
            
        default:
            echo "Usage: php inventory-scheduler.php [check|force-check|clean-logs|status]\n";
            echo "  check       - Run scheduled check if enough time has passed\n";
            echo "  force-check - Force run inventory check regardless of timing\n";
            echo "  clean-logs  - Clean up old log files\n";
            echo "  status      - Show system status\n";
            break;
    }
} else {
    // Running from web
    header('Content-Type: application/json');
    
    $scheduler = new InventoryScheduler();
    $action = $_GET['action'] ?? 'status';
    
    try {
        switch ($action) {
            case 'run':
                $scheduler->runScheduledCheck();
                echo json_encode(['success' => true, 'message' => 'Scheduled check completed']);
                break;
                
            case 'status':
                echo json_encode(['success' => true, 'status' => $scheduler->getSystemStatus()]);
                break;
                
            default:
                echo json_encode(['error' => 'Unknown action']);
                break;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
