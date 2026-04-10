<?php

namespace EyefiDb\Api\Cables;

use PDO;
use PDOException;

class Cables
{

    protected $db;

    public function __construct($db, $dbQad)
    {

        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->todayDate = date("Y-m-d", time());
        $this->nowDate1 = date("Y-m-d H:i:s", time());
        
		$this->dateNow = date("Y-m-d", time());
    }

    public function getCommentsByOrderNumbers($in, $type = 'Cables')
    {
        try {
            $comments = "
                SELECT a.orderNum
                    , comments_html comments_html
                    , comments comments
                    , a.createdDate
                    , date(a.createdDate) byDate
                    , case when date(a.createdDate) = curDate() then 'text-success' else 'text-info' end color_class_name
                    , case when date(a.createdDate) = curDate() then 'bg-success' else 'bg-info' end bg_class_name
                    , concat('SO#:', ' ', a.orderNum) comment_title
                    , concat(c.first, ' ', c.last) created_by_name
                FROM eyefidb.comments a
                INNER JOIN (
                    SELECT orderNum
                        , MAX(id) id
                        , MAX(date(createdDate)) createdDate
                    FROM eyefidb.comments
                    WHERE orderNum IN ($in)
                    AND active = 1
                    GROUP BY orderNum
                ) b ON a.orderNum = b.orderNum AND a.id = b.id
                LEFT JOIN db.users c ON c.id = a.userId
                WHERE a.type = :type
                AND a.orderNum IN ($in)
                AND a.active = 1
            ";
            $query = $this->db1->prepare($comments);
            $query->bindParam(':type', $type, PDO::PARAM_STR);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getSalesOrderDetailsByDate($dateTo)
    {
        $mainQry = "
            select wo_part
                , a.wod_part
                , wod_qty_req
                , wod_qty_iss
                , wo_qty_ord
                , IFNULL(e.ld_qty_oh, 0) ld_qty_oh
                , a.wod_nbr
                , wo_due_date
                , wo_status
                , IFNULL(openQty,0) poOpenQty
                , case when IFNULL(e.ld_qty_oh, 0) - open1 < 0 THEN ABS(IFNULL(e.ld_qty_oh, 0) - open1) ELSE 0  END qtyNeeded
                , LTRIM(RTRIM(concat(a.wod_nbr, a.wod_part))) id 
                from wo_mstr 
            join (
                select wod_part
                , wod_qty_req
                , wod_qty_iss
                , wod_qty_req-wod_qty_iss open1
                    , wod_nbr
                from wod_det 
                where wod_domain = 'EYE'
                    and wod_part LIKE 'CBL%'
            ) a ON a.wod_nbr = wo_mstr.wo_nbr

            join (
                select wr_nbr
                from wr_route 
                where wr_domain = 'EYE'
                group by wr_nbr
            ) aa ON aa.wr_nbr = wo_mstr.wo_nbr
        
            LEFT JOIN (
                select a.ld_part
                    , sum(a.ld_qty_oh) ld_qty_oh
                from ld_det a
                WHERE ld_domain = 'EYE'
                GROUP BY a.ld_part
            ) e ON e.ld_part = a.wod_part

            left JOIN (
                select pod_part, 
                    sum(pod_qty_ord) - sum(pod_qty_rcvd) openQty 
                from pod_det
                group by pod_part
            ) f ON f.pod_part = a.wod_part

            where wo_domain = 'EYE'
            and wo_type != 'C'
            and wo_status IN ('R', 'F', 'A')
            AND wod_qty_req != wod_qty_iss
            WITH (NOLOCK)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":date", $dateTo, PDO::PARAM_STR);
        $query->execute();
        $results =  $query->fetchAll(PDO::FETCH_ASSOC);

        foreach($results as &$row){
            $row['id'] = $row['ID'];
        }

        return $results;
    }

    public function structureData($data){

    }

    public function getGraphicsDemandReport()
    {

        $in_array = array();

        $dateTo = strtotime(date("Y-m-d", strtotime($this->todayDate)) . " +90 days");
        $dateTo = date("Y-m-d", $dateTo);


        $result = $this->getSalesOrderDetailsByDate($dateTo);

        foreach ($result as $row) {
            $in_array[] = $row['id'];
        }

        $in = "'" . implode("','", $in_array) . "'";
        
        $recent_comments_info = $this->getCommentsByOrderNumbers($in);


        foreach ($result as &$row) {

            $row['recent_comments'] = new \stdClass();
			
            foreach ($recent_comments_info as $recent_comments_info_row) {
                if ($row['id'] == $recent_comments_info_row['orderNum']) {
                    $row['recent_comments'] = $recent_comments_info_row;
                }
            }

			$obj[] = $row;
		}


        return $result;
    }
}
