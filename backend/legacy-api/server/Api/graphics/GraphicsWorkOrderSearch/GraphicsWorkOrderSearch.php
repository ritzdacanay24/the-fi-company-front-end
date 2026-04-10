<?php

namespace EyefiDb\Api\Graphics\GraphicsWorkOrderSearch;
use PDO; 
use PDOException;	

class GraphicsWorkOrderSearch
{

	public $nowDate;
	public $nowDateToday;
	public $sessionId;

	public function __construct($db, $dbQad)
	{
		$this->db = $db;
		$this->db1 = $dbQad;
	}

	public function GetBomInformationTest($partNumber)
	{

		$mainQry = "
			select SKU_Number
				, Product productName 
				, ID_Product 
				, Account_Vendor
				, DD1_1
				, DD1_5
				, DD1_6
				, DD2_8
				, DD2_6
				, DD3_2
				, DD3_1
				, DD3_3
				, DD3_9
				, DI_Product_SQL
				, DD3_8
				, DD2_1
				, DD3_6
				, Category
				, Serial_Number
				, DD2_2
				, DD1_7
				, DD2_9
				, DD2_7
				, DD1_2
				, Image_Data
				, v.revision
			FROM eyefidb.graphicsInventory
			JOIN eyefidb.graphicsInventoryView v ON v.part_number = eyefidb.graphicsInventory.SKU_Number
			WHERE SKU_Number = :SKU_Number
			ORDER BY eyefidb.graphicsInventory.id DESC
			LIMIT 1
		";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':SKU_Number', $partNumber, PDO::PARAM_STR);
		$query->execute();
		$row = $query->fetch();

		if ($row) {
			$partNumber = $row['SKU_Number'];
			$revision = $row['revision'];
			$mainQry = "
				select SKU_Number
					, Product productName 
					, ID_Product 
					, Account_Vendor
					, DD1_1
					, DD1_5
					, DD1_6
					, DD2_8
					, DD2_6
					, DD3_2
					, DD3_1
					, DD3_3
					, DD3_9
					, DI_Product_SQL
					, DD3_8
					, DD2_1
					, DD3_6
					, Category
					, Serial_Number
					, DD2_2
					, DD1_7
					, DD2_9
					, DD2_7
					, DD1_2
					, Image_Data
				FROM eyefidb.graphicsInventory
				WHERE SKU_Number = :SKU_Number AND DD3_9 = :revision
				ORDER BY id DESC
				LIMIT 1
			";

			$query = $this->db->prepare($mainQry);
			$query->bindParam(':SKU_Number', $partNumber, PDO::PARAM_STR);
			$query->bindParam(':revision', $revision, PDO::PARAM_STR);
			$query->execute();
			return $query->fetch();
		} else {
			$mainQry = "
				select SKU_Number
					, Product productName 
					, ID_Product 
					, Account_Vendor
					, DD1_1
					, DD1_5
					, DD1_6
					, DD2_8
					, DD2_6
					, DD3_2
					, DD3_1
					, DD3_3
					, DD3_9
					, DI_Product_SQL
					, DD3_8
					, DD2_1
					, DD3_6
					, Category
					, Serial_Number
					, DD2_2
					, DD1_7
					, DD2_9
					, DD2_7
					, DD1_2
					, Image_Data
				FROM eyefidb.graphicsInventory
				WHERE ( 
					ID_PRODUCT = :ID_PRODUCT OR 
					SKU_Number = :SKU_Number 
				) AND Status = 'Active'
				ORDER BY id DESC
				LIMIT 1
			";

			$query = $this->db->prepare($mainQry);
			$query->bindParam(':ID_PRODUCT', $partNumber, PDO::PARAM_STR);
			$query->bindParam(':SKU_Number', $partNumber, PDO::PARAM_STR);
			$query->execute();
			return $query->fetch();
		}
	}

