<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_fi = new DatabaseEyefi();
$dbFi = $db_connect_fi->getConnection();
$dbFi->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$mainQry = "
    SELECT CONCAT(b.first, ' ',b.last) userName
        , MAX(transaction_date) last_transaction_date
        , COUNT(*) total_transactions_made
    FROM kanban_transactions a
    LEFT JOIN db.users b ON b.id = a.created_by
";

if(ISSET($_GET['dateFrom']) && ISSET($_GET['dateTo'])){
    $dateFrom = $_GET['dateFrom'];
    $dateTo = $_GET['dateTo'];
    $mainQry .= "
        WHERE date(transaction_date) between $dateFrom AND $dateTo
    ";
};

$mainQry .= "
    GROUP BY DATE(a.transaction_date), 
        a.created_by, CONCAT(b.first, ' ', b.last)
    ORDER BY DATE(a.transaction_date) DESC;
";

$query = $dbFi->prepare($mainQry);
$query->execute();
$checkValidation =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);



