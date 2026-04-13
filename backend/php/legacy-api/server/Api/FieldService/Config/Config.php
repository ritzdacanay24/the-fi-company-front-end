<?php

namespace EyefiDb\Api\FieldService\Config;

use PDO;

class Config
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAll(){
        $mainQry = "SELECT * from fs_config";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "SELECT * from fs_config where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_config 
                SET default_value = :default_value
                , active = :active
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":default_value", $post['default_value'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO fs_config (default_value, active)
            VALUES (:default_value, :active)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":default_value", $post['default_value'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->execute();
        return $this->db->lastInsertId();
        
    }

    public function delete($id){

        $mainQry = "DELETE FROM fs_config where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
