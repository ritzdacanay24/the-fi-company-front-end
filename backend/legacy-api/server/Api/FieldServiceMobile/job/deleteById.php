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

        $table = 'fs_scheduler';

        // Capture old values for audit log
        $oldJobQuery = $db->prepare("SELECT * FROM fs_scheduler WHERE id = :id");
        $oldJobQuery->bindParam(':id', $_GET['id'], PDO::PARAM_INT);
        $oldJobQuery->execute();
        $oldJobData = $oldJobQuery->fetch(PDO::FETCH_ASSOC);

        $oldTeamQuery = $db->prepare("SELECT * FROM fs_team WHERE fs_det_id = :fs_det_id");
        $oldTeamQuery->bindParam(':fs_det_id', $_GET['id'], PDO::PARAM_INT);
        $oldTeamQuery->execute();
        $oldTeamData = $oldTeamQuery->fetchAll(PDO::FETCH_ASSOC);

        // Delete team members first
        $deleteTeamQry = "DELETE FROM fs_team WHERE fs_det_id = :fs_det_id";
        $deleteTeamStmt = $db->prepare($deleteTeamQry);
        $deleteTeamStmt->bindParam(':fs_det_id', $_GET['id'], PDO::PARAM_INT);
        $deleteTeamStmt->execute();

        // Delete the job
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
            $_GET['id'],
            'delete_job',
            $userInfo->id ?? null,
            $userInfo->full_name ?? 'Unknown',
            json_encode([
                'job' => $oldJobData,
                'team' => $oldTeamData
            ]),
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