<?php
use EyefiDb\Databases\DatabaseEyefi;

$dbConnect = new DatabaseEyefi();
$db = $dbConnect->getConnection();

$mainQry = "
    select LTRIM(RTRIM(pt_part)) pt_part
        , pt_desc1
        , pt_desc2
        , pt_um
        , pt_part_type 
    from pt_mstr 
    where pt_status = 'ACTIVE' 
        and pt_domain = 'EYE'
";


$mainQry = "
    select partNumber pt_part
        , desc1 pt_desc1
        , desc2 pt_desc2
        , part_type pt_part_type 
        , cycleTime
        , case when updatedDate = '0000-00-00 00:00:00' THEN '-' ELSE updatedDate END updatedDate
        , updatedBy
    from shipping_cycle_times
";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

// $mainQry = "
//     select *, trim(partNumber) partNumber
//     from shipping_cycle_times
// ";

// $query = $db->prepare($mainQry);
// $query->execute();
// $times =  $query->fetchAll(PDO::FETCH_ASSOC);


// foreach($results as &$row){
//     $row['data'] = new StdClass();
//     foreach($times as $timesRow){
//         if($row['pt_part'] == $timesRow['partNumber']){
//            $row['data'] = $timesRow;
//         }
//     } 
// }

echo $dbConnect->json_encode($results);
