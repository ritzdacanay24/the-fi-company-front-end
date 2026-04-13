<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";
    require "/var/www/html/vendor/autoload.php";

    $table = 'fs_trip_expense_transactions';
//https://stackoverflow.com/questions/60564376/extracting-data-from-excel-file-sheet-by-sheet-simplexlsx


    if(!ISSET($_GET['monthAndYear'])){
        die("Please select month and year");
    }

    $monthAndYear = $_GET['monthAndYear'];
    
    $xlsx = new SimpleXLSX( $_FILES['file']['tmp_name'] );

    $sheets=$xlsx->sheetNames(); 
    
    //echo '<h1>Parsing Result</h1>';
    //echo '<table border="1" cellpadding="3" style="border-collapse: collapse">';
    
    list($cols,) = $xlsx->dimension();

    $test = array();
    
    if ( $xlsx) {
    // Produce array keys from the array values of 1st array element
        $header_values = $rows = [];
        
        foreach($sheets as $index => $name){
            if($monthAndYear == $name){
                foreach ( $xlsx->rows($index) as $k => $r ) {
                    if ( $k === 0 ) {
                        $header_values = $r;
                        continue;
                    }

                    $r = ISSET($r) ? str_replace("'", "", $r) : null;
                    $header_values = str_replace(' ', '_', $header_values);

                    $rows = array_combine( $header_values, $r );
            
                    $test[] =$rows;
                }
                
                //echo "Reading sheet :".$name."<br>";
            }
        }
        //print_r( $rows );

    }


    foreach ($test as &$value) {
        //check if record already exists
        $id = $value['Transaction_ID'];

        if($id){
            $qry = "Select * From fs_trip_expense_transactions where Transaction_ID = $id";
            $query = $db->prepare($qry);
            $query->execute();
            $isRecordFound =  $query->fetch(PDO::FETCH_ASSOC);
            if(!$isRecordFound){
                $qry = dynamicInsert($table, $value);
                $query = $db->prepare($qry);
                $query->execute();
            }else{
                $qry = dynamicUpdate($table, $value, $isRecordFound['id']);
                $query = $db->prepare($qry);
                $query->execute();
            }
        }
   }


   //assign credit card transactions to fsid


   $t = ['FSID1', 'FSID2', 'FSID3', 'FSID4', 'FSID5', 'FSID6', 'FSID7', 'FSID8', 'FSID9'];
   foreach ($test as &$value) {

    $transaction_id = $value['Transaction_ID'];

    foreach ($t as &$value1) {
        $fsId = $value[$value1];
        if($fsId){

            $qry = "Select * From fs_trip_expense_assign where transaction_id = :transaction_id AND fs_id = :fs_id";
            $query = $db->prepare($qry);
            $query->bindParam(':transaction_id', $transaction_id, PDO::PARAM_STR);
            $query->bindParam(':fs_id', $fsId, PDO::PARAM_STR);
            $query->execute();
            $isRecordFound =  $query->fetch(PDO::FETCH_ASSOC);
            if($isRecordFound){
                $id = $isRecordFound['id'];
                $qry = "
                    update fs_trip_expense_assign 
                    set fs_id = :fs_id
                        , transaction_id = :transaction_id
                    where id = :id
                ";
                $query = $db->prepare($qry);
                $query->bindParam(':fs_id', $fsId, PDO::PARAM_STR);
                $query->bindParam(':transaction_id', $transaction_id, PDO::PARAM_STR);
                $query->bindParam(':id', $id, PDO::PARAM_STR);
                $query->execute();
            }else{
                $qry = "insert into fs_trip_expense_assign (fs_id, transaction_id) VALUES (:fs_id, :transaction_id)";
                $query = $db->prepare($qry);
                $query->bindParam(':fs_id', $fsId, PDO::PARAM_STR);
                $query->bindParam(':transaction_id', $transaction_id, PDO::PARAM_STR);
                $query->execute();
            }
            //echo json_encode($qry);
        }
    }
    
   }

   
   echo json_encode($test);
