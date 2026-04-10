<?php

namespace EyefiDb\Api\FieldService\Property;

use PDO;

class Property
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAll(){
        $mainQry = "SELECT * from fs_property_det";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "SELECT * from fs_property_det where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_property_det 
                SET property = :property
                , address1 = :address1
                , address2 = :address2
                , city = :city
                , state = :state
                , zip_code = :zip_code
                , country = :country
                , property_phone = :property_phone
                , active = :active
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":property", $post['property'], PDO::PARAM_STR);
        $query->bindParam(":address1", $post['address1'], PDO::PARAM_STR);
        $query->bindParam(":address2", $post['address2'], PDO::PARAM_STR);
        $query->bindParam(":city", $post['city'], PDO::PARAM_STR);
        $query->bindParam(":state", $post['state'], PDO::PARAM_STR);
        $query->bindParam(":zip_code", $post['zip_code'], PDO::PARAM_STR);
        $query->bindParam(":country", $post['country'], PDO::PARAM_STR);
        $query->bindParam(":property_phone", $post['property_phone'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO fs_property_det (property, address1, address2, city, state, zip_code, country, property_phone, active)
            VALUES (:property, :address1, :address2, :city, :state, :zip_code, :country, :property_phone, :active)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":property", $post['property'], PDO::PARAM_STR);
        $query->bindParam(":address1", $post['address1'], PDO::PARAM_STR);
        $query->bindParam(":address2", $post['address2'], PDO::PARAM_STR);
        $query->bindParam(":city", $post['city'], PDO::PARAM_STR);
        $query->bindParam(":state", $post['state'], PDO::PARAM_STR);
        $query->bindParam(":zip_code", $post['zip_code'], PDO::PARAM_STR);
        $query->bindParam(":country", $post['country'], PDO::PARAM_STR);
        $query->bindParam(":property_phone", $post['property_phone'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->execute();
        return $this->db->lastInsertId();
        
    }

    public function delete($id){

        $mainQry = "DELETE FROM fs_property_det where id = :id";
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
