<?php
/**
 * Serial Number Generator API
 * Handles all serial number generation, management, and tracking operations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

class SerialNumberAPI {
    private $db;
    private $user_id;

    public function __construct($database, $user_id = null) {
        $this->db = $database;
        $this->user_id = $user_id;
    }

    /**
     * Generate a single serial number
     */
    public function generateSerial($template_id, $used_for = null, $reference_id = null, $reference_table = null) {
        try {
            // Get template configuration
            $stmt = $this->db->prepare("SELECT * FROM serial_number_templates WHERE template_id = ? AND is_active = TRUE");
            $stmt->execute([$template_id]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$template) {
                throw new Exception("Template not found or inactive");
            }

            $config = json_decode($template['config'], true);
            
            // Generate the actual serial number
            $serial_number = $this->buildSerialNumber($config);
            
            // Ensure uniqueness
            $attempts = 0;
            while ($this->serialNumberExists($serial_number) && $attempts < 10) {
                $serial_number = $this->buildSerialNumber($config);
                $attempts++;
            }

            if ($attempts >= 10) {
                throw new Exception("Unable to generate unique serial number after 10 attempts");
            }

            // Insert into database
            $stmt = $this->db->prepare("
                INSERT INTO generated_serial_numbers 
                (serial_number, template_id, config, used_for, reference_id, reference_table, generated_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $serial_number, 
                $template_id, 
                json_encode($config), 
                $used_for, 
                $reference_id, 
                $reference_table, 
                $this->user_id
            ]);

            // Log the generation
            $this->logAudit('GENERATE', $serial_number, $template_id, $reference_table, $reference_id, [
                'template_name' => $template['name'],
                'config' => $config
            ]);

            return [
                'success' => true,
                'serial_number' => $serial_number,
                'template_id' => $template_id,
                'template_name' => $template['name']
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Generate batch of serial numbers
     */
    public function generateBatch($template_id, $count, $purpose = null) {
        try {
            if ($count > 1000) {
                throw new Exception("Batch size cannot exceed 1000");
            }

            $batch_id = uniqid('BATCH_', true);
            $serial_numbers = [];

            // Create batch record
            $stmt = $this->db->prepare("
                INSERT INTO serial_number_batches 
                (batch_id, template_id, total_count, purpose, created_by) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$batch_id, $template_id, $count, $purpose, $this->user_id]);

            // Generate individual serial numbers
            for ($i = 0; $i < $count; $i++) {
                $result = $this->generateSerial($template_id, 'batch', $batch_id, 'serial_number_batches');
                
                if ($result['success']) {
                    $serial_numbers[] = $result['serial_number'];
                    
                    // Link to batch
                    $stmt = $this->db->prepare("
                        INSERT INTO batch_serial_numbers 
                        (batch_id, serial_number_id, sequence_in_batch) 
                        SELECT ?, id, ? FROM generated_serial_numbers WHERE serial_number = ?
                    ");
                    $stmt->execute([$batch_id, $i + 1, $result['serial_number']]);
                } else {
                    throw new Exception("Failed to generate serial number " . ($i + 1) . ": " . $result['error']);
                }
            }

            // Update batch as completed
            $stmt = $this->db->prepare("
                UPDATE serial_number_batches 
                SET status = 'COMPLETED', generated_count = ?, completed_at = NOW() 
                WHERE batch_id = ?
            ");
            $stmt->execute([$count, $batch_id]);

            return [
                'success' => true,
                'batch_id' => $batch_id,
                'serial_numbers' => $serial_numbers,
                'count' => count($serial_numbers)
            ];

        } catch (Exception $e) {
            // Mark batch as cancelled if it exists
            if (isset($batch_id)) {
                $stmt = $this->db->prepare("UPDATE serial_number_batches SET status = 'CANCELLED' WHERE batch_id = ?");
                $stmt->execute([$batch_id]);
            }

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Mark serial number as used
     */
    public function useSerial($serial_number, $reference_id, $reference_table, $notes = null) {
        try {
            $stmt = $this->db->prepare("
                UPDATE generated_serial_numbers 
                SET is_used = TRUE, used_at = NOW(), reference_id = ?, reference_table = ?, notes = ?
                WHERE serial_number = ? AND is_used = FALSE
            ");
            
            $result = $stmt->execute([$reference_id, $reference_table, $notes, $serial_number]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Serial number not found or already used");
            }

            $this->logAudit('USE', $serial_number, null, $reference_table, $reference_id, [
                'notes' => $notes,
                'used_at' => date('Y-m-d H:i:s')
            ]);

            return ['success' => true, 'message' => 'Serial number marked as used'];

        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Get templates
     */
    public function getTemplates($include_inactive = false) {
        try {
            $sql = "SELECT * FROM v_serial_number_templates";
            if (!$include_inactive) {
                $sql .= " WHERE is_active = TRUE";
            }
            $sql .= " ORDER BY is_default DESC, name ASC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'templates' => $templates];

        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Create or update template
     */
    public function saveTemplate($template_id, $name, $description, $config, $is_default = false) {
        try {
            // Check if template exists
            $stmt = $this->db->prepare("SELECT id FROM serial_number_templates WHERE template_id = ?");
            $stmt->execute([$template_id]);
            $exists = $stmt->fetch();

            if ($exists) {
                // Update existing
                $stmt = $this->db->prepare("
                    UPDATE serial_number_templates 
                    SET name = ?, description = ?, config = ?, is_default = ?, updated_by = ?, updated_at = NOW()
                    WHERE template_id = ?
                ");
                $stmt->execute([$name, $description, json_encode($config), $is_default, $this->user_id, $template_id]);
            } else {
                // Create new
                $stmt = $this->db->prepare("
                    INSERT INTO serial_number_templates 
                    (template_id, name, description, config, is_default, created_by) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$template_id, $name, $description, json_encode($config), $is_default, $this->user_id]);
            }

            return ['success' => true, 'message' => 'Template saved successfully'];

        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Get serial number history
     */
    public function getSerialHistory($limit = 100, $template_id = null, $used_for = null) {
        try {
            $sql = "SELECT * FROM v_generated_serial_numbers WHERE 1=1";
            $params = [];

            if ($template_id) {
                $sql .= " AND template_id = ?";
                $params[] = $template_id;
            }

            if ($used_for) {
                $sql .= " AND used_for = ?";
                $params[] = $used_for;
            }

            $sql .= " ORDER BY generated_at DESC LIMIT ?";
            $params[] = (int)$limit;

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'history' => $history];

        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Validate serial number
     */
    public function validateSerial($serial_number) {
        try {
            $exists = $this->serialNumberExists($serial_number);
            $format_valid = preg_match('/^[A-Za-z0-9\-_\.]+$/', $serial_number);

            return [
                'success' => true,
                'is_unique' => !$exists,
                'format_valid' => (bool)$format_valid,
                'exists' => $exists
            ];

        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Build serial number from configuration
     */
    private function buildSerialNumber($config) {
        if (isset($config['customFormat']) && !empty($config['customFormat'])) {
            return $this->parseCustomFormat($config['customFormat']);
        }

        $parts = [];

        if (!empty($config['prefix'])) {
            $parts[] = $config['prefix'];
        }

        if ($config['includeDate'] ?? false) {
            $format = $config['dateFormat'] ?? 'Ymd';
            $parts[] = date($format);
        }

        if ($config['includeTime'] ?? false) {
            $format = $config['timeFormat'] ?? 'His';
            $parts[] = date($format);
        }

        if ($config['includeRandomNumbers'] ?? false) {
            $length = $config['randomNumberLength'] ?? 4;
            $min = pow(10, $length - 1);
            $max = pow(10, $length) - 1;
            $parts[] = rand($min, $max);
        }

        if (!empty($config['suffix'])) {
            $parts[] = $config['suffix'];
        }

        $separator = $config['separator'] ?? '-';
        return implode($separator, $parts);
    }

    /**
     * Parse custom format string
     */
    private function parseCustomFormat($format) {
        $result = $format;
        
        // Replace date placeholders
        $result = preg_replace_callback('/\{DATE:(.*?)\}/', function($matches) {
            return date($matches[1]);
        }, $result);
        
        // Replace time placeholders
        $result = preg_replace_callback('/\{TIME:(.*?)\}/', function($matches) {
            return date($matches[1]);
        }, $result);
        
        // Replace random number placeholders
        $result = preg_replace_callback('/\{RANDOM:(\d+)\}/', function($matches) {
            $length = (int)$matches[1];
            $min = pow(10, $length - 1);
            $max = pow(10, $length) - 1;
            return rand($min, $max);
        }, $result);
        
        // Replace other placeholders
        $result = str_replace('{TIMESTAMP}', time(), $result);
        $result = str_replace('{YEAR}', date('Y'), $result);
        $result = str_replace('{MONTH}', date('m'), $result);
        $result = str_replace('{DAY}', date('d'), $result);
        
        return $result;
    }

    /**
     * Check if serial number exists
     */
    private function serialNumberExists($serial_number) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM generated_serial_numbers WHERE serial_number = ?");
        $stmt->execute([$serial_number]);
        return $stmt->fetchColumn() > 0;
    }

    /**
     * Log audit trail
     */
    private function logAudit($operation, $serial_number, $template_id = null, $reference_table = null, $reference_id = null, $data = null) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO serial_number_audit 
                (operation_type, serial_number, template_id, reference_table, reference_id, performed_by, new_data, ip_address) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $operation,
                $serial_number,
                $template_id,
                $reference_table,
                $reference_id,
                $this->user_id,
                $data ? json_encode($data) : null,
                $_SERVER['REMOTE_ADDR'] ?? null
            ]);
        } catch (Exception $e) {
            // Log audit failures silently to avoid breaking main operations
            error_log("Audit log failed: " . $e->getMessage());
        }
    }
}

// Handle API requests
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    $user_id = $_SESSION['user_id'] ?? null; // Implement your authentication logic
    
    $api = new SerialNumberAPI($conn, $user_id);
    
    switch ($method) {
        case 'POST':
            $action = $input['action'] ?? '';
            
            switch ($action) {
                case 'generate':
                    $result = $api->generateSerial(
                        $input['template_id'],
                        $input['used_for'] ?? null,
                        $input['reference_id'] ?? null,
                        $input['reference_table'] ?? null
                    );
                    break;
                    
                case 'generate_batch':
                    $result = $api->generateBatch(
                        $input['template_id'],
                        $input['count'],
                        $input['purpose'] ?? null
                    );
                    break;
                    
                case 'use_serial':
                    $result = $api->useSerial(
                        $input['serial_number'],
                        $input['reference_id'],
                        $input['reference_table'],
                        $input['notes'] ?? null
                    );
                    break;
                    
                case 'save_template':
                    $result = $api->saveTemplate(
                        $input['template_id'],
                        $input['name'],
                        $input['description'],
                        $input['config'],
                        $input['is_default'] ?? false
                    );
                    break;
                    
                case 'validate':
                    $result = $api->validateSerial($input['serial_number']);
                    break;
                    
                default:
                    $result = ['success' => false, 'error' => 'Invalid action'];
            }
            break;
            
        case 'GET':
            $action = $_GET['action'] ?? '';
            
            switch ($action) {
                case 'templates':
                    $result = $api->getTemplates($_GET['include_inactive'] ?? false);
                    break;
                    
                case 'history':
                    $result = $api->getSerialHistory(
                        $_GET['limit'] ?? 100,
                        $_GET['template_id'] ?? null,
                        $_GET['used_for'] ?? null
                    );
                    break;
                    
                default:
                    $result = ['success' => false, 'error' => 'Invalid action'];
            }
            break;
            
        default:
            $result = ['success' => false, 'error' => 'Method not allowed'];
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
