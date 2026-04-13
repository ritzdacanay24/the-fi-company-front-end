<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$workOrderTicketId = $_GET['id'];

$db->beginTransaction();

try {
    $qry = '
        DELETE 
        FROM fs_workOrder 
        where id = :workOrderTicketId
    ';
    $stmt = $db->prepare($qry);
    $stmt->bindParam(':workOrderTicketId', $workOrderTicketId, PDO::PARAM_STR);
    $stmt->execute();

    $qry = '
        DELETE 
        FROM fs_workOrderProject 
        where workOrderId = :workOrderTicketId
    ';
    $stmt = $db->prepare($qry);
    $stmt->bindParam(':workOrderTicketId', $workOrderTicketId, PDO::PARAM_STR);
    $stmt->execute();

    $qry = '
        DELETE 
        FROM fs_assets 
        where workOrderId = :workOrderTicketId
    ';
    $stmt = $db->prepare($qry);
    $stmt->bindParam(':workOrderTicketId', $workOrderTicketId, PDO::PARAM_STR);
    $stmt->execute();

    $qry = '
        DELETE 
        FROM fs_workOrderTrip 
        where workOrderId = :workOrderTicketId
    ';
    $stmt = $db->prepare($qry);
    $stmt->bindParam(':workOrderTicketId', $workOrderTicketId, PDO::PARAM_STR);
    $stmt->execute();

    $db->commit();

    
    echo $db_connect->json_encode("Deleted");

} catch (PDOException $e) {
    $db->rollBack();
}
