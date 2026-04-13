<?php

namespace EyefiDb\Api\SupplyReviewCodes;

use PDO;
use PDOException;

class SupplyReviewCodes
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDateTime = date("Y-m-d H:i:s", time());
    }

    public function getData()
    {
        $mainQry = "
            select *, '0' selected
            from eyefidb.supplyReviewCodes
            where active = 1
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function save($data)
    {
        $mainQry = "
            INSERT INTO eyefidb.supplyReviewCodes (name) VALUES (:name)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':name', $data['newItem'], PDO::PARAM_STR);
        $query->execute();
        return $this->db->lastInsertId();
    }

    public function remove($data)
    {
        $mainQry = "
            UPDATE eyefidb.supplyReviewCodes
            SET active = 0
            WHERE id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $data['id'], PDO::PARAM_STR);
        $query->execute();
        return 1;
    }
}
