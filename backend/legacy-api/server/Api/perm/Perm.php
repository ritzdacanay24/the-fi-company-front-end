<?php

namespace EyefiDb\Api\perm;

use PDO;
use PDOException;

class Perm
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDateTime = date("Y-m-d H:i:s", time());
    }

    public function getPerm($page, $userId)
    {
        $mainQry = "
            select * 
            from eyefidb.perm
            where page = :page 
                and userId = :userId
            LIMIT 1
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":page", $page, PDO::PARAM_STR);
        $query->bindParam(":userId", $userId, PDO::PARAM_INT);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);

        if ($result['perm']) {
            $result['perm'] = explode(',', $result['perm']);
        } else {
            $result['perm'] = [];
        }

        return $result['perm'];
    }
}
