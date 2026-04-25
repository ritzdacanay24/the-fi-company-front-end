

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
                SELECT *, DATEDIFF(CURDATE(), created_date) age,
                case when ca_iss_to IS NULL THEN 'No Department Selected' ELSE ca_iss_to END ca_iss_to
                from ncr a 
                WHERE  DATEDIFF(CURDATE(), created_date) > 7
                AND a.active = 1 AND (a.submitted_date IS NULL OR TRIM(a.submitted_date) = '')
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
    
    //$emailUsers = emailNotification('safety_incident_overdue_email');
    $emailUsers = emailNotification('overdue_qir');

    $mail = new PHPMailer(true);
    $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "Action Required: Update on CAR Report Status";

    $addresses = explode(',', $emailUsers);
    foreach ($addresses as $address) {
        $mail->AddAddress($address);
    }


            $link       = 'https://dashboard.eye-fi.com/dist/web/dashboard/quality/car/list?selectedViewType=Open&isAll=true';

            $mail->Body  = "
                Dear Team, 

                <br/><br/> 

                I hope this message finds you well!

                <br/> <br/>

                As we continue to streamline our processes and ensure effective resolution of our Corrective Action Requests (CAR), I wanted to bring your attention to the CAR reports that have been open for more than 7 days.
                
                <br/><br/>

                <b> Action Needed: Please Review and Update!</b>

                <br/><br/>

                <b><a href='{$link}' target='_parent'> Report </a></b> 


                <br/><br/>

                If you have successfully resolved any of these CARs, kindly take a moment to update their status to 'CLOSED.' This will help us keep our records accurate and maintain compliance with our quality assurance standards.

                <br/><br/>

                <b>Why is this Important?</b>
                
                <br/><br/>

                <b>Efficiency:</b> Closing out resolved CARs helps us focus on outstanding issues and improves our overall workflow.

                <br/>

                <b>Accountability:</b> Keeping our CARs up to date ensures accountability across the team and highlights areas for improvement.

                <br/>

                <b>Success Tracking:</b> By closing resolved CARs, we can better track our successes and identify trends for future prevention.

                <br/><br/>

                <b>Next Steps:</b>
                
                <br/><br/>

                1.Review the open CAR reports assigned to you. 
                <br/>
                2.Update the status to 'CLOSED' for those that have been resolved.
                <br/>
                3.If you have any questions or need assistance, don’t hesitate to reach out.
                <br/>

                Thank you for your attention to this matter and for your ongoing commitment to quality improvement!

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
            $mail->Body .= "<td><strong>Inititated By</strong></td>";
            $mail->Body .= "<td><strong>Source</strong></td>";
            $mail->Body .= "<td><strong>Complaint Code</strong></td>";
            $mail->Body .= "<td><strong>QIR</strong></td>";
            $mail->Body .= "<td><strong>Age</strong></td>";
            $mail->Body .= "<td><strong>WO</strong></td>";
            $mail->Body .= "<td><strong>Created Date</strong></td>";
            $mail->Body .= "</tr>";

            if (count($data) > 0) {
                foreach ($data as $row) {

                    $linkById       = "https://dashboard.eye-fi.com/dist/web/dashboard/quality/car/overview?selectedViewType=Open&isAll=true&id=".$row['id'];


                    $mail->Body .= "<tr> \r\n";
                    $mail->Body .= "<td><a href='{$linkById}' target='_parent'> View </a></td> \r\n";
                    $mail->Body .= "<td>" . $row['initiated_by'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['source'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['complaint_code'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['qir_number'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['age'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['wo_nbr'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['created_date'] . "</td> \r\n";
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
            }

		