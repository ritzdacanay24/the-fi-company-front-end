<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class Rfq
{

	protected $db;
	public $userInfo;

	public function __construct($db, $dbQad)
	{

		$this->db = $db;
		$this->db1 = $dbQad;
		$this->nowDate = date(" Y-m-d H:i:s", time());
	}

	public function AuthUsers()
	{
		return (object) array(
			'email' => (object) array(
				'allowEmailSend' => array(
					'Ritz Dacanay','Greg Nix','Brian Hudson'
				),
				'addAddress' => array(
					'greg.nix@the-fi-company.com', 
					'brian.hudson@the-fi-company.com'
				),
				'bcAddress' => array(
					'ritz.dacanay@the-fi-company.com'
				)
			)
		);
	}

	public function AuthUserCheck($accessSection)
	{
		if (in_array($this->userInfo->full_name, $accessSection)) {
			return true;
		}
		return false;
	}

	public function SendFormEmail($data, $lineInfoEachShow, $palletSizeInformationSendInfo, $salesOrder, $customerSelected, $emailToSendTo)
	{

		// if (!$this->AuthUserCheck($this->AuthUsers()->email->allowEmailSend)) {
		// 	$error = new stdClass;
		// 	$error->message = 'Access denied';
		// 	return $error;
		// }

		
        $this->db->beginTransaction();

        try {
			$mainQry = "
				UPDATE eyefidb.rfq
					SET email_sent_date = :email_sent_date
				WHERE id = :id	
			";
			$query = $this->db->prepare($mainQry); 
			$query->bindParam(':email_sent_date', $this->nowDate, PDO::PARAM_STR);
			$query->bindParam(':id', $_GET['id'], PDO::PARAM_INT);
			$query->execute();

			$toEmails = $emailToSendTo;
			//$toEmails = array('ritz.dacanay@the-fi-company.com', 'jessica.francis@the-fi-company.com');

			$mail = new PHPMailer(true);
        	$mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');

			if ($this->userInfo->id != 3) {
				foreach ($toEmails as $e) {
					$mail->addAddress($e);
				}

				foreach ($data['ccEmails'] as $e) {
					$mail->addCustomHeader("CC:" . $e);
				}

				//emails will be set to
				// $objects = $this->AuthUsers()->email->addAddress;
				// foreach ($objects as $obj) {
				// 	$mail->addAddress($obj);
				// }
			} else {
				//testing purpose
				$objects = $toEmails;
				foreach ($objects as $obj) {
					$mail->addAddress($obj);
				}

				foreach ($data['ccEmails'] as $e) {
					$mail->addCustomHeader("CC:" . $e);
				}
			}

			//addbc
			$objects = $this->AuthUsers()->email->bcAddress;
			
			foreach ($objects as $obj) {
				$mail->addBcc($obj);
			}

			$mail->Priority = 2;
			$mail->addCustomHeader('Content-Type', 'text/html; charset=UTF-8');

			$mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
			//$mail->Subject = $customerSelected['company'] . ' - Pick Up Form - ' . $salesOrder . ' PO# ' . $data['poNumber'];
			$mail->Subject = $data['subjectLine'];

			$insuranceIncluded = isset($data['insuranceIncluded']) && $data['insuranceIncluded'] ? 'Yes' : 'No';

			$bolFaxEmail = isset($data['bolFaxEmail']) && $data['bolFaxEmail'] ? implode(',<br>', $data['bolFaxEmail']) : 'No emails attached';
			//$bolFaxEmail = "eyefilogistics@the-fi-company.com";

			$mail->Body = '<html><body>';

			$mail->Body .= "<table align='left' style='text-align:center' style='width:600px'>";
			$mail->Body .= "<tr>";
			$mail->Body .= "<td align='left' style='text-align:center'>";

			$mail->Body .= '<br>';
			$mail->Body .= '<br>';

			$mail->Body .= '<table style="border: 1px solid black;width:100%">';
			$mail->Body .= "<tr style='font-size:25px;background-color:#2a3140;padding:30px;color:white;text-align:center'><td colspan='2' style='padding:10px'><strong>Shipping Information</td></tr>";
			$mail->Body .= "<tr><td><strong>Shipper Name</strong> </td><td>" . $data['shipperName'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Address</strong> </td><td>" . $data['address'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>City/State/Zip</strong> </td><td>" . $data['city'] . ', ' . $data['state'] . ' ' . $data['zip'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Phone:</strong> </td><td>" . $data['phone'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Requester Name</strong> </td><td>" . $data['requestorName'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Contact Name</strong> </td><td>" . $data['contactName'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Shipping Hours</strong> </td><td>" . $data['shippingHours'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Ready Date & Time</strong> </td><td>" . $data['readyDateTime'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>PU#- provide if required</strong> </td><td>" . $data['puNumber'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>PO#</strong> </td><td>" . $data['poNumber'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Is PO Shipping in FULL?</strong> </td><td>" . $data['poShippingFull'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Appointment Required?</strong> </td><td>" . $data['appointmentRequired'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Lift Gate Required?</strong> </td><td>" . $data['liftGateRequired'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>BOL GOES TO FAX/EMAIL</strong> </td><td> $bolFaxEmail </td></tr>";

			$mail->Body .= "<tr style='font-size:25px;background-color:#2a3140;padding:30px;color:white;text-align:center'><td colspan='2' style='padding:10px'><strong>Destination Information</td></tr>";
			$mail->Body .= "<tr><td><strong>Company Name</strong> </td><td>" . $data['dest_companyName'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Address</strong> </td><td>" . $data['dest_address'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Address 2</strong> </td><td>" . $data['dest_address2'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>City/State/Zip</strong> </td><td>" . $data['dest_city'] . ', ' . $data['dest_state'] . ' ' . $data['dest_zip'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Country</strong> </td><td>" . $data['dest_country'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Phone</strong> </td><td>" . $data['dest_phone'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Contact Name</strong> </td><td>" . $data['dest_contactName'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Deliver # - provide if required</strong> </td><td>" . $data['dest_deliveryNumber'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Delivery Date</strong> </td><td>" . $data['dest_deliveryDate'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Appointment Required?</strong> </td><td>" . $data['dest_appointmentRequired'] . "</td></tr>";

			$mail->Body .= "<tr style='font-size:25px;background-color:#2a3140;padding:30px;color:white;text-align:center'><td colspan='2' style='padding:10px'><strong>Commodity Information</td></tr>";
			$mail->Body .= "<tr><td><strong>Description Of Product</strong> </td><td>" . $data['descriptionOfProduct'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Pallets/Pieces/Cartons</strong> </td><td>" . $data['piecesQty'] . ' ' . $data['piecesQtyUoM'] . "</td></tr>";
			if ($palletSizeInformationSendInfo) {
				$palletIndex = 0;
				foreach ($palletSizeInformationSendInfo as $row) {
					if ($row['size'] != "") {
						$palletIndex++;
						$mail->Body .= "<tr><td><strong>Pallet Size ($palletIndex)</strong> </td><td>" . $row['size'] . "</td></tr>";
					}
				}
			}
			$mail->Body .= "<tr><td><strong>Weight</strong> </td><td>" . $data['weight'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Decalared Value</strong> </td><td>$" . number_format($data['value'], 2, ".", ",")  . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Include Insurance</strong> </td><td>" . $insuranceIncluded . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Freight Class</strong> </td><td>" . $data['freightClass'] . "</td></tr>";
			$mail->Body .= "<tr><td><strong>Special Requirements</strong> </td><td>" . $data['specialRequirements'] . "</td></tr>";

			$mail->Body .= "</table>";

			if ($lineInfoEachShow) {
				$mail->Body .= '<table style="border: 1px solid black;width:100%">';
				$mail->Body .= "<tr style='background: #eee;'>";
				$mail->Body .= "<td><strong>Part</strong></td>";
				$mail->Body .= "<td><strong>Qty Shipped</strong></td>";
				$mail->Body .= "<td><strong>Price</strong></td>";
				$mail->Body .= "</tr>";

				foreach ($lineInfoEachShow as $row) {

					if ($row['addItemsList'] === true) {
						$mail->Body .= "<tr> \r\n";
						$mail->Body .= "<td>" . $row['sod_part'] . "</td> \r\n";
						$mail->Body .= "<td>" . $row['qty'] . "</td> \r\n";
						$mail->Body .= "<td>$" . number_format($row['sod_list_pr'], 2, ".", ",") . "</td> \r\n";
						$mail->Body .= "</tr> \r\n";
					}
				}

				$mail->Body .= "</table>";
			}

			$mail->Body .= '<br><hr>';
			$mail->Body .= 'Thank you. <br>';
			$mail->Body .= 'Ref: Email sent by ' . $this->userInfo->full_name;

			$mail->Body .= "</td>";
			$mail->Body .= "</tr>";
			$mail->Body .= "</table>";

			$mail->Body .= "</body></html>";

			$this->db->commit();
			
			/**
			 * For testing
			 */
			//return $mail;
			$mail->send();

		} catch(PDOException $e) { 
			$this->db->rollBack();
			http_response_code(500);
			die($e->getMessage());
		}
	}

	public function read($so, $line)
	{

		$mainQry = "
				select a.sod_nbr sod_nbr
					, a.sod_due_date sod_due_date
					, a.sod_due_date-c.so_ord_date leadTime
					, a.sod_part sod_part
					, a.sod_qty_ord sod_qty_ord
					, a.sod_qty_ship sod_qty_ship
					, a.sod_price sod_price
					, a.sod_contr_id sod_contr_id
					, a.sod_domain sod_domain
					, a.sod_compl_stat sod_compl_stat
					, a.sod_price*(a.sod_qty_ord-a.sod_qty_ship) open_balance
                    , a.sod_qty_ord-a.sod_qty_ship qty_open
                    , a.sod_qty_all sod_qty_all
					, CASE 
						WHEN b.pt_part IS NULL 
							THEN a.sod_desc
						ELSE b.fullDesc
					END fullDesc
					, c.so_cust so_cust
					, a.sod_line sod_line
					, c.so_ord_date so_ord_date
					, c.so_ship so_ship
					, case
						when a.sod_due_date < curdate()
							then 'Past Due'
						when a.sod_due_date = curdate()
							then 'Due Today'
						when a.sod_due_date > curdate()
							then 'Future Order'
					end status
					, case 
						when a.sod_due_date < curdate() 
							then 'badge badge-danger' 
						when a.sod_due_date = curdate() 
							then 'badge badge-warning' 
						when a.sod_due_date > curdate() 
							then 'badge badge-success' 
					end statusClass
					, sod_order_category sod_order_category
					, a.sod_custpart cp_cust_part
					, IFNULL(e.ld_qty_oh, 0) ld_qty_oh
					, c.so_bol so_bol
					, sod_cmtindx so_cmtindx
					, pt_routing pt_routing
					, curdate()-a.sod_due_date age
					, a.sod_list_pr sod_list_pr
                    , f.cmt_cmmt 
					, a.sod_part work_order_routing
                    , a.sod_acct
                    , f.ad_line1
                    , f.ad_sort
                    , f.ad_zip
                    , f.ad_state
                    , f.ad_city
                    , f.ad_ref
                    , f.ad_name
					, f.ad_addr
					, f.ad_line2
					, f.ad_country
				from sod_det a
				
				left join (
					select pt_part							
						, max(CONCAT(pt_desc1, pt_desc2)) fullDesc
						, max(pt_routing) pt_routing
					from pt_mstr
					where pt_domain = 'EYE'
					group by pt_part		
				) b ON b.pt_part = a.sod_part
				
				left join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
					from so_mstr
					where so_domain = 'EYE'
				) c ON c.so_nbr = a.sod_nbr
				
				LEFT JOIN (
					select a.ld_part
						, sum(a.ld_qty_oh) ld_qty_oh
					from ld_det a
					JOIN loc_mstr b ON b.loc_loc = a.ld_loc 
						AND b.loc_type = 'FG' 
						AND loc_domain = 'EYE'
					WHERE a.ld_domain = 'EYE'
					GROUP BY a.ld_part
				) e ON e.ld_part = a.sod_part
				
				LEFT JOIN (
					select cmt_cmmt
						, cmt_indx
					from cmt_det 
					where cmt_domain = 'EYE' 
                ) f ON f.cmt_indx = a.sod_cmtindx
                
				LEFT JOIN (
					select ad_addr
                        , ad_name
                        , ad_ref
                        , ad_line1
                        , ad_city
                        , ad_state
                        , ad_zip
						, ad_sort
						, ad_line2
						, ad_country
                    from ad_mstr 
                    where ad_domain = 'EYE' 
				) f ON f.ad_addr = c.so_ship
					
                WHERE sod_domain = 'EYE'
                    AND a.sod_nbr = :sod_nbr
				ORDER BY a.sod_due_date ASC 
				WITH (NOLOCK)
			";
		$query = $this->db1->prepare($mainQry);
		$query->bindParam(':sod_nbr', $so, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		$obj['main'] = new stdClass();
		$obj['otherLines'] = array();

		foreach ($result as &$row) {

			$info = (object) array(
				'shipperName' => 'EYEFI',
				'address' => '7900 West Sunset Rd. Suite 200 & 300',
				'city' => 'Las Vegas',
				'state' => 'NV',
				'zip' => '89113',
				'phone' => '725-261-1525',
				'requestorName' => $this->userInfo->full_name,
				'contactName' => 'Greg Nix',
				'shippingHours' => '7-4',
				'readyDateTime' => '',
				'puNumber' => 'N/A',
				'poShippingFull' => 'No',
				'appointmentRequired' => 'No',
				'liftGateRequired' => 'No',
				'bolFaxEmail' => array('eyefilogistics@the-fi-company.com'),
				'ccEmails' => array('eyefilogistics@the-fi-company.com'),
				'dest_address' => $row['ad_line1'],
				'dest_address2' => $row['ad_line2'],
				'dest_country' => $row['ad_country'],
				'dest_city' => $row['ad_city'],
				'dest_state' => $row['ad_state'],
				'dest_zip' => $row['ad_zip'],
				'dest_phone' => 'N/A',
				'dest_contactName' => 'N/A',
				'dest_deliveryNumber' => 'N/A',
				'dest_deliveryDate' => '',
				'dest_appointmentRequired' => 'No',
				'dest_companyName' => $row['ad_name'],
				'descriptionOfProduct' => '',
				'piecesQty' => 0,
				'piecesQtyUoM' => 'Pallets',
				'palletSpacesLinearFeet' => '',
				'weight' => '',
				'itemNumber' => $row['sod_part'],
				'value' => 0,
				'freightClass' => '300',
				'palletSize' => '',
				'poNumber' => $row['sod_contr_id'],
				'lineNumber' => $row['sod_line'],
				'sod_nbr' => $row['sod_nbr'],
				'specialRequirements' => ""

			);

			if ($row['sod_line'] == $line) {
				$obj['main'] = $info;
				$row['addItemsList'] = $row['open_balance'] > 0;
				$row['value'] = 0;
				$row['piecesQty'] = 0;
				$obj['otherLines'][] = $row;
			} else {
				$row['addItemsList'] = $row['open_balance'] > 0;
				$row['value'] = 0;
				$row['piecesQty'] = 0;
				$obj['otherLines'][] = $row;
			}
		}

		return $obj;
	}


	public function __destruct()
	{
		$this->db = null;
	}
}
