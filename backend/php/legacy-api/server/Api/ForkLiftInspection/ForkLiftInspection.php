<?php

namespace EyefiDb\Api\ForkLiftInspection;

use PDO;
use PDOException;

use PHPMailer\PHPMailer\PHPMailer;


class ForkLiftInspection
{

    protected $db;
    public $nowDate;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAll()
    {
        $q = "
            SELECT a.id 
                , a.date_created 
                , a.department 
                , a.operator 
                , a.model_number 
                , a.shift 
                , a.comments 
                , b.okStatus
                , b.hits
            FROM forms.forklift_checklist a
            left join (
                select forklift_checklist_id
                    , count(*) hits 
                    , sum(case status = 1 then 1 ELSE 0 END ) okStatus
                    , sum(case status = 0 then 1 ELSE 0 END ) need_maint
                FROM forms.forklift_checklist_details
                GROUP BY forklift_checklist_id
            ) b ON b.forklift_checklist_id = a.id 
            ORDER BY a.date_created DESC
        ";
        $query = $this->db->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function searchHeaderById($id)
    {
        $q = "
            SELECT * 
            FROM forms.forklift_checklist
            where id = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function searchDetailsById($id)
    {
        $q = "
            SELECT * 
            FROM forms.forklift_checklist_details
            where forklift_checklist_id = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getDetailsByGroup($id)
    {
        $q = "
            SELECT group_name name
            FROM forms.forklift_checklist_details
            where forklift_checklist_id = :id
            GROUP BY group_name
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function searchById($id)
    {

        $main = $this->searchHeaderById($id);
        $objDetails = $this->searchDetailsById($id);
        $objGroups = $this->getDetailsByGroup($id);

        $group = array();
        foreach ($objGroups as $row) {
            $group[] = array(
                "name" => $row['name']
            );
        }

        foreach ($group as &$row) {
            foreach ($objDetails as $objDetails1) {
                if ($row['name'] == $objDetails1['group_name']) {
                    $row['details'][] = array(
                        "name" =>  $objDetails1['checklist_name'],
                        "status" =>  $objDetails1['status']
                    );
                }
            }
        }
        

        return array(
            "main" => $main,
            "details" => $group
        );
    }

    public function insertHeader($data)
    {
        $q = "
            INSERT INTO forms.forklift_checklist (
                date_created 
                , department
                , operator
                , model_number 
                , shift 
                , comments
            ) VALUES (
                :date_created 
                , :department
                , :operator
                , :model_number 
                , :shift 
                , :comments
            )
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':date_created', $data['date_created'], PDO::PARAM_STR);
        $query->bindParam(':department', $data['department'], PDO::PARAM_STR);
        $query->bindParam(':operator', $data['operator'], PDO::PARAM_STR);
        $query->bindParam(':model_number', $data['model_number'], PDO::PARAM_STR);
        $query->bindParam(':shift', $data['shift'], PDO::PARAM_STR);
        $query->bindParam(':comments', $data['comments'], PDO::PARAM_STR);
        $query->execute();

        return $this->db->lastInsertId();
    }

    public function insertDetails($data)
    {
        $q = "
            INSERT INTO forms.forklift_checklist_details (
                group_name 
                , checklist_name
                , status
                , forklift_checklist_id
            ) VALUES (
                :group_name 
                , :checklist_name 
                , :status
                , :forklift_checklist_id
            )
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':group_name', $data['group_name'], PDO::PARAM_STR);
        $query->bindParam(':checklist_name', $data['checklist_name'], PDO::PARAM_STR);
        $query->bindParam(':status', $data['status'], PDO::PARAM_STR);
        $query->bindParam(':forklift_checklist_id', $data['forklift_checklist_id'], PDO::PARAM_INT);
        $query->execute();
        return $this->db->lastInsertId();
    }

    public function sendEmailAboutIssues($callBackUrl, $lastId, $failedItems = [], $headerData = [])
    {
        //$to = "ritz.dacanay@the-fi-company.com, darren.mcgraw@the-fi-company.com";
        //$to = "EYEFILOGISTICS@THE-FI-COMPANY.COM";
        $emailUsers         = emailNotification('create_forklift_inspection');

        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
        $mail->Subject = "Forklift Checklist Submission Id# " . $lastId;

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }
                

        $link = "https://dashboard.eye-fi.com/dist/web/operations/forms/forklift-inspection/edit?id=" . $lastId;

        $mail->Body = '<html><body>';
        $mail->Body .= '<p>Hello Team,</p>';
        $mail->Body .= '<p>A new forklift checklist has been submitted and requires your immediate attention.</p>';
        
        // Include basic inspection details
        if (!empty($headerData)) {
            $mail->Body .= '<h3>Inspection Details:</h3>';
            $mail->Body .= '<p>';
            if (!empty($headerData['operator'])) {
                $mail->Body .= '<strong>Operator:</strong> ' . htmlspecialchars($headerData['operator']) . '<br />';
            }
            if (!empty($headerData['department'])) {
                $mail->Body .= '<strong>Department:</strong> ' . htmlspecialchars($headerData['department']) . '<br />';
            }
            if (!empty($headerData['model_number'])) {
                $mail->Body .= '<strong>Model Number:</strong> ' . htmlspecialchars($headerData['model_number']) . '<br />';
            }
            if (!empty($headerData['shift'])) {
                $mail->Body .= '<strong>Shift:</strong> ' . htmlspecialchars($headerData['shift']) . '<br />';
            }
            $mail->Body .= '</p>';
            
            // Include comments if they exist
            if (!empty($headerData['comments'])) {
                $mail->Body .= '<h3>Comments:</h3>';
                $mail->Body .= '<p style="background-color: #f5f5f5; padding: 10px; border-left: 4px solid #ccc;">' . htmlspecialchars($headerData['comments']) . '</p>';
            }
        }
        
        if (!empty($failedItems)) {
            $mail->Body .= '<h3>Items Requiring Attention:</h3>';
            $mail->Body .= '<ul>';
            foreach ($failedItems as $item) {
                $mail->Body .= '<li><strong>' . htmlspecialchars($item['group_name']) . '</strong>: ' . htmlspecialchars($item['checklist_name']) . '</li>';
            }
            $mail->Body .= '</ul>';
        }
        
        $mail->Body .= '<p>You can review the complete submission by clicking <a href="' . $link . '">this link</a>.</p>';
        $mail->Body .= '<hr style="margin:30px 0;" />';
        $mail->Body .= '<h3>Contact Information</h3>';
        $mail->Body .= '<p><strong>William Masannat</strong><br />';
        $mail->Body .= 'Platinum Forklift Service<br />';
        $mail->Body .= 'Phone: <a href="tel:+17029717225">+1 (702) 971-7225</a><br />';
        $mail->Body .= 'Email: <a href="mailto:william@pfslv.com">william@pfslv.com</a><br />';
        $mail->Body .= '5216 Sand Dollar Ave<br />';
        $mail->Body .= 'Las Vegas, NV 89141</p>';
        $mail->Body .= "</body></html>";
        
        $mail->send();
    }

    public function create($data)
    {
        try {
            $this->db->beginTransaction();

            $last_id = $this->insertHeader($data);

            $countMain = 0;
            $failedItems = [];
            foreach ($data['details'] as $row) {
                $groupName = $row['name'];

                foreach ($row['details'] as $row1) {
                    $details = array(
                        "group_name" => $groupName,
                        "checklist_name" => $row1['name'],
                        "status" => $row1['status'],
                        "forklift_checklist_id" => $last_id,
                    );

                    $this->insertDetails($details);

                    if ($row1['status'] == 0) {
                        $countMain++;
                        $failedItems[] = array(
                            "group_name" => $groupName,
                            "checklist_name" => $row1['name']
                        );
                    }
                    
                }
            }

            $this->db->commit();

            if ($countMain > 0) {
                $this->sendEmailAboutIssues($callBackUrl = "https://dashboard.eye-fi.com/dist/v1/forms/forklift-inspection?forkLiftId=", $last_id, $failedItems, $data);
            }

            return array(
                "status" => 1,
                "message" => 'Successfully submitted. Your submitted id# is ' . $last_id,
                "data" => $data['details'],
                "countMain" => $countMain
            );

        } catch (PDOException $e) {
            $this->db->rollBack();
            die($e->getMessage());
        }
    }
}
