<?php
/**
 * Save Checklist Image to File System
 * Converts base64 images to files and returns file paths
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['images']) || !is_array($data['images'])) {
        throw new Exception('No images provided');
    }
    
    // Base upload directory
    $uploadDir = __DIR__ . '/../../uploads/checklist-images';
    
    // Create directory if it doesn't exist
    if (!file_exists($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }
        // Add .htaccess to protect directory (optional)
        file_put_contents($uploadDir . '/.htaccess', "Options -Indexes\n");
    }
    
    $savedImages = [];
    
    foreach ($data['images'] as $index => $imageData) {
        // Parse data URL
        if (!preg_match('/^data:image\/(\w+);base64,(.+)$/', $imageData, $matches)) {
            error_log("Image $index: Invalid data URL format");
            continue;
        }
        
        $imageType = $matches[1]; // png, jpeg, jpg, webp, etc.
        $base64Data = $matches[2];
        
        // Decode base64
        $binaryData = base64_decode($base64Data);
        if ($binaryData === false) {
            error_log("Image $index: Failed to decode base64");
            continue;
        }
        
        // Compress/optimize image if needed
        $optimized = optimizeImage($binaryData, $imageType);
        $optimizedData = $optimized['data'];
        $finalType = $optimized['type'];
        
        // Generate unique filename with correct extension
        $filename = uniqid('checklist_img_', true) . '.' . $finalType;
        $filePath = $uploadDir . '/' . $filename;
        
        // Save to disk
        if (file_put_contents($filePath, $optimizedData) === false) {
            error_log("Image $index: Failed to save file");
            continue;
        }
        
        // Return relative path for database storage
        $relativePath = 'uploads/checklist-images/' . $filename;
        
        $savedImages[] = [
            'originalIndex' => $index,
            'path' => $relativePath,
            'filename' => $filename,
            'size' => strlen($optimizedData),
            'type' => $finalType
        ];
    }
    
    echo json_encode([
        'success' => true,
        'images' => $savedImages,
        'count' => count($savedImages)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Optimize image to reduce file size
 * Converts PNG to JPEG at 85% quality if reasonable
 * Returns array with 'data' and 'type' keys
 */
function optimizeImage($binaryData, $imageType) {
    // For PNG, try converting to JPEG to save space
    if ($imageType === 'png') {
        $img = @imagecreatefromstring($binaryData);
        if ($img !== false) {
            // Check if image has transparency
            $hasTransparency = false;
            if (function_exists('imageistruecolor') && imageistruecolor($img)) {
                // Check for alpha channel
                $width = imagesx($img);
                $height = imagesy($img);
                
                // Sample a few pixels to check for transparency
                for ($x = 0; $x < min($width, 10); $x += 3) {
                    for ($y = 0; $y < min($height, 10); $y += 3) {
                        $rgba = imagecolorat($img, $x, $y);
                        $alpha = ($rgba & 0x7F000000) >> 24;
                        if ($alpha > 0) {
                            $hasTransparency = true;
                            break 2;
                        }
                    }
                }
            }
            
            // Convert to JPEG if no transparency
            if (!$hasTransparency) {
                ob_start();
                imagejpeg($img, null, 85); // 85% quality
                $jpegData = ob_get_clean();
                imagedestroy($img);
                
                // Only use JPEG if it's actually smaller
                if (strlen($jpegData) < strlen($binaryData) * 0.8) {
                    return ['data' => $jpegData, 'type' => 'jpg'];
                }
            } else {
                // Has transparency, keep as PNG
                imagedestroy($img);
            }
        }
    }
    
    // For JPEG, re-compress at 85% quality
    if ($imageType === 'jpeg' || $imageType === 'jpg') {
        $img = @imagecreatefromstring($binaryData);
        if ($img !== false) {
            ob_start();
            imagejpeg($img, null, 85);
            $jpegData = ob_get_clean();
            imagedestroy($img);
            
            // Use re-compressed version if smaller
            if (strlen($jpegData) < strlen($binaryData)) {
                return ['data' => $jpegData, 'type' => 'jpg'];
            }
        }
    }
    
    // Return original if optimization didn't help
    return ['data' => $binaryData, 'type' => $imageType];
}
