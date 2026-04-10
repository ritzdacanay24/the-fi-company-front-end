<?php

namespace EyefiDb\Api\item_search;

use PDO;
use PDOException;

class ItemSearch
{

	protected $db;
	protected $dbEyeFi;

	public function __construct($dbQad, $dbEyeFi)
	{

		$this->db = $dbQad;
		$this->dbEyeFi = $dbEyeFi;
	}

	public function getShortages($partNumber, $typeOfItemSearch = 'assemblyNumber')
	{

		$mainQry = "
			select a.*,
				concat(b.first, ' ', b.last) fullName,
				c.status statusGraphics,
				c.graphicsWorkOrder graphicsWorkOrder
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
				AND ( a.productionIssuedDate IS NULL )
			
		";

		if($typeOfItemSearch == 'partNumber'){
			$mainQry .= " AND partNumber = '$partNumber'";
		}else if($typeOfItemSearch == 'assemblyNumber'){
			$mainQry .= " AND assemblyNumber = '$partNumber'";
		}

		$mainQry .= 'ORDER BY a.priority DESC, a.dueDate ASC';

		$query = $this->dbEyeFi->prepare($mainQry);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
		
    }

	public function readSingleRef($coNumber)
		{

		$obj = array();
		$mainQry = "
			select CAST(a.ld_loc AS CHAR(25)) ld_loc
				, a.ld_part ld_part
				, a.ld_qty_oh ld_qty_oh
				, a.ld_site ld_site
				, a.ld_status ld_status
				, a.ld_qty_all ld_qty_all
				, CONCAT(pt_desc1, pt_desc2) fullDesc
				, a.ld_lot
			from ld_det a
			
			LEFT JOIN ( 
				select pt_part
					, max(pt_desc1) pt_desc1
					, max(pt_desc2) pt_desc2
				from pt_mstr
				WHERE pt_domain = 'EYE'
				group by pt_part
			) b ON b.pt_part = a.ld_part
			
			WHERE a.ld_ref = :ld_ref 
				AND ld_domain = 'EYE'
				AND a.ld_qty_oh > 0
			WITH (NOLOCK)
		";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':ld_ref', $coNumber, PDO::PARAM_STR);
		$query->execute();
		$obj['locationDet'] = $query->fetchAll(PDO::FETCH_ASSOC);

		if ($obj['locationDet']) {
			$obj['locationDetDesc'] = $obj['locationDet'][0]['FULLDESC'];
		}

		$obj['POresults'] = array();
		$obj['WOresults'] = array();

		return $obj;
	}

	public function getLocationByItem($location)
	{
		$mainQry = "
			select CAST(a.ld_part AS CHAR(25)) ld_part
				, CAST(a.ld_loc AS CHAR(25))  ld_loc
				, cast(a.ld_qty_oh as numeric(36,2)) ld_qty_oh
				, b.pt_desc1 || ' ' || b.pt_desc2 fullDesc
			from ld_det a
			
			LEFT JOIN ( 
				select pt_part
					, max(pt_desc1) pt_desc1
					, max(pt_desc2) pt_desc2
				from pt_mstr
				WHERE pt_domain = 'EYE'
				group by pt_part
			) b ON b.pt_part = CAST(a.ld_part AS CHAR(25))
			
			LEFT JOIN ( 
				select sct_part
					, max(sct_cst_tot) sct_cst_tot
				from sct_det
				WHERE sct_sim = 'Standard' 
					and sct_domain = 'EYE' 
					and sct_site  = 'EYE01'
				group by sct_part
			) d ON CAST(a.ld_loc AS CHAR(25)) = d.sct_part 
			
			
			where a.ld_domain = 'EYE'
				AND a.ld_qty_oh > 0
				AND a.ld_loc = :location
			ORDER BY CAST(a.ld_loc AS CHAR(25)) ASC
			with (noLock)
		";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':location', $location, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		return $result;
	}

