<?php

namespace EyefiDb\Api\db_activity;

use PDO;
use PDOException;

class DbActivity
{

    protected $db;

    public function __construct($db, $dbQad)
    {

        $this->db = $db;
        $this->dbQad = $dbQad;
        $this->nowDate = date("Y-m-d", time());
    }

    public function Type($type, $dateFrom, $dateTo)
    {

        $mainQry = "
				SELECT a.id 
					, a.path 
					, CONCAT(b.first, ' ', b.last) userId 
					, a.createdDate 
					, a.browserName 
					, b.lastLoggedIn
                    , a.browserVersion 
                    , a.browserPlatform
				FROM db.logInfo a 
			";

        $mainQry .= " LEFT JOIN db.users b ON a.userId = b.id ";

        if ($type == 'Today') {
            $mainQry .= " where date(a.createdDate) between '" . $dateFrom . "' AND '" . $dateTo . "'";
        }
        $mainQry .= " ORDER BY a.createdDate desc LIMIT 1000";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $r = $query->fetchAll(PDO::FETCH_ASSOC);

        $mainQry = "
				SELECT file
					, concat(b.first, ' ', b.last) user
					, errorCode
					, errorDetail
					, query
					, field
					, dateTime
				FROM db.errors a
				LEFT JOIN db.users b ON a.user = b.id
			";

        if ($type == 'Today') {
            $mainQry .= " where date(dateTime) = curdate()";
        }
        $mainQry .= " ORDER BY dateTime desc";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $er = $query->fetchAll(PDO::FETCH_ASSOC);

        $obj = array(
            "logInfo" => $r, "errors" => $er
        );

        return $obj;
    }
    public function ReadOverview()
    {


        $n = 365 * 2;
        $n1 = '-' . $n;

        $mainQry = "
				SELECT count(DISTINCT userId) distinctUsers
                    , count(*) hits
					, date(createdDate) d 
					, 'logInfo' type
					FROM db.logInfo 
				where date(createdDate) between DATE_SUB(curdate(), INTERVAL " . $n . " DAY) and curdate() 
					group by date(createdDate)
					UNION ALL
					select count(DISTINCT user) distinctUsers
						, count(*) hits
					, date(dateTime) d 
					, 'errors' type
                from db.errors 
				where date(dateTime) between DATE_SUB(curdate(), INTERVAL " . $n . " DAY) and curdate() 
                group by date(dateTime)
			";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $obj2 = $query->fetch();


        $mainQry = "
				SELECT count(DISTINCT userId) distinctUsers
					, count(*) hits
				, date(createdDate) d 
				FROM db.logInfo 
				where date(createdDate) between DATE_SUB(curdate(), INTERVAL " . $n . " DAY) and curdate() 
				group by date(createdDate)
			";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $onTime = $query->fetchAll(PDO::FETCH_ASSOC);

        $mainQry = "
				SELECT count(*) hits
				, date(dateTime) d 
				FROM db.errors
				where date(dateTime) between DATE_SUB(curdate(), INTERVAL " . $n . " DAY) and curdate() 
				and user != 0  group by date(dateTime)
			";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $error = $query->fetchAll(PDO::FETCH_ASSOC);


        $date  = date('Y-m-d');; //date from database 
        $date = date('Y-m-d', strtotime('-' . $n . ' days', strtotime($date)));

        $ob1 = array();
        $obError = array();
        for ($i = 1; $i <= $n; $i++) {

            $date = date('Y-m-d', strtotime('+1 day', strtotime($date)));

            $weekOfdays = date('Y-m-d', strtotime($date));

            $ob1['label'][] = date("M d", strtotime($date));
            $h = 0;
            foreach ($onTime as $row) {
                if ($date == $row['d']) {
                    $h = $row['hits'];
                }
            }

            $ob1['value'][] = $h;

            $obError['label'][] = date("M d", strtotime($date));
            $h1 = 0;
            foreach ($error as $row) {
                if ($date == $row['d']) {
                    $h1 = $row['hits'];
                }
            }

            $obError['value'][] = $h1;
        }

        $ob = array(
            "activity" => $ob1, "error" => $obError, "overview" => $obj2
        );

        return $ob;
    }

