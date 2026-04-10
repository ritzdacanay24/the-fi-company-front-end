<?php

include_once '/var/www/config/.core.php';

$servername = getenv('DB_HOST_NAME');
$username = getenv('DB_USER_NAME');
$password = getenv('DB_PASSWORD');
$dbname =  getenv('DB_NAME');



$rateChangeEffectiveDate = '2021-05-01'; //Effective date of tech salary change 
$nowDate = date("Y-m-d");

$test = array();

function convert_to_number($number) {
    return is_numeric($number) ? ($number + 0) : FALSE;
}

function sum(array $arr, $property) {


    $sum = 0;

    foreach($arr as $object) {
        $sum += (int)isset($object[$property]) ? $object[$property] : 0;
    }


    return $sum;
}

try {

    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    // set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $fsId = isset($_GET['fsId']) && $_GET['fsId'] != 'undefined'  ? $_GET['fsId'] : '';

    $qry = "
        select a.*
        from eyefidb.fs_scheduler_view a
        where a.id = :id
    ";
    $query = $conn->prepare($qry);
    $query->bindParam(":id", $fsId, PDO::PARAM_STR);
    $query->execute();
    $workOrderInfo = $query->fetch(PDO::FETCH_ASSOC);

    $workOrderId = $workOrderInfo['workOrderTicketId'];

    $qry = "select * from eyefidb.fs_billing_view where workOrderId = :workOrderId";
    $query = $conn->prepare($qry);
    $query->bindParam(":workOrderId", $workOrderId, PDO::PARAM_STR);
    $query->execute();
    $laborDetails = $query->fetchAll(PDO::FETCH_ASSOC);

    $qry = "select * from eyefidb.fs_billing_labor_view where workOrderId = :workOrderId order by case when typeOf = 'Overtime' then 2 ELSE 1 END ASC";
    $query = $conn->prepare($qry);
    $query->bindParam(":workOrderId", $workOrderId, PDO::PARAM_STR);
    $query->execute();
    $laborSummary = $query->fetchAll(PDO::FETCH_ASSOC);


    $qry = "select * from eyefidb.fs_billing_expense_view where workOrderId = :workOrderId";
    $query = $conn->prepare($qry);
    $query->bindParam(":workOrderId", $workOrderId, PDO::PARAM_STR);
    $query->execute();
    $expenseDetails = $query->fetchAll(PDO::FETCH_ASSOC);

    
    $payroll = sum($laborSummary, "cost_total");
    $trip_expense_cost = sum($expenseDetails, "total_cost");

    $billable = sum($laborSummary, "billing_total");
    $billing_expense_cost = sum($expenseDetails, "billing");

    $total_travel = sum($laborDetails, "travel") + sum($laborDetails, "travel_overtime");
    $total_install = sum($laborDetails, "install") + sum($laborDetails, "install_overtime");

    $total_hrs = sum($laborDetails, "total");
    $mark_up = sum($expenseDetails, "mark_up");

    $expense_total = $payroll + $trip_expense_cost;
    $revenue_total = $billable + $billing_expense_cost;

    $total_bill = $revenue_total;
    $mark_up_percent = $expense_total > 0 ? ( ( $revenue_total - $expense_total  ) / $expense_total ) * 100 : 0 ;
    $gpm = $revenue_total > 0 ? ( ( $revenue_total - $expense_total  ) / ($revenue_total) ) * 100 : 0 ; 

    $datesToCheck = array();
    foreach ($laborDetails as &$row) {
        $datesToCheck[] = $row['start'];
    }
    
    $row['finishedDate'] = ($datesToCheck) ? max($datesToCheck) : "";
    $row['startDate'] = ($datesToCheck) ? min($datesToCheck) : "";


    echo json_encode(
        array(
            "finishedDate" => ($datesToCheck) ? max($datesToCheck) : "",
            "startDate" => ($datesToCheck) ? min($datesToCheck) : "",
            "jobInfo" => $workOrderInfo, 
            "laborCostAndBilling" => array(
                "details" => $laborDetails,
                "total_travel" => $total_travel,
                "total_install" => $total_install,
                "total_hrs" => $total_hrs
            ),
            "laborSummary" => array(
                "details" => $laborSummary,
                "payroll" => $payroll,
                "billable" => $billable
            ),
            "expenseDetails" => array(
                "expenseDetails" => $expenseDetails,
                "cost" => $trip_expense_cost,
                "mark_up" => $mark_up,
                "billing" => $billing_expense_cost
            ),
            "summary" => array(
                "expenses" => array(
                    "payroll" => $payroll,
                    "trip" => $trip_expense_cost,
                    "total" => $expense_total
                ),
                "revenue" => array(
                    "payroll" => $billable,
                    "trip" => $billing_expense_cost,
                    "total" => $revenue_total
                ),
                "mark_up_percent" => $mark_up_percent,
                "gpm" => $gpm,
                "total_bill" => $total_bill
            )
        )
    );

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
$conn = null;
