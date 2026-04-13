<?php

namespace EyefiDb\Api\FieldService\QuoteDetails;

use PDO;

class QuoteDetails
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getByQuoteId($id){         
        $mainQry = "SELECT *, qt_det_qty*qt_det_price total from fs_qt_det where quote_id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAll(){
        $mainQry = "SELECT * from fs_qt_det";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "SELECT * from fs_qt_det where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_qt_det 
                SET qt_det_name = :qt_det_name
                , qt_det_desc = :qt_det_desc
                , qt_det_qty = :qt_det_qty
                , qt_det_price = :qt_det_price
                , qt_det_attachment = :qt_det_attachment
                , qt_det_type = :qt_det_type
                , qt_det_created_date = :qt_det_created_date
                , qt_det_created_by = :qt_det_created_by
                , quote_id = :quote_id
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":qt_det_name", $post['qt_det_name'], PDO::PARAM_STR);
        $query->bindParam(":qt_det_desc", $post['qt_det_desc'], PDO::PARAM_STR);
        $query->bindParam(":qt_det_qty", $post['qt_det_qty'], PDO::PARAM_STR);
        $query->bindParam(":qt_det_price", $post['qt_det_price'], PDO::PARAM_STR);
        $query->bindParam(":qt_det_attachment", $post['qt_det_attachment'], PDO::PARAM_STR);
        $query->bindParam(":qt_det_type", $post['qt_det_type'], PDO::PARAM_STR);
        $query->bindParam(":qt_det_created_date", $post['qt_det_created_date'], PDO::PARAM_STR);
        $query->bindParam(":qt_det_created_by", $post['qt_det_created_by'], PDO::PARAM_STR);
        $query->bindParam(":quote_id", $post['quote_id'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){
        
        try {  
            
            $sql = "INSERT INTO fs_qt_det (qt_det_name, qt_det_desc, qt_det_qty, qt_det_price, qt_det_attachment, qt_det_type, qt_det_created_date, qt_det_created_by, quote_id) 
            VALUES (:qt_det_name, :qt_det_desc, :qt_det_qty, :qt_det_price, :qt_det_attachment, :qt_det_type, :qt_det_created_date, :qt_det_created_by, :quote_id)";
            $query = $this->db->prepare($sql);
            $query->bindParam(":qt_det_name", $post['qt_det_name'], PDO::PARAM_STR);
            $query->bindParam(":qt_det_desc", $post['qt_det_desc'], PDO::PARAM_STR);
            $query->bindParam(":qt_det_qty", $post['qt_det_qty'], PDO::PARAM_STR);
            $query->bindParam(":qt_det_price", $post['qt_det_price'], PDO::PARAM_STR);
            $query->bindParam(":qt_det_attachment", $post['qt_det_attachment'], PDO::PARAM_STR);
            $query->bindParam(":qt_det_type", $post['qt_det_type'], PDO::PARAM_STR);
            $query->bindParam(":qt_det_created_date", $post['qt_det_created_date'], PDO::PARAM_STR);
            $query->bindParam(":qt_det_created_by", $post['qt_det_created_by'], PDO::PARAM_STR);
            $query->bindParam(":quote_id", $post['quote_id'], PDO::PARAM_STR);
            $query->execute();

            return $this->db->lastInsertId();
  
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }

    }

    public function delete($id){

        $mainQry = "DELETE FROM fs_qt_det where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
