<?php
/**
 * Verify Serial Photo
 * Receives photo from tablet, extracts serial with OCR, validates against expected value
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
    
    $sessionId = $_POST['session_id'] ?? null;
    $performedBy = $_POST['performed_by'] ?? 'tablet-user';
    
    if (empty($sessionId)) {
        throw new Exception('Missing required parameter: session_id');
    }
    
    // Validate file upload
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No photo uploaded or upload error');
    }
    
    // Get session
    $stmt = $db->prepare("SELECT * FROM verification_sessions WHERE id = ?");
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        throw new Exception('Session not found');
    }
    
    if ($session['session_status'] !== 'active') {
        throw new Exception('Session is not active (status: ' . $session['session_status'] . ')');
    }
    
    // Check if expired
    if (strtotime($session['expires_at']) < time()) {
        throw new Exception('Session has expired');
    }
    
    $file = $_FILES['photo'];
    $expectedSerial = $session['expected_serial'];
    
    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    $fileType = mime_content_type($file['tmp_name']);
    
    if (!in_array($fileType, $allowedTypes)) {
        throw new Exception('Invalid file type. Only JPEG and PNG allowed.');
    }
    
    // Create storage directory if not exists
    $uploadDir = __DIR__ . '/../../uploads/verification-photos/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = $sessionId . '_' . time() . '.' . $extension;
    $filepath = $uploadDir . $filename;
    $relativePath = 'uploads/verification-photos/' . $filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to save uploaded file');
    }
    
    // Log upload in audit trail
    $auditStmt = $db->prepare("
        INSERT INTO verification_audit_log 
        (session_id, assignment_id, action, details, performed_by)
        VALUES (?, ?, 'photo_uploaded', ?, ?)
    ");
    $auditStmt->execute([
        $sessionId,
        $session['assignment_id'],
        json_encode(['filename' => $filename, 'file_size' => $file['size']]),
        $performedBy
    ]);
    
    // Extract serial number using OCR
    $ocrResult = extractSerialWithOCR($filepath);
    
    // Log OCR completion
    $auditStmt = $db->prepare("
        INSERT INTO verification_audit_log 
        (session_id, assignment_id, action, details, performed_by)
        VALUES (?, ?, 'ocr_completed', ?, ?)
    ");
    $auditStmt->execute([
        $sessionId,
        $session['assignment_id'],
        json_encode([
            'extracted_text' => $ocrResult['text'],
            'captured_serial' => $ocrResult['serial'],
            'confidence' => $ocrResult['confidence']
        ]),
        'ocr-system'
    ]);
    
    $capturedSerial = $ocrResult['serial'];
    
    // Compare serials (case-insensitive, trim whitespace)
    $expectedClean = strtoupper(trim($expectedSerial));
    $capturedClean = strtoupper(trim($capturedSerial));
    
    $isMatch = ($expectedClean === $capturedClean);
    $matchResult = $isMatch ? 'match' : 'mismatch';
    
    $db->beginTransaction();
    
    // Update verification session
    $updateStmt = $db->prepare("
        UPDATE verification_sessions 
        SET captured_serial = ?,
            match_result = ?,
            photo_path = ?,
            session_status = 'completed',
            verified_at = NOW()
        WHERE id = ?
    ");
    $updateStmt->execute([$capturedSerial, $matchResult, $relativePath, $sessionId]);
    
    // Update assignment
    $verificationStatus = $isMatch ? 'verified' : 'failed';
    $assignmentUpdate = $db->prepare("
        UPDATE serial_assignments 
        SET verification_status = ?,
            verification_photo = ?,
            verified_at = NOW(),
            verified_by = ?
        WHERE id = ?
    ");
    $assignmentUpdate->execute([
        $verificationStatus,
        $relativePath,
        $performedBy,
        $session['assignment_id']
    ]);
    
    // Log verification completion
    $auditStmt = $db->prepare("
        INSERT INTO verification_audit_log 
        (session_id, assignment_id, action, details, performed_by)
        VALUES (?, ?, 'verification_completed', ?, ?)
    ");
    $auditStmt->execute([
        $sessionId,
        $session['assignment_id'],
        json_encode([
            'expected_serial' => $expectedSerial,
            'captured_serial' => $capturedSerial,
            'match_result' => $matchResult
        ]),
        $performedBy
    ]);
    
    $db->commit();
    
    echo json_encode([
        'success' => true,
        'verification' => [
            'session_id' => $sessionId,
            'expected_serial' => $expectedSerial,
            'captured_serial' => $capturedSerial,
            'match_result' => $matchResult,
            'is_match' => $isMatch,
            'photo_path' => $relativePath,
            'ocr_confidence' => $ocrResult['confidence']
        ],
        'message' => $isMatch ? 'Serial verified successfully!' : 'Serial mismatch detected'
    ]);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    
    // Clean up uploaded file on error
    if (isset($filepath) && file_exists($filepath)) {
        unlink($filepath);
    }
    
    error_log("ERROR in verify-photo: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Extract serial number from image using OCR
 * Uses Tesseract OCR (free) - can be replaced with Mindee for better accuracy
 */
