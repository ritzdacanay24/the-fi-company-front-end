<?php

class RevenueByCustomer
{

	protected $db;

	public function __construct($db)
	{

		$this->db = $db;
	}

	public function getFutureRevenueByCustomerByWeekly($date)
	{

		$date = explode("-", $date);
		return $date;
	}

	public function getRevenyByCustomer($dateFrom, $dateTo)
	{

		$mainQry = "
				select CASE WHEN d.cm_sort IS NULL THEN 'Unknown' ELSE d.cm_sort END cm_sort
				, so_cust
					, cast(sum(case when a.GL_ID = 15774615 then  a.PostingLineCreditLC - a.PostingLineDebitLC else 0.00 end) as numeric(36,2)) Product
					, sum(case when a.GL_ID IN (15774616, 15790482, 15790530) then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) Service_Parts
					, sum(case when a.GL_ID = 15774617 then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) Service_Storage
					, sum(case when a.GL_ID = 15774618 then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) Kitting
					, sum(case when a.GL_ID = 27413065 then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) Graphics
					, sum(case when a.GL_ID = 27353092 then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) InterCo_Sales_SouthFi
					, sum(a.PostingLineDebitLC) Sales_Discount
					, sum(a.PostingLineCreditLC) - sum(a.PostingLineDebitLC) Monthly_Revenue
					
				from PostingLine a
				
				left join (
					select a.Posting_ID
						, a.DInvoice_ID
					from DInvoicePosting a
				) b ON b.Posting_ID = a.Posting_ID
				
				left join (
					select a.DInvoice_ID
						, a.DInvoiceDIText
						, DInvoiceVoucher
					from DInvoice a
				) c ON c.DInvoice_ID = b.DInvoice_ID
				
				left JOIN (
					select a.idh_inv_nbr
						, cm_sort
						, so_cust
					from idh_hist a
					LEFT JOIN (
						select so_nbr
							, so_cust
						from so_mstr
						WHERE so_domain = 'EYE'
					) e ON e.so_nbr = a.idh_nbr
					LEFT JOIN (
						SELECT cm_addr 
							, max(cm_sort) cm_sort
						FROM cm_mstr 
						WHERE cm_domain = 'EYE'
						GROUP BY cm_addr
					) c ON e.so_cust = c.cm_addr
					where a.idh_domain = 'EYE'
					and IDH_ACCT IN (47000, 47900, 47950, 47960, 47500, 47903)
					group by a.idh_inv_nbr
						, cm_sort
						, so_cust
				) d  ON d.idh_inv_nbr = c.DInvoiceDIText
				where a.GL_ID IN (15774615, 15774616, 15790482, 15790530, 15774617, 15774618, 27413065, 27353092)
					and a.PostingDate between  :dateFrom and :dateTo
				GROUP BY CASE WHEN d.cm_sort IS NULL THEN 'Unknown' ELSE d.cm_sort END, so_cust
				ORDER BY d.cm_sort ASC
				WITH (nolock)
			";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		$obj = $query->fetchAll(PDO::FETCH_ASSOC);

		function GenerateRandomColor__()
		{
			$color = '#';
			$colorHexLighter = array("9", "A", "B", "C", "D", "E", "F");
			for ($x = 0; $x < 6; $x++) :
				$color .= $colorHexLighter[array_rand($colorHexLighter, 1)];
			endfor;
			return substr($color, 0, 7);
		}

		function GenerateRandomColor()
		{
			return '#' . str_pad(dechex(mt_rand(0, 0xFFFFFF)), 6, '0', STR_PAD_LEFT);
		}

		$o = array();
		$PRODUCT = 0;
		$SERVICE_PARTS = 0;
		$SERVICE_STORAGE = 0;
		$KITTING = 0;
		$GRAPHICS = 0;
		$INTERCO_SALES_SOUTHFI = 0;
		$TOTAL = 0;
		$TOTALMASS = 0;

		foreach ($obj as &$row) {
			$o['customer'][] = $row['SO_CUST'];
			$color = GenerateRandomColor();
			$o['color'][] = $color;
			$row['COLOR'] = $color;
			$PRODUCT = $row['PRODUCT'];
			$SERVICE_PARTS = $row['SERVICE_PARTS'];
			$SERVICE_STORAGE = $row['SERVICE_STORAGE'];
			$KITTING = $row['KITTING'];
			$GRAPHICS = $row['GRAPHICS'];
			$INTERCO_SALES_SOUTHFI = $row['INTERCO_SALES_SOUTHFI'];
			$TOTAL = $PRODUCT + $SERVICE_PARTS + $SERVICE_STORAGE + $KITTING + $GRAPHICS + $INTERCO_SALES_SOUTHFI;
			$TOTALMASS += $TOTAL;
			$row['value'] = $TOTAL;
			$o['value'][] = $TOTAL;
		}

		$o['details'] = $obj;
		$o['TOTALMASS'] = $TOTALMASS;

		return $o;
	}

	public function __destruct()
	{
		$this->db = null;
	}
}
