<?php

class ShippingChanges
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d");
        $this->nowDateTime = date("Y-m-d h:m:s", time());
    }

    public function saveToDb($data)
    {
        // COMMENTED OUT: Disabled to prevent excessive table growth
        /*
        $qry = "
            INSERT INTO eyefidb.shipping_changes(
                data
            ) 
            VALUES (
                :data
            )
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":data", $data);
        $stmt->execute();
        */
    }

    public function sendEmail()
    {
        // //$emailUsers = "hotdrops@eye-fi.com";

		// $emailUsers = " ritz.dacanay@the-fi-company.com";

		// $sendemailCheck = false;
		// $to         = $emailUsers;
		// $subject   	= "Hot Drop In - Work Order ";
		// $from       = $this->app_email_error_from;

		// $body  = 'Hello Team, <br>';
		// $body .= 'Listed below are hot drop in order(s) that need immediate action.<br>';
		// $body .= '<br><br>';
		// $body .= '<html><body>';
		// $body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
		// $body .= "<tr style='background: #eee;'>";
		// $body .= "<td><strong>Work Order Number</strong></td>";
		// $body .= "<td><strong>Ordered Date</strong></td>";
		// $body .= "<td><strong>Qty Ordered</strong></td>";
		// $body .= "<td><strong>Due Date</strong></td>";
		// $body .= "<td><strong>Item #</strong></td>";
		// $body .= "<td><strong>Description</strong></td>";
		// $body .= "</tr>";

		// foreach ($hotDropIn as $row) {

		// 	$queryCheck = $this->db1->prepare($mainQry1);
		// 	$queryCheck->bindParam(':orderNum', $row['WO_NBR'], PDO::PARAM_STR);
		// 	$queryCheck->execute();
		// 	$emailCheck = $queryCheck->fetch();

		// 	if ($row['WO_NBR'] != $emailCheck['orderNum']) {

		// 		$query = $this->db1->prepare($mainQryInsert);
		// 		$query->bindParam(':email', $emailUsers, PDO::PARAM_STR);
		// 		$query->bindParam(':createdDate', $this->nowDateTime, PDO::PARAM_STR);
		// 		$query->bindParam(':orderNum', $row['WO_NBR'], PDO::PARAM_STR);
		// 		$query->execute();


		// 		$body .= "<tr> \r\n";
		// 		$body .= "<td>" . $row['WO_NBR'] . "</td> \r\n";
		// 		$body .= "<td>" . $row['WO_ORD_DATE'] . "</td> \r\n";
		// 		$body .= "<td>" . $row['WO_QTY_ORD'] . "</td> \r\n";
		// 		$body .= "<td>" . $row['WO_DUE_DATE'] . "</td> \r\n";
		// 		$body .= "<td>" . $row['WO_PART'] . "</td> \r\n";
		// 		$body .= "<td>" . $row['PT_DESC1'] . " " . $row['PT_DESC2'] . "</td> \r\n";
		// 		$body .= "</tr> \r\n";

		// 		$sendemailCheck = true;
		// 		echo "test";
		// 	}
		// }

		// $body .= "</table>";
		// $body .= '<br><hr>';
		// $body .= 'This is an automated email. Please do not respond. <br>';
		// $body .= 'Thank you.';

		// $body .= "</body></html>";

		// $headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n" .
		// 	'Reply-To:' . MAIL_EMAIL . "\r\n";
		// $headers .= "MIME-Version: 1.0\r\n";
		// $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
		// $headers .= "Content-Transfer-Encoding: 64bit\r\n";
		// $headers .= "X-Priority: 3\r\n";
		// $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";


		// $finalMessage = wordwrap($body, 100, "\n");

		// //only send if there is new orders, that have not been sent yet. 
		// if ($sendemailCheck) {
		// 	mail($to, $subject, $finalMessage, $headers);
		// 	echo "email sent";
		// }else{
		// 	echo "email failed";
		// }
		// echo $sendemailCheck;
    }
}

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

use EyefiDb\Api\Shipping\Shipping;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new Shipping($db, $dbQad);
$saveInterface = new ShippingChanges($db);

if (isset($_GET['runOpenShippingReport'])) {
    $results = $data->runOpenShippingReport();
    $results1 = $db_connect->json_encode($results);
    $saveInterface->saveToDb($results1);
}
 