<?php
/**
 * PDF Image Extraction API
 * Extracts embedded images from PDF files for checklist template import
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
    // Check if file was uploaded
    if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No PDF file uploaded or upload error occurred');
    }

    $uploadedFile = $_FILES['pdf'];
    $tmpPath = $uploadedFile['tmp_name'];
    
    // Verify it's a PDF
    $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($fileInfo, $tmpPath);
    finfo_close($fileInfo);
    
    if ($mimeType !== 'application/pdf') {
        throw new Exception('Uploaded file is not a PDF');
    }

    // Extract images using pdfimages (requires poppler-utils)
    $images = extractImagesWithPdfImages($tmpPath);
    
    // If pdfimages not available, try Imagick
    if (empty($images) && extension_loaded('imagick')) {
        $images = extractImagesWithImagick($tmpPath);
    }
    
    // Clean up temp file
    @unlink($tmpPath);
    
    // Group images by Y-position if position data is available
    $imageGroups = groupImagesByYPosition($images);
    
    // DEBUG: Check if first image has position data
    $debugInfo = [
        'hasYCenter' => isset($images[0]['yCenter']) && $images[0]['yCenter'] !== null,
        'firstImageKeys' => !empty($images) ? array_keys($images[0]) : [],
        'firstImageYCenter' => $images[0]['yCenter'] ?? 'NOT SET',
        'firstImageYPosition' => $images[0]['yPosition'] ?? 'NOT SET'
    ];
    
    echo json_encode([
        'success' => true,
        'images' => $images, // Flat array for backward compatibility
        'imageGroups' => $imageGroups, // Grouped by Y-position (table rows)
        'count' => count($images),
        'groupCount' => count($imageGroups),
        'method' => empty($images) ? 'none' : 'extraction',
        'debug' => $debugInfo // Temporary debug info
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Extract images using pdfimages command-line tool (most reliable)
 * Filters to only include images from the "Pictures" column (right side of page)
 */
