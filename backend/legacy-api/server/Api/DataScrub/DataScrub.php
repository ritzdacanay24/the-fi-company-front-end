<?php

namespace EyefiDb\Api\DataScrub;

use PDO;
use PDOException;

class DataScrub
{

    protected $db;

    public function __construct($db, $dbQad)
    {

        $this->db = $db;
        $this->dbQad = $dbQad;
        $this->nowDate = date("Y-m-d", time());
    }

    public function getData($name)
    {
        $mainQry = "
            SELECT name, query
            FROM eyefidb.data_scrub
            WHERE name = :name
            ORDER BY id DESC
            LIMIT 1 
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':name', $name, PDO::PARAM_STR);
        $query->execute();
        return  $query->fetch(PDO::FETCH_ASSOC);
    }

    public function getCategory()
    {
        $mainQry = "
            SELECT name, query
            FROM eyefidb.data_scrub
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function Query($name)
    {

        $q = $this->getData($name);

        $q = str_replace("\r\n", "", $q['query']);

        $query = $this->dbQad->prepare($q);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }
}
