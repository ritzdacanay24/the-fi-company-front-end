<?php

	class CleanUsers
	{
	 
		protected $db;
		
		public function __construct($db)
		{
			$this->db = $db;
            $this->nowDate = date("Y-m-d", time());
		}			

		public function get($dateFrom, $dateTo)
		{
			
			$sql = "
                select so_cust
                    , total_lines
                    , total_shipped_on_time
                    , (total_lines - total_shipped_on_time) total_shipped_late
                    , CAST(case when total_shipped_on_time > 0 THEN (total_shipped_on_time/total_lines)*100 ELSE 0 END AS DECIMAL(16,2))   otd
                from ( 
                    select so_cust 
                        , count(*) total_lines
                        , sum(case 
                        when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate() 
                        THEN 0
                        when f.abs_shp_date IS NULL
                        THEN 0
                        ELSE 1
                    END) total_shipped_on_time
                    from sod_det a   
                    join (  
                        select so_nbr	  
                            , so_cust   
                        from so_mstr   
                        where so_domain = 'EYE'   
                    ) c ON c.so_nbr = a.sod_nbr   

                    
                    LEFT join (
                        select a.abs_shipto
                            , a.abs_shp_date
                            , a.abs_item
                            , a.abs_line
                            , sum(a.abs_ship_qty) abs_ship_qty
                            , a.abs_inv_nbr
                            , substring(abs_par_id, 2, LENGTH(abs_par_id)) abs_par_id
                            , a.abs_order
                        from abs_mstr a
                        where a.abs_domain = 'EYE'
                        GROUP BY a.abs_shipto
                            , a.abs_shp_date
                            , a.abs_item
                            , a.abs_line
                            , a.abs_inv_nbr
                            , substring(abs_par_id, 2, LENGTH(abs_par_id))
                            , a.abs_order
                    ) f ON f.abs_order = a.sod_nbr
                        AND f.abs_line = a.sod_line

                    where a.sod_req_date between :dateFrom 
                        and :dateTo and sod_domain = 'EYE'
                    group by so_cust  
                ) a
            ";
			$query = $this->db->prepare($sql);
            $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
            $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
            $query->execute();
            return  $query->fetchAll(PDO::FETCH_ASSOC);

		}

		public function getSummary($dateFrom, $dateTo)
		{
			
			$sql = "
                select so_cust customer
                    , total_lines total_lines
                    , total_shipped_on_time
                    , (total_lines - total_shipped_on_time) total_shipped_late
                    , CAST(case when total_shipped_on_time > 0 THEN (total_shipped_on_time/total_lines)*100 ELSE 0 END AS DECIMAL(16,2)) on_time_delivery_percentage
                 from ( 
                    select so_cust 
                        , count(*) total_lines
                        , sum(case 
                        when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate() 
                        THEN 0
                        when f.abs_shp_date IS NULL
                        THEN 0
                        when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
                        THEN 0
                        ELSE 1
                    END) total_shipped_on_time
                    from sod_det a   
                    join (  
                        select so_nbr	  
                            , so_cust   
                        from so_mstr   
                        where so_domain = 'EYE'   
                    ) c ON c.so_nbr = a.sod_nbr   

                    
                    LEFT join (
                        select a.abs_shipto
                            , a.abs_shp_date
                            , a.abs_item
                            , a.abs_line
                            , sum(a.abs_ship_qty) abs_ship_qty
                            , a.abs_inv_nbr
                            , substring(abs_par_id, 2, LENGTH(abs_par_id)) abs_par_id
                            , a.abs_order
                        from abs_mstr a
                        where a.abs_domain = 'EYE'
                        GROUP BY a.abs_shipto
                            , a.abs_shp_date
                            , a.abs_item
                            , a.abs_line
                            , a.abs_inv_nbr
                            , substring(abs_par_id, 2, LENGTH(abs_par_id))
                            , a.abs_order
                    ) f ON f.abs_order = a.sod_nbr
                        AND f.abs_line = a.sod_line

                    where a.sod_req_date between :dateFrom 
                        and :dateTo and sod_domain = 'EYE'
                    group by so_cust  
                    order by CAST(case when total_shipped_on_time > 0 THEN (total_shipped_on_time/total_lines)*100 ELSE 0 END AS DECIMAL(16,2))  DESC
                ) a
            ";
			$query = $this->db->prepare($sql);
            $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
            $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
            $query->execute();
            return  $query->fetchAll(PDO::FETCH_ASSOC);

		}

		public function getDetails($dateFrom, $dateTo)
		{
			
			$sql = "
                 select so_cust
                    , so_nbr
                    , a.sod_line
                    , sod_req_date
					, f.abs_shp_date last_shipped_on
                    , CAST(a.sod_qty_ord AS DECIMAL(16,2)) sod_qty_ord
					, IFNULL(CAST(f.abs_ship_qty AS DECIMAL(16,2)),0) abs_ship_qty
                    , IFNULL(a.sod_req_date-f.abs_shp_date,a.sod_req_date-curDate()) diff
                    , case 
                        when a.sod_req_date-f.abs_shp_date < 0 AND a.sod_req_date < curDate()
                        THEN 'Yes' 
                        when f.abs_shp_date IS NULL
                        THEN 'Yes' 
                        when a.sod_req_date < curDate() AND a.sod_qty_ord != f.abs_ship_qty
                        THEN 'Yes' 
                        ELSE 'No' 
                    END  is_late
                    , case when a.sod_qty_ord - f.abs_ship_qty > 0 THEN 'Shipped Partial' END shipped_partial
                from sod_det a     
                join (    
                    select so_nbr	    
                        , so_cust       
                    from so_mstr     
                    where so_domain = 'EYE'     
                ) c ON c.so_nbr = a.sod_nbr     

                LEFT join (
					select a.abs_shipto
						, a.abs_shp_date
						, a.abs_item
						, a.abs_line
						, sum(a.abs_ship_qty) abs_ship_qty
						, a.abs_inv_nbr
						, substring(abs_par_id, 2, LENGTH(abs_par_id)) abs_par_id
						, a.abs_order
					from abs_mstr a
					where a.abs_domain = 'EYE'
					GROUP BY a.abs_shipto
						, a.abs_shp_date
						, a.abs_item
						, a.abs_line
						, a.abs_inv_nbr
						, substring(abs_par_id, 2, LENGTH(abs_par_id))
						, a.abs_order
				) f ON f.abs_order = a.sod_nbr
					AND f.abs_line = a.sod_line

                where a.sod_req_date between :dateFrom and :dateTo and sod_domain = 'EYE'
                order by so_cust, a.sod_req_date ASC
            ";
			$query = $this->db->prepare($sql);
            $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
            $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
            $query->execute();
            return  $query->fetchAll(PDO::FETCH_ASSOC);

		}
		
	}
	
use EyefiDb\Databases\DatabaseQad;

$db_connect_qad = new DatabaseQad();


$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute( PDO::ATTR_CASE, PDO::CASE_LOWER );

    $dateFrom = $_GET['dateFrom'];
    $dateTo = ISSET($_GET['dateTo']) ? $_GET['dateTo'] : $dateFrom;

	$d = new CleanUsers($dbQad);
    ?>
    <div style="padding:10px">
        <p>
            <form action="otd.php" method="get">
                From:
                <input type="date" name="dateFrom" value="<?php echo $dateFrom; ?>" />
                <br/><br/>
                To:
                <input style="margin-left:18px" type="date" name="dateTo" value="<?php echo $dateTo; ?>" />
                <input type="submit" name="submit" value="Submit"/>
            </form>
        </p>
        <h4>Summary OTD</h4>
        <?php echo $db_connect_qad->jsonToTable($d->getSummary($dateFrom, $dateTo));?>
        <h4>Details</h4>
        <?php echo $db_connect_qad->jsonToTableNice($d->getDetails($dateFrom, $dateTo));?>
    </div>