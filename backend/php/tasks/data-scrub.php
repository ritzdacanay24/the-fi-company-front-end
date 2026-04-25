<?php

class dataScrub
{

    protected $db;

    public function __construct($dbQad, $db)
    {
        $this->dbQad = $dbQad;
        $this->db = $db;
    }

    public function dboverview()
    {
        $mainQry = "
        select count(*) total, 
            'Open Shipping Request' name1 
        from forms.shipping_request 
        where trackingNumber IS NULL and active = 1 
        UNION ALL 
            select concat(TRUNCATE((count(date_created)/9)*100, 2), '%') total, 
                'Forklift Inspection' name1 
            from forms.forklift_checklist where date(date_created) = curDate()  group by date_created
        UNION ALL 
            SELECT count(a.id) total, 
                'Open MR Picks' name1
            FROM eyefidb.mrf a
            LEFT JOIN (
                SELECT max(printedBy) printedBy
                    , max(printedDate) printedDate
                    , max(notes) notes
                    , mrf_id
                FROM eyefidb.mrf_det 
                where qty != qtyPicked
                GROUP BY mrf_id
                ORDER BY printedDate DESC
            ) b ON b.mrf_id = a.id			
            WHERE a.validated IS NOT NULL
                AND pickedCompletedDate IS NULL
                AND a.active = 1
        UNION ALL 
        SELECT count(a.id) total, 'Open MR Validations' name1
            FROM eyefidb.mrf a
            JOIN (
                SELECT count(mrf_id) detailOpenCount
                    , mrf_id
                FROM eyefidb.mrf_det
                WHERE active = 1
                GROUP BY mrf_id
            ) b ON b.mrf_id = a.id			
            WHERE detailOpenCount > 0
                AND a.validated IS NULL
                AND active = 1
        UNION ALL 
            select count(*) total, 
            'Open Graphics Production Orders' name1 
            from eyefidb.graphicsSchedule 
            where status NOT IN ('900', '999') and active = 1
        UNION ALL 
            select count(*) total, 
                'Open Shortages' name1 
            from eyefidb.shortageRequest 
            where receivingCompleted IS NULL
                
    ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getShippingInfo()
    {
        try {
            $mainQry = "
                select count(ld_loc) total, 'Negative location' name1
                from ld_det  
                where ld_qty_oh < 0  
                    and ld_domain = 'EYE' 
                    group by name1
                UNION ALL 
                    select count(wod_nbr) total  , 'Completed work orders' name1
                    from wo_mstr a    
                    left join ( 
                    select wod_nbr, sum(wod_qty_req) wod_qty_req, sum(wod_qty_iss) wod_qty_iss  
                    from wod_det   
                    group by wod_nbr  
                    ) b ON b.wod_nbr = a.wo_nbr  
                    where a.wo_domain = 'EYE'    
                    and  a.wo_status NOT IN ('C','P','F','A')   
                    and (a.wo_qty_comp - a.wo_qty_ord) = 0 
                UNION ALL 
                select count(a.sod_nbr) total, 'list price at 0' name1
                from sod_det a
                
                join (
                    select so_nbr
                    from so_mstr
                    where so_domain = 'EYE'	
                    AND so_compl_date IS NULL
                ) c ON c.so_nbr = a.sod_nbr
                    
                WHERE sod_domain = 'EYE'
                    AND sod_qty_ord != sod_qty_ship
                    AND a.sod_list_pr = 0 
                    
                UNION ALL 
                select count(*) total, name1 FROM (SELECT COUNT(ld_loc) total, 
                    'Item Consolidation Count' name1
                    FROM ld_det a
                    WHERE a.ld_domain = 'EYE'
                    AND ( CAST(a.ld_part AS CHAR(25)) NOT LIKE '*U')
                    GROUP BY CAST(a.ld_part AS CHAR(25))
                    HAVING total > 1
                ) a
                group by name1
                UNION ALL 
                    select count(pod_nbr) total, 'Open Purchase Orders' name1  
                    from pod_det a 
                    join ( 
                    select po_nbr from po_mstr where po_domain = 'EYE' AND po_stat NOT IN ('C', 'c') 
                    ) b ON b.po_nbr = a.pod_nbr  
                    where a.pod_domain = 'EYE'  
                    and a.pod_qty_ord != a.pod_qty_rcvd 
                UNION ALL 
                select count(*) total, name1 FROM (
                    SELECT CAST(a.ld_loc AS CHAR(25)) ld_loc
					, COUNT(ld_part) total
					, 'One Sku Count' name1
				FROM ld_det a
				WHERE a.ld_domain = 'EYE'
				GROUP BY CAST(a.ld_loc AS CHAR(25))
				HAVING total > 1 
                ) a
                group by name1
            ";
            $query = $this->dbQad->prepare($mainQry);
            $query->execute();
            $result = $query->fetchAll(PDO::FETCH_ASSOC);

            return $result;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    function run()
    {
        $dbInfo = $this->dboverview();
        $getShippingInfo = $this->getShippingInfo();


        $result = array_merge($dbInfo, $getShippingInfo);
        //duplicate objects will be removed
        $result = array_map("unserialize", array_unique(array_map("serialize", $result)));
        //array is sorted on the bases of id
        sort($result);


        return $result;
    }
}

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$productionInstance = new dataScrub($dbQad, $db);

$results = $productionInstance->run();

echo $db_connect->jsonToTable($results);
