<?php
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

try{
    $id = $_GET['id'];

    $obj = array();
    
    // if mrb not found
    $qirSearch = "
        SELECT *
        FROM eyefidb.qa_capaRequest
        WHERE id = :id
        LIMIT 1
    ";
    $qirSearchQuery = $db->prepare($qirSearch);
    $qirSearchQuery->bindParam(':id', $id, PDO::PARAM_STR);
    $qirSearchQuery->execute();
    $row = $qirSearchQuery->fetch();
    $eyePartNumber = $row['eyefiPartNumber'];
    
    if ($row) {
    
        $p = str_replace('/', '', $eyePartNumber);
        $p = str_replace(' ', '', $p);
        
        $qirSearch = "
            SELECT pt_part
                , b.sct_cst_tot pt_price
                , CONCAT(pt_desc1, pt_desc2) fullDesc
            FROM pt_mstr a
            left join sct_det b ON a.pt_part = b.sct_part AND sct_sim = 'Standard' and sct_domain = 'EYE' 
            and sct_site  = 'EYE01'
            WHERE pt_part = :part
            WITH (noLock)
        ";
        $qirSearchQuery = $dbQad->prepare($qirSearch);
        $qirSearchQuery->bindParam(':part', $p, PDO::PARAM_STR);
        $qirSearchQuery->execute();
        $qadResults = $qirSearchQuery->fetch();
    
        $obj = array(
            "failureType" => $row['failureType'],
            "qirNumber" => $id,
            "componentType" => $row['componentType'],
            "type" => $row['type1'],
            "partNumber" => $row['eyefiPartNumber'],
            "partDescription" => $qadResults['FULLDESC'],
            "itemCost" => $qadResults['PT_PRICE'],
            "dateReported" => $row['customerReportedDate'],
            "qtyRejected" => $row['qtyAffected'],
            "wo_so" => $row['purchaseOrder'],
            "id" => $row['id'],
            "disposition" => isset($row['disposition']) ? $row['disposition'] : null,
            "comments" => isset($row['comments']) ? $row['comments'] : '',
            "rma" => isset($row['rma']) ? $row['rma'] : '',
            "status" => null,
            "mrbFound" => "false",
            "found" => true,
            "active" => $row['active'],
            "mrbNumber" => '',
            "lotNumber" => isset($row['lotNumber']) ? $row['lotNumber'] : ''
        );
    } else {
        $obj = array(
            "qirNumber" => $qir, "found" => false
        );
    }
    
    echo $db_connect->json_encode($obj);
} catch (\PDOException $e) {
    http_response_code(500);
    die($e->getMessage());
}