    public function dboverview1()
    {
        $mainQry = "
        select count(*) hits, 
            'Open Shipping Request' name1,
            '/forms/shipping-request-report' link1
        from forms.shipping_request 
        where trackingNumber IS NULL and active = 1 
        UNION ALL 
            select concat(TRUNCATE((count(date_created)/9)*100, 2), '%') hits, 
                'Forklift Inspection' name1,
                '/forms/forklift-inspection-report' link1
            from forms.forklift_checklist where date(date_created) = curDate()  group by date_created
        UNION ALL 
            SELECT count(a.id) hits, 
                'Open MR Picks' name1,
                '/material/material-request-picking' link1
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
        SELECT count(a.id) hits, 
            'Open MR Validations' name1,
            '/material/material-request-validation' link1
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
            select count(*) hits, 
            'Open Graphics Production Orders' name1 ,
            '/graphics/graphics-production' link1
            from eyefidb.graphicsSchedule 
            where status NOT IN ('900', '999') and active = 1
        UNION ALL 
            select count(*) hits, 
                'Open Shortages' name1 ,
                '/shortages/open-shortages' link1
            from eyefidb.shortageRequest 
            where receivingCompleted IS NULL
        ORDER BY hits DESC
                
    ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getShippingInfo()
    {
        try {
            $mainQry = "
                select count(ld_loc) hits
                    , 'Negative locations' name1
                    , '/pulse/data-scrub?query=Negative Locations' link1 
                from ld_det  
                where ld_qty_oh < 0  
                    and ld_domain = 'EYE' 
                UNION ALL 
                    select count(wod_nbr) hits  
                        , 'Completed work orders' name1
                        , '/pulse/data-scrub?query=Completed WOs' link1
                    from wo_mstr a    
                    left join ( 
                        select wod_nbr
                            , sum(wod_qty_req) wod_qty_req
                            , sum(wod_qty_iss) wod_qty_iss  
                        from wod_det   
                        group by wod_nbr  
                    ) b ON b.wod_nbr = a.wo_nbr  
                    where a.wo_domain = 'EYE'    
                        and  a.wo_status NOT IN ('C','P','F','A')   
                        and (a.wo_qty_comp - a.wo_qty_ord) = 0 
                UNION ALL 
                    select count(a.sod_nbr) hits
                        , 'SO list price set at 0 cost' name1
                        , '/pulse/data-scrub?query=List price not set' link1
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
                    select count(*) hits
                        , name1
                        , '/logistics/item-consolidation' link1 
                    FROM (
                        SELECT COUNT(ld_loc) hits
                            , 'Item Consolidation Count' name1
                        FROM ld_det a
                        WHERE a.ld_domain = 'EYE'
                            AND ( CAST(a.ld_part AS CHAR(25)) NOT LIKE '*U')
                        GROUP BY CAST(a.ld_part AS CHAR(25))
                        HAVING hits > 1
                    ) a
                    group by name1, link1
                UNION ALL 
                    select count(pod_nbr) hits
                        , 'Open Purchase Orders' name1 
                        , '' link1
                    from pod_det a 
                        join ( 
                        select po_nbr 
                            from po_mstr 
                        where po_domain = 'EYE' 
                            AND po_stat NOT IN ('C', 'c') 
                        ) b ON b.po_nbr = a.pod_nbr  
                    where a.pod_domain = 'EYE'  
                        and a.pod_qty_ord != a.pod_qty_rcvd 
                UNION ALL 
                    select count(*) hits
                        , name1
                        , '' link1 
                    FROM (
                        SELECT CAST(a.ld_loc AS CHAR(25)) ld_loc
                            , COUNT(ld_part) hits
                            , 'One Sku Count' name1
                        FROM ld_det a
                        WHERE a.ld_domain = 'EYE'
                        GROUP BY CAST(a.ld_loc AS CHAR(25))
                        HAVING hits > 1 
                    ) a
                    group by name1, link1
                ORDER BY hits DESC
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

    function dboverview()
    {
        $dbInfo = $this->dboverview1();
        $getShippingInfo = $this->getShippingInfo();


        $result = array_merge($dbInfo, $getShippingInfo);
        //duplicate objects will be removed
        $result = array_map("unserialize", array_unique(array_map("serialize", $result)));
        //array is sorted on the bases of id
        sort($result);


        return $result;
    }
}
