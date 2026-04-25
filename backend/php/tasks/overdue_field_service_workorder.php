

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
                select a.*,  
                    b.id fs_scheduler_id,
                    b.request_date, 
                    b.status,
                    DATEDIFF(CURDATE(), request_date) age,
                    techs,
                    b.service_type,
                    b.customer
                from fs_workOrder a
                join fs_scheduler b ON b.id = a.fs_scheduler_id and b.active = 1
                LEFT JOIN (
                    SELECT fs_det_id, GROUP_CONCAT(USER) techs FROM fs_team GROUP BY fs_det_id
                ) c ON c.fs_det_id = b.id
                WHERE a.active = 1 AND a.dateSubmitted IS NULL and DATEDIFF(CURDATE(), request_date) > 3
                order by DATEDIFF(CURDATE(), request_date) desc
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

    $emailUsers = emailNotification('overdue_field_service_workorder');
    //$emailUsers = "ritz.dacanay@the-fi-company.com";

    $subject    = "Reminder: Action Needed on Field Service Open Work Orders";
            $from       = 'noreply@the-fi-company.com';

            
        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->Subject = "Reminder: Action Needed on Field Service Open Work Orders";
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }
                


            $link       = 'https://dashboard.eye-fi.com/dist/web/field-service/ticket/list?selectedViewType=Open&isAll=true';

            $mail->Body  = "
                Dear Team, 

                <br/><br/> 

                I hope this message finds you well!
                
                <br/> <br/>

                I wanted to bring your attention to some open work orders that have been pending for more than 3 days. Timely completion and submission of these work orders are crucial for maintaining our efficiency and workflow.

                <br/> <br/>

                <h3><b>Here is a quick reminder:</b></h3>

                <ul style='margin:0px;padding:0px'>
                    <li><b> Review the following work orders: <a href='{$link}' target='_parent'> Report </a> </b>   </li>
                    <li><b>If completed, please submit them promptly.</b>  </li>
                </ul>

                Thank you for your attention to this matter!

                <br/><br/>
                Best regards,
                <br/>
                The-Fi-Company
            
            ";
            $mail->Body .= '<br><br>';
            $mail->Body .= '<html><body>';
            $mail->Body .= '<table rules="all" style="border-color: #666;font-size:13px" border="1">';
            $mail->Body .= "<tr style='background: #eee;'>";
            $mail->Body .= "<td><strong></strong></td>";
            $mail->Body .= "<td><strong>FSID</strong></td>";
            $mail->Body .= "<td><strong>Status</strong></td>";
            $mail->Body .= "<td><strong>Request Date</strong></td>";
            $mail->Body .= "<td><strong>Techs</strong></td>";
            $mail->Body .= "<td><strong>Age</strong></td>";
            $mail->Body .= "<td><strong>Service Type</strong></td>";
            $mail->Body .= "<td><strong>Customer</strong></td>";
            $mail->Body .= "</tr>";


            if (count($data) > 0) {
                foreach ($data as $row) {

                    $linkById       = "https://dashboard.eye-fi.com/dist/web/field-service/ticket/overview?selectedViewType=Open&isAll=true&id=".$row['fs_scheduler_id'];


                    $mail->Body .= "<tr> \r\n";
                    $mail->Body .= "<td><a href='{$linkById}' target='_parent'> View </a></td> \r\n";
                    $mail->Body .= "<td>" . $row['fs_scheduler_id'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['status'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['request_date'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['techs'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['age'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['service_type'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['customer'] . "</td> \r\n";
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

		