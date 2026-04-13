<?php
// Simple test to verify class loading
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Testing AGS class loading...\n\n";

include_once 'AgsSerialGenerator.php';

echo "Class file included successfully\n";
echo "Class exists: " . (class_exists('AgsSerialGenerator') ? 'YES' : 'NO') . "\n";

if (class_exists('AgsSerialGenerator')) {
    $reflection = new ReflectionClass('AgsSerialGenerator');
    echo "Class file: " . $reflection->getFileName() . "\n";
    echo "Parent class: " . $reflection->getParentClass()->getName() . "\n";
    
    // Check if BaseAssetGenerator has the correct methods
    $parentReflection = $reflection->getParentClass();
    echo "\nParent class methods:\n";
    foreach ($parentReflection->getMethods() as $method) {
        if ($method->class === 'BaseAssetGenerator') {
            echo "  - " . $method->getName() . "\n";
        }
    }
}

echo "\nDone.\n";