function extractImagesWithPdfImages($pdfPath) {
    $images = [];
    
    // Check if pdfimages is available
    $pdfimagesPath = findPdfImagesExecutable();
    if (!$pdfimagesPath) {
        error_log('pdfimages not found');
        return [];
    }
    
    // Create temp directory for extracted images
    $tempDir = sys_get_temp_dir() . '/pdf_extract_' . uniqid();
    if (!mkdir($tempDir, 0777, true)) {
        error_log('Failed to create temp directory');
        return [];
    }
    
    try {
        // First, get list of images with positions using -bbox flag for bounding box coordinates
        $listCommand = escapeshellcmd($pdfimagesPath) . ' -bbox ' . escapeshellarg($pdfPath);
        exec($listCommand . ' 2>&1', $listOutput, $listReturnCode);
        
        error_log("pdfimages -bbox output:");
        error_log(implode("\n", $listOutput));
        
        // If -bbox not available, fall back to -list
        if ($listReturnCode !== 0) {
            error_log("bbox failed, trying -list instead");
            $listCommand = escapeshellcmd($pdfimagesPath) . ' -list ' . escapeshellarg($pdfPath);
            exec($listCommand . ' 2>&1', $listOutput, $listReturnCode);
        }
        
        $imagePositions = [];
        if ($listReturnCode === 0 && count($listOutput) > 2) {
            // Parse the list output (skip header lines)
            // Format with -bbox: page x-from y-from x-to y-to width height ...
            // Format with -list: page num type width height color comp bpc enc interp object ID x-ppi y-ppi size ratio
            
            for ($i = 2; $i < count($listOutput); $i++) {
                $line = $listOutput[$i];
                if (trim($line) === '') continue;
                
                // Parse line - columns are space-separated
                $parts = preg_split('/\s+/', trim($line));
                if (count($parts) >= 5) {
                    $imageNum = $i - 2; // Image index (0-based)
                    $page = isset($parts[0]) ? intval($parts[0]) : 0;
                    
                    // Check if this is bbox format (has x-from, y-from, x-to, y-to)
                    if (count($parts) >= 7 && is_numeric($parts[1]) && is_numeric($parts[2])) {
                        $xFrom = floatval($parts[1]);
                        $yFrom = floatval($parts[2]);
                        $xTo = floatval($parts[3]);
                        $yTo = floatval($parts[4]);
                        $width = isset($parts[5]) ? intval($parts[5]) : 0;
                        $height = isset($parts[6]) ? intval($parts[6]) : 0;
                        
                        $imagePositions[$imageNum] = [
                            'page' => $page,
                            'xFrom' => $xFrom,
                            'yFrom' => $yFrom,
                            'xTo' => $xTo,
                            'yTo' => $yTo,
                            'xCenter' => ($xFrom + $xTo) / 2,
                            'yCenter' => ($yFrom + $yTo) / 2,
                            'width' => $width,
                            'height' => $height
                        ];
                        
                        error_log("  Image {$imageNum}: page={$page}, x={$xFrom}-{$xTo}, y={$yFrom}-{$yTo} (center=" . round($imagePositions[$imageNum]['xCenter']) . "," . round($imagePositions[$imageNum]['yCenter']) . "), size={$width}x{$height}");
                    } else {
                        // List format
                        $width = isset($parts[3]) ? intval($parts[3]) : 0;
                        $height = isset($parts[4]) ? intval($parts[4]) : 0;
                        
                        $imagePositions[$imageNum] = [
                            'page' => $page,
                            'width' => $width,
                            'height' => $height,
                            'xCenter' => null // No position data available
                        ];
                        
                        error_log("  Image {$imageNum}: page={$page}, size={$width}x{$height} (no position data)");
                    }
                }
            }
        }
        
        error_log("Total images found in list: " . count($imagePositions));
        
        // Extract images with pdfimages
        // -j = export JPEG images as JPEG (not convert to PPM)
        // -png = export other formats as PNG
        $outputPrefix = $tempDir . '/img';
        $command = escapeshellcmd($pdfimagesPath) . ' -j -png ' . 
                   escapeshellarg($pdfPath) . ' ' . 
                   escapeshellarg($outputPrefix);
        
        exec($command . ' 2>&1', $output, $returnCode);
        
        if ($returnCode !== 0) {
            error_log('pdfimages failed: ' . implode("\n", $output));
            return [];
        }
        
        // Read extracted images and convert to base64
        $files = glob($tempDir . '/img-*.*');
        sort($files); // Ensure consistent order
        
        error_log("Found " . count($files) . " extracted image files");
        
        foreach ($files as $index => $file) {
            $filename = basename($file);
            error_log("Processing file: {$filename}");
            
            $imageData = file_get_contents($file);
            if ($imageData === false) {
                error_log("  ✗ SKIPPED: Failed to read file");
                continue;
            }
            
            // Validate that it's actually an image
            $imageInfo = @getimagesize($file);
            if (!$imageInfo) {
                error_log("  ✗ SKIPPED: Not a valid image file");
                continue;
            }
            
            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $mimeType = $imageInfo['mime'];
            
            // Skip if dimensions are invalid
            if ($width <= 0 || $height <= 0) {
                error_log("  ✗ SKIPPED: Invalid dimensions ({$width}x{$height})");
                continue;
            }
            
            $aspectRatio = $width / $height;
            
            error_log("  Image {$index}: {$width}x{$height} (aspect: " . number_format($aspectRatio, 2) . "), mime: {$mimeType}");
            
            // Log position data if available
            if (isset($imagePositions[$index]) && $imagePositions[$index]['xCenter'] !== null) {
                $pos = $imagePositions[$index];
                error_log("  📍 Position: x={$pos['xCenter']}, page={$pos['page']}");
            }
            
            // TEMPORARILY DISABLE ALL FILTERING - Include every image to debug
            // We'll add back filtering after we see what's being extracted
            
            // Convert to base64
            $base64 = base64_encode($imageData);
            
            // Validate base64 encoding
            if (empty($base64)) {
                error_log("  ✗ SKIPPED: Base64 encoding failed");
                continue;
            }
            
            // Create data URL
            $dataUrl = "data:{$mimeType};base64,{$base64}";
            
            // Validate data URL format
            if (!preg_match('/^data:image\/(jpeg|png|gif);base64,[A-Za-z0-9+\/=]+$/', $dataUrl)) {
                error_log("  ✗ SKIPPED: Invalid data URL format");
                continue;
            }
            
            $images[] = [
                'url' => $dataUrl,
                'width' => $width,
                'height' => $height,
                'size' => strlen($imageData),
                'index' => $index,
                'aspectRatio' => round($aspectRatio, 2),
                'filename' => $filename,
                'mimeType' => $mimeType,
                // Include position data for grouping
                'yPosition' => isset($imagePositions[$index]) ? ($imagePositions[$index]['yFrom'] ?? null) : null,
                'yCenter' => isset($imagePositions[$index]) && isset($imagePositions[$index]['yFrom']) 
                    ? ($imagePositions[$index]['yFrom'] + ($imagePositions[$index]['yTo'] ?? $imagePositions[$index]['yFrom'])) / 2 
                    : null,
                'page' => isset($imagePositions[$index]) ? $imagePositions[$index]['page'] : 1
            ];
            
            error_log("  ✓ INCLUDED successfully");
        }
        
        error_log("Total valid images extracted: " . count($images));
        
    } finally {
        // Clean up temp directory
        array_map('unlink', glob($tempDir . '/*.*'));
        @rmdir($tempDir);
    }
    
    return $images;
}

