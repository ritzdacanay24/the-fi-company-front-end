<?php

class InventoryTags
{

    protected $dbQad;
    protected $db;
    public $nowDate;

    public function __construct($dbQad, $db = null)
    {

        $this->dbQad = $dbQad;
        $this->db = $db;
    }

    public function read()
    {
        try {
            $mainQry = "
                SELECT a.tag_nbr
                    , case 
                        when loc_type IN ('COI', 'FG', 'WH') 
                            THEN UPPER(CAST(SUBSTRING(LTRIM(RTRIM(a.tag_loc)), 3, 3) AS CHAR(25)))
                        ELSE UPPER(CAST(SUBSTRING(a.tag_loc, 1, 3) AS CHAR(25))) 
                    end aisle
                    , a.tag_part
                    , CAST(case 
                        when loc_type IN ('COI', 'FG', 'WH') 
                            THEN UPPER(CAST(SUBSTRING(LTRIM(RTRIM(a.tag_loc)), 3, LENGTH(a.tag_loc)) AS CHAR(25))) 
                        ELSE UPPER(CAST(a.tag_loc AS CHAR(25))) 
                    end AS CHAR(25)) tag_loc
                    , case 
                        when loc_type IN ('COI', 'FG', 'WH') 
                            THEN 'YES'
                        ELSE 'NO'
                    end is_coi
                    , UPPER(CAST(a.tag_loc AS CHAR(25))) tag_loc_real
                    , a.tag_serial
                    , cast(a.tag_cnt_qty as numeric(36,2)) tag_cnt_qty
                    , a.tag_cnt_dt
                    , cast(a.tag_rcnt_qty as numeric(36,2)) tag_rcnt_qty
                    , a.tag_rcnt_dt
                    , a.tag_crt_dt
                    , a.tag_posted
                    , a.tag_serial_id
                    , a.tag_crt_time
                    , b.fullDesc
                    , cast(c.ld_qty_oh as numeric(36,2)) ld_qty_oh
                    , CASE 
                        WHEN d.loc_cap = 21
                            THEN 'LOWER' 
                        WHEN d.loc_cap = 22
                            THEN 'UPPER' 
                        WHEN d.loc_cap = 31
                            THEN 'LOWER' 
                        WHEN d.loc_cap = 32
                            THEN 'UPPER' 
                        ELSE 'Not Set'
                    END area1
                    , sct_cst_tot unit_cost
                    , cast(CASE WHEN c.ld_qty_oh > 0 THEN ( ( a.tag_cnt_qty - c.ld_qty_oh ) / c.ld_qty_oh ) * 100 ELSE 0 END as decimal(10,2)) pov
                    , (sct_cst_tot*a.tag_cnt_qty) - (sct_cst_tot*c.ld_qty_oh)  cov
                    , case when a.tag_rcnt_dt IS NOT NULL THEN (sct_cst_tot*a.tag_rcnt_qty) END secondCountAmount
                    , (sct_cst_tot*c.ld_qty_oh) ext
                    , case when a.tag_rcnt_dt IS NOT NULL THEN  CASE WHEN c.ld_qty_oh > 0 THEN cast(( (a.tag_rcnt_qty - c.ld_qty_oh) / c.ld_qty_oh) * 100 as decimal(10,2)) END END qtyPercentChange
                    , c.ld_ref ld_ref
                    , tag_rcnt_cnv
                    , tag_type
                    , tag_cnt_nam
                    , tag_cnt_nam
                    , tag_rcnt_nam
                    , pt_um pt_um
                    , loc_type
                FROM tag_mstr a
                
                LEFT JOIN ( 
					select pt_part
						, max(CONCAT(pt_desc1, pt_desc2)) fullDesc
                        , max(pt_um) pt_um
					from pt_mstr
					WHERE pt_domain = 'EYE'
					group by pt_part
                ) b ON b.pt_part = a.tag_part
                
                left join ( 
					select  sum(ld_qty_oh) ld_qty_oh
						, ld_part 
                        , ld_loc 
                        , ld_ref
                        , ld_lot
					from ld_det 
					where ld_domain = 'EYE' 
					group by ld_part 
						, ld_loc 
                        , ld_ref
                        , ld_lot
				) c ON c.ld_part = a.tag_part 
                    and c.ld_loc = a.tag_loc
                    and c.ld_ref = a.tag_ref
                    and c.ld_lot = a.tag_serial

                left join (
                    select loc_loc, max(loc_cap) loc_cap, max(loc_type) loc_type
                    from loc_mstr 
                    where loc_domain = 'EYE'
                    group by loc_loc
                ) d ON d.loc_loc = CAST(a.tag_loc AS CHAR(25))

                left join (
                    select sct_part
                        , max(sct_cst_tot) sct_cst_tot
                    FROM sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE' 
                        and sct_site  = 'EYE01'
                    group by sct_part
                ) e ON e.sct_part = a.tag_part
                    
                WHERE a.tag_domain = 'EYE'
                and a.tag_void = 0
                and ( tag_type = 'I' OR ( tag_type = 'B' AND a.tag_cnt_dt IS NOT NULL ) )
                ORDER BY 
                    case 
                        when loc_type IN ('COI', 'FG', 'WH') 
                            THEN UPPER(CAST(SUBSTRING(LTRIM(RTRIM(a.tag_loc)), 3, LENGTH(a.tag_loc)) AS CHAR(25))) 
                        ELSE  UPPER(CAST(a.tag_loc AS CHAR(25))) 
                    END ASC 
                    , a.tag_nbr ASC
			";

            $query = $this->dbQad->prepare($mainQry);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);


            $mainQry = "
                SELECT type, max(created_date) created_date, tag_nbr
                FROM eyefidb.physical_inventory
                group by tag_nbr, type

            ";
            $query = $this->db->prepare($mainQry);
            $query->execute();
            $res = $query->fetchAll(PDO::FETCH_ASSOC);

            foreach ($results as &$row) {
                $row['TAG_LOC']  = preg_replace('/\s+/', '', $row['TAG_LOC']);
                $row['TAG_LOC_REAL']  = preg_replace('/\s+/', '', $row['TAG_LOC_REAL']);

                $row['firstCountPrintTag'] = null;
                $row['secondCountPrintTag'] = null;
                $row['thirdCountPrintTag'] = null;
                foreach ($res as $row1) {
                    if ($row1['tag_nbr'] == $row['tag_nbr'] && $row1['type'] == 'First counts') {
                        $row['firstCountPrintTag'] = $row1['created_date'];
                    }
                    if ($row1['tag_nbr'] == $row['tag_nbr'] && $row1['type'] == 'Second counts') {
                        $row['secondCountPrintTag'] = $row1['created_date'];
                    }
                    if ($row1['tag_nbr'] == $row['tag_nbr'] && $row1['type'] == 'Third Counts') {
                        $row['thirdCountPrintTag'] = $row1['created_date'];
                    }
                }
            }

            return $results;
        } catch (PDOException $e) {
            http_response_code(400);
            return array('error' => $e->getMessage());
        }
    }

    public function printBlankTags()
    {
        try {
            $mainQry = "
                SELECT max(a.tag_nbr) tag_nbr
                FROM tag_mstr a
                WHERE a.tag_domain = 'EYE'
			";

            $query = $this->dbQad->prepare($mainQry);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);
            return $results;
        } catch (PDOException $e) {
            http_response_code(400);
            return array('error' => $e->getMessage());
        }
    }

    public function save($data, $type)
    {
        try {
            $mainQry = "
                INSERT INTO eyefidb.physical_inventory (
                    created_date
                    , tag_nbr
                    , type

                ) VALUES (
                    :created_date
                    , :tag_nbr
                    , :type
                )
			";

            $query = $this->db->prepare($mainQry);
            $query->bindParam(':created_date', $this->nowDate, PDO::PARAM_STR);
            $query->bindParam(':type', $type, PDO::PARAM_STR);

            foreach ($data as $row) {
                $query->bindParam(':tag_nbr', $row, PDO::PARAM_STR);
                $query->execute();
            }
        } catch (PDOException $e) {
            http_response_code(400);
            return array('error' => $e->getMessage());
        }
    }

    public function saveSecondCounts($data)
    {
        try {
            $mainQry = "
                INSERT INTO eyefidb.physical_inventory (
                    created_date
                    , tag_nbr
                    , type

                ) VALUES (
                    :created_date
                    , :tag_nbr
                    , 'second counts'
                )
			";

            $query = $this->db->prepare($mainQry);
            $query->bindParam(':created_date', $this->nowDate, PDO::PARAM_STR);

            foreach ($data as $row) {
                $query->bindParam(':tag_nbr', $row, PDO::PARAM_STR);
                $query->execute();
            }
        } catch (PDOException $e) {
            http_response_code(400);
            return array('error' => $e->getMessage());
        }
    }
}
