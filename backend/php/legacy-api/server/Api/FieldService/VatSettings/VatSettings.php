<?php

namespace EyefiDb\Api\FieldService\VatSettings;

use PDO;

class VatSettings
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getCompanyId($company_id){
        $mainQry = "SELECT * from fs_vat_settings where company_id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $company_id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAll(){
        $mainQry = "SELECT * from fs_vat_settings";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "SELECT * from fs_vat_settings where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        try {  
            $mainQry = "
                UPDATE fs_vat_settings 
                    SET company_id = :company_id
                    , tax_name = :tax_name
                    , tax_rate = :tax_rate
                    , tax_description = :tax_description
                    , active = :active
                    , prime = :prime
                where id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(":company_id", $post['company_id'], PDO::PARAM_STR);
            $query->bindParam(":tax_name", $post['tax_name'], PDO::PARAM_STR);
            $query->bindParam(":tax_rate", $post['tax_rate'], PDO::PARAM_STR);
            $query->bindParam(":tax_description", $post['tax_description'], PDO::PARAM_STR);
            $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
            $query->bindParam(":prime", $post['prime'], PDO::PARAM_STR);
            $query->bindParam(":id", $id, PDO::PARAM_STR);
            $query->execute();
        } catch (\Exception $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function create($post){

        try {  
            $mainQry = "
                INSERT INTO fs_vat_settings (company_id, tax_name, tax_rate, tax_description, active, prime)
                VALUES (:company_id, :tax_name, :tax_rate, :tax_description, :active, :prime)
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(":company_id", $post['company_id'], PDO::PARAM_STR);
            $query->bindParam(":tax_name", $post['tax_name'], PDO::PARAM_STR);
            $query->bindParam(":tax_rate", $post['tax_rate'], PDO::PARAM_STR);
            $query->bindParam(":tax_description", $post['tax_description'], PDO::PARAM_STR);
            $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
            $query->bindParam(":prime", $post['prime'], PDO::PARAM_STR);
            $query->execute();
            return $this->db->lastInsertId();

        } catch (\Exception $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function delete($id){

        $mainQry = "DELETE FROM fs_vat_settings where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        return $id;
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
