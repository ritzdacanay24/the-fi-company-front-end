<?php
/**
 * Org Chart Token API
 * Handles generation and validation of temporary access tokens for sharing org charts externally
 */


use EyefiDb\Databases\DatabaseEyefi;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class OrgChartTokenAPI {
    private $db;

    public function __construct($database) {
        $this->db = $database;
    }

    /**
     * Generate a new org chart share token
     */
    public function generateToken($data) {
        try {
            $password = isset($data['password']) ? $data['password'] : null;
            $expiryHours = isset($data['expiryHours']) ? intval($data['expiryHours']) : 24;
            $generatedBy = isset($data['userId']) ? intval($data['userId']) : null;

            // Generate unique token
            $token = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expiryHours} hours"));
            $passwordHash = $password ? password_hash($password, PASSWORD_BCRYPT) : null;

            // Store token in database
            $query = "INSERT INTO org_chart_tokens 
                      (token, password_hash, expires_at, generated_by, created_at) 
                      VALUES 
                      (?, ?, ?, ?, curDate())";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $token,
                $passwordHash,
                $expiresAt,
                $generatedBy
            ]);
            
            // Get the inserted ID
            $tokenIdQuery = "SELECT SCOPE_IDENTITY() as id";
            $tokenIdStmt = $this->db->query($tokenIdQuery);
            $tokenIdResult = $tokenIdStmt->fetch(\PDO::FETCH_ASSOC);
            $tokenId = $tokenIdResult['id'];
            
            // Generate shareable URL
            $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
            $host = $_SERVER['HTTP_HOST'];
            $shareUrl = "{$protocol}://{$host}/standalone/org-chart?token={$token}";
            
            return [
                'success' => true,
                'tokenId' => $tokenId,
                'token' => $token,
                'shareUrl' => $shareUrl,
                'expiresAt' => $expiresAt,
                'hasPassword' => !is_null($passwordHash)
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error generating token: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Validate a token
     */
    public function validateToken($token, $password = null) {
        try {
            if (empty($token)) {
                return [
                    'isValid' => false,
                    'error' => 'Token is required'
                ];
            }

            // Query token from database
            $query = "SELECT * FROM org_chart_tokens 
                      WHERE token = ? 
                      AND is_revoked = 0";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$token]);
            
            $tokenData = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$tokenData) {
                return [
                    'isValid' => false,
                    'error' => 'Invalid token'
                ];
            }

            // Check if expired
            $now = new \DateTime();
            $expiresAt = new \DateTime($tokenData['expires_at']);
            
            if ($now > $expiresAt) {
                return [
                    'isValid' => false,
                    'error' => 'Token expired'
                ];
            }

            // Check password if required
            if (!is_null($tokenData['password_hash'])) {
                if (is_null($password)) {
                    return [
                        'isValid' => false,
                        'requiresPassword' => true,
                        'error' => 'Password required'
                    ];
                }
                
                if (!password_verify($password, $tokenData['password_hash'])) {
                    return [
                        'isValid' => false,
                        'requiresPassword' => true,
                        'error' => 'Invalid password'
                    ];
                }
            }

            // Update access count
            $updateQuery = "UPDATE org_chart_tokens 
                            SET access_count = access_count + 1,
                                last_accessed_at = curDate()
                            WHERE id = ?";
            $updateStmt = $this->db->prepare($updateQuery);
            $updateStmt->execute([$tokenData['id']]);

            return [
                'isValid' => true,
                'expiresAt' => $tokenData['expires_at']
            ];
            
        } catch (\Exception $e) {
            return [
                'isValid' => false,
                'error' => 'Error validating token: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Revoke a token
     */
    public function revokeToken($tokenId) {
        try {
            $query = "UPDATE org_chart_tokens 
                      SET is_revoked = 1, 
                          revoked_at = curDate() 
                      WHERE id = ?";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$tokenId]);
            
            return [
                'success' => true,
                'message' => 'Token revoked successfully'
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error revoking token: ' . $e->getMessage()
            ];
        }
    }

    /**
     * List all active tokens
     */
    public function listTokens() {
        try {
            $query = "SELECT 
                        id,
                        LEFT(token, 10) as token_preview,
                        expires_at,
                        access_count,
                        last_accessed_at,
                        generated_by,
                        created_at,
                        CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END as has_password
                      FROM org_chart_tokens 
                      WHERE is_revoked = 0 
                      AND expires_at > curDate()
                      ORDER BY created_at DESC";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            
            $tokens = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            return [
                'tokens' => $tokens
            ];
            
        } catch (\Exception $e) {
            return [
                'error' => 'Error listing tokens: ' . $e->getMessage()
            ];
        }
    }
}

// Main execution
try {
    $db_connect = new DatabaseEyefi();
    $database = $db_connect->getConnection();
    
    $api = new OrgChartTokenAPI($database);
    
    $method = $_SERVER['REQUEST_METHOD'];
    $mode = isset($_GET['mode']) ? $_GET['mode'] : '';
    
    $result = null;
    
    switch ($method) {
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if ($mode === 'generate') {
                // Verify user is authenticated
                $headers = getallheaders();
                $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
                
                if (empty($authHeader)) {
                    http_response_code(401);
                    $result = ['error' => 'Unauthorized'];
                } else {
                    $result = $api->generateToken($data);
                }
            } elseif ($mode === 'revoke') {
                // Verify user is authenticated
                $headers = getallheaders();
                $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
                
                if (empty($authHeader)) {
                    http_response_code(401);
                    $result = ['error' => 'Unauthorized'];
                } else {
                    $result = $api->revokeToken($data['tokenId']);
                }
            } else {
                $result = [
                    'success' => false,
                    'error' => 'Invalid mode parameter'
                ];
            }
            break;
            
        case 'GET':
            if ($mode === 'validate') {
                $token = isset($_GET['token']) ? $_GET['token'] : '';
                $password = isset($_GET['password']) ? $_GET['password'] : null;
                $result = $api->validateToken($token, $password);
            } elseif ($mode === 'list') {
                // Verify user is authenticated
                $headers = getallheaders();
                $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
                
                if (empty($authHeader)) {
                    http_response_code(401);
                    $result = ['error' => 'Unauthorized'];
                } else {
                    $result = $api->listTokens();
                }
            } else {
                $result = [
                    'success' => false,
                    'error' => 'Invalid mode parameter'
                ];
            }
            break;
            
        default:
            http_response_code(405);
            $result = [
                'success' => false,
                'error' => 'Method not allowed'
            ];
    }
    
    echo json_encode($result);
    
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error: ' . $e->getMessage()
    ]);
}
?>
