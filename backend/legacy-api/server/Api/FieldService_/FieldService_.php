<?php

namespace EyefiDb\Api\FieldService_;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;

use EyefiDb\Api\Upload\Upload;

class FieldService_
{

    protected $db;
    public $sessionId;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d H:i:s", time());
        $this->nowDateToday = date("Y-m-d", time());
        $this->uploader = new Upload($this->db);
    }

    public function fieldServiceTicketAuthUsers()
    {
        return $authUsers = [
            'Anthony Foster',
            'Ritz Dacanay',
            'Adriann Kamakahukilani',
            'Seisa Lopez',
            'Leo Noel Rajendran',
            'Phillip Williams',
            'Heidi Elya'
        ];
    }

    public function getMasterWorkOrder()
    {
        $mainQry = "
            select a.id, a.property_id, b.property
            from fs_scheduler a
            left join fs_property_det b ON b.id = a.property_id
            where a.group_id = 8
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function grouped_jobs_get_property()
    {
        $mainQry = "
                SELECT 
                (case when work_order_labor_calculate = 2 THEN 'Job' ELSE proj_type END) type2
                , date1
                , max(projectStart) projectStart
                , sum(total_hrs) tot
                    , group_concat(a.workOrderId) jobs
            
            FROM ( 
            select sum(TIMESTAMPDIFF(MINUTE,a.projectStart ,a.projectFinish)/60) total_hrs
                , a.workOrderId
                , a.proj_type
                , b.work_order_labor_calculate
                , min(a.projectStart) projectStart
                , min(DATE_FORMAT(a.projectStart, '%Y-%m-%d')) date1
            from fs_workOrderProject_copy a
            left join fs_scheduler_settings b ON b.value = a.proj_type AND type = 'Work Order Project Type'
            where a.workOrderId IN (2416, 2414, 2418)
            group by a.workOrderId, a.proj_type, b.work_order_labor_calculate
            ) a
            group by (case when work_order_labor_calculate = 2 THEN 'Job' ELSE proj_type END)
                , date1
          order by projectStart
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getJobs()
    {
        $mainQry = "
            SELECT a.id, 
                a.property, 
                a.RequestDate,
                b.id ticket_id
            FROM eyefidb.fs_scheduler a
            left join eyefidb.fs_workOrder b ON b.fs_scheduler_id = a.id
            where group_id = 8
		";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        return $results;
    }

    public function getTripTypes()
    {
        $mainQry = "
            SELECT category
            FROM eyefidb.fs_trip_settings
		";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);


        return $results;
    }


    public function getTripExpenses()
    {
        $mainQry = "
        SELECT a.category, ext_cost, workOrderId
        FROM eyefidb.fs_trip_settings a
        left join (
        select workOrderId, name, sum(cost) ext_cost 
        from fs_workOrderTrip 
        where workOrderId IN (2416, 2414, 2418) 
        group by workOrderId, name
        ) b ON b.name = a.category
		";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);


        return $results;
    }

    public function getLaborExpenses()
    {
        $mainQry = "
        SELECT a.category, ext_cost, workOrderId
        FROM eyefidb.fs_trip_settings a
        left join (
        select workOrderId, name, sum(cost) ext_cost 
        from fs_workOrderTrip 
        where workOrderId IN (2416, 2414, 2418) 
        group by workOrderId, name
        ) b ON b.name = a.category
		";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);


        return $results;
    }


    public function run()
    {

        $jobs = $this->getJobs();
        $trip_settings = $this->getTripTypes();
        $getTripExpenses = $this->getTripExpenses();

        // $in_array = array();
        // foreach ($jobs as $row) {
        //     $in_array[] = $row['SOD_NBR'] . '-' . $row['SOD_LINE'];
        // }

        // $in = "'" . implode("','", $in_array) . "'";
        foreach ($trip_settings as &$row) {
            $total = 0;
            foreach ($jobs as $job) {
                $row[$job['ticket_id']] = 0;
                foreach ($getTripExpenses as $getTripExpensesRow) {
                    if (
                        $row['category'] == $getTripExpensesRow['category'] &&
                        $job['ticket_id'] == $getTripExpensesRow['workOrderId']
                    )
                        $row[$job['ticket_id']] = $getTripExpensesRow['ext_cost'];
                }
                $total += $row[$job['ticket_id']];
            }
            $row['Total'] = $total;
        }

        return $trip_settings;
    }


    public function generate_job_hour_break_down_explode_grouped($groupId)
    {
        $job_hour_break_down = $this->job_hour_break_down($groupId);
        $job_hour_break_down_by_work_order = $this->job_hour_break_down_by_work_order($groupId);
        $getMasterWorkOrder = $this->getMasterWorkOrder($groupId);
        $run = $this->run($groupId);
        return array(
            "job_hour_break_down" => $job_hour_break_down,
            "job_hour_break_down_by_work_order" => $job_hour_break_down_by_work_order,
            "getMasterWorkOrder" => $getMasterWorkOrder,
            "getTripExpenses" => $run
        );
    }

    public function job_hour_break_down($groupId)
    {
        $mainQry = "
                SELECT 
                (case when work_order_labor_calculate = 2 THEN 'Job' ELSE proj_type END) type2
                , date1
                , max(projectStart) projectStart
                , sum(total_hrs) tot
                , GROUP_CONCAT(DISTINCT a.workOrderId) jobs
                , count(DISTINCT a.workOrderId) total_unique_jobs
            
            FROM ( 
            select sum(TIMESTAMPDIFF(MINUTE,a.projectStart ,a.projectFinish)/60) total_hrs
                , a.workOrderId
                , a.proj_type
                , b.work_order_labor_calculate
                , min(a.projectStart) projectStart
                , min(DATE_FORMAT(a.projectStart, '%Y-%m-%d')) date1
                , count(DISTINCT a.workOrderId) total_unique_jobs
            from fs_workOrderProject_copy a
            left join fs_scheduler_settings b ON b.value = a.proj_type AND type = 'Work Order Project Type'
            where a.workOrderId IN (2416, 2414, 2418)
            group by a.workOrderId, a.proj_type, b.work_order_labor_calculate
            ) a
            group by (case when work_order_labor_calculate = 2 THEN 'Job' ELSE proj_type END)
                , date1
          order by projectStart
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $jobs = $this->getJobs();

        foreach ($results as &$row) {
            $total = 0;
            foreach ($jobs as $job) {
                $row[$job['ticket_id']] = 0;
            }
            $row['Total'] = $total;
            $row['Shared/Stand Alone'] = "";
        }
        return $results;
    }

    public function get_work_order_group_details($group_id = 8){
        $mainQry = "
        
            select a.id
            , a.workOrderId
            , a.proj_type
            , b.work_order_labor_calculate
            , a.projectStart
            , a.projectFinish
            , f.property
            , a.description
            , b.work_order_labor_type 
            
            , DATE_FORMAT(a.projectStart, '%a, %b %e, %Y') projectStartDate
        from fs_workOrderProject_copy a
        left join fs_scheduler_settings b ON b.value = a.proj_type AND type = 'Work Order Project Type'
        left join fs_workOrder wo ON wo.id = a.workOrderId
        join (
            select a.id, a.property_id, b.property
            from fs_scheduler a
            left join fs_property_det b ON b.id = a.property_id
            where a.group_id = :group_id
        ) f ON f.id = wo.fs_scheduler_id
        order by a.projectStart ASC

        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':group_id', $group_id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC); 
    }

    public function job_hour_break_down_by_work_order($groupId)
    {
        $mainQry = "
        SELECT 
        (case when work_order_labor_calculate = 2 THEN 'Job' ELSE proj_type END) type2
        , date1
        , max(projectStart) projectStart
        , sum(total_hrs) tot
        , a.workOrderId
        , count(DISTINCT a.workOrderId) total_unique_jobs
        , property
    
    FROM ( 
    select sum(TIMESTAMPDIFF(MINUTE,a.projectStart ,a.projectFinish)/60) total_hrs
        , a.workOrderId
        , a.proj_type
        , b.work_order_labor_calculate
        , min(a.projectStart) projectStart
        , min(DATE_FORMAT(a.projectStart, '%Y-%m-%d')) date1
        , count(DISTINCT a.workOrderId) total_unique_jobs
          , f.property
    from fs_workOrderProject_copy a
    left join fs_scheduler_settings b ON b.value = a.proj_type AND type = 'Work Order Project Type'
       left join fs_workOrder wo ON wo.id = a.workOrderId
      left join (
          select a.id, a.property_id, b.property
        from fs_scheduler a
        left join fs_property_det b ON b.id = a.property_id
        where a.group_id = 8
      ) f ON f.id = wo.fs_scheduler_id
    where a.workOrderId IN (2416, 2414, 2418)
    group by a.workOrderId, a.proj_type, b.work_order_labor_calculate, f.property
    ) a
    group by (case when work_order_labor_calculate = 2 THEN 'Job' ELSE proj_type END)
        , date1, a.workOrderId, property
order by projectStart
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function serviceJobAndBillingReport($data)
    {

        $mainQry = "
            select a.id, 
                workOrder.id workOrderNumber, 
                a.billable, 
                a.RequestDate, 
                a.Customer, 
                a.RequestedBy, 
                a.SalesOrderNumber, 
                a.ServiceType, 
                a.Property, 
                '' Address, 
                a.Location, 
                a.ST, 
                a.SignTheme, 
                a.SignType, 
                '' EF_Contractor, 
                '' Contractors_invoice_, 
                a.outOfState job_type, 
                a.Status job_status, 
                a.AccStatus invoice_status, 
                '' paper_work_location
            from fs_scheduler a
            left join (
                SELECT * 
                FROM fs_workOrder 
            ) workOrder ON workOrder.fs_scheduler_id = a.id
            where a.SalesOrderNumber = 'SO238780'
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addTechsToFSInstallerTable()
    {
        $mainQry = "
            select a.id, 
                workOrder.id workOrderNumber, 
                a.billable, 
                a.RequestDate, 
                a.Customer, 
                a.RequestedBy, 
                a.SalesOrderNumber, 
                a.ServiceType, 
                a.Property, 
                '' Address, 
                a.Location, 
                a.ST, 
                a.SignTheme, 
                a.SignType, 
                '' EF_Contractor, 
                '' Contractors_invoice_, 
                a.outOfState job_type, 
                a.Status job_status, 
                a.AccStatus invoice_status, 
                '' paper_work_location
            from fs_scheduler a
            left join (
                SELECT * 
                FROM fs_workOrder 
            ) workOrder ON workOrder.fs_scheduler_id = a.id
            where a.SalesOrderNumber = 'SO238780'
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function createEvents($data)
    {
        try {
            $qry = '
                INSERT INTO eyefidb.companyHoliday (
                    start
                    , title
                    , end
                    , description
                    , allDay
                    , backgroundColor
                    , textColor
                    , freq
                    , recur
                    , intvl
                    , daysOfWeek
                    , groupId
                    , duration
                    , count
                    , until
                    , type
                    , techRelated
                ) VALUES ( 
                    :start
                    , :title
                    , :end
                    , :description
                    , :allDay
                    , :backgroundColor
                    , :textColor
                    , :freq
                    , :recur
                    , :intvl
                    , :daysOfWeek
                    , :groupId
                    , :duration
                    , :count
                    , :until
                    , :type
                    , :techRelated
                )
            ';
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':start', $data['start'], PDO::PARAM_STR);
            $stmt->bindParam(':title', $data['title'], PDO::PARAM_STR);
            $stmt->bindParam(':end', $data['end'], PDO::PARAM_STR);
            $stmt->bindParam(':description', $data['description'], PDO::PARAM_STR);
            $stmt->bindParam(':allDay', $data['allDay'], PDO::PARAM_STR);
            $stmt->bindParam(':backgroundColor', $data['backgroundColor'], PDO::PARAM_STR);
            $stmt->bindParam(':textColor', $data['textColor'], PDO::PARAM_STR);
            $stmt->bindParam(':freq', $data['freq'], PDO::PARAM_STR);
            $stmt->bindParam(':recur', $data['recur'], PDO::PARAM_STR);
            $stmt->bindParam(':intvl', $data['intvl'], PDO::PARAM_INT);
            $stmt->bindParam(':daysOfWeek', $data['daysOfWeek'], PDO::PARAM_STR);
            $stmt->bindParam(':groupId', $data['groupId'], PDO::PARAM_STR);
            $stmt->bindParam(':duration', $data['duration'], PDO::PARAM_STR);
            $stmt->bindParam(':until', $data['until'], PDO::PARAM_STR);
            $stmt->bindParam(':count', $data['count'], PDO::PARAM_INT);
            $stmt->bindParam(':type', $data['type'], PDO::PARAM_STR);
            $stmt->bindParam(':techRelated', $data['techRelated'], PDO::PARAM_STR);

            $stmt->execute();
            return $this->db->lastInsertId();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function updateEvent($data)
    {

        try {
            $qry = '
                UPDATE eyefidb.companyHoliday 
                SET start = :start
                    , title = :title
                    , end = :end
                    , description = :description
                    , allDay = :allDay
                    , backgroundColor = :backgroundColor
                    , textColor = :textColor
                    , freq = :freq
                    , recur = :recur
                    , intvl = :intvl
                    , daysOfWeek = :daysOfWeek
                    , groupId = :groupId
                    , duration = :duration
                    , count = :count
                    , until = :until
                    , type = :type
                    , techRelated = :techRelated
                WHERE id = :id
            ';
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':start', $data['start'], PDO::PARAM_STR);
            $stmt->bindParam(':title', $data['title'], PDO::PARAM_STR);
            $stmt->bindParam(':end', $data['end'], PDO::PARAM_STR);
            $stmt->bindParam(':description', $data['description'], PDO::PARAM_STR);
            $stmt->bindParam(':allDay', $data['allDay'], PDO::PARAM_STR);
            $stmt->bindParam(':backgroundColor', $data['backgroundColor'], PDO::PARAM_STR);
            $stmt->bindParam(':textColor', $data['textColor'], PDO::PARAM_STR);
            $stmt->bindParam(':freq', $data['freq'], PDO::PARAM_STR);
            $stmt->bindParam(':recur', $data['recur'], PDO::PARAM_STR);
            $stmt->bindParam(':intvl', $data['intvl'], PDO::PARAM_INT);
            $stmt->bindParam(':daysOfWeek', $data['daysOfWeek'], PDO::PARAM_STR);
            $stmt->bindParam(':groupId', $data['groupId'], PDO::PARAM_STR);
            $stmt->bindParam(':duration', $data['duration'], PDO::PARAM_STR);
            $stmt->bindParam(':until', $data['until'], PDO::PARAM_STR);
            $stmt->bindParam(':count', $data['count'], PDO::PARAM_INT);
            $stmt->bindParam(':type', $data['type'], PDO::PARAM_STR);
            $stmt->bindParam(':techRelated', $data['techRelated'], PDO::PARAM_STR);
            $stmt->bindParam(':id', $data['id'], PDO::PARAM_INT);
            $stmt->execute();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function updateEventStartAndEndDate($data)
    {
        try {
            $qry = '
                UPDATE eyefidb.companyHoliday 
                SET start = :start
                    , end = :end
                WHERE id = :id
            ';
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':start', $data['start'], PDO::PARAM_STR);
            $stmt->bindParam(':end', $data['end'], PDO::PARAM_STR);
            $stmt->bindParam(':id', $data['id'], PDO::PARAM_INT);
            $stmt->execute();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function deleteEvent($data)
    {
        try {
            $qry = '
                DELETE FROM eyefidb.companyHoliday 
                WHERE id = :id
            ';
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':id', $data['id'], PDO::PARAM_INT);
            $stmt->execute();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }



    public function mergeColors()
    {
        $presetBackgroundColors = ['#727cf5', '#7987a1', '#10b759', '#66d1d1', '#fbbc06', '#ff3366', 'green'];

        $generalColors = $this->generalColors();
        //$generalColors = explode(",", $generalColors);
        return array(
            "colors" => array_merge($presetBackgroundColors, $generalColors),
            "textColors" => $this->generalTextColors(),
            "users" => $this->getUsers()
        );
    }

    public function getGeneralById($id)
    {

        try {

            $companyHolidays = $this->eventsById($id);

            $backgroundColors = $this->mergeColors();

            $companyHolidays['allDay'] = $companyHolidays['allDay'] == 1 || $companyHolidays['end'] == null ? true : false;
            $companyHolidays['recur'] = $companyHolidays['recur'] == 1 ? true : false;
            if ($companyHolidays['recur'] == 1) {
                $companyHolidays['noEndDate'] = $companyHolidays['until'] == null ? true : false;
            }
            return array(
                "results" => $companyHolidays,
                "backgroundColors" => $backgroundColors
            );
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function transactions($trans)
    {

        try {
            foreach ($trans as $item) {

                $field = isset($item['field']) ? $item['field'] : "";
                $o = isset($item['o']) ? $item['o'] : "";
                $n = isset($item['n']) ? $item['n'] : "";
                $createDate = $this->nowDate;
                $comment = isset($item['comment']) ? $item['comment'] : "";
                $userId = $this->sessionId;
                $uniqueId = isset($item['uniqueId']) ? $item['uniqueId'] : "";
                $type = isset($item['type']) ? $item['type'] : "";
                $workOrderId = isset($item['workOrderId']) ? $item['workOrderId'] : 0;

                $qry = '
                    INSERT INTO eyefidb.fs_userTrans (
                        field
                        , o
                        , n
                        , createDate
                        , comment
                        , userId
                        , uniqueId
                        , type
                        , workOrderId
                    ) 
                    VALUES( 
                        :field
                        , :o
                        , :n
                        , :createDate
                        , :comment
                        , :userId
                        , :uniqueId
                        , :type
                        , :workOrderId
                    )
                ';
                $stmt = $this->db->prepare($qry);
                $stmt->bindParam(':field', $field, PDO::PARAM_STR);
                $stmt->bindParam(':o', $o, PDO::PARAM_STR);
                $stmt->bindParam(':n', $n, PDO::PARAM_STR);
                $stmt->bindParam(':createDate', $createDate, PDO::PARAM_STR);
                $stmt->bindParam(':comment', $comment, PDO::PARAM_STR);
                $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
                $stmt->bindParam(':uniqueId', $uniqueId, PDO::PARAM_INT);
                $stmt->bindParam(':type', $type, PDO::PARAM_STR);
                $stmt->bindParam(':workOrderId', $workOrderId, PDO::PARAM_STR);
                $stmt->execute();
            }
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function authorizedUsers()
    {

        return array(
            'Adriann Kamakahukilani',
            'srihari vasudevan',
            'Ritz Dacanay',
            'Anthony Foster',
            'Leo Noel Rajendran',
            'Seisa Lopez',
            'Phillip Williams',
            'Simona Jones',
            'Stephen Galvez-Perez',
            'Leticia Branch',
            'Heidi Elya'
        );
    }

    public function getStates()
    {
        $mainQry = "
            select * 
            from eyefidb.states
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getFormValues($ai)
    {

        $mainQry = "
            select * 
            from eyefidb.fs_scheduler_settings
            where active = 1
            ORDER BY value asc
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        if ($ai) {
            $mainQry = "
                select TRIM(Property) value, 'Propertys' type, count(*) hits 
                from eyefidb.fs_scheduler 
                where Property != '' 
                group by TRIM(Property)
                UNION ALL
                select TRIM(RequestedBy) value, 'Requests' type, count(*) hits 
                from eyefidb.fs_scheduler 
                where RequestedBy != ''
                group by TRIM(RequestedBy)
                UNION ALL
                select TRIM(SignTheme) value, 'Themes' type, count(*) hits 
                from eyefidb.fs_scheduler 
                where SignTheme != ''
                group by TRIM(SignTheme)
                UNION ALL
                select TRIM(address) value, 'Addresses' type, count(*) hits 
                from eyefidb.fs_scheduler 
                where address != ''
                group by TRIM(address)
                UNION ALL
                select TRIM(Location) val, 'Location' typ, count(*) hits 
                from eyefidb.fs_scheduler 
                where Location != ''
                group by TRIM(Location)
                order by value
            ";
            $query = $this->db->prepare($mainQry);
            $query->execute();
            $resultsThemes = $query->fetchAll(PDO::FETCH_ASSOC);
        }

        $result = array();

        foreach ($results as $element) {
            $elementType = ucwords($element['type']);
            $elementType = str_replace(' ', '', $elementType);
            $element['checked'] = false;
            $result[$elementType][] = $element;
        }

        if ($ai) {
            foreach ($resultsThemes as $element) {
                $result[$element['type']][] = $element;
            }
        }

        return $result;
    }

    public function ReadPlatforms($active = 0)
    {
        $mainQry = "
            select * 
            from eyefidb.fs_scheduler_platforms
            order by customer asc, name asc
        ";
        if ($active != 'All') {
            $mainQry .= "where active = " . $active;
        }

        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUsers()
    {
        $mainQry = "
            SELECT concat(a.first, ' ', a.last) user
                , a.id
                , false checked
                , b.rate1 user_rate
            FROM db.users a
            left JOIN db.user_rates b ON a.id = b.userId
            WHERE area = 'Field Service'
                AND active = 1 
                AND type = 0
                AND access = 1
            ORDER BY concat(a.first, ' ', a.last) ASC
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results =  $query->fetchAll(PDO::FETCH_ASSOC);

        foreach ($results as &$row) {
            $row['checked'] = $row['checked'] ? true : false;
            $row['outside'] = "Employees";
        }

        return $results;
    }

    public function getEvents()
    {
        try {
            $mainQry = "
                select *, case when techRelated = 1 THEN concat(title, ' - ', type) ELSE title END title
                    timeDIFF(end, time_format(start, '%H:%i')) duration
                from eyefidb.companyHoliday
            ";
            $query = $this->db->prepare($mainQry);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);

            return $results;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getEventsByDate($dateFrom, $dateTo)
    {
        try {
            $mainQry = "
                select *, case when techRelated = 1 THEN concat(title, ' - ', type) ELSE title END title,
                    DATE_FORMAT(start, '%Y-%m-%d') startDate, 
                    timeDIFF(end, time_format(start, '%H:%i')) duration
                from eyefidb.companyHoliday
                WHERE date(start) between :dateFrom AND :dateTo OR recur = 1
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
            $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function generalColors()
    {
        try {
            $mainQry = "
            SELECT DISTINCT backgroundColor backgroundColors FROM eyefidb.companyHoliday WHERE backgroundColor != ''  group by backgroundColor
            ";
            $query = $this->db->prepare($mainQry);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);

            $colors = [];

            foreach ($results as $row) {
                $colors[] = $row['backgroundColors'];
            }

            return $colors;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function generalTextColors()
    {
        try {
            $mainQry = "
            SELECT DISTINCT textColor FROM eyefidb.companyHoliday WHERE textColor != '' group by textColor
            ";
            $query = $this->db->prepare($mainQry);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);

            $colors = [];

            foreach ($results as $row) {
                $colors[] = $row['textColor'];
            }

            return $colors;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function eventsById($id)
    {
        try {
            $mainQry = "
                select *,
                    DATE_FORMAT(start, '%Y-%m-%d') startDate,
                    DATE_FORMAT(start, '%H:%i:%s') startTime,
                    DATE_FORMAT(end, '%H:%i:%s') endTime
                from eyefidb.companyHoliday
                where id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':id', $id, PDO::PARAM_STR);
            $query->execute();
            return $query->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getPropertyReference($fs_scheduler_id)
    {
        try {
            $mainQry = "
                select a.*, a.id fs_property_ref_id,  b.*, CONCAT_WS(', ', 
                NULLIF(trim(b.property), ' '),
                NULLIF(trim(b.address1), ' '),
                NULLIF(trim(b.city), ' '), 
                NULLIF(trim(b.state), ' '), 
                NULLIF(trim(b.zip_code), ' '), 
                NULLIF(trim(b.property_phone), ' ')) full_address
                from fs_property_ref a
                inner join fs_property_det b ON b.id = a.fs_property_det_id
                where a.fs_scheduler_id = :fs_scheduler_id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':fs_scheduler_id', $fs_scheduler_id, PDO::PARAM_STR);
            $query->execute();
            return $query->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function addProperty($post)
    {

        $mainQry = "
            INSERT INTO eyefidb.fs_property_det (property, address1, address2, city, state, zip_code, country, property_phone) 
            VALUES(:property, :address1, :address2, :city, :state, :zip_code, :country, :property_phone)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':property', $post['property'], PDO::PARAM_STR);
        $query->bindParam(':address1', $post['address1'], PDO::PARAM_STR);
        $query->bindParam(':address2', $post['address2'], PDO::PARAM_STR);
        $query->bindParam(':city', $post['city'], PDO::PARAM_STR);
        $query->bindParam(':state', $post['state'], PDO::PARAM_STR);
        $query->bindParam(':zip_code', $post['zip_code'], PDO::PARAM_STR);
        $query->bindParam(':country', $post['country'], PDO::PARAM_STR);
        $query->bindParam(':property_phone', $post['property_phone'], PDO::PARAM_STR);
        $query->execute();
        $id = $this->db->lastInsertId();

        $post['id'] = $id;
        return $post;
    }


    public function editPropertyById($post)
    {

        $this->db->beginTransaction();

        try {
            $mainQry = "
                UPDATE eyefidb.fs_property_det 
                SET property = :property,
                address1 = :address1,
                address2 = :address2,
                city = :city,
                state = :state,
                zip_code = :zip_code,
                country = :country,
                fs_customer_id = :fs_customer_id,
                property_phone = :property_phone,
                active = :active
                WHERE id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':property', $post['property'], PDO::PARAM_STR);
            $query->bindParam(':address1', $post['address1'], PDO::PARAM_STR);
            $query->bindParam(':address2', $post['address2'], PDO::PARAM_STR);
            $query->bindParam(':city', $post['city'], PDO::PARAM_STR);
            $query->bindParam(':state', $post['state'], PDO::PARAM_STR);
            $query->bindParam(':zip_code', $post['zip_code'], PDO::PARAM_STR);
            $query->bindParam(':country', $post['country'], PDO::PARAM_STR);
            $query->bindParam(':fs_customer_id', $post['fs_customer_id'], PDO::PARAM_STR);
            $query->bindParam(':property_phone', $post['property_phone'], PDO::PARAM_STR);
            $query->bindParam(':active', $post['active'], PDO::PARAM_STR);
            $query->bindParam(':id', $post['id'], PDO::PARAM_STR);
            $query->execute();

            $this->db->commit();
            return $post;
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getPropertyById($id)
    {
        $mainQry = "
            SELECT a.*
            FROM fs_property_det a
            where id = :id

        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function updateSchedulerProperty($data)
    {
        if (isset($data['typeOfTransaction']) && $data['typeOfTransaction'] == 'Delete') {
            $cycleSql = "
                DELETE FROM eyefidb.fs_property_ref 
                where id = :id
            ";
            $query = $this->db->prepare($cycleSql);
            $query->bindParam(":id", $data['fs_property_ref_id'], PDO::PARAM_STR);
            $query->execute();
            return true;
        }

        if (isset($data['fs_property_ref_id'])) {
            $cycleSql = "
                UPDATE eyefidb.fs_property_ref 
                SET fs_scheduler_id = :fs_scheduler_id,
                fs_property_det_id = :fs_property_det_id 
                where id = :id
            ";
            $query = $this->db->prepare($cycleSql);
            $query->bindParam(":id", $data['fs_property_ref_id'], PDO::PARAM_STR);
            $query->bindParam(":fs_scheduler_id", $data['fs_scheduler_id'], PDO::PARAM_STR);
            $query->bindParam(":fs_property_det_id", $data['fs_property_det_id'], PDO::PARAM_STR);
            $query->execute();
            return $data['id'];
        } else {
            $cycleSql = "
                INSERT INTO eyefidb.fs_property_ref (fs_scheduler_id, fs_property_det_id) 
                VALUES(:fs_scheduler_id, :fs_property_det_id)
            ";
            $query = $this->db->prepare($cycleSql);
            $query->bindParam(":fs_scheduler_id", $data['fs_scheduler_id'], PDO::PARAM_STR);
            $query->bindParam(":fs_property_det_id", $data['fs_property_det_id'], PDO::PARAM_STR);
            $query->execute();
            return $this->db->lastInsertId();
        }
    }

    public function getAllProperty()
    {

        $mainQry = "
        SELECT a.*, b.fs_property_det_id, b.hits, CONCAT_WS(', ', 
            NULLIF(trim(a.property), ''),
            NULLIF(trim(a.address1), ' '),
            NULLIF(trim(a.city), ' '), 
            NULLIF(trim(a.state), ' '), 
            NULLIF(trim(a.zip_code), ' '), 
            NULLIF(trim(a.property_phone), ' ')) full_address
        FROM fs_property_det a 
        left join (
            select fs_property_det_id, count(*) hits
            from fs_property_ref 
            group by fs_property_det_id
        ) b ON b.fs_property_det_id = a.id
        WHERE CONCAT_WS(', ', 
        NULLIF(trim(a.property), ''),
        NULLIF(trim(a.address1), ' '),
        NULLIF(trim(a.city), ' '), 
        NULLIF(trim(a.state), ' '), 
        NULLIF(trim(a.zip_code), ' '), 
        NULLIF(trim(a.property_phone), ' ')) LIKE ?
        AND ( a.property IS NOT NULL AND a.property != '')
        AND a.active = 1
        ";

        $t = $_GET['text'];

        $params = array("%$t%");

        $query = $this->db->prepare($mainQry);
        $query->execute($params);
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getData($dateFrom, $dateTo, $id, $key = null)
    {
        try {
            $mainQry = "
                select a.id 
                    , a.id fs_scheduler_id

                    , a.Status 
                    , a.SalesOrderNumber 
                    , a.Invoice
                    , a.ServiceType 
                    , a.SignTheme 
                    , a.SignType 
                    , a.Comments
                    
                    , a.StartTime 
                    , a.Notes 
                    , a.createdDate 
                    , a.createdBy 
                    , a.VendorInvNumber 
                    , a.VendorCost 
                    , a.InvoiceDate 
                    , a.InvoiceNumber 
                    , a.AccStatus 
                    , a.platform
                    , a.billable
                    
                    , DAYNAME(a.RequestDate) DOW
                    , RequestDate
                    
                    
                    , IFNULL(team, 'No techs assigned') installers
                    , CASE WHEN a.published = 0 THEN '#fff' ELSE f.background_color END background_color 
                    , CASE WHEN f.background_color IS NULL THEN  f.background_color ELSE f.background_color END border_color
                    , CASE WHEN f.text_color IS NULL OR a.published = 0 THEN '#000' ELSE f.text_color  END text_color
                    
                    , concat(a.id, '-', b.id) fullWorkOrderId
                    
                    , b.hits
                    , b.dateSubmitted
                    , b.id workOrderTicketId
                    , b.createdDate createdDateWorkOrder
                    , b.createdBy createdByWorkOrder

                    , (case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END) timeToComplete
                    
                    , concat(a.RequestDate, ' ', a.StartTime) as startTime
					, concat(a.RequestDate, ' ', a.StartTime) + INTERVAL case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END MINUTE endTime

                    , CoNumber
                    , customerCancelled
                    , cancellationComments
                    , cancelledType
                    , a.outOfState
                    , a.InvoiceNotes
                    , a.nonWorkOrder
                    , CASE 
                        WHEN a.nonWorkOrder = 1 
                            THEN CONCAT(a.Status, ' ', 'Need to set!')
                        ELSE CONCAT(client.company_name, ' ',  IFNULL(address.property, 'No property set') , ' (', IFNULL(a.ServiceType, 'No service type added'), ')')
                    END title
                    , a.endDate

                    

                    , DATE_FORMAT(concat(RequestDate, ' ', StartTime), '%a, %b %e, %Y @ %l:%i%p' ) niceStartDateFormat

                    , TIME_FORMAT(a.StartTime, '%h:%i %p') niceStartTimeFormat

                    , DATE_FORMAT(concat(a.RequestDate, ' ', a.StartTime) + INTERVAL case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END MINUTE, '%W, %M %e, %Y') niceEndDateFormat
                    , TIME_FORMAT(concat(a.RequestDate, ' ', a.StartTime) + INTERVAL case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END MINUTE, '%h:%i %p') niceEndTimeFormat
                    
                    , a.compliance_license_notes
                    , a.published
                    , fm.id group_id

                    , IFNULL(address.property, 'No property set') Property 
                    , address.id property_id 
                    , address.city Location 
                    , address.state ST 
                    , address.property_phone propertyPhoneNumber
                    , address.zip_code zipCode
                    , address.address1 address
                    , address.full_address
                    
                    , client.full_name RequestedBy
                    , client.id client_id 
                    , client.company_name Customer 
                    , client.client_image
                    , concat(a.RequestDate, ' ', a.StartTime) as full_request_date
                    , cc.grouped_jobs
                    , cc.grouped_tickets
                from eyefidb.fs_scheduler a
            
                LEFT JOIN (
                    SELECT fs_scheduler_id
                        , count(fs_scheduler_id) hits
                        , max(dateSubmitted) dateSubmitted
                        , max(id) id
                        , max(createdDate) createdDate
                        , max(userId) createdBy
                    FROM eyefidb.fs_workOrder
                    GROUP BY fs_scheduler_id
                ) b ON b.fs_scheduler_id = a.id

                
                LEFT JOIN (
                    SELECT group_concat(a.id) grouped_jobs, a.group_id, group_concat(grouped_tickets) grouped_tickets
                    from eyefidb.fs_scheduler a
                    LEFT JOIN (
                        SELECT fs_scheduler_id
                            , group_concat(id) grouped_tickets
                        FROM eyefidb.fs_workOrder
                        GROUP BY fs_scheduler_id
                    ) b ON b.fs_scheduler_id = a.id
                    where a.active = 1
                    GROUP BY a.group_id
                ) cc ON cc.group_id = a.group_id
                
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
                    where type = 'Status'
                    GROUP BY type
                        , value
                ) d ON d.value = a.Status

                LEFT JOIN (
                    select fs_det_id, group_concat(user SEPARATOR ', ') team
                    from eyefidb.fs_team
                    group by fs_det_id
                ) e ON e.fs_det_id = a.id

                LEFT JOIN eyefidb.fs_settings f ON f.value = a.status AND f.type = 'Status'

                
                left join eyefidb.fs_mstr fm ON fm.id = a.group_id

                left join (
                    select b.*
                        , CONCAT_WS(', ', 
                        NULLIF(trim(b.property), ' '),
                        NULLIF(trim(b.address1), ' '),
                        NULLIF(trim(b.city), ' '), 
                        NULLIF(trim(b.state), ' '), 
                        NULLIF(trim(b.zip_code), ' '), 
                        NULLIF(trim(b.property_phone), ' ')) full_address 
                    from fs_property_det b
                ) address ON address.id = a.property_id

                left join (
                    SELECT a.*, b.name company_name, b.image client_image
                    FROM fs_client_det a
                    left join fs_company_det b ON b.id = a.company_id
                ) client ON client.id = a.client_id

                WHERE a.active = 1
                    and nonWorkOrder = 0
                
            ";

            if (isset($key)) {
                $mainQry .= " AND a.group_id = '$id' ";
            } else if ($id) {
                $mainQry .= " AND a.id = '$id' ";
            } else {
                $mainQry .= " AND a.RequestDate between '$dateFrom' and '$dateTo' ";
            }

            $mainQry .= "  order by a.RequestDate DESC ";

            $query = $this->db->prepare($mainQry);

            $query->execute();

            if (isset($key)) {
                $results = $query->fetchAll(PDO::FETCH_ASSOC);
            }else if ($id) {
                $results = $query->fetch(PDO::FETCH_ASSOC);
            } else {
                $results = $query->fetchAll(PDO::FETCH_ASSOC);
            }

            return $results;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function availableTechs($dateFrom, $dateTo)
    {
        return $this->structureCalendarData($dateFrom, $dateTo);
    }



    public function structureCalendarData($dateFrom, $dateTo)
    {
        $companyHolidays = $this->getEventsByDate($dateFrom, $dateTo);
        $workOrders = $this->getData($dateFrom, $dateTo, null);


        $obj = array();
        foreach ($companyHolidays as &$row) {

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

            $obj[] = array(
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

        $newDetails = [];
        foreach ($workOrders as &$row) {
            $newDetails[] = array(
                "id" => $row['id'],
                "start" => $row['startTime'],
                "end" => $row['endTime'],
                "title" => $row['title'],
                "backgroundColor" => $row['background_color'],
                "textColor" => $row['text_color'],
                "borderColor" => $row['border_color'],
                "allDay" => $row['nonWorkOrder'] == '1' || $row['StartTime'] == null ? true : false,
                "type" => $row['nonWorkOrder'] == '1' ? 1 : 0,
                "extendedProps" => (object) array(
                    "type" => 0,
                    "RequestedBy" => $row['RequestedBy'],
                    "title" => $row['title'],
                    "Property" => $row['Property'],
                    "Customer" => $row['Customer'],
                    "platform" => $row['platform'],
                    "SignType" => $row['SignType'],
                    "ServiceType" => $row['ServiceType'],
                    "Status" => $row['Status'],
                    "group_id" => $row['group_id'],
                    "startTime" => $row['startTime'],
                    "endTime" => $row['endTime'],
                    "borderColor" => $row['background_color'],
                    "backgroundColor" => $row['background_color'],
                    "installers" => $row['installers'],
                    "outOfState" => $row['outOfState'],
                    "textColor" => $row['text_color']
                )
            );
        }

        return array(
            "results" => $newDetails,
            "companyHoliday" => $obj
        );
    }

    public function getCalendarData($dateFrom, $dateTo)
    {

        $structureCalendarData = $this->structureCalendarData($dateFrom, $dateTo);
        return array(
            "results" => $structureCalendarData['results'],
            "states" => $this->getStates(),
            "settings" => $this->getFormValues(false),
            "platforms" => $this->ReadPlatforms(),
            "users" => $this->getUsers(),
            "authorizedUsers" => $this->authorizedUsers(),
            "companyHoliday" => $structureCalendarData['companyHoliday']
        );
    }

    
    public function getFullEvents($readWorkOrderJobsByTech, $ticketStatus)
    {
        $qry = "
            select '' id 
                , DATE_FORMAT(start, '%a, %b %e, %Y') full_request_date
                , concat(type) Property
                , 'Event' typeOf
                , '' ServiceType 
                , '' outOfState
                , '' full_address
                , null dateSubmitted
                , '' hits
                , '' fs_scheduler_id
                , 'Confirmed' Status
                , DATE_FORMAT(start, '%Y-%m-%d') RequestDate
                , '' StartTime
                , 1 active
                , title team
                , type title
            from eyefidb.companyHoliday
            where DATE_FORMAT(start, '%Y-%m-%d') >= curDate()
            and  title LIKE CONCAT('%', :team, '%')
            ORDER BY DATEDIFF(start, now()) ASC, start DESC
        ";



        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':team', $readWorkOrderJobsByTech, PDO::PARAM_STR);
        $stmt->execute();
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $jobs = $this->getTicketAssignmentsByTechs($readWorkOrderJobsByTech, $ticketStatus);

        return  (array_merge($events ,$jobs));
    }

    public function getEventsByJob($id)
    {
        $mainQry = "
            SELECT id
                , DATE_FORMAT(concat(RequestDate, ' ', StartTime), '%a, %b %e, %Y @ %l:%i%p' ) date_format
                , Property title 
                , 'Schedule' typeOf
            FROM eyefidb.fs_scheduler 
            where group_id = :id
            UNION ALL 
                select '' id 
                , DATE_FORMAT(start, '%a, %b %e, %Y') date_format
                , concat(title, ' ', type) title
                , 'Event' typeOf
            from eyefidb.companyHoliday
            where fs_scheduler_id = :id
            order by date_format ASC
        ";
        $mainQry = "
            SELECT id
                , DATE_FORMAT(concat(RequestDate, ' ', StartTime), '%a, %b %e, %Y @ %l:%i%p' ) date_format
                , Property title 
                , 'Schedule' typeOf
            FROM eyefidb.fs_scheduler 
            where group_id = :id
            order by date_format ASC
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);

        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }


    public function viewById($byFsId)
    {

        $results = $this->getData(null, null, $byFsId);

        return array(
            "results" => $results,
            "techs" => $this->getTechsAssignedToJob($byFsId),
            "states" => $this->getStates(),
            "settings" => $this->getFormValues(true),
            "platforms" => $this->ReadPlatforms(),
            "users" => $this->getUsers(),
            "authorizedUsers" => $this->authorizedUsers(),
            "groupEvents" => isset($results['group_id']) ? $this->getEventsByJob($results['group_id']) : [],
            "property" => $this->getPropertyReference($byFsId)
        );
    }

    public function setEmptyValue($date, $setDefaultValue = null)
    {
        if (empty($date)) {
            return $setDefaultValue;
        }

        return $date;
    }

    /**
     * Create work order
     * This work is placed to the field service calendar
     *
     * @param [object] $post
     * @return void
     */
    public function createWorkOrder($post)
    {

        $this->db->beginTransaction();
        try {

            $RequestDate = $this->setEmptyValue($post['RequestDate']);
            $InvoiceDate = $this->setEmptyValue($post['InvoiceDate']);
            $nonWorkOrder = $this->setEmptyValue($post['nonWorkOrder'], 0);

            if (isset($post['turnover_fsid'])) {
                if ($post['turnover_fsid'] == "") {
                    $turnover_fsid = null;
                } else {
                    $turnover_fsid = $post['turnover_fsid'];
                }
            } else {
                $turnover_fsid = null;
            }

            $mainQry = "
                INSERT INTO eyefidb.fs_scheduler (
                    RequestDate
                    , DOW
                    , RequestedBy
                    , Status
                    , SalesOrderNumber
                    , Invoice
                    , ServiceType
                    , Customer
                    , SignTheme
                    , SignType
                    , Comments
                    , StartTime
                    , Notes
                    , createdDate
                    , createdBy
                    , VendorInvNumber
                    , VendorCost
                    , InvoiceDate
                    , InvoiceNumber
                    , AccStatus
                    , platform
                    , billable
                    , originalRequestDate
                    , outOfState
                    , InvoiceNotes
                    , CoNumber
                    , customerCancelled
                    , cancellationComments
                    , cancelledType
                    , nonWorkOrder
                    , endDate
                    , ef_hourly_rate
                    , ef_overtime_hourly_rate
                    , markUpPercent
                    , paperWorkLocation
                    , billableFlatRateOrPO
                    , contractorInvSentToAP
                    , period
                    , compliance_license_notes
                    , turnover_fsid
                    , published
                    , property_id
                    , client_id
                )VALUES(
                    :RequestDate
                    , :DOW
                    , :RequestedBy
                    , :Status
                    , :SalesOrderNumber
                    , :Invoice
                    , :ServiceType
                    , :Customer
                    , :SignTheme
                    , :SignType
                    , :Comments
                    , :StartTime
                    , :Notes
                    , :createdDate
                    , :createdBy
                    , :VendorInvNumber
                    , :VendorCost
                    , :InvoiceDate
                    , :InvoiceNumber
                    , :AccStatus
                    , :platform
                    , :billable
                    , :originalRequestDate
                    , :outOfState
                    , :InvoiceNotes	
                    , :CoNumber
                    , :customerCancelled
                    , :cancellationComments
                    , :cancelledType
                    , :nonWorkOrder
                    , :endDate
                    , :ef_hourly_rate
                    , :ef_overtime_hourly_rate
                    , :markUpPercent
                    , :paperWorkLocation
                    , :billableFlatRateOrPO
                    , :contractorInvSentToAP
                    , :period
                    , :compliance_license_notes
                    , :turnover_fsid
                    , :published
                    , :property_id
                    , :client_id
                )
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':RequestDate', $RequestDate, PDO::PARAM_STR);
            $query->bindParam(':DOW', $post['DOW'], PDO::PARAM_STR);
            $query->bindParam(':RequestedBy', $post['RequestedBy'], PDO::PARAM_STR);
            $query->bindParam(':Status', $post['Status'], PDO::PARAM_STR);
            $query->bindParam(':SalesOrderNumber', $post['SalesOrderNumber'], PDO::PARAM_STR);
            $query->bindParam(':Invoice', $post['Invoice'], PDO::PARAM_STR);
            $query->bindParam(':ServiceType', $post['ServiceType'], PDO::PARAM_STR);
            $query->bindParam(':Customer', $post['Customer'], PDO::PARAM_STR);
            $query->bindParam(':SignTheme', $post['SignTheme'], PDO::PARAM_STR);
            $query->bindParam(':SignType', $post['SignType'], PDO::PARAM_STR);
            $query->bindParam(':Comments', $post['Comments'], PDO::PARAM_STR);
            $query->bindParam(':StartTime', $post['StartTime'], PDO::PARAM_STR);
            $query->bindParam(':Notes', $post['Notes'], PDO::PARAM_STR);
            $query->bindParam(':createdBy', $post['createdBy'], PDO::PARAM_INT);
            $query->bindParam(':createdDate', $post['createdDate'], PDO::PARAM_STR);
            $query->bindParam(':VendorInvNumber', $post['VendorInvNumber'], PDO::PARAM_STR);
            $query->bindParam(':VendorCost', $post['VendorCost'], PDO::PARAM_STR);
            $query->bindParam(':InvoiceDate', $InvoiceDate, PDO::PARAM_STR);
            $query->bindParam(':InvoiceNumber', $post['InvoiceNumber'], PDO::PARAM_STR);
            $query->bindParam(':AccStatus', $post['AccStatus'], PDO::PARAM_STR);
            $query->bindParam(':platform', $post['platform'], PDO::PARAM_STR);
            $query->bindParam(':billable', $post['billable'], PDO::PARAM_STR);
            $query->bindParam(':originalRequestDate', $RequestDate, PDO::PARAM_STR);
            $query->bindParam(':outOfState', $post['outOfState'], PDO::PARAM_STR);
            $query->bindParam(':InvoiceNotes', $post['InvoiceNotes'], PDO::PARAM_STR);
            $query->bindParam(':CoNumber', $post['CoNumber'], PDO::PARAM_STR);
            $query->bindParam(':customerCancelled', $post['customerCancelled'], PDO::PARAM_STR);
            $query->bindParam(':cancellationComments', $post['cancellationComments'], PDO::PARAM_STR);
            $query->bindParam(':cancelledType', $post['cancelledType'], PDO::PARAM_STR);
            $query->bindParam(':endDate', $post['endDate'], PDO::PARAM_STR);
            $query->bindParam(':nonWorkOrder', $nonWorkOrder, PDO::PARAM_INT);
            $query->bindParam(':ef_hourly_rate', $post['ef_hourly_rate'], PDO::PARAM_STR);
            $query->bindParam(':ef_overtime_hourly_rate', $post['ef_overtime_hourly_rate'], PDO::PARAM_STR);
            $query->bindParam(':markUpPercent', $post['markUpPercent'], PDO::PARAM_STR);
            $query->bindParam(':paperWorkLocation', $post['paperWorkLocation'], PDO::PARAM_STR);
            $query->bindParam(':billableFlatRateOrPO', $post['billableFlatRateOrPO'], PDO::PARAM_STR);
            $query->bindParam(':contractorInvSentToAP', $post['contractorInvSentToAP'], PDO::PARAM_STR);
            $query->bindParam(':period', $post['period'], PDO::PARAM_STR);
            $query->bindParam(':compliance_license_notes', $post['compliance_license_notes'], PDO::PARAM_STR);
            $query->bindParam(':turnover_fsid', $turnover_fsid, PDO::PARAM_STR);
            $query->bindParam(':published', $post['published'], PDO::PARAM_STR);
            $query->bindParam(':property_id', $post['property_id'], PDO::PARAM_STR);
            $query->bindParam(':client_id', $post['client_id'], PDO::PARAM_STR);


            $query->execute();
            $last_id = $this->db->lastInsertId();


            if (count($post['teams']) > 0) {

                foreach ($post['teams'] as $row) {
                    $this->addTechToAssignment(
                        array(
                            "user" => $row['user'],
                            "fs_det_id" => $last_id,
                            "user_rate" => $row['user_rate'],
                            "lead_tech" => $row['lead_tech'],
                        )
                    );
                }
            }


            $this->db->commit();

            return $last_id;
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function overview()
    {
        try {
            $mainQry = "
                SELECT count(*) hits  
                FROM `fs_scheduler`
                where Status = 'Confirmed'
            ";
            $query = $this->db->prepare($mainQry);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    /**
     * Update work order request date and start time
     *
     * @param [type] $post
     * @return void
     */
    public function updateWorkOrderRequestDateAndTime($post)
    {

        $this->db->beginTransaction();

        try {
            $mainQry = "
                UPDATE eyefidb.fs_scheduler 
                SET RequestDate = :RequestDate,
                    StartTime = :startTime
                WHERE id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':RequestDate', $post['requestDate'], PDO::PARAM_STR);
            $query->bindParam(':startTime', $post['startTime'], PDO::PARAM_STR);
            $query->bindParam(':id', $post['id'], PDO::PARAM_STR);
            $query->execute();

            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getTechsAssignedToJob($id)
    {
        $mainQry = "
            SELECT * 
            from eyefidb.fs_team
            WHERE fs_det_id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }


    public function deleteTeamsByFsId($id)
    {
        try {
            $mainQry = "
                DELETE FROM eyefidb.fs_team
                WHERE fs_det_id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':id', $id, PDO::PARAM_STR);
            $query->execute();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }
    public function addTechToAssignment($post)
    {


        try {
            $mainQry = "
                INSERT INTO eyefidb.fs_team (user, fs_det_id, user_rate, lead_tech, contractor_code) 
                VALUES(:user, :fs_det_id, :user_rate, :lead_tech, :contractor_code)
            ";
            
            $contractorCode = ISSET($post['contractor_code']) ? $post['contractor_code'] : null;

            $query = $this->db->prepare($mainQry);
            $query->bindParam(':user', $post['user'], PDO::PARAM_STR);
            $query->bindParam(':fs_det_id', $post['fs_det_id'], PDO::PARAM_STR);
            $query->bindParam(':user_rate', $post['user_rate'], PDO::PARAM_STR);
            $query->bindParam(':lead_tech', $post['lead_tech'], PDO::PARAM_STR);
            $query->bindParam(':contractor_code', $contractorCode, PDO::PARAM_INT);
            $query->execute();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    /**
     * Undocumented function
     *
     * @param [type] $post
     * @return void
     */
    public function updateWorkOrder($post)
    {

        $this->db->beginTransaction();
        $fsTrans = array();

        try {

            $RequestDate = $this->setEmptyValue($post['RequestDate']);
            $InvoiceDate = $this->setEmptyValue($post['InvoiceDate']);
            $nonWorkOrder = $this->setEmptyValue($post['nonWorkOrder'], 0);
            $billable = $this->setEmptyValue($post['billable'], '');

            $mainQry = "
                SELECT *
                FROM eyefidb.fs_scheduler a
                WHERE a.id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(":id", $post['id'], PDO::PARAM_INT);
            $query->execute();
            $row = $query->fetch();

            //start Transactions
            if (isset($row['RequestDate']) && $row['RequestDate'] != $RequestDate) {
                $fsTrans[] = array(
                    'field' => 'Request Date changed', 'o' => $row['RequestDate'], 'n' => $RequestDate, 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['RequestedBy']) && $row['RequestedBy'] != $post['RequestedBy']) {
                $fsTrans[] = array(
                    'field' => 'Request By changed', 'o' => $row['RequestedBy'], 'n' => $post['RequestedBy'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['Status']) && $row['Status'] != $post['Status']) {
                $fsTrans[] = array(
                    'field' => 'Status changed', 'o' => $row['Status'], 'n' => $post['Status'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['SalesOrderNumber']) && $row['SalesOrderNumber'] != $post['SalesOrderNumber']) {
                $fsTrans[] = array(
                    'field' => 'Sales Order Number changed', 'o' => $row['SalesOrderNumber'], 'n' => $post['SalesOrderNumber'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['ServiceType']) && $row['ServiceType'] != $post['ServiceType']) {
                $fsTrans[] = array(
                    'field' => 'Service Type changed', 'o' => $row['ServiceType'], 'n' => $post['ServiceType'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['Customer']) && $row['Customer'] != $post['Customer']) {
                $fsTrans[] = array(
                    'field' => 'Customer changed', 'o' => $row['Customer'], 'n' => $post['Customer'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['SignTheme']) && $row['SignTheme'] != $post['SignTheme']) {
                $fsTrans[] = array(
                    'field' => 'Sign Theme changed', 'o' => $row['SignTheme'], 'n' => $post['SignTheme'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['SignType']) && $row['SignType'] != $post['SignType']) {
                $fsTrans[] = array(
                    'field' => 'Sign Type changed', 'o' => $row['SignType'], 'n' => $post['SignType'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['Comments']) && $row['Comments'] != $post['Comments']) {
                $fsTrans[] = array(
                    'field' => 'Comments changed', 'o' => $row['Comments'], 'n' => $post['Comments'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['StartTime']) && $row['StartTime'] != $post['StartTime']) {
                $fsTrans[] = array(
                    'field' => 'StartTime changed', 'o' => $row['StartTime'], 'n' => $post['StartTime'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['Notes']) && $row['Notes'] != $post['Notes']) {
                $fsTrans[] = array(
                    'field' => 'Notes changed', 'o' => $row['Notes'], 'n' => $post['Notes'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['platform']) && $row['platform'] != $post['platform']) {
                $fsTrans[] = array(
                    'field' => 'Platform changed', 'o' => $row['platform'], 'n' => $post['platform'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }

            if (isset($row['billable']) && $row['billable'] != $billable) {
                $fsTrans[] = array(
                    'field' => 'Billable changed', 'o' => $row['billable'], 'n' => $billable, 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['VendorInvNumber']) && $row['VendorInvNumber'] != $post['VendorInvNumber']) {
                $fsTrans[] = array(
                    'field' => 'Vendor Inv Number changed', 'o' => $row['VendorInvNumber'], 'n' => $post['VendorInvNumber'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['VendorCost']) && $row['VendorCost'] != $post['VendorCost']) {
                $fsTrans[] = array(
                    'field' => 'Vendor Cost changed', 'o' => $row['VendorCost'], 'n' => $post['VendorCost'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['InvoiceDate']) && $row['InvoiceDate'] != $InvoiceDate) {
                $fsTrans[] = array(
                    'field' => 'Invoice Date changed', 'o' => $row['InvoiceDate'], 'n' => $InvoiceDate, 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['InvoiceNumber']) && $row['InvoiceNumber'] != $post['InvoiceNumber']) {
                $fsTrans[] = array(
                    'field' => 'Invoice Number changed', 'o' => $row['InvoiceNumber'], 'n' => $post['InvoiceNumber'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['AccStatus']) && $row['AccStatus'] != $post['AccStatus']) {
                $fsTrans[] = array(
                    'field' => 'Acc Status changed', 'o' => $row['AccStatus'], 'n' => $post['AccStatus'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['outOfState']) && $row['outOfState'] != $post['outOfState']) {
                $fsTrans[] = array(
                    'field' => 'Out Of State changed', 'o' => $row['outOfState'], 'n' => $post['outOfState'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['InvoiceNotes']) && $row['InvoiceNotes'] != $post['InvoiceNotes']) {
                $fsTrans[] = array(
                    'field' => 'Invoice Notes changed', 'o' => $row['InvoiceNotes'], 'n' => $post['InvoiceNotes'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['CoNumber']) && $row['CoNumber'] != $post['CoNumber']) {
                $fsTrans[] = array(
                    'field' => 'Co Number changed', 'o' => $row['CoNumber'], 'n' => $post['CoNumber'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['customerCancelled']) && $row['customerCancelled'] != $post['customerCancelled']) {
                $fsTrans[] = array(
                    'field' => 'Customer Cancelled changed', 'o' => $row['customerCancelled'], 'n' => $post['customerCancelled'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['cancellationComments']) && $row['cancellationComments'] != $post['cancellationComments']) {
                $fsTrans[] = array(
                    'field' => 'Cancellation changed', 'o' => $row['cancellationComments'], 'n' => $post['cancellationComments'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['cancelledType']) && $row['cancelledType'] != $post['cancelledType']) {
                $fsTrans[] = array(
                    'field' => 'Cancellation Type changed', 'o' => $row['cancelledType'], 'n' => $post['cancelledType'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['nonWorkOrder']) && $row['nonWorkOrder'] != $nonWorkOrder) {
                $fsTrans[] = array(
                    'field' => 'Cancellation Type changed', 'o' => $row['nonWorkOrder'], 'n' => $nonWorkOrder, 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['active']) && $row['active'] != $post['active']) {
                $fsTrans[] = array(
                    'field' => 'Active changed', 'o' => $row['active'], 'n' => $post['active'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['ef_hourly_rate']) && $row['ef_hourly_rate'] != $post['ef_hourly_rate']) {
                $fsTrans[] = array(
                    'field' => 'EF Hourly Rate changed', 'o' => $row['ef_hourly_rate'], 'n' => $post['ef_hourly_rate'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['ef_overtime_hourly_rate']) && $row['ef_overtime_hourly_rate'] != $post['ef_overtime_hourly_rate']) {
                $fsTrans[] = array(
                    'field' => 'EF Overtime Hourly Rate changed', 'o' => $row['ef_overtime_hourly_rate'], 'n' => $post['ef_overtime_hourly_rate'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['markUpPercent']) && $row['markUpPercent'] != $post['markUpPercent']) {
                $fsTrans[] = array(
                    'field' => 'Mark Up Percent changed', 'o' => $row['markUpPercent'], 'n' => $post['markUpPercent'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['paperWorkLocation']) && $row['paperWorkLocation'] != $post['paperWorkLocation']) {
                $fsTrans[] = array(
                    'field' => 'Paper Work Locationt changed', 'o' => $row['paperWorkLocation'], 'n' => $post['paperWorkLocation'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['billableFlatRateOrPO']) && $row['billableFlatRateOrPO'] != $post['billableFlatRateOrPO']) {
                $fsTrans[] = array(
                    'field' => 'Billable Flat Rate/PO changed', 'o' => $row['billableFlatRateOrPO'], 'n' => $post['billableFlatRateOrPO'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['contractorInvSentToAP']) && $row['contractorInvSentToAP'] != $post['contractorInvSentToAP']) {
                $fsTrans[] = array(
                    'field' => 'Contractor Inv Sent To AP changed', 'o' => $row['contractorInvSentToAP'], 'n' => $post['contractorInvSentToAP'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['period']) && $row['period'] != $post['period']) {
                $fsTrans[] = array(
                    'field' => 'Period changed', 'o' => $row['period'], 'n' => $post['period'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['compliance_license_notes']) && $row['compliance_license_notes'] != $post['compliance_license_notes']) {
                $fsTrans[] = array(
                    'field' => 'Compliance License Notes changed', 'o' => $row['compliance_license_notes'], 'n' => $post['compliance_license_notes'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }

            if (isset($post['turnover_fsid'])) {
                if ($post['turnover_fsid'] == "") {
                    $turnover_fsid = null;
                } else {
                    $turnover_fsid = $post['turnover_fsid'];
                }
            } else {
                $turnover_fsid = null;
            }

            $mainQry = "
                UPDATE eyefidb.fs_scheduler 
                SET RequestDate = :RequestDate
                    , DOW = :DOW
                    , RequestedBy = :RequestedBy
                    , Status = :Status
                    , SalesOrderNumber = :SalesOrderNumber
                    , Invoice = :Invoice
                    , ServiceType = :ServiceType
                    , Customer = :Customer
                    , SignTheme = :SignTheme
                    , SignType = :SignType
                    , Comments = :Comments
                    , StartTime = :StartTime
                    , Notes = :Notes
                    , VendorInvNumber = :VendorInvNumber
                    , VendorCost = :VendorCost
                    , InvoiceDate = :InvoiceDate
                    , InvoiceNumber = :InvoiceNumber
                    , AccStatus = :AccStatus
                    , platform = :platform
                    , billable = :billable
                    , outOfState = :outOfState 
                    , InvoiceNotes = :InvoiceNotes
                    , CoNumber = :CoNumber
                    , customerCancelled = :customerCancelled 
                    , cancellationComments = :cancellationComments
                    , cancelledType = :cancelledType
                    , nonWorkOrder = :nonWorkOrder
                    , active = :active
                    , endDate = :endDate
                    , ef_hourly_rate = :ef_hourly_rate
                    , ef_overtime_hourly_rate = :ef_overtime_hourly_rate
                    , markUpPercent = :markUpPercent
                    , paperWorkLocation = :paperWorkLocation
                    , billableFlatRateOrPO = :billableFlatRateOrPO
                    , contractorInvSentToAP = :contractorInvSentToAP
                    , period = :period
                    , compliance_license_notes = :compliance_license_notes
                    , turnover_fsid = :turnover_fsid
                    , published = :published
                    , property_id = :property_id
                    , client_id = :client_id
                WHERE id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':RequestDate', $RequestDate, PDO::PARAM_STR);
            $query->bindParam(':DOW', $post['DOW'], PDO::PARAM_STR);
            $query->bindParam(':RequestedBy', $post['RequestedBy'], PDO::PARAM_STR);
            $query->bindParam(':Status', $post['Status'], PDO::PARAM_STR);
            $query->bindParam(':SalesOrderNumber', $post['SalesOrderNumber'], PDO::PARAM_STR);
            $query->bindParam(':Invoice', $post['Invoice'], PDO::PARAM_STR);
            $query->bindParam(':ServiceType', $post['ServiceType'], PDO::PARAM_STR);
            $query->bindParam(':Customer', $post['Customer'], PDO::PARAM_STR);
            $query->bindParam(':SignTheme', $post['SignTheme'], PDO::PARAM_STR);
            $query->bindParam(':SignType', $post['SignType'], PDO::PARAM_STR);
            $query->bindParam(':Comments', $post['Comments'], PDO::PARAM_STR);

            $query->bindParam(':StartTime', $post['StartTime'], PDO::PARAM_STR);
            $query->bindParam(':Notes', $post['Notes'], PDO::PARAM_STR);
            $query->bindParam(':VendorInvNumber', $post['VendorInvNumber'], PDO::PARAM_STR);
            $query->bindParam(':VendorCost', $post['VendorCost'], PDO::PARAM_STR);
            $query->bindParam(':InvoiceDate', $InvoiceDate, PDO::PARAM_STR);
            $query->bindParam(':InvoiceNumber', $post['InvoiceNumber'], PDO::PARAM_STR);
            $query->bindParam(':AccStatus', $post['AccStatus'], PDO::PARAM_STR);
            $query->bindParam(':platform', $post['platform'], PDO::PARAM_STR);
            $query->bindParam(':billable', $billable, PDO::PARAM_STR);
            $query->bindParam(':outOfState', $post['outOfState'], PDO::PARAM_STR);
            $query->bindParam(':InvoiceNotes', $post['InvoiceNotes'], PDO::PARAM_STR);
            $query->bindParam(':CoNumber', $post['CoNumber'], PDO::PARAM_STR);
            $query->bindParam(':customerCancelled', $post['customerCancelled'], PDO::PARAM_STR);
            $query->bindParam(':cancellationComments', $post['cancellationComments'], PDO::PARAM_STR);
            $query->bindParam(':cancelledType', $post['cancelledType'], PDO::PARAM_STR);
            $query->bindParam(':active', $post['active'], PDO::PARAM_INT);
            $query->bindParam(':nonWorkOrder', $nonWorkOrder, PDO::PARAM_INT);
            $query->bindParam(':endDate', $post['endDate'], PDO::PARAM_STR);
            $query->bindParam(':ef_hourly_rate', $post['ef_hourly_rate'], PDO::PARAM_INT);
            $query->bindParam(':ef_overtime_hourly_rate', $post['ef_overtime_hourly_rate'], PDO::PARAM_STR);

            $query->bindParam(':markUpPercent', $post['markUpPercent'], PDO::PARAM_STR);
            $query->bindParam(':paperWorkLocation', $post['paperWorkLocation'], PDO::PARAM_STR);
            $query->bindParam(':billableFlatRateOrPO', $post['billableFlatRateOrPO'], PDO::PARAM_STR);
            $query->bindParam(':contractorInvSentToAP', $post['contractorInvSentToAP'], PDO::PARAM_STR);
            $query->bindParam(':period', $post['period'], PDO::PARAM_STR);
            $query->bindParam(':compliance_license_notes', $post['compliance_license_notes'], PDO::PARAM_STR);
            $query->bindParam(':turnover_fsid', $turnover_fsid, PDO::PARAM_STR);
            $query->bindParam(':published', $post['published'], PDO::PARAM_STR);
            $query->bindParam(':property_id', $post['property_id'], PDO::PARAM_STR);
            $query->bindParam(':client_id', $post['client_id'], PDO::PARAM_STR);

            $query->bindParam(':id', $post['id'], PDO::PARAM_STR);
            $query->execute();

            $this->transactions($fsTrans);

            if (count($post['teams']) == 0) {
                if (isset($post['id'])) {
                    $this->deleteTeamsByFsId($post['id']);
                }
            }

            if ($post['teams']) {

                if (isset($post['id'])) {
                    $this->deleteTeamsByFsId($post['id']);
                }

                foreach ($post['teams'] as $row) {
                    $this->addTechToAssignment(
                        array(
                            "user" => $row['user'],
                            "fs_det_id" => $row['fs_det_id'],
                            "user_rate" => $row['user_rate'],
                            "lead_tech" => $row['lead_tech'],
                        )
                    );
                }
            }


            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }



    /**
     * Get tickets assigned to techs
     *
     * @param [string] $readWorkOrderJobsByTech
     * @param string $open
     * @return void
     */
    public function getTicketAssignmentsByTechs($readWorkOrderJobsByTech, $open = 'All')
    {

        try {
            $qry = "
                SELECT a.id 
                    , b.id fs_scheduler_id 
                    , a.RequestDate 
                    , DATEDIFF(a.RequestDate, now()) dateDiff
                    , a.DOW 
                    , a.Status 
                    , a.SalesOrderNumber 
                    , a.Invoice
                    , a.ServiceType 
                    , a.SignTheme 
                    , a.SignType 
                    , a.Comments
                    , a.StartTime 
                    , a.Notes 
                    , a.createdDate 
                    , a.createdBy 
                    , a.VendorInvNumber 
                    , a.VendorCost 
                    , a.InvoiceDate 
                    , a.InvoiceNumber 
                    , a.AccStatus 
                    , a.platform
                    , b.hits
                    , b.dateSubmitted
                    , b.id workOrderTicketId
                    , concat(a.id, '-', b.id) fullWorkOrderId
                    , CoNumber
                    , DATE_FORMAT(a.RequestDate, '%W, %M %e, %Y') niceStartDateFormat
                    , TIME_FORMAT(a.StartTime, '%h:%i %p') niceStartTimeFormat
                    , concat(a.RequestDate, ' ', a.StartTime) as full_request_date
                    , a.compliance_license_notes
                    , outOfState
                    , published

                    , team installers
                    
                    , IFNULL(address.property, 'No property set') Property 
                    , address.id property_id 
                    , address.city Location 
                    , address.state ST 
                    , address.property_phone propertyPhoneNumber
                    , address.zip_code zipCode
                    , address.address1 address
                    , address.full_address
                    
                    , client.full_name RequestedBy
                    , client.id client_id 
                    , client.company_name Customer 
                    , client.client_image
                    , concat(address.city, ', ', IFNULL(address.property, 'No property set')) title
                    , a.group_id
                    , 'schedule' typeOf
                FROM eyefidb.fs_scheduler a
                LEFT JOIN (
                    SELECT fs_scheduler_id
                        , count(fs_scheduler_id) hits
                        , max(dateSubmitted) dateSubmitted
                        , max(id) id
                    FROM eyefidb.fs_workOrder
                    GROUP BY fs_scheduler_id
                ) b ON b.fs_scheduler_id = a.id

                LEFT JOIN (
                    select fs_det_id, group_concat(user SEPARATOR ', ') team
                    from eyefidb.fs_team
                    group by fs_det_id
                ) e ON e.fs_det_id = a.id

                
                left join (
                    SELECT a.*, b.name company_name, b.image client_image
                    FROM fs_client_det a
                    left join fs_company_det b ON b.id = a.company_id
                ) client ON client.id = a.client_id

                
                left join (
                    select b.*
                        , CONCAT_WS(', ', 
                        NULLIF(trim(b.address1), ' '),
                        NULLIF(trim(b.city), ' '), 
                        NULLIF(trim(b.state), ' '), 
                        NULLIF(trim(b.zip_code), ' ')) full_address 
                    from fs_property_det b
                ) address ON address.id = a.property_id
                
                WHERE a.id != -1
                AND nonWorkOrder = 0
                AND a.active = 1
                
                
            ";


            if ($open == 'Open') {
                $qry .= " AND b.dateSubmitted IS NULL AND a.Status IN ('Confirmed', 'Pending')";
            } else if ($open == 'Completed') {
                $qry .= " AND b.dateSubmitted IS NOT NULL";
            }


            if ($readWorkOrderJobsByTech != 'All') {
                $qry .= " HAVING team LIKE CONCAT('%', :team, '%')";
            }

            $qry .= " ORDER BY DATEDIFF(a.RequestDate, now()) ASC, a.RequestDate DESC";

            


            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':team', $readWorkOrderJobsByTech, PDO::PARAM_STR);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    /**
     * Prevent ticket duplication
     *
     * @param [number] $fs_scheduler_id
     * @return void
     */
    public function checkIfTicketAlreadyCreated($fs_scheduler_id)
    {
        try {
            $qry = "
                SELECT fs_scheduler_id
                    , id
                FROM eyefidb.fs_workOrder a
                WHERE fs_scheduler_id = :fs_scheduler_id
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':fs_scheduler_id', $fs_scheduler_id, PDO::PARAM_STR);
            $stmt->execute();
            $results = $stmt->fetch();

            return $results['id'];
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getTicketInfoById($ticketId)
    {

        $qry = "
            SELECT *
            FROM eyefidb.fs_workOrder a
            WHERE a.id = :id
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function getTicketInfoById_v1($ticketId)
    {

        $qry = "
            SELECT a.id 
                , a.customerName1
                , a.signature
                , a.phone
                , a.survey
                , a.email
                , a.workCompleted
                , a.workCompletedComment
                , a.sendResults
                , a.techSignature
                , a.dateSigned
                , a.createdDate
                , c.StartTime
                , a.userId
                , a.active
                , a.submitted
                , DATE_FORMAT(a.dateSubmitted, '%a, %b %e, %Y @ %l:%i%p' ) dateSubmitted
                , a.comments
                , a.accept
                , a.workCompletedDate
                , a.flightDelayed
                , a.hrsDelayed
                , a.customerSignatureImage
                , a.technicianSignatureImage
                , CASE 
                    WHEN b.surveyCount 
                        THEN 'Yes'
                    ELSE 'No'
                END surveyCount
                , false errorCheck
                , c.id fs_scheduler_id
                , c.property
                , installers
                , c.serviceType
                , c.Customer
                , c.platform
                , c.billable
                , c.SignTheme
                , concat(c.id, '-', a.id) fullWorkOrderId
                , DATE_FORMAT(concat(c.RequestDate, ' ' , c.StartTime), '%a, %b %e, %Y @ %l:%i%p' ) RequestDateFormat
                , DATE_FORMAT(c.RequestDate, '%a, %b %e, %Y')  RequestDate
                , c.outOfState
                , c.CoNumber
                , c.SalesOrderNumber
                , a.repairComment
                , d.qir
                , a.partReceivedByName
                , a.partReceivedBySignature
                , a.partLocation
                , DATE_FORMAT(c.InvoiceDate, '%c/%e/%Y' ) InvoiceDate
                , c.InvoiceNumber
                , c.Notes
                , c.compliance_license_notes
                , c.SignType
                , c.group_id
            FROM eyefidb.fs_workOrder a
            
            LEFT JOIN (
                SELECT count(fs_workOrder_id) surveyCount
                    , fs_workOrder_id
                FROM eyefidb.customerSatisfactionsSurvey
                GROUP BY fs_workOrder_id
            ) b ON a.id = b.fs_workOrder_id
            
            LEFT JOIN (
                SELECT SalesOrderNumber
                    , id
                    , property
                    , team installers
                    , serviceType
                    , Customer
                    , platform
                    , billable
                    , SignTheme
                    , RequestDate
                    , outOfState
                    , CoNumber
                    , StartTime
                    , InvoiceDate
                    , InvoiceNumber
                    , Notes
                    , compliance_license_notes
                    , SignType
                    , group_id
                FROM eyefidb.fs_scheduler

                
                LEFT JOIN (
                    select fs_det_id, group_concat(user SEPARATOR ', ') team
                    from eyefidb.fs_team
                    group by fs_det_id
                ) e ON e.fs_det_id = eyefidb.fs_scheduler.id

            ) c ON c.id = a.fs_scheduler_id
            
            LEFT JOIN (
                SELECT fieldServiceSchedulerId
                , max(id) id
                , max(qir) qir
                FROM eyefidb.qa_capaRequest
                GROUP BY fieldServiceSchedulerId
                ORDER BY id DESC
            ) d ON c.id = d.fieldServiceSchedulerId
            
            WHERE a.id = :id
            AND a.active = 1
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function getQirs($ticketId)
    {

        $qry = '
            SELECT a.fieldServiceSchedulerId
            , a.id
            , a.qir
            FROM eyefidb.qa_capaRequest a

            LEFT JOIN (
                SELECT id
                FROM eyefidb.fs_scheduler
            ) c ON c.id = a.fieldServiceSchedulerId

            LEFT JOIN (
                SELECT id, fs_scheduler_id
                FROM eyefidb.fs_workOrder
            ) d ON d.fs_scheduler_id = c.id

            where d.id = :id
            AND a.active = 1
            ORDER BY a.id DESC
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTicketJobDetailsByUnqiueId($ticketId)
    {
        $qry = "
            SELECT a.id 
                , a.parent_id
                , workOrderId 
                , projectDate 
                , proj_type 
                , a.description 
                , projectStart projectStart
                , projectFinish projectFinish
                , case when parent_id IS NOT NULL THEN TIMESTAMPDIFF(MINUTE,projectStart,projectFinish) END break_total
                , projectBill
                , totalHours
                , a.createdDate 
                , a.userId 
                , a.active 
                , a.seq
                , false errorCheck
                , b.calculateTime
                , b.work_order_labor_type
                , b.icon
                , a.flight_hrs_delay
                , '' projectStartTz
                , '' projectFinishTz
            FROM eyefidb.fs_workOrderProject_copy a
            LEFT JOIN eyefidb.fs_scheduler_settings b ON b.value = a.proj_type AND type IN ('Work Order Project Type')
            WHERE a.id = :id OR parent_id = :parent_id
                AND a.active = 1
            ORDER BY a.projectStart ASC
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->bindParam(":parent_id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetch(PDO::FETCH_ASSOC);

        return array(
            "results" => $results,
            "settings" => $this->getFormValues('WorkOrderProjectType')
        );
    }
    public function getTicketJobDetailsById($ticketId)
    {
        $qry = "
            SELECT a.id 
                , a.parent_id
                , workOrderId 
                , projectDate 
                , proj_type 
                , a.description 
                , DATE_FORMAT(projectStart, '%a, %b %e, %Y') projectStartDate
                , projectStart
                , projectFinish

                , case when parent_id IS NOT NULL THEN TIMESTAMPDIFF(MINUTE,projectStart,projectFinish) END break_total
                , projectBill
                , case when parent_id IS NULL THEN TIMESTAMPDIFF(MINUTE,projectStart,projectFinish) END totalHours
                , a.createdDate 
                , a.userId 
                , a.active 
                , a.seq
                , false errorCheck
                , b.calculateTime
                , b.work_order_labor_type
                , b.icon
                , a.flight_hrs_delay
                , f.property
            FROM eyefidb.fs_workOrderProject_copy a
            LEFT JOIN eyefidb.fs_scheduler_settings b ON b.value = a.proj_type AND type IN ('Work Order Project Type')
            left join fs_workOrder wo ON wo.id = a.workOrderId
            LEFT join (
                select a.id, a.property_id, b.property
                from fs_scheduler a
                left join fs_property_det b ON b.id = a.property_id
            ) f ON f.id = wo.fs_scheduler_id
            WHERE workOrderId = :workOrderId
                AND a.active = 1
            ORDER BY case when a.projectStart IS NOT NULL THEN a.projectStart ELSE a.id  END ASC
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":workOrderId", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTicketMiscById($ticketId)
    {
        $qry = '
            SELECT id 
                , workOrderId 
                , type 
                , customerAsset 
                , eyefiAsset
                , false errorCheck
            FROM eyefidb.fs_workOrderMisc a
            WHERE workOrderId = :id
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTicketTripExpense($ticketId)
    {
        $qry = "
            SELECT *, concat('https://dashboard.eye-fi.com/attachments/fieldService/',fileName) src
            FROM eyefidb.fs_workOrderTrip_copy
            WHERE workOrderId = :id
            ORDER BY id desc
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getGroupedTicketTripExpense($ticketId)
    {
        $qry = "
            SELECT *, , concat('https://dashboard.eye-fi.com/attachments/fieldService/',fileName) src
            FROM eyefidb.fs_workOrderTrip_copy
            WHERE workOrderId = :id
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getFileName($id)
    {
        $qry = "
            SELECT fileName
            FROM eyefidb.fs_workOrderTrip_copy
            WHERE id = :id
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    function upload(){
        
        $filename = basename($_FILES['file']['name']);
        $file1 = $_FILES['file']['tmp_name'];

        $time = time();        
        
        $target = '/var/www/html/attachments/fieldService/' . $time . "_" . $filename;

        $fileName_ = $time . "_" . $filename;

        $move = move_uploaded_file($file1, $target);


        if($move){
            return $fileName_;
        }else{
            return false;
        }

    }



    public function updateExpense($post)
    {

        $fileName = null;
        if($_FILES){
            $res = $this->getFileName($post['id']);
            if($res){
                $fileNameExist = '/var/www/html/attachments/fieldService/' .$res['fileName'];
                if(file_exists($fileNameExist)){
                    unlink($fileNameExist);
                    echo 'file found';
                }else{
                    echo 'file NOT found';

                }
            }

            $fileName = $this->upload();
        }

        try {
            $mainQry = "
                UPDATE eyefidb.fs_workOrderTrip_copy
                set name = :name,
                    cost = :cost,
                    vendor_name = :vendor_name, 
                    fileName = :fileName
                where id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':name', $post['name'], PDO::PARAM_STR);
            $query->bindParam(':cost', $post['cost'], PDO::PARAM_STR);
            $query->bindParam(':vendor_name', $post['vendor_name'], PDO::PARAM_STR);
            $query->bindParam(':fileName', $fileName, PDO::PARAM_STR);
            $query->bindParam(':id', $post['id'], PDO::PARAM_STR);
            $query->execute();

        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function removeExpense($post)
    {

        
        if($_FILES){
            $res = $this->getFileName($post['id']);
            if($res){
                $fileNameExist = '/var/www/html/attachments/fieldService/' .$res['fileName'];
                if(file_exists($fileNameExist)){
                    unlink($fileNameExist);
                    echo 'file found';
                }else{
                    echo 'file NOT found';

                }
            }
        }

        try {
            $mainQry = "
                delete from eyefidb.fs_workOrderTrip_copy
                where id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':id', $post['id'], PDO::PARAM_STR);
            $query->execute();

        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }
    public function createExpense($post)
    {


        $fileName = null;
        if($_FILES){
            $fileName = $this->upload();
        }

        try {
            $mainQry = "
                INSERT INTO eyefidb.fs_workOrderTrip_copy (name, cost, workOrderId, vendor_name, fileName) 
                VALUES(:name, :cost, :workOrderId, :vendor_name, :fileName)
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':name', $post['name'], PDO::PARAM_STR);
            $query->bindParam(':cost', $post['cost'], PDO::PARAM_STR);
            $query->bindParam(':workOrderId', $post['workOrderId'], PDO::PARAM_STR);
            $query->bindParam(':vendor_name', $post['vendor_name'], PDO::PARAM_STR);
            $query->bindParam(':fileName', $fileName, PDO::PARAM_STR);
            $query->execute();

        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function generateTicketInfoById($ticketId)
    {
        $ticketInfo = array();
        $jobInfo = array();

        $ticketInfo = $this->getTicketInfoById($ticketId);
        $groupedJobs = array();
        $get_work_order_group_details = array();

        if ($ticketInfo) {
            $fsId = $ticketInfo['fs_scheduler_id'];

            $jobInfo = $this->getData(null, null, $fsId);
            
            $group_id = $jobInfo['group_id'];

            $ticketInfo['laborDetails'] = $this->getTicketJobDetailsById($ticketId);
            $ticketInfo['tripExpense'] = $this->getTicketTripExpense($ticketId);
            $ticketInfo['misc'] = $this->getTicketMiscById($ticketId);
            $ticketInfo['attachments'] = $this->getAttachments($ticketId, $group_id);
            $groupedJobs = $this->get_group_jobs($group_id);
            $get_work_order_group_details = $this->get_work_order_group_details($group_id);
        }

        return array(
            'ticketInfo' => $ticketInfo,
            'settings' => $this->getFormValues(false),
            'authUsers' => $this->fieldServiceTicketAuthUsers(),
            'qirs' => $this->getQirs($ticketId),
            'groupedJobs' => $groupedJobs,
            'jobInfo' => $jobInfo,
            'groupedJobLabor' => $get_work_order_group_details,
        );
    }


    public function generateTicketInfoById_v1($ticketId)
    {
        $ticketInfo = array();
        $ticketInfo['workOrderProject'] = array();
        $ticketInfo['misc'] = array();
        $ticketInfo['tripExpenses'] = array();
        $groupedJobs = array();
        $get_work_order_group_details = array();
        
        $ticketInfo['workOrder'] = $this->getTicketInfoById($ticketId);

        if ($ticketInfo['workOrder']) {
            $group_id = $ticketInfo['workOrder']['group_id'];
            $ticketInfo['workOrderProject'] = $this->getTicketJobDetailsById($ticketId);
            $ticketInfo['misc'] = $this->getTicketMiscById($ticketId);
            $ticketInfo['tripExpenses'] = $this->getTicketTripExpense($ticketId);
            $groupedJobs = $this->get_group_jobs($group_id);
            $get_work_order_group_details = $this->get_work_order_group_details($group_id);
            
        }

        return array(
            'details' => $ticketInfo,
            'settings' => $this->getFormValues(false),
            'attachments' => $this->getAttachments($ticketId, null),
            'authUsers' => $this->fieldServiceTicketAuthUsers(),
            'qirs' => $this->getQirs($ticketId),
            'groupedJobs' => $groupedJobs,
            'get_work_order_group_details' => $get_work_order_group_details,
            'coInfo' => false


        );
    }

    public function getAttachments($ticketId, $group_id)
    {

        $images = array();
        $receipts = array();

        $mainQry = "
			select type
                , value name
                , receipt_value
            from eyefidb.fs_scheduler_settings a
			where a.type = 'Receipt Options'
		";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $receiptOptions = $query->fetchAll(PDO::FETCH_ASSOC);

        $mainQry = "
        select a.*, d.*
            , concat('https://dashboard.eye-fi.com/attachments/fieldService/',a.fileName) fileName
            , a.fileName tabName 
        from eyefidb.fs_workOrderTrip_copy a
        left join fs_workOrder b ON b.id = a.workOrderId
        left join fs_scheduler c ON c.id = b.fs_scheduler_id
        left join fs_property_det d ON d.id = c.property_id
        where a.workOrderId IN (2414, 2416, 2418)
        ORDER BY a.id desc
    ";
    $mainQry = "
    select a.*, d.*
        , concat('https://dashboard.eye-fi.com/attachments/fieldService/',a.fileName) fileName
        , a.fileName tabName 
    from eyefidb.fs_workOrderTrip_copy a
    left join fs_workOrder b ON b.id = a.workOrderId
    left join fs_scheduler c ON c.id = b.fs_scheduler_id
    left join fs_property_det d ON d.id = c.property_id
    where a.workOrderId = :id
    ORDER BY a.id desc
";
    $query = $this->db->prepare($mainQry);
    $query->bindParam(':id', $ticketId, PDO::PARAM_STR);
    $query->execute();
    $receipts = $query->fetchAll(PDO::FETCH_ASSOC);
    
        $data = $this->uploader->getAttachments($ticketId, 'Field Service', 'fieldService');


        foreach ($data as $row) {
            if ($row['mainId'] != 0) {
            } else {
                $images[] = $row;
            }
        }

        return array(
            "images" => $images,
            "receipts" => $receipts,
            "receiptOptions" => $receiptOptions
        );
    }


    public function getClients()
    {

        $mainQry = "
            SELECT a.*, b.id customer_id, b.image, c.hits, b.name company_name
            FROM fs_client_det a
            left join fs_company_det b ON b.id = a.company_id
            left join (
                select client_id, count(*) hits
                from fs_scheduler 
            group by client_id
            ) c ON c.client_id = a.id

        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getClientsById($id)
    {

        $mainQry = "
            SELECT a.*, b.id customer_id, b.image, c.hits 
            FROM fs_client a
            left join fs_customers b ON b.customer_name = a.company_name
            left join (
                select client_id, count(*) hits
                from fs_scheduler 
            group by client_id
            ) c ON c.client_id = a.id
            where a.id = :id

        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function editClientById($post)
    {

        $this->db->beginTransaction();

        try {
            $mainQry = "
                UPDATE eyefidb.fs_client 
                SET first_name = :first_name,
                    last_name = :last_name,
                    company_name = :company_name,
                    active = :active
                WHERE id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':first_name', $post['first_name'], PDO::PARAM_STR);
            $query->bindParam(':last_name', $post['last_name'], PDO::PARAM_STR);
            $query->bindParam(':company_name', $post['company_name'], PDO::PARAM_STR);
            $query->bindParam(':active', $post['active'], PDO::PARAM_STR);
            $query->bindParam(':id', $post['id'], PDO::PARAM_STR);
            $query->execute();

            $this->db->commit();

            return $post;
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function addClient($post)
    {

        $mainQry = "
            INSERT INTO eyefidb.fs_client (first_name, last_name, company_name) 
            VALUES(:first_name, :last_name, :company_name)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':first_name', $post['first_name'], PDO::PARAM_STR);
        $query->bindParam(':last_name', $post['last_name'], PDO::PARAM_STR);
        $query->bindParam(':company_name', $post['company_name'], PDO::PARAM_STR);
        $query->execute();
        $id = $this->db->lastInsertId();

        $post['id'] = $id;
        return $post;
    }

    public function get_group_jobs($groupId){
        return $this->getData(null, null, $groupId, true);
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
