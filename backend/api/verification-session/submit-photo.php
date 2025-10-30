<?php
/**
 * Submit Photo for Batch Verification
 * Accepts photo, uses Mindee to extract serials, compares with expected list
 * Supports multiple photo submissions per session (progressive capture)
 */

use EyefiDb\Databases\DatabaseEyefi;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    // Get session ID from POST data or query string
    $sessionId = $_POST['session_id'] ?? $_GET['session_id'] ?? null;
    
    if (empty($sessionId)) {
        throw new Exception('Missing required parameter: session_id');
    }
    
    // Validate file upload
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No photo uploaded or upload error occurred');
    }
    
    // Get session from database
    $stmt = $db->prepare("
        SELECT 
            id,
            assignment_id,
            workflow_session_id,
            expected_serials,
            captured_serials,
            photos,
            session_status,
            expires_at,
            serials_expected,
            serials_found,
            match_result
        FROM verification_sessions
        WHERE id = ?
    ");
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        throw new Exception('Session not found');
    }
    
    // Check if session expired
    if (strtotime($session['expires_at']) < time()) {
        throw new Exception('Session has expired');
    }
    
    if ($session['session_status'] !== 'active') {
        throw new Exception('Session is not active');
    }
    
    // Parse JSON data
    $expectedSerials = json_decode($session['expected_serials'], true);
    $capturedSerials = !empty($session['captured_serials']) ? json_decode($session['captured_serials'], true) : [];
    $photos = !empty($session['photos']) ? json_decode($session['photos'], true) : [];
    
    // Save uploaded photo
    $uploadDir = __DIR__ . '/../../../uploads/verification-photos/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $fileExtension = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
    $fileName = $sessionId . '_photo' . (count($photos) + 1) . '_' . time() . '.' . $fileExtension;
    $filePath = $uploadDir . $fileName;
    
    if (!move_uploaded_file($_FILES['photo']['tmp_name'], $filePath)) {
        throw new Exception('Failed to save uploaded photo');
    }
    
    // TODO: Integrate Mindee OCR to extract serial numbers
    // For now, using placeholder logic - you'll need to add Mindee API call
    $mindeeDebug = [];
    $extractedSerials = extractSerialsFromPhoto($filePath, $mindeeDebug);
    
    // Compare extracted serials with expected serials
    $newMatches = [];
    $photoNumber = count($photos) + 1;
    
    foreach ($extractedSerials as $extracted) {
        // Normalize: trim and remove all spaces (e.g., "T 75097290" -> "T75097290")
        $extracted = str_replace(' ', '', trim($extracted));
        
        // Check if this serial is expected and not already captured
        if (in_array($extracted, $expectedSerials) && !in_array($extracted, $capturedSerials)) {
            $newMatches[] = $extracted;
            $capturedSerials[] = $extracted;
        }
    }
    
    // Get workflow_session_id from the verification session for linking
    $workflowSessionId = $session['workflow_session_id'] ?? null;
    
    // Record this photo submission
    $photos[] = [
        'photo_number' => count($photos) + 1,
        'file_path' => $fileName,
        'uploaded_at' => date('Y-m-d H:i:s'),
        'extracted_serials' => $extractedSerials,
        'new_matches' => $newMatches,
        'match_count' => count($newMatches)
    ];
    
    $serialsFound = count($capturedSerials);
    $serialsExpected = count($expectedSerials);
    
    // Determine match result
    $matchResult = 'pending';
    if ($serialsFound === $serialsExpected) {
        $matchResult = 'complete';
    } elseif ($serialsFound > 0) {
        $matchResult = 'partial';
    }
    
    // Update session
    $db->beginTransaction();
    
    $updateStmt = $db->prepare("
        UPDATE verification_sessions
        SET 
            captured_serials = ?,
            photos = ?,
            serials_found = ?,
            match_result = ?,
            session_status = CASE WHEN ? = 'complete' THEN 'completed' ELSE 'active' END,
            verified_at = CASE WHEN ? = 'complete' THEN NOW() ELSE verified_at END
        WHERE id = ?
    ");
    $updateStmt->execute([
        json_encode($capturedSerials),
        json_encode($photos),
        $serialsFound,
        $matchResult,
        $matchResult,
        $matchResult,
        $sessionId
    ]);
    
    // Log audit trail
    $auditStmt = $db->prepare("
        INSERT INTO verification_audit_log 
        (session_id, assignment_id, action, details, performed_by)
        VALUES (?, ?, 'photo_uploaded', ?, 'tablet')
    ");
    $auditDetails = json_encode([
        'photo_number' => count($photos),
        'file_name' => $fileName,
        'extracted_count' => count($extractedSerials),
        'extracted_serials' => $extractedSerials,
        'new_matches' => $newMatches,
        'total_found' => $serialsFound,
        'total_expected' => $serialsExpected,
        'match_result' => $matchResult
    ]);
    $auditStmt->execute([$sessionId, $session['assignment_id'], $auditDetails]);
    
    // Insert individual serial verification details for each new match
    foreach ($newMatches as $serialNumber) {
        // Determine serial type (starts with 'T' = UL, else EyeFi)
        $serialType = (strpos($serialNumber, 'T') === 0) ? 'ul' : 'eyefi';
        
        // Insert detail record
        $detailStmt = $db->prepare("
            INSERT INTO serial_verification_details
            (verification_session_id, serial_number, serial_type, photo_number, verified_by)
            VALUES (?, ?, ?, ?, 'tablet')
        ");
        $detailStmt->execute([$sessionId, $serialNumber, $serialType, $photoNumber]);
        $detailId = $db->lastInsertId();
        
        // If we have a workflow_session_id, update serial_assignments records
        if ($workflowSessionId) {
            // Try to find and update the serial_assignments record
            // Match by workflow_session_id and either eyefi_serial_number OR ul_number
            $updateAssignmentStmt = $db->prepare("
                UPDATE serial_assignments
                SET verified = 1,
                    verified_at = NOW(),
                    verified_in_photo = ?,
                    verification_detail_id = ?,
                    verification_session_id = ?
                WHERE workflow_session_id = ?
                AND (eyefi_serial_number = ? OR ul_number = ?)
                LIMIT 1
            ");
            $updateAssignmentStmt->execute([
                $photoNumber,
                $detailId,
                $sessionId,
                $workflowSessionId,
                $serialNumber,
                $serialNumber
            ]);
            
            error_log("Updated serial_assignments for serial: $serialNumber (workflow: $workflowSessionId, photo: $photoNumber)");
        }
    }
    
    $db->commit();
    
    // Calculate what's still missing
    $missingSerials = array_values(array_diff($expectedSerials, $capturedSerials));
    
    // Respond with current status
    echo json_encode([
        'success' => true,
        'photo_number' => count($photos),
        'extracted_serials' => $extractedSerials,
        'new_matches' => $newMatches,
        'captured_serials' => $capturedSerials,
        'missing_serials' => $missingSerials,
        'progress' => [
            'found' => $serialsFound,
            'expected' => $serialsExpected,
            'percentage' => round(($serialsFound / $serialsExpected) * 100)
        ],
        'status' => $matchResult,
        'is_complete' => ($matchResult === 'complete'),
        'message' => ($matchResult === 'complete') 
            ? "All $serialsExpected serials verified! ✓"
            : "Found $serialsFound of $serialsExpected serials. Take another photo for remaining " . count($missingSerials) . " serial(s).",
        'debug' => [
            'expected' => $expectedSerials,
            'extracted_count' => count($extractedSerials),
            'extracted_raw' => $extractedSerials,
            'file_saved' => $fileName,
            'mindee_debug' => $mindeeDebug
        ]
    ]);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    
    error_log("ERROR in submit-photo: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Extract serial numbers from photo using Mindee Custom API
 * Uses Mindee's document parsing with custom serial number extraction
 */
function extractSerialsFromPhoto($filePath, &$debug = []) {
    // Mindee V2 API configuration
    $mindeeApiKey = 'md_DksZibIqNghU5DfzyPouOdnbqVvYx1mJ';
    $modelId = '554d5cea-9bd4-4e90-9d7d-b8c42c608bab'; // Your custom model ID
    
    $debug['model_id'] = $modelId;
    $debug['file_path'] = $filePath;
    
    // Step 1: Enqueue the inference
    $enqueueUrl = 'https://api-v2.mindee.net/v2/inferences/enqueue';
    
    error_log("Mindee: Enqueueing inference for model: " . $modelId);
    
    // Prepare the file for upload
    $cfile = new CURLFile($filePath, mime_content_type($filePath), basename($filePath));
    
    // Enqueue the inference
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $enqueueUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => [
            'model_id' => $modelId,
            'file' => $cfile,
            'raw_text' => 'true'
        ],
        CURLOPT_HTTPHEADER => [
            'Authorization: ' . $mindeeApiKey,
        ],
        CURLOPT_TIMEOUT => 60
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    $debug['enqueue_http_code'] = $httpCode;
    $debug['enqueue_response'] = $response;
    
    error_log("Mindee enqueue HTTP: " . $httpCode . " Response: " . $response);
    
    if ($curlError) {
        throw new Exception("Mindee API connection failed: " . $curlError);
    }
    
    if ($httpCode !== 202) {
        throw new Exception("Mindee enqueue failed (HTTP $httpCode): " . $response);
    }
    
    $enqueueData = json_decode($response, true);
    if (!$enqueueData || !isset($enqueueData['job']['id'])) {
        throw new Exception("Invalid enqueue response from Mindee");
    }
    
    $jobId = $enqueueData['job']['id'];
    $pollingUrl = $enqueueData['job']['polling_url'];
    
    error_log("Mindee job ID: " . $jobId . " - Polling...");
    
    // Step 2: Poll for results (max 60 seconds)
    $maxAttempts = 60;
    $attempt = 0;
    
    while ($attempt < $maxAttempts) {
        sleep(1); // Wait 1 second between polls
        $attempt++;
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $pollingUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false, // Don't auto-follow 302
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $mindeeApiKey,
            ],
            CURLOPT_TIMEOUT => 10
        ]);
        
        $pollResponse = curl_exec($ch);
        $pollHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        error_log("Mindee poll attempt $attempt - HTTP: $pollHttpCode");
        
        if ($pollHttpCode === 302) {
            // Processing complete! Get the result
            $pollData = json_decode($pollResponse, true);
            $resultUrl = $pollData['job']['result_url'];
            
            error_log("Mindee processing complete! Getting results from: " . $resultUrl);
            
            // Step 3: Get the final result
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $resultUrl,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: ' . $mindeeApiKey,
                ],
                CURLOPT_TIMEOUT => 10
            ]);
            
            $resultResponse = curl_exec($ch);
            $resultHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            $debug['result_http_code'] = $resultHttpCode;
            $debug['result_response'] = $resultResponse;
            $debug['result_data'] = json_decode($resultResponse, true);
            
            error_log("Mindee result HTTP: $resultHttpCode - Response: " . $resultResponse);
            
            if ($resultHttpCode !== 200) {
                throw new Exception("Failed to get Mindee result (HTTP $resultHttpCode)");
            }
            
            $resultData = json_decode($resultResponse, true);
            if (!$resultData) {
                throw new Exception("Invalid result JSON from Mindee");
            }
            
            // Extract serials from the result
            return extractSerialsFromMindeeResult($resultData);
        }
        
        if ($pollHttpCode !== 200) {
            error_log("Mindee polling error HTTP: $pollHttpCode - Response: " . $pollResponse);
        }
    }
    
    throw new Exception("Mindee processing timeout after $maxAttempts seconds");
}

