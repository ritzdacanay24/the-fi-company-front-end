<?php

class OldFieldServiceWorkOrders
{

    protected $db;


    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d");
        $this->nowDateTime = date("Y-m-d h:m:s", time());
    }

    public function SendMail()
    {
        $mainQry = "
            SELECT a.fs_scheduler_id
                , a.id 
                , a.createdDate
                , a.userId 
                , a.dateSubmitted
                , b.RequestDate
                , b.Status
                , b.ServiceType
                , b.Customer
                , b.Property
                , b.SignTheme
                , b.installers
                , Concat(DATEDIFF(now(), a.createdDate), ' ', ' day(s) old') age
            FROM eyefidb.fs_workOrder a
            JOIN (
                SELECT RequestDate 
                    , Status 
                    , ServiceType
                    , Customer
                    , Property
                    , SignTheme
                    , CONCAT_WS(', ', LeadInstaller, Installer1, Installer2) installers
                    , id
                FROM eyefidb.fs_scheduler
                WHERE active = 1
            ) b ON b.id = a.fs_scheduler_id
            where a.dateSubmitted IS NULL 
                AND DATEDIFF(now(), a.createdDate) > 7 
            ORDER BY a.createdDate  DESC
        ";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        $to         = 'ritz.dacanay@the-fi-company.com';
        $bccEmails = "ritz.dacanay@the-fi-company.com";
        $subject    = " Overdue Field Service Open Work Orders";

        $body  = 'Total of ' . count($result) . ' over due work orders';
        $body .= '<br>';
        $body .= 'This report is generated daily at 9am';
        $body .= '<br>';
        $body .= 'These orders are passed due and need immediate action. Techs will need to go to their work orders and closed them if complete.';
        $body .= '<br>';
        $body .= '<html><body>';
        $body .= '<table rules="all" style="border-color: #666;" cellpadding="2" border="1">';
        $body .= "<tr style='background: #eee;'>";
        $body .= "<td><strong>FSID</strong></td>";
        $body .= "<td><strong>Ticket #</strong></td>";
        $body .= "<td><strong>Ticket Created On</strong></td>";
        $body .= "<td><strong>Status</strong></td>";
        $body .= "<td><strong>ServiceType</strong></td>";
        $body .= "<td><strong>Customer</strong></td>";
        $body .= "<td><strong>Property</strong></td>";
        $body .= "<td><strong>SignTheme</strong></td>";
        $body .= "<td><strong>installers</strong></td>";
        $body .= "<td><strong>age</strong></td>";
        $body .= "</tr>";

        foreach ($result as $row) {
            $body .= "<tr> \r\n";
            $body .= "<td>" . $row['fs_scheduler_id'] . "</td> \r\n";
            $body .= "<td>" . $row['id'] . "</td> \r\n";
            $body .= "<td>" . $row['createdDate'] . "</td> \r\n";
            $body .= "<td>" . $row['Status'] . "</td> \r\n";
            $body .= "<td>" . $row['ServiceType'] . "</td> \r\n";
            $body .= "<td>" . $row['Customer'] . "</td> \r\n";
            $body .= "<td>" . $row['Property'] . "</td> \r\n";
            $body .= "<td>" . $row['SignTheme'] . "</td> \r\n";
            $body .= "<td>" . $row['installers'] . "</td> \r\n";
            $body .= "<td>" . $row['age'] . "</td> \r\n";
            $body .= "</tr> \r\n";
        }

        $body .= "</table>";
        $body .= '<br><hr>';
        $body .= 'This is an automated email. Please do not respond. <br>';
        $body .= 'Thank you.';

        $body .= "</body></html>";

        $headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n";
        $headers .= 'Reply-To:' . MAIL_EMAIL . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
        $headers .= "Content-Transfer-Encoding: 64bit\r\n";
        $headers .= "X-Priority: 3\r\n";
        $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";
        $headers .= "Bcc: $bccEmails\r\n"; #Your BCC Mail List

        $finalMessage = wordwrap($body, 100, "\n");

        if (count($result) > 0) {
            mail($to, $subject, $finalMessage, $headers);
        } else {
            echo "nothing shipped";
        }
    }
}


use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$deleteSessions = new OldFieldServiceWorkOrders($db);
$deleteSessions->SendMail();
