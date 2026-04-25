

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
            select a.status
                , a.invoice_date
                , a.id
                , a.request_date
                , b.id ticket_started
                , dateSubmitted
                , DATEDIFF(CURDATE(), dateSubmitted) age
            from fs_scheduler a
            join fs_workOrder b ON b.fs_scheduler_id = a.id and b.active = 1 AND b.dateSubmitted IS NOT NULL
            where acc_status <> 'INVOICED' 
            AND a.active = 1
            AND status IN ('Pending', 'Confirmed', 'Completed')
            AND DATEDIFF(CURDATE(), dateSubmitted) >= 3
            order by DATEDIFF(CURDATE(), dateSubmitted) desc
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

$priority = 1;

        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->Subject = "Action Required: Review Your Open Field Service Invoices";
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }
                

        $link       = 'https://dashboard.eye-fi.com/dist/web/field-service/jobs/job-open-invoice?isAll=true';

        $mail->Body  = "
            Dear Team, 

            <br/><br/> 

            I hope this message finds you well!
            
            <br/> <br/>

            We're reaching out to remind you about some open field service invoices that have been pending for more than 3 days. To ensure smooth operations and timely billing, it is essential to review and update these jobs as soon as possible.
            <br/> <br/>

            <h3><b>Here is what we need from you:</b></h3>

            <ul style='margin:0px;padding:0px'>
                <li><b>Review the Work Orders:</b> Please take a moment to check the work orders and confirm if the jobs have been completed.</li>
                <li><b>Enter Invoice Information:</b> If the jobs are completed, kindly enter the necessary invoice details.</li>
            </ul>

            <b><a href='{$link}' target='_parent'> Report </a></b> 

            <br/> <br/>

            Your prompt attention to these pending invoices will help us maintain seamless service and ensure that everything is up to date.

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
        $mail->Body .= "<td><strong>Work Order Date Submitted</strong></td>";
        $mail->Body .= "<td><strong>Invoice Date</strong></td>";
        $mail->Body .= "<td><strong>Age</strong></td>";
        $mail->Body .= "</tr>";


        if (count($data) > 0) {
            foreach ($data as $row) {

                $linkById       = "https://dashboard.eye-fi.com/dist/web/field-service/jobs/edit?isAll=true&id=".$row['id'];

                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$linkById}' target='_parent'> View </a></td> \r\n";
                $mail->Body .= "<td>" . $row['id'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['status'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['request_date'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['dateSubmitted'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['invoice_date'] . "</td> \r\n";
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
            echo "Email sent";
        }else{
            echo "No data";
        }

    