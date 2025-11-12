<?php
/**
 * Document Control API
 * 
 * Handles enterprise document control system
 * - Document numbers (QA-FRM-373)
 * - Revisions (Rev 1.00, 2.00)
 * - Approval workflow
 * - Audit trail
 * 
 * @author The Fi Company
 * @date 2025-11-12
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

class DocumentControlAPI {
    private $conn;
    private $currentUser;
    
    public function __construct($db) {
        $this->conn = $db;
        // TODO: Get from session/JWT
        $this->currentUser = [
            'id' => $_SESSION['user_id'] ?? 1,
            'name' => $_SESSION['user_name'] ?? 'System User'
        ];
    }
    
    /**
     * Get next available document number
     * 
     * @param string $prefix - Document prefix (e.g., "QA-FRM")
     * @return array
     */
    public function getNextDocumentNumber($prefix) {
        try {
            $stmt = $this->conn->prepare("CALL GetNextDocumentNumber(?, @doc_number)");
            $stmt->execute([$prefix]);
            
            $result = $this->conn->query("SELECT @doc_number as document_number");
            $row = $result->fetch(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'document_number' => $row['document_number']
            ];
        } catch (Exception $e) {
            error_log("Error getting next document number: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Create a new document control entry
     * 
     * @param array $data - Document data
     * @return array
     */
    public function createDocument($data) {
        try {
            $this->conn->beginTransaction();
            
            // Get next document number if not provided
            if (!isset($data['document_number'])) {
                $prefix = $data['document_prefix'] ?? 'QA-FRM';
                $result = $this->getNextDocumentNumber($prefix);
                if (!$result['success']) {
                    throw new Exception('Failed to generate document number');
                }
                $data['document_number'] = $result['document_number'];
                
                // Extract sequence from document number
                preg_match('/-(\d+)$/', $data['document_number'], $matches);
                $data['document_sequence'] = isset($matches[1]) ? (int)$matches[1] : 0;
            }
            
            // Insert document control entry
            $sql = "INSERT INTO document_control (
                        document_number, 
                        document_prefix, 
                        document_sequence, 
                        document_title,
                        document_type,
                        category,
                        department,
                        current_revision,
                        document_owner_id,
                        document_owner_name,
                        created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $data['document_number'],
                $data['document_prefix'] ?? 'QA-FRM',
                $data['document_sequence'] ?? 0,
                $data['document_title'],
                $data['document_type'] ?? 'checklist',
                $data['category'] ?? 'quality_control',
                $data['department'] ?? 'Quality',
                '1.00', // Initial revision
                $data['document_owner_id'] ?? $this->currentUser['id'],
                $data['document_owner_name'] ?? $this->currentUser['name'],
                $this->currentUser['id']
            ]);
            
            $documentControlId = $this->conn->lastInsertId();
            
            $this->conn->commit();
            
            return [
                'success' => true,
                'document_control_id' => $documentControlId,
                'document_number' => $data['document_number']
            ];
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Error creating document: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Create a new revision for an existing document
     * 
     * @param array $data - Revision data
     * @return array
     */
    public function createRevision($data) {
        try {
            $this->conn->beginTransaction();
            
            // Call stored procedure to create revision
            $stmt = $this->conn->prepare("
                CALL CreateDocumentRevision(?, ?, ?, ?, ?, ?, @revision_id, @revision_number)
            ");
            
            $stmt->execute([
                $data['document_number'],
                $data['template_id'],
                $data['revision_type'] ?? 'major',
                $data['revision_description'],
                $this->currentUser['id'],
                $this->currentUser['name']
            ]);
            
            // Get output parameters
            $result = $this->conn->query("SELECT @revision_id as revision_id, @revision_number as revision_number");
            $row = $result->fetch(PDO::FETCH_ASSOC);
            
            $revisionId = $row['revision_id'];
            $revisionNumber = $row['revision_number'];
            
            // Update with additional details if provided
            if (isset($data['changes_summary']) || isset($data['reason_for_change'])) {
                $updateSql = "UPDATE document_revisions SET ";
                $updateParams = [];
                $updateFields = [];
                
                if (isset($data['changes_summary'])) {
                    $updateFields[] = "changes_summary = ?";
                    $updateParams[] = json_encode($data['changes_summary']);
                    
                    // Extract counts from changes_summary
                    if (isset($data['changes_summary']['items_added'])) {
                        $updateFields[] = "items_added = ?";
                        $updateParams[] = count($data['changes_summary']['items_added']);
                    }
                    if (isset($data['changes_summary']['items_removed'])) {
                        $updateFields[] = "items_removed = ?";
                        $updateParams[] = count($data['changes_summary']['items_removed']);
                    }
                    if (isset($data['changes_summary']['items_modified'])) {
                        $updateFields[] = "items_modified = ?";
                        $updateParams[] = count($data['changes_summary']['items_modified']);
                    }
                }
                
                if (isset($data['reason_for_change'])) {
                    $updateFields[] = "reason_for_change = ?";
                    $updateParams[] = $data['reason_for_change'];
                }
                
                if (!empty($updateFields)) {
                    $updateSql .= implode(', ', $updateFields) . " WHERE id = ?";
                    $updateParams[] = $revisionId;
                    
                    $updateStmt = $this->conn->prepare($updateSql);
                    $updateStmt->execute($updateParams);
                }
            }
            
            // Update checklist_templates with document control info
            $templateSql = "UPDATE checklist_templates 
                           SET document_number = ?,
                               revision_number = ?,
                               document_control_id = (
                                   SELECT id FROM document_control WHERE document_number = ?
                               )
                           WHERE id = ?";
            $templateStmt = $this->conn->prepare($templateSql);
            $templateStmt->execute([
                $data['document_number'],
                $revisionNumber,
                $data['document_number'],
                $data['template_id']
            ]);
            
            $this->conn->commit();
            
            return [
                'success' => true,
                'revision_id' => $revisionId,
                'revision_number' => $revisionNumber,
                'message' => "Created {$data['document_number']}, Rev {$revisionNumber} (Pending Approval)"
            ];
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Error creating revision: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Approve a revision
     * 
     * @param int $revisionId
     * @return array
     */
    public function approveRevision($revisionId) {
        try {
            $this->conn->beginTransaction();
            
            // Get revision details
            $stmt = $this->conn->prepare("
                SELECT document_number, revision_number, template_id, document_control_id
                FROM document_revisions
                WHERE id = ?
            ");
            $stmt->execute([$revisionId]);
            $revision = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$revision) {
                throw new Exception('Revision not found');
            }
            
            // Update revision status
            $sql = "UPDATE document_revisions 
                   SET status = 'approved',
                       approved_by = ?,
                       approved_by_name = ?,
                       approved_at = NOW(),
                       effective_date = CURDATE()
                   WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $this->currentUser['id'],
                $this->currentUser['name'],
                $revisionId
            ]);
            
            // Update document control to point to new revision
            $sql = "UPDATE document_control 
                   SET current_revision = ?,
                       current_template_id = ?,
                       status = 'approved'
                   WHERE document_number = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $revision['revision_number'],
                $revision['template_id'],
                $revision['document_number']
            ]);
            
            // Obsolete previous approved revisions
            $sql = "UPDATE document_revisions 
                   SET status = 'obsolete',
                       obsolete_date = CURDATE()
                   WHERE document_number = ?
                     AND id != ?
                     AND status = 'approved'";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $revision['document_number'],
                $revisionId
            ]);
            
            // Log the action
            $this->logAction(
                $revision['document_control_id'],
                $revision['document_number'],
                $revisionId,
                'approved',
                "Approved revision {$revision['revision_number']}"
            );
            
            $this->conn->commit();
            
            return [
                'success' => true,
                'message' => "Approved {$revision['document_number']}, Rev {$revision['revision_number']}"
            ];
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Error approving revision: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get document details with current revision
     * 
     * @param string $documentNumber
     * @return array
     */
    public function getDocument($documentNumber) {
        try {
            $sql = "SELECT 
                        dc.*,
                        dr.revision_description,
                        dr.approved_by_name,
                        dr.approved_at,
                        dr.effective_date,
                        ct.name as template_name
                    FROM document_control dc
                    LEFT JOIN document_revisions dr ON dr.id = (
                        SELECT id 
                        FROM document_revisions 
                        WHERE document_control_id = dc.id 
                        AND status = 'approved'
                        ORDER BY revision_major DESC, revision_minor DESC 
                        LIMIT 1
                    )
                    LEFT JOIN checklist_templates ct ON ct.id = dc.current_template_id
                    WHERE dc.document_number = ?";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$documentNumber]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) {
                return [
                    'success' => false,
                    'error' => 'Document not found'
                ];
            }
            
            return [
                'success' => true,
                'document' => $result
            ];
            
        } catch (Exception $e) {
            error_log("Error getting document: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get revision history for a document
     * 
     * @param string $documentNumber
     * @return array
     */
    public function getRevisionHistory($documentNumber) {
        try {
            $sql = "SELECT * FROM vw_revision_history
                    WHERE document_number = ?
                    ORDER BY revision_major DESC, revision_minor DESC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$documentNumber]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'revisions' => $results
            ];
            
        } catch (Exception $e) {
            error_log("Error getting revision history: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get audit log for a document
     * 
     * @param string $documentNumber
     * @return array
     */
    public function getAuditLog($documentNumber) {
        try {
            $sql = "SELECT * FROM document_audit_log
                    WHERE document_number = ?
                    ORDER BY performed_at DESC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$documentNumber]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'audit_log' => $results
            ];
            
        } catch (Exception $e) {
            error_log("Error getting audit log: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get list of active documents
     * 
     * @param array $filters
     * @return array
     */
    public function getActiveDocuments($filters = []) {
        try {
            $sql = "SELECT * FROM vw_active_documents WHERE 1=1";
            $params = [];
            
            if (isset($filters['department'])) {
                $sql .= " AND department = ?";
                $params[] = $filters['department'];
            }
            
            if (isset($filters['category'])) {
                $sql .= " AND category = ?";
                $params[] = $filters['category'];
            }
            
            $sql .= " ORDER BY document_number";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'documents' => $results
            ];
            
        } catch (Exception $e) {
            error_log("Error getting active documents: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Log an action to audit trail
     * 
     * @param int $documentControlId
     * @param string $documentNumber
     * @param int $revisionId
     * @param string $actionType
     * @param string $actionDescription
     */
    private function logAction($documentControlId, $documentNumber, $revisionId, $actionType, $actionDescription) {
        try {
            $sql = "INSERT INTO document_audit_log (
                        document_control_id,
                        document_number,
                        revision_id,
                        action_type,
                        action_description,
                        performed_by,
                        performed_by_name,
                        ip_address
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $documentControlId,
                $documentNumber,
                $revisionId,
                $actionType,
                $actionDescription,
                $this->currentUser['id'],
                $this->currentUser['name'],
                $_SERVER['REMOTE_ADDR'] ?? null
            ]);
        } catch (Exception $e) {
            error_log("Error logging action: " . $e->getMessage());
        }
    }
}

// Handle request
try {
    $database = new Database();
    $db = $database->getConnection();
    $api = new DocumentControlAPI($db);
    
    $method = $_SERVER['REQUEST_METHOD'];
    $request = $_SERVER['REQUEST_URI'];
    
    // Parse request
    $parts = explode('/', trim($request, '/'));
    $endpoint = end($parts);
    
    // Route requests
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        switch ($endpoint) {
            case 'next-number':
                $result = $api->getNextDocumentNumber($data['prefix']);
                break;
                
            case 'create-document':
                $result = $api->createDocument($data);
                break;
                
            case 'create-revision':
                $result = $api->createRevision($data);
                break;
                
            default:
                $result = ['success' => false, 'error' => 'Unknown endpoint'];
        }
    } 
    elseif ($method === 'PUT') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (preg_match('/approve\/(\d+)/', $request, $matches)) {
            $revisionId = $matches[1];
            $result = $api->approveRevision($revisionId);
        } else {
            $result = ['success' => false, 'error' => 'Unknown endpoint'];
        }
    }
    elseif ($method === 'GET') {
        if (preg_match('/document\/([A-Z\-0-9]+)\/revisions/', $request, $matches)) {
            $documentNumber = $matches[1];
            $result = $api->getRevisionHistory($documentNumber);
        }
        elseif (preg_match('/document\/([A-Z\-0-9]+)\/audit/', $request, $matches)) {
            $documentNumber = $matches[1];
            $result = $api->getAuditLog($documentNumber);
        }
        elseif (preg_match('/document\/([A-Z\-0-9]+)/', $request, $matches)) {
            $documentNumber = $matches[1];
            $result = $api->getDocument($documentNumber);
        }
        elseif (strpos($request, 'active-documents') !== false) {
            $filters = $_GET;
            $result = $api->getActiveDocuments($filters);
        }
        else {
            $result = ['success' => false, 'error' => 'Unknown endpoint'];
        }
    }
    else {
        $result = ['success' => false, 'error' => 'Method not allowed'];
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
