<?php
// Debug script to verify AGS setup

// Clear opcache if enabled
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "Opcache cleared.\n";
}

// Include paths
include_once __DIR__ . '/../../../Databases/DatabaseEyefi.php';
include_once 'AgsSerialGenerator.php';
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

$database = new DatabaseEyefi();
$db = $database->getConnection();

$agsSerial = new AgsSerialGenerator($db);

echo "Class: " . get_class($agsSerial) . "\n";
echo "Parent Class: " . get_parent_class($agsSerial) . "\n";

// Use reflection to check protected properties
$reflection = new ReflectionClass($agsSerial);
$properties = $reflection->getProperties();

echo "\nProtected Properties:\n";
foreach ($properties as $prop) {
    if ($prop->isProtected()) {
        $prop->setAccessible(true);
        $value = $prop->getValue($agsSerial);
        echo "  {$prop->getName()}: " . var_export($value, true) . "\n";
    }
}

// Test a simple query to see actual table name in error
try {
    $stmt = $db->prepare("SELECT COUNT(*) FROM eyefidb.agsSerialGenerator");
    $stmt->execute();
    $count = $stmt->fetchColumn();
    echo "\nTable eyefidb.agsSerialGenerator exists with $count rows\n";
} catch (Exception $e) {
    echo "\nTable query error: " . $e->getMessage() . "\n";
}

echo "\nDone.\n";
