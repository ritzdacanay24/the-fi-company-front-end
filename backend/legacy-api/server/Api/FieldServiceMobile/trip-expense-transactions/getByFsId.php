



<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
select a.*, c.id workOrderId, f.*, d.id work_order_transaction_id
from fs_trip_expense_assign a
INNER join fs_trip_expense_transactions f ON f.Transaction_ID = a.transaction_id

left join fs_scheduler b ON b.id = a.fs_id 
left join fs_workOrder c ON c.fs_scheduler_id = b.id
left join fs_workOrderTrip d ON d.workOrderId = c.id and d.transaction_id = a.transaction_id
where a.fs_id = :fsId
";

$query = $db->prepare($mainQry);
$query->bindParam(':fsId', $_GET['fsId'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);


// <?php
// use EyefiDb\Databases\DatabaseEyefi;

// $db_connect = new DatabaseEyefi();
// $db = $db_connect->getConnection();
// $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

// $mainQry = "
//     select a.*, (case when b.workOrderId = d.id THEN a.transaction_id END) work_order_transaction_id, c.*, d.id workOrderId
//     from fs_trip_expense_assign a
//     left join fs_workOrderTrip b ON b.transaction_id = a.transaction_id 
//     left join fs_trip_expense_transactions c ON c.Transaction_ID = b.transaction_id
//     LEFT join fs_workOrder d ON d.id = b.id
//     where a.fs_id = :fsId
// ";

// $query = $db->prepare($mainQry);
// $query->bindParam(':fsId', $_GET['fsId'], PDO::PARAM_STR);
// $query->execute();
// $results =  $query->fetchAll(PDO::FETCH_ASSOC);

// echo $db_connect->json_encode($results);

