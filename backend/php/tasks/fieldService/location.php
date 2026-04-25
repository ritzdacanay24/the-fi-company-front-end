<?php

// A function that will make a GET request to the /campaigns endpoint

function get_data_from_api($address) {

    // Run the function that will make a POST request and return the token
    
    
    $curl = curl_init();
    
    curl_setopt_array($curl, array(
      CURLOPT_URL => "https://api.geoapify.com/v1/geocode/search?text=".$address."&apiKey=89bc2e01750d4401a8a8866b6290b52d",
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_ENCODING => "",
      CURLOPT_MAXREDIRS => 10,
      CURLOPT_TIMEOUT => 30,
      CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
      CURLOPT_CUSTOMREQUEST => "GET",
      CURLOPT_POSTFIELDS => "",
      CURLOPT_HTTPHEADER => array(
         "Content-Type: application/json",
         "cache-control: no-cache"
      ),
    ));
    
    $response = curl_exec($curl);
    $err = curl_error($curl);
    
   return json_decode($response, true);
    
    // do something with the data
    
    return $response;
    
    }
    
    
    // Run the initial function
    
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

    $dateFrom = ISSET($_GET['dateFrom']) ? $_GET['dateFrom'] : date("Y-m-d");
    $dateTo = ISSET($_GET['dateTo']) ? $_GET['dateTo'] : date("Y-m-d");

    $mainQry = "
        SELECT id, fs_lat, fs_lon, address1, address2, city, state, zip_code, 

            CONCAT_WS(', ', 
                NULLIF(address1, ''),
                NULLIF(address2, ''),
                NULLIF(city, ''), 
                NULLIF(state, ''), 
                NULLIF(zip_code, '')
            ) AS full_address
        FROM fs_scheduler 
        WHERE request_date BETWEEN :dateFrom AND :dateTo and active = 1 and (fs_lat IS NULL and fs_lon IS NULL)
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(":dateFrom", $dateFrom);
    $query->bindParam(":dateTo", $dateTo);
    $query->execute();
    $results =  $query->fetchAll(PDO::FETCH_ASSOC);

    $l = [];
    $dd = [];
    foreach($results as $row){
        $d = get_data_from_api($row['full_address']);

        $dd[] = $d;

        if(ISSET($d['features'])){
            foreach($d['features'] as $row1){
                if($row1['properties']['rank']['match_type'] == 'full_match'){
                    $mainQry = "
                        update fs_scheduler 
                        set fs_lat = :lat, 
                            fs_lon = :lon
                        where id = :id
                    ";
                    $query = $db->prepare($mainQry);
                    $query->bindParam(':lat', $row1['properties']['lat'], PDO::PARAM_STR);
                    $query->bindParam(':lon', $row1['properties']['lon'], PDO::PARAM_STR);
                    $query->bindParam(':id', $row['id'], PDO::PARAM_STR);
                    $query->execute();
                    $count = $query->rowCount();
                    $l[] = $count;
                }else if($row1['properties']['rank']['match_type'] == 'match_by_street'){
                    $mainQry = "
                        update fs_scheduler 
                        set fs_lat = :lat, 
                            fs_lon = :lon
                        where id = :id
                    ";
                    $query = $db->prepare($mainQry);
                    $query->bindParam(':lat', $row1['properties']['lat'], PDO::PARAM_STR);
                    $query->bindParam(':lon', $row1['properties']['lon'], PDO::PARAM_STR);
                    $query->bindParam(':id', $row['id'], PDO::PARAM_STR);
                    $query->execute();
                    $count = $query->rowCount();
                    $l[] = $count;
                }else if($row1['properties']['rank']['match_type'] == 'inner_part'){
                    $mainQry = "
                        update fs_scheduler 
                        set fs_lat = :lat, 
                            fs_lon = :lon
                        where id = :id
                    ";
                    $query = $db->prepare($mainQry);
                    $query->bindParam(':lat', $row1['properties']['lat'], PDO::PARAM_STR);
                    $query->bindParam(':lon', $row1['properties']['lon'], PDO::PARAM_STR);
                    $query->bindParam(':id', $row['id'], PDO::PARAM_STR);
                    $query->execute();
                    $count = $query->rowCount();
                    $l[] = $count;
                }else{
                    $mainQry = "
                        update fs_scheduler 
                        set fs_lat = :lat, 
                            fs_lon = :lon
                        where id = :id
                    ";
                    $query = $db->prepare($mainQry);
                    $query->bindParam(':lat', $row1[0]['properties']['lat'], PDO::PARAM_STR);
                    $query->bindParam(':lon', $row1[0]['properties']['lon'], PDO::PARAM_STR);
                    $query->bindParam(':id', $row['id'], PDO::PARAM_STR);
                    $query->execute();
                    $count = $query->rowCount();
                    $l[] = $count;
                }
            }
        }

        // $t = $d['features'][0]['properties'];
        
        // $mainQry = "
        //     update fs_scheduler 
        //     set fs_lat = :lat, 
        //         fs_lon = :lon
        //     where id = :id
        // ";
        // $query = $db->prepare($mainQry);
        // $query->bindParam(':lat', $t['lat'], PDO::PARAM_STR);
        // $query->bindParam(':lon', $t['lon'], PDO::PARAM_STR);
        // $query->bindParam(':id', $row['id'], PDO::PARAM_STR);
        // $query->execute();
        // $count = $query->rowCount();
        // $l[] = $count;

    }


    echo $db_connect->json_encode(array("data"=>$dd, "results" => $results));

