<?php

namespace EyefiDb\Api\InventoryValuation;
use PDO; 
use PDOException;	

class InventoryValuation
{
	
	public function __construct($db, $dbQad)
	{
		$this->db = $db;
		$this->dbQad = $dbQad;
		$this->startingDate = "2020-12-01";
	}

    public function getInMstr()
    {
        $qry = "
            select top 1000 a.in_part, 
                a.in_qty_oh, 
                a.in_sfty_stk,
                b.cp_cust_part,
                c.pt_desc1,
                c.pt_desc2
            from in_mstr a

            LEFT JOIN (
                select cp_cust, 
                    cp_part,
                    cp_cust_part
                from cp_mstr
            ) b ON a.in_part = b.cp_part

            LEFT JOIN (
                select pt_part, 
                    pt_desc1, 
                    pt_desc2
                from pt_mstr
                where pt_domain = 'EYE'
            ) c ON a.in_part = c.pt_part

            where a.in_domain = 'EYE' 
		";
		$stmt = $this->dbQad->prepare($qry);
		$stmt->execute(); 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

	public function getLocations($in){
		$qry = "
            select a.ld_part, 
                a.ld_status,
                a.ld_loc,
                a.ld_qty_oh,
                a.ld_lot
            from ld_det a
            where a.ld_domain = 'EYE'
                AND a.ld_part in ($in)
		";
		$stmt = $this->dbQad->prepare($qry);
		$stmt->execute(); 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
	}

	public function getWorkOrders($in){
		$qry = "
            select wo_nbr, 
                wo_part, 
                wo_qty_ord, 
                wo_qty_comp
            from wo_mstr a 
            where wo_domain = 'EYE'
                AND a.wo_part in ($in)
		";
		$stmt = $this->dbQad->prepare($qry);
		$stmt->execute(); 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
	}

    public function getArray($data, $key)
    {
        $in_array = array();
        foreach($data as $row){
            $in_array[] = $row[$key];
        }
        
        return "'" . implode("','", $in_array) . "'";
    }
    

	public function insert($partNumber, $qty, $date, $cost, $total)
    {
        $cycleSql = "
            INSERT INTO eyefidb.inventoryValuation (partNumber, qty, date, cost, total) 
            VALUES(:partNumber, :qty, :date, :cost, :total )
        ";

        $query = $this->db->prepare($cycleSql);
        $query->bindParam(":partNumber", $partNumber, PDO::PARAM_STR);
        $query->bindParam(":qty", $qty, PDO::PARAM_STR);
        $query->bindParam(":date", $date, PDO::PARAM_STR);
        $query->bindParam(":cost", $cost, PDO::PARAM_STR);
        $query->bindParam(":total", $total, PDO::PARAM_STR);
        $query->execute();
    }

    public function trunicateInventoryTransactions()
    {
        $cycleSql = "TRUNCATE TABLE eyefidb.inventoryTransactions";
        $query = $this->db->prepare($cycleSql);
        $query->execute();
    }

	public function insertTypeTransactions($data)
    {
    
        $cycleSql = "
            INSERT INTO eyefidb.inventoryTransactions 
            (
                part_number, 
                qty_last_12_months, 
                cost_last_12_months, 
                qty_last_6_months, 
                cost_last_6_months, 
                qty_last_3_months, 
                cost_last_3_months, 
                date_from, 
                date_to
            ) 
            VALUES(
                :part_number, 
                :qty_last_12_months, 
                :cost_last_12_months, 
                :qty_last_6_months, 
                :cost_last_6_months, 
                :qty_last_3_months, 
                :cost_last_3_months, 
                :date_from, 
                :date_to
            )
        ";

        $query = $this->db->prepare($cycleSql);
        $query->bindParam(":part_number", $data['part_number'], PDO::PARAM_STR);
        $query->bindParam(":qty_last_12_months", $data['qty_last_12_months'], PDO::PARAM_STR);
        $query->bindParam(":cost_last_12_months", $data['cost_last_12_months'], PDO::PARAM_STR);
        $query->bindParam(":qty_last_6_months", $data['qty_last_6_months'], PDO::PARAM_STR);
        $query->bindParam(":cost_last_6_months", $data['cost_last_6_months'], PDO::PARAM_STR);
        $query->bindParam(":qty_last_3_months", $data['qty_last_3_months'], PDO::PARAM_STR);
        $query->bindParam(":cost_last_3_months", $data['cost_last_3_months'], PDO::PARAM_STR);
        $query->bindParam(":date_from", $data['date_from'], PDO::PARAM_STR);
        $query->bindParam(":date_to", $data['date_to'], PDO::PARAM_STR);
        $query->execute();
    }

    public function getLastDayOfLastMonth()
    {
        $lastDateOfThisMonth = strtotime('last day of last month') ;

        return date('Y-m-d', $lastDateOfThisMonth);
    }

    public function getSubtractedMonths($monthsToSubtract)
    {
        return  date("Y-m-01", strtotime("-$monthsToSubtract months"));

    }
    
    public function getTypeTransactionData()
    {
        $lastDayOfLastMonth = $this->getLastDayOfLastMonth();

        $date_12 = $this->getSubtractedMonths(12);
        $date_6 = $this->getSubtractedMonths(6);
        $date_3 = $this->getSubtractedMonths(3);

        $qry = "
            select tr_part,
                sum(case when tr_effdate between '$date_12' AND '$lastDayOfLastMonth' THEN tr_qty_chg ELSE 0 END) qty_total_twelve_month, 
                sum(case when tr_effdate between '$date_6' AND '$lastDayOfLastMonth' THEN tr_qty_chg ELSE 0 END) qty_total_six_month,    
                sum(case when tr_effdate between '$date_3' AND '$lastDayOfLastMonth' THEN tr_qty_chg ELSE 0 END) qty_total_three_month,   
            
                sum(case when tr_effdate between '$date_12' AND '$lastDayOfLastMonth' THEN tr_qty_chg*tr_mtl_std ELSE 0 END) cost_total_twelve_month, 
                sum(case when tr_effdate between '$date_6' AND '$lastDayOfLastMonth' THEN tr_qty_chg*tr_mtl_std ELSE 0 END) cost_total_six_month,    
                sum(case when tr_effdate between '$date_3' AND '$lastDayOfLastMonth' THEN tr_qty_chg*tr_mtl_std ELSE 0 END) cost_total_three_month, 
                max(tr_mtl_std) max_cost, 
                min(tr_mtl_std) min_cost 
            from tr_hist 
            where  tr_domain = 'EYE' 
                and tr_type IN ('iss-so', 'iss-wo', 'iss-unp')
                and tr_effdate between '$date_12' AND '$lastDayOfLastMonth'
            group by tr_part
            with (noLock)  
        ";
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute(); 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function partNumbers($from, $to)
        {
        
        $qry = "
            select a.pt_part part,
                IFNULL(c.qty_change,0) qty_change,
                IFNULL(c.tr_mtl_std,0) tr_mtl_std
            from pt_mstr a
            LEFT JOIN (
                select 
                    tr_part tr_part,
                    max(oid_tr_hist) oid_tr_hist
                from tr_hist 
                where tr_domain = 'EYE' 
                    and tr_effdate between '$from' AND '$to'
                    group by  tr_part
                order by tr_effdate DESC, 
                    tr_time DESC, 
                    oid_tr_hist DESC
            ) b ON b.tr_part = a.pt_part
            JOIN (
                select max(oid_tr_hist) oid_tr_hist, tr_part,
                    tr_begin_qoh+tr_qty_chg qty_change,
                    max(tr_mtl_std) tr_mtl_std
                from tr_hist 
                where tr_domain = 'EYE' 
                    and tr_effdate between '$from' AND '$to'
                group by tr_begin_qoh,tr_qty_chg, tr_part
                order by tr_effdate DESC, 
                    tr_time DESC, 
                    oid_tr_hist DESC
            ) c ON c.oid_tr_hist = b.oid_tr_hist
            where a.pt_domain = 'EYE' 
            with (noLock)  
        ";
		$stmt = $this->dbQad->prepare($qry);
		$stmt->execute(); 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
	}
    
    public function runTransactions()
    {
		
        $data = $this->getTypeTransactionData();
        
        
        foreach($data as $row){
            $this->insertTypeTransactions(array(
                "part_number" => $row['tr_part'], 
                "qty_last_12_months" => $row['QTY_TOTAL_TWELVE_MONTH'], 
                "cost_last_12_months" => $row['COST_TOTAL_TWELVE_MONTH'], 
                "qty_last_6_months" => $row['QTY_TOTAL_SIX_MONTH'], 
                "cost_last_6_months" => $row['COST_TOTAL_SIX_MONTH'], 
                "qty_last_3_months" => $row['QTY_TOTAL_THREE_MONTH'], 
                "cost_last_3_months" => $row['COST_TOTAL_THREE_MONTH'], 
                "date_from" => $this->getSubtractedMonths(12), 
                "date_to" => $this->getLastDayOfLastMonth()
            ));
        }

        return $data;

	}

    public function runValuation()
    {
        for ($i=1; $i<=3; $i++) { 
            $dateFrom = date('Y-m-01', strtotime("-$i month"));
            $dateTo = date('Y-m-t', strtotime("-$i month"));

            $partNumbers = $this->partNumbers($dateFrom, $dateTo);
            foreach($partNumbers as $partNumbersRow){
                    $total = $partNumbersRow['QTY_CHANGE'] * $partNumbersRow['TR_MTL_STD'];
                    $this->insert($partNumbersRow['PART'], $partNumbersRow['QTY_CHANGE'], $dateTo, $partNumbersRow['TR_MTL_STD'], $total);
            }
        } 
    }

    public function getData()
    {
        return $this->runValuation();
	}

	public function createData()
    {
		
        $inMstr = $this->getInMstr();

        $in = $this->getArray($inMstr, 'IN_PART');

        $locations = $this->getLocations($in);
        $workOrders = $this->getWorkOrders($in);

        foreach($inMstr as &$row){
            $row['locations'] = [];
            $row['workOrders'] = [];
            foreach($locations as &$locationsRow){
                if($row['IN_PART'] == $locationsRow['ld_part']){
                    $row['locations'][] = $locationsRow;
                }
            }
            foreach($workOrders as &$workOrdersRow){
                if($row['IN_PART'] == $workOrdersRow['wo_part']){
                    $row['workOrders'][] = $workOrdersRow;
                }
            }
        }

        return $inMstr;

	}
	
	public function __destruct() {
		$this->dbQad = null;
	}
}
	