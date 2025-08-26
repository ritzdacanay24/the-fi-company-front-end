<?php
/**
 * Quality Version Control API
 * Handles CRUD operations for quality documents and revisions
 * Supports the document numbering format: QA-FRM-202, rev2
 */

require_once '../../config/database.php';

class QualityVersionControlAPI {
    private $conn;
    private $database;
    
    public function __construct() {
        $this->database = new Database();
        $this->conn = $this->database->getConnection();
    }
    
    /**
     * Handle API requests
     */
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $request = $_GET['request'] ?? '';
        
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        if ($method === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        try {
            switch ($request) {
                // Document Management
                case 'getDocuments':
                    return $this->getDocuments();
                case 'getDocument':
                    return $this->getDocument($_GET['id'] ?? null);
                case 'createDocument':
                    return $this->createDocument();
                case 'updateDocument':
                    return $this->updateDocument($_GET['id'] ?? null);
                case 'deleteDocument':
                    return $this->deleteDocument($_GET['id'] ?? null);
                
                // Revision Management
                case 'getRevisions':
                    return $this->getRevisions($_GET['document_id'] ?? null);
                case 'createRevision':
                    return $this->createRevision();
                case 'approveRevision':
                    return $this->approveRevision($_GET['revision_id'] ?? null);
                case 'rejectRevision':
                    return $this->rejectRevision($_GET['revision_id'] ?? null);
                
                // Document Operations
                case 'approveDocument':
                    return $this->approveDocument($_GET['document_id'] ?? null);
                case 'markObsolete':
                    return $this->markObsolete($_GET['document_id'] ?? null);
                case 'generateDocumentNumber':
                    return $this->generateDocumentNumber($_GET['document_type'] ?? null, $_GET['department'] ?? null);
                
                // Search and Statistics
                case 'searchDocuments':
                    return $this->searchDocuments();
                case 'getStats':
                    return $this->getStats();
                case 'getDepartments':
                    return $this->getDepartments();
                
                // Export
                case 'exportDocument':
                    return $this->exportDocument($_GET['document_id'] ?? null, $_GET['format'] ?? 'pdf');
                
                default:
                    return ['error' => 'Invalid request: ' . $request];
            }
        } catch (Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }
    
    
    // ==============================================
    // Document Management Methods
    // ==============================================
    
    /**
     * Get all quality documents with optional filters
     */
    public function getDocuments() {
        $searchTerm = $_GET['search'] ?? '';
        $status = $_GET['status'] ?? '';
        $department = $_GET['department'] ?? '';
        $type = $_GET['type'] ?? '';
        $category = $_GET['category'] ?? '';
        
        $sql = "SELECT * FROM quality_document_summary WHERE 1=1";
        $params = [];
        
        if (!empty($searchTerm)) {
            $sql .= " AND (document_number LIKE ? OR title LIKE ? OR description LIKE ?)";
            $params[] = "%{$searchTerm}%";
            $params[] = "%{$searchTerm}%";
            $params[] = "%{$searchTerm}%";
        }
        
        if (!empty($status)) {
            $sql .= " AND status = ?";
            $params[] = $status;
        }
        
        if (!empty($department)) {
            $sql .= " AND department = ?";
            $params[] = $department;
        }
        
        if (!empty($type)) {
            $sql .= " AND prefix LIKE ?";
            $params[] = "%-{$type}";
        }
        
        if (!empty($category)) {
            // Map category to document types for filtering
            $typeMap = [
                'quality_control' => ['FRM', 'CHK', 'QCP'],
                'process' => ['SOP', 'WI'],
                'training' => ['INS'],
                'safety' => ['SOP', 'INS'],
                'compliance' => ['FRM', 'SOP']
            ];
            
            if (isset($typeMap[$category])) {
                $typeConditions = [];
                foreach ($typeMap[$category] as $categoryType) {
                    $typeConditions[] = "prefix LIKE ?";
                    $params[] = "%-{$categoryType}";
                }
                $sql .= " AND (" . implode(' OR ', $typeConditions) . ")";
            }
        }
        
        $sql .= " ORDER BY updated_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getDocument($id) {
        if (!$id) {
            return ['error' => 'Document ID is required'];
        }
        
        $stmt = $this->conn->prepare("SELECT * FROM quality_document_summary WHERE id = ?");
        $stmt->execute([$id]);
        
        $document = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$document) {
            return ['error' => 'Document not found'];
        }
        
        return $document;
    }
    
