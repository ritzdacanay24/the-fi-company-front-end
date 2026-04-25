<?php

use PHPMailer\PHPMailer\PHPMailer;
class VehicleExpirationEmail
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function sendEmail()
    {

        $mainQry = "
                select id
                    , department
                    , vehicleMake 
                    , year
                    , vin
                    , exp 
                    , vehicleNumber
                    , licensePlate
                from eyefidb.vehicleInformation a 
                where active = 1
			";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        $sendEmail = array();
        $sendEmailHot = array();
        $dateNow = date("Y-m-d");
        foreach ($result as $row) {
            $date1 = date_create($row['exp']);
            $date2 = date_create($dateNow);
            $row['dateDiff'] = date_diff($date1, $date2);

            if (
                $row['dateDiff']->days == 18 ||
                $row['dateDiff']->days == 14 ||
                $row['dateDiff']->days == 12 ||
                $row['dateDiff']->days == 10 ||
                $row['dateDiff']->days == 8 ||
                $row['dateDiff']->days == 6 ||
                $row['dateDiff']->days == 4
            ) {
                $sendEmail[] = $row;
            }

            if (
                $row['dateDiff']->days == 2 ||
                $row['dateDiff']->days == 0
            ) {
                $sendEmailHot[] = $row;
            }
        }
        if (
            count($sendEmail) > 0 || count($sendEmailHot) > 0
        ) {

            $subjectMessage = "";
            $priority = 3;
            if (count($sendEmailHot) > 0) {
                //ALERT
                $emailUsers = emailNotification('vehicle_registration_email');
                $subjectMessage = "ATTENTION!! Vehicle registration is about to expire. Please renew as soon as possible";
                $priority = 1;
            } else {
                $emailUsers = emailNotification('vehicle_registration_email');
                $subjectMessage = "Vehicle registration expiration report";
                $priority = 3;
            }

            $mail = new PHPMailer(true);
            $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
            $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
            $mail->Subject = $subjectMessage;

            $addresses = explode(',', $emailUsers);
            foreach ($addresses as $address) {
                $mail->AddAddress($address);
            }
            
                    
            $link       = 'https://dashboard.eye-fi.com/dist/web/operations/forms/vehicle/list';

            $mail->Body  = 'Hello Team, <br>';
            $mail->Body .= "Listed below are vehicles that will expire soon. Once registration is completed,  please click <a href='{$link}' target='_parent'> here </a> to update the expiration date. <br>";
            $mail->Body .= '<br><br>';
            $mail->Body .= '<html><body>';
            $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="10">';
            $mail->Body .= "<tr style='background: #eee;'>";
            $mail->Body .= "<td><strong></strong></td>";
            $mail->Body .= "<td><strong>Vin</strong></td>";
            $mail->Body .= "<td><strong>Department</strong></td>";
            $mail->Body .= "<td><strong>Vehicle Make</strong></td>";
            $mail->Body .= "<td><strong>Year</strong></td>";
            $mail->Body .= "<td><strong>Expiration</strong></td>";
            $mail->Body .= "<td><strong>Vehicle Number</strong></td>";
            $mail->Body .= "<td><strong>License Plate #</strong></td>";
            $mail->Body .= "<td><strong>Due In </strong></td>";
            $mail->Body .= "</tr>";

            $mail->Body .= "<tr> \r\n";

            if (count($sendEmailHot) > 0) {
                foreach ($sendEmailHot as $row) {

                    $linkById       = "https://dashboard.eye-fi.com/dist/web/operations/forms/vehicle/edit?id=".$row['id'];


                    $mail->Body .= "<tr> \r\n";
                    $mail->Body .= "<td><a href='{$linkById}' target='_parent'> View </a></td> \r\n";
                    $mail->Body .= "<td>" . $row['vin'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['department'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['vehicleMake'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['year'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['exp'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['vehicleNumber'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['licensePlate'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['dateDiff']->days . " days </td> \r\n";
                    $mail->Body .= "</tr> \r\n";
                }
            }

            if (count($sendEmail) > 0) {
                foreach ($sendEmail as $row) {
                    $linkById       = "https://dashboard.eye-fi.com/dist/web/operations/forms/vehicle/edit?id=".$row['id'];

                    $mail->Body .= "<tr> \r\n";
                    $mail->Body .= "<td><a href='{$linkById}' target='_parent'> View </a></td> \r\n";
                    $mail->Body .= "<td>" . $row['vin'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['department'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['vehicleMake'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['year'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['exp'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['vehicleNumber'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['licensePlate'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['dateDiff']->days . " days </td> \r\n";
                    $mail->Body .= "</tr> \r\n";
                }
            }

            $mail->Body .= "</tr> \r\n";

            $mail->Body .= "</table>";
            $mail->Body .= '<br><hr>';
            $mail->Body .= 'This is an automated email. Please do not respond. <br>';
            $mail->Body .= 'Thank you.';

            $mail->Body .= "</body></html>";

            //only send if there is new orders, that have not been sent yet. 
            $mail->send();
        } else {
            echo "No results";
        }

        //send email if exp in 7  days
        //return $sendEmail;
    }

    public function __destruct()
    {
        $this->db = null;
    }
}

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$deleteSessions = new VehicleExpirationEmail($db);
$data = $deleteSessions->sendEmail();