/**
 * Extract serial numbers from Mindee V2 result
 */
function extractSerialsFromMindeeResult($resultData) {
    $serials = [];
    
    error_log("Mindee full result: " . json_encode($resultData));
    
    if (!isset($resultData['inference']['result']['fields'])) {
        error_log("No fields in Mindee result");
        return [];
    }
    
    $fields = $resultData['inference']['result']['fields'];
    error_log("Mindee fields: " . json_encode(array_keys($fields)));
    
    // Extract from all custom fields
    foreach ($fields as $fieldName => $fieldData) {
        error_log("Processing field: $fieldName - " . json_encode($fieldData));
        
        // Check if field has 'items' array (Mindee list field format)
        if (isset($fieldData['items']) && is_array($fieldData['items'])) {
            foreach ($fieldData['items'] as $item) {
                if (isset($item['value']) && !empty($item['value'])) {
                    $serials[] = trim($item['value']);
                    error_log("Found serial in items: " . $item['value']);
                }
            }
        }
        // Check if field has direct 'value' property
        elseif (isset($fieldData['value']) && !empty($fieldData['value'])) {
            $value = $fieldData['value'];
            
            // Handle different value types
            if (is_string($value)) {
                $serials[] = trim($value);
                error_log("Found serial: " . $value);
            } elseif (is_array($value)) {
                foreach ($value as $item) {
                    if (is_string($item) && !empty($item)) {
                        $serials[] = trim($item);
                        error_log("Found serial in array: " . $item);
                    }
                }
            }
        }
    }
    
    // Remove duplicates
    $serials = array_unique($serials);
    $serials = array_values($serials);
    
    error_log("Final extracted serials: " . json_encode($serials));
    
    return $serials;
}
