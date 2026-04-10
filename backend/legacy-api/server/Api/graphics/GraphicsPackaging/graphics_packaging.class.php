<?php

	class GraphicsPackaging
	{
	 
		protected $db;
		public $sessionId;
	 
		public function __construct($db, $dbQad)
		{
		
			$this->db = $dbQad;
			$this->db1 = $db;
			$this->nowDate = date("Y-m-d", time());
			$this->nowTime = date("Y-m-d H:i:s", time());
			
		}	

		public function GetGraphicsStatus($in)
		{
			$mainQry = "
				select a.graphicsWorkOrder
					, b.name status
					, a.qtyShipped
				FROM eyefidb.graphicsSchedule a
				LEFT JOIN eyefidb.graphicsQueues b ON b.queueStatus = a.status
				WHERE a.graphicsWorkOrder IN ($in) 
			";
			
			$query = $this->db1->prepare($mainQry);
			$query->execute();
			return $query->fetchAll(PDO::FETCH_ASSOC); 
		
		}
		
		public function get_graphics_demand_by_wo($wo)
		{
			$qry = "
				select so 
					, line
				from eyefidb.graphicsDemand 
				where woNumber = :wod_nbr
			";
			
			$stmt = $this->db1->prepare($qry);
			$stmt->bindParam(':wod_nbr', $wo, PDO::PARAM_STR);
			$stmt->execute(); 	
			return $stmt->fetch(); 	
		}
		
		public function get_sales_order_info_by_sales_line($salesOrder, $lineNumber)
		{
			$qry = "
				select a.sod_ship 
					, a.sod_nbr
					, a.sod_line
					, a.sod_contr_id
					, c.so_ship
				from sod_det a
				
				left join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
					from so_mstr
					where so_domain = 'EYE'
				) c ON c.so_nbr = a.sod_nbr
				
				where a.sod_nbr = :salesOrder	
					AND a.sod_line = :lineNumber
				with (noLock)
			";
			
			$stmt = $this->db->prepare($qry);
			$stmt->bindParam(':salesOrder', $salesOrder, PDO::PARAM_STR);
			$stmt->bindParam(':lineNumber', $lineNumber, PDO::PARAM_STR);
			$stmt->execute(); 	
			return $stmt->fetch(); 	
		}
		
		public function ReadAll()
		{
			
			$comments = "
				SELECT a.orderNum
					, CASE WHEN a.comments_html != '' THEN comments_html ELSE comments END comments
					, date(a.createdDate) createdDate
				FROM eyefidb.comments a
				INNER JOIN (
					SELECT orderNum, MAX(id) id
					FROM eyefidb.comments
					GROUP BY orderNum
				) b ON a.orderNum = b.orderNum AND a.id = b.id
				WHERE type = 'Graphics Packaging'
			";
			$query = $this->db1->prepare($comments);
			$query->execute(); 
			$commentInfo = $query->fetchAll(PDO::FETCH_ASSOC); 

			$qry = "
				select a.wo_nbr 
					, a.wo_part
					, c.full_Desc
					, b.wr_op
					, b.wr_desc
					, c.pt_part_type
					, a.wo_due_date
					, a.wo_so_job
					, a.wo_qty_ord
					, a.wo_qty_comp
					, a.wo_status
					, a.wo_rmks
					, a.wo_close_date
					, b.wr_wkctr
					, a.wo_ord_date 
					, a.wo_rel_date 
				from wr_route b
				join (
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
						, wo_so_job
					from wo_mstr a
					where wo_domain = 'EYE'
					AND a.wo_qty_ord != a.wo_qty_comp
				) a ON a.wo_nbr = b.wr_nbr
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1 || ' ' || pt_desc2) full_Desc
						, max(pt_part_type) pt_part_type
					from pt_mstr
					WHERE pt_domain = 'EYE'
					group by pt_part
				) c ON c.pt_part = b.wr_part
				where b.wr_op IN (040, 050, 060, 070) 
				and wr_domain = 'EYE'
				AND LENGTH(a.wo_nbr) = 5
				ORDER BY a.wo_due_date ASC
				with (noLock)
			";
			
			$stmt = $this->db->prepare($qry);
			$stmt->execute(); 	
			$result = $stmt->fetchAll(PDO::FETCH_ASSOC); 
			
			$in_array = array();
			foreach($result as $row){
				$in_array[] = $row['WO_NBR'];
			}
			
			$in = "'" . implode("','", $in_array) . "'";
			
			$wo_status = $this->GetGraphicsStatus($in);
			$obj = array();
			foreach($result as $row){
				
				// $graphicsDemandInfo = $this->get_graphics_demand_by_wo($row['WO_NBR']);
				// $salesOrderInfo = false;
				
				// if($graphicsDemandInfo){
					// $salesOrderInfo = $this->get_sales_order_info_by_sales_line($graphicsDemandInfo['so'], $graphicsDemandInfo['line']);
					// $row['SOD_CONTR_ID'] = $salesOrderInfo['SOD_CONTR_ID'];
					// $row['SO_SHIP'] = $salesOrderInfo['SO_SHIP'];
				// }
					
				//comments
				$row['COMMENTS'] = false;
				$row['COMMENTSMAX'] = "";
				$row['COMMENTSCLASS'] = "";
				foreach($commentInfo as $r1){
					
					if($row['WO_NBR'] == $r1['orderNum']){
						
						$row['COMMENTS'] = true;
						$row['COMMENTSMAX'] = $r1['comments'];
						
						///color the comments 
						if($r1['createdDate'] == $this->nowDate){
							$row['COMMENTSCLASS'] = "text-success";
						}else{
							$row['COMMENTSCLASS'] = "text-primary";
						}
					}
				}

				foreach($wo_status as $row1){
					if($row['WO_NBR'] == $row1['graphicsWorkOrder']){ 
						$row['status'] = $row1['status'];
						$row['graphicsQtyShipped'] = $row1['qtyShipped'];
					}
				}
				$obj[] = $row;
			}	

			return $obj;
		}
		
		public function __destruct() {
			$this->db = null;
		}
	}
	 
	