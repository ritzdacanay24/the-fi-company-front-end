
<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];

$qry = "
    SELECT count(*) total
        , YEAR(request_date) year
        , MONTH(request_date) month
        , sum(case when status IN ('Pending', 'Confirmed') then 1 ELSE 0 END) open_total
        , sum(case when status IN ('Completed') then 1 ELSE 0 END) completed_total
        , sum(case when status NOT LIKE '%cancelled%' AND status NOT IN ('Pending', 'Confirmed', 'Completed') then 1 ELSE 0 END) other_total
        , sum(case when status LIKE '%cancelled%' then 1 ELSE 0 END) cancelled_total
    FROM fs_scheduler 
    where request_date between :dateFrom AND :dateTo
    	and active = 1 and service_type <> ''
    GROUP BY MONTH(request_date)
        , YEAR(request_date)
";
$stmt = $db->prepare($qry);
$stmt->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
$stmt->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
$stmt->execute();
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

$chartData = array();

$begin = new \DateTime($dateFrom);
$end = new \DateTime($dateTo);

$interval = \DateInterval::createFromDateString('1 month');
$period = new \DatePeriod($begin, $interval, $end);

$total = [];
$chart = [];

$nowDate = $dateTo;
		$start = $month = strtotime($dateFrom);
		$end = strtotime($nowDate);

		while ($month < $end) {

			$month = strtotime("+1 month", $month);

			$m = date('m', $month);
			$y = date('Y', $month);
			$label = getMonthName($m) . "-" . $y;

			$obj['label'][] = $label;

            
			$open_total = 0;
			$completed_total = 0;
			$total = 0;
			$cancelled_total = 0;
			$other_total = 0;


			foreach ($results as $row) {
				$resultsFound = true;

				$ll = getMonthName($row['month']) . "-" . $row['year'];
				if ($label == $ll) {
					$open_total += $row['open_total'];
					$completed_total += $row['completed_total'];
					$total += $row['total'];
					$cancelled_total += $row['cancelled_total'];
					$other_total += $row['other_total'];
				}
			}

			$obj['open_total'][] = $open_total;
			$obj['completed_total'][] = $completed_total;
			$obj['total'][] = $total;
			$obj['cancelled_total'][] = $cancelled_total;
			$obj['other_total'][] = $other_total;
        }


$mainQry = "
    SELECT *
    FROM fs_scheduler 
    where request_date between :dateFrom AND :dateTo
        and active = 1
";

$query = $db->prepare($mainQry);
$query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
$query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
$query->execute();
$details = $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode(array(
    'chartData' => $obj
    , 'details' => $details
));
