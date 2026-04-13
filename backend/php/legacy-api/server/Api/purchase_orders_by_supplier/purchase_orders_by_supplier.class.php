<?php

class PoBySupplier
{

    protected $db;

    public function __construct($dbQad)
    {

        $this->db = $dbQad;
        $this->nowDate = date("Y-m-d H:i:s", time());
        $this->nowDate1 = date("Y-m-d");
    }

    public function ReadDetails($data)
    {

        $monthNum  = $data['month'];
        $dateObj   = DateTime::createFromFormat('!m', $monthNum);
        $monthName = $dateObj->format('F'); // March

        $mainQry = "
				select po_vend
					, po_ord_date
					, pod_nbr
					, pod_pur_cost 
					, pod_part
					, pod_qty_ord
					, pod_status
					, pod_qty_ord*pod_pur_cost cost
					, pod_due_date
				from po_mstr a 
				LEFT JOIN ( 
					SELECT pod_nbr
						, pod_pur_cost 
						, pod_part
						, pod_qty_ord
						, pod_status
						, pod_due_date
					FROM pod_det 
					WHERE pod_domain = 'EYE' 
				) b ON a.po_nbr = b.pod_nbr 
				where po_vend IN ('JIAMET', 'TACAPP', 'JIAIMP')
					AND po_domain = 'EYE'   
					AND ( month(pod_due_date) = :month AND year(pod_due_date) = :year )
				with (noLock) 				
			";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":month", $data['month'], PDO::PARAM_STR);
        $query->bindParam(":year", $data['year'], PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $totalCost = 0;
        foreach ($results as $row) {
            $totalCost = $row['COST'] + $totalCost;
        }

        $obj = array(
            "results" => $results, "totalCost" => $totalCost, "monthName" => $monthName
        );

        return $obj;
    }

    public function ReadOverview($data)
    {

        $mainQry = "
				select sum(qtyOrdered) qtyOrdered
					, sum(cost * qtyOrdered) fullOrderAmount 
					, po_vend po_vend
					, month(pod_due_date) orderedMonth 
					, year(pod_due_date) orderedYear 
				from po_mstr a 
				LEFT JOIN ( 
					SELECT pod_nbr
						, pod_qty_ord qtyOrdered
						, pod_pur_cost cost 
						, pod_due_date pod_due_date
					FROM pod_det 
					WHERE pod_domain = 'EYE' 
				) b ON a.po_nbr = b.pod_nbr 
				where po_vend IN ('JIAMET', 'TACAPP', 'JIAIMP')
					AND po_domain = 'EYE'   
					AND pod_due_date between :dateFrom and :dateTo 
				GROUP BY po_vend, year(pod_due_date), month(pod_due_date) 
				with (noLock) 		
			";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $data['dateFrom'], PDO::PARAM_STR);
        $query->bindParam(":dateTo", $data['dateTo'], PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $obj = array();

        $start = $month = strtotime($data['dateFrom']);
        $end = strtotime($data['dateTo']);

        $maxAmount = 1000000;
        while ($month <= $end) {
            $m = date('m', $month);
            $y = date('Y', $month);
            $label = getMonthName($m) . " - " . $y;

            $obj['label'][] = $label;
            $dateToLook = date('Y-n', $month);

            $JIAMET = array();
            $TACAPP = array();
            $JIAIMP = array();

            $cdwCount = 0;
            $foundCdw = false;

            $tacappCount = 0;
            $foundTacapp = false;

            $JIAMETCount = 0;
            $foundJIAMET = false;

            foreach ($results as $row) {
                $formatedDate = $row['ORDEREDYEAR'] . '-' . $row['ORDEREDMONTH'];

                if ($dateToLook == $formatedDate && $row['PO_VEND'] == 'JIAMET') {
                    $JIAMETCount += $row['FULLORDERAMOUNT'];
                    $foundJIAMET = true;
                }

                if ($dateToLook == $formatedDate && $row['PO_VEND'] == 'TACAPP') {
                    $tacappCount += $row['FULLORDERAMOUNT'];
                    $foundTacapp = true;
                }
                if ($dateToLook == $formatedDate && $row['PO_VEND'] == 'JIAIMP') {
                    $cdwCount += $row['FULLORDERAMOUNT'];
                    $foundCdw = true;
                }
            }

            if ($foundCdw) {
                $obj['JIAIMP']['totalCost'][] = $cdwCount;
                $obj['JIAIMP']['barClass'][] = $cdwCount > $maxAmount ? '#D80000' : 'rgba(55, 160, 225, 0.7)';
                $obj['JIAIMP']['label'][] = 'JIAIMP';
            } else {
                $obj['JIAIMP']['totalCost'][] = 0;
                $obj['JIAIMP']['label'][] = 'JIAIMP';
                $obj['JIAIMP']['barClass'][] = 'rgba(55, 160, 225, 0.7)';
            }

            if ($foundTacapp) {
                $obj['TACAPP']['totalCost'][] = $tacappCount;
                $obj['TACAPP']['barClass'][] = $tacappCount > $maxAmount ? '#D80000' : 'rgb(0,191,255)';
                $obj['TACAPP']['label'][] = 'TACAPP';
            } else {
                $obj['TACAPP']['totalCost'][] = 0;
                $obj['TACAPP']['label'][] = 'TACAPP';
                $obj['TACAPP']['barClass'][] = 'rgb(0,191,255)';
            }

            if ($foundJIAMET) {
                $obj['JIAMET']['totalCost'][] = $JIAMETCount;
                $obj['JIAMET']['barClass'][] = $JIAMETCount > $maxAmount ? '#D80000' : 'rgb(27,85,131)';
                $obj['JIAMET']['label'][] = 'JIAMET';
            } else {
                $obj['JIAMET']['totalCost'][] = 0;
                $obj['JIAMET']['label'][] = 'JIAMET';
                $obj['JIAMET']['barClass'][] = 'rgb(27,85,131)';
            }

            $month = strtotime("+1 month", $month);
        }


        $ob = array(
            "overall" => $obj
        );

        return $ob;
    }

    public function ReadWeekly($data, $dateFrom, $dateTo, $typeOfView = 'Weekly')
    {

        $obj = array();
        $maxAmount = 1000000;

        if ($data) {
            $vendorSelected = explode(',', $data);;
            $vendorSelectedString = "'" . implode("','", $vendorSelected) . "'";
        } else {
            $vendorSelected = array(
                'JIAMET',
                'TACAPP',
                'JIAIMP'
            );
            $vendorSelectedString = "'" . implode("','", $vendorSelected) . "'";
        }

        $dTo = date("Y-m-d", strtotime("+6 week"));
        //$weekStartDate = date("Y-m-d", strtotime('monday last week', strtotime($this->nowDate1)));
        //$weekEndDate = date("Y-m-d", strtotime('sunday last week', strtotime($dTo)));
        $weekStartDate = $dateFrom;
        $weekEndDate = $dateTo;


        $mainQry = "
				select sum(qtyOrdered) qtyOrdered
					, sum(cost * qtyOrdered) fullOrderAmount 
					, po_vend po_vend
					, pod_due_date
				from po_mstr a 
				LEFT JOIN ( 
					SELECT pod_nbr
						, pod_qty_ord qtyOrdered
						, pod_pur_cost cost 
						, pod_due_date pod_due_date
					FROM pod_det 
					WHERE pod_domain = 'EYE' 
				) b ON a.po_nbr = b.pod_nbr 
				where po_vend IN ($vendorSelectedString)
					AND po_domain = 'EYE'   
					AND pod_due_date between :dateFrom and :dateTo 
				GROUP BY po_vend, pod_due_date
				with (noLock) 		
			";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $weekStartDate, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $weekEndDate, PDO::PARAM_STR);
        $query->execute();
        $graphChart = $query->fetchAll(PDO::FETCH_ASSOC);


        $month = strtotime($weekStartDate);
        $end = strtotime($weekEndDate);

        function getStartAndEndDate($week, $year)
        {
            $dto = new DateTime();
            $dto->setISODate($year, $week);
            $ret['week_start'] = $dto->format('m/d/y');
            $dto->modify('+6 days');
            $ret['week_end'] = $dto->format('m/d/y');
            return $ret;
        }


        $test = array();
        $chart = array();

        $colors = [
            '#7CB9E8',
            '#0066b2',
            '#A3C1AD',
            '#00CED1',
            '#008E97',
            '#0071c5',
            '#72A0C1',
        ];

        while ($month <= $end) {
            $w = date('W', $month);
            $y = date('Y', $month);
            $m = date('F', $month);

            if ($typeOfView == 'Weekly') {
                $obj['label'][] = $w . '-' . $y;
                $labelCheck = $w . '-' . $y;
                $ee = "W";
            } else {
                $obj['label'][] = $m . '-' . $y;
                $labelCheck = $m . '-' . $y;
                $ee = "F";
            }

            foreach ($vendorSelected as $vendorSelectedrow) {

                $test['test111'][$vendorSelectedrow] = 0;
                $test['isFound'][$vendorSelectedrow] = false;

                $test['test'][$vendorSelectedrow] = array();
                $test['count'][$vendorSelectedrow] = 0;
                foreach ($graphChart as $row) {
                    $formatedDate = date($ee, strtotime($row['POD_DUE_DATE'])) . '-' . date('Y', strtotime($row['POD_DUE_DATE']));

                    if ($labelCheck == $formatedDate && $row['PO_VEND'] == $vendorSelectedrow) {
                        $test['test111'][$vendorSelectedrow] += $row['FULLORDERAMOUNT'];
                        $test['isFound'][$vendorSelectedrow] = true;
                    }
                }
            }

            $count = 0;
            foreach ($vendorSelected as $vendorSelectedrow) {
                $chart[$vendorSelectedrow]['totalCost'][] = $test['test111'][$vendorSelectedrow];
                $chart[$vendorSelectedrow]['label'][] = $vendorSelectedrow;
                $chart[$vendorSelectedrow]['backgroundColor'][] = $test['test111'][$vendorSelectedrow] > $maxAmount ? '#D80000' : $colors[$count];
                $count++;
            }

            if ($typeOfView == 'Weekly') {
                $month = strtotime("+1 week", $month);
            } else {
                $month = strtotime("+1 month", $month);
            }


            // if ($typeOfView == 'Monthly') {
            //     $chart['borderLine']['totalCost'][] = $maxAmount;
            //     $chart['borderLine']['label'][] = 'Border line';
            //     $chart['borderLine']['backgroundColor'][] = 'red';
            // }
        }


        return array(
            "obj" => $obj,
            "chart" => $chart,
            "test" => $vendorSelectedString, "vendors" => $this->getVendors(),
            "results" => $this->ReadDetailsWeekly($weekStartDate, $weekEndDate, $vendorSelectedString, $typeOfView)
        );
    }

    public function purchaseOrderLoadDate()
    {

        function getStartAndEndDate($week, $year)
        {
            $dto = new DateTime();
            $dto->setISODate($year, $week);
            $ret['week_start'] = $dto->format('Y-m-d');
            $dto->modify('+6 days');
            $ret['week_end'] = $dto->format('Y-m-d');
            return $ret;
        }

        $mainQry = "
                     select cast(sum(pod_qty_ord*pod_pur_cost) as numeric(36,2))  total_cost
                        , week(pod_due_date-19) week
                        , year(pod_due_date-19) year
                     from po_mstr a 
                     LEFT JOIN ( 
                            SELECT pod_nbr
                                   , pod_pur_cost 
                                   , pod_part
                                   , pod_qty_ord
                                   , pod_status
                                   , pod_due_date
                            FROM pod_det 
                            WHERE pod_domain = 'EYE' 
                     ) b ON a.po_nbr = b.pod_nbr 
                     where po_vend IN ('JIAMET', 'JIAIMP', 'JIAIMP')
                            AND po_domain = 'EYE'
                            AND DAYOFWEEK(pod_due_date) = 6
                     group by week(pod_due_date-19), year(pod_due_date-19)
                     ORDER BY pod_due_date-19 ASC
                     with (noLock) 				
              ";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $obj = [];
        foreach ($results as &$row) {
            $row['TOTAL_COST_CONV'] = '$' . number_format($row['TOTAL_COST'], 2);

            $d = date_parse_from_format('Y-m-d', getStartAndEndDate($row['WEEK'], $row['YEAR'])['week_start']);
            $row['month'] = $d["month"];

            $obj['totalCost'][] = $row['TOTAL_COST'];
            $obj['label'][] = $row['WEEK'] . '-' . $row['YEAR'];
            $row['weekRange'] = getStartAndEndDate($row['WEEK'], $row['YEAR'])['week_start'] . ' - ' . getStartAndEndDate($row['WEEK'], $row['YEAR'])['week_end'];
        }

        return array("results" => $results, "chart" => $obj);
    }


    public function getVendors()
    {
        $mainQry = "
            select  po_vend from po_mstr where po_domain = 'EYE' group by po_vend 
            ORDER BY po_vend ASC
            with (noLock) 				
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":supplierName", $supplierName, PDO::PARAM_STR);
        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }


    public function tacapp($supplierName)
    {
        $supplierName = !$supplierName ? 'tacapp' : $supplierName;

        function getStartAndEndDate($week, $year)
        {
            $dto = new DateTime();
            $dto->setISODate($year, $week);
            $ret['week_start'] = $dto->format('Y-m-d');
            $dto->modify('+6 days');
            $ret['week_end'] = $dto->format('Y-m-d');
            return $ret;
        }

        $mainQry = "
                     select cast(sum(pod_qty_ord*pod_pur_cost) as numeric(36,2))  total_cost
                        , week(pod_due_date) week
                        , year(pod_due_date) year
                     from po_mstr a 
                     LEFT JOIN ( 
                            SELECT pod_nbr
                                   , pod_pur_cost 
                                   , pod_part
                                   , pod_qty_ord
                                   , pod_status
                                   , pod_due_date
                            FROM pod_det 
                            WHERE pod_domain = 'EYE' 
                     ) b ON a.po_nbr = b.pod_nbr 
                     where po_vend = :supplierName
                            AND po_domain = 'EYE'
                            and pod_qty_ord IS NOT NULL
                            and week(pod_due_date) IS NOT NULL
                     group by week(pod_due_date), year(pod_due_date)
                     ORDER BY pod_due_date ASC
                     with (noLock) 				
              ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":supplierName", $supplierName, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $obj = [];
        foreach ($results as &$row) {
            $row['TOTAL_COST_CONV'] = '$' . number_format($row['TOTAL_COST'], 2);

            $d = date_parse_from_format('Y-m-d', getStartAndEndDate($row['WEEK'], $row['YEAR'])['week_start']);
            $row['month'] = $d["month"];

            $obj['totalCost'][] = $row['TOTAL_COST'];
            $obj['label'][] = $row['WEEK'] . '-' . $row['YEAR'];

            $row['weekRange'] = getStartAndEndDate($row['WEEK'], $row['YEAR'])['week_start'] . ' - ' . getStartAndEndDate($row['WEEK'], $row['YEAR'])['week_end'];
        }

        return array("results" => $results, "chart" => $obj, "vendors" => $this->getVendors());
    }



    public function ReadDetailsWeekly($dataFrom, $dateTo, $in, $typeOfView)
    {

        /* $monthNum  = $data['week'];
			$dateObj   = DateTime::createFromFormat('!m', $monthNum);
			$monthName = $dateObj->format('F'); // March
		*/

        $mainQry = "
				SELECT pod_nbr pod_nbr
					, pod_pur_cost pod_pur_cost
					, pod_part pod_part
					, pod_qty_ord pod_qty_ord
					, pod_status pod_status
					, pod_qty_ord*pod_pur_cost cost
					, pod_qty_rcvd pod_qty_rcvd
					, po_ord_date po_ord_date
					, po_vend po_vend
					, pod_due_date pod_due_date
				FROM pod_det 
				JOIN po_mstr a ON a.po_nbr = pod_det.pod_nbr AND po_domain = 'EYE' and po_vend IN ($in) 
				WHERE pod_domain = 'EYE' 
				AND ( pod_due_date between :dateFrom AND :dateTo)
                and pod_qty_ord IS NOT NULL
                and week(pod_due_date) IS NOT NULL
                order by pod_due_date ASC
				with (noLock)								
			";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $dataFrom, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $results1 = array();
        $totalCost = 0;
        foreach ($results as $row) {
            $totalCost = $row['COST'] + $totalCost;
            $row['WEEK'] = date("W", strtotime($row['POD_DUE_DATE']));
            $row['YEAR'] = date("Y", strtotime($row['POD_DUE_DATE']));
            $row['MONTH'] = date("F", strtotime($row['POD_DUE_DATE']));

            if ($typeOfView == 'Weekly') {
                $row['weekRange'] = getStartAndEndDate($row['WEEK'], $row['YEAR'])['week_start'] . '-' . getStartAndEndDate($row['WEEK'], $row['YEAR'])['week_end'];
            } else {
                $row['weekRange'] = $row['MONTH'] . '-' . $row['YEAR'];
            }

            $results1[] = $row;
        }

        $obj = array(
            "results" => $results1, "totalCost" => $totalCost, "dateRange" => $dataFrom . ' - ' . $dateTo
        );

        return $obj;
    }
}
