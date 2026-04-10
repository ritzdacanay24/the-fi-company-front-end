<?php

namespace EyefiDb\Api\ItemMaintenance;

use PDO;
use PDOException;

class ItemMaintenance
{

    protected $db;

    public function __construct($dbQad, $db)
    {
        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->todayDate = date("Y-m-d");
    }

    public function getPartNumbers()
    {
        $qry = "
            select top 100 * 
            from pt_mstr 
            where pt_domain = 'EYE' 
                AND pt_status = 'ACTIVE'
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
