<?php
    use EyefiDb\Databases\DatabaseEyefi;
    use EyefiDb\Config\Protection;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    $protected = new Protection();
    $protectedResults = $protected->getProtected();
    $userInfo = $protectedResults->data;

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    try {
        $db->beginTransaction();

        $table = 'fs_team';

        // Capture old values for audit log
        $oldQuery = $db->prepare("SELECT * FROM fs_team WHERE id = :id");
        $oldQuery->bindParam(':id', $_GET['id'], PDO::PARAM_INT);
        $oldQuery->execute();
        $oldData = $oldQuery->fetch(PDO::FETCH_ASSOC);

        $qry = dynamicDeleteById($table, $_GET['id']);
        
        $query = $db->prepare($qry);
        $query->execute();

        // Log the deletion to audit trail
        $auditSql = "
            INSERT INTO fs_audit_log 
            (fs_det_id, action, user_id, user_name, old_values, new_values, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $auditStmt = $db->prepare($auditSql);
        $auditStmt->execute([
            $oldData['fs_det_id'] ?? null,
            'delete_team_member',
            $userInfo->id ?? null,
            $userInfo->full_name ?? 'Unknown',
            json_encode($oldData),
            null,
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);

        $db->commit();

        echo $db_connect->json_encode(['success' => true, 'deleted_id' => $_GET['id']]);

    } catch (Exception $e) {
        http_response_code(500);
        $db->rollBack();
        echo $db_connect->json_encode($e->getMessage());
        die();
    }