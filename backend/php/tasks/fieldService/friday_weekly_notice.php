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
                    , emails_by_customer
                    , a.property
                    , a.requested_by
                    , a.start_time
                    , b.token
                    , service_type
                    , DATE_FORMAT(NOW(), '%Y-%m-%d') now_date
                    , DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-%d'), INTERVAL 2 DAY) days_out
                    , a.customer
                    , a.co_number
                    , a.sales_order_number
                FROM fs_scheduler a
                LEFT JOIN fs_request b ON b.id = a.request_id
                LEFT JOIN (
					 	SELECT a.customer, GROUP_CONCAT(DISTINCT b.email) emails_by_customer
						FROM fs_scheduler a
                   LEFT JOIN fs_request b ON b.id = a.request_id
						GROUP BY customer 
					 ) c ON c.customer = a.customer
                WHERE (a.request_date > CURDATE()) and b.email IS NOT NULL AND notice_email_date IS NULL AND a.active = 1 AND STATUS = 'Confirmed'
                order by a.customer ASC, a.request_date ASC, a.start_time ASC
            ";
			$query = $this->db->prepare($sql);
            $query->execute();
            $data =   $query->fetchAll(PDO::FETCH_ASSOC);

            $categories = array();

            foreach($data as $book)
            { 
                $categories[$book['customer']][] = $book;
            }

            return $categories;

		}
		
	}
	
use EyefiDb\Databases\DatabaseEyefi;

$db_connect_qad = new DatabaseEyefi();
$dbQad = $db_connect_qad->getConnection();

	$d = new FSREQUESTCONFIRMATION($dbQad);
    
    $data = $d->get();

    $mail = new PHPMailer(true);
    $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

    foreach ($data as $key => $value) {
        
        $emailUsers         = "ritz.dacanay@the-fi-company.com,adriann.k@the-fi-company.com";
        
        $mail->Subject = "Job Summary";

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->addCC($address);
        }

        $mail->Body = '<html><body>';

        $mail->Body  .= 'Field Service Notice Email Summary <br><br>';
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong></strong></td>";
        $mail->Body .= "<td><strong>Request ID</strong></td>";
        $mail->Body .= "<td><strong>Request Date</strong></td>";
        $mail->Body .= "<td><strong>Start Time</strong></td>";
        $mail->Body .= "<td><strong>Requested By</strong></td>";
        $mail->Body .= "<td><strong>Property</strong></td>";
        $mail->Body .= "<td><strong>Service</strong></td>";
        $mail->Body .= "<td><strong>CO #</strong></td>";
        $mail->Body .= "</tr>";
        
        $mail->Body .= "<tbody> \r\n";
        $mail->Body .= "<tr> \r\n";
            $mail->Body .= "<td colspan='8'>" . $key . "</td> \r\n";
        $mail->Body .= "</tr> \r\n";


        $mail->clearAddresses();
        
        foreach ( $value as $row ) {

        
            $mail->clearAddresses();
            //$to         = "ritz.dacanay@the-fi-company.com, adriann.k@the-fi-company.com";

            $toCustomerEmails = $row['emails_by_customer'];

            
            $addresses = explode(',', $toCustomerEmails);
            foreach ($addresses as $address) {
                $mail->AddAddress($address);
            }


            $token = $row['token'];
        
            $link       = "https://dashboard.eye-fi.com/dist/web/request?token=$token";
            $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$link}' target='_parent'>View Request</a></td> \r\n";
                $mail->Body .= "<td>" . $row['request_id'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['request_date'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['start_time'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['requested_by'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['property'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['service_type'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['co_number'] . "</td> \r\n";
            $mail->Body .= "</tr> \r\n";
        }
        $mail->Body .= "</tbody> \r\n";
        $mail->Body .= "</table>";
    
        $mail->send();
    }

echo json_encode($data);
