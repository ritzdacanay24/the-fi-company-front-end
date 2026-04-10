<?php

namespace EyefiDb\Api\FieldService;

use PDO;
use PDOException;

class FieldServiceOverall
{

	protected $db;
	public $dateFrom;
	public $dateTo;
	public $serviceJobDateFrom;
	public $serviceJobDateTo;

	public function __construct($db)
	{

		$this->db = $db;
		$this->statusSelection = 'All';
		$this->serviceSelection = 'All';
	

		$this->startWeek = date('Y-m-d', strtotime("sunday -1 week"));
		$this->endWeek = date('Y-m-d', strtotime("sunday 0 week"));

		$this->startMonth = date("Y-m-d", strtotime("first day of this month"));
		$this->endMonth = date("Y-m-d", strtotime("last day of this month"));

	}

	public function getStatusSelections()
	{
		$mainQry = "
			select value
			from eyefidb.fs_scheduler_settings a
			where type = 'Status' 
				AND typeOfStatus = 'Work Order Related'
		";

		$query = $this->db->prepare($mainQry);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		array_push($results, array("value" => 'All'));
		return $results;
	}

	public function getServiceSelections()
	{
		$mainQry = "
			select value
			from eyefidb.fs_scheduler_settings a
			where type = 'Service Type'
		";

		$query = $this->db->prepare($mainQry);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		array_push($results, array("value" => 'All'));
		return $results;
	}

	public function viewJobsInState($state)
	{
		$qry = "
			SELECT a.Location
				, a.ServiceType
				, a.Status
				, a.RequestDate
				, a.StartTime
				, a.StartTime
				, b.id workOrderId
				, b.dateSubmitted
				, b.workCompleted
				, b.workCompletedComment
				, CASE WHEN a.LeadInstaller != '' OR a.Installer1 != '' OR a.Installer2 != '' THEN CONCAT_WS(', ', a.LeadInstaller, a.Installer1, a.Installer2) END installers
			FROM eyefidb.fs_scheduler a
			LEFT JOIN (
				SELECT fs_scheduler_id
					, id
					, dateSubmitted
					, workCompleted
					, workCompletedComment
				FROM eyefidb.fs_workOrder
				
			) b ON b.fs_scheduler_id = a.id
			WHERE a.ST = :state
				AND a.RequestDate between :dateFrom AND :dateTo
				AND a.active = 1
			
        ";

		if ($this->statusSelection != 'All') {
			$qry .= " AND a.Status = '" . $this->statusSelection . "'";
		}

		if ($this->serviceSelection != 'All') {
			$qry .= " AND a.ServiceType = '" . $this->serviceSelection . "'";
		}

		$qry .= ' ORDER BY a.RequestDate ASC
		, a.StartTime ASC ';

		$query = $this->db->prepare($qry);
		$query->bindParam(':state', $state, PDO::PARAM_STR);
		$query->bindParam(':dateFrom', $this->dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $this->dateTo, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}

	public function getCurrent()
	{
		$qry = "
			select sum(CASE WHEN Status = 'Confirmed' THEN 1 ELSE 0 END) openJobs, 
				sum(CASE WHEN Status = 'Confirmed' AND (outOfState = 'false' OR outOfState IS NULL) THEN 1 ELSE 0 END) openInStateJobs,
				sum(CASE WHEN Status = 'Confirmed' AND outOfState = 'true' THEN 1 ELSE 0 END) openOutOfStateJobs,
				sum(CASE WHEN Status IN ('Completed', 'Completed - NB') THEN 1 ELSE 0 END) jobsCompleted,
				sum(CASE WHEN Status NOT IN ('Completed', 'Completed - NB') THEN 1 ELSE 0 END) jobsOtherThanCompleteStatus,
				count(id) totalJobs,
				sum(CASE WHEN AccStatus IN ('INVOICED') THEN TRUNCATE(Invoice,2) ELSE 0 END) totalInvoiced,
				sum(CASE WHEN cancelledType IN ('Availability') AND status = 'Cancelled' THEN 1 ELSE 0 END) cancelledDueToAvailabilty
			from eyefidb.fs_scheduler a
			where RequestDate between :dateFrom AND :dateTo
			AND a.active = 1
        ";

		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $this->startMonth, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $this->endMonth, PDO::PARAM_STR);
		$query->execute();
		return $query->fetch();
	}

