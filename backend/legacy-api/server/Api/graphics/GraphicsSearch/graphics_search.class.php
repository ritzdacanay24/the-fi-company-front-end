<?php

	class GraphicsSearch
	{
	 
		protected $db;
		public $sessionId;
		
		public function __construct($db)
		{
		
			$this->db = $db;
			$this->nowDate = date(" Y-m-d H:i:s", time());
			
		}			
				
		public function ReadSingle($co)
		{		
		
			$obj = array();
			
			$userTransGraphics = '
				SELECT a.id
					, a.field
					, a.o
					, a.n
					, a.createDate
					, a.comment
					, a.userId
					, a.so
					, a.type
					, concat(b.first, " ", b.last) as userName
					, date_format(a.createDate, "%y-%m-%d %H:%i:%s") createDate
				FROM eyefidb.userTrans a
				JOIN db.users b 
					on a.userId = b.id
			';
			
			$holdQry = '
				SELECT a.id
					, a.orderNum
					, a.reasonCode
					, a.comment
					, a.createdBy
					, a.createdDate
					, a.active
					, a.pageApplied
					, a.userId
					, a.removeUserId
					, a.removeDate
					, concat(b.first, " ", b.last) as userName
				FROM eyefidb.holds a
				JOIN db.users b 
					on a.userId = b.id
				WHERE a.pageApplied = "/graphicsProduction"
			';
		
			$holdGroupedQry = '
				SELECT a.reasonCode
				   , a.createdDate
				   , count(*) hits
				FROM eyefidb.holds a
				WHERE a.pageApplied = "/graphicsProduction"
					AND date(a.createdDate) = :createdDate
				group by a.reasonCode
					, date(a.createdDate)
			';
			
			$comments = '
				SELECT a.id
					, a.userId
					, a.comments
					, a.createdDate
					, a.type
					, concat(b.first, " ", b.last) as userName
					, a.orderNum
				FROM eyefidb.comments a
				JOIN db.users b 
					on a.userId = b.id
			';

			$mainQry = '
				SELECT a.id
					, a.orderNum
					, a.itemNumber
					, a.customer
					, a.qty
					, a.dueDate
					, now() now
					, REPLACE(a.customerPartNumber, "\n", "") customerPartNumber
					, a.purchaseOrder
					, a.userId
					, a.createdDate
					, a.status
					, a.priority
					, a.active
					, datediff(a.dueDate, date(now())) age
					, holds.hits holdCount				
					, packingSlipNumber
					, a.material
					, case when a.materialSize = "" then "None" else a.materialSize end materialSize
					, a.materialLocation
					, case when a.partials = 1 then "Partials Approved" else "" end as partials
					, a.qty - a.qtyShipped openQty
					, a.qtyShipped 
					, a.instructions
					, concat(b.first, " ", b.last) userName
					, c.name queueStatus
					, CASE
						WHEN datediff(a.dueDate, date(now())) < 0
							THEN "pastDue"
						WHEN datediff(a.dueDate, date(now())) = 0
							THEN "dueToday"
						WHEN datediff(a.dueDate, date(now())) > 0
							THEN "future"
						ELSE "black"
					END colorClass
					, CASE 
						WHEN DATE(a.dueDate) = DATE(now())
							THEN TIMESTAMPDIFF(SECOND, now(), a.createdDate) + a.priority + -999999999
						WHEN DATE(a.dueDate) < DATE(now())
							THEN TIMESTAMPDIFF(SECOND, now(), a.createdDate)
						WHEN DATE(a.dueDate) > DATE(now())
							THEN TIMESTAMPDIFF(SECOND, a.createdDate, now()) + a.priority + 999999999
					END customOrderBy
					, CASE 
						WHEN a.status = 900 AND a.qty - a.qtyShipped != 0
							THEN "Pending Ship"
						WHEN  a.qty - a.qtyShipped = 0
							THEN "Shipped Complete"
						WHEN a.qty - a.qtyShipped != a.qty
							THEN "Shipped Partials"
						ELSE ""
					END shipStatus
					, issues.hits issueCount
					, a.plexRequired
					, a.plexOrdered
					, a.graphicsWorkOrder
					, concat("WO", "", a.graphicsWorkOrder) graphicsWorkOrder1
					, a.prototypeCheck
					, CASE WHEN a.qty - a.qtyShipped = 0 THEN 1 ELSE 0 END shipComplete
					, a.shippedOn
					, date(a.shippedOn) shippedOnDate
					, TIMESTAMPDIFF(MINUTE, a.createdDate, a.shippedOn) shipProcessingTime
					, a.allocQty
					, a.description
				FROM eyefidb.graphicsSchedule a
				LEFT JOIN (
					SELECT count(*) hits
						, orderNum
					FROM eyefidb.holds 
					WHERE active = 1
					group by orderNum
				) holds ON a.orderNum = holds.orderNum		
				LEFT JOIN db.users b
					ON b.id = a.userId
				LEFT JOIN eyefidb.graphicsQueues c
					ON c.queueStatus = a.status
				LEFT JOIN (
					SELECT count(*) hits
						, so
					FROM eyefidb.graphicsIssues 
					WHERE active = 1
					group by so
				) issues ON a.orderNum = issues.so	
				WHERE a.graphicsWorkOrder = :orderNum  
			';
			$stmt = $this->db->prepare($mainQry);
			$stmt->bindParam(':orderNum', $co, PDO::PARAM_STR);
			$stmt->execute(); 		
			$main = $stmt->fetch();
			
			$co = $main['orderNum'];
	
			
			$graphicQ = '
				SELECT a.id
					, a.name
					, a.path
					, a.queueStatus
					, a.seq
					, "false" disabled
				FROM eyefidb.graphicsQueues a
				ORDER BY a.seq ASC
			';
			$stmt = $this->db->prepare($graphicQ);
			$stmt->execute(); 	
				
			while ($row = $stmt->fetch()){			
				
				$classColor = false;
				$shipStatus = "";
				if($main['status'] == $row['queueStatus']){
					
					if($main['status'] == 999){
						$classColor = 'bg-danger';
					}else if($main['shipStatus'] == 'Shipped Complete' && $main['status'] == 900){
						$classColor = 'bg-success';
					}else if($main['holdCount'] > 0){
						$classColor = 'quadrat-red';
					}else if($main['status'] >= $row['queueStatus']){
						$classColor = 'bg-primary';
					}
					
					$shipStatus = $main['shipStatus'];
					
				}
				
				$obj['queues'][] = array(
					"id"					=> $row['id']
					, "name"				=> $row['name']
					, "path"				=> $row['path']
					, "queueStatus"			=> $row['queueStatus']
					, "classColor"			=> $classColor
					, "shipStatus"			=> $shipStatus
				);	
			}
			
			$stmt1 = $this->db->prepare($mainQry);
			$stmt1->bindParam(':orderNum', $main['graphicsWorkOrder'], PDO::PARAM_STR);
			$stmt1->execute(); 		

			while ($row1 = $stmt1->fetch(PDO::FETCH_ASSOC)){			
				$obj['orderInfo'] = $row1;
			}		
			
			$userTransInfo = $userTransGraphics;
			$userTransInfo .= " WHERE a.so = :orderNum"; 
			$userTransInfo .= " ORDER BY a.createDate DESC "; 
			$stmt1 = $this->db->prepare($userTransInfo);
			$stmt1->bindParam(':orderNum', $co, PDO::PARAM_STR);
			$stmt1->execute(); 		

			while ($row1 = $stmt1->fetch(PDO::FETCH_ASSOC)){		
				
				$obj['trans'][] = array (
					"id" 					=> $row1['id']
					, "field" 			=> $row1['field']
					, "o" 					=> $row1['o']
					, "n" 					=> $row1['n']
					, "createDate" 	=> $row1['createDate']
					, "comment" 	=> $row1['comment']
					, "userId" 			=> $row1['userId']
					, "so" 				=> $row1['so']
					, "type" 			=> $row1['type']
					, "userName" 	=> $row1['userName']
				);
			}
			
			$holdsInfo = $holdQry;
			$holdsInfo .= " AND a.orderNum = :orderNum"; 
			$stmt1 = $this->db->prepare($holdsInfo);
			$stmt1->bindParam(':orderNum', $co, PDO::PARAM_STR);
			$stmt1->execute(); 		
			
			$obj['holds'] = array();
			while ($row1 = $stmt1->fetch(PDO::FETCH_ASSOC)){			
				$obj['holds'][] = $row1;
			}		
			
			
			$commentInfo = $comments;
			$commentInfo .= " WHERE a.orderNum = :orderNum "; 
			$commentInfo .= " ORDER BY a.createdDate DESC "; 
			$stmt1 = $this->db->prepare($commentInfo);
			$stmt1->bindParam(':orderNum', $co, PDO::PARAM_STR);
			$stmt1->execute(); 		

			while ($row1 = $stmt1->fetch(PDO::FETCH_ASSOC)){			
				$obj['comments'][] = $row1;
			}
			
			$issues = '
				SELECT * 
					, concat(b.first, " ", b.last) as userName
					, a.active
				FROM eyefidb.graphicsIssues a
				JOIN db.users b 
					on a.createdBy = b.id
			';

			$issuesInfo = $issues;
			$issuesInfo .= " WHERE a.so = :orderNum "; 
			$commentInfo .= " ORDER BY a.createdDate DESC "; 
			$stmt1 = $this->db->prepare($issuesInfo);
			$stmt1->bindParam(':orderNum', $co, PDO::PARAM_STR);
			$stmt1->execute(); 		

			while ($row1 = $stmt1->fetch(PDO::FETCH_ASSOC)){			
				$obj['issues'][] = $row1;
			}
			
			return $obj;
		}
		
		public function ReadAll($dateFrom, $dateTo)
		{
			$mainQry = "
				SELECT a.id
					, a.dueDate
					, a.orderNum
					, a.itemNumber
					, a.description
					, a.customer
					, a.qty
					, a.qty-a.qtyShipped openQty
					, a.qtyShipped
					, a.customerPartNumber
					, a.purchaseOrder
					, a.status
					, a.priority
					, a.partials
					, a.protoTypeCheck
					, a.graphicsWorkOrder
					, a.userId
					, a.active
					, CASE WHEN a.qty - a.qtyShipped = 0 THEN 1 ELSE 0 END shipComplete
					, a.instructions
					, a.plexRequired
				
					, CASE 
						WHEN a.status = 900 AND a.qty - a.qtyShipped != 0
							THEN 'Pending Ship'
						ELSE b.name
					END statusText
					
					, a.shippedOn
					, a.createdDate
					, concat(c.first, ' ', c.last)  createdBy
					
					, CASE 
						WHEN a.qty - a.qtyShipped > 0 && a.status != 999 
							THEN datediff(a.dueDate, date(now()))
					END age
				FROM eyefidb.graphicsSchedule a
				LEFT JOIN eyefidb.graphicsQueues b ON a.status = b.queueStatus
				LEFT JOIN db.users c
					ON c.id = a.userId
				WHERE date(a.dueDate) between :dateFrom and :dateTo
				ORDER BY a.createdDate DESC
			";
	
			$stmt = $this->db->prepare($mainQry);
			$stmt->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
			$stmt->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
			$stmt->execute(); 	
			$r = $stmt->fetchAll(PDO::FETCH_ASSOC); 
			
			return $r;
			
		}

	}
	
	
	 