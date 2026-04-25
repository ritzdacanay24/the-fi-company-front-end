<?php

use PHPMailer\PHPMailer\PHPMailer;

class CompletedProductionOrdersEmail
{

    public $db;
    public $dbQad;
    public $nowDate;
    public $nowDateTime;

    public function __construct($db, $dbQad)
    {

        $this->db = $db;
        $this->dbQad = $dbQad;
        $this->nowDate = date("Y-m-d", time());
        $this->nowDateTime = date("Y-m-d h:m:s", time());
    }

    public function getData()
    {
        $mainQry = "
            select a.wo_nbr wo_nbr, a.wo_line wo_line, 
            a.wo_due_date wo_due_date, 
            a.wo_part wo_part, 
            a.wo_qty_ord wo_qty_ord, 
            a.wo_qty_comp wo_qty_comp, 
            wod_qty_req wod_qty_req,  
            wod_qty_iss wod_qty_iss, 
            LTRIM(RTRIM(case when (wod_qty_req - wod_qty_iss) = 0 THEN 'Yes' ELSE 'No' END)) wod_status,
            curdate()-a.wo_due_date age
        from wo_mstr a   
        left join (
            select wod_nbr, sum(wod_qty_req) wod_qty_req, sum(wod_qty_iss) wod_qty_iss 
            from wod_det  
            group by wod_nbr 
        ) b ON b.wod_nbr = a.wo_nbr 
        where a.wo_domain = 'EYE'   
        and  a.wo_status NOT IN ('C','P','F','A')  
        and (a.wo_qty_comp - a.wo_qty_ord) = 0  
        order by curdate()-a.wo_due_date DESC
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function productionOrderOverCompletedInQStatus()
    {
        $mainQry = "
        select wr_nbr wr_nbr 
        , wr_op wr_op
        , wr_wkctr wr_wkctr
        , wr_qty_ord wr_qty_ord
        , wr_qty_comp wr_qty_comp
        , wr_status wr_status
        , wr_due wr_due
        , wr_part  wr_part
        from wr_route 
        where wr_qty_comp > wr_qty_ord 
        and wr_domain = 'EYE' 
        and wr_status = 'Q'
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function sendEmail($data)
    {
        
        $yes = 0;
        $no = 0;

        $emailUsers  = emailNotification('production_orders');
        $cc         = "ritz.dacanay@the-fi-company.com";
        

        // $emailUsers = "
        //     ritz.dacanay@the-fi-company.com,
        //     monica.hubbard@the-fi-company.com,
        //     darren.mcgraw@the-fi-company.com,
        //     bryon.jones@the-fi-company.com,
        //     mark.martinez@the-fi-company.com,
        //     dominic.yadao@the-fi-company.com
        // ";
        // $emailUsers = "
        //     ritz.dacanay@the-fi-company.com
        // ";

        
        $productionOrderOverCompletedInQStatus = $this->productionOrderOverCompletedInQStatus();

        $sendemailCheck = false;
        
        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->Subject = "Work Order Status Report";
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }

        $mail->Body  = 'Good morning team, <br>';
        $mail->Body .= '<br><br>';
        $mail->Body .= '<html><body>';

        foreach ($data as $row) {
            if ($row['WOD_STATUS'] == "No" && strtolower($row['WO_LINE']) != 'graphics') {
                $no++;
            }
            if ($row['WOD_STATUS'] == "Yes" || strtolower($row['WO_LINE']) == 'graphics') {
                $yes++;
            }
        }

        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>Ready to Close</strong></td>";
        $mail->Body .= "<td><strong>Picking Issues</strong></td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "<tr>";
        $mail->Body .= "<td style='color:red;text-align:center'>$yes order(s)</td>";
        $mail->Body .= "<td style='color:red;text-align:center'>$no order(s)</td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "</table>";
        $mail->Body .= '<br><hr>';


        $mail->Body .= "<h3>Ready to Close: <span style='color:red'>$yes</span></h3>";
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>Work Order #</strong></td>";
        $mail->Body .= "<td><strong>Line #</strong></td>";
        $mail->Body .= "<td><strong>Due Date</strong></td>";
        $mail->Body .= "<td><strong>Part</strong></td>";
        $mail->Body .= "<td><strong>Qty Ordered</strong></td>";
        $mail->Body .= "<td><strong>Qty Completed</strong></td>";
        $mail->Body .= "<td><strong>Qty Required</strong></td>";
        $mail->Body .= "<td><strong>Qty Issued</strong></td>";
        $mail->Body .= "<td><strong>Status</strong></td>";
        $mail->Body .= "<td><strong>Age</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($data as $row) {

            if ($row['WOD_STATUS'] == "Yes" || strtolower($row['WO_LINE']) == 'graphics') {
                
                $link       = "https://dashboard.eye-fi.com/dist/web/operations/wo-lookup?wo_nbr=".$row['WO_NBR'];

                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$link}' target='_parent'> ". $row['WO_NBR']." </a></td> \r\n";
                $mail->Body .= "<td>" . $row['WO_LINE'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['WO_DUE_DATE'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['WO_PART'] . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['WO_QTY_ORD'], 2)  . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['WO_QTY_COMP'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['WOD_QTY_REQ'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['WOD_QTY_ISS'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . $row['WOD_STATUS'] . "</td> \r\n";
                $mail->Body .= "<td>" . (int)$row['AGE'] < 0 ? '-' : $row['AGE'] . " day(s) </td> ";
                $mail->Body .= "</tr> \r\n";
            }
            $sendemailCheck = true;
        }
        $mail->Body .= "</table>";
        $mail->Body .= '<br><hr>';

        $mail->Body .= "<h3>Picking Issues: <span style='color:red'>$no</span></h3>";
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>Work Order #</strong></td>";
        $mail->Body .= "<td><strong>Line #</strong></td>";
        $mail->Body .= "<td><strong>Due Date</strong></td>";
        $mail->Body .= "<td><strong>Part</strong></td>";
        $mail->Body .= "<td><strong>Qty Ordered</strong></td>";
        $mail->Body .= "<td><strong>Qty Completed</strong></td>";
        $mail->Body .= "<td><strong>Qty Required</strong></td>";
        $mail->Body .= "<td><strong>Qty Issued</strong></td>";
        $mail->Body .= "<td><strong>Status</strong></td>";
        $mail->Body .= "<td><strong>Age</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($data as $row) {

            if ($row['WOD_STATUS'] == "No" && strtolower($row['WO_LINE']) != 'graphics') {
                $link       = "https://dashboard.eye-fi.com/dist/web/operations/wo-lookup?wo_nbr=".$row['WO_NBR'];
                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$link}' target='_parent'> ". $row['WO_NBR']." </a></td> \r\n";
                $mail->Body .= "<td>" . $row['WO_LINE'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['WO_DUE_DATE'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['WO_PART'] . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['WO_QTY_ORD'], 2)  . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['WO_QTY_COMP'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['WOD_QTY_REQ'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['WOD_QTY_ISS'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . $row['WOD_STATUS'] . "</td> \r\n";
                $mail->Body .= "<td>" . (int)$row['AGE'] < 0 ? '-' : $row['AGE'] . " day(s) </td> \r\n";
                $mail->Body .= "</tr> \r\n";
            }
            $sendemailCheck = true;
        }
        $mail->Body .= "</table>";
        $mail->Body .= '<br><hr>';

        $totalCount = count($productionOrderOverCompletedInQStatus);
        $mail->Body .= "<h3>WOs Over Completed: <span style='color:red'>$totalCount</span></h3>";
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>Work Order #</strong></td>";
        $mail->Body .= "<td><strong>Operation</strong></td>";
        $mail->Body .= "<td><strong>Work Center</strong></td>";
        $mail->Body .= "<td><strong>Qty Ordered</strong></td>";
        $mail->Body .= "<td><strong>Qty Completed</strong></td>";
        $mail->Body .= "<td><strong>Status</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($productionOrderOverCompletedInQStatus as $row) {

                $link       = "https://dashboard.eye-fi.com/dist/web/operations/wo-lookup?wo_nbr=".$row['WR_NBR'];
                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$link}' target='_parent'> ". $row['WR_NBR']." </a></td> \r\n";
                $mail->Body .= "<td>" . $row['WR_OP'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['WR_WKCTR'] . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['WR_QTY_ORD'], 2)  . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['WR_QTY_COMP'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . $row['WR_STATUS'] . "</td> \r\n";
                $mail->Body .= "</tr> \r\n";
            $sendemailCheck = true;
        }

        $mail->Body .= "</table>";
        $mail->Body .= '<br><hr>';

        $mail->Body .= 'This automated email will be sent daily at 5am <br>';
        $mail->Body .= 'Thank you.';

        $mail->Body .= "</body></html>";
        
        //only send if there is new orders, that have not been sent yet. 
        if ($sendemailCheck) {
            $mail->send();
            echo "email sent";
        } else {
            echo "Nothing to send";
        }
        echo $sendemailCheck;
    }
}


use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$db_qad = $db_connect_qad->getConnection();

$data = new CompletedProductionOrdersEmail($db, $db_qad);

$res = $data->getData();
echo json_encode($res);

$data->sendEmail($res);

    
