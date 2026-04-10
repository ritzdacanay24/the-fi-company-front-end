<?php

	class FinishedGoodsRctWo
	{
	 
		protected $db;
		public $nowDate;
	 
		public function __construct($dbQad)
		{
			
			$this->db = $dbQad;
			
		}			
		
		public function ReadAll($dateFrom, $dateTo)
		{
			
			$mainQry = "
				select UPPER(a.tr_part) tr_part
					, sum(a.tr_qty_chg) tr_qty_chg
					, MAX(CONCAT(b.pt_desc1, b.pt_desc2)) pt_desc1
				from tr_hist a 
				LEFT JOIN ( 
					SELECT pt_part 
						, pt_desc1
						, pt_desc2
					FROM pt_mstr 
					WHERE pt_domain = 'EYE' 
				) b ON b.pt_part = a.tr_part 
				
				where a.tr_domain = 'EYE' 
					and a.tr_type = 'RCT-WO' 
					and a.tr_date between :dateFrom and :dateTo 
				GROUP BY UPPER(a.tr_part)
				WITH (NOLOCK)
			";
			
			$query = $this->db->prepare($mainQry);
			$query->bindParam(':dateFrom', $dateFrom , PDO::PARAM_STR);
			$query->bindParam(':dateTo', $dateTo , PDO::PARAM_STR);
			$query->execute();
			$result = $query->fetchAll(PDO::FETCH_ASSOC); 
			
			
			$in_array = array();
			foreach($result as $row){
				$in_array[] = $row['TR_PART'];
			}
			
			$in = "'" . implode("','", $in_array) . "'";
			
		
		    $mainQry1 = "
				select UPPER(a.tr_part) tr_part
					, max(a.tr_price) tr_price
				from tr_hist a
				where a.tr_domain = 'EYE' 
					and a.tr_type = 'ISS-SO' 
					and a.tr_part IN ($in)
				GROUP BY a.tr_part
				WITH (NOLOCK)
			";
			$query1 = $this->db->prepare($mainQry1);
			$query1->execute();
			$result1 = $query1->fetchAll(PDO::FETCH_ASSOC);
			
			$newObj = array();
			foreach($result as $row){
				$row['TR_PRICE'] = 0;
				$row['EXTPRICE'] = 0;
				foreach($result1 as $row1){
					if($row['TR_PART'] == $row1['TR_PART']){
						$row['TR_PRICE'] = $row1['TR_PRICE'];
						$row['EXTPRICE'] = $row1['TR_PRICE']*$row['TR_QTY_CHG'];
					}
				}
				
				
				$newObj[] = $row;
			} 
			return $newObj; 
			
		}
	}
	 
		