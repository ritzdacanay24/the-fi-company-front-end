
<html>
    <body>
        <style>
            form {
                position: relative;
            }

            input {
            width: 300px;
            padding-right: 40px;
            }

            button {
            position: absolute;
            top: 0;
            right: 0;
            }
        </style>
        <h2>Work Order # <?php echo ISSET($_GET['search']) ? $_GET['search'] : '' ?></h2>

        <div style="width:400px">
            <form action="workOrderInquery.php" method="get">
                Search <input type="search" name="search" placeholder="Search by work order #" value="<?php echo ISSET($_GET['search']) ? $_GET['search'] : '' ?>"><br>
                <button type="submit">Submit</button>
            </form>
        <div>
    </body>
</html>
<?php


use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Api\work_order_view\WorkOrderInfo;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new WorkOrderInfo($db);


$search = $_GET['search'];

$dataInfo = $data->read($search );


$dataInfo  =  $dataInfo['details'];

$newData1 = array();
foreach($dataInfo as &$row){

    $newData1[] = array(
        "Work order" => $row['wod_nbr'],
        "Part" => $row['wod_part'],
        "Description" => $row['PT_DESC1'],
        "Qty Required" => number_format($row['WOD_QTY_REQ'], 0),
        "Qty Issued" => number_format($row['WOD_QTY_ISS'], 0),
        "Qty Open" => number_format($row['QTY_OPEN'], 0),
        "Issued Date" => $row['wod_iss_date'],
        "Type" => $row['pt_part_type'],
        "Operation" => $row['wod_op'],
    );

}

if(count($newData1) > 0){

    echo $db_connect_qad->jsonToTableNice($newData1);
}else{
    echo "No record found..";
}

?>