function extractSerialWithOCR($imagePath) {
    // Check if Tesseract is installed
    $tesseractPath = 'tesseract'; // Assumes tesseract is in PATH
    
    // For Windows, you might need full path:
    // $tesseractPath = 'C:/Program Files/Tesseract-OCR/tesseract.exe';
    
    $outputFile = sys_get_temp_dir() . '/ocr_output_' . uniqid();
    
    // Run Tesseract OCR
    // --psm 7 = Treat the image as a single text line (good for serial numbers)
    // --oem 3 = Use LSTM neural net mode (best accuracy)
    $command = escapeshellcmd($tesseractPath) . ' ' . 
               escapeshellarg($imagePath) . ' ' . 
               escapeshellarg($outputFile) . ' ' .
               '--psm 7 --oem 3 2>&1';
    
    exec($command, $output, $returnCode);
    
    $textFile = $outputFile . '.txt';
    
    if (!file_exists($textFile)) {
        // Tesseract not installed or error - return placeholder
        error_log("Tesseract OCR not available: " . implode("\n", $output));
        return [
            'text' => '',
            'serial' => 'OCR_NOT_AVAILABLE',
            'confidence' => 0,
            'error' => 'Tesseract OCR not installed. Install from: https://github.com/tesseract-ocr/tesseract'
        ];
    }
    
    $extractedText = file_get_contents($textFile);
    unlink($textFile); // Clean up temp file
    
    // Extract serial number from text
    // Assumes serial format like Q73908541, Q73908542, etc.
    $serial = extractSerialNumber($extractedText);
    
    return [
        'text' => trim($extractedText),
        'serial' => $serial,
        'confidence' => 85, // Tesseract doesn't provide confidence easily, estimate
        'error' => null
    ];
}

/**
 * Extract serial number from OCR text
 * Looks for patterns like Q followed by digits
 */
function extractSerialNumber($text) {
    // Remove whitespace and newlines
    $text = preg_replace('/\s+/', '', $text);
    
    // Pattern 1: Q followed by 8 digits (Q73908541)
    if (preg_match('/Q\d{8}/', $text, $matches)) {
        return $matches[0];
    }
    
    // Pattern 2: Any letter followed by digits
    if (preg_match('/[A-Z]\d+/', $text, $matches)) {
        return $matches[0];
    }
    
    // Pattern 3: Just digits (serial without prefix)
    if (preg_match('/\d{6,}/', $text, $matches)) {
        return $matches[0];
    }
    
    // Return cleaned text if no pattern found
    return strtoupper(trim($text));
}

/**
 * Alternative: Use Mindee API for better accuracy (requires API key)
 * Uncomment and configure if you want to use Mindee instead of Tesseract
 */
/*
function extractSerialWithMindee($imagePath) {
    $apiKey = 'YOUR_MINDEE_API_KEY';
    $apiEndpoint = 'https://api.mindee.net/v1/products/mindee/custom/v1/predict';
    
    $ch = curl_init();
    
    $file = new CURLFile($imagePath);
    $postData = ['document' => $file];
    
    curl_setopt_array($ch, [
        CURLOPT_URL => $apiEndpoint,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postData,
        CURLOPT_HTTPHEADER => [
            'Authorization: Token ' . $apiKey
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception('Mindee API error: ' . $response);
    }
    
    $result = json_decode($response, true);
    
    // Extract serial from Mindee response
    // Structure depends on your custom model
    $serial = $result['document']['inference']['prediction']['serial_number']['value'] ?? '';
    $confidence = $result['document']['inference']['prediction']['serial_number']['confidence'] ?? 0;
    
    return [
        'text' => $serial,
        'serial' => $serial,
        'confidence' => $confidence * 100,
        'error' => null
    ];
}
*/
