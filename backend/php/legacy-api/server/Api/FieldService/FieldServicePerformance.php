<?php

namespace EyefiDb\Api\FieldService;

use PDO;
use PDOException;

class FieldServicePerformance
{

	protected $db;

	public function __construct($db)
	{

		$this->db = $db;
		$this->nowDate = date("Y-m-d H:i:s", time());
	}

	public function getByEvent($dateFrom, $dateTo)
	{

		$mainQry = "
			SELECT event_name
				, truncate(sum(FORMAT(d.mins, 2))/60,0) total_mins
				, COUNT(*) hits
			FROM eyefidb.fs_scheduler a 

			JOIN eyefidb.fs_workOrder b 
				ON a.id = b.fs_scheduler_id 
					and dateSubmitted IS NOT NULL

			left join (
				select sum(mins) mins
					, workOrderId
					, case when isTravel = 1 THEN 'Travel' when event_name LIKE '%wait' THEN 'Waiting' ELSE event_name END event_name
				FROM eyefidb.fs_labor_view
				GROUP BY workOrderId
					, case when isTravel = 1 THEN 'Travel' when event_name LIKE '%wait' THEN 'Waiting' ELSE event_name END
			) d ON d.workOrderId = b.id
			WHERE d.event_name != ''
				AND date(request_date) between :dateFrom AND :dateTo
				AND a.active = 1
			GROUP BY d.event_name
		";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		$o = array();
		foreach ($result as $row) {
			$o['graph']['label'][] = $row['event_name'];
			$o['graph']['value'][] = $row['total_mins'];
			$o[] = $row;
		}
		return $o;
	}

	public function jobCompletionRate($dateFrom, $dateTo)
	{
		$mainQry = "
			SELECT COUNT(*) value
				, case when workCompleted = 'Yes' THEN 'Completed' when workCompleted = 'No' THEN 'Unfinished' ELSE  workCompleted END label
			FROM fs_work_order_summary_view
			where date(request_date) between :dateFrom AND :dateTo
			GROUP BY case when workCompleted = 'Yes' THEN 'Completed' when workCompleted = 'No' THEN 'Unfinished' ELSE  workCompleted END
		";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		$o = array();
		foreach ($result as $row) {
			$o['graph']['label'][] = $row['label'];
			$o['graph']['value'][] = $row['value'];
			$o[] = $row;
		}
		return $o;
	}

	public function outOfStateJobs($dateFrom, $dateTo)
	{
		$mainQry = "
			SELECT COUNT(*) value, 
				case 
					when plus_minus > 50 THEN 'MINIMALLY EFFECTIVE' 
					when plus_minus > 30 THEN 'DEVELOPING'  
					when plus_minus > 5 THEN 'PROFICIENT'
					ELSE 'SKILLFUL'
				END label,
				case 
					when plus_minus > 50 THEN '4' 
					when plus_minus > 30 THEN '3'
					when plus_minus > 5 THEN '2'
					ELSE '1' 
				END label_seq
			FROM ( 
			select request_date,  TRUNCATE(b.avg_mins,2) avg_mins
					, TRUNCATE(((service_mins - avg_mins ) / avg_mins) * 100,2) plus_minus
				FROM fs_work_order_summary_view a
				INNER JOIN fs_platform_avg_view b ON b.platform = a.platform and b.service_type = a.service_type 
			) a
			
			where date(request_date) between :dateFrom AND :dateTo
				GROUP BY case 
				when plus_minus > 50 THEN 'MINIMALLY EFFECTIVE' 
				when plus_minus > 30 THEN 'DEVELOPING'  
				when plus_minus > 5 THEN 'PROFICIENT'
				ELSE 'SKILLFUL' END , 
				case 
				when plus_minus > 50 THEN '4' 
				when plus_minus > 30 THEN '3'
				when plus_minus > 5 THEN '2'
				ELSE '1' END
				
			order by case 
			when plus_minus > 50 THEN '4' 
			when plus_minus > 30 THEN '3'
			when plus_minus > 5 THEN '2'
			ELSE '1' END DESC
		
		";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		$o = array();
		foreach ($result as $row) {
			$o['graph']['label'][] = $row['label'];
			$o['graph']['value'][] = $row['value'];
			$o[] = $row;
		}
		return $o;
	}

