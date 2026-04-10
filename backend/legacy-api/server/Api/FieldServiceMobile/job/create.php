<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

    use EyefiDb\Config\Protection;

    $protected = new Protection();
    $protectedResults = $protected->getProtected();
    $userInfo = $protectedResults->data;

    $_POST = json_decode(file_get_contents("php://input"), true);

    $database->pdo->beginTransaction();

    try {  


        $database->insert("fs_scheduler", $_POST['job']);
        
        $last_id = $database->id();
        
        if($_POST['resource']){
            foreach ($_POST['resource'] as $row) {
                $test = array(
                    "fs_det_id" => $last_id,
                    "user" => $row['user'],
                    "user_rate" => ISSET($row['user_rate']) ? $row['user_rate'] : null,
                    "active" => 1,
                    "lead_tech" => $row['lead_tech'],
                    "contractor_code" => $row['contractor_code'],
                    "user_id" => ISSET($row['user_id']) ? $row['user_id'] : null
                );                
                 $database->insert("fs_team", $test);
            }
        }

        // Log the creation to audit trail
        $auditStmt = $database->pdo->prepare("
            INSERT INTO fs_audit_log 
            (fs_det_id, action, user_id, user_name, old_values, new_values, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $auditStmt->execute([
            $last_id,
            'create_job',
            $userInfo->id ?? null,
            $userInfo->full_name ?? 'Unknown',
            null,
            json_encode([
                'job' => $_POST['job'],
                'team' => $_POST['resource']
            ]),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);

        $database->pdo->commit();

        echo json_encode(array("insertId" => $last_id));

    } catch (Exception $e) {
        $database->pdo->rollBack();
        http_response_code(500);
        die();
    }