/**
 * Extract images using Imagick extension (fallback)
 */
function extractImagesWithImagick($pdfPath) {
    $images = [];
    
    try {
        $imagick = new Imagick();
        $imagick->setResolution(150, 150); // Set resolution before reading PDF
        $imagick->readImage($pdfPath);
        
        // Get number of pages
        $numPages = $imagick->getNumberImages();
        
        // Process each page
        foreach ($imagick as $pageIndex => $page) {
            // Set format to JPEG
            $page->setImageFormat('jpeg');
            $page->setImageCompression(Imagick::COMPRESSION_JPEG);
            $page->setImageCompressionQuality(85);
            
            // Get image blob
            $imageBlob = $page->getImageBlob();
            
            // Convert to base64
            $base64 = base64_encode($imageBlob);
            $dataUrl = "data:image/jpeg;base64,$base64";
            
            $images[] = [
                'url' => $dataUrl,
                'width' => $page->getImageWidth(),
                'height' => $page->getImageHeight(),
                'size' => strlen($imageBlob),
                'page' => $pageIndex + 1
            ];
        }
        
        $imagick->clear();
        $imagick->destroy();
        
    } catch (Exception $e) {
        error_log('Imagick extraction failed: ' . $e->getMessage());
    }
    
    return $images;
}

/**
 * Find pdfimages executable in common locations
 */
function findPdfImagesExecutable() {
    // Common paths where pdfimages might be installed
    $possiblePaths = [
        'pdfimages', // In PATH
        '/usr/bin/pdfimages',
        '/usr/local/bin/pdfimages',
        'C:\\Program Files\\poppler\\bin\\pdfimages.exe',
        'C:\\Program Files (x86)\\poppler\\bin\\pdfimages.exe',
        'C:\\poppler\\bin\\pdfimages.exe',
    ];
    
    foreach ($possiblePaths as $path) {
        // Try to execute with --version to check if it works
        $output = [];
        $returnCode = 0;
        @exec(escapeshellcmd($path) . ' --version 2>&1', $output, $returnCode);
        
        if ($returnCode === 0 || strpos(implode(' ', $output), 'pdfimages') !== false) {
            return $path;
        }
    }
    
    return null;
}

/**
 * Group images by their Y-position (vertical position on page)
 * Images with similar Y-positions are likely in the same table row
 * 
 * @param array $images Array of image data with yCenter coordinates
 * @return array Grouped images by row
 */
