<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);
    

    $target_dir = "/var/www/html/attachments/images/employees/";

    $id = $_GET['id'];
    $fileName = $_FILES["file"]["name"];
    $extension  = pathinfo( $_FILES["file"]["name"], PATHINFO_EXTENSION );
    $basename   = $id . "." . $extension; // 5dab1961e93a7_1571494241.jpg
    $target_file = $target_dir . $basename;

    $image = "https://dashboard.eye-fi.com/attachments/images/employees/$basename";

    $qry = "
            UPDATE db.users
            SET image = :image
            WHERE id = :userId
        ";
    $query = $db->prepare($qry);
    $query->bindParam(':userId', $_GET['id'], PDO::PARAM_INT);
    $query->bindParam(':image', $image, PDO::PARAM_STR);
    $query->execute();
    $count = $query->rowCount();

    
  if (move_uploaded_file($_FILES["file"]["tmp_name"], $target_file)) {
    $message = "The file ". htmlspecialchars( basename( $_FILES["file"]["name"])). " has been uploaded.";
  } else {
    $message =  "Sorry, there was an error uploading your file.";
  }

  echo $db_connect->json_encode(array("results" => $message, "url"=>$image));
