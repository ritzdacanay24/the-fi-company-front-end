<?php

namespace EyefiDb\Api\FieldService\ClientDetail;

use PDO;

class ClientDetail
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }
    
    //Custom
    public function getByClientIdPhoneAndEmail($clientId){

        $mainQry = "
            SELECT MAX(case when TYPE = 'email' THEN VALUE END) email
                , MAX(case when TYPE = 'phone' THEN VALUE END) phone
            from fs_client_det 
            where fs_client_id = :id
            AND prime = 1
            GROUP BY fs_client_id
        ";
        
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $clientId, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function getByClientId($clientId, $isPrime = false){

        $mainQry = "
            SELECT * from fs_client_det 
            where fs_client_id = :id
        ";
        
        if($isPrime) $mainQry .= " AND prime = 1";
        
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $clientId, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    // Default CRUD
    public function getAll(){

        $mainQry = "SELECT * from fs_client_det";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getActive(){

        $mainQry = "SELECT * from fs_client_det where active = 1";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "SELECT * from fs_client_det where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_client_det 
            SET fs_client_id = :fs_client_id
                , type = :type
                , prime = :prime
                , value = :value
                , active = :active
                , typeOf = :typeOf
            where id = :id
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":fs_client_id", $post['fs_client_id'], PDO::PARAM_STR);
        $query->bindParam(":type", $post['type'], PDO::PARAM_STR);
        $query->bindParam(":prime", $post['prime'], PDO::PARAM_STR);
        $query->bindParam(":value", $post['value'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":typeOf", $post['typeOf'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        
    }

    public function create($post){

        try{
            $mainQry = "
                INSERT INTO fs_client_det (fs_client_id, type, prime, value, active, typeOf)
                VALUES (:fs_client_id, :type, :prime, :value, :active, :typeOf)
            ";

            $query = $this->db->prepare($mainQry);
            $query->bindParam(":fs_client_id", $post['fs_client_id'], PDO::PARAM_STR);
            $query->bindParam(":type", $post['type'], PDO::PARAM_STR);
            $query->bindParam(":prime", $post['prime'], PDO::PARAM_STR);
            $query->bindParam(":value", $post['value'], PDO::PARAM_STR);
            $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
            $query->bindParam(":typeOf", $post['typeOf'], PDO::PARAM_STR);
            $query->execute();

            return $this->db->lastInsertId();
            } catch (\PDOException $e) {
                http_response_code(500);
                die($e->getMessage());
            }
        }

    public function delete($id){
        $mainQry = "DELETE FROM fs_client_det where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
