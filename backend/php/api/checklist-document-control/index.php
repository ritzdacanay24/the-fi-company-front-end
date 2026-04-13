<?php
/**
 * Checklist Document Control API
 * 
 * Endpoints for creating and managing checklist documents and revisions
 * integrated with the quality documents system.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Get request method and action
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'create-document':
            if ($method !== 'POST') {
                throw new Exception('Method not allowed', 405);
            }
            handleCreateDocument($db);
            break;
            
        case 'create-revision':
            if ($method !== 'POST') {
                throw new Exception('Method not allowed', 405);
            }
            handleCreateRevision($db);
            break;
            
        case 'approve-revision':
            if ($method !== 'POST') {
                throw new Exception('Method not allowed', 405);
            }
            handleApproveRevision($db);
            break;
            
        case 'get-revision-history':
            if ($method !== 'GET') {
                throw new Exception('Method not allowed', 405);
            }
            handleGetRevisionHistory($db);
            break;
            
        default:
            throw new Exception('Invalid action', 400);
    }
} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Create a new checklist document with initial revision (Rev 1)
 */
function handleCreateDocument($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['prefix', 'title', 'department', 'category', 'template_id', 'created_by', 'revision_description'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            throw new Exception("Missing required field: {$field}", 400);
        }
    }
    
    // Prepare stored procedure call
    $stmt = $db->prepare("
        CALL CreateChecklistDocument(
            :prefix,
            :title,
            :description,
            :department,
            :category,
            :template_id,
            :created_by,
            :revision_description,
            @document_id,
            @document_number,
            @revision_id
        )
    ");
    
    // Bind parameters
    $stmt->bindParam(':prefix', $input['prefix']);
    $stmt->bindParam(':title', $input['title']);
    $stmt->bindParam(':description', $input['description']);
    $stmt->bindParam(':department', $input['department']);
    $stmt->bindParam(':category', $input['category']);
    $stmt->bindParam(':template_id', $input['template_id'], PDO::PARAM_INT);
    $stmt->bindParam(':created_by', $input['created_by']);
    $stmt->bindParam(':revision_description', $input['revision_description']);
    
    // Execute procedure
    $stmt->execute();
    
    // Get output parameters
    $result = $db->query("SELECT @document_id as document_id, @document_number as document_number, @revision_id as revision_id")->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'document_id' => (int)$result['document_id'],
        'document_number' => $result['document_number'],
        'revision_id' => (int)$result['revision_id'],
        'revision_number' => 1,
        'message' => "Document {$result['document_number']} created successfully with Rev 1"
    ]);
}

/**
 * Create a new revision for an existing checklist document
 */
function handleCreateRevision($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['document_id', 'template_id', 'revision_description', 'created_by'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            throw new Exception("Missing required field: {$field}", 400);
        }
    }
    
    // Prepare change data
    $items_added = $input['items_added'] ?? 0;
    $items_removed = $input['items_removed'] ?? 0;
    $items_modified = $input['items_modified'] ?? 0;
    $changes_detail = isset($input['changes_detail']) ? json_encode($input['changes_detail']) : null;
    $changes_summary = $input['changes_summary'] ?? '';
    
    // Generate changes summary if not provided
    if (empty($changes_summary)) {
        $parts = [];
        if ($items_added > 0) $parts[] = "Added {$items_added} item(s)";
        if ($items_removed > 0) $parts[] = "Removed {$items_removed} item(s)";
        if ($items_modified > 0) $parts[] = "Modified {$items_modified} item(s)";
        $changes_summary = implode(', ', $parts);
    }
    
    // Prepare stored procedure call
    $stmt = $db->prepare("
        CALL CreateChecklistRevision(
            :document_id,
            :template_id,
            :revision_description,
            :changes_summary,
            :items_added,
            :items_removed,
            :items_modified,
            :changes_detail,
            :created_by,
            @revision_id,
            @revision_number
        )
    ");
    
    // Bind parameters
    $stmt->bindParam(':document_id', $input['document_id'], PDO::PARAM_INT);
    $stmt->bindParam(':template_id', $input['template_id'], PDO::PARAM_INT);
    $stmt->bindParam(':revision_description', $input['revision_description']);
    $stmt->bindParam(':changes_summary', $changes_summary);
    $stmt->bindParam(':items_added', $items_added, PDO::PARAM_INT);
    $stmt->bindParam(':items_removed', $items_removed, PDO::PARAM_INT);
    $stmt->bindParam(':items_modified', $items_modified, PDO::PARAM_INT);
    $stmt->bindParam(':changes_detail', $changes_detail);
    $stmt->bindParam(':created_by', $input['created_by']);
    
    // Execute procedure
    $stmt->execute();
    
    // Get output parameters
    $result = $db->query("SELECT @revision_id as revision_id, @revision_number as revision_number")->fetch(PDO::FETCH_ASSOC);
    
    // Get document number
    $docStmt = $db->prepare("SELECT document_number FROM quality_documents WHERE id = ?");
    $docStmt->execute([$input['document_id']]);
    $doc = $docStmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'revision_id' => (int)$result['revision_id'],
        'revision_number' => (int)$result['revision_number'],
        'document_number' => $doc['document_number'],
        'message' => "{$doc['document_number']}, Rev {$result['revision_number']} created successfully (Pending Approval)"
    ]);
}

/**
 * Approve a checklist revision
 */
function handleApproveRevision($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($input['revision_id']) || !isset($input['approved_by'])) {
        throw new Exception('Missing required fields: revision_id, approved_by', 400);
    }
    
    // Prepare stored procedure call
    $stmt = $db->prepare("CALL ApproveChecklistRevision(:revision_id, :approved_by)");
    $stmt->bindParam(':revision_id', $input['revision_id'], PDO::PARAM_INT);
    $stmt->bindParam(':approved_by', $input['approved_by']);
    
    // Execute procedure
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => 'Revision approved successfully'
    ]);
}

/**
 * Get revision history for a document
 */
function handleGetRevisionHistory($db) {
    // Validate required parameter
    if (!isset($_GET['document_id'])) {
        throw new Exception('Missing required parameter: document_id', 400);
    }
    
    $documentId = (int)$_GET['document_id'];
    
    // Fetch revision history from the view
    $stmt = $db->prepare("
        SELECT 
            qr.id as revision_id,
            qr.revision_number,
            qr.description,
            qr.changes_summary,
            qr.items_added,
            qr.items_removed,
            qr.items_modified,
            qr.changes_detail,
            qr.status,
            qr.is_current,
            qr.created_by,
            qr.created_at,
            qr.approved_by,
            qr.approved_at,
            qr.template_id,
            ct.name as template_name
        FROM quality_revisions qr
        LEFT JOIN checklist_templates ct ON ct.id = qr.template_id
        WHERE qr.document_id = ?
        ORDER BY qr.revision_number DESC
    ");
    
    $stmt->execute([$documentId]);
    $revisions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Parse changes_detail JSON for each revision
    foreach ($revisions as &$revision) {
        if ($revision['changes_detail']) {
            // Parse JSON if it's a string
            if (is_string($revision['changes_detail'])) {
                $revision['changes_detail'] = json_decode($revision['changes_detail'], true);
            }
        }
    }
    
    echo json_encode($revisions);
}

