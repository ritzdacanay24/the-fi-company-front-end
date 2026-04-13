<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";


    try {  

        //Active Jobs only.
        $mainQry = "
            select request_date start,
                request_date end,
                a.id,
                concat(IFNULL(CONCAT(a.customer, ' ',  a.property), 'No title'), '-', a.service_type) title, 
                'JOB' type_of_event,
                CASE 
                    WHEN a.published = 0 OR a.published IS NULL THEN '#fff'
                    WHEN a.sign_responsibility = 'EyeFi' THEN '#00FFFF'
                    ELSE f.statusColor 
                END backgroundColor,
                CASE WHEN f.statusColor IS NULL THEN  f.statusColor ELSE f.statusColor END borderColor,
                CASE 
                    WHEN f.color IS NULL OR a.published = 0 OR a.published IS NULL THEN '#000' 
                    WHEN a.sign_responsibility = 'EyeFi' THEN '#000'
                ELSE f.color 
                END textColor,
                a.id fs_scheduler_id,
                a.active, 
                a.property,
                a.customer,
                a.status,
                b.id ticket_id,
                techs,
                fs_lat,
                fs_lon,
                a.service_type,
                acc_status
            from fs_scheduler a
            LEFT JOIN eyefidb.fs_scheduler_settings f ON f.value = a.status AND f.type = 'status'
            LEFT JOIN eyefidb.fs_workOrder b ON b.fs_scheduler_id = a.id
            LEFT JOIN (
                SELECT group_concat(user SEPARATOR ', ') techs , fs_det_id FROM fs_team GROUP BY fs_det_id 
            ) cc ON cc.fs_det_id = a.id
            where date(request_date) between :dateFrom and :dateTo
            and (a.schedule_later IS NULL OR a.schedule_later = 0)
            and a.active = 1
            order by request_date ASC
        ";
        $query = $db->prepare($mainQry);
        $query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
        $query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
        $query->execute();
        $events =  $query->fetchAll(PDO::FETCH_ASSOC);

        //Calendar events only
        $mainQry = "
            select DATE_FORMAT(start, '%Y-%m-%d') start,
                IFNULL(end, 'All Day') end,
                a.id,
                concat(IFNULL(a.title, 'No title'), ' - ', IFNULL(a.type, '-')) title, 
                'EVENT' type_of_event,
                a.backgroundColor backgroundColor,
                a.backgroundColor borderColor,
                a.textColor textColor
            from companyHoliday a
            where date(start) between :dateFrom and :dateTo
            and a.active = 1
        ";
        $query = $db->prepare($mainQry);
        $query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
        $query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
        $query->execute();
        $events1 =  $query->fetchAll(PDO::FETCH_ASSOC);

        $results = array_merge($events, $events1);

        echo $db_connect->json_encode($results);
  
    } catch (Exception $e) {
        echo "Failed: " . $e->getMessage();
    }
