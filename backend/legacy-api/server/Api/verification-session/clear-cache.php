<?php
/**
 * Clear PHP OpCache
 * Run this after updating create-session.php
 */

header('Content-Type: application/json');

$result = [
    'opcache_enabled' => function_exists('opcache_reset'),
    'cache_cleared' => false,
    'file_modified' => null,
    'current_validation' => 'checking...'
];

// Check if opcache is enabled
if (function_exists('opcache_reset')) {
    $result['cache_cleared'] = opcache_reset();
}

// Get file modification time
$filePath = __DIR__ . '/create-session.php';
if (file_exists($filePath)) {
    $result['file_modified'] = date('Y-m-d H:i:s', filemtime($filePath));
    
    // Check what validation exists in the file
    $content = file_get_contents($filePath);
    if (strpos($content, "if (empty(\$data['expected_serial']))") !== false) {
        $result['current_validation'] = 'NEW VERSION (expected_serial only) ✓';
    } elseif (strpos($content, "if (empty(\$data['assignment_id']) || empty(\$data['expected_serial']))") !== false) {
        $result['current_validation'] = 'OLD VERSION (requires assignment_id) ✗';
    }
}

echo json_encode($result, JSON_PRETTY_PRINT);
?>
