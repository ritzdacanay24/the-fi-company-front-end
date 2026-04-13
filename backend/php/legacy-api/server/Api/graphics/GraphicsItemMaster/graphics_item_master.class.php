<?php

class GraphicsItemMaster
{

    protected $db;

    public function __construct($db)
    {

        $this->db = $db;
        $this->nowDate = date(" Y-m-d H:i:s", time());
    }

    public function addPlaceholder($text, $count = 0, $separator = ",")
    {
        $result = array();
        if ($count > 0) {
            for ($x = 0; $x < $count; $x++) {
                $result[] = $text;
            }
        }
        return implode($separator, $result);
    }


    public function updateRevision($data)
    {

        try {

            $sql = "INSERT INTO eyefidb.graphicsInventoryView (part_number, revision) VALUES(:part_number,:revision) ON DUPLICATE KEY UPDATE    
            part_number = VALUES(part_number), revision = VALUES(revision)";

            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':part_number', $data['part_number'], PDO::PARAM_STR);
            $stmt->bindParam(':revision', $data['revision'], PDO::PARAM_STR);
            return $stmt->execute();
        } catch (Exception $e) {
            http_response_code(500);
            echo  $e->getMessage();
            die();
        }
    }

    public function insert($tableName = null, $data = array())
    {

        try {
            $datafields = array_keys($data[0]);

            $insert_values = array();

            $question_marks[] = '('  . $this->addPlaceholder('?', sizeof($datafields)) . ')';

            $sql = "INSERT INTO " . $tableName . " (" . implode(",", $datafields) . ") VALUES " .
                implode(',', $question_marks);

            foreach ($data as $d) {


                $insert_values = array_values($d);
                $stmt = $this->db->prepare($sql);
                $stmt->execute($insert_values);

                $obj[] = array(
                    "details" => $d, "lastInsertId" => $this->db->lastInsertId()
                );
            }

            return $obj;
        } catch (Exception $e) {
            http_response_code(500);
            echo  $e->getMessage();
            die();
        }
    }

    public function updateById($id, $tableName, $data)
    {

        $errors = new \stdClass();
        if (empty($id)) {
            $errors->noId  = "No id found";
        }
        if (is_null($id)) {
            $errors->idIsNull  = "No id Is null";
        }
        if (empty($data)) {
            $errors->dataEmpty  = "dataEmpty";
        }

        $properties = array_filter(get_object_vars($errors));
        if (!empty($properties)) {
            return $errors;
            die();
        }

        $statement = "UPDATE " . $tableName . " SET ";
        $params = array();
        foreach ($data as $key => $value) {
            if ($key != 'id') {
                $statement .= "$key = :$key, ";
                $params[$key] = $value;
            }
        }
        $params["id"] = $id;
        $statement = substr($statement, 0, -2) . " WHERE id = :id";
        $stmt = $this->db->prepare($statement);
        $stmt->execute($params);


        $obj = array(
            "details" => $data, "updated" => $stmt->rowCount()
        );

        return $obj;
    }

    public function searchPartNumber($partnumber)
    {
        $mainQry = "
            select a.*
                , v.part_number 
                , v.revision
            FROM eyefidb.graphicsInventory a 
            LEFT JOIN eyefidb.graphicsInventoryView v ON a.SKU_Number = v.part_number
            where a.ID_Product = :part_number
		";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':part_number', $partnumber, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function ReadByItem($vars)
    {

        $mainQry = "
            select a.SKU_Number
                , a.Product 
                , a.ID_Product 
                , a.Account_Vendor
                , a.DD1_1
                , a.DD1_5
                , a.DD1_6
                , a.DD2_8
                , a.DD2_6
                , a.DD3_2
                , a.DD3_1
                , a.DD3_3
                , a.DD3_9
                , a.DI_Product_SQL
                , a.DD3_8
                , a.DD2_1
                , a.DD3_6
                , a.Category
                , a.Serial_Number
                , a.DD2_2
                , a.DD1_7
                , a.DD2_9
                , a.DD2_7
                , a.DD1_2
                , a.Image_Data
                , a.id
                , a.Status
                , v.part_number 
                , v.revision
            FROM eyefidb.graphicsInventory a 
            LEFT JOIN eyefidb.graphicsInventoryView v ON a.SKU_Number = v.part_number
            where 1 = 1
		";
        $mainQry1 = $mainQry;
        $param = array();

        if ($vars) {
            foreach ($vars as $key => $value) {
                if ($key != 'jwt') {
                    $param[$key] = '%' . $value . '%';
                    $bindKey = ':' . $key;
                    $mainQry1 .= ' AND ' . $key . ' LIKE ' . $bindKey;
                }
            }
        }

        $query = $this->db->prepare($mainQry1);
        $query->execute($param);
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        $found = 1;

        // if no records found, get default record. All values should be set to empty. This allows the html page to pull all the fields.
        if (count($result) == 0) {
            $mainQry2 = $mainQry;
            $mainQry2 .= ' AND a.id = 11607';
            $query = $this->db->prepare($mainQry2);
            $query->execute();
            $result = $query->fetchAll(PDO::FETCH_ASSOC);
            $found = 0;
        }

        $o = array(
            "details" => $result, "found" => $found
        );
        return $o;
    }
}
