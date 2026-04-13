
<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];
$userId = $_GET['userId'];

$qry = "
    select count(*) total
        , sum(case when b.dateSubmitted IS NULL THEN 1 ELSE 0 END) completed_total
        , YEAR(request_date) year
        , MONTH(request_date) month
    from fs_scheduler a 
    left join fs_workOrder b on b.fs_scheduler_id = a.id 
    left join fs_team c ON c.fs_det_id = a.id 
    left join db.users u on concat(first, ' ', last) = c.user 
    where u.id = :userId
        and a.active = 1
        and request_date between :dateFrom AND :dateTo
    GROUP BY MONTH(request_date)
        , YEAR(request_date)
";
$stmt = $db->prepare($qry);
$stmt->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
$stmt->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
$stmt->bindParam(":userId", $userId, PDO::PARAM_STR);
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

            
			$total = 0;
			$completed_total = 0;


			foreach ($results as $row) {
				$resultsFound = true;

				$ll = getMonthName($row['month']) . "-" . $row['year'];
				if ($label == $ll) {
					$total += $row['total'];
					$completed_total += $row['completed_total'];
				}
			}

			$obj['total'][] = $total;
			$obj['completed_total'][] = $completed_total;
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
