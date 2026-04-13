<?php

namespace EyefiDb\Api\VehicleInspection;

use PDO;
use PDOException;

use PHPMailer\PHPMailer\PHPMailer;

class VehicleInspection
{

    protected $db;
    public $nowDate;

    public function __construct($db)
    {
        $this->db = $db;
        $this->emailFrom = "Eyefi Dashboard <noreply@the-fi-company.com>";
        $this->app_db_link = "https://dashboard.eye-fi.com/dist/v1";
    }

    public function getAll()
    {
        $q = "
            SELECT a.id 
                , a.date_created 
                , a.truck_license_plate 
                , a.comments 
                , b.hits
                , b.okStatus
                , a.created_by
            FROM forms.vehicle_inspection_header a
            left join (
                select forklift_checklist_id
                    , count(*) hits 
                    , sum(case status = 1 then 1 ELSE 0 END ) okStatus
                    , sum(case status = 0 then 1 ELSE 0 END ) need_maint
                FROM forms.vehicle_inspection_details
                GROUP BY forklift_checklist_id
            ) b ON b.forklift_checklist_id = a.id 
            ORDER BY a.date_created DESC
        ";
        $query = $this->db->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getVehicleInfo($id)
    {
        $q = "
            SELECT a.*, b.vehicleMake, b.vehicleNumber, b.inMaintenance
            FROM forms.vehicle_inspection_header a 
            left join vehicleInformation b on b.licensePlate = a.truck_license_plate
            where a.id = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function searchHeaderById($id)
    {
        $q = "
            SELECT a.*, b.vehicleMake, b.vehicleNumber, b.inMaintenance
            FROM forms.vehicle_inspection_header a 
            left join vehicleInformation b on b.licensePlate = a.truck_license_plate
            where a.id = :id
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
            FROM forms.vehicle_inspection_details
            where forklift_checklist_id = :id
            ORDER BY group_name ASC
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
            FROM forms.vehicle_inspection_details
            where forklift_checklist_id = :id
            GROUP BY group_name
            ORDER BY group_name ASC
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
                        "id" =>  $objDetails1['id'],
                        "resolved_by_date" =>  $objDetails1['resolved_by_date'],
                        "resolved_confirmed_date" =>  $objDetails1['resolved_confirmed_date'],
                        "name" =>  $objDetails1['checklist_name'],
                        "status" =>  $objDetails1['status'],
                    );
                }
            }
        }
        
        $q = "
            SELECT *
            FROM eyefidb.attachments
            where field = 'Vehicle Inspection' AND uniqueId = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();

        $attachments =  $query->fetchAll(PDO::FETCH_ASSOC);


        return array(
            "main" => $main,
            "details" => $group,
            "attachments" => $attachments
        );
    }

    function getDetaliById($id){
        $q = "
            SELECT * 
            FROM forms.vehicle_inspection_details
            where id = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

     function saveDetailById($id, $data){

        $resolved_by_date = $data['resolved_by_date'] == "" ? null : $data['resolved_by_date'];
        $resolved_confirmed_date = $data['resolved_confirmed_date'] == "" ? null : $data['resolved_confirmed_date'];

        $q = "
        update  forms.vehicle_inspection_details
        set resolved_by = :resolved_by,
            resolved_by_date = :resolved_by_date,
            resolved_by_notes = :resolved_by_notes,
            resolved_confirmed_by = :resolved_confirmed_by,
            resolved_confirmed_date = :resolved_confirmed_date,
            resolved_confirmed_notes = :resolved_confirmed_notes
        where id = :id
    ";
    $query = $this->db->prepare($q);
    $query->bindParam(':resolved_by', $data['resolved_by'], PDO::PARAM_STR);
    $query->bindParam(':resolved_by_date', $resolved_by_date, PDO::PARAM_STR);
    $query->bindParam(':resolved_by_notes', $data['resolved_by_notes'], PDO::PARAM_STR);
    $query->bindParam(':resolved_confirmed_by', $data['resolved_confirmed_by'], PDO::PARAM_STR);
    $query->bindParam(':resolved_confirmed_date', $resolved_confirmed_date, PDO::PARAM_STR);
    $query->bindParam(':resolved_confirmed_notes', $data['resolved_confirmed_notes'], PDO::PARAM_STR);
    $query->bindParam(':id', $id, PDO::PARAM_INT);
    $query->execute();
    }

    public function insertHeader($data)
    {

        $q = "
            INSERT INTO forms.vehicle_inspection_header (
                date_created 
                , truck_license_plate
                , created_by
                , comments
                , mileage
                , not_used
            ) VALUES (
                :date_created 
                , :truck_license_plate
                , :created_by
                , :comments
                , :mileage
                , :not_used
            )
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':date_created', $data['date_created'], PDO::PARAM_STR);
        $query->bindParam(':truck_license_plate', $data['truck_license_plate'], PDO::PARAM_STR);
        $query->bindParam(':created_by', $data['created_by'], PDO::PARAM_STR);
        $query->bindParam(':comments', $data['comments'], PDO::PARAM_STR);
        $query->bindParam(':mileage', $data['mileage'], PDO::PARAM_STR);
        $query->bindParam(':not_used', $data['not_used'], PDO::PARAM_INT);
        $query->execute();

        return $this->db->lastInsertId();
    }

    public function insertDetails($data)
    {
        $q = "
            INSERT INTO forms.vehicle_inspection_details (
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


    public function create($data)
    {
        try {
            $this->db->beginTransaction();


            $countMain = 0;
            $last_id = $this->insertHeader($data);

            if($data['not_used'] == '0' && $data['not_used'] == 'false'){
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
                        }
                    }
                }
            }

            if($countMain > 0){
                $emailUsers       =  emailNotification('create_vehicle_inspection');
                
                
                $mail = new PHPMailer(true);
                $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
                $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
                $mail->Subject = "Truck Needs Immediate Attention";

                $addresses = explode(',', $emailUsers);
                foreach ($addresses as $address) {
                    $mail->AddAddress($address);
                }
                        


                $link       = 'https://dashboard.eye-fi.com/dist/web/operations/forms/vehicle-inspection/edit?selectedViewType=Open&isAll=true&id=' . $last_id;
        
        
    
                $mail->Body = '<html><body style="padding:50px">';
        
                $mail->Body .= "<p> <a href='{$link}' target='_parent'>Inspection Report</a> </p>";
                $mail->Body .= "<br><br>";
                $mail->Body .= "<p><strong>Vehicle Contact Information:</strong></p>";
                $mail->Body .= "<p>Busy Bots Auto Repair<br>";
                $mail->Body .= "6940 W Patrick Lane<br>";
                $mail->Body .= "Las Vegas, NV 89113<br>";
                $mail->Body .= "Phone: (702) 399-7007</p>";
                $mail->Body .= "</body></html>";
                
                $mail->send();
            }

            $this->db->commit();

            return array(
                "status" => 1,
                "message" => 'Successfully submitted. Your submitted id# is ' . $last_id,
                "insertId" => $last_id,
                "details" => $data['details'],
                "data" => $data
            );

        } catch (PDOException $e) {
            $this->db->rollBack();
            die($e->getMessage());
        }
    }
}
