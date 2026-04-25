<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    require '/var/www/html/server/Databases/DatabaseQadV1.php';

    function wip(){
        global $databaseQad;
        $mainQry = "
            select sum(wo_wip_tot) value
            from wo_mstr  
            where wo_domain = 'EYE'  
            and wo_wip_tot > 0
        ";
        $query = $databaseQad->pdo->prepare($mainQry);
        $query->execute();
        $results =  $query->fetch(PDO::FETCH_ASSOC);

        return array(
            "name" => "WIP $",
            "value" => $results['VALUE']
        );
    }


    function futuerOpenRevenueCurrentMonth(){
        global $databaseQad;

        $date = new DateTime(date('Y-m-d', time()));
    
        $date->modify('+1 day');
    
        $dateFrom = $date->format('Y-m-d');
    
        $dateTo = date('Y-m-d', strtotime('last day of this month'));
    
        $sth = $databaseQad->pdo->prepare("
            select sum((sod_qty_ord-sod_qty_ship)*sod_price) value
            from sod_det a
            WHERE sod_domain = 'EYE'
                AND sod_qty_ord != sod_qty_ship	
                AND a.sod_per_date between :dateFrom111 and :dateTo111
                AND sod_project = ''
        ");
        $sth->bindParam(':dateFrom111', $dateFrom, PDO::PARAM_STR);
        $sth->bindParam(':dateTo111', $dateTo, PDO::PARAM_STR);
        $sth->execute();
        $results =  $sth->fetch(PDO::FETCH_ASSOC);

        return array(
            "name" => "Future Open Revenue, Current Month",
            "dateFrom" => $dateFrom,
            "dateTo" => $dateTo,
            "value" => $results['VALUE']
        );

    }

    function openLinesForToday(){
        global $databaseQad;
        
        $today =  date("Y-m-d");

        $sth = $databaseQad->pdo->prepare("
            SELECT count(*) value
            FROM sod_det a
            WHERE a.sod_per_date = curDate()
                AND sod_domain = 'EYE'
                AND a.sod_qty_ord-a.sod_qty_ship <> 0
                AND sod_project = ''
        ");
        $sth->bindParam(':today', $today, PDO::PARAM_STR);
        $sth->execute();
        $results = $sth->fetch(PDO::FETCH_ASSOC);

        return array(
            "name" => "Open Lines Today",
            "dateFrom" => $today,
            "value" => $results['VALUE']
        );

    }

    function ops10RoutingCompleted(){
        global $databaseQad;

        $operation = 10;
        $dateFrom = date('Y-m-d');
        $dateTo = date('Y-m-d');
        $sth = $databaseQad->pdo->prepare("
            select count(op_wo_nbr) value
            from op_hist
            left join wo_mstr c on c.wo_nbr = op_hist.op_wo_nbr and c.wo_domain = 'EYE'  
            where op_tran_date between :dateFrom and :dateTo 
                and op_wo_op = :operation and op_domain = 'EYE'  
                and op_type = 'BACKFLSH'
            WITH (NOLOCK)
        ");
        $sth->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
        $sth->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
        $sth->bindParam(':operation', $operation, PDO::PARAM_STR);
        $sth->execute();
        $results = $sth->fetch(PDO::FETCH_ASSOC);

        return array(
            "name" => "Op 10 Completed Today",
            "dateFrom" => $dateFrom,
            "dateTo" => $dateTo,
            "value" => $results['VALUE']
        );

    }

    function openLinesForCurrentWeek(){
        global $databaseQad;

        $day = date('w');
        //start of week
        $dateFrom = date('Y-m-d', strtotime('-'.($day-1).' days'));
        //end of week
        $dateTo = date('Y-m-d', strtotime('+'.(5-$day).' days'));

        $sth = $databaseQad->pdo->prepare("
            SELECT count(*) value
            FROM sod_det a
            WHERE a.sod_per_date between :dateFrom and :dateTo 
                AND sod_domain = 'EYE'
                AND a.sod_qty_ord-a.sod_qty_ship <> 0
                AND sod_project = ''
        ");
        $sth->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
        $sth->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
        $sth->execute();
        $results = $sth->fetch(PDO::FETCH_ASSOC);

        return array(
            "name" => "Open Lines Current Week",
            "dateFrom" => $dateFrom,
            "dateTo" => $dateTo,
            "value" => $results['VALUE']
        );

    }

    function getLateReasonCodes(){
        global $databaseQad;
        global $database;

        //Start Late Reason Codes
        $today =  date("Y-m-d");
        
        $sth = $databaseQad->pdo->prepare("
            SELECT a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line))) so_line
            FROM sod_det a
            WHERE a.sod_per_date = :today
                AND sod_domain = 'EYE'
                AND a.sod_qty_ord-a.sod_qty_ship <> 0
                AND sod_project = ''
        ");
        $sth->bindParam(':today', $today, PDO::PARAM_STR);
        $sth->execute();
        $lateReasonCodesDueToday = $sth->fetchAll(PDO::FETCH_ASSOC);

        $in_array = array();
        foreach ($lateReasonCodesDueToday as $row) {
            $in_array[] = $row['SO_LINE'];
        }

        $in = "'" . implode("','", $in_array) . "'";

        $sth = $database->pdo->prepare("
            SELECT lateReasonCode, 
                count(lateReasonCode) value
            FROM eyefidb.workOrderOwner a
            WHERE a.so IN ($in)
            and lateReasonCode <> '' 
            group by lateReasonCode
        ");
        $sth->bindParam(':today', $today, PDO::PARAM_STR);
        $sth->execute();
        $results = $sth->fetchAll(PDO::FETCH_ASSOC);

        return array(
            "name" => "Late Reason Codes ($today)",
            "dateFrom" => $today,
            "value" => $results
        );
    }

    function openLinesCurrentMonth(){
        global $databaseQad;

        $dateFrom = date('Y-m-01');
        $dateTo =  date("Y-m-t", strtotime($dateFrom));
    
        $sth = $databaseQad->pdo->prepare("
            SELECT sum(a.sod_price*(a.sod_qty_ord-a.sod_qty_ship)) value
                , a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line))) so_line
            FROM sod_det a
            WHERE a.sod_per_date between :dateFrom and :dateTo 
                AND sod_domain = 'EYE'
                AND a.sod_qty_ord-a.sod_qty_ship <> 0
                AND sod_project = ''
            group by a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line)))
        ");
        $sth->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
        $sth->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
        $sth->execute();
        $results = $sth->fetch(PDO::FETCH_ASSOC);

        return array(
            "name" => "Ready to Ship, this period",
            "dateFrom" => $dateFrom,
            "dateTo" => $dateTo,
            "value" => $results['VALUE']
        );

    }

    //start inventory
    function inventoryAndFg()
    {
        global $databaseQad;

        $sth = $databaseQad->pdo->prepare("
            select cast(SUM(a.ld_qty_oh*c.sct_cst_tot) as numeric(36,2)) total,
                sum(case when c.loc_type = 'FG' THEN a.ld_qty_oh*c.sct_cst_tot ELSE 0 END) fg_total
            FROM ld_det a 
            LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = 'EYE' 
            
            LEFT JOIN loc_mstr c ON c.loc_loc = a.ld_loc 
                    AND c.loc_type = 'FG' 
                    AND loc_domain = 'EYE'

            LEFT JOIN ( 
                select sct_part
                    , max(sct_cst_tot) sct_cst_tot
                from sct_det
                WHERE sct_sim = 'Standard' 
                    and sct_domain = 'EYE' 
                    and sct_site  = 'EYE01'
                group by sct_part
            ) c ON b.pt_part = c.sct_part
            
            WHERE ld_domain = 'EYE' 
                and a.ld_qty_oh > 0
                AND (
                    RIGHT(b.pt_part, 1) != 'U' AND RIGHT(b.pt_part, 1) != 'R' AND RIGHT(b.pt_part, 1) != 'N' 
                ) 
        ");
        $sth->execute();
        $results = $sth->fetch(PDO::FETCH_ASSOC);

        
        $object = new stdClass();

        // Property added to the object
        $object->name = 'fg';
        $object->value = $results['FG_TOTAL'];
        
        $object1 = new stdClass();

        // Property added to the object
        $object1->name = 'total';
        $object1->value = $results['TOTAL'];

        $test[] = $object;
        $test[] = $object1;
        return $test;

    }
    
    function getJiaxing($location)
    {
        global $databaseQad;

        $sth = $databaseQad->pdo->prepare("
            select 
                sum(a.ld_qty_oh*d.sct_cst_tot) value
            from ld_det a
            LEFT JOIN ( 
                select sct_part 
                    , max(sct_cst_tot) sct_cst_tot 
                from sct_det 
                WHERE sct_sim = 'Standard' 
                    and sct_domain = 'EYE'  
                    and sct_site  = 'EYE01' 
                group by sct_part 
            ) d ON a.ld_part = d.sct_part  
            where a.ld_loc = :location
                AND ld_domain = 'EYE'
        ");
        $sth->bindParam(':location', $location, PDO::PARAM_STR);
        $sth->execute();
        $results = $sth->fetch(PDO::FETCH_ASSOC);

        return array(
            "name" => "$location Inventory $",
            "value" => $results['VALUE']
        );
    }

    function safetyStock()
    {
        global $databaseQad;
        
        $qry = "
            select 
                sum(CAST(total AS DECIMAL(16,2) )) value
            from (
                select 
                    onHandQty*sct_cst_tot total,   
                    case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
            from pt_mstr a
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
						and sct_site  = 'EYE01'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
                    select a.ld_part
                        , sum(ld_qty_oh) onHandQty
                    from ld_det a 
                    JOIN ( 
						select loc_loc
						from loc_mstr 
						WHERE loc_domain = 'EYE'  and loc_type = 'SS'
						group by loc_loc 
					) cc ON cc.loc_loc = a.ld_loc 

                    where a.ld_domain = 'EYE' 
                    and a.ld_qty_oh > 0
                    GROUP BY a.ld_part
                    
                ) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE'

           ) a
           where is_coi <> 'COI'
        ";
        $stmt = $databaseQad->pdo->prepare($qry);
        $stmt->execute(); 	
        $results = $stmt->fetch(PDO::FETCH_ASSOC); 	
        
        return array(
            "name" => "Safety Stock $",
            "value" => $results['VALUE']
        );

    }
    //end inventory

    //start inventory turns
    function fgLV()
    {
        global $databaseQad;
        
        $qry = "
           select sum(case when turns < 1.0 THEN total ELSE 0 END ) lessThanOne,
           sum(case when turns >= 1.0 THEN total ELSE 0 END) greaterThanOrEqualToOne,
           sum(total) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END turns,
                    
                    case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
                    
            from pt_mstr a
            left join (
                    select in_part, 
                       max(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE'
                    and in_site = 'EYE01' 
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
						and sct_site  = 'EYE01'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

				JOIN (
					select a.ld_part
						, sum(ld_qty_oh) onHandQty
					from ld_det a 
					JOIN ( 
						select loc_loc
						from loc_mstr 
						WHERE loc_domain = 'EYE'  
						and loc_type = 'FG'
						group by loc_loc 
					) cc ON cc.loc_loc = a.ld_loc 
					where a.ld_domain = 'EYE' 
					and a.ld_qty_oh > 0
					GROUP BY a.ld_part
				) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE' 
            
           ) a
           where is_coi <> 'COI'
        ";
        $stmt = $databaseQad->pdo->prepare($qry);
        $stmt->execute(); 	
        $results =  $stmt->fetch(PDO::FETCH_ASSOC); 
        
        return array(
            "name" => "FGLV",
            "value" => $results
        );
    }

    function rmlv()
    {
        global $databaseQad;
        
        $qry = "
        select sum(case when turns < 1.0 THEN total ELSE 0 END ) lessThanOne,
        sum(case when turns >= 1.0 THEN total ELSE 0 END) greaterThanOrEqualToOne,
        sum(total) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1)) turns,
                    case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
                    
            from pt_mstr a
            left join (
                    select in_part, 
                       max(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE' 
                    and in_site = 'EYE01'
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
                        and sct_site  = 'EYE01'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
					select a.ld_part
						, sum(ld_qty_oh) onHandQty
					from ld_det a 
					
					JOIN ( 
						select loc_loc
						from loc_mstr 
						WHERE loc_domain = 'EYE' and loc_type NOT IN ('FG', 'SS')
						group by loc_loc 
					) cc ON cc.loc_loc = a.ld_loc 

					where a.ld_domain = 'EYE' 
					AND ld_site = 'EYE01'
					and a.ld_qty_oh > 0
					GROUP BY a.ld_part
					
				) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE' 
           ) a
           where is_coi <> 'COI'
        ";
        $stmt = $databaseQad->pdo->prepare($qry);
        $stmt->execute(); 	
        $results = $stmt->fetch(PDO::FETCH_ASSOC); 
        
        return array(
            "name" => "RMLV",
            "value" => $results
        );
    }

    function jx01()
    {
        
        global $databaseQad;

        $qry = "
        select sum(case when turns < 1.0 THEN total ELSE 0 END ) lessThanOne,
        sum(case when turns >= 1.0 THEN total ELSE 0 END) greaterThanOrEqualToOne,
        sum(total) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1)) turns,
					case when (
						RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
					) THEN '-' ELSE 'COI' END is_coi
            from pt_mstr a
            left join (
                    select in_part, 
                       max(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE' 
					and in_site = 'JX'
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
						and sct_site  = 'EYE01'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
                    select a.ld_part
                        , sum(ld_qty_oh) onHandQty
                    from ld_det a 
                    where a.ld_domain = 'EYE' 
					AND ld_loc = 'JX01'
                    and a.ld_qty_oh > 0
                    GROUP BY a.ld_part
                    
                ) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE' 
           ) a
           where is_coi <> 'COI'
        ";
        $stmt = $databaseQad->pdo->prepare($qry);
        $stmt->execute(); 	
        $results = $stmt->fetch(PDO::FETCH_ASSOC); 
        
        return array(
            "name" => "JX",
            "value" => $results
        );
    }

    function all()
    {
        
        global $databaseQad;

        $qry = "
        select sum(case when turns < 1.0 THEN total ELSE 0 END ) lessThanOne,
        sum(case when turns >= 1.0 THEN total ELSE 0 END) greaterThanOrEqualToOne,
        sum(total) total
            from (
                select 
                    onHandQty*sct_cst_tot total, 
                    CAST(case when onHandQty*sct_cst_tot > 0 THEN ((in_avg_iss*sct_cst_tot)/(onHandQty*sct_cst_tot))*365 ELSE 0 END AS DECIMAL(16,1)) turns,
                    case when (
                        RIGHT(a.pt_part, 1) != 'U' AND RIGHT(a.pt_part, 1) != 'R' AND RIGHT(a.pt_part, 1) != 'N' 
                    ) THEN '-' ELSE 'COI' END is_coi
            from pt_mstr a
            left join (
                    select in_part, 
                       max(in_avg_iss) in_avg_iss
                    from in_mstr 
                    where in_domain = 'EYE' 
                    and in_site = 'EYE01'
                    group by in_part
                ) b ON b.in_part = a.pt_part 
                
                LEFT JOIN ( 
                    select sct_part 
                        , max(sct_cst_tot) sct_cst_tot 
                    from sct_det 
                    WHERE sct_sim = 'Standard' 
                        and sct_domain = 'EYE'
                        and sct_site  = 'EYE01'
                    group by sct_part 
                ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part  

                JOIN (
                    select a.ld_part
                        , sum(ld_qty_oh) onHandQty
                    from ld_det a 
                    where a.ld_domain = 'EYE' 
                    and a.ld_site = 'EYE01'
                    and a.ld_qty_oh > 0
                    GROUP BY a.ld_part
                    
                ) c ON c.ld_part = a.pt_part

            where pt_domain = 'EYE'
           ) a
           where is_coi <> 'COI'
        ";
        $stmt = $databaseQad->pdo->prepare($qry);
        $stmt->execute(); 	
        $results = $stmt->fetch(PDO::FETCH_ASSOC); 
        
        return array(
            "name" => "All",
            "value" => $results
        );	
    }
    //end inventory turns

    function getThreeMonthsRevenue()
	{
        global $databaseQad;
        
        $dateFrom = date('Y-m-d', strtotime('first day of next month'));
        $dateTo = date('Y-m-d', strtotime('last day of +3 month'));

		$mainQry = "
			select sum(a.sod_price*(a.sod_qty_ord-a.sod_qty_ship)) value
			from sod_det a
				join (
				    select so_nbr	
				    from so_mstr
				    where so_domain = 'EYE'
				        AND so_compl_date IS NULL
			) c ON c.so_nbr = a.sod_nbr
				WHERE sod_domain = 'EYE'
                    AND sod_project = ''
					AND sod_qty_ord != sod_qty_ship
                and a.sod_per_date between :dateFrom and :dateTo
				
		";
        $query = $databaseQad->pdo->prepare($mainQry);
        $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
        $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetch(PDO::FETCH_ASSOC);

        return array(
            "name" => "Next 3 months",
            "dateFrom" => $dateFrom,
            "dateTo" => $dateTo,
            "value" => $results['VALUE']
        );

    }

    function productionOrders($operation)
    {
        global $databaseQad;

        $mainQry = "
            select sum(case when dueBy = curDate() THEN 1 ELSE 0 END) today_count
                , sum(case when dueBy = curDate() AND complete_status = 1 THEN 1 ELSE 0 END) completed_before_or_on_due_date
                , sum(case when dueBy = curDate() AND complete_status = 0 THEN 1 ELSE 0 END) due_today_not_completed
                , sum(case when dueBy < curDate() AND complete_status = 0 THEN 1 ELSE 0 END) total_overdue_orders
            from ( select wr_nbr wr_nbr
                , a.wr_qty_ord - a.wr_qty_comp openQty
                , dueBy dueBy
                , a.wr_part wr_part
                , a.wr_qty_ord
                , a.wr_qty_comp
                , op_qty_comp
                , op_tran_date
                , op_qty_comp_backflush
                , wo_status
                , case when wo_status = 'C' OR a.wr_qty_ord - a.wr_qty_comp = 0 THEN 1 ELSE 0 END complete_status
            from 
                ( 
                    select a.wr_nbr, 
                        a.wr_op, 
                        a.wr_qty_ord, 
                        a.wr_qty_wip,  
                        a.wr_qty_comp, 
                        a.wr_status, 
                        a.wr_due, 
                        a.wr_part, 
                        a.wr_queue, 
                        a.wr_qty_inque,
                        CASE  
                            WHEN b.wo_so_job = 'dropin' 
                                THEN wr_due
                            ELSE 
                                CASE 
                                    WHEN a.wr_op = 10
                                        THEN 
                                            CASE 
                                                WHEN DAYOFWEEK ( wr_due ) IN (1)
                                                    THEN wr_due - 4
                                                    WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                        THEN wr_due - 4
                                                        WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                            THEN wr_due - 4
                                                            WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                                THEN wr_due - 2
                                                                WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                                    THEN wr_due - 2
                                                                    WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                        THEN wr_due - 2
                                                                        WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                            THEN wr_due - 3
                                                ELSE wr_due - 2
                                    END 
                                    WHEN a.wr_op = 20
                                        THEN 
                                        CASE 
                                                WHEN DAYOFWEEK ( wr_due ) IN (1)
                                                    THEN wr_due - 3
                                                    WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                        THEN wr_due - 3
                                                        WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                            THEN wr_due - 1
                                                            WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                                THEN wr_due - 1
                                                                WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                                    THEN wr_due - 1
                                                                    WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                        THEN wr_due - 1
                                                                        WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                            THEN wr_due - 2
                                                ELSE wr_due - 1
                                        END 
                                    WHEN a.wr_op = 30
                                        THEN 
                                        CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 2
                                            WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                                THEN wr_due - 0
                                            WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                THEN wr_due - 0
                                            ELSE wr_due - 0
                                        END 	
                                        else wo_due_date			
                                END 
                        END dueBy 
                        , d.op_qty_comp
                        , d.op_tran_date
                        , d.op_qty_comp op_qty_comp_backflush
                        , wo_status
                    from wr_route a 

                    left join ( 
                        select wo_nbr, wo_so_job, wo_status, wo_due_date
                        from wo_mstr 
                        where wo_domain = 'EYE' 
                    ) b ON b.wo_nbr = a.wr_nbr 
                    
                    left join (
                        select op_wo_nbr, sum(op_qty_comp) op_qty_comp, max(op_tran_date) op_tran_date
                        from op_hist 
                        where op_wo_op = :operation 
                        and op_domain = 'EYE'
                        and op_type = 'BACKFLSH'
                        group by op_wo_nbr
                    ) d ON d.op_wo_nbr = a.wr_nbr 
                    where  a.wr_domain = 'EYE' 
                        and a.wr_op = :operation1
                ) a
            ) b
        ";
        $query = $databaseQad->pdo->prepare($mainQry);
        $query->bindParam(':operation', $operation, PDO::PARAM_STR);
        $query->bindParam(':operation1', $operation, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetch(PDO::FETCH_ASSOC);

        return array(
            "name" => "OP $operation due and overdue",
            "value" => $results['TOTAL_OVERDUE_ORDERS'] 
        );
    }

    function onTime()
    {

        global $databaseQad;

        $mainQry = "
				select sum(case when f.abs_shp_date <= a.sod_per_date THEN 1 ELSE 0 END) shipped_before_or_on_due_date
					, sum(case when f.abs_shp_date > a.sod_per_date THEN 1 ELSE 0 END) shipped_after_due_date
                    , count(f.abs_shp_date) total_shipped_today
                    , sum(sod_list_pr*f.abs_ship_qty) total_value_shipped_today
                    , count(a.sod_nbr) toal_lines_today
                    , case 
                        when c.so_cust IN ('AMEGAM','BALTEC', 'ATI', 'INTGAM')  THEN c.so_cust
                         ELSE  'Other' END so_cust
				from sod_det a
				
				left join (
					select so_nbr	
						, so_cust
						, so_ord_date
						, so_ship
						, so_bol
						, so_cmtindx
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
						, a.abs_par_id
						, a.abs_order
					from abs_mstr a
					where a.abs_domain = 'EYE'
					GROUP BY a.abs_shipto
						, a.abs_shp_date
						, a.abs_item
						, a.abs_line
						, a.abs_inv_nbr
						, a.abs_par_id
						, a.abs_order
				) f ON f.abs_order = a.sod_nbr
					AND f.abs_line = a.sod_line
                    
				WHERE sod_domain = 'EYE'
				and abs_shp_date = curDate()
				and abs_ship_qty > 0
                AND sod_project = ''
                group by 
                    case 
                        when c.so_cust IN ('AMEGAM','BALTEC', 'ATI', 'INTGAM')  
                    THEN c.so_cust
                        ELSE 'Other' 
                    END
				ORDER BY 
                    case 
                        when c.so_cust IN ('AMEGAM','BALTEC', 'ATI', 'INTGAM') 
                    THEN c.so_cust
                        ELSE 'Other' 
                    END 
			";

        $query = $databaseQad->pdo->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $total_value_shipped_today = 0;
        $total_shipped_today = 0;
        $shipped_before_or_on_due_date = 0;

        foreach($results as $row){
            $total_value_shipped_today += $row['TOTAL_VALUE_SHIPPED_TODAY'];
            $total_shipped_today += $row['TOTAL_SHIPPED_TODAY'];
            $shipped_before_or_on_due_date += $row['SHIPPED_BEFORE_OR_ON_DUE_DATE'];
        }

        return array(
            "total_value_shipped_today" => $total_value_shipped_today,
            "total_shipped_today" => $total_shipped_today,
            "shipped_before_or_on_due_date" => $shipped_before_or_on_due_date,
            "percent" => $total_shipped_today > 0 ? ($shipped_before_or_on_due_date/$total_shipped_today)*100 : 0,
            "details" => $results,
        );

    }

    function shippingReport()
    {
        global $databaseQad;

        $mainQry = "
            select overdue_open + due_open open_total_lines 	
                , overdue_open_val + due_open_val total_lines_overdue_value
                , overdue_shipped_val + due_shipped_val + future_shipped_val total_shipped_today_value
                , overdue_shipped + due_shipped + future_shipped total_shipped_today_lines
                , curDate() today_date
        from ( 
            select 
            
                SUM(case when a.sod_per_date < curDate() AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) overdue_open,
                SUM(case when a.sod_per_date = curDate() AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) due_open,

                sum(case when a.sod_per_date < curDate() AND c.so_compl_date IS NULL THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) overdue_open_val,
                sum(case when a.sod_per_date = curDate() AND c.so_compl_date IS NULL THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) due_open_val,

                sum(case when a.sod_per_date < f.abs_shp_date THEN 1 ELSE 0 END ) overdue_shipped, 
                sum(case when f.abs_shp_date = a.sod_per_date AND sod_qty_ord = sod_qty_ship THEN 1 ELSE 0 END ) due_shipped,  
                sum(case when a.sod_per_date > f.abs_shp_date THEN 1 ELSE 0 END ) future_shipped, 

                sum(case when a.sod_per_date < curDate() THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) overdue_shipped_val,
                sum(case when g.abs_shp_date = curDate() AND a.sod_per_date = curDate() THEN sod_list_pr*g.abs_ship_qty ELSE 0 END ) due_shipped_val, 
                sum(case when a.sod_per_date > curDate() THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) future_shipped_val
            
                from sod_det a

            left join (
                select so_nbr, so_compl_date
                from so_mstr
                where so_domain = 'EYE'
            ) c ON c.so_nbr = a.sod_nbr

            LEFT join (
                select abs_line
                    , sum(abs_ship_qty) abs_ship_qty
                    , abs_order
                    , max(abs_shp_date) abs_shp_date
                from abs_mstr 
                where abs_domain = 'EYE'
                and abs_shp_date = curDate()
                and abs_ship_qty > 0
                GROUP BY  abs_line
                    , abs_order
            ) f ON f.abs_order = a.sod_nbr
                AND f.abs_line = a.sod_line

            LEFT join (
                select abs_line
                    , sum(abs_ship_qty) abs_ship_qty
                    , abs_order
                    , max(abs_shp_date) abs_shp_date
                from abs_mstr 
                where abs_domain = 'EYE'
                and abs_ship_qty > 0
                GROUP BY  abs_line
                    , abs_order
            ) g ON g.abs_order = a.sod_nbr
                AND g.abs_line = a.sod_line
                
            WHERE sod_domain = 'EYE'
            AND sod_project = ''
                
        ) a 
        ";
        $query = $databaseQad->pdo->prepare($mainQry);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    $inventoryTurns = array();
    $inventoryTurns[] = fgLV();
    $inventoryTurns[] = rmlv();
    $inventoryTurns[] = jx01();
    $inventoryTurns[] = all();

    
    $inventory = array();
    $inventory[] = safetyStock();
    $inventory[] = getJiaxing('REJECT');
    $inventory = array_merge($inventory, inventoryAndFg());

    $ontime = onTime();
    $shippingReport = shippingReport();
    
    $today = date('Y-m-d');
    
    echo json_encode(array(
        "openSalesOrderAmount" => array(
            "name" => "Open sales order $",
            "subName" => "Calculated based on Overdue & Due Today lines	",
            "value" => $shippingReport['TOTAL_LINES_OVERDUE_VALUE'],
            "subValue" => '(' . $shippingReport['OPEN_TOTAL_LINES'] . ' total open lines)',
        ),
        "linesShippedToday" => array(
            "name" => "Lines shipped today $ " . $shippingReport['TODAY_DATE'],
            "value" => $shippingReport['TOTAL_SHIPPED_TODAY_VALUE'],
            "subValue" => '(' . $shippingReport['TOTAL_SHIPPED_TODAY_LINES'] . ' total open lines)',
        ),
        "shippingOtd" =>  array(
            "name" => "% Shipping OTD ($today)",
            "subName" => "(Lines shipped before or on performance date / Total lines shipped today)",
            "value" => $ontime['percent'],
            "subValue" => '(' . $ontime['shipped_before_or_on_due_date'] . ' of ' . $ontime['total_shipped_today'] . ' total lines shipped)',
        ),
        "productionOrderOtd" =>  array(
            "name" => "% Production Orders OTD ($today)",
            "subName" => "Based on routing 20",
            "value" => $ontime['percent'],
            "subValue" => '(' . $ontime['shipped_before_or_on_due_date'] . ' of ' . $ontime['total_shipped_today'] . ' total lines shipped)',
        ),
        "openLinesForToday" => openLinesForToday(),
        "wip" => wip(),
        "futureOpenRevenueCurrentMonth" => futuerOpenRevenueCurrentMonth(),
        "openLinesForCurrentWeek" => openLinesForCurrentWeek(),
        "getLateReasonCodes" => getLateReasonCodes(),
        "openLinesCurrentMonth" => openLinesCurrentMonth(),

        "shippingOtdDetails" => $ontime,
        "openLinesToday" => $ontime['total_shipped_today'],
        "ops10RoutingCompleted" => ops10RoutingCompleted(),
        "ops20DueAndOverdue" => productionOrders(20),
        "nextThreeMonths" => getThreeMonthsRevenue(),

        // "inventory" => array(
        //     "safetyStock" => safetyStock(),
        //     "transit" => "",
        //     "jiaxing" => "",
        //     "reject" => getJiaxing('REJECT'),
        //     "fg" => $inv['FG_TOTAL'],
        //     "total" => $inv['TOTAL'],
        // ),

        "inventory" => $inventory,
        "inventoryTurns" => $inventoryTurns
    ));