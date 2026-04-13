<?php

class InventoryMap
{

    protected $db;
    public $locationFrom;
    public $locationTo;
    public $bldg;

    public function __construct($db)
    {

        $this->db = $db;
        // $this->locationFrom = '16A';
        // $this->locationTo = '16D';
    }

    public function getPicking($routingNumber)
    {
        $q = "
        select count(wr_nbr) hits 
        from wr_route  
        JOIN ( 
            SELECT wo_nbr 
                , wo_ord_date 
                , wo_so_job 
                , wo_rmks 
                , wo_status 
                , wo_rel_date 
            FROM wo_mstr 
            WHERE wo_domain = 'EYE'
                AND wo_status IN ('R', 'F', 'A')
        ) b ON b.wo_nbr = wr_route.wr_nbr 
        
        WHERE wr_domain = 'EYE' 
           AND wr_op = :routingNumber 
           AND wr_qty_comp != wr_qty_ord  
           AND wo_status != 'c'
           AND wr_status != 'C'
            WITH (noLock)
        ";
        $stmt = $this->db->prepare($q);
        $stmt->bindParam(':routingNumber', $routingNumber, PDO::PARAM_STR);
        $stmt->execute();
        $results =  $stmt->fetch(PDO::FETCH_ASSOC);

        return $results['HITS'];
    }

    public function readOther()
    {
        $q = "
            select ld_part, ld_loc, sum(ld_qty_oh) ld_qty_oh
            from ld_det where ld_loc IN ('gphstock', 'stage1', 'stage2', 'stage3', 'LV300', 'QACOMP', 'PROTO', 'FSAREA', 'LV200', 'PALLET', 'KITTING')
            group by ld_part, ld_loc
            WITH (noLock)
        ";
        $stmt = $this->db->prepare($q);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $receiving_300 = [];
        $gphStock = [];
        $stage1 = [];
        $stage2 = [];
        $stage3 = [];
        $QACOMP = [];
        $PROTO = [];
        $FSAREA = [];
        $PALLET = [];
        $KITTING = [];

        foreach ($results as $results) {
            if ($results['ld_loc'] == 'LV300') {
                $receiving_300[] = $results;
            }
            if (trim($results['ld_loc']) == 'GPHSTOCK') {
                $gphStock[] = $results;
            }
            if (trim($results['ld_loc']) == 'STAGE1') {
                $stage1[] = $results;
            }
            if (trim($results['ld_loc']) == 'STAGE2') {
                $stage2[] = $results;
            }
            if (trim($results['ld_loc']) == 'STAGE3') {
                $stage3[] = $results;
            }
            if (trim($results['ld_loc']) == 'QACOMP') {
                $QACOMP[] = $results;
            }
            if (trim($results['ld_loc']) == 'PROTO') {
                $PROTO[] = $results;
            }
            if (trim($results['ld_loc']) == 'FSAREA') {
                $FSAREA[] = $results;
            }
            if (trim($results['ld_loc']) == 'PALLET') {
                $PALLET[] = $results;
            }
            if (trim($results['ld_loc']) == 'KITTING') {
                $KITTING[] = $results;
            }
        }

        return array(
            "receiving_300" => $receiving_300,
            "gphStock" => $gphStock,
            "stage1" => $stage1,
            "stage2" => $stage2,
            "stage3" => $stage3,
            "QACOMP" => $QACOMP,
            "PROTO" => $PROTO,
            "FSAREA" => $FSAREA,
            "PALLET" => $PALLET,
            "KITTING" => $KITTING
        );
    }

    public function readAisle()
    {

        $q = "
            select CAST(loc_loc AS CHAR(25)) loc_loc, CAST(SUBSTRING(loc_loc, 1, 3) AS CHAR(25)) bay, CAST(SUBSTRING(loc_loc, 1, 4) AS CHAR(25)) subBay   
            from loc_mstr    
            where loc_domain = 'EYE' 
            AND (
                CAST(SUBSTRING(loc_loc, 1, 3) AS CHAR(25)) between :locationFrom AND :locationTo OR
                loc_loc = :locationFrom1
            )
            order by CAST(loc_loc AS CHAR(25)) ASC  
            WITH (noLock)
        ";
        $stmt = $this->db->prepare($q);
        $stmt->bindParam(':locationFrom', $this->locationFrom, PDO::PARAM_STR);
        $stmt->bindParam(':locationTo', $this->locationTo, PDO::PARAM_STR);
        $stmt->bindParam(':locationFrom1', $this->locationFrom, PDO::PARAM_STR);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $results;
    }

