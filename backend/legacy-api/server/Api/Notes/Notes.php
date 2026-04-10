<?php

namespace EyefiDb\Api\Notes;

use PDO;

class Notes
{

	protected $db;
    public $sessionId;

	public function __construct($db)
	{
		$this->db = $db;
	}

	public function insert($post)
	{
		$qry = "
            INSERT INTO eyefidb.notes(
                notes
                , createdBy
                , uniqueId
                , type
            ) 
            values(
                :notes
                , :createdBy
                , :uniqueId
                , :type
            )
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':notes', $post['notes'], PDO::PARAM_STR);
        $stmt->bindParam(':createdBy', $post['createdBy'], PDO::PARAM_INT);
        $stmt->bindParam(':uniqueId', $post['uniqueId'], PDO::PARAM_STR);
        $stmt->bindParam(':type', $post['type'], PDO::PARAM_STR);
        $stmt->execute();
        return $this->db->lastInsertId();    
	}

    
	public function getById($so, $userId)
	{
        
            $qry = "
                SELECT a.id, 
                    a.notes, 
                    a.createdDate, 
                    a.createdBy, 
                    concat(b.first, ' ', b.last) createdByName, 
                    a.uniqueId,
                    a.type
                FROM eyefidb.notes a 
                LEFT JOIN db.users b ON b.id = a.createdBy
                WHERE uniqueId = :so 
                    AND a.type = 'Sales Order'
                    and a.createdBy = :userId
            ";
            $query = $this->db->prepare($qry);
            $query->bindParam(':so', $so, PDO::PARAM_STR);
            $query->bindParam(':userId', $userId, PDO::PARAM_STR);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
    }
}
