<?php

namespace EyefiDb\Api\qad_tables;
use PDO; 
use PDOException;	

class QadTableSql
{

    protected $db;
    public $sessionId;

    public function __construct($db)
    {

        $this->db = $db;
        $this->nowDate = date(" Y-m-d H:i:s", time());
    }

    public function SaveQuery($q)
    {

        $qry = '
				INSERT INTO db.queries(
					query
					, createdDate
					, createdBy 
				) VALUES (
					:query
					, :createdDate
					, :createdBy 
				)
			';
        $query = $this->db->prepare($qry);
        $query->bindParam(':query', $q, PDO::PARAM_STR);
        $query->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
        $query->bindParam(':createdBy', $this->sessionId, PDO::PARAM_INT);

        $results = false;
        if ($query->execute()) {
            $results = true;
        }

        return $results;
    }

    public function SaveTable($id, $status, $noData)
    {

        $qry = '
				UPDATE db.qadTableNames
				SET status = :status
					, noData = :noData
				WHERE id = :id
			';
        $query = $this->db->prepare($qry);
        $query->bindParam(':status', $status, PDO::PARAM_STR);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->bindParam(':noData', $noData, PDO::PARAM_STR);

        $results = false;
        if ($query->execute()) {
            $results = true;
        }

        return $results;
    }

    public function Read()
    {

        $obj = array();
        $qry = '
				select id
					, description
					, tbl
					, status
					, noData
				from db.qadTableNames
			';
        $stmt = $this->db->prepare($qry);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($result as $key => $field) {
            $result[$key]['status'] = $result[$key]['status'] == 1 ? true : false;
            $result[$key]['noData'] = $result[$key]['noData'] == 1 ? true : false;
        }

        $qry = '
				select a.id
					, a.query 
                    , a.createdDate 
                    , concat(b.first, " ", b.last) createdBy
                from db.queries a
                LEFT JOIN db.users b ON b.id = a.createdBy
                ORDER BY a.id DESC
			';
        $stmt = $this->db->prepare($qry);
        $stmt->execute();
        $result1 = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $obj = array(
            "result" => $result, "queries" => $result1
        );

        return $obj;
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
