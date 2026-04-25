

 <?php

use PHPMailer\PHPMailer\PHPMailer;

	class UserInactivity
	{
	 
		protected $db;
		
		public function __construct($db)
		{
			$this->db = $db;
		}			

		public function getData()
		{
			
			$sql = "
                SELECT *
                    , DATEDIFF(CURDATE(), date_of_incident) age_since_date_of_incident
                    , case when type_of_incident = 'Other' THEN type_of_incident_other ELSE type_of_incident END type_of_incident
                FROM safety_incident WHERE STATUS <> 'Closed'
                and DATEDIFF(CURDATE(), date_of_incident) > 7
            ";
			$stmt = $this->db->prepare($sql);
			$stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
		}
		
		public function __destruct() {
			$this->db = null;
		}
	}
	
	use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

	$db_connect = new DatabaseEyefi();
	$db = $db_connect->getConnection();

	$runInstance = new UserInactivity($db);

    $data = $runInstance->getData();
    
    $emailUsers = emailNotification('safety_incident_overdue_email');

    $priority = 1;

        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->Subject = "Urgent: Action Needed on Open Safety Incidents";
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }
                


            $link       = 'https://dashboard.eye-fi.com/dist/web/operations/forms/safety-incident/list?selectedViewType=Open&isAll=true';

            $mail->Body  = "
                Dear Team, 

                <br/><br/> 

                I hope this message finds you well. I wanted to bring your attention to the safety report we compiled, highlighting incidents that have been open for over <b>7</b> days. It is crucial that we address these matters promptly to ensure our workplace remains safe and compliant. 
                
                <br/> <br/>

                <b>What We Need From You:</b>
                
                <br/><br/>
                <b>Review the Report:</b> Please take a moment to go through the open report by clicking on this <a href='{$link}' target='_parent'> link </a>. <br/>

                <b>Update Status:</b> If any of the incidents have been resolved, kindly change their status to 'Closed' in our tracking system.
                
                <br/><br/>

                Your prompt action on this will not only help us maintain a safe environment but also contribute to our ongoing commitment to safety excellence.

                <br/><br/>

                Thank you for your attention to this important matter. If you have any questions or need assistance, please don't hesitate to reach out.

                <br/><br/>
                Best regards,
                <br/>
                The-Fi-Company
            
            ";
            $mail->Body .= '<br><br>';
            $mail->Body .= '<html><body>';
            $mail->Body .= '<table rules="all" style="border-color: #666;font-size:12px" border="1">';
            $mail->Body .= "<tr style='background: #eee;'>";
            $mail->Body .= "<td><strong></strong></td>";
            $mail->Body .= "<td><strong>Type of Incident</strong></td>";
            $mail->Body .= "<td><strong>Date of Incident</strong></td>";
            $mail->Body .= "<td><strong>Time of Incident</strong></td>";
            $mail->Body .= "<td><strong>Status</strong></td>";
            $mail->Body .= "<td><strong>Age</strong></td>";
            $mail->Body .= "<td><strong>Corrective Action Owner</strong></td>";
            $mail->Body .= "</tr>";


            if (count($data) > 0) {
                foreach ($data as $row) {

                    $linkById       = "https://dashboard.eye-fi.com/dist/web/operations/forms/safety-incident/edit?selectedViewType=Open&isAll=true&id=".$row['id'];


                    $mail->Body .= "<tr> \r\n";
                    $mail->Body .= "<td><a href='{$linkById}' target='_parent'> View </a></td> \r\n";
                    $mail->Body .= "<td>" . $row['type_of_incident'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['date_of_incident'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['time_of_incident'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['status'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['age_since_date_of_incident'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['corrective_action_owner'] . "</td> \r\n";
                    $mail->Body .= "</tr> \r\n";
                }
            }


            $mail->Body .= "</table>";
            $mail->Body .= '<br><hr>';
            $mail->Body .= 'This is an automated email. Please do not respond. <br>';
            $mail->Body .= 'Thank you.';

            $mail->Body .= "</body></html>";

            if (count($data) > 0) {
            //only send if there is new orders, that have not been sent yet. 
            $mail->send();
            }else {
                echo "not sent";
            }

		