	public function getProductivityDetails($dateFrom, $dateTo)
	{
		$mainQry = "
			SELECT a.*
				, TRUNCATE(b.avg_mins,2) avg_mins
				, TRUNCATE(((service_mins - avg_mins ) / avg_mins) * 100,2) plus_minus
			FROM fs_work_order_summary_view a
			left join (
				SELECT a.platform, b.avg_mins, b.total_mins, IFNULL(jobs,0) jobs, b.service_type
				FROM fs_platforms a
				LEFT JOIN fs_platform_avg_view b ON b.platform = a.platform
			) b ON b.platform = a.platform and b.service_type = a.service_type  
			WHERE date(request_date) between :dateFrom AND :dateTo
			ORDER BY request_date DESC
		";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);
		return $result;
	}

	
	public function getEveryDetailsExpense($weekStartDate, $weekEndDate)
    {


        $mainQry = "

		SELECT name out_of_state, SUM(cost) travel_mins, MONTH(created_date) month, YEAR(created_date) year, date(created_date) request_date
FROM fs_workOrderTrip
WHERE  date(created_date) between :dateFrom and :dateTo and created_date IS NOT NULL
GROUP BY name, MONTH(created_date),YEAR(created_date), date(created_date)


			
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $weekStartDate, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $weekEndDate, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

	public function getDynamicDataExpense($weekStartDate = '2022-01-01', $weekEndDate = '2022-08-31', $typeOfView = 'Monthly', $displayCustomers = "Show Customers")
    {

        $results = $this->getEveryDetailsExpense($weekStartDate, $weekEndDate);

        $month = strtotime($weekStartDate);
        $end = strtotime($weekEndDate);


        $test = array();
        $chart = array();
        $chart1 = array();

        $goal = 200000.00;

        if ($displayCustomers == "Show Customers") {
            $customers = [];
            foreach ($results as $row) {
                $customers[] = $row['out_of_state'];
            }

            $colors = ['#85144b', '#001f3f', '#3D9970', '#39CCCC', '#FF851B', '#7FDBFF'];

            $uniqueCustomers = array_values(array_unique($customers, SORT_REGULAR));
        }

        while ($month <= $end) {
            $w = date('W', $month);
            $y = date('Y', $month);
            $m = date('M', $month);
            $d = date('m/d/y', $month);

            $yearQuarterSet = date("n", $month);
            $yearQuarter = ceil($yearQuarterSet / 3);

            if ($typeOfView == 'Weekly') {
                $obj['label'][] = $w . '-' . $y;
                $labelCheck = $w . '-' . $y;
                $ee = "W";
                $key = $w;
                $goal1 = $goal * 5;
            } else if ($typeOfView == 'Monthly') {
                $obj['label'][] = $m . '-' . $y;
                $labelCheck = $m . '-' . $y;
                $ee = "M";
                $key = $m;
                $goal1 = $goal * 31;
            } else if ($typeOfView == 'Annually') {
                $obj['label'][] = $y;
                $labelCheck =  $y;
                $ee = "Y";
                $key = $y;
                $goal1 = $goal * 365;
            } else if ($typeOfView == 'Daily') {
                $obj['label'][] = $d;
                $labelCheck =  $d . '-' . $y;
                $ee = "m/d/y";
                $key = $d;
                $goal1 = $goal;
            } else if ($typeOfView == 'Quarterly') {
                $obj['label'][] = "Qtr:" . $yearQuarter . '-' . $y;
                $labelCheck =  $yearQuarter . '-' . $y;
                $ee = "m/d/y";
                $key = $yearQuarter . '-' . $y;
                $goal1 = $goal * 90;
            }


            $calculateGoal = $goal1;

            $test[$key] = 0;


                foreach ($uniqueCustomers as $vendorSelectedrow) {

                    $test['test111'][$vendorSelectedrow] = 0;
                    $test['isFound'][$vendorSelectedrow] = false;

                    $test['test'][$vendorSelectedrow] = array();
                    $test['count'][$vendorSelectedrow] = 0;
                    foreach ($results as $row) {

                        if ($typeOfView == 'Quarterly') {
                            $yearQuarterSet1 = date("n", strtotime($row['request_date']));
                            $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row['request_date']));
                        } else if ($typeOfView == 'Annually') {
                            $formatedDate = date('Y', strtotime($row['request_date']));
                        } else {
                            $formatedDate = date($ee, strtotime($row['request_date'])) . '-' . date('Y', strtotime($row['request_date']));
                        }

                        if ($labelCheck == $formatedDate && $row['out_of_state'] == $vendorSelectedrow) {
                            $test[$key] += $row['travel_mins'];
                        }

                        if ($labelCheck == $formatedDate && $row['out_of_state'] == $vendorSelectedrow) {
                            $test['test111'][$vendorSelectedrow] += $row['travel_mins'];
                            $test['isFound'][$vendorSelectedrow] = true;
                        }
                    }
                }

                $color_index = 0;
                foreach ($uniqueCustomers as $vendorSelectedrow) {
                    $chart1[$vendorSelectedrow]['dataset'][] = $test['test111'][$vendorSelectedrow];
                    $chart1[$vendorSelectedrow]['label'] = $vendorSelectedrow;
					
                    $color_index++;
                }
                //$chart1['total']['label'] = "Total";

            




            if ($typeOfView == 'Weekly') {
                $month = strtotime("+1 week", $month);
            } else if ($typeOfView == 'Monthly') {
                $month = strtotime("+1 month", $month);
            } else if ($typeOfView == 'Annually') {
                $month = strtotime("+1 year", $month);
            } else if ($typeOfView == 'Daily') {
                $month = strtotime("+1 day", $month);
            } else if ($typeOfView == 'Quarterly') {
                $month = strtotime("+3 month", $month);
            }
        }

