<?php

namespace EyefiDb\Api\FieldService\Customer;

use PDO;

class Customer
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAll(){

        $mainQry = "SELECT * from fs_company_det";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getActive(){

        $mainQry = "SELECT * from fs_company_det where active = 1";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "
            SELECT * from fs_company_det where id = :id
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_company_det 
                SET name = :name
                , image = :image
                , active = :active
            where id = :id
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":name", $post['name'], PDO::PARAM_STR);
        $query->bindParam(":image", $post['image'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO fs_company_det (name, image, active)
            VALUES (:name, :image, :active)
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":name", $post['name'], PDO::PARAM_STR);
        $query->bindParam(":image", $post['image'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->execute();

        
        return $this->db->lastInsertId();
        
    }

    public function delete($id){

        $mainQry = "DELETE FROM fs_company_det where id = :id";

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
