<?php
use EyefiDb\Databases\DatabaseEyefi;

 function getMiscInfoBySalesOrderNumbers($db, $in)
    {
        try {
            $comments = "
                SELECT *
                FROM eyefidb.workOrderOwner a
                WHERE a.so IN ($in)
            ";
            $query = $db->prepare($comments);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

function getWorkOrdersInArray($details)
    {
        $in_array = array();
        foreach ($details as $row) {
            $in_array[] = $row['id'];
        }

        return "'" . implode("','", $in_array) . "'";
    }

    

function getComments($db, $in, $type = 'Shortage Request')
{
    $comments = "
        SELECT a.orderNum
            , comments_html comments_html
            , comments comments
            , a.createdDate
            , case when date(a.createdDate) = curDate() then 'text-success' else 'text-info' end color_class_name
            , case when date(a.createdDate) = curDate() then 'bg-success' else 'bg-info' end bg_class_name
            , concat('SO#:', ' ', a.orderNum) comment_title
            , concat(c.first, ' ', c.last) created_by_name
        FROM eyefidb.comments a
        INNER JOIN (
            SELECT orderNum
                , MAX(id) id
                , MAX(date(createdDate)) createdDate
            FROM eyefidb.comments
            GROUP BY orderNum
        ) b ON a.orderNum = b.orderNum AND a.id = b.id
        LEFT JOIN db.users c ON c.id = a.userId
        WHERE a.type = :type
        AND a.orderNum IN ($in)
        AND a.active = 1
    ";
    $query = $db->prepare($comments);
    $query->bindParam(':type', $type, PDO::PARAM_STR);
    $query->execute();
    return $query->fetchAll(PDO::FETCH_ASSOC);
}

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = "
    select a.*, concat(b.first, ' ', b.last) createdBy
    from shortageRequest a 
    left join db.users b on b.id = a.createdBy
    
";

if(ISSET($_GET['active']) && $_GET['active'] == 1){
    $mainQry .= " WHERE a.active = 1 ";
}else if(ISSET($_GET['active']) && $_GET['active'] == 0){
    $mainQry .= " WHERE a.active = 0 ";
}

if(ISSET($_GET['queue']) && $_GET['queue'] == 'Supply Open'){
    $mainQry .= " AND a.supplyCompleted IS NULL ";
}else if(ISSET($_GET['queue']) && $_GET['queue'] == 'Delivered Open'){
    $mainQry .= " AND ( a.supplyCompleted IS NOT NULL AND a.deliveredCompleted IS NULL ) ";
}else if(ISSET($_GET['queue']) && $_GET['queue'] == 'Receiving Open'){
    $mainQry .= " AND ( a.deliveredCompleted IS NOT NULL AND a.receivingCompleted IS NULL )";
}else if(ISSET($_GET['queue']) && $_GET['queue'] == 'Production Open'){
    $mainQry .= " AND a.receivingCompleted IS NOT NULL AND a.productionIssuedDate IS NULL ";
}else{
    $mainQry .= " AND ( a.supplyCompleted IS NULL OR a.deliveredCompleted IS NULL OR a.receivingCompleted IS NULL OR a.productionIssuedDate IS NULL )";
}

$mainQry .= " order by a.createdDate DESC";

$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

$in = getWorkOrdersInArray($results);

$commentInfo = getComments($db, $in);


$misc_info = getMiscInfoBySalesOrderNumbers($db, $in);

foreach ($results as &$row) {

    

    $row['misc'] = new \stdClass();

    foreach ($misc_info as $misc_info_row) {
        if ($row['id'] == $misc_info_row['so']) {
            $row['misc'] = $misc_info_row;
        }
    }
    
    $row['recent_comments'] = new \stdClass();
    foreach ($commentInfo as $row1) {
        if ($row['id'] == $row1['orderNum']) {
            $row['recent_comments'] = $row1;
        }
    }

}

echo $db_connect->json_encode($results);
