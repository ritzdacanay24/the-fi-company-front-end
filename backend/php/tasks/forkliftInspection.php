<?php

class unfinishedForkliftInspections
{

    protected $db;

    public function __construct($db, $dbQad)
    {

        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->nowDateTime = date("Y-m-d h:m:s", time());
        $this->app_email_error_from = 'noreply@the-fi-company.com';
    }

    public function notificationSubscribers($ubscribedTo)
    {
        $mainQry = "
			select email
			from eyefidb.cron_email_notifications 
			where active = 1
			and subscribed_to = :subscribed_to
		";
        $query = $this->db1->prepare($mainQry);
        $query->bindParam(":subscribed_to", $ubscribedTo, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetch(PDO::FETCH_ASSOC);

        if ($results['email']) {
            return json_encode($results['email']);
        } else {
            return false;
        }
    }

    public function sendEmail()
    {

        $subscribers = $this->notificationSubscribers('unfinished_forklift_inspection');

        if ($subscribers == "") {
            echo "No subscribers";
            die();
        }

        $forklifts = array(
            "SD1", "SD2", "SD3", "SD4", "SU1", "SU2", "SU3", "CP1", "CP2"
        );

        $mainQry = "
			select * 
            from forms.forklift_checklist
            WHERE date_created = :now
		";
        $query = $this->db1->prepare($mainQry);
        $query->bindParam(":now", $this->nowDate, PDO::PARAM_STR);
        $query->execute();
        $data = $query->fetchAll(PDO::FETCH_ASSOC);

        $subscribers = explode(",", $subscribers);
        $toEmail = trim(implode(',', $subscribers), '"'); // your email address;

        //check if forklifts were submitted

        $dataToSend = array();
        // foreach($data as $row){
        //     if (!array_key_exists($row['model_number'], $forklifts)) {
        //         $dataToSend[] 
        //     }
        // }
        foreach ($forklifts as $row) {
            foreach ($data as $row1) {
                if ($row1['model_number'] != $row) {
                    $dataToSend[] = $row;
                }
            }
        }

        echo json_encode($dataToSend);

        // $to         = $toEmail;
        // $subject       = "Past due material request validations";
        // $from       = $this->app_email_error_from;

        // $body  = 'Hello Team, <br>';
        // $body .= 'Please review the below past due material validation work orders. These orders are over 2 days old. If MRs are not needed, please delete them.';
        // $body .= '<br><br>';
        // $body .= '<html><body>';
        // $body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        // $body .= "<tr style='background: #eee;'>";
        // $body .= "<td><strong>MR number</strong></td>";
        // $body .= "<td><strong>Requestor</strong></td>";
        // $body .= "<td><strong>Pick List</strong></td>";
        // $body .= "<td><strong>Due Date</strong></td>";
        // $body .= "<td><strong>Age</strong></td>";
        // $body .= "</tr>";

        // foreach ($data as $row) {

        //     $body .= "<tr> \r\n";
        //     $body .= "<td>" . $row['id'] . "</td> \r\n";
        //     $body .= "<td>" . $row['requestor'] . "</td> \r\n";
        //     $body .= "<td>" . $row['pickList'] . "</td> \r\n";
        //     $body .= "<td>" . $row['dueDate'] . "</td> \r\n";
        //     $body .= "<td>" . $row['age'] . "</td> \r\n";
        //     $body .= "</tr> \r\n";
        // }

        // $body .= "</table>";
        // $body .= '<br><hr>';
        // $body .= 'This is an automated email. Please do not respond. <br>';
        // $body .= 'Thank you.';

        // $body .= "</body></html>";

        // $headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n" .
        //     'Reply-To:' . MAIL_EMAIL . "\r\n";
        // $headers .= "MIME-Version: 1.0\r\n";
        // $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
        // $headers .= "Content-Transfer-Encoding: 64bit\r\n";
        // $headers .= "X-Priority: 3\r\n";
        // $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";

        // $finalMessage = wordwrap($body, 100, "\n");

        // //only send if there is new orders, that have not been sent yet. 
        // if (count($data) > 0) {
        //     mail($to, $subject, $finalMessage, $headers);
        //     echo "email sent";
        // } else {
        //     echo "email failed";
        // }
    }
}


use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new unfinishedForkliftInspections($db, $dbQad);
$data->sendEmail();
