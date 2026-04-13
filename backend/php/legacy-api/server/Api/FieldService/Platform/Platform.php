<?php

namespace EyefiDb\Api\FieldService\Platform;

use PDO;

class Platform
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function task(){
        $mainQry = "
            INSERT INTO fs_platforms (theme, configuration, platform, etc, customer)
            SELECT sign_theme, sign_type, platform, 0 etc, customer FROM `fs_scheduler` group by sign_theme, sign_type, platform, customer;
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }


    public function getPlatforms(){

        $mainQry = "SELECT * from eyefidb.fs_platforms";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "
            SELECT * from eyefidb.fs_platforms where id = :id
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE eyefidb.fs_platforms 
                SET configuration = :configuration
                , theme = :theme
                , active = :active
                , platform = :platform
                , customer = :customer
                , etc = :etc
            where id = :id
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":configuration", $post['configuration'], PDO::PARAM_STR);
        $query->bindParam(":theme", $post['theme'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":platform", $post['platform'], PDO::PARAM_STR);
        $query->bindParam(":customer", $post['customer'], PDO::PARAM_STR);
        $query->bindParam(":etc", $post['etc'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO eyefidb.fs_platforms (configuration, theme, active, platform, customer, etc)
            VALUES (:configuration, :theme, :active, :platform, :customer, :etc)
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":configuration", $post['configuration'], PDO::PARAM_STR);
        $query->bindParam(":theme", $post['theme'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":platform", $post['platform'], PDO::PARAM_STR);
        $query->bindParam(":customer", $post['customer'], PDO::PARAM_STR);
        $query->bindParam(":etc", $post['etc'], PDO::PARAM_STR);
        $query->execute();

        
        return $this->db->lastInsertId();
        
    }

    public function delete($id){

        $mainQry = "DELETE FROM eyefidb.fs_platforms where id = :id";

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
