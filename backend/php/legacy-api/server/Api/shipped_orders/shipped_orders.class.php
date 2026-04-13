<?php

class ShippedOrders
{

	protected $db;
	public $db1;
	public $nowDate;

	public function __construct($dbQad, $db)
	{

		$this->db = $dbQad;
		$this->db1 = $db;
		$this->nowDate = date("Y-m-d", time());
	}

	public function getCommentsByOrderNumbers($in, $type = 'Sales Order')
	{
		try {
			$comments = "
                SELECT a.orderNum
                    , comments_html comments_html
                    , comments comments
                    , a.createdDate
                    , date(a.createdDate) byDate
                    , case when date(a.createdDate) = curDate() then 'text-success' else 'text-info' end color_class_name
                    , case when date(a.createdDate) = curDate() then 'bg-success' else 'bg-info' end bg_class_name
                    , concat('SO#:', ' ', a.orderNum) comment_title
                    , concat(c.first, ' ', c.last) created_by_name
                FROM eyefidb.comments a
                INNER JOIN (
                    SELECT orderNum
                        , MAX(id) id
                        , MAX(date(createdDate)) createdDate
                    FROM eyefidb.comments
                    WHERE orderNum IN ($in)
                    GROUP BY orderNum
                ) b ON a.orderNum = b.orderNum AND a.id = b.id
                LEFT JOIN db.users c ON c.id = a.userId
                WHERE a.type = :type
                AND a.orderNum IN ($in)
                AND a.active = 1
            ";
			$query = $this->db1->prepare($comments);
			$query->bindParam(':type', $type, PDO::PARAM_STR);
			$query->execute();
			return $query->fetchAll(PDO::FETCH_ASSOC);
		} catch (PDOException $e) {
			http_response_code(500);
			die($e->getMessage());
		}
	}


	public function getNotInvoiced()
	{
		$mainQry = "
				select a.sod_nbr sod_nbr
					, a.sod_due_date sod_due_date
					, a.sod_part sod_part
					, a.sod_qty_ord sod_qty_ord
					, a.sod_qty_ship sod_qty_ship
					, a.sod_price sod_price
					, a.sod_contr_id sod_contr_id
					, a.sod_domain sod_domain
					, a.sod_compl_stat sod_compl_stat
					, a.sod_price*(a.sod_qty_ord-a.sod_qty_ship) openBalance
					, a.sod_qty_ord-a.sod_qty_ship qtyOpen
					, b.pt_desc1 pt_desc1
					, b.pt_desc2 pt_desc2
					, CASE 
						WHEN b.pt_part IS NULL 
							THEN a.sod_desc
						ELSE CONCAT(b.pt_desc1, b.pt_desc2) 
					END fullDesc
					, c.so_cust so_cust
					, a.sod_line sod_line
					, c.so_ord_date so_ord_date
					, c.so_ship so_ship
					, case 
						when a.sod_due_date > f.abs_shp_date 
							then 'Shipped before due date' 
						when a.sod_due_date = f.abs_shp_date 
							then 'Shipped on due date' 
						when a.sod_due_date < f.abs_shp_date
							then 'Shipped after due date' 
					end status
					, case 
						when a.sod_due_date > f.abs_shp_date 
							then 'badge badge-success' 
						when a.sod_due_date = f.abs_shp_date 
							then 'badge badge-warning' 
						when a.sod_due_date < f.abs_shp_date
							then 'badge badge-danger' 
					end status_class
					, sod_order_category sod_order_category
					, a.sod_custpart cp_cust_part

					, c.so_bol so_bol
					, sod_cmtindx so_cmtindx
					, pt_routing pt_routing
					
					, f.abs_shp_date abs_shp_date
					, f.abs_item abs_item
					, f.abs_line abs_line
					, f.abs_ship_qty abs_ship_qty
					, f.abs_inv_nbr abs_inv_nbr
					, f.abs_par_id abs_par_id
					, f.abs_order abs_order
						
					, a.sod_list_pr sod_list_pr
					, IFNULL(abs_ship_qty*a.sod_list_pr, 0) ext
					, g.cmt_cmmt 
					, a.sod_acct
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
				
				LEFT join (
					select abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, sum(abs_ship_qty) abs_ship_qty
						, abs_inv_nbr
						, abs_par_id
						, abs_order
					from abs_mstr 
					where abs_domain = 'EYE'
					GROUP BY abs_shipto
						, abs_shp_date
						, abs_item
						, abs_line
						, abs_inv_nbr
						, abs_par_id
						, abs_order
				) f ON f.abs_order = a.sod_nbr
					AND f.abs_line = a.sod_line
					
				LEFT JOIN (
					select cmt_cmmt
						, cmt_indx
					from cmt_det 
					where cmt_domain = 'EYE' 
				) g ON g.cmt_indx = a.sod_cmtindx
				
				WHERE sod_domain = 'EYE'
				and f.abs_inv_nbr = ''
				ORDER BY a.sod_due_date ASC WITH (NOLOCK)
			";

		$query = $this->db->prepare($mainQry);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		return $result;
	}