	public function getCurrentWeek()
	{
		$qry = "
			select sum(CASE WHEN Status = 'Confirmed' THEN 1 ELSE 0 END) openJobs, 
				sum(CASE WHEN Status = 'Confirmed' AND (outOfState = 'false' OR outOfState IS NULL) THEN 1 ELSE 0 END) openInStateJobs,
				sum(CASE WHEN Status = 'Confirmed' AND outOfState = 'true' THEN 1 ELSE 0 END) openOutOfStateJobs,
				sum(CASE WHEN Status IN ('Completed', 'Completed - NB') THEN 1 ELSE 0 END) jobsCompleted,
				sum(CASE WHEN Status NOT IN ('Completed', 'Completed - NB') THEN 1 ELSE 0 END) jobsOtherThanCompleteStatus,
				count(id) totalJobs,
				sum(TRUNCATE(Invoice,2)) totalInvoiced,
				sum(CASE WHEN cancelledType IN ('Availability') AND status = 'Cancelled' THEN 1 ELSE 0 END) cancelledDueToAvailabilty
			from eyefidb.fs_scheduler a
			where RequestDate between :dateFrom AND :dateTo
			AND a.active = 1
        ";

		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $this->startWeek, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $this->endWeek, PDO::PARAM_STR);
		$query->execute();
		return $query->fetch();
	}

	public function getStatus()
	{
		$mainQry = "
			select Status
				, count(id) hits
			from eyefidb.fs_scheduler a
			where RequestDate between :dateFrom AND :dateTo
			AND a.active = 1
			group by Status
		";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':dateFrom', $this->dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $this->dateTo, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		$o = array();

		$colors = array(
			"4169E1", "5F9EA0", "ADD8E6", "87CEEB", "40E0D0", "4682B4", "B0E0E6", "00CED1", "48D1CC", "40E0D0"
		);

		$index = 0;
		foreach ($result as $row) {

			$o['graph']['label'][] = $row['Status'];
			$o['graph']['value'][] = $row['hits'];
			$o['graph']['color'][] = "#" . $colors[$index];
			$index++;
			$o[] = $row;
		}

		return $o;
	}


	public function getServiceTypes()
	{
		$mainQry = "
			SELECT ServiceType
				, count(*) hits
			FROM eyefidb.fs_scheduler a
			WHERE RequestDate between :dateFrom AND :dateTo
			AND a.active = 1
			and a.ServiceType != ''
			GROUP BY ServiceType
		";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':dateFrom', $this->dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $this->dateTo, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		$o = array();

		$colors = array(
			"4169E1", "5F9EA0", "ADD8E6", "87CEEB", "40E0D0", "4682B4", "B0E0E6", "00CED1", "48D1CC", "40E0D0"
		);

		$index = 0;
		foreach ($result as $row) {

			$o['graph']['label'][] = $row['ServiceType'];
			$o['graph']['value'][] = $row['hits'];
			//$o['graph']['color'][] = "#" . $colors[$index];
			$index++;
			$o[] = $row;
		}

		return $o;
	}

	public function getAllScoreCards()
	{

		$qry = "
			select 
				YEAR(RequestDate) year, 
				WEEK(RequestDate) week, 
				sum(CASE WHEN LeadInstaller IN ('Vegas Signs', 'CNC Signs', 'Metro Detroit Signs', 'Everything Tradeshows') THEN 1 ELSE 0 END) Subs,
				sum(CASE WHEN Customer = 'SG' THEN 1 ELSE 0 END) SG, 
				sum(CASE WHEN Customer = 'Konami' THEN 1 ELSE 0 END) Konami, 
				sum(CASE WHEN Customer = 'IGT' THEN 1 ELSE 0 END) IGT, 
				sum(CASE WHEN Customer = 'Everi' THEN 1 ELSE 0 END) Everi, 
				sum(CASE WHEN Customer = 'AGS' THEN 1 ELSE 0 END) AGS, 
				sum(CASE WHEN (outOfState = 'false' OR outOfState IS NULL) THEN 1 ELSE 0 END) LocalJobs, 
				sum(CASE WHEN outOfState = 'true' THEN 1 ELSE 0 END) OutOfStateJobs,
				sum(CASE WHEN ServiceType = 'Removal' THEN 1 ELSE 0 END) Removals,
				sum(CASE WHEN ServiceType = 'Repair' THEN 1 ELSE 0 END) Repairs
			from eyefidb.fs_scheduler a
			where RequestDate between :dateFrom AND :dateTo
				AND Status IN ('Completed', 'Completed - NB')
				AND a.active = 1
			group by YEAR(RequestDate), WEEK(RequestDate)
			ORDER BY YEAR(RequestDate) DESC, WEEK(RequestDate) DESC
        ";
		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $this->dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $this->dateTo, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}
	public function getWeeklyScoreCard()
	{
		$qry = "
			SELECT a.createdBy 
				, a.qir
				, a.issueComment
				, a.casinoName 
				, a.platformtype 
				, a.fieldServiceSchedulerId
				, concat(b.first, ' ', b.last) createdByFullName
			FROM eyefidb.qa_capaRequest a
			LEFT join db.users b ON a.createdBy = b.id
			where a.fieldServiceSchedulerId IS NOT NULL
				AND a.active = 1
			ORDER BY a.id DESC
        ";

		$query = $this->db->prepare($qry);
		// $query->bindParam(':dateFrom', $this->dateFrom, PDO::PARAM_STR);
		// $query->bindParam(':dateTo', $this->dateTo, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}

	public function getTotalSubPercentage()
	{
		$qry = "
			select MONTHNAME(RequestDate) month
				, DATE_FORMAT(RequestDate, '%Y') year
				, MONTH(RequestDate) monthNumber
				, count(CASE WHEN Status IN ('Completed', 'Completed - NB') AND (outOfState = 'false' OR outOfState IS NULL) THEN 1 END) outOfStateCompleted
				, count(CASE WHEN Status IN ('Completed', 'Completed - NB') AND (outOfState = 'true') THEN 1 END) inStateCompleted
				, sum(CASE WHEN LeadInstaller IN ('Vegas Signs', 'CNC Signs', 'Metro Detroit Signs', 'Everything Tradeshows')  AND Status IN ('Completed', 'Completed - NB') THEN 1 ELSE 0 END) Subs
				, ( sum(CASE WHEN LeadInstaller IN ('Vegas Signs', 'CNC Signs', 'Metro Detroit Signs', 'Everything Tradeshows') AND Status IN ('Completed', 'Completed - NB') THEN 1 ELSE 0 END) / count(CASE WHEN Status IN ('Completed', 'Completed - NB') THEN 1 END) ) * 100 totalSubPercentage
			from eyefidb.fs_scheduler a
			WHERE RequestDate between '2019-10-01' AND :dateTo
			AND a.active = 1
			GROUP BY MONTHNAME(RequestDate), DATE_FORMAT(RequestDate, '%Y') , MONTH(RequestDate)
			ORDER BY DATE_FORMAT(RequestDate, '%Y') DESC, MONTH(RequestDate) DESC
        ";

		$query = $this->db->prepare($qry);
		$query->bindParam(':dateTo', $this->dateTo, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}

	public function getByState()
	{

		//#FF851B - work order created 
		//#0074D9 - Confirmed Work Orders 
		//#2ECC40 - Completed Job
		$qry = "
			SELECT a.ST
				, count(*) total
				, MAX(statusColor) color
				
				, sum(CASE WHEN fs_scheduler_id IS NOT NULL THEN 1 ELSE 0 END) currentlyHere
				, sum(CASE WHEN RequestDate between :dateFrom AND :dateTo AND Status = 'Confirmed' THEN 1 ELSE 0 END) totalMonth
				, sum(CASE WHEN RequestDate between :dateFrom AND :dateTo AND Status IN ('Completed', 'C	ompleted - NB') THEN 1 ELSE 0 END) totalJobsCompleted
				, sum(case when b.submitted THEN 1 ELSE 0 END) workOrderSubmitted
			FROM eyefidb.fs_scheduler a			
			LEFT JOIN eyefidb.fs_scheduler_settings b ON b.value = a.ServiceType AND type = 'Service Type'
			LEFT JOIN (
				SELECT fs_scheduler_id
					, date(createdDate)
					, submitted
				FROM eyefidb.fs_workOrder 
			) b ON b.fs_scheduler_id = a. id
			WHERE  a.active = 1
				AND RequestDate between :dateFrom AND :dateTo
        ";

		
		if ($this->statusSelection != 'All') {
			$qry .= " AND a.Status = '$this->statusSelection'";
		}
		
		if ($this->serviceSelection != 'All') {
			$qry .= " AND a.ServiceType = '" . $this->serviceSelection . "'";
		}



		$qry .= ' GROUP BY ST';
		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $this->dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $this->dateTo, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		foreach ($results as &$row) {

			if ($this->serviceSelection == 'All') {
				$row['color'] = '#12214A';
			}

			$row['details'] = $this->viewJobsInState($row['ST']);
		}

		return $results;
	}

	public function getByStateDetails()
	{
		$qry = "
			SELECT ST
				, count(*) total
			FROM eyefidb.fs_scheduler a
			WHERE RequestDate between :dateFrom AND :dateTo
				AND a.active = 1
			
        ";

		if ($this->statusSelection != 'All') {
			$qry .= " AND a.Status = '$this->statusSelection'";
		}
		
		if ($this->serviceSelection != 'All') {
			$qry .= " AND a.ServiceType = '" . $this->serviceSelection . "'";
		}

		$qry .= ' GROUP BY ST ';
		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $this->dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $this->dateTo, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}

	public function getSurveys()
	{
		$qry = "
			SELECT max(id) id
				, fs_workOrder_id
				, question
				, rating
				, comments
				, dateSubmitted
				, createdBy
				, vendorName
				, vendorLeadTechName
				, locationOfService
				, active
				, jobNumber
			FROM eyefidb.customerSatisfactionsSurvey
			group by fs_workOrder_id
				, question
				, rating
				, comments
				, dateSubmitted
				, createdBy
				, vendorName
				, vendorLeadTechName
				, locationOfService
				, active
				, jobNumber
			ORDER BY dateSubmitted DESC, jobNumber DESC
        ";
		$query = $this->db->prepare($qry);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}

	public function getSurveyDetails($jobNumber)
	{
		$qry = "
			SELECT * 
			FROM eyefidb.customerSatisfactionsSurvey
			WHERE jobNumber = :jobNumber
        ";
		$query = $this->db->prepare($qry);
		$query->bindParam(':jobNumber', $jobNumber, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}

	public function getChart()
	{

		$obj = array();

		// $endDate = date("Y-m-d");
		// $startDate = date('Y-m-d', strtotime($endDate. ' -12 months'));

		$endDate = '2022-08-31';
		$startDate = '2022-08-01';

		// $qry = "
		// 	select MONTH(RequestDate) month
		// 		, DATE_FORMAT(RequestDate, '%Y') year
		// 		, sum(CASE WHEN outOfState = 'true' THEN 1 ELSE 0 END) outOfState
		// 		, count(CASE WHEN Status IN ('Completed', 'Completed - NB') AND (outOfState = 'false' OR outOfState IS NULL) THEN 1 END) outOfStateCompleted
		// 		, sum(CASE WHEN outOfState = 'false' OR outOfState IS NULL THEN 1 ELSE 0 END) inState
		// 		, count(CASE WHEN Status IN ('Completed', 'Completed - NB') AND (outOfState = 'true') THEN 1 END) inStateCompleted
		// 		, count(*) total  
		// 		, sum(CASE WHEN AccStatus IN ('INVOICED') THEN TRUNCATE(Invoice,2) ELSE 0 END) sumInvoiced
		// 		, sum(CASE WHEN AccStatus IN ('INVOICED') THEN TRUNCATE(VendorCost,2) ELSE 0 END) sumVendorCost
		// 		, sum(CASE WHEN AccStatus IN ('INVOICED') AND ( outOfState = 'false' OR outOfState IS NULL ) THEN TRUNCATE(Invoice,2) ELSE 0 END) sumInvoicedInState
		// 		, sum(CASE WHEN AccStatus IN ('INVOICED') AND outOfState = 'true' THEN TRUNCATE(Invoice,2) ELSE 0 END) sumInvoicedOutOfState
		// 		, count(CASE WHEN Status IN ('Completed', 'Completed - NB') THEN 1 END) totalCompletedCount
		// 		, count(CASE WHEN Status NOT IN ('Completed', 'Completed - NB') THEN 1 END) totalNotCompletedCount
		// 	from eyefidb.fs_scheduler a
		// 	WHERE RequestDate between :dateFrom AND :dateTo
		// 		AND a.active = 1
		// 	GROUP BY MONTH(RequestDate), DATE_FORMAT(RequestDate, '%Y') 
		// 	ORDER BY DATE_FORMAT(RequestDate, '%Y') DESC, MONTH(RequestDate) DESC
        // ";

		$qry = "

		select a.*,  a.request_date, property.*, d.lat, d.lon, b.*  
        from eyefidb.fs_scheduler a 
        
        
				LEFT JOIN (
					SELECT fs_scheduler_id
						, count(fs_scheduler_id) hits
						, max(dateSubmitted) dateSubmitted
						, max(id) id
						, max(createdDate) createdDate
						, max(userId) created_by
					FROM eyefidb.fs_workOrder
					GROUP BY fs_scheduler_id
				) b ON b.fs_scheduler_id = a.id
                
        
        left join (
            select id, property, city, state, address1, property_phone, zip_code, CONCAT_WS(',', 
                NULLIF(trim(property), ''),
                NULLIF(trim(address1), ''),
                NULLIF(trim(city), ''), 
                NULLIF(trim(state), ''), 
                NULLIF(trim(zip_code), ''),  
                NULLIF(trim(property_phone), '')) full_address
            from eyefidb.fs_property_det
        ) property ON property.id = a.property_id
        
        
        left join fs_property_lat_and_lon d ON d.fs_property_det_id = property.id
        
            LEFT JOIN(
                        SELECT
                            `eyefidb`.`fs_team`.`fs_det_id` AS `fs_det_id`,
                            GROUP_CONCAT(
                                `eyefidb`.`fs_team`.`user` SEPARATOR ', '
                            ) AS `team`,
                            COUNT(0) AS `total_techs`
                        FROM
                            `eyefidb`.`fs_team`
                        GROUP BY
                            `eyefidb`.`fs_team`.`fs_det_id`
                    ) `e`
                ON
            ((`e`.`fs_det_id` = `a`.`id`))
            where team LIKE '%Alfred Villa%' and status = 'Confirmed' and dateSubmitted IS NULL
        ";

		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $startDate, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $endDate, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
		
		$nowDate = $endDate;
		$start = $month = strtotime($startDate);
		$end = strtotime($nowDate);

		while ($month < $end) {

			$month = strtotime("+1 month", $month);
			$m = date('m', $month);
			$y = date('Y', $month);
			$label = getMonthName($m) . " - " . $y;

			$obj['month'][] = $label;

			$inState = 0;
			$outOfState = 0;
			$sumInState = 0;
			$sumOutOfState = 0;
			$sumVendorCost = 0;

			foreach ($results as $row) {

				$ll = getMonthName($row['month']) . " - " . $row['year'];
				if ($label == $ll) {
					$obj['inState'][] = $row['inState'];
					$obj['outOfState'][] = $row['outOfState'];
					$obj['sumInState'][] = $row['sumInvoicedInState'];
					$obj['sumOutOfState'][] = $row['sumInvoicedOutOfState'];
					$obj['sumVendorCost'][] = $row['sumVendorCost'];

					$obj['total'][] = $row['sumInvoicedInState'] + $row['sumInvoicedOutOfState'];
					$obj['results'][] = $row;
				}
			}

			// $obj['inState'][] = $inState;
			// $obj['outOfState'][] = $outOfState;
			// $obj['sumInState'][] = $sumInState;
			// $obj['sumOutOfState'][] = $sumOutOfState;
			// $obj['sumVendorCost'][] = $sumVendorCost;
			// $obj['total'][] = $sumInState + $sumOutOfState;

		}

		return $obj;
	}

	public function getMonthlyReview()
	{

		$obj = array();
		$dateFrom = date("Y-m-d", strtotime($this->serviceJobDateFrom));
		$dateTo = date("Y-m-t", strtotime($this->serviceJobDateTo));

		$qry = "
			select a.ServiceType label, 
				count(a.ServiceType) hits, 
				month(a.RequestDate) month, 
				year(a.RequestDate) year, 
				max(statusColor) statusColor 
			from eyefidb.fs_scheduler a
			LEFT JOIN eyefidb.fs_scheduler_settings b ON b.value = a.ServiceType AND type = 'Service Type'
			WHERE a.active = 1
			AND a.ServiceType != ''
			
		";

		if ($this->statusSelection != 'All') {
			$qry .= " AND a.Status = '$this->statusSelection'";
		}

		$qry .= ' group by a.ServiceType, month(a.RequestDate), year(a.RequestDate)
		order by year(a.RequestDate) desc, month(a.RequestDate) desc ';

		$query = $this->db->prepare($qry);
		$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
		$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		$dateFrom_so = date('Y-m-01');
		$dateTo_so = date("Y-m-t", strtotime($dateFrom_so));

		$obj['$dateFrom_so'] = $dateFrom_so;
		$obj['$dateTo_so'] = $dateTo_so;

		$obj['PROJECTED'] = 0;
		$nowDate = $dateTo;
		$start = $month = strtotime($dateFrom);
		$end = strtotime($nowDate);

		$o = array();

		$colors = array(
			"4169E1", "5F9EA0", "ADD8E6", "87CEEB", "40E0D0", "4682B4", "B0E0E6", "00CED1", "48D1CC", "40E0D0"
		);

		$labeling = array();
		foreach ($results as $row) {
			$labeling[] = $row['label'];
		}
		$uniqueLabels = array_unique($labeling);

		while ($month < $end) {

			$m = date('m', $month);
			$y = date('Y', $month);
			$label = getMonthName($m) . " - " . $y;

			$o['MONTH'][] = $label;
			$month = strtotime("+1 month", $month);

			foreach ($uniqueLabels as $row1) {
				$index = 0;
				$count = 0;
				$isFound = false;
				foreach ($results as $row) {
					$ll = getMonthName($row['month']) . " - " . $row['year'];
					if ($label == $ll) {
						if ($row1 == $row['label']) {
							$isFound = true;
							$count = $count + $row['hits'];
							$statusColor = $row['statusColor'];
							$o['graph'][$row1]['backgroundColor'] = $statusColor;
							$index++;
						}
					}
				}

				$o['graph'][$row1]['data'][] = $isFound ? $count : 0;
				$o['graph'][$row1]['label'][] = $row1;
			}
		}

		return $o;
	}

	public function testDate()
	{

		return array(
			"dateFrom" => date('Y-m-d', strtotime("monday -1 week")),
			"dateTo" => date('Y-m-d', strtotime("sunday 0 week")),
			"dateFromMonth" => date("Y-m-d", strtotime("first day of this month")),
			"dateToMonth" => date("Y-m-d", strtotime("last day of this month"))

		);
	}

	public function __destruct()
	{
		$this->db = null;
	}
}