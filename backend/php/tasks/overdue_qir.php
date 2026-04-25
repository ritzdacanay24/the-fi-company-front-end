

 <?php



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
                    , DATEDIFF(CURDATE(), createdDate) age
                FROM qa_capaRequest 
                WHERE STATUS NOT IN ('Closed','Rejected') AND ACTIVE = 1
                and DATEDIFF(CURDATE(), createdDate) > 7
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
    use PHPMailer\PHPMailer\PHPMailer;
    

	$db_connect = new DatabaseEyefi();
	$db = $db_connect->getConnection();

	$runInstance = new UserInactivity($db);

    $data = $runInstance->getData();

        $emailUsers = emailNotification('overdue_qir');

        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->Subject = "Action Required: Review of Open Quality Incidents";
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }


            $link       = 'https://dashboard.eye-fi.com/dist/web/dashboard/quality/qir/list?selectedViewType=Open&isAll=true';

            $mail->Body  = "
                Dear Team, 

                <br/><br/> 

                As part of our ongoing commitment to maintaining high-quality standards, I would like to draw your attention to the quality incidents listed in the report below. These incidents have been open for more than 7 days, and timely action is essential for our workflow efficiency. 
                
                <br/> <br/>

                <b>Action Needed:</b>
                
                <br/><br/>
                
                Please take a moment to review the report and update the status of any incidents that have been resolved. If an incident has been completed, kindly change its status to 'Closed' in our system.
                
                <br/><br/>

                <b><a href='{$link}' target='_parent'> Report </a></b> 

                <br/><br/>

                Thank you for your cooperation and dedication to quality!
                
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
            $mail->Body .= "<td><strong>Stakeholder</strong></td>";
            $mail->Body .= "<td><strong>Type</strong></td>";
            $mail->Body .= "<td><strong>Priority</strong></td>";
            $mail->Body .= "<td><strong>Created Date</strong></td>";
            $mail->Body .= "<td><strong>Status</strong></td>";
            $mail->Body .= "<td><strong>Age</strong></td>";
            $mail->Body .= "<td><strong>Serial Number</strong></td>";
            $mail->Body .= "</tr>";


            if (count($data) > 0) {
                foreach ($data as $row) {

                    $linkById       = "https://dashboard.eye-fi.com/dist/web/dashboard/quality/qir/edit?selectedViewType=Open&isAll=true&id=".$row['id'];


                    $mail->Body .= "<tr> \r\n";
                    $mail->Body .= "<td><a href='{$linkById}' target='_parent'> View </a></td> \r\n";
                    $mail->Body .= "<td>" . $row['stakeholder'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['type1'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['priority'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['createdDate'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['status'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['age'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['eyefiSerialNumber'] . "</td> \r\n";
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

		