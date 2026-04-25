<?php
	
	class CreateGraphicsWorkOrder
	{
	 
		protected $db;
		
		public function __construct($db, $dbQad)
		{
			$this->db = $db;
			$this->db1 = $dbQad;
			
			$this->nowDate = date(" Y-m-d H:i:s", time());
			$this->sessionId = 0;
		}	

		public function UserTrans($userTrans)
		{
			
			if (is_array($userTrans) || is_object($userTrans))
			{
				foreach($userTrans as $item) {
					$field = isset($item['field']) ? $item['field'] : "";
					$o = isset($item['o']) ? $item['o'] : "";
					$n = isset($item['n']) ? $item['n'] : "";
					$comment = isset($item['comment']) ? $item['comment'] : "";
					$so = isset($item['so']) ? $item['so'] : "";
					$type = isset($item['type']) ? $item['type'] : "";
					$partNumber = isset($item['partNumber']) ? $item['partNumber'] : "";
					$userId = isset($item['userId']) ? $item['userId'] : $this->sessionId;
					$reasonCode = isset($item['reasonCode']) ? $item['reasonCode'] : "";
					
					$qry = '
						INSERT INTO eyefidb.userTrans (
							field
							, o
							, n
							, createDate
							, comment
							, userId
							, so
							, type
							, partNumber
							, reasonCode
						) 
						VALUES( 
							:field
							, :o
							, :n
							, :createDate
							, :comment
							, :userId
							, :so
							, :type
							, :partNumber
							, :reasonCode
						)
					';
					
					$stmt = $this->db->prepare($qry);
					$stmt->bindParam(':field', $field, PDO::PARAM_STR);
					$stmt->bindParam(':o', $o, PDO::PARAM_STR);
					$stmt->bindParam(':n', $n, PDO::PARAM_STR);
					$stmt->bindParam(':createDate', $this->nowDate, PDO::PARAM_STR);
					$stmt->bindParam(':comment', $comment, PDO::PARAM_STR);
					$stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
					$stmt->bindParam(':so', $so, PDO::PARAM_STR);
					$stmt->bindParam(':type', $type, PDO::PARAM_STR);
					$stmt->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
					$stmt->bindParam(':reasonCode', $reasonCode, PDO::PARAM_STR);
					$stmt->execute(); 
				}
			}

		}
		
		public function GetAllGraphicsWorkOrderLocal()
		{
			
			$qry = "
				select graphicsWorkOrder 
					, itemNumber 
				from eyefidb.graphicsSchedule b
				where active = 1
					AND (CHAR_LENGTH (graphicsWorkOrder) = 4 OR CHAR_LENGTH (graphicsWorkOrder) = 5)
			";
			
			$stmt = $this->db->prepare($qry);
			$stmt->execute(); 	
			$result = $stmt->fetchAll(PDO::FETCH_ASSOC); 	
			
			$in_array = array();
			foreach($result as $row){
				$in_array[] = $row['graphicsWorkOrder'];
			}
			
			$in = "'" . implode("','", $in_array) . "'";
			
			return $in;
		}
		
		public function GetAllGraphicsWorkOrderQad()
		{
			
			$in = $this->GetAllGraphicsWorkOrderLocal();
			$qry = "
				select a.wo_nbr
					, a.wo_ord_date 
					, a.wo_rel_date 
					, a.wo_due_date
					, a.wo_part
					, a.wo_qty_ord
					, a.wo_qty_comp
					, a.wo_status
					, a.wo_rmks
					, a.wo_close_date
					, c.fullDesc
					, a.wo_so_job
				from wr_route b
				left join (
					select a.wo_nbr
						, a.wo_ord_date 
						, a.wo_rel_date 
						, CASE 
							WHEN DAYOFWEEK ( a.wo_due_date ) IN (1)
								THEN a.wo_due_date - 2
								WHEN DAYOFWEEK ( a.wo_due_date ) IN (2, 3)
									THEN a.wo_due_date - 4
								WHEN DAYOFWEEK ( a.wo_due_date ) IN (4)
									THEN a.wo_due_date - 2
								ELSE a.wo_due_date - 2
							END  wo_due_date 
						, a.wo_part
						, a.wo_qty_ord
						, a.wo_qty_comp
						, a.wo_status
						, a.wo_rmks
						, a.wo_close_date
						, a.wo_so_job
					from wo_mstr a
					where wo_domain = 'EYE'
				) a ON a.wo_nbr = b.wr_nbr
				
				LEFT JOIN (
					SELECT pt_part
						, max(pt_desc1 || ' ' || pt_desc2) fullDesc
						, max(pt_part_type) pt_part_type
					FROM pt_mstr
					WHERE pt_domain = 'EYE'
					GROUP BY pt_part
				) c ON c.pt_part = b.wr_part
				
				where b.wr_op IN (040, 050, 060, 070) 
					AND wr_domain = 'EYE'
					AND ( a.wo_qty_ord - a.wo_qty_comp) > 0
					AND a.wo_nbr NOT IN ($in)
					AND (c.pt_part_type = 'Graphic') 
					AND LENGTH(a.wo_nbr) = 5 
					AND a.wo_status != 'C'
				with (noLock)
			";
			//add item type -> Graphics
			$stmt = $this->db1->prepare($qry);
			$stmt->execute(); 	
			$result = $stmt->fetchAll(PDO::FETCH_ASSOC); 	
			
			foreach($result as $row){
                $row['FULLDESC'] = preg_replace('/[\x00-\x1F\x7F-\xFF]/', '', $row['FULLDESC']);
				$this->GraphicsCreateRecord($row);
			}
			
			return $result;
		}
		
		
		public function GraphicsCreateRecord($post)
		{
			$this->db->beginTransaction();
			
			try {
				$qry = "
					INSERT INTO eyefidb.graphicsSchedule(
						itemNumber
						, description
						, customer
						, qty
						, dueDate
						, customerPartNumber
						, purchaseOrder
						, userId
						, createdDate
						, priority
						, status
						, partials
						, prototypeCheck
						, origDueDate
						, graphicsWorkOrder
						, instructions
						, plexRequired
						, graphicsSalesOrder
						, criticalOrder
						, ordered_date
					) 
					values(
						:itemNumber
						, :description
						, :customer
						, :qty
						, :dueDate
						, :customerPartNumber
						, :purchaseOrder
						, :userId
						, :createdDate
						, :priority
						, 0
						, :partials
						, :prototypeCheck
						, :origDueDate
						, :graphicsWorkOrder
						, :instructions
						, :plexRequired
						, :graphicsSalesOrder
						, :criticalOrder
						, :ordered_date
					)
				";
				$priority = ISSET($post['priority']) && $post['priority'] == 'true' ? 10 : 50;
				$partials = ISSET($post['partials']) && $post['partials'] == 'true' ? 1 : 0;
				$prototypeCheck = ISSET($post['protoTypeCheck']) && $post['protoTypeCheck'] == 'true' ? 1 : 0;
				$plexRequired = ISSET($post['plexRequired']) && $post['plexRequired'] == 'true' ? 1 : 0;
				$criticalOrder = ISSET($post['WO_SO_JOB']) && $post['WO_SO_JOB'] == 'DROPIN' ? 1 : 0;
				$purchaseOrder = 'N/A'; 
				$customerPartNumber = 'N/A';
				$customer = 'N/A';
				$graphicsSalesOrder = 0;
				
				$stmt = $this->db->prepare($qry);
				$stmt->bindParam(':itemNumber', $post['WO_PART'], PDO::PARAM_STR);
				$stmt->bindParam(':description', $post['FULLDESC'], PDO::PARAM_STR);
				$stmt->bindParam(':customer', $customer, PDO::PARAM_STR);
				$stmt->bindParam(':qty', $post['WO_QTY_ORD'], PDO::PARAM_STR);
				$stmt->bindParam(':dueDate', $post['WO_DUE_DATE'], PDO::PARAM_STR);
				$stmt->bindParam(':origDueDate', $post['WO_DUE_DATE'], PDO::PARAM_STR);
				$stmt->bindParam(':customerPartNumber', $customerPartNumber, PDO::PARAM_STR);
				$stmt->bindParam(':purchaseOrder', $purchaseOrder, PDO::PARAM_STR);
				$stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
				$stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
				$stmt->bindParam(':priority', $priority, PDO::PARAM_STR);
				$stmt->bindParam(':partials', $partials, PDO::PARAM_INT);
				$stmt->bindParam(':prototypeCheck', $prototypeCheck, PDO::PARAM_INT);
				$stmt->bindParam(':graphicsWorkOrder', $post['WO_NBR'], PDO::PARAM_STR);
				$stmt->bindParam(':instructions', $post['WO_RMKS'], PDO::PARAM_STR);
				$stmt->bindParam(':plexRequired', $plexRequired, PDO::PARAM_STR);
				$stmt->bindParam(':graphicsSalesOrder', $graphicsSalesOrder, PDO::PARAM_INT);
				$stmt->bindParam(':criticalOrder', $criticalOrder, PDO::PARAM_STR);
				$stmt->bindParam(':ordered_date', $post['WO_ORD_DATE'], PDO::PARAM_STR);
				$stmt->execute();
				$lastInsertId = $this->db->lastInsertId();
				$updatedId = 'G' . $lastInsertId;
				
				$qry = "
					UPDATE eyefidb.graphicsSchedule 
					SET orderNum = :orderNum 
					WHERE id= :lastInsertId
				";
				$stmt = $this->db->prepare($qry);
				$stmt->bindParam(":lastInsertId", $lastInsertId, PDO::PARAM_INT);
				$stmt->bindParam(":orderNum", $updatedId, PDO::PARAM_STR);
				$stmt->execute();
				
				$userTrans[] = array(
					'field' => 'New Graphics WO Created'
					, 'o' => 0
					, 'n' => $updatedId  
					, 'comment' => 'Created by task'
					, 'so' => $updatedId 
					, 'type' => 'Graphics'
				);

				$this->UserTrans($userTrans);
				$this->db->commit();

			} catch(PDOException $e) { 
				$this->db->rollBack();
			}
		}
		
		
		public function Run()
		{
			
			
			$obj = array(
				"b" => $this->GetAllGraphicsWorkOrderQad()
			);
			
			return json_encode($obj);
		}
		
		public function __destruct() {
			$this->db = null;
		}
	}

	use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
	use EyefiDb\Databases\DatabaseQad as DatabaseQad;
	
	$db_connect = new DatabaseEyefi();
	$db = $db_connect->getConnection();
	
	$db_connect_qad = new DatabaseQad();
	$dbQad = $db_connect_qad->getConnection();
	
	$data = new CreateGraphicsWorkOrder($db, $dbQad);
	echo $data->Run();
		