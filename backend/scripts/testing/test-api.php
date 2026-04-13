<?php
/**
 * Photo Checklist Configuration API - Test Script
 * This script tests all the API endpoints to ensure they're working correctly
 */

$baseUrl = 'http://localhost/igt_api/photo-checklist-config.php';

function makeRequest($url, $method = 'GET', $data = null) {
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    
    if ($data && in_array($method, ['POST', 'PUT'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'data' => json_decode($response, true)
    ];
}

function testEndpoint($name, $url, $method = 'GET', $data = null) {
    echo "\n" . str_repeat('=', 60) . "\n";
    echo "Testing: $name\n";
    echo "Method: $method\n";
    echo "URL: $url\n";
    
    if ($data) {
        echo "Data: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
    }
    
    echo str_repeat('-', 60) . "\n";
    
    $result = makeRequest($url, $method, $data);
    
    echo "HTTP Code: " . $result['code'] . "\n";
    echo "Response: " . json_encode($result['data'], JSON_PRETTY_PRINT) . "\n";
    
    return $result;
}

echo "Photo Checklist Configuration API - Test Suite\n";
echo "=" . str_repeat('=', 59) . "\n";

// Test 1: Get Configuration
testEndpoint(
    'Get System Configuration',
    $baseUrl . '?request=config'
);

// Test 2: Get Templates
testEndpoint(
    'Get All Templates',
    $baseUrl . '?request=templates'
);

// Test 3: Create Template
$templateData = [
    'name' => 'Test Template - ' . date('Y-m-d H:i:s'),
    'description' => 'Test template created by API test script',
    'part_number' => 'TEST-001',
    'product_type' => 'Test Product',
    'category' => 'quality_control',
    'version' => '1.0',
    'items' => [
        [
            'title' => 'Test Photo 1',
            'description' => 'Test description for photo 1',
            'is_required' => true,
            'photo_requirements' => [
                'angle' => 'front',
                'distance' => 'close',
                'lighting' => 'good'
            ]
        ],
        [
            'title' => 'Test Photo 2',
            'description' => 'Test description for photo 2',
            'is_required' => true,
            'photo_requirements' => [
                'angle' => 'side',
                'distance' => 'medium',
                'lighting' => 'good'
            ]
        ]
    ]
];

$createResult = testEndpoint(
    'Create New Template',
    $baseUrl . '?request=templates',
    'POST',
    $templateData
);

$createdTemplateId = $createResult['data']['template_id'] ?? null;

if ($createdTemplateId) {
    // Test 4: Get Specific Template
    testEndpoint(
        'Get Specific Template',
        $baseUrl . '?request=template&id=' . $createdTemplateId
    );
    
    // Test 5: Update Template
    $updateData = [
        'name' => 'Updated Test Template - ' . date('Y-m-d H:i:s'),
        'description' => 'Updated test template description',
        'version' => '1.1',
        'items' => [
            [
                'title' => 'Updated Test Photo 1',
                'description' => 'Updated test description for photo 1',
                'is_required' => true,
                'photo_requirements' => [
                    'angle' => 'front',
                    'distance' => 'close',
                    'lighting' => 'bright'
                ]
            ]
        ]
    ];
    
    testEndpoint(
        'Update Template',
        $baseUrl . '?request=template&id=' . $createdTemplateId,
        'PUT',
        $updateData
    );
    
    // Test 6: Create Instance
    $instanceData = [
        'template_id' => $createdTemplateId,
        'work_order_number' => 'WO-TEST-' . time(),
        'part_number' => 'TEST-001',
        'serial_number' => 'SN-TEST-' . time(),
        'operator_name' => 'Test Operator'
    ];
    
    $instanceResult = testEndpoint(
        'Create Instance',
        $baseUrl . '?request=instances',
        'POST',
        $instanceData
    );
    
    $createdInstanceId = $instanceResult['data']['instance_id'] ?? null;
    
    if ($createdInstanceId) {
        // Test 7: Get Instance
        testEndpoint(
            'Get Specific Instance',
            $baseUrl . '?request=instance&id=' . $createdInstanceId
        );
        
        // Test 8: Update Instance Status
        testEndpoint(
            'Update Instance Status',
            $baseUrl . '?request=instance&id=' . $createdInstanceId,
            'PUT',
            ['status' => 'in_progress']
        );
        
        // Test 9: Get All Instances
        testEndpoint(
            'Get All Instances',
            $baseUrl . '?request=instances'
        );
    }
    
    // Test 10: Legacy Read (for backward compatibility)
    testEndpoint(
        'Legacy Read (Compatibility)',
        $baseUrl . '?request=read&woNumber=' . $instanceData['work_order_number'] . '&partNumber=' . $instanceData['part_number'] . '&serialNumber=' . $instanceData['serial_number']
    );
    
    // Test 11: Delete Template (should fail if there are active instances)
    testEndpoint(
        'Delete Template (Should Fail - Active Instances)',
        $baseUrl . '?request=template&id=' . $createdTemplateId,
        'DELETE'
    );
    
    // Clean up: Complete the instance first, then delete template
    if ($createdInstanceId) {
        testEndpoint(
            'Complete Instance (Cleanup)',
            $baseUrl . '?request=instance&id=' . $createdInstanceId,
            'PUT',
            ['status' => 'completed']
        );
        
        // Now try deleting template again
        testEndpoint(
            'Delete Template (Should Succeed)',
            $baseUrl . '?request=template&id=' . $createdTemplateId,
            'DELETE'
        );
    }
}

// Test 12: Update Configuration
$configUpdate = [
    'max_photo_size_mb' => 15,
    'photo_compression_enabled' => true
];

testEndpoint(
    'Update Configuration',
    $baseUrl . '?request=config',
    'POST',
    $configUpdate
);

// Test 13: Get Open Checklists (Legacy)
testEndpoint(
    'Get Open Checklists (Legacy)',
    $baseUrl . '?request=read&getOpenChecklists=true'
);

echo "\n" . str_repeat('=', 60) . "\n";
echo "API Test Suite Completed!\n";
echo "Check the responses above to verify all endpoints are working correctly.\n";
echo str_repeat('=', 60) . "\n";

?>
