<?php
/**
 * Cleanup Orphaned Checklist Images
 * Removes image files that are no longer referenced in the database
 * Run this script periodically via cron job
 */

require_once __DIR__ . '/../config/database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Get all image paths from database
    $sql = "SELECT sample_images FROM checklist_items WHERE sample_images IS NOT NULL";
    $stmt = $conn->query($sql);
    
    $referencedFiles = [];
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $sampleImages = json_decode($row['sample_images'], true);
        if (is_array($sampleImages)) {
            foreach ($sampleImages as $image) {
                if (isset($image['url']) && strpos($image['url'], 'uploads/checklist-images/') !== false) {
                    // Extract filename from URL
                    preg_match('/uploads\/checklist-images\/([^?]+)/', $image['url'], $matches);
                    if (isset($matches[1])) {
                        $referencedFiles[] = $matches[1];
                    }
                }
            }
        }
    }
    
    echo "Found " . count($referencedFiles) . " image files referenced in database\n";
    
    // Get all files in upload directory
    $uploadDir = __DIR__ . '/../uploads/checklist-images';
    $allFiles = glob($uploadDir . '/checklist_img_*.*');
    
    echo "Found " . count($allFiles) . " total files in upload directory\n";
    
    // Find orphaned files
    $orphanedCount = 0;
    $deletedCount = 0;
    $totalSize = 0;
    
    foreach ($allFiles as $file) {
        $filename = basename($file);
        
        if (!in_array($filename, $referencedFiles)) {
            $orphanedCount++;
            $fileSize = filesize($file);
            $totalSize += $fileSize;
            
            echo "🗑️  Orphaned: $filename (" . formatBytes($fileSize) . ")\n";
            
            // Delete the orphaned file
            if (unlink($file)) {
                $deletedCount++;
            } else {
                echo "   ⚠️  Failed to delete $filename\n";
            }
        }
    }
    
    echo "\n📊 Summary:\n";
    echo "   Referenced files: " . count($referencedFiles) . "\n";
    echo "   Total files: " . count($allFiles) . "\n";
    echo "   Orphaned files: $orphanedCount\n";
    echo "   Deleted files: $deletedCount\n";
    echo "   Space freed: " . formatBytes($totalSize) . "\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}
