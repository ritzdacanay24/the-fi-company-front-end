<?php

function dynamicInsert($table_name, $assoc_array){
    $keys = array();
    $values = array();
    foreach($assoc_array as $key => $value){
        if($value){
            $value = str_replace("'", "", $value);
            $keys[] = $key;
            $values[] = $value;
        }
    }

    $query = "INSERT INTO `$table_name`(`".implode("`,`", $keys)."`) VALUES('".implode("','", $values)."')";
    return $query;
}

function dynamicInsertV1($table_name, $assoc_array){
    $keys = array();
    $values = array();
    foreach($assoc_array as $key => $value){
        $value = str_replace("'", "", $value);
        $keys[] = $key;
        $values[] = $value;
    }

    $query = "INSERT INTO `$table_name`(`".implode("`,`", $keys)."`) VALUES('".implode("','", $values)."')";
    return $query;
    
}
function dynamicInsertV2($table_name, $assoc_array){
    $keys = array();
    $values = array();
    foreach($assoc_array as $key => $value){
        $value = str_replace("'", "", $value);
        $keys[] = $key;
        $values[] = $value;
    }

    $query = "INSERT INTO $table_name (`".implode("`,`", $keys)."`) VALUES('".implode("','", $values)."')";
    return $query;
    
}

function dynamicUpdate($table, $data, $id){
    $cols = array();
    foreach($data as $key=>$val) {
        if($val == ""){
            $cols[] = "$key = null";
        }else{
            $val = str_replace("'", "", $val);
            $cols[] = "$key = '$val'";
        }
    }
    $sql = "UPDATE $table SET " . implode(', ', $cols) . " WHERE id = $id";
    return($sql);
}
function dynamicUpdateV1($table, $data, $id){
    $cols = array();
    foreach($data as $key=>$val) {
        $val = str_replace("'", "", $val);
        $cols[] = "$key = '$val'";
    }
    $sql = "UPDATE $table SET " . implode(', ', $cols) . " WHERE id = $id";
    return($sql);
}

function dynamicUpdateV2($table, $data, $id){
    $cols = array();
    foreach($data as $key=>$val) {
        $cols[] = "$key = '$val'";
    }
    $sql = "UPDATE $table SET " . implode(', ', $cols) . " WHERE id = $id";
    return($sql);
}

function dynamicDeleteById($table, $id){
    $sql = "DELETE FROM $table WHERE id = $id";
    return($sql);
}

//https://stackoverflow.com/questions/15181131/php-looping-through-a-querystring
function dynamicFind($table){
    $sqlStyle = "Select * From $table ";
    $i = 1;
    foreach ($_GET as $key => $value) {
        if ($i == 1){
            $sqlStyle .= "where ";
         }else{
            $sqlStyle .= " and ";
         }

         $sqlStyle .=  $key . " = '$value'";

         $i++;
     }

     return $sqlStyle;
}

function dynamicFindOne($table){
    $sqlStyle = "Select * From $table ";
    $i = 1;
    foreach ($_GET as $key => $value) {
        if ($i == 1){
            $sqlStyle .= "where ";
         }else{
            $sqlStyle .= " and ";
         }

         $sqlStyle .=  $key . " = '$value'";

         $i++;
     }

     $sqlStyle .= " LIMIT 1 ";
     return $sqlStyle;
}

function findById($table, $id){
    $sqlStyle = "Select * From $table where id = $id";
    return $sqlStyle;
}

//https://stackoverflow.com/questions/15181131/php-looping-through-a-querystring
//will work in most cases
function findByDateRange($table, $params){
    $sqlStyle = "Select * From $table ";
    $fieldName = $params['fieldName'];
    $dateFrom = $params['dateFrom'];
    $dateTo = $params['dateTo'];
    $sqlStyle .= " where date($fieldName) between $dateFrom and $dateTo";
    return $sqlStyle;
}

function compressImage($source, $destination, $quality) { 
    // Get image info 
    $imgInfo = getimagesize($source); 
    $mime = $imgInfo['mime']; 
     
    // Create a new image from file 
    switch($mime){ 
        case 'image/jpeg': 
            $image = imagecreatefromjpeg($source); 
            break; 
        case 'image/png': 
            $image = imagecreatefrompng($source); 
            break; 
        case 'image/gif': 
            $image = imagecreatefromgif($source); 
            break; 
        default: 
            $image = imagecreatefromjpeg($source); 
    } 
     
    // Save image 
    imagejpeg($image, $destination, $quality); 
     
    // Return compressed image 
    return $destination; 
}

function convert_filesize($bytes, $decimals = 2) { 
    $size = array('B','KB','MB','GB','TB','PB','EB','ZB','YB'); 
    $factor = floor((strlen($bytes) - 1) / 3); 
    return sprintf("%.{$decimals}f", $bytes / pow(1024, $factor)) . @$size[$factor]; 
}