    public function createDocument() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            return ['error' => 'Invalid JSON data'];
        }
        
        // Validate required fields
        $requiredFields = ['document_type', 'title', 'category', 'department', 'initial_revision'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                return ['error' => "Missing required field: {$field}"];
            }
        }
        
        // Validate initial revision fields
        $requiredRevisionFields = ['title', 'change_description', 'effective_date'];
        foreach ($requiredRevisionFields as $field) {
            if (empty($data['initial_revision'][$field])) {
                return ['error' => "Missing required revision field: {$field}"];
            }
        }
        
        $this->conn->beginTransaction();
        
        try {
            // Create document prefix based on document type
            $prefix = "QA-{$data['document_type']}";
            
            // Use stored procedure if available, otherwise manual insert
            if ($this->procedureExists('CreateDocumentWithRevision')) {
                $stmt = $this->conn->prepare("CALL CreateDocumentWithRevision(?, ?, ?, ?, ?, @document_id, @document_number)");
                $stmt->execute([
                    $prefix,
                    $data['title'],
                    $data['description'] ?? '',
                    $data['department'],
                    $data['created_by'] ?? 1
                ]);
                
                // Get the output parameters
                $stmt = $this->conn->query("SELECT @document_id as document_id, @document_number as document_number");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                $documentId = $result['document_id'];
                $documentNumber = $result['document_number'];
            } else {
                // Manual document creation
                $documentNumber = $this->generateNextDocumentNumber($prefix);
                
                $stmt = $this->conn->prepare("
                    INSERT INTO quality_documents (document_number, prefix, title, description, department, status, created_by) 
                    VALUES (?, ?, ?, ?, ?, 'draft', ?)
                ");
                $stmt->execute([
                    $documentNumber,
                    $prefix,
                    $data['title'],
                    $data['description'] ?? '',
                    $data['department'],
                    $data['created_by'] ?? 1
                ]);
                
                $documentId = $this->conn->lastInsertId();
                
                // Create initial revision
                $stmt = $this->conn->prepare("
                    INSERT INTO quality_revisions (document_id, revision_number, title, description, change_description, effective_date, created_by, status, is_current) 
                    VALUES (?, 1, ?, ?, ?, ?, ?, 'draft', 1)
                ");
                $stmt->execute([
                    $documentId,
                    $data['initial_revision']['title'],
                    $data['initial_revision']['description'] ?? '',
                    $data['initial_revision']['change_description'],
                    $data['initial_revision']['effective_date'],
                    $data['created_by'] ?? 1
                ]);
            }
            
            $this->conn->commit();
            
            return [
                'success' => true,
                'message' => 'Document created successfully',
                'document_id' => $documentId,
                'document_number' => $documentNumber
            ];
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    public function updateDocument($id) {
        if (!$id) {
            return ['error' => 'Document ID is required'];
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            return ['error' => 'Invalid JSON data'];
        }
        
        $updateFields = [];
        $params = [];
        
        // Build dynamic update query based on provided fields
        $allowedFields = ['title', 'description', 'department'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateFields[] = "{$field} = ?";
                $params[] = $data[$field];
            }
        }
        
        if (empty($updateFields)) {
            return ['error' => 'No valid fields to update'];
        }
        
        $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
        $params[] = $id;
        
        $sql = "UPDATE quality_documents SET " . implode(', ', $updateFields) . " WHERE id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        
        return [
            'success' => true,
            'message' => 'Document updated successfully'
        ];
    }
    
    public function deleteDocument($id) {
        if (!$id) {
            return ['error' => 'Document ID is required'];
        }
        
        // Check if document has active revisions
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as revision_count 
            FROM quality_revisions 
            WHERE document_id = ? AND status NOT IN ('obsolete', 'superseded')
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['revision_count'] > 0) {
            return [
                'error' => 'Cannot delete document with active revisions. Please mark as obsolete instead.',
                'active_revisions' => $result['revision_count']
            ];
        }
        
        $this->conn->beginTransaction();
        
        try {
            // Soft delete - mark as obsolete instead of hard delete to preserve audit trail
            $stmt = $this->conn->prepare("
                UPDATE quality_documents 
                SET status = 'obsolete', 
                    obsoleted_at = CURRENT_TIMESTAMP,
                    obsolete_reason = 'Document deleted'
                WHERE id = ?
            ");
            $stmt->execute([$id]);
            
            $this->conn->commit();
            
            return [
                'success' => true,
                'message' => 'Document marked as obsolete'
            ];
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    
    // ==============================================
    // Revision Management Methods
    // ==============================================
    
    public function getRevisions($documentId) {
        if (!$documentId) {
            return ['error' => 'Document ID is required'];
        }
        
        $stmt = $this->conn->prepare("
            SELECT r.*, u.name as created_by_name, a.name as approved_by_name
            FROM quality_revisions r
            LEFT JOIN users u ON r.created_by = u.id
            LEFT JOIN users a ON r.approved_by = a.id
            WHERE r.document_id = ? 
            ORDER BY r.revision_number DESC
        ");
        $stmt->execute([$documentId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function createRevision() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            return ['error' => 'Invalid JSON data'];
        }
        
        // Validate required fields
        $requiredFields = ['document_id', 'title', 'change_description', 'effective_date'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                return ['error' => "Missing required field: {$field}"];
            }
        }
        
        $this->conn->beginTransaction();
        
        try {
            if ($this->procedureExists('CreateNewRevision')) {
                $stmt = $this->conn->prepare("CALL CreateNewRevision(?, ?, ?, @revision_number)");
                $stmt->execute([
                    $data['document_id'],
                    $data['description'] ?? '',
                    $data['created_by'] ?? 1
                ]);
                
                $stmt = $this->conn->query("SELECT @revision_number as revision_number");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $revisionNumber = $result['revision_number'];
            } else {
                // Manual revision creation
                // Get next revision number
                $stmt = $this->conn->prepare("
                    SELECT COALESCE(MAX(revision_number), 0) + 1 as next_revision
                    FROM quality_revisions 
                    WHERE document_id = ?
                ");
                $stmt->execute([$data['document_id']]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $revisionNumber = $result['next_revision'];
                
                // Mark current revision as not current
                $stmt = $this->conn->prepare("
                    UPDATE quality_revisions 
                    SET is_current = 0 
                    WHERE document_id = ? AND is_current = 1
                ");
                $stmt->execute([$data['document_id']]);
                
                // Insert new revision
                $stmt = $this->conn->prepare("
                    INSERT INTO quality_revisions (document_id, revision_number, title, description, change_description, effective_date, created_by, status, is_current) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1)
                ");
                $stmt->execute([
                    $data['document_id'],
                    $revisionNumber,
                    $data['title'],
                    $data['description'] ?? '',
                    $data['change_description'],
                    $data['effective_date'],
                    $data['created_by'] ?? 1
                ]);
            }
            
            $this->conn->commit();
            
            return [
                'success' => true,
                'message' => 'Revision created successfully',
                'revision_number' => $revisionNumber
            ];
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    public function approveRevision($revisionId) {
        if (!$revisionId) {
            return ['error' => 'Revision ID is required'];
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $approvedBy = $data['approved_by'] ?? 1;
        
        $this->conn->beginTransaction();
        
        try {
            if ($this->procedureExists('ApproveRevision')) {
                $stmt = $this->conn->prepare("CALL ApproveRevision(?, ?)");
                $stmt->execute([$revisionId, $approvedBy]);
            } else {
                // Manual approval
                $stmt = $this->conn->prepare("
                    UPDATE quality_revisions 
                    SET status = 'approved', 
                        approved_by = ?, 
                        approved_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $stmt->execute([$approvedBy, $revisionId]);
                
                // Update document status
                $stmt = $this->conn->prepare("
                    UPDATE quality_documents d
                    INNER JOIN quality_revisions r ON d.id = r.document_id
                    SET d.status = 'approved', d.approved_by = ?, d.approved_at = CURRENT_TIMESTAMP
                    WHERE r.id = ?
                ");
                $stmt->execute([$approvedBy, $revisionId]);
            }
            
            $this->conn->commit();
            
            return [
                'success' => true,
                'message' => 'Revision approved successfully'
            ];
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    public function rejectRevision($revisionId) {
        if (!$revisionId) {
            return ['error' => 'Revision ID is required'];
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $rejectedBy = $data['rejected_by'] ?? 1;
        $reason = $data['reason'] ?? '';
        
        $stmt = $this->conn->prepare("
            UPDATE quality_revisions 
            SET status = 'rejected', 
                rejected_by = ?, 
                rejected_at = CURRENT_TIMESTAMP,
                rejection_reason = ?
            WHERE id = ?
        ");
        $stmt->execute([$rejectedBy, $reason, $revisionId]);
        
        return [
            'success' => true,
            'message' => 'Revision rejected'
        ];
    }
    
    // ==============================================
    // Document Operations Methods
    // ==============================================
    
    public function approveDocument($documentId) {
        if (!$documentId) {
            return ['error' => 'Document ID is required'];
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $approvedBy = $data['approved_by'] ?? 1;
        
        $this->conn->beginTransaction();
        
        try {
            if ($this->procedureExists('ApproveDocument')) {
                $stmt = $this->conn->prepare("CALL ApproveDocument(?, ?)");
                $stmt->execute([$documentId, $approvedBy]);
            } else {
                $stmt = $this->conn->prepare("
                    UPDATE quality_documents 
                    SET status = 'approved', 
                        approved_by = ?, 
                        approved_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $stmt->execute([$approvedBy, $documentId]);
            }
            
            $this->conn->commit();
            
            return [
                'success' => true,
                'message' => 'Document approved successfully'
            ];
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    public function markObsolete($documentId) {
        if (!$documentId) {
            return ['error' => 'Document ID is required'];
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $this->conn->prepare("
            UPDATE quality_documents 
            SET status = 'obsolete', 
                obsoleted_by = ?, 
                obsoleted_at = CURRENT_TIMESTAMP,
                obsolete_reason = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            $data['obsoleted_by'] ?? 1,
            $data['reason'] ?? '',
            $documentId
        ]);
        
        return [
            'success' => true,
            'message' => 'Document marked as obsolete'
        ];
    }
    
    public function generateDocumentNumber($documentType, $department = null) {
        if (!$documentType) {
            return ['error' => 'Document type is required'];
        }
        
        $prefix = "QA-{$documentType}";
        
        try {
            $stmt = $this->conn->prepare("
                SELECT CONCAT(?, '-', LPAD(current_number + 1, 3, '0')) as next_number
                FROM quality_document_sequences 
                WHERE prefix = ?
            ");
            $stmt->execute([$prefix, $prefix]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) {
                // Create sequence if it doesn't exist
                $stmt = $this->conn->prepare("
                    INSERT INTO quality_document_sequences (prefix, current_number) 
                    VALUES (?, 0)
                ");
                $stmt->execute([$prefix]);
                
                return [
                    'document_number' => "{$prefix}-001",
                    'formatted' => "{$prefix}-001, rev1"
                ];
            }
            
            return [
                'document_number' => $result['next_number'],
                'formatted' => "{$result['next_number']}, rev1"
            ];
            
        } catch (Exception $e) {
            return ['error' => 'Error generating document number: ' . $e->getMessage()];
        }
    }
    
    
    // ==============================================
    // Search and Statistics Methods
    // ==============================================
    
    public function searchDocuments() {
        $query = $_GET['q'] ?? '';
        $status = $_GET['status'] ?? '';
        $department = $_GET['department'] ?? '';
        $limit = $_GET['limit'] ?? 50;
        
        if (empty($query)) {
            return ['error' => 'Search query is required'];
        }
        
        $sql = "
            SELECT d.*, r.description as current_revision_description
            FROM quality_documents d
            LEFT JOIN quality_revisions r ON d.id = r.document_id AND r.is_current = TRUE
            WHERE (d.document_number LIKE ? OR d.title LIKE ? OR d.description LIKE ?)
        ";
        
        $params = ["%{$query}%", "%{$query}%", "%{$query}%"];
        
        if (!empty($status)) {
            $sql .= " AND d.status = ?";
            $params[] = $status;
        }
        
        if (!empty($department)) {
            $sql .= " AND d.department = ?";
            $params[] = $department;
        }
        
        $sql .= " ORDER BY d.updated_at DESC LIMIT ?";
        $params[] = (int)$limit;
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getStats() {
        $stats = [];
        
        // Total documents by status
        $stmt = $this->conn->query("
            SELECT status, COUNT(*) as count 
            FROM quality_documents 
            GROUP BY status
        ");
        $stats['by_status'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Total documents by department
        $stmt = $this->conn->query("
            SELECT department, COUNT(*) as count 
            FROM quality_documents 
            GROUP BY department
        ");
        $stats['by_department'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Total documents by type (extracted from prefix)
        $stmt = $this->conn->query("
            SELECT 
                SUBSTRING_INDEX(prefix, '-', -1) as document_type,
                COUNT(*) as count 
            FROM quality_documents 
            GROUP BY SUBSTRING_INDEX(prefix, '-', -1)
        ");
        $stats['by_type'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Recent activity (if audit table exists)
        if ($this->tableExists('document_audit_trail')) {
            $stmt = $this->conn->query("
                SELECT * FROM document_audit_trail 
                ORDER BY action_date DESC 
                LIMIT 10
            ");
            $stats['recent_activity'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Pending approvals
        $stmt = $this->conn->query("
            SELECT COUNT(*) as count 
            FROM quality_documents 
            WHERE status IN ('draft', 'review')
        ");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['pending_approvals'] = $result['count'];
        
        // Document count by month (last 12 months)
        $stmt = $this->conn->query("
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as count
            FROM quality_documents 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month
        ");
        $stats['monthly_creation'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $stats;
    }
    
    public function getDepartments() {
        $stmt = $this->conn->query("
            SELECT DISTINCT department 
            FROM quality_documents 
            WHERE department IS NOT NULL AND department != ''
            ORDER BY department
        ");
        
        $result = $stmt->fetchAll(PDO::FETCH_COLUMN);
        return $result;
    }
    
    // ==============================================
    // Export Methods
    // ==============================================
    
    public function exportDocument($documentId, $format) {
        if (!$documentId) {
            return ['error' => 'Document ID is required'];
        }
        
        // Get document details
        $document = $this->getDocument($documentId);
        if (isset($document['error'])) {
            return $document;
        }
        
        // Get revisions
        $revisions = $this->getRevisions($documentId);
        
        switch (strtolower($format)) {
            case 'json':
                return [
                    'success' => true,
                    'data' => [
                        'document' => $document,
                        'revisions' => $revisions
                    ],
                    'filename' => "{$document['document_number']}_rev{$document['current_revision']}.json"
                ];
                
            case 'pdf':
                // This would require a PDF generation library
                return ['error' => 'PDF export not yet implemented'];
                
            case 'excel':
                // This would require an Excel generation library
                return ['error' => 'Excel export not yet implemented'];
                
            default:
                return ['error' => 'Unsupported export format'];
        }
    }
    
    // ==============================================
    // Helper Methods
    // ==============================================
    
    private function procedureExists($procedureName) {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as count
            FROM information_schema.routines 
            WHERE routine_schema = DATABASE() 
            AND routine_name = ? 
            AND routine_type = 'PROCEDURE'
        ");
        $stmt->execute([$procedureName]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'] > 0;
    }
    
    private function tableExists($tableName) {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as count
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = ?
        ");
        $stmt->execute([$tableName]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'] > 0;
    }
    
    private function generateNextDocumentNumber($prefix) {
        // Get current sequence number
        $stmt = $this->conn->prepare("
            SELECT current_number 
            FROM quality_document_sequences 
            WHERE prefix = ?
        ");
        $stmt->execute([$prefix]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            // Create new sequence
            $stmt = $this->conn->prepare("
                INSERT INTO quality_document_sequences (prefix, current_number) 
                VALUES (?, 1)
            ");
            $stmt->execute([$prefix]);
            return "{$prefix}-001";
        }
        
        // Update sequence
        $nextNumber = $result['current_number'] + 1;
        $stmt = $this->conn->prepare("
            UPDATE quality_document_sequences 
            SET current_number = ? 
            WHERE prefix = ?
        ");
        $stmt->execute([$nextNumber, $prefix]);
        
        return $prefix . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }
}

// Initialize and handle request
$api = new QualityVersionControlAPI();
$result = $api->handleRequest();

// Output the result
echo json_encode($result);
?>
