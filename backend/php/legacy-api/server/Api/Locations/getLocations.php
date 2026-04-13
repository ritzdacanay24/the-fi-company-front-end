<?php

class Locations
{
    protected $db;


    public function __construct($dbQad)
    {
        $this->dbQad = $dbQad;
    }

    public function getLocations($locationStart, $locationEnd)
    {

        
        
        $mainQry = "
            select loc_loc
            from loc_mstr  
            where loc_domain = 'EYE' 
            and loc_site = 'EYE01' 
            and loc_loc != '' 
            and loc_loc = :locationStart
		";

        $query = $this->dbQad->prepare($mainQry);
        $query->bindParam(':locationStart', $locationStart, PDO::PARAM_STR);
        $query->execute();
        $isFound = $query->fetch(PDO::FETCH_ASSOC);

        if(!$isFound){
            
            http_response_code(500);
            echo  "Start Location Not Found.";
            die();
        }
        
        
        $mainQry = "
            select loc_loc
            from loc_mstr  
            where loc_domain = 'EYE' 
            and loc_site = 'EYE01' 
            and loc_loc != '' 
            and loc_loc = :locationEnd
		";

        $query = $this->dbQad->prepare($mainQry);
        $query->bindParam(':locationEnd', $locationEnd, PDO::PARAM_STR);
        $query->execute();
        $isFound1 = $query->fetch(PDO::FETCH_ASSOC);

        if(!$isFound1){
            
            http_response_code(500);
            echo  "End Location Not Found.";
            die();
        }

        $mainQry = "
            select loc_loc
            from loc_mstr  
            where loc_domain = 'EYE' 
            and loc_site = 'EYE01' 
            and loc_loc != '' 
            and loc_loc between :locationStart AND :locationEnd
		";

        $query = $this->dbQad->prepare($mainQry);
        $query->bindParam(':locationStart', $locationStart, PDO::PARAM_STR);
        $query->bindParam(':locationEnd', $locationEnd, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
    
}

use EyefiDb\Databases\DatabaseQad;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new Locations($dbQad);
$data1 = $data->getLocations($_GET['locationStart'],$_GET['locationEnd']);

echo json_encode($data1);
