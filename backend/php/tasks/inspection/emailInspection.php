<?php

namespace EyefiDb\Api\ForkLiftInspection;
use PHPMailer\PHPMailer\PHPMailer;

use PDO;
use PDOException;

class ForkLiftInspection
{

    protected $db;
    public $nowDate;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getVehicleInspection()
    {
        $q = "
            SELECT a.*, failed, passed, b.not_used, b.inspection_id
FROM eyefidb.vehicleInformation a
LEFT JOIN (
	SELECT truck_license_plate , IFNULL(bb.failed, 0) failed, IFNULL(bb.passed, 0) passed, date_created, a.not_used, a.id inspection_id
	FROM forms.vehicle_inspection_header a
	LEFT JOIN (
		SELECT sum(case when a.status = 0 THEN 1 END) failed
			,  sum(case when a.status = 1 THEN 1 END) passed
			, a.forklift_checklist_id
		FROM forms.vehicle_inspection_details a
		GROUP BY forklift_checklist_id
	) bb ON bb.forklift_checklist_id = a.id
	WHERE  DATE(a.date_created) = CURDATE()
) b ON b.truck_license_plate = a.licensePlate 
WHERE a.active = 1  AND a.id <> 18
        ";
        $query = $this->db->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getForkliftInspection()
    {
        $q = "
            SELECT aa.name,
            forklift_checklist_id
                            , b.id
                            , passed
                            , failed
                            , total
                            , b.operator created_by
                            , 'Forklift Inspection' type_of_inspection
                            , b.model_number
                            , b.date_created
            FROM forms.forklift_options aa 
            LEFT JOIN (
                SELECT forklift_checklist_id
                , b.id
                , SUM(case when STATUS = 1 THEN 1 ELSE 0 END) passed
                , SUM(case when STATUS = 0 THEN 1 ELSE 0 END) failed
                , COUNT(*) total
                , b.operator
                , 'Forklift Inspection' type_of_inspection
                , b.model_number
                , b.date_created
            FROM forms.forklift_checklist_details a
            LEFT JOIN forms.forklift_checklist b ON b.id = a.forklift_checklist_id
            WHERE date(b.date_created) = CURDATE()
            GROUP BY forklift_checklist_id
            ORDER BY forklift_checklist_id DESC
            ) b ON b.model_number = aa.name;
        
        ";
        $query = $this->db->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
    
}

    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect_qad = new DatabaseEyefi();
    $dbQad = $db_connect_qad->getConnection();

	$instance = new ForkLiftInspection($dbQad);
    
    $vehicleInspection = $instance->getVehicleInspection();
    $forkliftInspection = $instance->getForkliftInspection();

    $nowDate = date("Y-m-d", time());

    //$to = "EYEFILOGISTICS@THE-FI-COMPANY.COM,ritz.dacanay@the-fi-company.com";
    $emailUsers = emailNotification('forklift_and_vehicle_inspection_report');

    $mail = new PHPMailer(true);
    $mail->isHTML(true);
    $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "Daily Forklift and Vehicle Summary Report - " . $nowDate;

    $addresses = explode(',', $emailUsers);
    foreach ($addresses as $address) {
        $mail->AddAddress($address);
    }

    // $mail->AddAddress("ritz.dacanay@the-fi-company.com");
    $mail->addBCC("ritz.dacanay@the-fi-company.com");
          
    $mail->Body = '<html><body>';

    $mail->Body .= 'Vehicle Inspection Report <br/>';

    if(count($vehicleInspection) > 0){

        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>View</strong></td>";
        $mail->Body .= "<td><strong>Truck #</strong></td>";
        $mail->Body .= "<td><strong>License Plate #</strong></td>";
        $mail->Body .= "<td><strong>ID #</strong></td>";
        $mail->Body .= "<td><strong>Passed</strong></td>";
        $mail->Body .= "<td><strong>Failed</strong></td>";
        $mail->Body .= "<td><strong>Not Used</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($vehicleInspection as $row) {
            if($row['inspection_id']){
                $link = "https://dashboard.eye-fi.com/dist/web/operations/forms/vehicle-inspection/edit?id=".$row['inspection_id'];

                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$link}' target='_parent'> View </a></td> \r\n";
                $mail->Body .= "<td>" . $row['vehicleNumber'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['licensePlate'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['id'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['passed'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['failed'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['not_used'] . "</td> \r\n";
                $mail->Body .= "</tr> \r\n";

            }else{
                $link = "https://dashboard.eye-fi.com/dist/web/operations/forms/vehicle-inspection/create?license_plate=".$row['licensePlate'] . "&not_used=1";

                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$link}' target='_parent'> Mark As Unused </a></td> \r\n";
                $mail->Body .= "<td>" . $row['vehicleNumber'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['licensePlate'] . "</td> \r\n";
                $mail->Body .= "<td colspan='4' style='color:red'>No Inspection found.</td> \r\n";
                $mail->Body .= "</tr> \r\n";
            }

        }
        $mail->Body .= "</table>";
    }else{
        $mail->Body .= 'No vehicle inspections recorded on ' . $nowDate;
        $mail->Body .= '<br>';
    }

    $mail->Body .= '<br><hr>';

    ///////////////////////////////////////
    
    $mail->Body .= 'Forklift Inspection Report <br/>';
    
    $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
    $mail->Body .= "<tr style='background: #eee;'>";
    $mail->Body .= "<td><strong>View</strong></td>";
    $mail->Body .= "<td><strong>Model #</strong></td>";
    $mail->Body .= "<td><strong>ID #</strong></td>";
    $mail->Body .= "<td><strong>Created By</strong></td>";
    $mail->Body .= "<td><strong>Passed</strong></td>";
    $mail->Body .= "<td><strong>Failed</strong></td>";
    $mail->Body .= "</tr>";

    
    foreach ($forkliftInspection as $row) {
        $link       = "https://dashboard.eye-fi.com/dist/web/operations/forms/forklift-inspection/edit?id=".$row['id'];

        if($row['id']){
            $mail->Body .= "<tr> \r\n";
            $mail->Body .= "<td><a href='{$link}' target='_parent'> View </a></td> \r\n";
            $mail->Body .= "<td>" . $row['name'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['id'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['created_by'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['passed'] . "</td> \r\n";
            if($row['failed'] > 0){
                $mail->Body .= "<td  style='color:red'>" . $row['failed'] . "</td> \r\n";
            }else{
                $mail->Body .= "<td>" . $row['failed'] . "</td> \r\n";
            }
            $mail->Body .= "</tr> \r\n";
        }else{
            $mail->Body .= "<tr> \r\n";
            $mail->Body .= "<td> - </td> \r\n";
            $mail->Body .= "<td>" . $row['name'] . "</td> \r\n";
            $mail->Body .= "<td colspan='4' style='color:red'>No Inspection found.</td> \r\n";
            $mail->Body .= "</tr> \r\n";
        }
    }
        
    $mail->Body .= "</table>";
    $mail->Body .= '<br><hr>';

    $mail->Body .= "</body></html>";

    $mail->send();