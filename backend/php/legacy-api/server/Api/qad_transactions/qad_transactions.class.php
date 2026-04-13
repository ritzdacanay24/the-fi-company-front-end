<?php

class QadTransactions
{

	protected $db;

	public function __construct($dbQad)
	{

		$this->db = $dbQad;
	}

	public function TransactionTypes()
	{

		$qry = "
				select TOP 1 TrType
					, Description
				from TranTypeM 
			";
		$query = $this->db->prepare($qry);
		$query->execute();
		$woResults = $query->fetchAll(PDO::FETCH_ASSOC);

		return $woResults;
	}



	public function ReadQadTransactions($dateFrom, $dateTo)
	{
		$qry = "
				select a.tr_type tr_type
					, sum(ABS(cast(a.tr_qty_chg*a.tr_price as numeric(36,2)))) extPrice
					, max(tr_trnbr) tr_trnbr
				from tr_hist a
				LEFT JOIN (
					select sct_part
						, max(sct_cst_tot) sct_cst_tot
					from sct_det
					where sct_sim = 'Standard'
						AND sct_domain = 'EYE'
						and sct_site  = 'EYE01'
					group by sct_part
				) d ON d.sct_part = upper(a.tr_part)	
				where tr_domain = 'EYE' 
					and tr_date between :dateFrom and :dateTo
					and tr_status != ''
				GROUP BY a.tr_type
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		$woResults = $query->fetchAll(PDO::FETCH_ASSOC);

		$final  = array();
		$final1  = array();
		$obj  = array();
		$total = 0;
		foreach ($woResults as $row) {
			$obj['label'][] = $row['TR_TYPE'];
			$obj['value'][] = $row['EXTPRICE'];
			$total = $row['EXTPRICE'] + $total;
		}

		return array(
			"chart" => $obj, "details" => $woResults, "total" => $total
		);
	}


	public function getDetails($dateFrom, $dateTo, $label)
	{
		$qry = "
				select upper(a.tr_part) tr_part
					, a.tr_type tr_type
					, cast(a.tr_qty_chg as numeric(36,2)) tr_qty_chg
					, cast(a.tr_price as numeric(36,2)) tr_price
					, ABS(cast(a.tr_qty_chg*a.tr_price as numeric(36,2))) extPrice
					, a.tr_rmks tr_rmks
					, a.tr_date tr_date
					, cast(sct_cst_tot as numeric(36,2)) sct_cst_tot
					, tr_trnbr tr_trnbr
					, trgl_cr_acct trgl_cr_acct
					, trgl_dr_acct trgl_dr_acct
				from tr_hist a


				LEFT JOIN (
					select sct_part
						, max(sct_cst_tot) sct_cst_tot
					from sct_det
					where sct_sim = 'Standard'
						AND sct_domain = 'EYE'
						and sct_site  = 'EYE01'
					group by sct_part
				) d ON d.sct_part = upper(a.tr_part)	
				
				LEFT JOIN (
					select trgl_trnbr
						, trgl_cr_acct
						, trgl_dr_acct
					from trgl_det
					where trgl_domain = 'EYE'
				) e ON e.trgl_trnbr = a.tr_trnbr	

				where tr_domain = 'EYE' 
					and tr_date between :dateFrom and :dateTo
					and tr_status != ''
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		$woResults = $query->fetchAll(PDO::FETCH_ASSOC);

		return $woResults;
	}

	public function query($dateFrom, $dateTo, $label)
	{

		$obj = array();
		$obj = array(
			"ReadQadTransactions" => $this->ReadQadTransactions($dateFrom, $dateTo)
		);
		if ($label) {
			$obj['ReadDetails'] = $this->getDetails($dateFrom, $dateTo, $label);
		}

		return $obj;
	}
}
