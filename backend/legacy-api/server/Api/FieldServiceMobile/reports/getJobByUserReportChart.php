<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];
$typeOfView = $_GET['typeOfView'];

$mainQry = "
    select user
        , count(*) total
        , month(request_date) month
        , year(request_date) year
        , request_date
    from fs_scheduler a 
    left join fs_team b ON b.fs_det_id =  a.id
    where request_date between :dateFrom and :dateTo and user <> ''
    group by user
    , month(request_date)
    , year(request_date)
    , request_date
    order by count(*) DESC
";
$query = $db->prepare($mainQry);
$query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
$query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);


$month = strtotime($dateFrom);
$end = strtotime($dateTo);

$test = array();
$chart = array();
$chart1 = array();

$goal = 200000.00;

$customers = [];
foreach ($results as $row) {
    $customers[] = $row['user'];
}

$uniqueCustomers = array_values(array_unique($customers, SORT_REGULAR));


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

            if ($labelCheck == $formatedDate && $row['user'] == $vendorSelectedrow) {
                $test[$key] += $row['total'];
            }

            if ($labelCheck == $formatedDate && $row['user'] == $vendorSelectedrow) {
                $test['test111'][$vendorSelectedrow] += $row['total'];
                $test['isFound'][$vendorSelectedrow] = true;
            }
        }
    }

    $color_index = 0;
    foreach ($uniqueCustomers as $vendorSelectedrow) {
        $chart1[$vendorSelectedrow]['dataset'][] = $test['test111'][$vendorSelectedrow];
        $chart1[$vendorSelectedrow]['label'] = $vendorSelectedrow;
        $chart1[$vendorSelectedrow]['backgroundColor'] = 'rgba('.rand(0,255).', '.rand(0,255).', '.rand(0,255).', 0.73)';
        $color_index++;
    }

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

echo $db_connect->json_encode(array(
    "obj" => $obj,
    "chart" => $chart,
    "chartnew" => $chart1,
    "uniqueCustomers" => $uniqueCustomers,
));
