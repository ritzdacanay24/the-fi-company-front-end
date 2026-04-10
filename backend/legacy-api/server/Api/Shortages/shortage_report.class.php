<?php

class ShortageReport
{

	protected $db;

	public function __construct($db)
	{

		$this->db = $db;
		$this->nowDate = date("Y-m-d H:i:s", time());
		$this->dateNow = date("Y-m-d", time());
	}

	public function getShortageLog($dateFrom, $dateTo)
	{

		$comments = "
				SELECT a.orderNum
					, a.comments
					, a.createdDate
					, date(a.createdDate) byDate
				FROM eyefidb.comments a
				INNER JOIN (
					SELECT orderNum
						, MAX(id) id
						, MAX(date(createdDate)) createdDate
					FROM eyefidb.comments
					GROUP BY orderNum
				) b ON a.orderNum = b.orderNum AND a.id = b.id
				WHERE type = 'Shortage Request'
			";
		$query = $this->db->prepare($comments);
		$query->execute();
		$commentInfo = $query->fetchAll(PDO::FETCH_ASSOC);

		$mainQry = "
				select a.id 
					, a.jobNumber 
					, a.woNumber 
					, a.lineNumber 
					, a.dueDate 
					, a.reasonPartNeeded 
					, a.priority 
					, a.partNumber 
					, a.qty 
					, a.createdBy 
					, a.createdDate 
					, a.active 
					, a.status 
					, a.comments 
					, concat(b.first, ' ', b.last) fullName
					, a.partDesc
					, a.buyer
					, a.assemblyNumber
					, a.supplyCompleted
					, a.receivingCompleted
					, a.graphicsShortage
					, a.poNumber
					, a.supplier
					, c.status statusGraphics
					, c.graphicsWorkOrder graphicsWorkOrder
					, a.deliveredCompleted
					, case when a.mrfId IS NULL then '' else a.mrfId end mrfId
				from eyefidb.shortageRequest a
				LEFT JOIN db.users b ON b.id = a.createdBy
				LEFT JOIN (
					SELECT purchaseOrder
						, customerPartNumber
						, max(c.name) status
						, max(graphicsWorkOrder) graphicsWorkOrder
					FROM eyefidb.graphicsSchedule a
					LEFT JOIN eyefidb.graphicsQueues c
						ON c.queueStatus = a.status
						
					WHERE a.active = 1
					GROUP BY purchaseOrder
						, customerPartNumber
				) c ON c.purchaseOrder = a.poNumber
					AND c.customerPartNumber = a.partNumber
				WHERE a.active = 1
					and date(a.createdDate) between :dateFrom AND :dateTo
			";

		$mainQry .= " ORDER BY a.id desc ";
		$query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
		$query->execute();
		$details = $query->fetchAll(PDO::FETCH_ASSOC);

		$obj = array();
		$obj1['chart1'] = 0;
		$obj1['chart2'] = 0;
		$obj1['chart3'] = 0;
		foreach ($details as $row) {

			if ($row['supplyCompleted'] == "") {
				$obj1['chart1']++;
			}
			if ($row['deliveredCompleted'] == "") {
				$obj1['chart2']++;
			}
			if ($row['receivingCompleted'] == "") {
				$obj1['chart3']++;
			}

			//comments
			$row['COMMENTSCLASS'] = false;
			$row['COMMENTSMAX'] = '';
			foreach ($commentInfo as $row1) {
				if ($row['id'] == $row1['orderNum']) {
					///color the comments 
					if ($row1['byDate'] == $this->dateNow) {
						$row['COMMENTSCLASS'] = "text-success";
					} else {
						$row['COMMENTSCLASS'] = "text-info";
					}

					$row['COMMENTSMAX'] = $row1['comments'];
				}
			}
			$obj[] = $row;
		}

		$o = array(
			"details" => $obj,
			"overall" => $obj1
		);

		return $o;
	}

	public function __destruct()
	{
		$this->db = null;
	}
}
