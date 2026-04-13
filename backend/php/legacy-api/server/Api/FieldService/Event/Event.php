<?php

namespace EyefiDb\Api\FieldService\Event;

use PDO;

class Event
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }


    public function getAll(){

        $mainQry = "SELECT * from fs_event_type";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function getById($id){

        $mainQry = "SELECT * from fs_event_type where id = :id";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);
        return $result;
    }

    public function update($id, $post){

        $mainQry = "
            UPDATE fs_event_type 
                SET event_name = :event_name
                , description = :description
                , isEvent = :isEvent
                , isTravel = :isTravel
                , event_type = :event_type
                , isBreak = :isBreak
                , active = :active
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":event_name", $post['event_name'], PDO::PARAM_STR);
        $query->bindParam(":description", $post['description'], PDO::PARAM_STR);
        $query->bindParam(":isEvent", $post['isEvent'], PDO::PARAM_STR);
        $query->bindParam(":isTravel", $post['isTravel'], PDO::PARAM_STR);
        $query->bindParam(":event_type", $post['event_type'], PDO::PARAM_STR);
        $query->bindParam(":isBreak", $post['isBreak'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
    }

    public function create($post){

        $mainQry = "
            INSERT INTO fs_event_type (event_name, description, isEvent, isTravel, event_type, isBreak, active)
            VALUES (:event_name, :description, :isEvent, :isTravel, :event_type, :isBreak, :active)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":event_name", $post['event_name'], PDO::PARAM_STR);
        $query->bindParam(":description", $post['description'], PDO::PARAM_STR);
        $query->bindParam(":isEvent", $post['isEvent'], PDO::PARAM_STR);
        $query->bindParam(":isTravel", $post['isTravel'], PDO::PARAM_STR);
        $query->bindParam(":event_type", $post['event_type'], PDO::PARAM_STR);
        $query->bindParam(":isBreak", $post['isBreak'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_STR);
        $query->execute();

        
        return $this->db->lastInsertId();
        
    }

    public function delete($id){

        $mainQry = "DELETE FROM fs_event_type where id = :id";
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
