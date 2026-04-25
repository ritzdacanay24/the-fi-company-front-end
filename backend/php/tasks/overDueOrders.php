<?php

use PHPMailer\PHPMailer\PHPMailer;

class SENDEMAIL
{

    protected $db;
    protected $db1;
    public $shippingReport;
    public $graphicsResults;
    public $nowDate;
    public $nowDateTime;
    

    public function __construct($db, $dbQad)
    {

        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->nowDateTime = date("Y-m-d h:m:s", time());
    }

    public function routings($op)
    {
        $mainQry = "
        select wr_nbr wr_nbr
            , a.wr_qty_ord - a.wr_qty_comp openQty
            , dueBy dueBy
            , a.wr_part wr_part
        from 
            ( select a.wr_nbr, 
            a.wr_op, 
            a.wr_qty_ord, 
            a.wr_qty_wip,  
            a.wr_qty_comp, 
            a.wr_status, 
            a.wr_due, 
            a.wr_part, 
            a.wr_queue, 
            a.wr_qty_inque,
            CASE  
                    WHEN b.wo_so_job = 'dropin' 
                        THEN wr_due
                    ELSE 
                        CASE 
                            WHEN a.wr_op = 10
                                THEN 
                                    CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 4
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 4
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 4
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 2
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 2
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 2
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 3
                                        ELSE wr_due - 2
                            END 
                            WHEN a.wr_op = 20
                                THEN 
                                CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 3
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 3
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 1
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 1
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 1
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 1
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 2
                                        ELSE wr_due - 1
                                END 
                            WHEN a.wr_op = 30
                                THEN 
                                CASE 
                                WHEN DAYOFWEEK ( wr_due ) IN (1)
                                    THEN wr_due - 2
                                    WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                        THEN wr_due - 0
                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                        THEN wr_due - 0
                                    ELSE wr_due - 0
                                END 	
                                else wo_due_date			
                        END 
                END dueBy
            from wr_route a 
            join ( 
                select wo_nbr, wo_so_job
                , wo_due_date
                from wo_mstr 
                where wo_domain = 'EYE' 
                    and wo_status != 'c' 
            ) b ON b.wo_nbr = a.wr_nbr 
            where a.wr_qty_ord != a.wr_qty_comp 
                and a.wr_domain = 'EYE' and a.wr_op = :op
            ) a
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':op', $op, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function shippingReport()
    {

        $mainQry = "
        select due_total


        
    from ( 
        select count(sod_nbr) due_total
        from sod_det a

        left join (
            select so_nbr, so_compl_date
            from so_mstr
            where so_domain = 'EYE'
        ) c ON c.so_nbr = a.sod_nbr
            

        WHERE sod_domain = 'EYE'
            and a.sod_due_date = '".$this->nowDate."'
    ) a 
    WITH (NOLOCK)
            ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function dueToday($op)
    {
        $qry = "
        select sum(case when dueBy = '" . $this->nowDate . "' AND complete_status = 0 THEN 1 ELSE 0 END) today_count
            , sum(case when dueBy = '" . $this->nowDate . "' AND complete_status = 1 THEN 1 ELSE 0 END) completed_before_or_on_due_date
            , sum(case when dueBy = '" . $this->nowDate . "' AND complete_status = 0 THEN 1 ELSE 0 END) due_today_not_completed
            , sum(case when dueBy < '" . $this->nowDate . "' AND complete_status = 0 THEN 1 ELSE 0 END) total_overdue_orders
        from ( select wr_nbr wr_nbr
            , a.wr_qty_ord - a.wr_qty_comp openQty
            , dueBy dueBy
            , a.wr_part wr_part
            , a.wr_qty_ord
            , a.wr_qty_comp
            , op_qty_comp
            , op_tran_date
            , op_qty_comp_backflush
            , wo_status
            , case when wo_status = 'C' OR a.wr_qty_ord - a.wr_qty_comp = 0 THEN 1 ELSE 0 END complete_status
        from 
            ( 
                select a.wr_nbr, 
                    a.wr_op, 
                    a.wr_qty_ord, 
                    a.wr_qty_wip,  
                    a.wr_qty_comp, 
                    a.wr_status, 
                    a.wr_due, 
                    a.wr_part, 
                    a.wr_queue, 
                    a.wr_qty_inque,
                    CASE  
                WHEN b.wo_so_job = 'dropin' 
                    THEN wr_due
                ELSE 
                    CASE 
                        WHEN a.wr_op = 10
                            THEN 
                                CASE 
                                    WHEN DAYOFWEEK ( wr_due ) IN (1)
                                        THEN wr_due - 4
                                        WHEN DAYOFWEEK ( wr_due ) IN (2)
                                            THEN wr_due - 4
                                            WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                THEN wr_due - 4
                                                WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                    THEN wr_due - 2
                                                    WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                        THEN wr_due - 2
                                                        WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                            THEN wr_due - 2
                                                            WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                THEN wr_due - 3
                                    ELSE wr_due - 2
                        END 
                        WHEN a.wr_op = 20
                            THEN 
                            CASE 
                                    WHEN DAYOFWEEK ( wr_due ) IN (1)
                                        THEN wr_due - 3
                                        WHEN DAYOFWEEK ( wr_due ) IN (2)
                                            THEN wr_due - 3
                                            WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                THEN wr_due - 1
                                                WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                    THEN wr_due - 1
                                                    WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                        THEN wr_due - 1
                                                        WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                            THEN wr_due - 1
                                                            WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                THEN wr_due - 2
                                    ELSE wr_due - 1
                            END 
                        WHEN a.wr_op = 30
                            THEN 
                            CASE 
                            WHEN DAYOFWEEK ( wr_due ) IN (1)
                                THEN wr_due - 2
                                WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                    THEN wr_due - 0
                                WHEN DAYOFWEEK ( wr_due ) IN (4)
                                    THEN wr_due - 0
                                ELSE wr_due - 0
                            END 			
                            else wo_due_date	
                    END 
            END dueBy 
                    , d.op_qty_comp
                    , d.op_tran_date
                    , d.op_qty_comp op_qty_comp_backflush
                    , wo_status
                from wr_route a 

                left join ( 
                    select wo_nbr, wo_so_job, wo_status
                    , wo_due_date
                    from wo_mstr 
                    where wo_domain = 'EYE' 
                ) b ON b.wo_nbr = a.wr_nbr 
                
                left join (
                    select op_wo_nbr, sum(op_qty_comp) op_qty_comp, max(op_tran_date) op_tran_date
                    from op_hist 
                    where op_wo_op = :op
                    and op_domain = 'EYE'
                    and op_type = 'BACKFLSH'
                    group by op_wo_nbr
                ) d ON d.op_wo_nbr = a.wr_nbr 
                where  a.wr_domain = 'EYE' 
                    and a.wr_op = :op1
            ) a
            ) b
            order by dueBy ASC
        ";

        $query = $this->db->prepare($qry);
        $query->bindParam(':op', $op, PDO::PARAM_STR);
        $query->bindParam(':op1', $op, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function SendMail()
    {

        $totalPastDue10 = 0;
        $totalPastDue20 = 0;
        $totalPastDue30 = 0;
        $totalShippingPastDue = 0;
        $totalGraphicsPastDue = 0;

        $totalShippingDueToday = 0;
        $totalGraphicsDueToday = 0;

        // $getPickingReport = $this->getPickingReport();
        // $productionOrders = $this->getProductionInfo();
        // $getQcFinalTest = $this->getQcFinalTest();

        $getPickingReport = $this->routings(10);
        $productionOrders = $this->routings(20);
        $getQcFinalTest = $this->routings(30);
        $dueToday10 = $this->dueToday(10)['TODAY_COUNT'];
        $dueToday20 = $this->dueToday(20)['TODAY_COUNT'];
        $dueToday30 = $this->dueToday(30)['TODAY_COUNT'];

        $shippingReport = $this->shippingReport()['DUE_TOTAL'];

        // $mainQry = "
        //     SELECT group_concat(b.email) emails
        //     from email_notifications a
        //     join db.users b on b.id = a.user_id
        //     where a.name_of_task = 'over_due_orders'
        // ";
        // $query = $this->db1->prepare($mainQry);
        // $query->execute();
        // $email_notifications =  $query->fetchAll(PDO::FETCH_ASSOC);

        // $emailUsers = "
        //     ritz.dacanay@the-fi-company.com, 
        //     nick.walter@the-fi-company.com,
        //     monica.hubbard@the-fi-company.com,
        //     trang.tran@the-fi-company.com,
        //     darren.mcgraw@the-fi-company.com,
        //     juvenal.torres@the-fi-company.com,
        //     usiel.vazquez@the-fi-company.com,
        //     carlos.ayala@the-fi-company.com
        // ";
        $emailUsers         = emailNotification('overdue_orders');

        // $emailUsers = "
        //     ritz.dacanay@the-fi-company.com
        // ";
        // $emailUsers = $email_notifications['emails'];

        $sendemailCheck = false;

        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->Subject = "Overdue orders";
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }
                

        $mail->Body  = 'Good morning team, <br>';
        //$mail->Body .= 'The list of orders you see below are overdue orders for OPS 10, 20, 30 and overdue shipping orders. Please review.';
        $mail->Body .= '<br><br>';
        $mail->Body .= '<html><body>';

        foreach ($this->graphicsResults as $row) {
            if ($row['graphicsStatus'] != "Ship" && strtolower($row['woNumber']) != "stock") {
                if ($row['sod_due_date'] < $this->nowDate) {
                    $totalGraphicsPastDue++;
                } elseif ($row['sod_due_date'] == $this->nowDate) {
                    $totalGraphicsDueToday++;
                }
            }
        }

        foreach ($this->shippingReport as $row) {
            if ($row['SOD_DUE_DATE'] < $this->nowDate) {
                $totalShippingPastDue++;
            } else if ($row['SOD_DUE_DATE'] == $this->nowDate) {
                $totalShippingDueToday++;
            }
        }

        foreach ($getPickingReport as $row) {
            if ($row['DUEBY'] < $this->nowDate) {
                $totalPastDue10++;
            }
        }
        foreach ($productionOrders as $row) {
            if ($row['DUEBY'] < $this->nowDate) {
                $totalPastDue20++;
            }
        }
        foreach ($getQcFinalTest as $row) {
            if ($row['DUEBY'] < $this->nowDate) {
                $totalPastDue30++;
            } 
        }

        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong></strong></td>";
        $mail->Body .= "<td><strong>Picking</strong></td>";
        $mail->Body .= "<td><strong>Production</strong></td>";
        $mail->Body .= "<td><strong>QC</strong></td>";
        $mail->Body .= "<td><strong>Shipping</strong></td>";
        $mail->Body .= "<td><strong>Graphics</strong></td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "<tr>";
        $mail->Body .= "<td>Overdue Order Lines</td>";
        $mail->Body .= "<td style='color:red;text-align:center'>$totalPastDue10</td>";
        $mail->Body .= "<td style='color:red;text-align:center'>$totalPastDue20</td>";
        $mail->Body .= "<td style='color:red;text-align:center'>$totalPastDue30</td>";
        $mail->Body .= "<td style='color:red;text-align:center'>$totalShippingPastDue</td>";
        $mail->Body .= "<td style='color:red;text-align:center'>$totalGraphicsPastDue</td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "<tr>";
        $mail->Body .= "<td>Order Lines Due Today</td>";
        $mail->Body .= "<td style='text-align:center'>$dueToday10</td>";
        $mail->Body .= "<td style='text-align:center'>$dueToday20</td>";
        $mail->Body .= "<td style='text-align:center'>$dueToday30</td>";
        $mail->Body .= "<td style='text-align:center'>$shippingReport</td>";
        $mail->Body .= "<td style='text-align:center'>$totalGraphicsDueToday</td>";
        $mail->Body .= "</tr>";
        $mail->Body .= "</table>";
        $mail->Body .= '<br><hr>';


        $mail->Body .= "<h3>Pick and Stage Material overdue work orders: <span style='color:red'>$totalPastDue10 lines</span></h3>";
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>Work Order #</strong></td>";
        $mail->Body .= "<td><strong>Part #</strong></td>";
        $mail->Body .= "<td><strong>Open Qty</strong></td>";
        $mail->Body .= "<td><strong>Picking Due By</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($getPickingReport as $row) {

            if ($row['DUEBY'] < $this->nowDate) {
                $link       = "https://dashboard.eye-fi.com/dist/web/operations/wo-lookup?wo_nbr=".$row['WR_NBR'];

                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$link}' target='_parent'> ". $row['WR_NBR']." </a></td> \r\n";
                $mail->Body .= "<td>" . $row['WR_PART'] . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['OPENQTY'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . $row['DUEBY'] . "</td> \r\n";
                $mail->Body .= "</tr> \r\n";
            }

            $sendemailCheck = true;
        }
        $mail->Body .= "</table>";
        $mail->Body .= '<br><hr>';

        $mail->Body .= "<h3>Production overdue work orders: <span style='color:red'>$totalPastDue20 lines</span></h3>";
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>Work Order #</strong></td>";
        $mail->Body .= "<td><strong>Part #</strong></td>";
        $mail->Body .= "<td><strong>Open Qty</strong></td>";
        $mail->Body .= "<td><strong>Production Due By</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($productionOrders as $row) {

            if ($row['DUEBY'] < $this->nowDate) {
                $link       = "https://dashboard.eye-fi.com/dist/web/operations/wo-lookup?wo_nbr=".$row['WR_NBR'];

                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$link}' target='_parent'> ". $row['WR_NBR']." </a></td> \r\n";
                $mail->Body .= "<td>" . $row['WR_PART'] . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['OPENQTY'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . $row['DUEBY'] . "</td> \r\n";
                $mail->Body .= "</tr> \r\n";
            }

            $sendemailCheck = true;
        }
        $mail->Body .= "</table>";
        $mail->Body .= '<br><hr>';

        $mail->Body .= "<h3>Final/Test QC overdue work orders: <span style='color:red'>$totalPastDue30 lines</span></h3>";
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>Work Order #</strong></td>";
        $mail->Body .= "<td><strong>Part #</strong></td>";
        $mail->Body .= "<td><strong>Open Qty</strong></td>";
        $mail->Body .= "<td><strong>QC Due By</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($getQcFinalTest as $row) {

            if ($row['DUEBY'] < $this->nowDate) {
                $link       = "https://dashboard.eye-fi.com/dist/web/operations/wo-lookup?wo_nbr=".$row['WR_NBR'];

                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$link}' target='_parent'> ". $row['WR_NBR']." </a></td> \r\n";
                $mail->Body .= "<td>" . $row['WR_PART'] . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['OPENQTY'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . $row['DUEBY'] . "</td> \r\n";
                $mail->Body .= "</tr> \r\n";
            }

            $sendemailCheck = true;
        }
        $mail->Body .= "</table>";
        $mail->Body .= '<br><hr>';

        $mail->Body .= "<h3>Shipping overdue orders: <span style='color:red'>$totalShippingPastDue lines</span></h3>";
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>SO #</strong></td>";
        $mail->Body .= "<td><strong>Line #</strong></td>";
        $mail->Body .= "<td><strong>Part #</strong></td>";
        $mail->Body .= "<td><strong>Open Qty</strong></td>";
        $mail->Body .= "<td><strong>Due date</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($this->shippingReport as $row) {

            if ($row['SOD_DUE_DATE'] < $this->nowDate) {
                $link       = "https://dashboard.eye-fi.com/dist/web/operations/order-lookup?salesOrderNumber=".$row['SOD_NBR'];

                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td><a href='{$link}' target='_parent'> ". $row['SOD_NBR']." </a></td> \r\n";
                $mail->Body .= "<td>" . $row['SOD_LINE'] . "</td> \r\n";
                $mail->Body .= "<td>" . $row['SOD_PART'] . "</td> \r\n";
                $mail->Body .= "<td>" . number_format($row['QTYOPEN'], 2) . "</td> \r\n";
                $mail->Body .= "<td>" . $row['SOD_DUE_DATE'] . "</td> \r\n";
                $mail->Body .= "</tr> \r\n";

                $sendemailCheck = true;
            }
        }
        $mail->Body .= "</table>";
        $mail->Body .= '<br><hr>';

