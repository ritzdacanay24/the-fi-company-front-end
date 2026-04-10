<?php


namespace EyefiDb\Api\qad_tables;

use PDO;
use PDOException;

class QadTables
{

    protected $db;

    public function __construct($dbQad)
    {

        $this->db = $dbQad;
    }

    public function Query($qry)
    {

        $query = $this->db->prepare($qry['query']);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }

    public function Test($tableName)
    {

        $qry = '
				select TOP 2 *
				from ' . $tableName . '
			';

        $query = $this->db->prepare($qry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        return $result;
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
