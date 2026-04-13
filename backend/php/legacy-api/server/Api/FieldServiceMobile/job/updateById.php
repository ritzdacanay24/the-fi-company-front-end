<?php
    use EyefiDb\Databases\DatabaseEyefi;
    use EyefiDb\Config\Protection;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    
    $protected = new Protection();
    $protectedResults = $protected->getProtected();
    $userInfo = $protectedResults->data;
    

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    function AuthUsers()
    {
        return (object) array(
            'edit' => array(
                'Ritz Dacanay',
                'Adriann Kamakahukilani',
                'Juvenal Torres',
                'Heidi Elya'
            )
        );
    }

     function authUserCheck($user_full_name,$accessSection)
    {
        if (in_array($user_full_name, $accessSection)) {
            return true;
        }
        return false;
    }

    try {  
        $db->beginTransaction();
        
        if (!authUserCheck( $userInfo->full_name, AuthUsers()->edit)) {
            throw new PDOException("Access Denied. ", 403);
        }


        $_POST = json_decode(file_get_contents("php://input"), true);

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

        $qry = dynamicUpdate($table, $_POST['job'], $_GET['id']);
        $query = $db->prepare($qry);
        $query->execute();

        $mainQry = "
            DELETE FROM fs_team
            where fs_det_id = :fs_det_id
        ";
        $query = $db->prepare($mainQry);
        $query->bindParam(':fs_det_id', $_GET['id'], PDO::PARAM_INT);
        $query->execute();
        
        if($_POST['resource']){
            foreach ($_POST['resource'] as $row) {
                $test = array(
                    "fs_det_id" => $_GET['id'],
                    "user" => $row['user'],
                    "user_rate" => ISSET($row['user_rate']) ? $row['user_rate'] : null,
                    "active" => 1,
                    "lead_tech" => $row['lead_tech'],
                    "contractor_code" => $row['contractor_code'],
                    "user_id" => ISSET($row['user_id']) ? $row['user_id'] : null
                );
                
                $qry = dynamicInsert("fs_team", $test);
                $query = $db->prepare($qry);
                $query->execute();
            }
        }

        // Log the changes to audit trail
        $auditSql = "
            INSERT INTO fs_audit_log 
            (fs_det_id, action, user_id, user_name, old_values, new_values, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $auditStmt = $db->prepare($auditSql);
        $auditStmt->execute([
            $_GET['id'],
            'update_job',
            $userInfo->id ?? null,
            $userInfo->full_name,
            json_encode([
                'job' => $oldJobData,
                'team' => $oldTeamData
            ]),
            json_encode([
                'job' => $_POST['job'],
                'team' => $_POST['resource']
            ]),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);

        $db->commit();

        echo $db_connect->json_encode($qry);

        
    } catch (Exception $e) {
        http_response_code(500);
        $db->rollBack();
        echo $db_connect->json_encode($e->getMessage());
        die();

    }