	public function ReadOrderInfo($dateFrom, $dateTo)
	{

		$obj = array();

		$mainQry = "
				select a.sod_nbr sod_nbr
					, a.sod_due_date sod_due_date
					, a.sod_part sod_part
					, a.sod_qty_ord sod_qty_ord
					, a.sod_qty_ship sod_qty_ship
					, a.sod_price sod_price
					, a.sod_contr_id sod_contr_id
					, a.sod_domain sod_domain
					, a.sod_compl_stat sod_compl_stat
					, a.sod_price*(a.sod_qty_ord-a.sod_qty_ship) openBalance
					, a.sod_qty_ord-a.sod_qty_ship qtyOpen
					, b.pt_desc1 pt_desc1
					, b.pt_desc2 pt_desc2
					, CASE 
						WHEN b.pt_part IS NULL 
							THEN a.sod_desc
						ELSE CONCAT(b.pt_desc1, b.pt_desc2) 
					END fullDesc
					, c.so_cust so_cust
					, a.sod_line sod_line
					, c.so_ord_date so_ord_date
					, c.so_ship so_ship
					, case 
						when a.sod_due_date > f.abs_shp_date 
							then 'Shipped before due date' 
						when a.sod_due_date = f.abs_shp_date 
							then 'Shipped on due date' 
						when a.sod_due_date < f.abs_shp_date
							then 'Shipped after due date' 
					end status
					, case 
						when a.sod_due_date > f.abs_shp_date 
							then 'badge badge-success' 
						when a.sod_due_date = f.abs_shp_date 
							then 'badge badge-warning' 
						when a.sod_due_date < f.abs_shp_date
							then 'badge badge-danger' 
					end status_class
					, sod_order_category sod_order_category
					, a.sod_custpart cp_cust_part

					, c.so_bol so_bol
					, sod_cmtindx so_cmtindx
					, pt_routing pt_routing
					
					, f.abs_shp_date abs_shp_date
					, f.abs_item abs_item
					, f.abs_line abs_line
					, f.abs_ship_qty abs_ship_qty
					, f.abs_inv_nbr abs_inv_nbr
					, f.abs_par_id abs_par_id
					, f.abs_order abs_order
						
					, a.sod_list_pr sod_list_pr
					, IFNULL(abs_ship_qty*a.sod_list_pr, 0) ext
					, g.cmt_cmmt 
					, a.sod_acct
                    , a.sod_type
					, c.so_rmks
				from sod_det a
				
				left join (
					select pt_part	
						, max(pt_desc1) pt_desc1
						, max(pt_desc2) pt_desc2
						, max(pt_routing) pt_routing
					from pt_mstr
					where pt_domain = 'EYE'
					group by  pt_part		
				) b ON b.pt_part = a.sod_part
				
				left join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
						, so_rmks
					from so_mstr
					where so_domain = 'EYE'
				) c ON c.so_nbr = a.sod_nbr
				
				LEFT join (
					select a.abs_shipto
						, a.abs_shp_date
						, a.abs_item
						, a.abs_line
						, sum(a.abs_ship_qty) abs_ship_qty
						, a.abs_inv_nbr
						, substring(abs_par_id, 2, LENGTH(abs_par_id)) abs_par_id
						, a.abs_order
					from abs_mstr a
					where a.abs_domain = 'EYE'
					GROUP BY a.abs_shipto
						, a.abs_shp_date
						, a.abs_item
						, a.abs_line
						, a.abs_inv_nbr
						, substring(abs_par_id, 2, LENGTH(abs_par_id))
						, a.abs_order
				) f ON f.abs_order = a.sod_nbr
					AND f.abs_line = a.sod_line

				
				
					
				LEFT JOIN (
					select cmt_cmmt
						, cmt_indx
					from cmt_det 
					where cmt_domain = 'EYE' 
				) g ON g.cmt_indx = a.sod_cmtindx
				
