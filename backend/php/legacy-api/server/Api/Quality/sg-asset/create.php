<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'sgAssetGenerator';

    $mainQry = "
        select RIGHT(generated_SG_asset, 2) generatedAssetNumber,
            id, 
            date(timeStamp) dateCreated
        from eyefidb.sgAssetGenerator
        where manualUpdate IS NULL OR manualUpdate = ''
        ORDER BY id DESC
        LIMIT 1
    ";
    $query = $db->prepare($mainQry);
    $query->execute();
    $result = $query->fetch();

    $manualUpdate = false;
    if(ISSET($_POST['generated_SG_asset']) && $_POST['generated_SG_asset'] != ''){
        $generatedAssetNumber = $_POST['generated_SG_asset'];
        $_POST['manualUpdate'] = true;
    }else{
        $lastRecordedWeekNumber = getWeekNumber($result['dateCreated']);
        $lastRecordedYearNumber = getYearNumber($result['dateCreated']);
        $generatedAssetNumber = generateSerialNumber($result['generatedAssetNumber'], $lastRecordedWeekNumber, $lastRecordedYearNumber);
    }

    $_POST['generated_SG_asset'] = $generatedAssetNumber;

    $qry = dynamicInsertV1($table, $_POST);
    
    $query = $db->prepare($qry);
    $query->execute();
    $last_id = $db->lastInsertId();

    echo $db_connect->json_encode(array("insertId" => $last_id));


     function getWeekNumber($date)
    {
        $ddate = $date;
        $date = new DateTime($ddate);
        return $date->format("W");
    }

     function getYearNumber($date)
    {
        $ddate = $date;
        $date = new DateTime($ddate);
        return $date->format("Y");
    }

     function generateSerialNumber($previous_sequence, $lastRecordedWeekNumber, $lastRecordedYearNumber)
    {

        //set values
        $defaultFirst = 'US14';
        $currentYear = date("y");
        $currentWeekNumber = date("W");
        $sequence = '01';

        if ($currentWeekNumber == $lastRecordedWeekNumber) {
            $sequence = str_pad($previous_sequence + 1, 2, "0", STR_PAD_LEFT);
        }

        //standard
        return $defaultFirst . $currentWeekNumber . $currentYear . $sequence;
    }