	public function getPartNumber($partNumber){
		$itemInfo = "
				select a.pt_part
					, a.pt_desc1
					, a.pt_desc2
					, a.pt_um
					, a.pt_pm_code
					, a.pt_status
					, a.pt_site
					, a.pt_added
					, a.pt_mod_date
					, b.sct_cst_tot pt_price
					, b.sct_cst_tot
					, a.pt_price part_price
					, a.pt_desc1 || ' ' || a.pt_desc2 fullDesc
				from pt_mstr a
				left join sct_det b ON a.pt_part = b.sct_part 
					AND sct_sim = 'Standard' and sct_domain = 'EYE' 
					and sct_site  = 'EYE01'
				WHERE a.pt_part = :item
					AND pt_domain = 'EYE'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($itemInfo);
		$query->bindParam(":item", $partNumber, PDO::PARAM_STR);
		$query->execute();
		return $query->fetch();
	}

	public function getPartNumberSearchFieldService($partNumber){
		$itemInfo = "
				select a.pt_part
					, a.pt_desc1
					, a.pt_desc2
					, a.pt_um
					, a.pt_pm_code
					, a.pt_status
					, a.pt_site
					, a.pt_added
					, a.pt_mod_date
					, a.pt_price pt_price
					, b.sct_cst_tot
					, a.pt_price part_price
					, a.pt_desc1 || ' ' || a.pt_desc2 fullDesc
				from pt_mstr a
				left join sct_det b ON a.pt_part = b.sct_part 
					AND sct_sim = 'Standard' and sct_domain = 'EYE' 
					and sct_site  = 'EYE01'
				WHERE a.pt_part = :item
					AND pt_domain = 'EYE'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($itemInfo);
		$query->bindParam(":item", $partNumber, PDO::PARAM_STR);
		$query->execute();
		return $query->fetch();
	}

	public function customerItemSearch($partNumber)
	{
		$itemInfo = "
				select a.pt_part
					, a.pt_desc1
					, a.pt_desc2
					, b.cp_cust_part
				from pt_mstr a
				left join cp_mstr b ON b.cp_part = a.pt_part
				WHERE a.pt_part = :partNumber
					AND pt_domain = 'EYE'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($itemInfo);
		$query->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
		$query->execute();
		return $query->fetch();
	}

	public function customerItemSearchQ($partNumber)
	{
		$itemInfo = "
				select a.pt_part
					, a.pt_desc1
					, a.pt_desc2
					, b.cp_cust_part
				from pt_mstr a
				left join cp_mstr b ON b.cp_part = a.pt_part
				WHERE b.cp_cust_part LIKE '%$partNumber%'
					AND pt_domain = 'EYE'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($itemInfo);
		$query->execute();
		return $query->fetchAll();
	}

	

	public function readByItem($item, $typeOfItemSearch)
		{

		$obj = array();
		$mainQry = "
				select CAST(a.ld_loc AS CHAR(25)) ld_loc
					, a.ld_part ld_qty_oh
					, a.ld_qty_oh ld_qty_oh
					, a.ld_site ld_site
					, a.ld_status ld_status
					, a.ld_qty_all ld_qty_all
					, a.ld_qty_oh - a.ld_qty_all  available
					, CONCAT(pt_desc1, pt_desc2) fullDesc
					, a.ld_lot
				from ld_det a
				
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, max(pt_desc2) pt_desc2
					from pt_mstr
					WHERE pt_domain = 'EYE'
					group by pt_part
				) b ON b.pt_part = a.ld_part
				
