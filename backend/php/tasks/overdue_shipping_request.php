

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
                SELECT *, DATEDIFF(CURDATE(), createdDate) age
                from forms.shipping_request a 
                WHERE a.active = 1 
                    AND completedDate IS NULL 
                    AND DATEDIFF(CURDATE(), createdDate) > 7
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
    
    $emailUsers = emailNotification('overdue_shipping_request_email');
    
    $mail = new PHPMailer(true);
    $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "Action Required: Shipping Request Report Review";

    $addresses = explode(',', $emailUsers);
    foreach ($addresses as $address) {
        $mail->AddAddress($address);
    }
       

            $link       = 'https://dashboard.eye-fi.com/dist/web/operations/forms/shipping-request/list?selectedViewType=Open&isAll=true';

            $mail->Body  = "
                Dear Team, 

                <br/><br/> 

                We hope this message finds you well! As we strive to keep our operations running smoothly, we wanted to bring your attention to an important matter regarding our Shipping Request report.

                <br/> <br/>

                <b>What You Need to Know </b>

                <br/><br/>

                We have several shipping requests that have been open for more than 3 days. It is crucial for us to address these in a timely manner to maintain our commitment to excellent service and ensure our processes are efficient.

                <br/><br/>

                <b>Action Items </b>

                <br/><br/>

                1.<b>Review the Shipping Request Report:</b> Please take a moment to go through the requests listed in the report linked below.
                <br/>
                2.<b>Update Status:</b> If any requests have been resolved, kindly close them out by adding the corresponding tracking number. This helps us keep accurate records and provides our clients with the information they need.

                <br/><br/>

                <b><a href='{$link}' target='_parent'> Report </a></b> 

                <br/><br/>

                Thank you for your prompt attention to this matter. Your efforts make a significant difference in our team's success and customer satisfaction!

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
            $mail->Body .= "<td><strong>Requestor</strong></td>";
            $mail->Body .= "<td><strong>Created Date</strong></td>";
            $mail->Body .= "<td><strong>Age</strong></td>";
            $mail->Body .= "<td><strong>Tracking #</strong></td>";
            $mail->Body .= "<td><strong>Company Name</strong></td>";
            $mail->Body .= "</tr>";

            if (count($data) > 0) {
                foreach ($data as $row) {

                    $linkById       = "https://dashboard.eye-fi.com/dist/web/operations/forms/shipping-request/edit?selectedViewType=Open&isAll=true&id=".$row['id'];


                    $mail->Body .= "<tr> \r\n";
                    $mail->Body .= "<td><a href='{$linkById}' target='_parent'> View </a></td> \r\n";
                    $mail->Body .= "<td>" . $row['requestorName'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['createdDate'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['age'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['trackingNumber'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['companyName'] . "</td> \r\n";
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

		