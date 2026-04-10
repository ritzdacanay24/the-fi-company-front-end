<?php

namespace EyefiDb\Api\FieldService\TripExpense;

use PDO;

class TripExpense
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAll(){
        $mainQry = "SELECT * from fs_trip_settings";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }
    
    function getByTicketId($ticketId){
        $mainQry = "
        SELECT *, concat('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) link
        from fs_workOrderTrip where workOrderId = :workOrderId
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":workOrderId", $ticketId, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "SELECT * from fs_trip_settings where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_trip_settings 
                SET category = :category
                , description = :description
                , accounting_code = :accounting_code
                , active = :active
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":category", $post['category'], PDO::PARAM_STR);
        $query->bindParam(":description", $post['description'], PDO::PARAM_STR);
        $query->bindParam(":accounting_code", $post['accounting_code'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO fs_trip_settings (category, description, active, accounting_code)
            VALUES (:category, :description, :active, :accounting_code)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":category", $post['category'], PDO::PARAM_STR);
        $query->bindParam(":description", $post['description'], PDO::PARAM_STR);
        $query->bindParam(":accounting_code", $post['accounting_code'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->execute();
        return $this->db->lastInsertId();
        
    }

    public function delete($id){

        $mainQry = "DELETE FROM fs_trip_settings where id = :id";
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