				WHERE sod_domain = 'EYE'
				and abs_shp_date between :dateFrom and :dateTo
				and abs_ship_qty > 0
				ORDER BY a.sod_due_date ASC WITH (NOLOCK)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
		$query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		if ($result) {

			$in_array = array();
			foreach ($result as $row) {
				$in_array[] = $row['SOD_NBR'] . '-' . $row['SOD_LINE'];
			}
			$in = "'" . implode("','", $in_array) . "'";

			$commentInfo =   $recent_comments_info = $this->getCommentsByOrderNumbers($in);

			$comments = "
					SELECT *
					FROM eyefidb.workOrderOwner a
					WHERE so IN ($in)
				";
			$query = $this->db1->prepare($comments);
			$query->execute();
			$ownerInfo = $query->fetchAll(PDO::FETCH_ASSOC);

			$qry = "
				SELECT a.created_by
					, a.created_date
					, a.shipping_qty
					, a.so
					, a.line
					, a.submitted_date
					, concat(b.first, ' ', b.last) created_by_name
				FROM forms.shipping_checklist a
				LEFT JOIN db.users b ON b.id = a.created_by
				WHERE concat(a.so, '-', a.line) IN ($in)
			";
			$query = $this->db1->prepare($qry);
			$query->execute();
			$checklist = $query->fetchAll(PDO::FETCH_ASSOC);

			$obj['totalOrderCount'] = 0;

			$obj['shippedBefore'] = 0;
			$obj['shippedOn'] = 0;
			$obj['shippedAfter'] = 0;
			$obj['totalAmount'] = 0;

			foreach ($result as $row) {
				$row['COMMENTS'] = false;
				$row['OWNER'] = "";
				$row['fs_install'] = "";
				$row['fs_install_date'] = "";
				$row['shipViaAccount'] = "";
				$row['COMMENTSMAX'] = '';
				$row['COMMENTSCLASS'] = "";
				$row['id'] = $row['SOD_NBR'] . '-' . $row['SOD_LINE'] . '-' . $row['ABS_PAR_ID'];
				$row['ida'] = $row['SOD_NBR'] . '-' . $row['SOD_LINE'];
				$obj['totalAmount'] = $row['EXT'] + $obj['totalAmount'];
				$row['tj_po_number'] = "";
				$status = trim($row['STATUS']);
				if ($status == 'Shipped before due date') {
					$obj['shippedBefore']++;
				} else if ($status == 'Shipped on due date') {
					$obj['shippedOn']++;
				} else if ($status == 'Shipped after due date') {
					$obj['shippedAfter']++;
				}

				//owner
				foreach ($ownerInfo as $rowOwnerInfo) {
					if ($row['ida'] == $rowOwnerInfo['so']) {
						$row['OWNER'] = $rowOwnerInfo['userName'];
						$row['fs_install'] = $rowOwnerInfo['fs_install'];
						$row['fs_install_date'] = $rowOwnerInfo['fs_install_date'] == null ? '' : $rowOwnerInfo['fs_install_date'];
						$row['arrivalDate'] = $rowOwnerInfo['arrivalDate'] == null ? '' : $rowOwnerInfo['arrivalDate'];
						$row['shipViaAccount'] = $rowOwnerInfo['shipViaAccount'];
						$row['tj_po_number'] = $rowOwnerInfo['tj_po_number'];
					}
				}

				//checklist

				$row['checklist'] = array();
				foreach ($checklist as $checklistRow) {
					$soLine = $checklistRow['so'] . '-' . $checklistRow['line'];
					if ($row['id'] == $soLine) {
						$row['checklist'][] = $checklistRow;
					}
				}

				//comments

				$row['recent_comments'] = new \stdClass();
				foreach ($recent_comments_info as $recent_comments_info_row) {
					if ($row['ida'] == $recent_comments_info_row['orderNum']) {
						$row['recent_comments'] = $recent_comments_info_row;
					}
				}

				if ($row['SOD_DUE_DATE'] <= $this->nowDate) {
					$obj['totalOrderCount']++;
				}
				
                $row['SOD_CONTR_ID'] = preg_replace('/[^a-zA-Z0-9_-]/', '', $row['SOD_CONTR_ID']); 
                $row['CMT_CMMT'] = preg_replace('/[^a-zA-Z0-9_-]/', ' ', $row['CMT_CMMT']); 
				$obj['orderInfo'][] = $row;
			}
		}


		return $obj;
	}
}
