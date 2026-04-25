<?php

    #https://dashboard.eye-fi.com/tasks/lnwDelivery.php
use PHPMailer\PHPMailer\PHPMailer;
	class LNWDELIVERY
	{
	 
		protected $db;
		
		public function __construct($db)
		{
			$this->db = $db;
            
		}			

		public function get($tomorrow)
		{
			
			$sql = "
                select a.sod_nbr
                    , a.sod_part
                    , a.sod_qty_ord
                    , a.sod_qty_ship
                    , a.sod_contr_id
                    , fullDesc
                    , cmt_cmmt
                    , case when a.sod_custpart = '' THEN a.sod_part ELSE a.sod_custpart END sod_custpart 
                    , cast(a.sod_qty_ord-a.sod_qty_ship as numeric(36,0)) openQty
                from sod_det a 

                left join (
                    select pt_part			 
                        , max(pt_desc1) pt_desc1 
                        , max(pt_desc2) pt_desc2				 
                        , max(CONCAT(pt_desc1, pt_desc2)) fullDesc 
                        , max(pt_routing) pt_routing 
                    from pt_mstr 
                    where pt_domain = 'EYE' 
                    group by pt_part		 
                ) b ON b.pt_part = a.sod_part 
                
                LEFT JOIN (
                    select cmt_cmmt 
                        , cmt_indx 
                    from cmt_det  
                    where cmt_domain = 'EYE'  
                ) f ON f.cmt_indx = a.sod_cmtindx 
                
                join so_mstr g ON g.so_nbr = a.sod_nbr 
                    and g.so_domain = 'EYE' 
                    and so_cust = 'BALTEC'
                    and so_ship IN ('NV.PILOT', 'NV.PECOS')
                    and sod_order_category != 'JIT'
                
                where a.sod_domain = 'EYE' 
                    and a.sod_due_date = :tomorrow
                    and cast(a.sod_qty_ord-a.sod_qty_ship as numeric(36,0)) > 0
                    and sod_prodline NOT IN ('TAR', 'FEES')

            ";
			$query = $this->db->prepare($sql);
            $query->bindParam(":tomorrow", $tomorrow, PDO::PARAM_STR);
            $query->execute();
            return  $query->fetchAll(PDO::FETCH_ASSOC);

		}
		
	}

    use EyefiDb\Databases\DatabaseQad;

    $db_connect_qad = new DatabaseQad();
    $dbQad = $db_connect_qad->getConnection();

	$d = new LNWDELIVERY($dbQad);
    
    
    // here is an example
    $default_date = time() + 86400;
    
    $days = 3;

    $dateTable = [];
    $dateSearchArray = [];
    
    for($i=0;$i<$days;$i++){
        $test = $i+1;
        $dateSearch = date('Y-m-d',strtotime("+$test weekdays"));
        $data = $d->get($dateSearch);

        $date=date_create($dateSearch);
        $dateSearchArray[] = date_format($date,"m/d/Y");

        $dateTable[] = array(
            "date" => $dateSearch,
            "details" => $data
        );
    }

    $last_element = array_pop($dateSearchArray);
    array_push($dateSearchArray, 'and '.$last_element);

    

    $emailUsers = "
        ritz.dacanay@the-fi-company.com
    ";

    $mail = new PHPMailer(true);
    $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "LNW DELIVERY " . implode(', ', $dateSearchArray);

    $addresses = explode(',', $emailUsers);
    foreach ($addresses as $address) {
        $mail->AddAddress($address);
    }
       
    
    $addresses = explode(',', $ccEmails);
    foreach ($addresses as $address) {
        $mail->addCC($address);
    }
       

    $mail->Body = "<html><body>";

    $mail->Body  = 'Hello';

    $mail->Body .= '<br><br>';
    $mail->Body .= 'Below is what we have on the schedule for ' . implode(', ', $dateSearchArray);
    $mail->Body .= '<br><br>';
    

    $tableInfo = "";
    foreach ($dateTable as $value) {
        
        $key = $value['date'];
        $details = $value['details'];

        $tableInfo .= "Scheduled for $key <br/>";

        $tableInfo .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
        $tableInfo .= "<tr style='background: #eee;'>";
        $tableInfo .= "<td><strong>SO #</strong></td>";
        $tableInfo .= "<td><strong>PO #</strong></td>";
        $tableInfo .= "<td><strong>Part</strong></td>";
        $tableInfo .= "<td><strong>Cust Part #</strong></td>";
        $tableInfo .= "<td><strong>Qty Open</strong></td>";
        $tableInfo .= "<td><strong>Desc</strong></td>";
        $tableInfo .= "<td><strong>QAD Comments</strong></td>";
        $tableInfo .= "</tr>";
        
        if(count($details) > 0){
            foreach ($details as $row) {
                $tableInfo .= "<tr>";
                $tableInfo .= "<td>" . $row['SOD_NBR'] . "</td>";
                $tableInfo .= "<td>" . $row['SOD_CONTR_ID'] . "</td>";
                $tableInfo .= "<td>" . $row['SOD_PART'] . "</td>";
                $tableInfo .= "<td>" . $row['SOD_CUSTPART'] . "</td>";
                $tableInfo .= "<td>" . $row['OPENQTY'] . "</td>";
                $tableInfo .= "<td>" . $row['FULLDESC'] . "</td>";
                $tableInfo .= "<td>" .   str_replace(';', "", $row['CMT_CMMT']) . "</td>";
                $tableInfo .= "</tr>";
            }
        }else{
            $tableInfo .= "<tr> <td colspan='6' style='text-align:center'> No orders found. </td> </tr>";
        }
        
        $tableInfo .= "</table>";
        $tableInfo .= '<br><hr>';
    }


    $mail->Body .= $tableInfo;

    $mail->Body .= "</body></html>";

    if($mail->send()){
        echo json_encode($dateTable);    
    } else{
        echo "no sent";
    }

