<?php

class CertificateOfCompliance
{

       protected $db;

       public function __construct($dbQad)
       {
              $this->db = $dbQad;
              $this->nowDate = date("Y-m-d");
       }

       public function getLotNumbers($partNumber)
       {

              $mainQry = "
                     select ld_part ld_part
                            , ld_lot  ld_lot
                     from ld_det 
                     where ld_part = :partNumber
                            and ld_domain = 'EYE'
                     WITH (NOLOCK)
		";

              $query = $this->db->prepare($mainQry);
              $query->bindParam(":partNumber", $partNumber, PDO::PARAM_STR);
              $query->execute();
              $result = $query->fetchAll(PDO::FETCH_ASSOC);

              return $result;
       }

       public function ati_shipped_orders()
       {

              $mainQry = "
				select top 10 a.sod_nbr sod_nbr
					, a.sod_due_date sod_due_date
					, a.sod_part sod_part
					, a.sod_qty_ord sod_qty_ord
					, a.sod_qty_ship sod_qty_ship
					, b.pt_desc1 pt_desc1
					, b.pt_desc2 pt_desc2
					, c.so_cust so_cust
					, a.sod_line sod_line
					, c.so_ship so_ship
					, a.sod_custpart cp_cust_part

					, f.abs_shp_date abs_shp_date
					, f.abs_item abs_item
					, f.abs_line abs_line
                                   , cast(f.abs_ship_qty as numeric(36,0)) abs_ship_qty
					, a.sod_acct
                                   
					, a.sod_contr_id sod_contr_id
                                   , f.abs_lotser abs_lotser
				from sod_det a
				
				left join (
					select pt_part	
						, pt_desc1
						, pt_desc2
						, max(pt_routing) pt_routing
					from pt_mstr
					where pt_domain = 'EYE'
					group by  pt_part	
						, pt_desc1		
						, pt_desc2			
				) b ON b.pt_part = a.sod_part
				
				join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
					from so_mstr
					where so_domain = 'EYE'
				) c ON c.so_nbr = a.sod_nbr
                                   AND so_cust = 'ATI'
				
				LEFT join (
					select abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, sum(abs_ship_qty) abs_ship_qty
						, abs_inv_nbr
						, abs_par_id
						, abs_order
                                          , abs_lotser
					from abs_mstr 
					where abs_domain = 'EYE'
					GROUP BY abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, abs_inv_nbr
						, abs_par_id
						, abs_order
                                          , abs_lotser
				) f ON f.abs_order = a.sod_nbr
					AND f.abs_line = a.sod_line
				
				WHERE sod_domain = 'EYE'
				and abs_shp_date = :dateFrom
                            and abs_ship_qty > 0
				ORDER BY a.sod_contr_id ASC 
                            WITH (NOLOCK)
			";

              $date = $this->nowDate;
              $query = $this->db->prepare($mainQry);
              $query->bindParam(":dateFrom", $date, PDO::PARAM_STR);
              $query->execute();
              $result = $query->fetchAll(PDO::FETCH_ASSOC);

