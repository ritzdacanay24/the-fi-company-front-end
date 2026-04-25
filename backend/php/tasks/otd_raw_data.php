<?php

class unfinishedForkliftInspections
{

    protected $db;

    public function __construct($db, $dbQad)
    {

        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->nowDateTime = date("Y-m-d h:m:s", time());
        $this->app_email_error_from = 'noreply@the-fi-company.com';
    }


    public function onTimeDelivery($dateFrom = '2021-01-01', $dateTo = '2021-12-31')
    {

        $dateFrom = "2022-03-01";
        $dateTo = $this->nowDate;

        if(ISSET($_GET['dateFrom'])){
            $dateFrom = $_GET['dateFrom'];
        }

        if(ISSET($_GET['dateTo'])){
            $dateTo = $_GET['dateTo'];
        }

        $mainQry = "
            select a.sod_nbr
                , a.sod_line
                , abs_ship_qty last_shipped_qty
                , sod_qty_ord
                , sod_qty_ship
                , abs_shp_date last_ship_date
                , sod_due_date
                , sod_list_pr 
                , sod_list_pr*g.abs_ship_qty ext
            from sod_det a 
            LEFT join ( 
                select abs_line 
                    , sum(abs_ship_qty) abs_ship_qty 
                    , abs_order 
                    , max(abs_shp_date) abs_shp_date 
                from abs_mstr  
                where abs_domain = 'EYE' 
                and abs_ship_qty > 0 
                GROUP BY abs_line 
                    , abs_order 
            ) g ON g.abs_order = a.sod_nbr 
                AND g.abs_line = a.sod_line  
            where g.abs_shp_date between :dateFrom AND :dateTo
            and a.sod_domain = 'EYE'
            order by abs_shp_date ASC
		";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $dateFrom);
        $query->bindParam(":dateTo", $dateTo);
        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }


    public function run()
    {

        return $this->onTimeDelivery();
    }
}


use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new unfinishedForkliftInspections($db, $dbQad);
$r = $data->run();

echo $db_connect_qad->jsonToTable($r);
