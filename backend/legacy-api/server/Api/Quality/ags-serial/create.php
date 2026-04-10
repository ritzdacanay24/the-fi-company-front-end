<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'agsSerialGenerator';

    // $mainQry = "
    //     select generated_SG_asset
    //     from eyefidb.agsSerialGenerator
    //     ORDER BY id DESC
    //     LIMIT 1
    // ";
    // $query = $db->prepare($mainQry);
    // $query->execute();
    // $isFound = $query->fetch();

    // if($isFound){
    //     http_response_code(500);
    //     die('AGS Serial Number already in system. Unable to proceed.');
    // }

    $mainQry = "
        select RIGHT(generated_SG_asset, 4) generatedAssetNumber, 
            id, 
            date(timeStamp) dateCreated
        from eyefidb.agsSerialGenerator
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
        $manualUpdate = true;
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

    function generateSerialNumber($previous_sequence, $lastRecordedWeekNumber, $lastRecordedYearNumber){
        //set values
        $defaultFirst = 'EF';
        $currentYear = date("y");
        $currentWeekNumber = date("W");
        $dateSequence = date("mdy");
        $sequence = '1000';

		if($currentWeekNumber == $lastRecordedWeekNumber){
			$sequence = str_pad($previous_sequence + 1,4,"0",STR_PAD_LEFT);
		}

        return $defaultFirst . $dateSequence . $sequence;
    }

     function getWeekNumber($date){
        $ddate = $date;
        $date = new DateTime($ddate);
        return $date->format("W");
    }

     function getYearNumber($date){
        $ddate = $date;
        $date = new DateTime($ddate);
        return $date->format("Y");
    }