              return $result;
       }


       public function run()
       {
              $this->cocemail();
       }

       public function cocemail()
       {

              $atiShippedOrders = $this->ati_shipped_orders();

              if (!$atiShippedOrders)
                     echo "No shipped orders found for ATI";

              $to = 'ritz.dacanay@the-fi-company.com';
              $from = 'noreply@the-fi-company.com';
              $fromName = 'SenderName';
              $cc         = "ritz.dacanay@the-fi-company.com";
              $bcc         = "ritz.dacanay@the-fi-company.com";
              //$cc         = "";
              $checkPO = "";
              foreach ($atiShippedOrders as $row) {

                     $body = "";

                     $subject = "PO# " . $row['SOD_CONTR_ID'];
                     $checkPO = $row['SOD_CONTR_ID'];

                     // $lotNumbers = $this->getLotNumbers($row['SOD_PART']);


                     // $lot = "";
                     // if ($lotNumbers) {
                     //     foreach ($lotNumbers as $row1) {
                     //         $lot .= "<div>" . $row1['LD_LOT'] . "</div> \r\n";
                     //     }
                     // }      


                     $body .= "<tr> \r\n";
                     $body .= "<td align='left'>" . $row['SOD_NBR'] . "</td> \r\n";
                     $body .= "<td>" . $row['SOD_CONTR_ID'] . "</td> \r\n";
                     $body .= "<td>" . $row['SOD_PART'] . "</td> \r\n";
                     $body .= "<td>" . $row['CP_CUST_PART'] . "</td> \r\n";
                     $body .= "<td>" . $row['PT_DESC1'] . "</td> \r\n";
                     $body .= "<td>" . $row['ABS_SHIP_QTY'] . "</td> \r\n";
                     $body .= "<td>" . $row['ABS_LOTSER'] . "</td> \r\n";
                     $body .= "</tr> \r\n";

                     $htmlContent = ' 
                     <html> 
                     <head> 
                     
                            <style>
                            #customers {
                            font-family: Arial, Helvetica, sans-serif;
                            border-collapse: collapse;
                            width: 100%;
                            }

                            #customers td, #customers th {
                            border: 1px solid #ddd;
                            padding: 4px;
                            font-size:12px
                            }


                            #customers tr:hover {background-color: #ddd;}

                            #customers th {
                            padding-top: 8px;
                            padding-bottom: 8px;
                            text-align: left;
                            background-color: #12214A;
                            color: white;
                            }
                            .alignleft {
                                   float: left;
                                   width:33.33333%;
                                   text-align:left;
                                 }
                                 .aligncenter {
                                   float: left;
                                   width:33.33333%;
                                   text-align:center;
                                 }
                                 .alignright {
                                  float: right;
                                  width:33.33333%;
                                  text-align:right;
                                  
                                 }​

                                 
                                   tr.noBorder td {
                                          border: 0 !important
                                   }
                            </style>
                     </head> 
                     <body style="background-color:#fff; width:80%;padding:40px"> 
                            <table style="width:100%" border="0">
                                   <tr>
                                          <td style="width:60px">
                                                 <img src="https://dashboard.eye-fi.com/app/src/assets/images/fi.png" alt="Hotel" style="margin: 0; border: 0; padding: 0; display: block;position:relative"
                                                 src="images/img.jpg" width="80" height="80"/><br/>
                                          </td>
                                          <td style="width:100%" align="center">
                                                 <h1 style="font-weight:bold">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Certificate of Compliance (COC)</h1>
                                          </td>
                                          <td style=" font-size:12px; white-space:nowrap">
                                          Date: ' . $this->nowDate . '
                                          </td>
                                   </tr>
                            </table>

                            

                            <table style="width:100%">
                                   <tr>
                                          <td>
                                                 <table id="customers">
                                                        <tr> <td align="left" style="font-weight:bold">Delivery Address:</td> </tr> 
                                                        <tr class="noBorder"> <td align="left">Aristocrat Technologies, Inc</td> </tr> 
                                                        <tr> <td align="left">10220 Aristocrat Way,</th> </td> 
                                                        <tr> <td align="left">Las Vegas, NV 89135 U.S.A </td> </tr> 
                                                 </table>
                                          </td>
                                          <td>
                                          <table id="customers">
                                                 <tr> <td align="left" style="font-weight:bold">Supplier:</td> </tr> 
                                                 <tr> <td align="left">Eyefi</td> </tr> 
                                                 <tr> <td align="left">7900 W Sunset Rd-Ste 200</td> </tr> 
                                                 <tr> <td align="left">Las Vegas, NV 89113 U.S.A </td> </tr> 
                                          </table> 
                                          </td>
                                   </tr>
                            </table>
                            <br/>

                            <table id="customers" style="width:100%">
                                   <tr>
                                          <td style="width:600px">
                                                 <table id="customers" >
                                                        <tr> <th align="left">Eyefi UL File#:</th> </tr> 
                                                        <tr> <td align="left" style="font-weight:bold;font-size:18px">E325442</td></tr> 
                                                 </table>
                                          </td>
                                          <td style="width:600px">
                                                 <table id="customers">
                                                        <tr> <th align="left">Region:</th> </tr> 
                                                        <tr> <td align="left" style="font-weight:bold;font-size:18px">U.S.A</td> </tr> 
                                                 </table> 
                                          </td>
                                   </tr>
                            </table>

                            <h4>The items mentioned below have been tested and inspected in accordance with Eyefi Quality Control procedures and meet UL requirements.</h4> 

                            <br/>

                            <table id="customers" style="white-space:nowrap">
                                   <tr>
                                          <th align="left">Eyefi Sales Order#</th> 
                                          <th align="left">Aristocrat PO#</th>  
                                          <th align="left">Eyefi Part#</th> 
                                          <th align="left">Aristocrat Part#</th> 
                                          <th align="left">Description</th> 
                                          <th align="left">Qty Shipped</th> 
                                          <th align="left">Eyefi Serial#</th>
                                   </tr>
                                   ' .
                            $body .
                            '
                            </table>

                            <table  style="width:100%; white-space:nowrap" border="0">
                                   <tr>
                                          <td style="width:250px;padding:0">
                                                 <img src="https://dashboard.eye-fi.com/app/src/assets/images/harrysignature1.PNG" alt="Hotel" style="margin: 0; border: 0; padding: 0; display: block;position:relative"
                                                 src="images/img.jpg" width="90" height="90"/><br/>
                                                 <p class="alignleft" style="width:250px;padding:0;margin-top:-18px">Srihari "Harry" Vasudevan <br/> Eyefi UL Technical Representative</p>
                                          </td>
                                          <td align="center"></td>
                                          <td  align="right">
                                                 QA-FRM-105 Rev.0 (2021-03-09)                                          
                                          </td>
                                   </tr>
                            </table>

                     </body> 
                     </html>';


                     $headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n" .
                            'Reply-To:' . MAIL_EMAIL . "\r\n";
                     $headers .= "Cc: $cc\r\n";
                     $headers .= "Bcc: $bcc\r\n";
                     $headers .= "Reply-To: " . ($to) . "\r\n";
                     $headers .= "Return-Path: " . ($to) . "\r\n";
                     $headers .= "MIME-Version: 1.0\r\n";
                     $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
                     $headers .= "Content-Transfer-Encoding: 64bit\r\n";
                     $headers .= "X-Priority: 3\r\n";
                     $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";

                     if (mail($to, $subject, $htmlContent, $headers)) {
                            echo 'Email has sent successfully.';
                     } else {
                            echo 'Email sending failed.';
                     }
              }

              echo 'Total: ' . count($atiShippedOrders);
       }
}

use EyefiDb\Databases\DatabaseQad;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$data = new CertificateOfCompliance($dbQad);
echo $data->run();
