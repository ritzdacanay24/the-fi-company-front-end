<?php

namespace EyefiDb\Api\FieldService\Company;

use EyefiDb\Api\FieldService\VatSettings\VatSettings;
use PDO;

class Company
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
        $this->vat_settings = new VatSettings($db);
    }

    public function updateCompanySettings($id, $post){
      

        $this->db->beginTransaction();
  
        try {  
            $this->update($id, $post);

            foreach($post['vat_settings'] as $row){
                if($row['active'] == 0){
                    $this->vat_settings->delete($row['id']);
                }else if($row['id'] == ''){
                    $this->vat_settings->create($row);
                }else{
                    $this->vat_settings->update($row['id'], $row);
                }
            }

            $this->db->commit();

            return $post;
  
        } catch (\Exception $e) {
            http_response_code(500);
            $this->db->rollBack();
            echo "Failed: " . $e->getMessage();
            die($e->getMessage());
        }
    }


    public function getClientAndClientDetails($id){        
        $clientInfo = $this->getById($id);      
        $clientInfo['vat_settings'] = $this->vat_settings->getCompanyId($id);
        
        $clientInfo['business_hours'] = json_decode($clientInfo['business_hours'], false);

        return $clientInfo;
    }

    public function getAll(){

        $mainQry = "SELECT * from fs_company_details";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getActive(){

        $mainQry = "SELECT * from fs_company_details where active = 1";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "
            SELECT * from fs_company_details where id = :id
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_company_details 
                SET company_name = :company_name
                , phone_number = :phone_number
                , website_url = :website_url
                , email_address = :email_address
                , address_1 = :address_1
                , address_2 = :address_2
                , city = :city
                , state = :state
                , zip_code = :zip_code
                , country = :country
                , timezone = :timezone
                , date_format = :date_format
                , time_format = :time_format
                , first_day_of_week = :first_day_of_week
                , active = :active
                , tax_id_name = :tax_id_name
                , tax_id_number = :tax_id_number
                , business_hours = :business_hours
            where id = :id
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":company_name", $post['company_name'], PDO::PARAM_STR);
        $query->bindParam(":phone_number", $post['phone_number'], PDO::PARAM_STR);
        $query->bindParam(":website_url", $post['website_url'], PDO::PARAM_STR);
        $query->bindParam(":email_address", $post['email_address'], PDO::PARAM_STR);
        $query->bindParam(":address_1", $post['address_1'], PDO::PARAM_STR);
        $query->bindParam(":address_2", $post['address_2'], PDO::PARAM_STR);
        $query->bindParam(":city", $post['city'], PDO::PARAM_STR);
        $query->bindParam(":state", $post['state'], PDO::PARAM_STR);
        $query->bindParam(":zip_code", $post['zip_code'], PDO::PARAM_STR);
        $query->bindParam(":country", $post['country'], PDO::PARAM_STR);
        $query->bindParam(":timezone", $post['timezone'], PDO::PARAM_STR);
        $query->bindParam(":date_format", $post['date_format'], PDO::PARAM_STR);
        $query->bindParam(":time_format", $post['time_format'], PDO::PARAM_STR);
        $query->bindParam(":first_day_of_week", $post['first_day_of_week'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":tax_id_name", $post['tax_id_name'], PDO::PARAM_STR);
        $query->bindParam(":tax_id_number", $post['tax_id_number'], PDO::PARAM_STR);
        $query->bindParam(":business_hours", $post['business_hours'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO fs_company_details(company_name, phone_number, website_url, email_address, address_1, address_2, city, state, zip_code, country, timezone, date_format, time_format, first_day_of_week, active, tax_id_name, tax_id_number, business_hours) 
            VALUES (:company_name, :phone_number, :website_url, :email_address, :address_1, :address_2, :city, :state, :zip_code, :country, :timezone, :date_format, :time_format, :first_day_of_week, :active, :tax_id_name, :tax_id_number, :business_hours)
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":company_name", $post['company_name'], PDO::PARAM_STR);
        $query->bindParam(":phone_number", $post['phone_number'], PDO::PARAM_STR);
        $query->bindParam(":website_url", $post['website_url'], PDO::PARAM_STR);
        $query->bindParam(":email_address", $post['email_address'], PDO::PARAM_STR);
        $query->bindParam(":address_1", $post['address_1'], PDO::PARAM_STR);
        $query->bindParam(":address_2", $post['address_2'], PDO::PARAM_STR);
        $query->bindParam(":city", $post['city'], PDO::PARAM_STR);
        $query->bindParam(":state", $post['state'], PDO::PARAM_STR);
        $query->bindParam(":zip_code", $post['zip_code'], PDO::PARAM_STR);
        $query->bindParam(":country", $post['country'], PDO::PARAM_STR);
        $query->bindParam(":timezone", $post['timezone'], PDO::PARAM_STR);
        $query->bindParam(":date_format", $post['date_format'], PDO::PARAM_STR);
        $query->bindParam(":time_format", $post['time_format'], PDO::PARAM_STR);
        $query->bindParam(":first_day_of_week", $post['first_day_of_week'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":tax_id_name", $post['tax_id_name'], PDO::PARAM_STR);
        $query->bindParam(":tax_id_number", $post['tax_id_number'], PDO::PARAM_STR);
        $query->bindParam(":business_hours", $post['business_hours'], PDO::PARAM_STR);
        $query->execute();

        
        return $this->db->lastInsertId();
        
    }

    public function delete($id){

        $mainQry = "DELETE FROM fs_company_details where id = :id";

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
