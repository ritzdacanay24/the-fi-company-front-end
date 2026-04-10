<?php

namespace EyefiDb\Api\WedgeForm;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;

class WedgeForm
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date(" Y-m-d H:i:s", time());
    }

    public function getByWorkOrderNumber($workOrderNumber)
    {
        $qry = "
            SELECT a.*, b.full_name created_by_name
            FROM eyefidb.wedge_form a
            LEFT JOIN db.users_view b on b.id = a.created_by
            WHERE work_order_number = :work_order_number
            ORDER BY id DESC
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':work_order_number', $workOrderNumber, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function insert($data)
    {
        $qry = "
            INSERT INTO eyefidb.wedge_form (
                part_number
                , description
                , description_of_rework
                , packaging_labeling_details
                , part_rework 
                , created_by 
                , work_order_number 
            ) VALUES (
                :part_number
                , :description
                , :description_of_rework
                , :packaging_labeling_details
                , :part_rework 
                , :created_by 
                , :work_order_number 
            )
        ";
        $stmt = $this->db->prepare($qry);

        $stmt->bindParam(':part_number', $data['part_number'], PDO::PARAM_STR);
        $stmt->bindParam(':description', $data['description'], PDO::PARAM_STR);
        $stmt->bindParam(':description_of_rework', $data['description_of_rework'], PDO::PARAM_STR);
        $stmt->bindParam(':packaging_labeling_details', $data['packaging_labeling_details'], PDO::PARAM_STR);
        $stmt->bindParam(':created_by', $data['created_by'], PDO::PARAM_STR);
        $stmt->bindParam(':work_order_number', $data['work_order_number'], PDO::PARAM_STR);
        $stmt->bindParam(':part_rework', $data['part_rework'], PDO::PARAM_STR);
        $stmt->execute();
    }

    public function create($data){
        $this->insert($data);
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
