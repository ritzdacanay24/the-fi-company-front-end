<?php

namespace EyefiDb\Api\FieldService\Request;

use EyefiDb\Api\FieldService\Quote\Quote;
use EyefiDb\Api\FieldService\Client\Client;
use PDO;

class Request
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
        $this->Client = new CLient($db);
        $this->Quote = new Quote($db);
    }

    public function getPropertyById($id){
        $mainQry = "
            select a.*
            from fs_property_det a
            where a.id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

     public function request_work_details($id){

        $mainQry = "
            select a.*, b.full_name, status_name
            from fs_requests a
            LEFT JOIN fs_client b ON b.id = a.client_id
            LEFT JOIN fs_status c ON c.id = a.status_id
            where a.id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $request = $query->fetch(PDO::FETCH_ASSOC);
        
        return array(
            "request" => $request,
            "client" => $this->Client->getById($request['client_id']),
            "property" =>  $this->getPropertyById($request['property_id']),
            "quotes" =>  $this->Quote->getQuotesByRequestId($request['id'])
        );

    }

    public function getAll(){
        $mainQry = "SELECT * from fs_requests";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "
        SELECT a.*, b.full_name
        from fs_requests a
        LEFT JOIN fs_client b ON b.id = a.client_id
        where a.id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_requests 
                SET title = :title
                , details = :details
                , available_date = :available_date
                , another_available_date = :another_available_date
                , arrival_times = :arrival_times
                , active = :active
                , status_id = :status_id
                , client_id = :client_id
                , property_id = :property_id
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":title", $post['title'], PDO::PARAM_STR);
        $query->bindParam(":details", $post['details'], PDO::PARAM_STR);
        $query->bindParam(":available_date", $post['available_date'], PDO::PARAM_STR);
        $query->bindParam(":another_available_date", $post['another_available_date'], PDO::PARAM_STR);
        $query->bindParam(":arrival_times", $post['arrival_times'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":status_id", $post['status_id'], PDO::PARAM_STR);
        $query->bindParam(":client_id", $post['client_id'], PDO::PARAM_STR);
        $query->bindParam(":property_id", $post['property_id'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO fs_requests (title, details, available_date, another_available_date, arrival_times, active, status_id, client_id, property_id)
            VALUES (:title, :details, :available_date, :another_available_date, :arrival_times, :active, :status_id, :client_id, :property_id)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":title", $post['title'], PDO::PARAM_STR);
        $query->bindParam(":details", $post['details'], PDO::PARAM_STR);
        $query->bindParam(":available_date", $post['available_date'], PDO::PARAM_STR);
        $query->bindParam(":another_available_date", $post['another_available_date'], PDO::PARAM_STR);
        $query->bindParam(":arrival_times", $post['arrival_times'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":status_id", $post['status_id'], PDO::PARAM_STR);
        $query->bindParam(":client_id", $post['client_id'], PDO::PARAM_STR);
        $query->bindParam(":property_id", $post['property_id'], PDO::PARAM_STR);
        $query->execute();
        return $this->db->lastInsertId();
        
    }

    public function delete($id){

        $mainQry = "DELETE FROM fs_requests where id = :id";
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
