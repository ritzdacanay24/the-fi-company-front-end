<?php
    use EyefiDb\Databases\DatabaseEyefi;
    use EyefiDb\Config\Protection;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    
    $protected = new Protection();
    $protectedResults = $protected->getProtected();
    $userInfo = $protectedResults->data;

    try {
        // Get audit log for a specific field service job
        $fs_det_id = $_GET['id'] ?? null;
        
        if (!$fs_det_id) {
            throw new Exception("Field service ID is required");
        }

        $sql = "
            SELECT 
                id,
                fs_det_id,
                action,
                user_id,
                user_name,
                old_values,
                new_values,
                ip_address,
                created_at
            FROM fs_audit_log
            WHERE fs_det_id = :fs_det_id
            ORDER BY created_at DESC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':fs_det_id', $fs_det_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $auditLog = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode JSON fields for easier consumption
        foreach ($auditLog as &$entry) {
            $entry['old_values'] = json_decode($entry['old_values'], true);
            $entry['new_values'] = json_decode($entry['new_values'], true);
        }
        
        echo $db_connect->json_encode([
            'success' => true,
            'audit_log' => $auditLog,
            'count' => count($auditLog)
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo $db_connect->json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