        return array(
            "obj" => $obj,
            "chart" => $chart,
            "chartnew" => $chart1,
        );
    }

	public function getEveryDetails($weekStartDate, $weekEndDate)
    {


        $mainQry = "

		select MONTH(request_date) month, YEAR(request_date) year, request_date, SUM(travel_mins) travel_mins
			, case when out_of_state = 'Yes' THEN 'Travel Out Of State' when out_of_state = 'No' THEN 'Local Travel' END out_of_state
            from eyefidb.fs_work_order_summary_view
			WHERE  request_date between :dateFrom and :dateTo 
            GROUP BY  MONTH(request_date), case when out_of_state = 'Yes' THEN 'Travel Out Of State' when out_of_state = 'No' THEN 'Local Travel' END, YEAR(request_date), request_date
            ORDER BY YEAR(request_date) DESC, MONTH(request_date) ASC
			
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $weekStartDate, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $weekEndDate, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

	public function getDynamicData($weekStartDate = '2019-01-01', $weekEndDate = '2022-08-31', $typeOfView = 'Monthly', $displayCustomers = "Show Customers")
    {

        $results = $this->getEveryDetails($weekStartDate, $weekEndDate);

        $month = strtotime($weekStartDate);
        $end = strtotime($weekEndDate);


        $test = array();
        $chart = array();
        $chart1 = array();

        $goal = 200000.00;

        if ($displayCustomers == "Show Customers") {
            $customers = [];
            foreach ($results as $row) {
                $customers[] = $row['out_of_state'];
            }

            $colors = ['#85144b', '#001f3f', '#3D9970', '#39CCCC', '#FF851B', '#7FDBFF'];

            $uniqueCustomers = array_values(array_unique($customers, SORT_REGULAR));
        }

        while ($month <= $end) {
            $w = date('W', $month);
            $y = date('Y', $month);
            $m = date('M', $month);
            $d = date('m/d/y', $month);

            $yearQuarterSet = date("n", $month);
            $yearQuarter = ceil($yearQuarterSet / 3);

            if ($typeOfView == 'Weekly') {
                $obj['label'][] = $w . '-' . $y;
                $labelCheck = $w . '-' . $y;
                $ee = "W";
                $key = $w;
                $goal1 = $goal * 5;
            } else if ($typeOfView == 'Monthly') {
                $obj['label'][] = $m . '-' . $y;
                $labelCheck = $m . '-' . $y;
                $ee = "M";
                $key = $m;
                $goal1 = $goal * 31;
            } else if ($typeOfView == 'Annually') {
                $obj['label'][] = $y;
                $labelCheck =  $y;
                $ee = "Y";
                $key = $y;
                $goal1 = $goal * 365;
            } else if ($typeOfView == 'Daily') {
                $obj['label'][] = $d;
                $labelCheck =  $d . '-' . $y;
                $ee = "m/d/y";
                $key = $d;
                $goal1 = $goal;
            } else if ($typeOfView == 'Quarterly') {
                $obj['label'][] = "Qtr:" . $yearQuarter . '-' . $y;
                $labelCheck =  $yearQuarter . '-' . $y;
                $ee = "m/d/y";
                $key = $yearQuarter . '-' . $y;
                $goal1 = $goal * 90;
            }


            $calculateGoal = $goal1;

            $test[$key] = 0;


                foreach ($uniqueCustomers as $vendorSelectedrow) {

                    $test['test111'][$vendorSelectedrow] = 0;
                    $test['isFound'][$vendorSelectedrow] = false;

                    $test['test'][$vendorSelectedrow] = array();
                    $test['count'][$vendorSelectedrow] = 0;
                    foreach ($results as $row) {

                        if ($typeOfView == 'Quarterly') {
                            $yearQuarterSet1 = date("n", strtotime($row['request_date']));
                            $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row['request_date']));
                        } else if ($typeOfView == 'Annually') {
                            $formatedDate = date('Y', strtotime($row['request_date']));
                        } else {
                            $formatedDate = date($ee, strtotime($row['request_date'])) . '-' . date('Y', strtotime($row['request_date']));
                        }

                        if ($labelCheck == $formatedDate && $row['out_of_state'] == $vendorSelectedrow) {
                            $test[$key] += $row['travel_mins'];
                        }

                        if ($labelCheck == $formatedDate && $row['out_of_state'] == $vendorSelectedrow) {
                            $test['test111'][$vendorSelectedrow] += $row['travel_mins'];
                            $test['isFound'][$vendorSelectedrow] = true;
                        }
                    }
                }

                $color_index = 0;
                foreach ($uniqueCustomers as $vendorSelectedrow) {
                    $chart1[$vendorSelectedrow]['dataset'][] = $test['test111'][$vendorSelectedrow];
                    $chart1[$vendorSelectedrow]['label'] = $vendorSelectedrow;
                    $chart1[$vendorSelectedrow]['backgroundColor'] = $colors[$color_index];
                    $color_index++;
                }
                //$chart1['total']['label'] = "Total";

            




            if ($typeOfView == 'Weekly') {
                $month = strtotime("+1 week", $month);
            } else if ($typeOfView == 'Monthly') {
                $month = strtotime("+1 month", $month);
            } else if ($typeOfView == 'Annually') {
                $month = strtotime("+1 year", $month);
            } else if ($typeOfView == 'Daily') {
                $month = strtotime("+1 day", $month);
            } else if ($typeOfView == 'Quarterly') {
                $month = strtotime("+3 month", $month);
            }
        }

        return array(
            "obj" => $obj,
            "chart" => $chart,
            "chartnew" => $chart1,
        );
    }

	public function ReadAll($dateFrom, $dateTo)
	{
		return array(
			// "getDynamicDataExpense" => $this->getDynamicDataExpense(), 
			// "getDynamicData" => $this->getDynamicData(), 
			// "jobCompletionRate" => $this->jobCompletionRate($dateFrom, $dateTo), 
			// "outOfStateJobs" => $this->outOfStateJobs($dateFrom, $dateTo), 
			"getByEvent" => $this->getByEvent($dateFrom, $dateTo), 
			"getProductivityDetails" => $this->getProductivityDetails($dateFrom, $dateTo)
		);
	}
}