				WHERE a.ld_part = :ld_part 
					AND ld_domain = 'EYE'
					AND a.ld_qty_oh > 0
				WITH (NOLOCK)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':ld_part', $item, PDO::PARAM_STR);
		$query->execute();
		$obj['locationDet'] = $query->fetchAll(PDO::FETCH_ASSOC);

		if ($obj['locationDet']) {
			$obj['locationDetDesc'] = $obj['locationDet'][0]['FULLDESC'];
		}

		$qry = "
				select a.pod_nbr
					, a.pod_part
					, pod_qty_ord
					, pod_qty_rcvd
					, pod_due_date
					, pod_pur_cost
					, pod_um
					, pod_status
					, b.po_vend
					, b.po_shipvia
					, b.po_ord_date
					, b.po_rmks
					, b.po_buyer
				from pod_det a
				left join po_mstr b ON a.pod_nbr = b.po_nbr AND po_domain = 'EYE'
				where a.pod_domain = 'EYE'
					AND a.pod_part = :item
					AND a.pod_status != 'c'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(":item", $item, PDO::PARAM_STR);
		$query->execute();
		$obj['POresults'] = $query->fetchAll(PDO::FETCH_ASSOC);

		$qry = "
				select  a.wr_nbr
					, max(a.wr_qty_ord) wr_qty_ord
					, max(a.wr_due) wr_due
					, max(wo_status) wr_status
					, max(b.wo_qty_comp) wr_qty_comp
				from wr_route a
				join wo_mstr b on b.wo_nbr = a.wr_nbr and wo_status != 'C' and wo_domain = 'EYE'
				where a.wr_domain = 'EYE'
					AND a.wr_part = :item
				GROUP BY a.wr_nbr
				WITH (NOLOCK)
			";

			
		$query = $this->db->prepare($qry);
		$query->bindParam(":item", $item, PDO::PARAM_STR);
		$query->execute();
		$obj['WOresults'] = $query->fetchAll(PDO::FETCH_ASSOC);

		$itemInfo = "
				select a.pt_part
					, a.pt_desc1
					, a.pt_desc2
					, a.pt_um
					, a.pt_pm_code
					, a.pt_status
					, a.pt_site
					, a.pt_added
					, a.pt_mod_date
					, b.sct_cst_tot pt_price
					, a.pt_desc1 || ' ' || a.pt_desc2 fullDesc
					, pt_draw
					, pt_prod_line
					, pt_part_type
					, pt_abc
					, pt_iss_pol
					, pt_routing
					, pt_rev
				from pt_mstr a
				left join sct_det b ON a.pt_part = b.sct_part 
					AND sct_sim = 'Standard' and sct_domain = 'EYE' 
					and sct_site  = 'EYE01'
				WHERE a.pt_part = :item
					AND pt_domain = 'EYE'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($itemInfo);
		$query->bindParam(":item", $item, PDO::PARAM_STR);
		$query->execute();
		$obj['itemInfo'] = $query->fetch();

		$mainQry = "
			select sod_part 
				, sod_due_date sod_due_date
				, sod_nbr
				, sum(sod_qty_ord) totalOrdered
				, sum(sod_qty_ivcd) totalInvoiced
				, sum(sod_qty_all) totalAllocated
				, sum(sod_qty_pick) totalPicked
				, sum(sod_qty_ship) totalShipped
				, sum(sod_qty_ord) - sum(sod_qty_ship) openBalance
			from sod_det 
			where sod_qty_ship != sod_qty_ord
				and sod_part = :ld_part
				AND sod_domain = 'EYE'
			group by sod_part, sod_nbr
				, sod_due_date
			WITH (NOLOCK)
		";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(':ld_part', $item, PDO::PARAM_STR);
		$query->execute();
		$obj['orderDemand'] = $query->fetchAll(PDO::FETCH_ASSOC);

		//Shortages 
		$obj['openShortages'] = $this->getShortages($item, $typeOfItemSearch);

		return $obj;
	}

	public function ReadLocationDetail($item)
	{

		$mainQry = "
				select sod_part 
					, sod_due_date sod_due_date
					, sod_nbr
					, sum(sod_qty_ord) totalOrdered
					, sum(sod_qty_ivcd) totalInvoiced
					, sum(sod_qty_all) totalAllocated
					, sum(sod_qty_pick) totalPicked
					, sum(sod_qty_ship) totalShipped
					, sum(sod_qty_ord) - sum(sod_qty_ship) openBalance
				from sod_det 
				where sod_qty_ship != sod_qty_ord
					and sod_part = :ld_part
					AND sod_domain = 'EYE'
				group by sod_part, sod_nbr
					, sod_due_date
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(':ld_part', $item, PDO::PARAM_STR);
		$query->execute();
		$orderDemand = $query->fetchAll(PDO::FETCH_ASSOC);

		$actualRequiredQty = 0;
		foreach ($orderDemand as $orderDemandsRow) {
			if ($orderDemandsRow['OPENBALANCE'] > 0) {
				$actualRequiredQty = $actualRequiredQty + $orderDemandsRow['OPENBALANCE'];
			}
		}

		$itemSummary = "
				select b.in_part
					, sum(b.in_qty_req) totalReq
					, sum(b.in_qty_avail) totalAvail
					, sum(b.in_qty_all) totalAll
					, sum(b.in_qty_oh) totalOnHand
					, 5 test
				from in_mstr b 
				WHERE b.in_part = :part 
					AND in_domain = 'EYE'
				GROUP BY b.in_part
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($itemSummary);
		$query->bindParam(':part', $item, PDO::PARAM_STR);
		$query->execute();
		$itemSummary = $query->fetch();

		$mainQry = "
				select CAST(a.ld_loc AS CHAR(25)) ld_loc
					, a.ld_part
					, a.ld_qty_oh
					, a.ld_site
					, a.ld_status
				from ld_det a
				WHERE a.ld_part = :ld_part 
					AND ld_domain = 'EYE'
					AND a.ld_qty_oh > 0
				WITH (NOLOCK)
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':ld_part', $item, PDO::PARAM_STR);
		$query->execute();
		$locationDet = $query->fetchAll(PDO::FETCH_ASSOC);

		$actualTotalAvailableQty = 0;
		foreach ($locationDet as $locationDetRow) {
			$actualTotalAvailableQty = $actualTotalAvailableQty + $locationDetRow['ld_qty_oh'];
		}

		$itemInfo = "
				select a.pt_part
					, a.pt_desc1
					, a.pt_desc2
					, a.pt_um
					, a.pt_pm_code
					, a.pt_status
					, a.pt_site
					, a.pt_added
					, a.pt_mod_date
					, b.sct_cst_tot pt_price
				from pt_mstr a
				left join sct_det b ON a.pt_part = b.sct_part AND sct_sim = 'Standard' and sct_domain = 'EYE' 
				and sct_site  = 'EYE01'
				WHERE a.pt_part = :part
					AND pt_domain = 'EYE'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($itemInfo);
		$query->bindParam(':part', $item, PDO::PARAM_STR);
		$query->execute();
		$itemInfoResult = $query->fetch();

		$qry = "
				select a.pod_nbr
					, a.pod_part
					, pod_qty_ord
					, pod_qty_rcvd
					, pod_due_date
					, pod_pur_cost
					, pod_um
					, pod_status
					, b.po_vend
					, b.po_shipvia
					, b.po_ord_date
				from pod_det a
				left join po_mstr b ON a.pod_nbr = b.po_nbr AND po_domain = 'EYE'
				where a.pod_domain = 'EYE'
					AND a.pod_part = :item
					AND a.pod_status != 'c'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(":item", $item, PDO::PARAM_STR);
		$query->execute();
		$POresults = $query->fetchAll(PDO::FETCH_ASSOC);

		$poOrderedQty = 0;
		foreach ($POresults as $POresultsRow) {
			if ($POresultsRow['pod_status'] != 'c') {
				$poOrderedQty = $poOrderedQty + $POresultsRow['pod_qty_ord'];
			}
		}

		$qry = "
				select wo_nbr
					, wo_lot
					, wo_so_job
					, wo_due_date
					, wo_part
					, wo_qty_ord wo_qty_ord
                    , wo_qty_comp wo_qty_comp
                    , wo_status
				from wo_mstr 
				where wo_part = :item
				and wo_qty_ord != wo_qty_comp 
                AND wo_domain = 'EYE'
				and wo_nbr != ''
				AND wo_status NOT IN ('c', 'p', 'C', 'P')
				WITH (NOLOCK)
			";
		/*$qry = "
				select wod_nbr wod_nbr
					, wod_lot wod_lot
					, wod_iss_date wod_iss_date
					, wod_part wod_part
					, wod_qty_req wod_qty_req
					, wod_qty_all wod_qty_all
					, wod_qty_pick wod_qty_pick
					, wod_qty_iss wod_qty_iss
				from wod_det 
				where wod_part = :item
					AND wod_domain = 'EYE'
					AND wod_qty_req != wod_qty_iss
					AND wod_qty_req > 0
				WITH (NOLOCK)
			";*/
		$query = $this->db->prepare($qry);
		$query->bindParam(":item", $item, PDO::PARAM_STR);
		$query->execute();
		$woResults = $query->fetchAll(PDO::FETCH_ASSOC);

		$woOrderedQty = 0;
		// foreach($woResults as $woResultsRow){
		// 	$woOrderedQty = $woOrderedQty + ($woResultsRow['WOD_QTY_REQ']-$woResultsRow['WOD_QTY_ISS']);
		// }

		$itemSummary['poQtyOrdered'] = $poOrderedQty;
		$itemSummary['actualRequiredQty'] = $actualRequiredQty;
		$itemSummary['actualTotalAvailableQty'] = $actualTotalAvailableQty;
		$itemSummary['woOrderedQty'] = $woOrderedQty;

		return $obj = array(
			'details' => $locationDet, 'demand' => $orderDemand, 'itemSummary' => $itemSummary, 'itemInfo' => $itemInfoResult, 'poInfo' => $POresults, 'woResults' => $woResults, 'test' => "test"
		);
	}

	public function Read($item)
	{
		$mainQry = "
				select TOP 25
					 a.in_part
					, a.in_site
					, a.in_qty_oh
					, a.in_qty_req
					, a.in_qty_all
					, a.in_qty_ord
					, a.in_qty_chg
					, a.in_qty_avail
					, a.in_iss_date
					, a.in_rec_date
					, a.in_user1
					, a.in_user2
					, a.in_sfty_stk
					, a.in_loc
					, a.in_loc_type
					, a.in_wh
				from in_mstr a
					AND in_domain = 'EYE'
				WITH (NOLOCK)
			";

		if ($item == 'ReadAll') {
			$mainQry .= " WHERE a.in_qty_oh > 0";
			$query = $this->db->prepare($mainQry);
			$query->execute();
			$result = $query->fetchAll(PDO::FETCH_ASSOC);
		} else {
			$mainQry .= " WHERE a.in_part = :in_part";
			$query = $this->db->prepare($mainQry);
			$query->bindParam(':in_part', $item, PDO::PARAM_STR);
			$query->execute();
			$result = $query->fetchAll(PDO::FETCH_ASSOC);
		}

		return $result;
	}

	public function ProductStructre($parentItem)
	{

		$bomCodeCheck = "
				SELECT TOP 1 pt_bom_code
				FROM pt_mstr
				WHERE pt_part = :item
				AND pt_bom_code != ''
				WITH (NOLOCK)
			";
		$productChildrenQuery = $this->db->prepare($bomCodeCheck);
		$productChildrenQuery->bindParam(':item', $parentItem, PDO::PARAM_STR);
		$productChildrenQuery->execute();
		$results = $productChildrenQuery->fetch();

		$itemIntegrated = false;
		if ($results) {
			$parentItem = $results['pt_bom_code'];
			$itemIntegrated = true;
		}


		$productStructure = "
				SELECT t1.ps_par parent
				
					, t1.ps_comp parent_component
					, t1.ps_qty_per parent_comp_qty
					, a.pt_desc1 parent_desc
					, a.pt_um parent_um
					
					, t2.ps_comp as parent_category 
					, t2.ps_qty_per parent_category_qty
					, d.pt_desc1 parent_category_desc
					, d.pt_um parent_category_um
					
					, t3.ps_comp as parent_category_sub
					, t3.ps_qty_per parent_category__sub_qty
					, e.pt_desc1 parent_category_sub_desc
					, e.pt_um parent_category_sub_um
					
				from ps_mstr t1 
				LEFT JOIN ps_mstr t2 
					on t1.ps_comp = t2.ps_par
						AND t2.ps_domain = 'EYE'
				LEFT JOIN ps_mstr t3 
					on t2.ps_comp = t3.ps_par
						AND t3.ps_domain = 'EYE'
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, pt_um
					from pt_mstr
					WHERE pt_domain = 'EYE'
					group by pt_part
						, pt_um
				) a ON t1.ps_comp = a.pt_part
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, pt_um
					from pt_mstr
					WHERE pt_domain = 'EYE'
					group by pt_part
						, pt_um
				) d ON t2.ps_comp = d.pt_part
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, pt_um
					from pt_mstr
					WHERE pt_domain = 'EYE'
					group by pt_part
						, pt_um
				) e ON t3.ps_comp = e.pt_part
				WHERE t1.ps_par = :parentItem 
					AND t1.ps_domain = 'EYE'
				ORDER BY t1.ps_comp, t2.ps_comp ASC
				WITH (NOLOCK)
			";
		$productChildrenQuery = $this->db->prepare($productStructure);
		$productChildrenQuery->bindParam(':parentItem', $parentItem, PDO::PARAM_STR);
		$productChildrenQuery->execute();
		$results = $productChildrenQuery->fetchAll(PDO::FETCH_ASSOC);

		return $obj = array(
			"results" => $results, "itemIntegrated" => $itemIntegrated
		);
	}

	public function __destruct()
	{
		$this->db = null;
	}
}
