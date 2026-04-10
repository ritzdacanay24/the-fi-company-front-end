<?php

namespace EyefiDb\Api\FieldService\Client;

use EyefiDb\Api\FieldService\ClientDetail\ClientDetail;
use PDO;

class Client
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
        $this->client_detail = new ClientDetail($db);
        $this->typesToCheck = ['contact_details', 'email_details'];
    }

    public function getClientIdDetails($client_id){

        $mainQry = "SELECT * from fs_scheduler_view where ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;

    }

    public function createClientAndClientDetails($post){

        $this->db->beginTransaction();
  
        try {  
            $lastInsertId = $this->create($post);

            foreach($this->typesToCheck as $typesToCheckRow){
                foreach($post[$typesToCheckRow] as $row){
                    $row['fs_client_id'] = $lastInsertId;
                    $this->client_detail->create($row);
                }
            }
            
            $this->db->commit();

            return $lastInsertId;
  
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function updateClientAndClientDetails($id, $post){

        $this->db->beginTransaction();
  
        try {  
            $this->update($id, $post);

            foreach($this->typesToCheck as $typesToCheckRow){
                foreach($post[$typesToCheckRow] as $row){
                    if($row['active'] == 0){
                        $this->client_detail->delete($row['id']);
                    }else if($row['id'] == ''){
                        $this->client_detail->create($row);
                    }else{
                        $this->client_detail->update($row['id'], $row);
                    }
                }
            }

            $this->db->commit();

            return $post;
  
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getClientAndClientDetails($id){        
        $clientInfo = $this->getById($id);
        $clientDetailInfo = $this->client_detail->getByClientIdPhoneAndEmail($id);

        $clientInfo['phone'] = $clientDetailInfo['phone'];
        $clientInfo['email'] = $clientDetailInfo['email'];

        return $clientInfo;
    }
  

    public function getAll(){

        $mainQry = "SELECT * 
        FROM fs_client a
        
        LEFT JOIN (
        SELECT MAX(case when TYPE = 'email' THEN VALUE END) email
                        , MAX(case when TYPE = 'phone' THEN VALUE END) phone
                        , fs_client_id
                    from fs_client_det 
                    where prime = 1
                    GROUP BY fs_client_id
        ) b ON b.fs_client_id = a.id";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getActive(){

        $mainQry = "SELECT * from fs_client where active = 1";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "SELECT * from fs_client where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_client 
                SET full_name = :full_name
                , email = :email
                , company_name = :company_name
                , use_company_name_as_primary_name = :use_company_name_as_primary_name
                , quote_follow_up = :quote_follow_up
                , appointment_reminder = :appointment_reminder
                , job_follow_up = :job_follow_up
                , invoice_follow_up = :invoice_follow_up
                , active = :active
            where id = :id
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":full_name", $post['full_name'], PDO::PARAM_STR);
        $query->bindParam(":email", $post['email'], PDO::PARAM_STR);
        $query->bindParam(":company_name", $post['company_name'], PDO::PARAM_STR);
        $query->bindParam(":use_company_name_as_primary_name", $post['use_company_name_as_primary_name'], PDO::PARAM_STR);
        $query->bindParam(":quote_follow_up", $post['quote_follow_up'], PDO::PARAM_STR);
        $query->bindParam(":appointment_reminder", $post['appointment_reminder'], PDO::PARAM_STR);
        $query->bindParam(":job_follow_up", $post['job_follow_up'], PDO::PARAM_STR);
        $query->bindParam(":invoice_follow_up", $post['invoice_follow_up'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO fs_client (full_name, email, company_name, use_company_name_as_primary_name, quote_follow_up, appointment_reminder, job_follow_up, invoice_follow_up, active)
            VALUES (:full_name, :email, :company_name, :use_company_name_as_primary_name, :quote_follow_up, :appointment_reminder, :job_follow_up, :invoice_follow_up, :active)
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":full_name", $post['full_name'], PDO::PARAM_STR);
        $query->bindParam(":email", $post['email'], PDO::PARAM_STR);
        $query->bindParam(":company_name", $post['company_name'], PDO::PARAM_STR);
        $query->bindParam(":use_company_name_as_primary_name", $post['use_company_name_as_primary_name'], PDO::PARAM_STR);
        $query->bindParam(":quote_follow_up", $post['quote_follow_up'], PDO::PARAM_STR);
        $query->bindParam(":appointment_reminder", $post['appointment_reminder'], PDO::PARAM_STR);
        $query->bindParam(":job_follow_up", $post['job_follow_up'], PDO::PARAM_STR);
        $query->bindParam(":invoice_follow_up", $post['invoice_follow_up'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->execute();

        return $this->db->lastInsertId();
        
    }

    public function delete($id){
        $mainQry = "DELETE FROM fs_client where id = :id";
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
