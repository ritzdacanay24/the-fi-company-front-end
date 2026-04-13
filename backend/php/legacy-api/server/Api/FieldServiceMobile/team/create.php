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

        $_POST = json_decode(file_get_contents("php://input"), true);

        $table = 'fs_team';

        $qry = dynamicInsert($table, $_POST);
        
        $query = $db->prepare($qry);
        $query->execute();

        $newId = $db->lastInsertId();

        // Log the creation to audit trail
        $auditSql = "
            INSERT INTO fs_audit_log 
            (fs_det_id, action, user_id, user_name, old_values, new_values, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $auditStmt = $db->prepare($auditSql);
        $auditStmt->execute([
            $_POST['fs_det_id'] ?? null,
            'create_team_member',
            $userInfo->id ?? null,
            $userInfo->full_name ?? 'Unknown',
            null,
            json_encode($_POST),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);

        $db->commit();

        $_POST['id'] = $newId;
        echo $db_connect->json_encode($_POST);

    } catch (Exception $e) {
        http_response_code(500);
        $db->rollBack();
        echo $db_connect->json_encode($e->getMessage());
        die();
    }
