<?php

namespace EyefiDb\Api\FieldService\ServiceCategory;

use PDO;

class ServiceCategory
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAll(){
        $mainQry = "SELECT * from fs_service_category";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "SELECT * from fs_service_category where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_service_category 
                SET name = :name
                , description = :description
                , font_color = :font_color
                , bg_color = :bg_color
                , active = :active
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":name", $post['name'], PDO::PARAM_STR);
        $query->bindParam(":description", $post['description'], PDO::PARAM_STR);
        $query->bindParam(":font_color", $post['font_color'], PDO::PARAM_STR);
        $query->bindParam(":bg_color", $post['bg_color'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO fs_service_category (name, description, font_color, bg_color, active)
            VALUES (:name, :description, :font_color, :bg_color, :active)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":name", $post['name'], PDO::PARAM_STR);
        $query->bindParam(":description", $post['description'], PDO::PARAM_STR);
        $query->bindParam(":font_color", $post['font_color'], PDO::PARAM_STR);
        $query->bindParam(":bg_color", $post['bg_color'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->execute();
        return $this->db->lastInsertId();
        
    }

    public function delete($id){

        $mainQry = "DELETE FROM fs_service_category where id = :id";
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