    public function readAisleGrouped()
    {

        $q = "
        select CAST(SUBSTRING(loc_loc, 1, 4) AS CHAR(25)) subBay , CAST(SUBSTRING(loc_loc, 1, 3) AS CHAR(25)) sub  
        from loc_mstr    
        where loc_domain = 'EYE' 
        AND CAST(SUBSTRING(loc_loc, 1, 3) AS CHAR(25)) between :locationFrom AND :locationTo  
        group by CAST(SUBSTRING(loc_loc, 1, 4) AS CHAR(25)), CAST(SUBSTRING(loc_loc, 1, 3) AS CHAR(25))
        order by CAST(SUBSTRING(loc_loc, 1, 4) AS CHAR(25)) DESC  
        WITH (noLock)
        ";
        $stmt = $this->db->prepare($q);
        $stmt->bindParam(':locationFrom', $this->locationFrom, PDO::PARAM_STR);
        $stmt->bindParam(':locationTo', $this->locationTo, PDO::PARAM_STR);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $results;
    }

    public function getDetails()
    {

        $in = $this->in();
        $q = "
            select CAST(ld_loc AS CHAR(25)) ld_loc, ld_part, sum(ld_qty_oh) onHandQty, CAST(SUBSTRING(ld_loc, 1, 3) AS CHAR(25)) bay  , SUBSTRING(ld_loc, 1, 4) subbay   , CAST(SUBSTRING(ld_loc, 1, 2) AS CHAR(25)) aisle  
            from ld_det  
            where ld_domain = 'EYE' 
            AND ( CAST(SUBSTRING(ld_loc, 1, 2) AS CHAR(25)) IN ($in) OR ld_loc = :locationFrom1)
            group by ld_loc, ld_part, SUBSTRING(ld_loc, 1, 3)
            order by ld_loc ASC
            WITH (noLock)
        ";
        $stmt = $this->db->prepare($q);
        $stmt->bindParam(':locationFrom1', $this->locationFrom, PDO::PARAM_STR);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $results;
    }

    public function in()
    {

        $sum = 0;
        $in = [];
        for ($i = 1; $i <= 50; $i++) {
            if ($i < 10) {
                $in[] = "0" . $i;
            } else {

                $in[] = $i;
            }
            $sum = $sum + $i;
        }
        return implode(",", $in);
        return "01, 02, 03, 04, 02, 02, 02, 02, 02, 02, 02, 02, 02, 02, 02, 02, 02, 02";
    }

    public function groupAisleNumber()
    {

        $in = $this->in();
        $q = "
        select CAST(SUBSTRING(loc_loc, 1, 2) AS CHAR(25)) subBay 
        from loc_mstr    
        where loc_domain = 'EYE' 
        AND CAST(SUBSTRING(loc_loc, 1, 2) AS CHAR(25)) IN ($in)
        group by CAST(SUBSTRING(loc_loc, 1, 2) AS CHAR(25))
        order by SUBSTRING(CAST(loc_loc AS CHAR(25)), 1, 2) DESC  
        WITH (noLock) 
        ";
        $stmt = $this->db->prepare($q);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $results;
    }

    public function groupAisleSubNumber()
    {

        $in = $this->in();
        $q = "
        select CAST(SUBSTRING(loc_loc, 1, 3) AS CHAR(25)) subBay, CAST(SUBSTRING(loc_loc, 1, 2) AS CHAR(25)) bay
        from loc_mstr    
        where loc_domain = 'EYE' 
        AND CAST(SUBSTRING(loc_loc, 1, 2) AS CHAR(25)) IN ($in)
        group by CAST(SUBSTRING(loc_loc, 1, 3) AS CHAR(25)), CAST(SUBSTRING(loc_loc, 1, 2) AS CHAR(25))
        order by loc_loc DESC  
        WITH (noLock) 
        ";
        $stmt = $this->db->prepare($q);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $results;
    }

