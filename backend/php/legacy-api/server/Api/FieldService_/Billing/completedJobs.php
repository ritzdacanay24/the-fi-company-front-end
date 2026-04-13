<?php

include_once '/var/www/config/.core.php';

$servername = getenv('DB_HOST_NAME');
$username = getenv('DB_USER_NAME');
$password = getenv('DB_PASSWORD');
$dbname =  getenv('DB_NAME');

try {

    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    // set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);



    $qry = "
        SELECT RequestDate, 
        count(*) completedJobs, 
         DATE_FORMAT(RequestDate, '%a %b %d') RequestDateFormat,
        sum(case when invoiceDate IS NULL then 1 else 0 end) notInvoiced,
        max(RequestDate) maxRequestDate
        FROM eyefidb.fs_scheduler a
        join eyefidb.fs_workOrder b ON b.fs_scheduler_id = a.id AND dateSubmitted IS NOT NULL
        GROUP BY RequestDate
        order by RequestDate DESC
    ";

    $query = $conn->prepare($qry);
    $query->execute();
    $completedJobs = $query->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($completedJobs);
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
$conn = null;
