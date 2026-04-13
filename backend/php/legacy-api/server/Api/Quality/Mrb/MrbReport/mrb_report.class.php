<?php
class MrbReport
{

	protected $db;
	public $sessionId;

	public function __construct($db)
	{

		$this->db = $db;
		$this->nowDate = date(" Y-m-d H:i:s", time());
	}

	public function Read($startDate, $endDate)
	{
		$err = false;

		$obj = array();

		if (!$err) {

			$qirSearch = "
					SELECT a.qirNumber 
						, a.itemCost pt_price
						, a.disposition 
						, a.status 
						, a.comments 
						, a.failureType 
						, a.componentType 
						, a.type type1
						, a.partNumber eyefiPartNumber
						, a.partDescription fulldesc
						, a.dateReported customerReportedDate
						, a.qtyRejected qtyAffected
						, a.wo_so purchaseOrder
						, a.id
						, a.rma
						, a.createdBy
						, concat(b.first, ' ', b.last) full_name
						, a.mrbNumber
						, a.lotNumber
						, a.firstApproval
						, a.secondApproval
					FROM eyefidb.mrb_request a
					LEFT JOIN db.users b
						ON a.createdBy = b.id
					WHERE date(a.createdDate) between :startDate and :endDate
					and a.active = 1
				";
			$qirSearchQuery = $this->db->prepare($qirSearch);
			$qirSearchQuery->bindParam(':startDate', $startDate, PDO::PARAM_STR);
			$qirSearchQuery->bindParam(':endDate', $endDate, PDO::PARAM_STR);
			$qirSearchQuery->execute();
			$obj = $qirSearchQuery->fetchAll(PDO::FETCH_ASSOC);
		}

		$objResults = array(
			"details" => $obj, 
			"getMRBCost" => $this->getMRBCost($startDate, $endDate), 
			"getMRBByType" => $this->getMRBByType($startDate, $endDate), 
			"dateFrom" => $startDate
		);

		return $objResults;
	}

	public function UpdateStatus($post)
	{
		$qry = "
				UPDATE eyefidb.mrb_request
					SET status = :status
				WHERE id = :id
			";

		$query = $this->db->prepare($qry);
		$query->bindParam(':status', $post['updateQueueStatus'], PDO::PARAM_INT);
		$query->bindParam(':id', $post['id'], PDO::PARAM_STR);
		$query->execute();
	}

	public function Save($post)
	{
		$err = false;
		$errTyp = "success";
		$errMSG = "Comments added";

		$qry = "
				INSERT INTO eyefidb.mrb_comments(
					mrb_id
					, comments
					, createdBy
					, createdDate
				)
				VALUES (
					:mrb_id
					, :comments
					, :createdBy
					, :createdDate
				
				)
			";

		$query = $this->db->prepare($qry);
		$query->bindParam(':mrb_id', $post['id'], PDO::PARAM_INT);
		$query->bindParam(':comments', $post['saveComments'], PDO::PARAM_STR);
		$query->bindParam(':createdBy', $this->sessionId, PDO::PARAM_INT);
		$query->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
		$query->execute();

		$obj = array(
			"message" => $errMSG, "type" => $errTyp, "err" => $err, "comments" => $post['saveComments'], "createdBy" => $this->sessionId, "createdDate" => $this->nowDate
		);

		return $obj;
	}

	public function getMRBCost($startDate, $endDate)
	{
		$qry = "
				SELECT disposition
					, sum(itemCost*qtyRejected) hits
					, sum(qtyRejected) hits1
				FROM eyefidb.mrb_request
				WHERE date(createdDate) between :startDate and :endDate
					AND disposition IN ('Scrap', 'Rework')
					and active = 1
				group by disposition
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(':startDate', $startDate, PDO::PARAM_STR);
		$query->bindParam(':endDate', $endDate, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		$obj = array();

		foreach ($result as $row) {
			$obj['label'][] = $row['disposition'];
			$obj['val'][] = $row['hits'];
			$obj['val1'][] = $row['hits1'];
			$obj['classColor'][] = "rgb(13, 127, 190)";
			$obj['classColor'][] = "rgb(255,140,0)";
		}
		return $obj;
	}

	public function getMRBByType($startDate, $endDate)
	{
		$qry = "
				SELECT componentType label
					, count(*) data1
					, sum(case when disposition = 'Scrap' then qtyRejected else 0 end) scrapCount
					, sum(case when disposition = 'Rework' then qtyRejected else 0 end) reworkCount
					
				FROM eyefidb.mrb_request
				WHERE date(createdDate) between :startDate and :endDate
					and disposition IN ('Scrap', 'Rework')
					and active = 1
				group by componentType
				ORDER BY count(*) DESC
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(':startDate', $startDate, PDO::PARAM_STR);
		$query->bindParam(':endDate', $endDate, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		$obj = array();
		foreach ($result as $row) {
			$obj['label'][] = $row['label'];

			$obj['scrapCount'][] = $row['scrapCount'];
			$obj['reworkCount'][] = $row['reworkCount'];

			$obj['datasets'][] = $row;
		}
		return $obj;
	}


	public function ReadId($id)
	{
		$err = false;
		$errTyp = "";
		$errMSG = "";

		$obj = array();

		if (!$err) {

			$qry = "
					SELECT a.id
						, concat('MRB',a.id) mrbNumber
						, a.partNumber
						, a.qty
						, a.qtyCost
						, a.department
						, a.serialNumber
						, a.comment
						, a.disposition
						, a.type
						, a.qirNumber
						, a.scarNumber
						, a.failureMode
						, a.location
						, a.poNumber
						, a.soNumber
						, a.pickListNumber
						, a.alertType
						, a.createdDate
						, a.createdBy
						, a.status
						, concat(b.first, ' ', b.last) userName
						, a.mrbNumber
						, a.lotNumber
						, a.firstApproval
						, a.secondApproval
					FROM eyefidb.mrb_request a
					LEFT JOIN db.users b ON a.createdBy = b.id 
					WHERE concat('MRB',a.id) = :id
					and active = 1
				";
			$query = $this->db->prepare($qry);
			$query->bindParam(':id', $id, PDO::PARAM_STR);
			$query->execute();
			$result = $query->fetch();

			if (!$result) {
				$err = true;
				$errTyp = "danger";
				$errMSG = "MRB number not found in the system";
			}

			if ($result) {
				$qry = "
						SELECT a.id
							, a.mrb_id
							, a.comments
							, a.createdBy
							, a.createdDate
							, a.active
							, concat(b.first, ' ', b.last) userName
						FROM eyefidb.mrb_comments a
						LEFT JOIN db.users b ON a.createdBy = b.id 
						WHERE concat('MRB',mrb_id) = :id
						ORDER BY a.createdDate desc
					";
				$query = $this->db->prepare($qry);
				$query->bindParam(':id', $id, PDO::PARAM_INT);
				$query->execute();
				$result['comments'] = $query->fetchAll(PDO::FETCH_ASSOC);
			}
		}

		$obj = array(
			"message" => $errMSG, "type" => $errTyp, "err" => $err, "details" => $result
		);

		return $obj;
	}


	public function GetComments($id)
	{

		$comments = "
				SELECT id
					, mrb_id
					, comments
					, createdBy
					, createdDate
				FROM eyefidb.mrb_comments
				WHERE mrb_id = :mrb_id
				AND active = 1
				ORDER BY createdBy desc
			";
		$query = $this->db->prepare($comments);
		$query->bindParam(':mrb_id', $id, PDO::PARAM_INT);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		return $result;
	}

	public function __destruct()
	{
		$this->db = null;
	}
}
