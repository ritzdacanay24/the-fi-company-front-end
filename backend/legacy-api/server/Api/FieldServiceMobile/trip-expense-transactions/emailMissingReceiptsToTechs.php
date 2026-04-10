<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);
    $fsId = $_GET['fsId'];

    $ticketNumber = $_GET['ticketNumber'];

    $mainQry = "
        SELECT group_concat(b.email) emails
        FROM fs_team a
        left join db.users b ON concat(b.first, ' ', b.last) = a.user
        where fs_det_id = :fs_det_id
        group by fs_det_id
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':fs_det_id', $fsId, PDO::PARAM_STR);
    $query->execute();
    $results =  $query->fetch();

    $link 	  = 'https://dashboard.eye-fi.com/dist/fsm-mobile/fields-service/'.$fsId.'/ticket/'.$ticketNumber.'/event?ticketStatus';

    $to         = $results['emails'];
    $ccEmails = "ritz.dacanay@the-fi-company.com, adriann.k@the-fi-company.com, simona.jones@the-fi-company.com";
    $subject    = "Receipts Missing for fsid " . $fsId;

    $body  = 'Hello Techs, <br><br>';
    $body  .= 'You are receiving this email because we were unable to find the below receipts. <br><br>';
    $body  .= 'Please upload the missing receipts to FSID #: ' . $fsId.', <br><br>';
    
    
$date = date("Y-m-d H:i:s", time());


    $body .= '<table rules="all" border="1">';
        $body .= "<tr style='background: #eee;'>";
        $body .= "<td><strong>Transaction ID</strong></td>";
        $body .= "<td><strong>First</strong></td>";
        $body .= "<td><strong>Last</strong></td>";
        $body .= "<td><strong>Merchan</strong></td>";
        $body .= "<td><strong>Amount</strong></td>";
        foreach ($_POST as $row) {
            $body .= "<tr> \r\n";
            $body .= "<td>" . $row['Transaction_ID'] . "</td> \r\n";
            $body .= "<td>" . $row['Cardholder_First_Name'] . "</td> \r\n";
            $body .= "<td>" . $row['Cardholder_Last_Name'] . "</td> \r\n";
            $body .= "<td>" . $row['Original_Merchant_Name'] . "</td> \r\n";
            $body .= "<td>" . $row['Transaction_Amount'] . "</td> \r\n";
            $body .= "</tr> \r\n";

            $qry = dynamicUpdate('fs_trip_expense_transactions', array("email_sent" => $date), $row['id']);
    
            $query = $db->prepare($qry);
            $query->execute();

        }
        $body .= "</table>";


        $headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n";
        $headers .= 'Reply-To:' . MAIL_EMAIL . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
        $headers .= "Content-Transfer-Encoding: 64bit\r\n";
        $headers .= "X-Priority: 3\r\n";
        $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";
        $headers .= "cc: $ccEmails\r\n"; #Your BCC Mail List

        $finalMessage = wordwrap($body, 100, "\n");

        mail($to, $subject, $finalMessage, $headers);


    echo $db_connect->json_encode($results['emails']);