<?php

namespace EyefiDb\Api\SafetyStock;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

use EyefiDb\Api\Comment\Comment;

class SafetyStock
{

	protected $db;

	public function __construct($db, $dbQad)
	{

		$this->db = $dbQad;
		$this->db1 = $db;
		$this->todayDate = date("Y-m-d", time());

		$this->comment = new Comment($db);
	}

	public function ReadAll()
	{

		//yellow - has po and oh qty is less than saftey stock. 
		//red - no po qty and oh > safety stock

		$commentInfo =  $this->comment->readRecentComment('Safety Stock');

		$mainQry = "
				select a.pt_part pt_part
					, CONCAT(a.pt_desc1, a.pt_desc2) pt_desc1
					, a.pt_um pt_um
					, a.pt_part_type pt_part_type
					, a.pt_sfty_stk pt_sfty_stk
					, CASE WHEN b.ld_qty_oh IS NULL THEN 0 ELSE b.ld_qty_oh END ld_qty_oh
					, c.orderedQty orderedQty
					, a.pt_vend po_vend
					, CASE 
						WHEN ( b.ld_qty_oh < a.pt_sfty_stk OR b.ld_qty_oh IS NULL) AND c.orderedQty IS NULL
							THEN 'Need To Place Order'
						WHEN ( b.ld_qty_oh < a.pt_sfty_stk OR b.ld_qty_oh IS NULL) AND c.orderedQty IS NOT NULL
							THEN 'Has PO and OH Qty is less than Safety Stock'
						WHEN c.orderedQty IS NOT NULL
							THEN 'PO Placed'
						ELSE ''
					END placeOrder
					, CASE 
						WHEN ( b.ld_qty_oh < a.pt_sfty_stk OR b.ld_qty_oh IS NULL) AND c.orderedQty IS NULL
							THEN 'text-danger'
						WHEN ( b.ld_qty_oh < a.pt_sfty_stk OR b.ld_qty_oh IS NULL) AND c.orderedQty IS NOT NULL
							THEN 'text-warning'
						WHEN c.orderedQty IS NOT NULL
							THEN 'text-success'
					END placeOrderClass
					, a.pt_pm_code
					, g.wo_qty_ord
					, h.sod_qty_ord
					, e.pod_status pod_status
				from pt_mstr a
				
				left join (
					select a.ld_part
						, sum(a.ld_qty_oh) ld_qty_oh
					from ld_det a
					WHERE ld_domain = 'EYE'
						AND ld_loc NOT IN ('INTGRTD', 'JIAXING')
						AND ld_loc NOT LIKE 'Z%'
					GROUP BY a.ld_part
				) b ON b.ld_part = a.pt_part
				
				LEFT JOIN (
					select pod_part
						, sum(pod_qty_ord-pod_qty_rcvd) orderedQty
					from pod_det a
					where a.pod_domain = 'EYE'
						AND a.pod_status NOT IN ('c')
						AND year(pod_due_date) >= '2019'
						AND pod_loc != 'JIAXING'
					GROUP BY pod_part
				) c ON c.pod_part = a.pt_part
				
				LEFT JOIN (
					select pod_part
						, max(po_ord_date) po_ord_date
						, max(a.pod_status) pod_status
					from pod_det a
					left join (
						select po_nbr
							, po_ord_date
						FROM po_mstr
						WHERE po_domain = 'EYE'
					) b ON b.po_nbr = a.pod_nbr
					WHERE pod_domain = 'EYE'
					AND pod_loc != 'JIAXING'
					GROUP BY pod_part
				) e ON e.pod_part = a.pt_part
				
				
					
				LEFT JOIN (
					SELECT sum(wo_qty_ord) wo_qty_ord
						, wo_part
					FROM wo_mstr
					WHERE wo_domain = 'EYE'
						AND wo_status = 'R'
						AND wo_qty_ord-wo_qty_comp > 0
					GROUP BY wo_part
				) g ON g.wo_part = a.pt_part

				LEFT JOIN (
					SELECT sum(sod_qty_ord) sod_qty_ord
						, sod_part
					FROM sod_det
					WHERE sod_domain = 'EYE'
						AND sod_qty_ord-sod_qty_ship > 0
					GROUP BY sod_part
				) h ON h.sod_part = a.pt_part
			
				
				where a.pt_domain = 'EYE' 
					and a.pt_sfty_stk > 0
				
				WITH (NOLOCK)
			";

		$query = $this->db->prepare($mainQry);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		$obj = array();

		$obj['poPlaced'] = 0;
		$obj['notEnough'] = 0;
		$obj['orderMore'] = 0;
		foreach ($result as $row) {

			$row['PT_DESC1'] = preg_replace('/[\x00-\x1F\x7F-\xFF]/', '', $row['PT_DESC1']);

			$row['id'] = $row['PT_PART'];

			$l = trim($row['PLACEORDERCLASS']);
			if ($l == 'text-danger') {
				$obj['orderMore']++;
			}
			if ($l == 'text-warning') {
				$obj['notEnough']++;
			}
			if ($l == 'text-success') {
				$obj['poPlaced']++;
			}

			//comments
			foreach ($commentInfo as $commentInfoRow) {
				if ($row['PT_PART'] == $commentInfoRow['orderNum']) {
					$row['recent_comments'] = $commentInfoRow;
				}
			}
			$obj['details'][] = $row;
		}

		return $obj;
	}
}
