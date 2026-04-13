<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";


    try {  
        
        $mainQry = "
            select a.customer,
                a.group_id,
                a.out_of_state,
                a.property,
                a.request_date,
                concat(a.request_date, ' ', a.start_time) start,
                a.status, 
                concat(IFNULL(a.customer, 'No customer'), '-',IFNULL(a.property, 'No property'), '-',IFNULL(a.service_type, 'No service')) title, 
                'job' type,
                case when a.published = 0 THEN '#FFFF' ELSE b.background_color END backgroundColor,
                b.background_color borderColor,
                case when a.published = 0 THEN '#000' ELSE b.text_color END textColor,
                a.id,
                total total_group
            from fs_scheduler a
            left join fs_settings b ON b.value = a.status
             join (
                select count(id) total
                    , group_id
                from fs_scheduler
                group by group_id
                HAVING total <= 1
            ) c ON c.group_id = a.group_id
            where a.request_date between :dateFrom and :dateTo
            and a.active = 1
        ";
        $query = $db->prepare($mainQry);
        $query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
        $query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
        $query->execute();
        $jobs =  $query->fetchAll(PDO::FETCH_ASSOC);

        $mainQry = "
            select start,
                concat(IFNULL(a.title, 'No title'), '-',IFNULL(a.type, 'No type')) title, 
                'event' type,
                backgroundColor,
                backgroundColor borderColor,
                textColor,
                a.id,
                end
            from companyHoliday a
            where date(start) between :dateFrom and :dateTo
        ";
        $query = $db->prepare($mainQry);
        $query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
        $query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
        $query->execute();
        $events =  $query->fetchAll(PDO::FETCH_ASSOC);


        /**connecting jobs */
        $mainQry = "
            select a.group_id,
                MIN(concat(a.request_date, ' ', a.start_time)) start,
                MAX(concat(a.request_date, ' ', a.start_time)) end,
                concat('Connecting jobs', ':',a.group_id) title,
                'connecting-job' type
            from fs_scheduler a
            left join fs_settings b ON b.value = a.status
            join (
                select count(id) total
                    , group_id
                from fs_scheduler
                    WHERE active = 1
                group by group_id
                hAVING total > 1
            ) c ON c.group_id = a.group_id
            where date(a.request_date) between :dateFrom and :dateTo 
                AND  a.active = 1
            group by a.group_id
        ";
        $query = $db->prepare($mainQry);
        $query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
        $query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
        $query->execute();
        $connectingJobs =  $query->fetchAll(PDO::FETCH_ASSOC);

        $results = array_merge($jobs, $events, $connectingJobs);

        echo $db_connect->json_encode($results);
  
    } catch (Exception $e) {
        echo "Failed: " . $e->getMessage();
    }
