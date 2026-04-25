<?php

class TotalShippedOrders
{
    protected $db;


    public function __construct($db, $dbQad)
    {
        $this->db = $db;
        $this->dbQad = $dbQad;
        $this->nowDate = date("Y-m-d");
        $this->nowDateTime = date("Y-m-d h:m:s", time());
        $this->todayDate = date("Y-m-d", time());
        $this->nowDate1 = date("Y-m-d H:i:s", time());
    }

    public function test($location = 'INTGRTD')
    {

        
        $mainQry = "
			select  top 100 SYSDATE, a.sod_nbr sod_nbr
		from sod_det a
		
		
		WHERE sod_domain = 'EYE'
		AND sod_qty_ord != sod_qty_ship	
		ORDER BY a.sod_due_date ASC WITH (NOLOCK)
			";

        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    
    
}

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new TotalShippedOrders($db, $dbQad);
$data1 = $data->test();

echo json_encode($data1);
