<?php

namespace EyefiDb\Api\FieldService;

use PDO;
use PDOException;

class TripExpense
{

    protected $db;
    public $sessionId;
    public $nowDateToday;
    public $nowDate;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d H:i:s", time());
        $this->nowDateToday = date("Y-m-d", time());
    }

    public function getFileName($id)
    {
        $qry = "
            SELECT fileName
            FROM eyefidb.fs_workOrderTrip
            WHERE id = :id
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    function upload(){
        
        $filename = basename($_FILES['file']['name']);
        $file1 = $_FILES['file']['tmp_name'];

        $time = time();        
        
        $target = '/var/www/html/attachments/fieldService/' . $time . "_" . $filename;

        $fileName_ = $time . "_" . $filename;

        $move = move_uploaded_file($file1, $target);


        if($move){
            return $fileName_;
        }else{
            return false;
        }

    }

    

    
    public function updateExpense($post)
    {

        $fileName = !$post['fileName'] || $post['fileName'] == "" || $post['fileName'] == "null" ?  null : $post['fileName'];

        if($_FILES){
            $res = $this->getFileName($post['id']);
            if($res && $res['fileName']){
                $fileNameExist = '/var/www/html/attachments/fieldService/' .$res['fileName'];
                if(file_exists($fileNameExist)){
                    unlink($fileNameExist);
                    //echo 'file found';
                }else{
                    //echo 'file NOT found';

                }
            }
            $fileName = $this->upload();
        }

        //if user is only removing image then remove image from file and clear data field
        if(!$fileName){
            $res = $this->getFileName($post['id']);
            if($res && $res['fileName']){
                $fileNameExist = '/var/www/html/attachments/fieldService/' .$res['fileName'];
                if(file_exists($fileNameExist)){
                    unlink($fileNameExist);
                    //echo 'file found';
                }else{
                    //echo 'file NOT found';
                }
            }
        }



        $locale = ISSET($post['locale']) ? $post['locale'] : null;
        $date = ISSET($post['date']) ? $post['date'] : null;
        $time = ISSET($post['time']) ? $post['time'] : null;


        try {
            $mainQry = "
                UPDATE eyefidb.fs_workOrderTrip
                set name = :name,
                    cost = :cost,
                    vendor_name = :vendor_name, 
                    fileName = :fileName, 
                    locale = :locale, 
                    date = :date, 
                    time = :time
                where id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':name', $post['name'], PDO::PARAM_STR);
            $query->bindParam(':cost', $post['cost'], PDO::PARAM_STR);
            $query->bindParam(':vendor_name', $post['vendor_name'], PDO::PARAM_STR);
            $query->bindParam(':fileName', $fileName, PDO::PARAM_STR);
            $query->bindParam(':locale', $locale, PDO::PARAM_STR);
            $query->bindParam(':date', $date, PDO::PARAM_STR);
            $query->bindParam(':time', $time, PDO::PARAM_STR);
            $query->bindParam(':id', $post['id'], PDO::PARAM_STR);
            $query->execute();

        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function createExpense($post)
    {

        $fileName_ = null;
        if($_FILES){
            $fileName_ = $this->upload();
        }

        $locale = ISSET($post['locale']) ? $post['locale'] : null;
        $date = ISSET($post['date']) ? $post['date'] : null;
        $time = ISSET($post['time']) ? $post['time'] : null;

        
       

        try {
            $mainQry = "
                INSERT INTO eyefidb.fs_workOrderTrip (name, cost, workOrderId, vendor_name, fileName, locale, date, time, created_by, created_date) 
                VALUES(:name, :cost, :workOrderId, :vendor_name, :fileName, :locale, :date, :time, :created_by, :created_date)
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':name', $post['name'], PDO::PARAM_STR);
            $query->bindParam(':cost', $post['cost'], PDO::PARAM_STR);
            $query->bindParam(':workOrderId', $post['workOrderId'], PDO::PARAM_STR);
            $query->bindParam(':vendor_name', $post['vendor_name'], PDO::PARAM_STR);
            $query->bindParam(':fileName', $fileName_, PDO::PARAM_STR);
            $query->bindParam(':locale', $locale, PDO::PARAM_STR);
            $query->bindParam(':date', $date, PDO::PARAM_STR);
            $query->bindParam(':time', $time, PDO::PARAM_STR);
            $query->bindParam(':created_by', $this->sessionId, PDO::PARAM_STR);
            $query->bindParam(':created_date', $this->nowDate, PDO::PARAM_STR);
            $query->execute();
            $last_id = $this->db->lastInsertId();

            $mainQry = "
                select fs_scheduler_id
                from fs_workOrder
                where id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':id', $post['workOrderId'], PDO::PARAM_STR);
            $query->execute();
            $results =  $query->fetch(PDO::FETCH_ASSOC);

            $mainQry = "
                update eyefidb.fs_workOrderTrip
                set fs_scheduler_id = :fs_scheduler_id
                where id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':fs_scheduler_id', $results['fs_scheduler_id'], PDO::PARAM_STR);
            $query->bindParam(':id', $last_id, PDO::PARAM_STR);
            $query->execute();
            

        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function removeExpense($post)
    {
        if($_FILES){
            $res = $this->getFileName($post['id']);
            if($res){
                $fileNameExist = '/var/www/html/attachments/fieldService/' .$res['fileName'];
                if(file_exists($fileNameExist)){
                    unlink($fileNameExist);
                }
            }
        }

        try {
            $mainQry = "
                delete from eyefidb.fs_workOrderTrip
                where id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':id', $post['id'], PDO::PARAM_STR);
            $query->execute();

        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