    public function locations()
    {

        $q = "
        select *  
            from ld_det  
            where ld_domain = 'EYE' 
            AND  ld_loc = :locationFrom
            order by ld_loc ASC
            WITH (noLock)
        ";
        $stmt = $this->db->prepare($q);
        $stmt->bindParam(':locationFrom', $this->locationFrom, PDO::PARAM_STR);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $results;
    }


    public function readMain()
    {
        $groupAisleNumber = $this->groupAisleNumber();
        $groupAisleSubNumber = $this->groupAisleSubNumber();

        $this->locationFrom = '01';
        $this->locationTo = '16';

        $parts = $this->getDetails();

        $obj = [];
        foreach ($groupAisleNumber as &$row) {



            $obj[] = array(
                "name" => $row['SUBBAY'],
                "range" => "",
                "bays" => [],
                "parts" => [],
                "test" => $row
            );
        }


        foreach ($obj as &$row) {
            foreach ($groupAisleSubNumber as &$row1) {
                if ($row['name'] == $row1['BAY']) {
                    $row['bays'][] = array(
                        "location" => ($row1['SUBBAY']),
                        "class" => 'bg-info',
                        "qty" => 0,
                        "parts" => []
                    );
                }
            }
        }
        foreach ($obj as &$row) {
            $range = "";

            if ($row['bays']) {
                $range = min($row['bays'])['location'];
                $range .= "-" . max($row['bays'])['location'];
            }
            // …

            $row['range'] = trim($range);

            foreach ($parts as &$row1) {
                if ($row['name'] == $row1['AISLE']) {
                    $row['parts'][] = $row1;
                }
            }

            foreach ($row['bays'] as &$b) {
                foreach ($parts as &$row1) {
                    if (trim($b['location']) == trim($row1['BAY'])) {
                        $b['parts'][] = $row1;
                    }
                }
            }
        }

        return array(
            "results" => $obj,
            "other" => $this->readOther(),

            "routings" => array(
                "openPicks" => $this->getPicking(10),
                "openProduction" => $this->getPicking(20),
                "openQc" => $this->getPicking(30)
            )
        );
    }

    public function readDetails()
    {

        $aisles = $this->readAisle();
        $parts = $this->getDetails();
        $readAisleGrouped = $this->readAisleGrouped();

        //get unique bays
        $bays = [];
        foreach ($aisles as &$row) {
            $bays[] = $row['BAY'];
        }
        $bayUnique = array_unique($bays);

        $obj = [];
        foreach ($bayUnique as &$row) {
            $obj[] = array(
                "name" => $row,
                "bays" => []
            );
        }

        foreach ($obj as &$row) {
            foreach ($readAisleGrouped as &$row1) {
                if ($row['name'] == $row1['SUB']) {
                    $row['bays'][] = array(
                        "name" => $row1['SUBBAY'],
                        "columns" => []
                    );
                }
            }
        }

        foreach ($obj as &$row) {
            foreach ($row['bays'] as &$row1) {
                foreach ($aisles as &$a) {
                    if ($row1['name'] == $a['SUBBAY']) {
                        $row1['columns'][] = array(
                            "name" => $a['LOC_LOC'],
                            "parts" => []
                        );
                    }
                }
            }
        }

        foreach ($obj as &$row) {
            foreach ($row['bays'] as &$row1) {
                foreach ($row1['columns'] as &$row2) {
                    foreach ($parts as &$p) {
                        if ($row2['name'] == $p['LD_LOC']) {
                            $row2['parts'][] = array(
                                "name" => $p['ld_part']
                            );
                        }
                    }
                }
            }
        }

        return $obj;
    }

    public function __destruct()
    {

        $this->db = null;
    }
}
