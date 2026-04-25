

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
                SELECT a.*
                    , concat(b.first, ' ', b.last) createdBy
                    ,  DATEDIFF(CURDATE(), a.createdDate) age
                    , date_format(a.createdDate, '%m/%d/%Y') createdDate
                from shortageRequest a 
                left join db.users b on b.id = a.createdBy
                WHERE  ( a.supplyCompleted IS NULL OR a.deliveredCompleted IS NULL OR a.receivingCompleted IS NULL OR a.productionIssuedDate IS NULL ) AND a.active = 1
                and DATEDIFF(CURDATE(), a.createdDate) > 30
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
    
    $emailUsers = emailNotification('overdue_shortages_email');

    $count = count($data);
            
        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->Subject = "Urgent: Review Needed on Open Shortage Report!";
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }
                

            $link       = 'https://dashboard.eye-fi.com/dist/web/operations/shortages/list?selectedViewType=Active&isAll=false';

            $mail->Body  = "
                Dear Team, 

                <br/><br/> 

                We hope this message finds you well!

                <br/> <br/>

                We wanted to bring your attention to an important matter regarding our Open Shortage Report. As of today, a total of <b>$count</b> items have been open for more than <b>30 days</b> and require your immediate review. Your expertise is crucial in ensuring we stay on track and maintain our operational efficiency.
                
                <br/><br/>

                <b>What We Need From You:</b>

                <br/><br/>
                
                <b>Review Status:</b> Please take a moment to check the items listed in the attached report.

                <br>

                <b>Completion Updates:</b> If any shortages have been resolved, we kindly ask that you mark them as completed or have them deleted.
                
                <br/><br/>

                <b><a href='{$link}' target='_parent'> Report </a></b> 

                <br/><br/>

                Thank you for your prompt attention to this matter.
                
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
            $mail->Body .= "<td><strong>ID</strong></td>";
            $mail->Body .= "<td><strong>WO #</strong></td>";
            $mail->Body .= "<td><strong>Line #</strong></td>";
            $mail->Body .= "<td style='white-space:nowrap'><strong>Due Date</strong></td>";
            $mail->Body .= "<td><strong>MR ID</strong></td>";
            $mail->Body .= "<td><strong>Created Dt</strong></td>";
            $mail->Body .= "<td><strong>Reason</strong></td>";
            $mail->Body .= "<td><strong>Part #</strong></td>";
            $mail->Body .= "<td><strong>PO #</strong></td>";
            $mail->Body .= "<td><strong>Age</strong></td>";
            $mail->Body .= "</tr>";


            if (count($data) > 0) {
                foreach ($data as $row) {

                    $linkById       = "https://dashboard.eye-fi.com/dist/web/operations/shortages/edit?selectedViewType=Active&isAll=false&id=".$row['id'];
                    $materialRequest       = "https://dashboard.eye-fi.com/dist/web/operations/material-request/edit?selectedViewType=All&isAll=false&id=".$row['mrfId'];
                    $woLookUp       = "https://dashboard.eye-fi.com/dist/web/operations/wo-lookup?wo_nbr=".$row['woNumber'];
                    $partLookUp       = "https://dashboard.eye-fi.com/dist/web/operations/part-lookup?partNumber=".$row['partNumber'];


                    $mail->Body .= "<tr>";
                    $mail->Body .= "<td><a href='{$linkById}' target='_parent'> View Shortage </a></td> \r\n";
                    $mail->Body .= "<td>" . $row['id'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['woNumber']. "</td> \r\n";
                    $mail->Body .= "<td>" . $row['lineNumber'] . "</td> \r\n";
                    $mail->Body .= "<td style='white-space:nowrap'>" . $row['dueDate'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['mrfId']. "</td> \r\n";
                    $mail->Body .= "<td style='white-space:nowrap'>" . $row['createdDate'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['reasonPartNeeded'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['partNumber']. "</td> \r\n";
                    $mail->Body .= "<td>" . $row['poNumber'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['age'] . "</td> \r\n";
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

		