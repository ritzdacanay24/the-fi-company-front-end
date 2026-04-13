<?php


namespace EyefiDb\Api\ItemConsolidation;

use PDO;
use PDOException;

use EyefiDb\Api\Comment\Comment;

class ItemConsolidation
{

	protected $db;
	public $nowDate;

	public function __construct($dbQad, $db)
	{

		$this->db = $dbQad;
		$this->db1 = $db;
		$this->todayDate = date("Y-m-d", time());

		$this->comment = new Comment($db);
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

	public function save($data)
	{

		$cycleSql = "
			INSERT INTO eyefidb.item_consolidation (partNumber, completed) 
			VALUES(:partNumber, :completed ) ON 
			DUPLICATE KEY UPDATE partNumber=VALUES(partNumber), 
			completed=VALUES(completed)
		";

		$query = $this->db1->prepare($cycleSql);
		$query->bindParam(":partNumber", $data['partNumber'], PDO::PARAM_STR);
		$query->bindParam(":completed", $data['completed'], PDO::PARAM_STR);
		$query->execute();
	}

	public function LocationDetails()
	{

		$commentInfo = $this->comment->readRecentComment('item_consolidation_report');

		$itemConsolidation = "
				SELECT *
				FROM eyefidb.item_consolidation a
			";
		$query = $this->db1->prepare($itemConsolidation);
		$query->execute();
		$itemConsolidationInfo = $query->fetchAll(PDO::FETCH_ASSOC);

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
			SELECT CAST(a.ld_part AS CHAR(25)) ld_part
				, COUNT(ld_loc) items_in_location
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
			AND ( CAST(a.ld_part AS CHAR(25)) NOT LIKE '*U')
			GROUP BY CAST(a.ld_part AS CHAR(25))
			HAVING items_in_location > 1
			ORDER BY items_in_location DESC
			with (noLock)
			";

		$query = $this->db->prepare($mainQry);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		foreach ($result as &$row) {
			$row['LD_PART'] = trim($row['LD_PART']);
			$row['id'] = $row['LD_PART'];

			foreach ($commentInfo as $commentInfoRow) {
				if ($row['LD_PART'] == $commentInfoRow['orderNum']) {
					$row['recent_comments'] = $commentInfoRow;
				}
			}

			//itemConsolidationInfo
			$row['COMPLETED'] = false;
			foreach ($itemConsolidationInfo as $rowItemConsolidationInfo) {

				if (trim($row['LD_PART']) == $rowItemConsolidationInfo['partNumber']) {

					$row['COMPLETED'] = $rowItemConsolidationInfo['completed'] == 1 ? true : false;
				}
			}
		}

		return $result;
	}

	public function LocationCount1()
	{
		$mainQry = "
			select count(pt_part) partCount 
			from pt_mstr 
			where pt_domain = '".$this->domain."'
			with (noLock) 
		";


		$query = $this->db->prepare($mainQry);
		$query->execute();
		return $query->fetch();
	}


	public function Run()
	{
		$obj = array(
			'LocationDetails' => $this->LocationDetails(), 'LocationCount1' => $this->LocationCount1()
		);

		return $obj;
	}
}
