<?php

namespace EyefiDb\Api\FieldService\ManageTeam;

use PDO;

class ManageTeam
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAll(){
        $mainQry = "SELECT * from users where area = 'Field Service'";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "SELECT * from users where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE users 
                SET category = :category
                , description = :description
                , active = :active
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":category", $post['category'], PDO::PARAM_STR);
        $query->bindParam(":description", $post['description'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO users (category, description, active)
            VALUES (:category, :description, :active)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":category", $post['category'], PDO::PARAM_STR);
        $query->bindParam(":description", $post['description'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->execute();
        return $this->db->lastInsertId();
        
    }

    public function delete($id){

        $mainQry = "DELETE FROM users where id = :id";
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