	public function GetBomInformation($partNumber)
	{

		$mainQry = "
				select SKU_Number
					, Product productName 
					, ID_Product 
					, Account_Vendor
					, DD1_1
					, DD1_5
					, DD1_6
					, DD2_8
					, DD2_6
					, DD3_2
					, DD3_1
					, DD3_3
					, DD3_9
					, DI_Product_SQL
					, DD3_8
					, DD2_1
					, DD3_6
					, Category
					, Serial_Number
					, DD2_2
					, DD1_7
					, DD2_9
					, DD2_7
					, DD1_2
					, Image_Data
				FROM eyefidb.graphicsInventory
				WHERE ( 
					ID_PRODUCT = :ID_PRODUCT OR 
					SKU_Number = :SKU_Number 
				) AND Status = 'Active'
				ORDER BY id DESC
				LIMIT 1
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':ID_PRODUCT', $partNumber, PDO::PARAM_STR);
		$query->bindParam(':SKU_Number', $partNumber, PDO::PARAM_STR);
		$query->execute();
		return $query->fetch();
	}

	public function GetWorkOrderDetails($wo)
	{
		$qry = "
				select wod_nbr
					, wod_iss_date
					, wod_part 
					, wod_qty_req 
					, wod_qty_all 
					, wod_qty_iss 
					, wod_op 
					, ld_qty_oh 
				from wod_det 
				left join (
					select sum(a.ld_qty_oh) ld_qty_oh
						, ld_part
					from ld_det a
					WHERE ld_domain = 'EYE'
					GROUP by ld_part
				) b on b.ld_part = wod_det.wod_part
				where wod_nbr = :wod_nbr
				with (noLock)
			";

		$stmt = $this->db1->prepare($qry);
		$stmt->bindParam(':wod_nbr', $wo, PDO::PARAM_STR);
		$stmt->execute();
		return $stmt->fetchAll();
	}

	public function get_graphics_demand_by_wo($wo)
	{
		$qry = "
				select so 
					, line
				from eyefidb.graphicsDemand 
				where woNumber = :wod_nbr
			";

		$stmt = $this->db->prepare($qry);
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
					, a.sod_due_date
					, c.so_cust
				from sod_det a
				
				left join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
						, so_cust
					from so_mstr
					where so_domain = 'EYE'
				) c ON c.so_nbr = a.sod_nbr
				
				where a.sod_nbr = :salesOrder	
					AND a.sod_line = :lineNumber
				with (noLock)
			";

		$stmt = $this->db1->prepare($qry);
		$stmt->bindParam(':salesOrder', $salesOrder, PDO::PARAM_STR);
		$stmt->bindParam(':lineNumber', $lineNumber, PDO::PARAM_STR);
		$stmt->execute();
		return $stmt->fetch();
	}

	public function GetWorkOrderInformation($wo)
	{

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
					, b.wr_op
					, b.wr_desc
					, c.full_Desc
					, c.pt_part_type
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
				left join (
					select pt_part
						, max(pt_desc1 || ' ' || pt_desc2) full_Desc
						, max(pt_part_type) pt_part_type
					from pt_mstr
					WHERE pt_domain = 'EYE'
					GROUP BY pt_part
				) c ON c.pt_part = b.wr_part
				where b.wr_op IN (040, 050, 060, 070) 
					and wr_domain = 'EYE'
					and a.wo_nbr = :wo
				with (noLock)
			";

		$stmt = $this->db1->prepare($qry);
		$stmt->bindParam(':wo', $wo, PDO::PARAM_STR);
		$stmt->execute();
		$result = $stmt->fetch();

		$graphicsDemandInfo = $this->get_graphics_demand_by_wo($wo);
		$salesOrderInfo = false;

		if ($graphicsDemandInfo) {
			$salesOrderInfo = $this->get_sales_order_info_by_sales_line($graphicsDemandInfo['so'], $graphicsDemandInfo['line']);
		}

		if($this->sessionId != 3){
			$o = array(
				"woInfo" => $result, "bomInfo" => $this->GetBomInformationTest($result['WO_PART']), "woDetails" => $this->GetWorkOrderDetails($wo), "graphicsDemandInfo" => $graphicsDemandInfo, "salesOrderInfo" => $salesOrderInfo
			);
		}else{
			$o = array(
				"woInfo" => $result, "bomInfo" => $this->GetBomInformationTest($result['WO_PART']), "woDetails" => $this->GetWorkOrderDetails($wo), "graphicsDemandInfo" => $graphicsDemandInfo, "salesOrderInfo" => $salesOrderInfo
			);
		}

		return $o;
	}

	public function __destruct()
	{
		$this->db = null;
	}
}
