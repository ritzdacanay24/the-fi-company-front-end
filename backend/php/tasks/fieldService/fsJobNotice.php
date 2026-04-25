<?php

use PHPMailer\PHPMailer\PHPMailer;
	class FSREQUESTCONFIRMATION
	{
	 
		protected $db;
		
		public function __construct($db)
		{
			$this->db = $db;
		}			

		public function get()
		{
			
			$sql = "
                SELECT a.id
                    , a.request_id
                    , a.request_date
                    , b.email
                    , a.property
                    , a.requested_by
                    , a.start_time
                    , b.token
                    , service_type
                    , DATE_FORMAT(NOW(), '%Y-%m-%d') now_date
                    , DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-%d'), INTERVAL 2 DAY) days_out
                FROM fs_scheduler a
                LEFT JOIN fs_request b ON b.id = a.request_id
                WHERE (a.request_date BETWEEN DATE_FORMAT(NOW(), '%Y-%m-%d') 
                    AND DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-%d'), INTERVAL 2 DAY)) 
                    and b.email IS NOT NULL 
                    AND notice_email_date IS NULL 
                    AND a.active = 1
                     AND STATUS = 'Confirmed'
                order by a.request_date ASC, a.start_time ASC 
            ";
			$query = $this->db->prepare($sql);
            $query->execute();
            return  $query->fetchAll(PDO::FETCH_ASSOC);

		}
		
	}
	
use EyefiDb\Databases\DatabaseEyefi;

$db_connect_qad = new DatabaseEyefi();
$dbQad = $db_connect_qad->getConnection();

	$d = new FSREQUESTCONFIRMATION($dbQad);
    
    $data = $d->get();

    $newData = array();
    foreach($data as $row){

        $user = $row['requested_by'];
        $request_date = $row['request_date'];
        $start_time = $row['start_time'];
        $property = $row['property'];
        $BusinessName = "The Fi Company";
        $request_id = $row['request_id'];
        $email = $row['email'];
        $token = $row['token'];
        
        $mail = new PHPMailer(true);
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->setFrom('noreply@the-fi-company.com', 'The-Fi-Company');
        $mail->Subject = "Appointment Notice - Request ID $request_id";

        $mail->AddAddress($email);

        $link       = "https://dashboard.eye-fi.com/dist/web/request?token=$token";

        $message = "
            Request ID: $request_id <br/>
            View Request: <a href='$link' target='_parent'>Request</a> <br/><br/>


            Dear $user, <br/> <br/>

            This email is to confirm your upcoming appointment on $request_date at $start_time at $property. Please let us know if you have any questions or concerns before the day of your appointment.<br/><br/>

            Also, please note that our cancellation policy states that all cancellations must be made at least 48 hours in advance or a full fee may be charged.<br/><br/>

            We look forward to seeing you soon!<br/><br/>

            Sincerely,<br/>

            $BusinessName
        ";


        //Send the email, return the result
    
        if($mail->send()){
            $timeNow = date("Y-m-d H:i:s");
            try {  
                $sql = "
                    Update fs_scheduler a
                    set a.notice_email_date = :now
                    WHERE a.id = :id
                ";
                $query = $dbQad->prepare($sql);
                $query->bindParam(":now", $timeNow);
                $query->bindParam(":id", $row['id']);
                $query->execute();

                $row['email_sent'] = $timeNow;
            } catch (\Exception $e) {
                $row['email_sent'] = null;
            }
            //send to scheduling team
        }

        $newData[] = $row;
    }



sentToSchedulingTeam($newData);

echo json_encode($newData);


function sentToSchedulingTeam($newData){
    
    $to         = 'schedulinglv@the-fi-company.com';
    
    $mail = new PHPMailer(true);
    $mail->isHTML(true);
    $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "Field Service Notice Email Summary";

    $mail->AddAddress($to);

    $mail->Body = '<html><body>';

    $mail->Body  .= 'Field Service Notice Email Summary <br><br>';
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong></strong></td>";
        $mail->Body .= "<td><strong></strong></td>";
        $mail->Body .= "<td><strong>Request ID</strong></td>";
        $mail->Body .= "<td><strong>FSID</strong></td>";
        $mail->Body .= "<td><strong>Request Date</strong></td>";
        $mail->Body .= "<td><strong>Start Time</strong></td>";
        $mail->Body .= "<td><strong>Requested By</strong></td>";
        $mail->Body .= "<td><strong>Property</strong></td>";
        $mail->Body .= "<td><strong>Service</strong></td>";
        $mail->Body .= "<td><strong>Email Sent</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($newData as $row) {
            
            $link       = "https://dashboard.eye-fi.com/dist/web/field-service/request/edit?id=".$row['request_id'];
            
            $link1       = "https://dashboard.eye-fi.com/dist/web/field-service/jobs/edit?id=".$row['id'];

            $mail->Body .= "<tr> \r\n";
            $mail->Body .= "<td><a href='{$link}' target='_parent'>View Request</a></td> \r\n";
            $mail->Body .= "<td><a href='{$link1}' target='_parent'>View FSID</a></td> \r\n";
            $mail->Body .= "<td>" . $row['request_id'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['id'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['request_date'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['start_time'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['requested_by'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['property'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['service_type'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['email_sent'] . "</td> \r\n";
            $mail->Body .= "</tr> \r\n";
        }
        $mail->Body .= "</table>";


        $mail->send();
}