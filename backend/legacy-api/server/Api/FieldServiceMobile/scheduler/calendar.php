<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

    $mainQry = "
        select a.id 
            , a.id fs_scheduler_id
            , a.requested_by 
            , a.status 
            , a.sales_order_number 
            , a.invoice
            , a.service_type 
            , a.customer 
            , a.property 
            , a.city location 
            , a.state 
            , a.sign_theme 
            , a.sign_type 
            , a.comments
            , a.non_billable_code
            , a.start_time 
            , a.notes 
            , a.created_date 
            , a.created_by 
            , a.vendor_inv_number 
            , a.vendor_cost 
            , a.invoice_date 
            , a.invoice_number 
            , a.acc_status 
            , a.platform
            , a.billable
            
            , request_date
            
            , IFNULL(team, 'No techs assigned') installers
            
            , concat(a.id, '-', b.id) fullWorkOrderId
            
            , b.hits
            , b.dateSubmitted
            , b.id workOrderTicketId
            , b.createdDate createdDateWorkOrder
            , b.created_by createdByWorkOrder

            , (case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END) timeToComplete
            
            , concat(a.request_date, ' ', a.start_time) full_request_date
            , concat(a.request_date, ' ', a.start_time) + INTERVAL case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END MINUTE endTime

            , co_number
            , customer_cancelled
            , cancellation_comments
            , cancelled_type
            , a.out_of_state
            , a.invoice_notes
            , CONCAT(a.customer, ' ',  a.property, ' (', a.service_type, ')') title

            , CASE WHEN a.published = 0 THEN '#fff' when a.paper_work_location = 'Accounting' THEN '#871F78' ELSE f.statusColor END backgroundColor 
            , CASE WHEN f.statusColor IS NULL THEN  f.statusColor when a.paper_work_location = 'Accounting' THEN '#871F78' ELSE f.statusColor END borderColor
            , CASE WHEN f.color IS NULL OR a.published = 0 THEN '#000' ELSE f.color  END color

            , a.property_phone property_phone
            , a.zip_code
            , a.compliance_license_notes
            , user.createdByUserName 
            , turnover_fsid
            , a.group_id

            , CONCAT_WS(',', 
            NULLIF(trim(a.property), ''),
            NULLIF(trim(a.address1), ''),
            NULLIF(trim(a.city), ''), 
            NULLIF(trim(a.state), ''), 
            NULLIF(trim(a.zip_code), ''),  
            NULLIF(trim(a.property_phone), '')) full_address

            , a.published
            , a.sign_responsibility
        from eyefidb.fs_scheduler a

        LEFT JOIN (
            SELECT fs_scheduler_id
                , count(fs_scheduler_id) hits
                , max(dateSubmitted) dateSubmitted
                , max(id) id
                , max(createdDate) createdDate
                , max(userId) created_by
            FROM eyefidb.fs_workOrder
            GROUP BY fs_scheduler_id
        ) b ON b.fs_scheduler_id = a.id
        
        LEFT JOIN (
            SELECT name 
                , max(timeToComplete) timeToComplete
            from eyefidb.fs_scheduler_platforms
            where active = 1
            GROUP BY name
        ) c ON a.platform = c.name

        LEFT JOIN (
            SELECT type 
                , value
                , max(statusColor) backgroundColor
                , max(color) color
            from eyefidb.fs_scheduler_settings
            where type = 'status'
            GROUP BY type
                , value
        ) d ON d.value = a.status

        LEFT JOIN (
            select fs_det_id, group_concat(user SEPARATOR ', ') team
            from eyefidb.fs_team
            group by fs_det_id
        ) e ON e.fs_det_id = a.id

        LEFT JOIN eyefidb.fs_scheduler_settings f ON f.value = a.status AND f.type = 'status'

        LEFT JOIN (
            SELECT concat(first, ' ' , last) createdByUserName
                , id
            from db.users
        ) user ON user.id = a.created_by

        WHERE a.active = 1
            AND a.request_date between :dateFrom AND :dateTo
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
    $query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
    $query->execute();
    $results =  $query->fetchAll(PDO::FETCH_ASSOC);

    $newDetails = [];
    foreach ($results as &$row) {
        $newDetails[] = array(
            "id" => $row['id'],
            "start" => $row['full_request_date'],
            "end" => $row['endTime'],
            "title" => $row['title'],
            "backgroundColor" => $row['sign_responsibility'] === 'EyeFi' ? "#00FFFF" : $row['backgroundColor'],
            "textColor" => $row['sign_responsibility'] === 'EyeFi' ? "#000" : $row['color'],
            "borderColor" => $row['sign_responsibility'] === 'EyeFi' ? "#00FFFF" : $row['borderColor'],
            "allDay" => $row['start_time'] == null ? true : false,
            "type" => 0,
            "extendedProps" => (object) array(
                "type" => 0,
                "requested_by" => $row['requested_by'],
                "title" => $row['title'],
                "property" => $row['property'],
                "customer" => $row['customer'],
                "platform" => $row['platform'],
                "sign_type" => $row['sign_type'],
                "service_type" => $row['service_type'],
                "status" => $row['status'],
                "startTime" => $row['full_request_date'],
                "endTime" => $row['endTime'],
                "borderColor" => $row['borderColor'],
                "backgroundColor" => $row['backgroundColor'],
                "installers" => $row['installers'],
                "out_of_state" => $row['out_of_state'],
                "textColor" => $row['color'],
                "group_id" => $row['group_id']
            )
        );
    }

    $mainQry = "
        select *, 
            case when techRelated = 1 THEN concat(title, ' - ', type) ELSE title END title,
            DATE_FORMAT(start, '%Y-%m-%d') startDate, 
            timeDIFF(end, time_format(start, '%H:%i')) duration
        from eyefidb.companyHoliday
        WHERE date(start) between :dateFrom AND :dateTo OR recur = 1
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
    $query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
    $query->execute();
    $eventData = $query->fetchAll(PDO::FETCH_ASSOC);


    $events = array();
    foreach ($eventData as &$row) {

        if ($row['recur'] == 1) {
            $row['rrule'] = new \stdClass;

            $row['rrule']->dtstart = $row['startDate'];
            $row['rrule']->until = $row['until'];


            if ($row['intvl'] != 0)
                $row['rrule']->interval = (int)$row['intvl'];
            if ($row['freq'] != '')
                $row['rrule']->freq = $row['freq'];
            if ($row['count'] != 0)
                $row['rrule']->count = $row['count'];
        }

        $events[] = array(
            "title" => $row['title'],
            "start" => $row['start'],
            "duration" => $row['duration'],
            "id" => $row['id'],
            "end" => $row['end'] == null ? 'All Day' : $row['end'],
            "description" => $row['description'],
            "backgroundColor" => $row['backgroundColor'],
            "groupId" => $row['groupId'],
            "borderColor" => $row['backgroundColor'],
            "textColor" => $row['textColor'],
            "allDay" => (int)$row['allDay'] || $row['end'] == null ? true : false,
            "rrule" => $row['recur'] == 1 ? $row['rrule'] : null,
            "editable" =>  false,
            "daysOfWeek" => $row['recur'] == 1 && !empty($row['daysOfWeek']) ? explode(",", $row['daysOfWeek']) : null,
            "extendedProps" => (object) array(
                "type" => 1,
                "description" => $row['description'],
                "backgroundColor" => $row['backgroundColor'],
                "textColor" => $row['textColor'],
                "title" => $row['title'],
                "start" => $row['start'],
                "end" => $row['end'] == null ? 'All Day' : $row['end'],
                "recur" => (int)$row['recur'],
                "freq" => $row['freq'],
                "allDay" => (int)$row['allDay'] || $row['end'] == null ? true : false,
                "duration" => $row['duration']
            )

        );
    }

    echo $db_connect->json_encode(array(
            "jobs" => $newDetails,
            "events" => $events
        ));

