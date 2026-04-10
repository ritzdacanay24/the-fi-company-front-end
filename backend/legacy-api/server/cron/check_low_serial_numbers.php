<?php
require_once __DIR__ . '/../Databases/DatabaseEyefi.php';
require_once __DIR__ . '/../Api/IgtAssets/IgtSerialNumbers.php';

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\IgtAssets\IgtSerialNumbers;

try {
    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    // Check if this is a test run
    $isTestRun = isset($argv[1]) && $argv[1] === '--test';

    // Configuration - can be overridden by command line arguments
    $config = [
        'threshold' => $isTestRun ? 1000 : 50,
        'recipients' => $isTestRun ? 'ritz.dacanay@the-fi-company.com' : 'admin@the-fi-company.com,inventory@the-fi-company.com,ritz.dacanay@the-fi-company.com',
        'categories' => [
            'gaming' => true,    // Default enabled
            'lottery' => false,  // Default disabled
            'other' => false     // Default disabled
        ]
    ];

    // Parse command line arguments for category configuration
    for ($i = 1; $i < count($argv); $i++) {
        $arg = $argv[$i];
        
        if (strpos($arg, '--categories=') === 0) {
            $categoriesArg = substr($arg, 13);
            $enabledCategories = explode(',', $categoriesArg);
            
            // Reset all categories to false
            foreach ($config['categories'] as $cat => $enabled) {
                $config['categories'][$cat] = false;
            }
            
            // Enable specified categories
            foreach ($enabledCategories as $cat) {
                $cat = trim($cat);
                if (array_key_exists($cat, $config['categories'])) {
                    $config['categories'][$cat] = true;
                }
            }
        } elseif (strpos($arg, '--threshold=') === 0) {
            $config['threshold'] = (int)substr($arg, 12);
        } elseif (strpos($arg, '--recipients=') === 0) {
            $config['recipients'] = substr($arg, 13);
        }
    }

    echo "Starting serial number stock check" . ($isTestRun ? " (TEST MODE)" : "") . "\n";
    echo "Monitoring categories: " . implode(', ', array_keys(array_filter($config['categories']))) . "\n";
    echo "Threshold: " . $config['threshold'] . "\n";

    $serialNumbers = new IgtSerialNumbers($db);
    $lowStockAlerts = [];
    $stockReport = [];

    // Only check enabled categories
    foreach ($config['categories'] as $category => $enabled) {
        if (!$enabled) {
            echo "Skipping category: {$category} (disabled)\n";
            continue;
        }
        
        // Get available serial numbers count
        $available = $serialNumbers->getAvailableByCategory($category, 10000);
        $count = is_array($available) ? count($available) : 0;
        
        $stockReport[] = [
            'category' => $category,
            'count' => $count,
            'status' => $count <= $config['threshold'] ? 'LOW STOCK' : 'OK'
        ];
        
        echo "Category: {$category} - Count: {$count} - Status: " . ($count <= $config['threshold'] ? 'LOW STOCK' : 'OK') . "\n";
        
        if ($count <= $config['threshold']) {
            $lowStockAlerts[] = [
                'category' => $category,
                'count' => $count,
                'threshold' => $config['threshold']
            ];
        }
    }

    // Send email if there are low stock alerts OR if it's a test run
    if (!empty($lowStockAlerts) || $isTestRun) {
        $subject = ($isTestRun ? "[TEST] " : "") . "Daily Serial Number Stock Alert";
        
        $message = ($isTestRun ? "TEST MODE - " : "") . "Daily Serial Number Stock Report\n\n";
        $message .= "Monitored Categories: " . implode(', ', array_keys(array_filter($config['categories']))) . "\n";
        $message .= "Alert Threshold: " . $config['threshold'] . "\n\n";
        
        if (!empty($lowStockAlerts)) {
            $message .= "The following categories have low serial number stock:\n\n";
            foreach ($lowStockAlerts as $alert) {
                $message .= "Category: {$alert['category']}\n";
                $message .= "Current Count: {$alert['count']}\n";
                $message .= "Threshold: {$alert['threshold']}\n";
                $message .= "Status: LOW STOCK\n\n";
            }
            $message .= "Please replenish serial numbers as soon as possible.\n\n";
        } else {
            $message .= "All monitored categories have sufficient stock (above threshold of {$config['threshold']}):\n\n";
            foreach ($stockReport as $report) {
                $message .= "Category: {$report['category']} - Count: {$report['count']} - Status: {$report['status']}\n";
            }
            $message .= "\n";
        }
        
        $message .= "Generated on: " . date('Y-m-d H:i:s');

        // Use simple mail function (no PHPMailer dependency)
        $headers = "From: EyeFi System <noreply@the-fi-company.com>\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();
        
        $emails = explode(',', $config['recipients']);
        $emailSent = true;
        
        foreach ($emails as $email) {
            $email = trim($email);
            if (!mail($email, $subject, $message, $headers)) {
                $emailSent = false;
                echo "Failed to send email to: {$email}\n";
            }
        }
        
        if ($emailSent) {
            echo "Email sent successfully to: {$config['recipients']}\n";
            if (!$isTestRun) {
                error_log("Serial numbers stock alert sent for " . count($lowStockAlerts) . " low stock categories");
            }
        } else {
            echo "Failed to send email\n";
            if (!$isTestRun) {
                error_log("Failed to send serial numbers stock alert");
            }
        }
    } else {
        echo "All monitored serial number categories have sufficient stock (no email sent)\n";
    }

    echo "Stock check completed\n";

} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
    if (!$isTestRun) {
        error_log("Cron job error - check_low_serial_numbers: " . $e->getMessage());
    }
} catch (Exception $e) {
    echo "Error checking serial number stock: " . $e->getMessage() . "\n";
    if (!$isTestRun) {
        error_log("Cron job error - check_low_serial_numbers: " . $e->getMessage());
    }
}