function groupImagesByYPosition($images) {
    if (empty($images)) {
        return [];
    }
    
    // Check if we have position data
    $hasPositionData = false;
    foreach ($images as $img) {
        if (isset($img['yCenter']) && $img['yCenter'] !== null) {
            $hasPositionData = true;
            break;
        }
    }
    
    // If no position data, return sequential groups (one image per group)
    if (!$hasPositionData) {
        error_log("⚠️ WARNING: No Y-position data available!");
        error_log("Sample image data:");
        error_log(print_r(array_slice($images, 0, 2), true));
        error_log("Using sequential grouping (one image per group) - hierarchical import will NOT work");
        $groups = [];
        foreach ($images as $img) {
            $groups[] = [
                'images' => [$img],
                'yPosition' => null,
                'page' => $img['page'] ?? 1
            ];
        }
        return $groups;
    }
    
    // Sort images by page, then by Y-position
    $sortedImages = $images;
    usort($sortedImages, function($a, $b) {
        $pageCompare = ($a['page'] ?? 1) - ($b['page'] ?? 1);
        if ($pageCompare !== 0) return $pageCompare;
        
        $aY = $a['yCenter'] ?? $a['yPosition'] ?? 0;
        $bY = $b['yCenter'] ?? $b['yPosition'] ?? 0;
        return $aY - $bY;
    });
    
    error_log("Grouping " . count($sortedImages) . " images by Y-position...");
    error_log("DEBUG: First 5 images Y-positions:");
    for ($i = 0; $i < min(5, count($sortedImages)); $i++) {
        $y = $sortedImages[$i]['yCenter'] ?? $sortedImages[$i]['yPosition'] ?? 0;
        error_log("  Image $i: Y=" . round($y, 2) . ", page=" . ($sortedImages[$i]['page'] ?? 1));
    }
    
    // Group images with similar Y-positions (within 50 pixels tolerance)
    // INCREASED from 30 to 50 pixels to handle variations in PDF layout
    $groups = [];
    $yTolerance = 50; // Pixels - adjust based on your PDF row heights
    
    foreach ($sortedImages as $img) {
        $imgY = $img['yCenter'] ?? $img['yPosition'] ?? 0;
        $imgPage = $img['page'] ?? 1;
        
        // Try to find an existing group on the same page with similar Y-position
        $foundGroup = false;
        foreach ($groups as &$group) {
            $groupY = $group['yPosition'];
            $groupPage = $group['page'];
            
            // Same page and similar Y-position
            if ($groupPage === $imgPage && abs($groupY - $imgY) <= $yTolerance) {
                $group['images'][] = $img;
                // Update group Y to average
                $group['yPosition'] = ($group['yPosition'] * (count($group['images']) - 1) + $imgY) / count($group['images']);
                $foundGroup = true;
                error_log("  ✓ Image at Y=" . round($imgY) . " GROUPED with existing group at Y=" . round($groupY) . " (diff=" . round(abs($groupY - $imgY)) . "px, tolerance={$yTolerance}px)");
                break;
            } else if ($groupPage === $imgPage) {
                error_log("  ✗ Image at Y=" . round($imgY) . " NOT grouped with Y=" . round($groupY) . " (diff=" . round(abs($groupY - $imgY)) . "px > tolerance={$yTolerance}px)");
            }
        }
        unset($group);
        
        // Create new group if no match found
        if (!$foundGroup) {
            $groups[] = [
                'images' => [$img],
                'yPosition' => $imgY,
                'page' => $imgPage
            ];
            error_log("  Created new group at y=" . round($imgY) . " (page {$imgPage})");
        }
    }
    
    // Sort groups by page and Y-position
    usort($groups, function($a, $b) {
        $pageCompare = $a['page'] - $b['page'];
        if ($pageCompare !== 0) return $pageCompare;
        return $a['yPosition'] - $b['yPosition'];
    });
    
    error_log("Created " . count($groups) . " image groups");
    foreach ($groups as $i => $group) {
        error_log("  Group " . ($i + 1) . ": " . count($group['images']) . " images at y=" . round($group['yPosition']) . " (page {$group['page']})");
    }
    
    return $groups;
}
