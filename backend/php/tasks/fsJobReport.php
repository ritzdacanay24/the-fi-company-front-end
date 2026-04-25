<?php

use PHPMailer\PHPMailer\PHPMailer;

	class FSJOBS
	{
	 
		protected $db;
		
		public function __construct($db)
		{
			$this->db = $db;
		}			

		public function get()
		{
			
			$sql = "
                SELECT *
                FROM fs_scheduler_view 
                where request_date between last_day(curdate() - interval 2 month) + interval 1 day 
                    and last_day(curdate() + interval 1 month) 
                order by request_date asc
            ";
			$query = $this->db->prepare($sql);
            $query->execute();
            return  $query->fetchAll(PDO::FETCH_ASSOC);

		}
		
	}
	
use EyefiDb\Databases\DatabaseEyefi;

$db_connect_qad = new DatabaseEyefi();
$dbQad = $db_connect_qad->getConnection();

	$d = new FSJOBS($dbQad);
    
    $contents = $d->get();

    $contents1 = json_encode($contents);
    $data = json_decode($contents1, true);

    $fp = fopen('field_service_jobs.csv', 'w');

    $col;
    foreach($contents[0] as $k=>$l){
        $col[] = $k;
    }

    $ff = implode(",",$col);
    fputcsv($fp, $col);
    foreach ($data as $fields) {
        fputcsv($fp, $fields);
    }
    
    fclose($fp);

    
    echo json_encode($ff);

    $month_ini = new DateTime("first day of last month");
    $month_end = new DateTime("last day of next month");

    $emailUsers         = emailNotification('field_serivce_copy_of_report');
    
    $mail = new PHPMailer(true);
    $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "Overdue orders";

    
    $addresses = explode(',', $emailUsers);
    foreach ($addresses as $address) {
        $mail->AddAddress($address);
    }

    $link       = 'https://dashboard.eye-fi.com/dist/v1/forms/vehicle-information-report';

    $file = file_get_contents('/var/www/html/tasks/field_service_jobs.csv', true);

  // Make the attachment
//   $file = chunk_split(base64_encode($file)); 

  // Make the body of the message
  $mail->Body = "Hello Team";
  $mail->Body .= "Report is from " . $month_ini->format('Y-m-d') . " to " . $month_end->format('Y-m-d');
       

   $mail->addAttachment($file);         //Add attachments

   $mail->send();