        $mail->Body .= "<h3>Graphics overdue orders: <span style='color:red'>$totalGraphicsPastDue lines</span></h3>";
        $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>WO #</strong></td>";
        $mail->Body .= "<td><strong>Graphics Status</strong></td>";
        $mail->Body .= "<td><strong>SO #</strong></td>";
        $mail->Body .= "<td><strong>Line #</strong></td>";
        $mail->Body .= "<td><strong>Part #</strong></td>";
        $mail->Body .= "<td><strong>Qty Needed</strong></td>";
        $mail->Body .= "<td><strong>Due date</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($this->graphicsResults as $row) {

            if ($row['sod_due_date'] < $this->nowDate) {
                if ($row['graphicsStatus'] != "Ship" && strtolower($row['woNumber']) != "stock") {
                    $mail->Body .= "<tr> \r\n";
                    $mail->Body .= "<td>" . $row['woNumber'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['graphicsStatus'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['sod_nbr'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['sod_line'] . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['part'] . "</td> \r\n";
                    $mail->Body .= "<td>" . number_format($row['qtyNeeded'], 2) . "</td> \r\n";
                    $mail->Body .= "<td>" . $row['sod_due_date'] . "</td> \r\n";
                    $mail->Body .= "</tr> \r\n";
                    $sendemailCheck = true;
                }
            }
        }
        $mail->Body .= "</table>";
        $mail->Body .= '<br><hr>';

        $mail->Body .= 'This automated email will be sent daily at 3am <br>';
        $mail->Body .= 'Thank you.';

        $mail->Body .= "</body></html>";

        //only send if there is new orders, that have not been sent yet. 
        if ($sendemailCheck) {
            $mail->send();
            echo "email sent";
        } else {
            echo "email failed";
        }
        echo $sendemailCheck;
    }
}

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

use EyefiDb\Api\Shipping\Shipping;

$shippingReport = new Shipping($db, $dbQad);

use EyefiDb\Api\Graphics\GraphicsDemands;

$graphics = new GraphicsDemands($db, $dbQad);

$data = new SENDEMAIL($db, $dbQad);

$data->graphicsResults = $graphics->getGraphicsDemandReport();

$data->shippingReport = $shippingReport->runOpenShippingReport();

$data->SendMail();
