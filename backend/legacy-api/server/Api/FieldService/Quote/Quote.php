<?php

namespace EyefiDb\Api\FieldService\Quote;

use EyefiDb\Api\FieldService\Client\Client;
use EyefiDb\Api\FieldService\QuoteDetails\QuoteDetails;
use PDO;

class Quote
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
        $this->QuoteDetails = new QuoteDetails($db);
        $this->Client = new Client($db);
    }
    
    public function updateQuote($id, $post){
        try { 

            $this->db->beginTransaction();

            $this->update($id, $post);

            foreach($post['line_items'] as $row){
                if($row['active'] == 0){
                    $this->QuoteDetails->delete($row['id']);
                }else if($row['id'] == ""){
                    $this->QuoteDetails->create($row);
                }else{
                    $this->QuoteDetails->update($row['id'],$row);
                }
            }
            
            $this->db->commit();

        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function createQuote($post){
        try { 

            $this->db->beginTransaction();

            $lastInsertId = $this->create($post);

            foreach($post['line_items'] as $row){
                $row['quote_id'] = $lastInsertId;
                $this->QuoteDetails->create($row);
            }
            
            $this->db->commit();

        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getQuoteInformation($id){

        $quote = $this->getById($id);
        $quoteLines = $this->QuoteDetails->getByQuoteId($id);

        $client  = new \stdClass();
        $request  = new \stdClass();
        if(ISSET($quote['client_id'])){
            $client = $this->Client->getById($quote['client_id']);
        }

        return array (
            "quote" => $quote,
            "line_items" => $quoteLines,
            "client" => $client,
            "info" => $request,
        );

    }

    public function getQuotesByRequestId($request_id){         
        try { 
            $mainQry = "SELECT * from fs_quotes where request_id = :request_id";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(":request_id", $request_id, PDO::PARAM_STR);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getClientDetailsById($id){         
        $quote = $this->getByClientId($id);

        $line_items = [];
        if(ISSET($quote['id'])){
            $line_items = $this->QuoteDetails->getByQuoteId($quote['id']);
        }

        return array(
            "quote" => $quote,
            "line_items" => $line_items
        );
    }

    public function getByClientId($id){ 
        try {         
            $mainQry = "SELECT * from fs_quotes where client_id = :id";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(":id", $id, PDO::PARAM_STR);
            $query->execute();
            $result = $query->fetch(PDO::FETCH_ASSOC);
            return $result;
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getAll(){
        try { 
            $mainQry = "SELECT * from fs_quotes";
            $query = $this->db->prepare($mainQry);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getById($id){
        try { 
            $mainQry = "SELECT * from fs_quotes where id = :id";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(":id", $id, PDO::PARAM_STR);
            $query->execute();
            return $query->fetch(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function update($id, $post){

        try { 
        $mainQry = "
            UPDATE fs_quotes 
                SET company_id = :company_id
                , title = :title
                , rate_opportunity = :rate_opportunity
                , client_id = :client_id
                , sub_total = :sub_total
                , discount_rate = :discount_rate
                , discount_rate_symbol = :discount_rate_symbol
                , tax_rate = :tax_rate
                , tax_rate_name = :tax_rate_name
                , deposit_rate = :deposit_rate
                , deposit_rate_symbol = :deposit_rate_symbol
                , total = :total
                , client_message = :client_message
                , active = :active
                , discount_active = :discount_active
                , discount_total = :discount_total
                , tax_rate_amount = :tax_rate_amount
                , request_id = :request_id
                , tax_rate_active = :tax_rate_active
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":company_id", $post['company_id'], PDO::PARAM_STR);
        $query->bindParam(":title", $post['title'], PDO::PARAM_STR);
        $query->bindParam(":rate_opportunity", $post['rate_opportunity'], PDO::PARAM_STR);
        $query->bindParam(":client_id", $post['client_id'], PDO::PARAM_STR);
        $query->bindParam(":sub_total", $post['sub_total'], PDO::PARAM_STR);
        $query->bindParam(":discount_rate", $post['discount_rate'], PDO::PARAM_STR);
        $query->bindParam(":discount_rate_symbol", $post['discount_rate_symbol'], PDO::PARAM_STR);
        $query->bindParam(":tax_rate", $post['tax_rate'], PDO::PARAM_STR);
        $query->bindParam(":tax_rate_name", $post['tax_rate_name'], PDO::PARAM_STR);
        $query->bindParam(":deposit_rate", $post['deposit_rate'], PDO::PARAM_STR);
        $query->bindParam(":deposit_rate_symbol", $post['deposit_rate_symbol'], PDO::PARAM_STR);
        $query->bindParam(":total", $post['total'], PDO::PARAM_STR);
        $query->bindParam(":client_message", $post['client_message'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":discount_active", $post['discount_active'], PDO::PARAM_STR);
        $query->bindParam(":discount_total", $post['discount_total'], PDO::PARAM_STR);
        $query->bindParam(":tax_rate_amount", $post['tax_rate_amount'], PDO::PARAM_STR);
        $query->bindParam(":request_id", $post['request_id'], PDO::PARAM_STR);
        $query->bindParam(":tax_rate_active", $post['tax_rate_active'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    } catch (\Exception $e) {
        $this->db->rollBack();
        http_response_code(500);
        die($e->getMessage());
    }
    }

    public function create($post){
        
        try {  
            
            $sql = "INSERT INTO fs_quotes (company_id, title, rate_opportunity, client_id, sub_total, discount_rate, discount_rate_symbol, tax_rate, tax_rate_name, deposit_rate, deposit_rate_symbol, total, client_message, created_date, active, created_by, discount_active, discount_total, tax_rate_amount, request_id, tax_rate_active) 
                VALUES (:company_id, :title, :rate_opportunity, :client_id, :sub_total, :discount_rate, :discount_rate_symbol, :tax_rate, :tax_rate_name, :deposit_rate, :deposit_rate_symbol, :total, :client_message, :created_date, :active, :created_by, :discount_active, :discount_total, :tax_rate_amount, :request_id, :tax_rate_active)";
            $query = $this->db->prepare($sql);
            $query->bindParam(":company_id", $post['company_id'], PDO::PARAM_STR);
            $query->bindParam(":title", $post['title'], PDO::PARAM_STR);
            $query->bindParam(":rate_opportunity", $post['rate_opportunity'], PDO::PARAM_STR);
            $query->bindParam(":client_id", $post['client_id'], PDO::PARAM_STR);
            $query->bindParam(":sub_total", $post['sub_total'], PDO::PARAM_STR);
            $query->bindParam(":discount_rate", $post['discount_rate'], PDO::PARAM_STR);
            $query->bindParam(":discount_rate_symbol", $post['discount_rate_symbol'], PDO::PARAM_STR);
            $query->bindParam(":tax_rate", $post['tax_rate'], PDO::PARAM_STR);
            $query->bindParam(":tax_rate_name", $post['tax_rate_name'], PDO::PARAM_STR);
            $query->bindParam(":deposit_rate", $post['deposit_rate'], PDO::PARAM_STR);
            $query->bindParam(":deposit_rate_symbol", $post['deposit_rate_symbol'], PDO::PARAM_STR);
            $query->bindParam(":total", $post['total'], PDO::PARAM_STR);
            $query->bindParam(":client_message", $post['client_message'], PDO::PARAM_STR);
            $query->bindParam(":created_date", $post['created_date'], PDO::PARAM_STR);
            $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
            $query->bindParam(":created_by", $post['created_by'], PDO::PARAM_STR);
            $query->bindParam(":discount_active", $post['discount_active'], PDO::PARAM_STR);
            $query->bindParam(":discount_total", $post['discount_total'], PDO::PARAM_STR);
            $query->bindParam(":tax_rate_amount", $post['tax_rate_amount'], PDO::PARAM_STR);
            $query->bindParam(":request_id", $post['request_id'], PDO::PARAM_STR);
            $query->bindParam(":tax_rate_active", $post['tax_rate_active'], PDO::PARAM_STR);
            $query->execute();

            return $this->db->lastInsertId();
  
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }

    }

    public function delete($id){

        try { 
            $mainQry = "DELETE FROM fs_quotes where id = :id";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(":id", $id, PDO::PARAM_STR);
            $query->execute();
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
