<?php

namespace EyefiDb\Api\AtiBufferStock;
use PDO; 
use PDOException;	

class AtiBufferStock
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

	public function insertValuationData($data)
    {
        $cycleSql = "
            INSERT INTO eyefidb.inventoryValuationData (data) 
            VALUES(:data )
        ";

        $query = $this->db->prepare($cycleSql);
        $query->bindParam(":data", $data, PDO::PARAM_STR);
        $query->execute();
    }

	public function getValuationData()
    {
        $cycleSql = "
            SELECT data FROM eyefidb.inventoryValuationData order by id DESC limit 1
        ";
        $query = $this->db->prepare($cycleSql);
        $query->execute();
        $results = $query->fetch(PDO::FETCH_ASSOC);

        return json_decode($results['data']);

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
    
    /**
     * Gets all valid part numbers in QAD
     * Join transaction table and pull qty change for the specific date
     *
     * @param [type] $from
     * @param [type] $to
     */
    public function getValuation($from, $to)
    {
        
        $qry = "
            select a.pt_part part,
                c.qty_change qty_change,
                IFNULL(c.tr_mtl_std,0) tr_mtl_std,
                c.qty_change*IFNULL(c.tr_mtl_std,0) total
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
                select max(oid_tr_hist) oid_tr_hist, 
                    tr_part,
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
            and a.pt_part = 'ASY-02680-300'
            with (noLock)  
        ";
		$stmt = $this->dbQad->prepare($qry);
		$stmt->execute(); 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
	}

    /**
     * This is used to retrieve last transaction record if record is no qty change was found in the getValuation() function
     */

    public function getValuationLastRecord($partNumber, $effectiveDate)
    {
        $qry = "
            select top 1 tr_part part,
                tr_begin_qoh+tr_qty_chg qty_change,
                (tr_begin_qoh+tr_qty_chg)*tr_mtl_std total,
                tr_mtl_std tr_mtl_std
            from tr_hist 
            where tr_domain = 'EYE'  
                and tr_part = :partNumber 
                and tr_effdate <= :effectiveDate
            order by tr_effdate DESC, 
                tr_time DESC, 
                oid_tr_hist DESC
            with (noLock)  
        ";
		$stmt = $this->dbQad->prepare($qry);
        $stmt->bindParam(":partNumber", $partNumber, PDO::PARAM_STR);
        $stmt->bindParam(":effectiveDate", $effectiveDate, PDO::PARAM_STR);
		$stmt->execute(); 
        return $stmt->fetch(PDO::FETCH_ASSOC);
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

    public function getInventoryValuation()
    {
        $qry = "
            select * from eyefidb.inventoryValuation order by date asc
        ";
		$stmt = $this->db->prepare($qry);
		$stmt->execute(); 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get qty on hand and cost for specific month
     * and insert date to database
     * Loop through rolling last 12 months starting from previous month
     */

    public function runValuation()
    {
        $data = [];
        for ($i = 1; $i <= 12; $i++) {
            $dateFrom = date('Y-m-01', strtotime("-$i month"));
            $dateTo = date('Y-m-t', strtotime("-$i month"));

            //Check if record exist in this function to get cost and qty on hand for specific month
            $getValuation = $this->getValuation($dateFrom, $dateTo);

            foreach ($getValuation as &$partNumbersRow) {
                
                $total = $partNumbersRow['QTY_CHANGE'] * $partNumbersRow['TR_MTL_STD'];

                //if no record found get last transaction record based from the dateto variable
                //if this is not added, we will have records with empty values, which in the case of QAD, it retrieves the last transaction record.
                if (!$partNumbersRow['QTY_CHANGE']) {
                    $partNumbersRow = $this->getValuationLastRecord($partNumbersRow['PART'], $dateTo);
                    $total = $partNumbersRow['QTY_CHANGE'] * $partNumbersRow['TR_MTL_STD'];
                }
                $data[] = $partNumbersRow;
                // Add to database
                $this->insert($partNumbersRow['PART'], $partNumbersRow['QTY_CHANGE'], $dateTo, $partNumbersRow['TR_MTL_STD'], $total);
            }
        }

        // $dateFrom = date('Y-m-01', strtotime("-1 month"));
        // $dateTo = date('Y-m-t', strtotime("-1 month"));

        // //Check if record exist in this function to get cost and qty on hand for specific month
        // $getValuation = $this->getValuation($dateFrom, $dateTo);

        // $test = [];
        // foreach ($getValuation as &$partNumbersRow) {
            
        //     //if no record found get last transaction record based from the dateto variable
        //     //if this is not added, we will have records with empty values, which in the case of QAD, it retrieves the last transaction record.
        //     if (!$partNumbersRow['QTY_CHANGE']) {
        //         //$test[] = $partNumbersRow['PART'];
        //     }

        //     // Add to database
        //     $this->insert($partNumbersRow['PART'], $partNumbersRow['QTY_CHANGE'], $dateTo, $partNumbersRow['TR_MTL_STD'], $partNumbersRow['TOTAL']);
        // }

        //return $test;
        

        //ASY-02680-300
        // test this part number
    }

    public function getUniquePartNumbers()
    {
        $qry = "
            select partNumber 
            from eyefidb.inventoryValuation
            group by partNumber
        ";
		$stmt = $this->db->prepare($qry);
		$stmt->execute(); 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * This is the final data that is stored as json into the database.
     * This will then be used to be displayed onto the db
     *
     */
    public function generateReport()
    {

        $lastDayOfLastMonth = $this->getLastDayOfLastMonth();

        $dateFrom = $this->getSubtractedMonths(12);

        $valuationData = $this->getInventoryValuation($dateFrom, $lastDayOfLastMonth);

        $data = $this->getUniquePartNumbers();
        $_12 = date('Y-m-t', strtotime("-12 month"));
        $_11 = date('Y-m-t', strtotime("-11 month"));
        $_10 = date('Y-m-t', strtotime("-10 month"));
        $_9 = date('Y-m-t', strtotime("-9 month"));
        $_8 = date('Y-m-t', strtotime("-8 month"));
        $_7 = date('Y-m-t', strtotime("-7 month"));
        $_6 = date('Y-m-t', strtotime("-6 month"));
        $_5 = date('Y-m-t', strtotime("-5 month"));
        $_4 = date('Y-m-t', strtotime("-4 month"));
        $_3 = date('Y-m-t', strtotime("-3 month"));
        $_2 = date('Y-m-t', strtotime("-2 month"));
        $_1 = date('Y-m-t', strtotime("-1 month"));

        foreach($data as &$row){
            $row['customer'] = "";
            $row[$_12] = "-";
            $row[$_11] = "-";
            $row[$_10] = "-";
            $row[$_9] = "-";
            $row[$_8] = "-";
            $row[$_7] = "-";
            $row[$_6] = "-";
            $row[$_5] = "-";
            $row[$_4] = "-";
            $row[$_3] = "-";
            $row[$_2] = "-";
            $row[$_1] = "-";
            $row['12_month_avg'] = "";

            $previousTotal = 0;
            $previousDate = '';
            foreach ($valuationData as &$row1) {
                if ($row1['partNumber'] == $row['partNumber']) {
                    $previousTotal = $row1['total'];
                    $row[$row1['date']] = $row1['total'];
                    $previousDate = $row1['date'];
                }
                
            }

                $row[$previousDate] = 555;



            

        }

        $this->insertValuationData(json_encode($data));
        //return $data;

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

    /**
     * Main function to run
     * NOTE: this is a heavy query and should be performed outside business hours. 
     *       This report should be ran monthly and the end of each month.
     * 
     * 1 - run runValuation() function to store data into database
     * 2 - run trunicateInventoryTransactions() & runTransactions functions to store data into database
     * 3 - run generateReport() function to store data as JSON into database
     * 4 - run getValuationData() function to display results
     * 
     * You do not have to run this in sequenece, just make sure the data is available in the database
     */
    public function run()
    {
        // $this->trunicateInventoryTransactions();
        // $this->runTransactions();

        return $this->getValuationData();
	}

	public function __destruct() {
		$this->dbQad = null;
	}
}
	