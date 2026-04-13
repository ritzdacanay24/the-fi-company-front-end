<?php

	class OneSkuLocations
	{
	 
		protected $db;
		public $nowDate;
	 
		public function __construct($dbQad, $dbEyefi)
		{
			
			$this->db = $dbQad;
			$this->dbEyeFi = $dbEyefi;
			
		}		
		
		public function save($data)
		{

			$cycleSql = "
				INSERT INTO eyefidb.one_sku_location (part_number, completed) 
				VALUES(:part_number, :completed ) ON 
				DUPLICATE KEY UPDATE part_number=VALUES(part_number), 
				completed=VALUES(completed)
			";

			$query = $this->dbEyeFi->prepare($cycleSql);
			$query->bindParam(":part_number", $data['part_number'], PDO::PARAM_STR);
			$query->bindParam(":completed", $data['completed'], PDO::PARAM_STR);
			$query->execute();
		}
		
		public function LocationCount()
		{
			$mainQry = "
				select count(*) hits 
				from loc_mstr 
				where loc_domain = '".$this->domain."'
				with (noLock)
			";
			
			$query = $this->db->prepare($mainQry);
			$query->execute();
			$result = $query->fetchAll(PDO::FETCH_ASSOC); 
	 
			return $result;
		}	
		
		public function LocationDetails()
		{
			$mainQry = "
				select CAST(a.ld_loc AS CHAR(25)) ld_part
					, a.ld_date ld_date
					, a.ld_status ld_status
					, a.ld_loc ld_loc
					, cast(a.ld_qty_oh as numeric(36,2)) ld_qty_oh
					, cast(a.ld_qty_all as numeric(36,2)) ld_qty_all
					, b.pt_desc1 || ' ' || b.pt_desc2 fullDesc
					, cast(d.sct_cst_tot*a.ld_qty_oh as numeric(36,2)) extcost
					, cast(d.sct_cst_tot*a.ld_qty_oh as numeric(36,2)) sct_cst_tot
				from ld_det a
				
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, max(pt_desc2) pt_desc2
					from pt_mstr
					WHERE pt_domain = '".$this->domain."'
					group by pt_part
				) b ON b.pt_part = CAST(a.ld_loc AS CHAR(25))
				
				LEFT JOIN ( 
					select sct_part
						, max(sct_cst_tot) sct_cst_tot
					from sct_det
					WHERE sct_sim = 'Standard' 
						and sct_domain = '".$this->domain."' 
						and sct_site  = 'EYE01'
					group by sct_part
				) d ON CAST(a.ld_loc AS CHAR(25)) = d.sct_part 
				
				
				where a.ld_domain = '".$this->domain."'
                    AND a.ld_qty_oh > 0
                ORDER BY CAST(a.ld_loc AS CHAR(25)) ASC
				with (noLock)
			";

			$mainQry = "
				SELECT CAST(a.ld_loc AS CHAR(25)) ld_loc
					, COUNT(ld_part) items_in_location
					, sum(cast(a.ld_qty_oh as numeric(36,2))) ld_qty_oh
					, sum(cast(a.ld_qty_all as numeric(36,2))) ld_qty_all
					, sum(cast(d.sct_cst_tot*a.ld_qty_oh as numeric(36,2))) extcost
					, sum(cast(d.sct_cst_tot*a.ld_qty_oh as numeric(36,2))) sct_cst_tot
				FROM ld_det a
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, max(pt_desc2) pt_desc2
					from pt_mstr
					WHERE pt_domain = '".$this->domain."'
					group by pt_part
				) b ON b.pt_part = a.ld_part
				LEFT JOIN ( 
					select sct_part
						, max(sct_cst_tot) sct_cst_tot
					from sct_det
					WHERE sct_sim = 'Standard' 
						and sct_domain = '".$this->domain."' 
						and sct_site  = 'EYE01'
					group by sct_part
				) d ON a.ld_part = d.sct_part
				WHERE a.ld_domain = '".$this->domain."'
				GROUP BY CAST(a.ld_loc AS CHAR(25))
				HAVING items_in_location > 1
				with (noLock)
			";
			
			$query = $this->db->prepare($mainQry);
			$query->execute();
			$result = $query->fetchAll(PDO::FETCH_ASSOC); 
	 
			$qry = "
				SELECT *
				FROM eyefidb.one_sku_location a
			";
			$stmt = $this->dbEyeFi->prepare($qry);
			$stmt->execute();
			$oneSkuReport = $stmt->fetchAll(PDO::FETCH_ASSOC);

			
			foreach ($result as &$row) {
				$row['COMPLETED'] = 0;
                foreach ($oneSkuReport as &$oneSkuReportRow) {
                    if (trim($row['LD_LOC']) == trim($oneSkuReportRow['part_number'])) {
                        $row['COMPLETED'] = $oneSkuReportRow['completed'];
                    }
                }
			}

			return $result;
		}

		public function LocationCount1()
		{
			$mainQry = "
				select a.ld_loc
					, count(a.ld_part) partCount
					, count(a.ld_loc) totalLocations
				from ld_det a
				
				where a.ld_domain = '".$this->domain."'
					AND a.ld_qty_oh > 0
				GROUP BY a.ld_loc
				ORDER BY a.ld_loc ASC
				with (noLock)
			";
			
			
			$query = $this->db->prepare($mainQry);
			$query->execute();
			$result = $query->fetchAll(PDO::FETCH_ASSOC); 

			$obj['count'] = 0;
			$obj['countDups'] = 0;
			foreach($result as $row){
				$obj['count']++;
				if($row['PARTCOUNT'] > 1){
					$obj['countDups']++;
				}

			}
			$obj['percent'] = 100 - (($obj['countDups'] / $obj['count'] ) * 100 );
			return $obj;
		}	
		
		
		public function Run()
		{	
			$obj = array (
				'LocationDetails' => $this->LocationDetails()
				, 'LocationCount1' => $this->LocationCount1()
			);
			
			return $obj;
		
		}
	}
	 
		