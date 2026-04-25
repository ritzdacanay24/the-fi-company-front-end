<?php
if(isset($_POST['insert'])){
        $data = file_get_contents('/var/www/html/test/signatures/test.json');
        $json = json_decode($data);
 
        $array = array(
            'Name' => $_POST['Name'],
            'Title' => $_POST['Title'],
            'Email' => $_POST['Email'],
            'officePhone' => $_POST['officePhone'],
            'mobilePhone' => $_POST['mobilePhone'],
            'Address1' => $_POST['Address1'],
            'Address2' => $_POST['City'] . ', ' . $_POST['State'] . ' ' . $_POST['ZipCode']
        );
 
        $json[] = $array;

 
        $json = json_encode($json, JSON_PRETTY_PRINT);
        file_put_contents('/var/www/html/test/signatures/test.json', $json);
        header('Location: https://dashboard.eye-fi.com/test/signatures/prod.html');
    }