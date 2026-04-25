<?php

class BomClass
{

    protected $db;

    public function __construct($dbQad, $db)
    {
        $this->dbQad = $dbQad;
        $this->db = $db;
    }

    public function level($part)
    {
        try {
            $mainQry = "
                SELECT 
                    CASE 
                        WHEN pt_bom_code <> '' THEN pt_bom_code 
                        ELSE a.ps_comp 
                    END ps_comp
                FROM ps_mstr a
                LEFT JOIN pt_mstr b 
                    ON b.pt_part = a.ps_comp 
                        AND pt_domain = 'EYE'
                WHERE a.ps_par = :part 
                    AND a.ps_end IS NULL 
                    AND a.ps_domain = 'EYE'    
            ";
            $query = $this->dbQad->prepare($mainQry);
            $query->bindParam(':part', $part, PDO::PARAM_STR);
            $query->execute();
            $result = $query->fetchAll(PDO::FETCH_ASSOC);

            return $result;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }


    public function getShippingInfo($parent)
    {

        try {
            $mainQry = "
                SELECT case 
                    when pt_bom_code <> '' 
                        THEN pt_bom_code 
                    ELSE pt_part 
                    END pt_part 
                    from pt_mstr where pt_part = :pt_part
            ";
            $query = $this->dbQad->prepare($mainQry);
            $query->bindParam(':pt_part', $parent, PDO::PARAM_STR);
            $query->execute();
            $info = $query->fetch(PDO::FETCH_ASSOC);

            $mainQry = "
                SELECT CASE WHEN pt_bom_code <> '' THEN pt_bom_code else a.ps_comp END ps_comp
                FROM ps_mstr a
                LEFT JOIN pt_mstr b ON b.pt_part = a.ps_comp AND pt_domain = 'EYE'
                WHERE a.ps_par = :parent
                AND a.ps_end IS NULL AND a.ps_domain = 'EYE'
            ";
            $query = $this->dbQad->prepare($mainQry);
            $query->bindParam(':parent', $info['pt_part'], PDO::PARAM_STR);
            $query->execute();
            $result = $query->fetchAll(PDO::FETCH_ASSOC);

            return $result;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }
    

    function run()
    {
        $getShippingInfo = $this->getShippingInfo('VWL-03428-000');

        foreach($getShippingInfo as &$row){
            if($row['ps_comp'])
            $row['children'] = $this->level($row['ps_comp']);
            foreach($row['children'] as &$row1){
                if($row1['ps_comp'] != "")
                    $row1['children'] = $this->level($row1['ps_comp']);
                    foreach($row1['children'] as &$row2){
                        if($row2['ps_comp'] != "")
                        $row2['children'] = $this->level($row2['ps_comp']);
                        foreach($row2['children'] as &$row3){
                            if($row3['ps_comp'] != "")
                            $row3['children'] = $this->level($row3['ps_comp']);
                            foreach($row3['children'] as &$row4){
                                if($row4['ps_comp'] != "")
                                $row4['children'] = $this->level($row4['ps_comp']);
                                foreach($row4['children'] as &$row5){
                                    if($row5['ps_comp'] != "")
                                    $row5['children'] = $this->level($row5['ps_comp']);
                                    foreach($row5['children'] as &$row6){
                                        if($row6['ps_comp'] != "")
                                        $row6['children'] = $this->level($row6['ps_comp']);
                                    }
                                }
                            }
                        }
                    }
            }
        }

        return $getShippingInfo;
    }
}

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$productionInstance = new BomClass($dbQad, $db);

$results = $productionInstance->run();

echo $db_connect->jsonToDebug($results);
