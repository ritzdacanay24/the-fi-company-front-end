<?php
header('Content-Type: application/json');

echo json_encode([
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'max_execution_time' => ini_get('max_execution_time'),
    'memory_limit' => ini_get('memory_limit'),
    'loaded_config' => php_ini_loaded_file(),
    'pdfimages_available' => findPdfImagesExecutable() !== null,
    'imagick_loaded' => extension_loaded('imagick'),
    'temp_dir' => sys_get_temp_dir(),
    'temp_writable' => is_writable(sys_get_temp_dir())
], JSON_PRETTY_PRINT);

function findPdfImagesExecutable() {
    $possiblePaths = [
        'pdfimages',
        '/usr/bin/pdfimages',
        '/usr/local/bin/pdfimages',
    ];
    
    foreach ($possiblePaths as $path) {
        $output = [];
        $returnCode = 0;
        @exec(escapeshellcmd($path) . ' --version 2>&1', $output, $returnCode);
        
        if ($returnCode === 0 || strpos(implode(' ', $output), 'pdfimages') !== false) {
            return $path;
        }
    }
    
    return null;
}
