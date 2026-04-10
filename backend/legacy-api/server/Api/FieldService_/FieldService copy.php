<?php

namespace EyefiDb\Api\FieldService;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;

use EyefiDb\Api\Upload\Upload;

class FieldService
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

    public function getClients()
    {

        $mainQry = "
            SELECT a.*, b.id customer_id, b.image
            FROM fs_client a
            left join fs_customers b ON b.customer_name = a.company_name
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getProperties($id)
    {

        $mainQry = "
            SELECT * FROM fs_property_det where fs_customer_id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPropertiesById($id)
    {

        $mainQry = "
            SELECT * FROM fs_property_det where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }
    public function getClientById($id)
    {

        $mainQry = "
            SELECT a.*, b.image
            FROM fs_client a
            left join fs_customers b ON b.customer_name = a.company_name
            where a.id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function getClientReport()
    {

        $mainQry = "
            SELECT *
            FROM fs_client
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPlatforms()
    {

        $mainQry = "
            SELECT a.*, b.avg_install_hrs
            FROM fs_platforms a 
            LEFT JOIN (
                SELECT sum(avg_install_hrs) avg_install_hrs, platform FROM platform_avg group by platform
            ) b ON b.platform = a.name
            ORDER BY b.avg_install_hrs ASC
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $result = array();

        foreach ($results as $element) {
            $elementType = ucwords($element['type']);
            $elementType = str_replace(' ', '', $elementType);
            $result[$elementType][] = $element;
        }

        return $result;
    }


        public function jobAssigments($tech = 'Joseph Eubanks', $status)
        {
        $mainQry = "
            select a.*
            , user tech
            , dateSubmitted
            , DATE_FORMAT(a.RequestDate, '%a, %b %e, %Y') niceStartDateFormat
            , TIME_FORMAT(a.StartTime, '%h:%i %p') niceStartTimeFormat
            , DATEDIFF(a.RequestDate, now()) dateDiff
            , concat(a.id, '-', c.id) fullWorkOrderId
            , c.id workOrderTicketId
            , c.id fs_scheduler_id
            , c.hits
            , c.dateSubmitted
            , c.id workOrderTicketId
            , d.grouped_jobs  
            , d.grouped_job_count
        from fs_scheduler a
        join (
            select user, fs_id
            from fs_tech_assignments
            WHERE user = 'Joseph Eubanks'
            group by fs_id
        ) b ON b.fs_id = a.id
        LEFT JOIN (
            SELECT fs_scheduler_id
            , count(fs_scheduler_id) hits
            , max(dateSubmitted) dateSubmitted
            , max(id) id
            FROM eyefidb.fs_workOrder
            GROUP BY fs_scheduler_id
        ) c ON c.fs_scheduler_id = a.id
        LEFT JOIN (
            SELECT job_number
            , group_concat(fs_id) grouped_jobs
            , count(fs_id) grouped_job_count
            FROM eyefidb.fs_grouped_jobs
            group by job_number
            , job_number
        ) d ON d.job_number = a.group_id
        WHERE active = 1
            AND a.Status IN ('Confirmed', 'Pending')
        ";

        // if ($readWorkOrderJobsByTech != 'All') {
        //     $qry .= " AND (a.LeadInstaller = :LeadInstaller
        //         OR a.Installer1 = :Installer1
        //         OR a.Installer2 = :Installer2
        //         OR a.Installer3 = :Installer3)";
        // }

        if ($status == 'Open') {
            $mainQry .= " AND c.dateSubmitted IS NULL";
        } else if ($status == 'Completed') {
            $mainQry .= " AND c.dateSubmitted IS NOT NULL";
        }

        $mainQry .= " ORDER BY DATEDIFF(a.RequestDate, now()) ASC, a.RequestDate DESC ";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
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
            SELECT concat(a.first, ' ', a.last) userName
                , a.id
                , false checked
                , b.rate1 
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

    public function byDate($dateFrom, $dateTo)
    {
        try {
            $mainQry = "
                select a.id 
                    , a.id fs_scheduler_id
                    , a.RequestedBy 
                    , a.Status 
                    , a.SalesOrderNumber 
                    , a.Invoice
                    , a.ServiceType 
                    , f.customer_name Customer 
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
                    
                    , techs installers
                    , e.property Property
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
                            THEN CONCAT(a.Status, ' ', a.LeadInstaller)
                        ELSE CONCAT(f.customer_name, ' ',  e.property, ' (', a.ServiceType, ')')
                    END title
                    , a.endDate

                    , d.backgroundColor
                    , case when d.color IS NULL THEN '#000' ELSE d.color END color
                    , DATE_FORMAT(a.RequestDate, '%W, %M %e, %Y') niceStartDateFormat
                    , TIME_FORMAT(a.StartTime, '%h:%i %p') niceStartTimeFormat

                    , DATE_FORMAT(concat(a.RequestDate, ' ', a.StartTime) + INTERVAL case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END MINUTE, '%W, %M %e, %Y') niceEndDateFormat
                    , TIME_FORMAT(concat(a.RequestDate, ' ', a.StartTime) + INTERVAL case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END MINUTE, '%h:%i %p') niceEndTimeFormat
                    , a.compliance_license_notes
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

                left join (
                    select * 
                    from fs_property_det
                ) e ON e.id = a.property_id

                left join (
                    select * from fs_customers
                ) f ON f.id = e.fs_customer_id

                left join (
                    select fs_id, GROUP_CONCAT( user) techs
                    from fs_tech_assignments
                    group by fs_id
                ) g ON g.fs_id = a.id


                WHERE a.active = 1
                AND a.RequestDate between :dateFrom and :dateTo
                and nonWorkOrder = 0
                order by a.RequestDate DESC
            ";

            $query = $this->db->prepare($mainQry);
            $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
            $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);

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

    public function byFsId($fsId)
    {
        try {
            $mainQry = "
                select a.id 
                    , a.id fs_scheduler_id
                    , a.RequestedBy 
                    , a.Status 
                    , a.SalesOrderNumber 
                    , a.Invoice
                    , a.ServiceType 
                    , a.Customer 
                    , a.Property 
                    , a.Location 
                    , a.ST 
                    , a.SignTheme 
                    , a.SignType 
                    , a.Comments
                    , CASE WHEN a.LeadInstaller = '' THEN null ELSE a.LeadInstaller END LeadInstaller
                    , CASE WHEN a.Installer1 = '' THEN null ELSE a.Installer1 END Installer1
                    , CASE WHEN a.Installer2 = '' THEN null ELSE a.Installer2 END Installer2
                    , CASE WHEN a.Installer3 = '' THEN null ELSE a.Installer3 END Installer3
                    , LeadInstallerRate
                    , Installer1Rate
                    , Installer2Rate
                    , Installer3Rate
                    , a.StartTime 
                    , a.Notes 
                    , a.createdDate 
                    , a.createdBy 
                    , a.VendorInvNumber 
                    , a.VendorCost 
                    , a.InvoiceDate 
                    , a.InvoiceNumber 
                    , a.AccStatus 
                    , case when a.platform = '' THEN null ELSE a.platform END platform
                    , a.billable 
                    , a.nonWorkOrder
                    , DAYNAME(a.RequestDate) DOW
                    , a.RequestDate
                    , CONCAT_WS(', ', a.LeadInstaller, a.Installer1, a.Installer2, a.Installer3) installers
                    
                    , concat(a.id, '-', b.id) fullWorkOrderId
                    , a.InvoiceNotes
                    , concat(a.RequestDate, ' ', a.StartTime) as startTime
					, concat(a.RequestDate, ' ', a.StartTime) + INTERVAL case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END MINUTE endTime
                    
                    , b.hits
                    , b.dateSubmitted
                    , b.id workOrderTicketId
                    , b.createdDate createdDateWorkOrder
                    , b.createdBy createdByWorkOrder

                    , case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END timeToComplete
                    , CoNumber
                    , customerCancelled
                    , cancellationComments
                    , cancelledType
                    , a.outOfState

                    , a.endDate
                    , DATE_FORMAT(a.RequestDate, '%W, %M %e, %Y') niceStartDateFormat
                    , TIME_FORMAT(a.StartTime, '%h:%i %p') niceStartTimeFormat
                    , concat(u.first, ' ', u.last) createdByName
                    , a.address
                    , a.markUpPercent
                    , a.ef_hourly_rate
                    , a.ef_overtime_hourly_rate

                    , a.paperWorkLocation
                    , a.billableFlatRateOrPO
                    , a.contractorInvSentToAP
                    , a.period
                    , a.propertyPhoneNumber
                    , a.zipCode
                    , a.compliance_license_notes
                    
                    , a.property_id
                    , a.client_id
                    , e.name ServiceType
                    , a.group_id

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
                    SELECT name 
                        , max(timeToComplete) timeToComplete
                    from eyefidb.fs_scheduler_platforms
                    where active = 1
                    GROUP BY name
                ) c ON a.platform = c.name

                
                LEFT JOIN (
                    SELECT job_number
                      , group_concat(fs_id) grouped_jobs
                      , count(fs_id) grouped_job_count
                    FROM eyefidb.fs_grouped_jobs
                      group by job_number
                      , job_number
                ) d ON d.job_number = a.group_id

                LEFT JOIN (
                    SELECT name, id
                    FROM eyefidb.fs_service_category
                ) e ON e.id = a.service_id


                LEFT JOIN db.users u ON u.id = a.createdBy

                WHERE a.active = 1
                    AND a.id = :id
            ";

            $query = $this->db->prepare($mainQry);
            $query->bindParam(':id', $fsId, PDO::PARAM_STR);
            $query->execute();
            $results = $query->fetch(PDO::FETCH_ASSOC);

            return $results;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function structureCalendarData($dateFrom, $dateTo)
    {
        $companyHolidays = $this->getEventsByDate($dateFrom, $dateTo);
        $workOrders = $this->byDate($dateFrom, $dateTo);

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
                "backgroundColor" => $row['backgroundColor'],
                "textColor" => $row['color'],
                "borderColor" => $row['backgroundColor'],
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
                    "startTime" => $row['startTime'],
                    "endTime" => $row['endTime'],
                    "borderColor" => $row['backgroundColor'],
                    "backgroundColor" => $row['backgroundColor'],
                    "installers" => $row['installers'],
                    "outOfState" => $row['outOfState'],
                    "textColor" => $row['color']
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

    public function groupJobs($in)
    {
        if ($in == '') {
            return false;
        }
        $qry = "
            SELECT a.id
                , a.RequestDate
                , b.id ticket_id
                , DATE_FORMAT(concat(a.RequestDate, ' ', a.StartTime), '%a, %b %e, %Y @ %l:%i%p' ) RequestDateFormat
            FROM fs_scheduler a 
            left join fs_workOrder b ON b.fs_scheduler_id = a.id
            where a.id IN ($in)
            order by a.RequestDate ASC
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getEventsByJob($id)
    {
        $mainQry = "
            SELECT fs_scheduler.id
                , group_id groupId
                , DATE_FORMAT(concat(RequestDate, ' ', StartTime), '%a, %b %e, %Y @ %l:%i%p' ) RequestDateFormat
                , RequestDate date
                , Property title
                , 'Schedule' typeOf
                , fs_workOrder.id ticket_number
            FROM `fs_scheduler` 
            left join fs_workOrder ON fs_workOrder.fs_scheduler_id = fs_scheduler.id
            where group_id = :id
            UNION ALL 
                select '' id
                , fs_scheduler_id groupId
                , DATE_FORMAT(start, '%a, %b %e, %Y') RequestDateFormat
                , start date
                , concat(title, ' ', type) title
                , 'Event' typeOf
                , '' ticket_number
            from companyHoliday
            where fs_scheduler_id = :id
            order by date ASC
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->bindParam(':id1', $id, PDO::PARAM_STR);
        $query->execute();
        return array();
    }

    public function getTechsAssignedToJob($id)
    {
        $mainQry = "
            SELECT * from fs_tech_assignments
            WHERE fs_id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function viewById($byFsId)
    {


        //$ticketInfo = array();
        $propertyInfo = array();
        $clientInfo = array();
        $groupEvents = array();
        $R = $this->byFsId($byFsId);

        if ($R) {
            //$ticketInfo = $this->groupJobs($R['job_number']);
            $propertyInfo = $this->getPropertiesById($R['property_id']);
            $clientInfo = $this->getClientById($R['client_id']);
            //$groupEvents = $this->getEventsByJob($R['group_id']);
        }

        return array(
            "results" => $R,
            "states" => $this->getStates(),
            "settings" => $this->getFormValues(true),
            "platforms" => $this->ReadPlatforms(),
            "users" => $this->getUsers(),
            "authorizedUsers" => $this->authorizedUsers(),
            "plate" => $this->getPlatforms(),
            "propertyInfo" => $propertyInfo,
            "clientInfo" => $clientInfo,
            "techs" => $this->getTechsAssignedToJob($byFsId),
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

        try {

            $RequestDate = $this->setEmptyValue($post['RequestDate']);
            $InvoiceDate = $this->setEmptyValue($post['InvoiceDate']);
            $nonWorkOrder = $this->setEmptyValue($post['nonWorkOrder'], 0);

            $LeadInstallerRate = 0;
            $Installer1Rate = 0;
            $Installer2Rate = 0;
            $Installer3Rate = 0;
            if (isset($post['LeadInstallerRate'])) {
                $LeadInstallerRate = $post['LeadInstallerRate'];
            }
            if (isset($post['Installer1Rate'])) {
                $Installer1Rate = $post['Installer1Rate'];
            }
            if (isset($post['Installer2Rate'])) {
                $Installer2Rate = $post['Installer2Rate'];
            }
            if (isset($post['Installer3Rate'])) {
                $Installer3Rate = $post['Installer3Rate'];
            }


            if (isset($post['client_id'])) {
                $client_id = $post['client_id'];
            }
            if (isset($post['property_id'])) {
                $property_id = $post['property_id'];
            }

            $non_billable_code = null;
            if (isset($post['non_billable_code'])) {
                $non_billable_code = $post['non_billable_code'];
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
                    , Property
                    , Location
                    , ST
                    , SignTheme
                    , SignType
                    , Comments
                    , LeadInstaller
                    , Installer1
                    , Installer2
                    , Installer3
                    , LeadInstallerRate
                    , Installer1Rate
                    , Installer2Rate
                    , Installer3Rate
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
                    , address
                    , ef_hourly_rate
                    , ef_overtime_hourly_rate
                    , markUpPercent
                    , paperWorkLocation
                    , billableFlatRateOrPO
                    , contractorInvSentToAP
                    , period
                    , propertyPhoneNumber
                    , zipCode
                    , compliance_license_notes
                    , client_id
                    , property_id
                    , non_billable_code
                )VALUES(
                    :RequestDate
                    , :DOW
                    , :RequestedBy
                    , :Status
                    , :SalesOrderNumber
                    , :Invoice
                    , :ServiceType
                    , :Customer
                    , :Property
                    , :Location
                    , :ST
                    , :SignTheme
                    , :SignType
                    , :Comments
                    , :LeadInstaller
                    , :Installer1
                    , :Installer2
                    , :Installer3
                    , :LeadInstallerRate
                    , :Installer1Rate
                    , :Installer2Rate
                    , :Installer3Rate
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
                    , :address
                    , :ef_hourly_rate
                    , :ef_overtime_hourly_rate
                    , :markUpPercent
                    , :paperWorkLocation
                    , :billableFlatRateOrPO
                    , :contractorInvSentToAP
                    , :period
                    , :propertyPhoneNumber
                    , :zipCode
                    , :compliance_license_notes
                    , :client_id
                    , :property_id
                    , :non_billable_code
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
            $query->bindParam(':Property', $post['Property'], PDO::PARAM_STR);
            $query->bindParam(':Location', $post['Location'], PDO::PARAM_STR);
            $query->bindParam(':ST', $post['ST'], PDO::PARAM_STR);
            $query->bindParam(':SignTheme', $post['SignTheme'], PDO::PARAM_STR);
            $query->bindParam(':SignType', $post['SignType'], PDO::PARAM_STR);
            $query->bindParam(':Comments', $post['Comments'], PDO::PARAM_STR);
            $query->bindParam(':LeadInstaller', $post['LeadInstaller'], PDO::PARAM_STR);
            $query->bindParam(':Installer1', $post['Installer1'], PDO::PARAM_STR);
            $query->bindParam(':Installer2', $post['Installer2'], PDO::PARAM_STR);
            $query->bindParam(':Installer3', $post['Installer3'], PDO::PARAM_STR);
            $query->bindParam(':LeadInstallerRate', $LeadInstallerRate, PDO::PARAM_STR);
            $query->bindParam(':Installer1Rate', $Installer1Rate, PDO::PARAM_STR);
            $query->bindParam(':Installer2Rate', $Installer2Rate, PDO::PARAM_STR);
            $query->bindParam(':Installer3Rate', $Installer3Rate, PDO::PARAM_STR);
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
            $query->bindParam(':address', $post['address'], PDO::PARAM_STR);
            $query->bindParam(':ef_hourly_rate', $post['ef_hourly_rate'], PDO::PARAM_STR);
            $query->bindParam(':ef_overtime_hourly_rate', $post['ef_overtime_hourly_rate'], PDO::PARAM_STR);
            $query->bindParam(':markUpPercent', $post['markUpPercent'], PDO::PARAM_STR);
            $query->bindParam(':paperWorkLocation', $post['paperWorkLocation'], PDO::PARAM_STR);
            $query->bindParam(':billableFlatRateOrPO', $post['billableFlatRateOrPO'], PDO::PARAM_STR);
            $query->bindParam(':contractorInvSentToAP', $post['contractorInvSentToAP'], PDO::PARAM_STR);
            $query->bindParam(':period', $post['period'], PDO::PARAM_STR);
            $query->bindParam(':propertyPhoneNumber', $post['propertyPhoneNumber'], PDO::PARAM_STR);
            $query->bindParam(':zipCode', $post['zipCode'], PDO::PARAM_STR);
            $query->bindParam(':compliance_license_notes', $post['compliance_license_notes'], PDO::PARAM_STR);
            $query->bindParam(':client_id', $client_id, PDO::PARAM_STR);
            $query->bindParam(':property_id', $property_id, PDO::PARAM_STR);
            $query->bindParam(':non_billable_code', $non_billable_code, PDO::PARAM_STR);

            $query->execute();
            return $this->db->lastInsertId();
        } catch (PDOException $e) {
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

    /**
     * Update work order request date and start time
     *
     * @param [type] $post
     * @return void
     */
    public function addTechToAssignment($post)
    {

        $this->db->beginTransaction();

        try {
            $mainQry = "
                INSERT INTO eyefidb.fs_tech_assignments (user_id, fs_id, created_date, created_by, tech_rate, lead_tech) 
                VALUES(:user_id, :fs_id, :created_date, :created_by, :tech_rate, :lead_tech)
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':user_id', $post['user_id'], PDO::PARAM_STR);
            $query->bindParam(':fs_id', $post['fs_id'], PDO::PARAM_STR);
            $query->bindParam(':created_date', $post['created_date'], PDO::PARAM_STR);
            $query->bindParam(':created_by', $post['created_by'], PDO::PARAM_STR);
            $query->bindParam(':tech_rate', $post['tech_rate'], PDO::PARAM_STR);
            $query->bindParam(':lead_tech', $post['lead_tech'], PDO::PARAM_STR);
            $query->execute();

            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();
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
            if (isset($row['Property']) && $row['Property'] != $post['Property']) {
                $fsTrans[] = array(
                    'field' => 'Property changed', 'o' => $row['Property'], 'n' => $post['Property'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['Location']) && $row['Location'] != $post['Location']) {
                $fsTrans[] = array(
                    'field' => 'Location changed', 'o' => $row['Location'], 'n' => $post['Location'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['ST']) && $row['ST'] != $post['ST']) {
                $fsTrans[] = array(
                    'field' => 'ST changed', 'o' => $row['ST'], 'n' => $post['ST'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
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
            if (isset($row['LeadInstaller']) && $row['LeadInstaller'] != $post['LeadInstaller']) {
                $fsTrans[] = array(
                    'field' => 'Installer changed', 'o' => $row['LeadInstaller'], 'n' => $post['LeadInstaller'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['Installer1']) && $row['Installer1'] != $post['Installer1']) {
                $fsTrans[] = array(
                    'field' => 'Installer1 changed', 'o' => $row['Installer1'], 'n' => $post['Installer1'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['Installer2']) && $row['Installer2'] != $post['Installer2']) {
                $fsTrans[] = array(
                    'field' => 'Installer2 changed', 'o' => $row['Installer2'], 'n' => $post['Installer2'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['Installer3']) && $row['Installer3'] != $post['Installer3']) {
                $fsTrans[] = array(
                    'field' => 'Installer3 changed', 'o' => $row['Installer3'], 'n' => $post['Installer3'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
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
            if (isset($row['address']) && $row['address'] != $post['address']) {
                $fsTrans[] = array(
                    'field' => 'Address changed', 'o' => $row['address'], 'n' => $post['address'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
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
            if (isset($row['propertyPhoneNumber']) && $row['propertyPhoneNumber'] != $post['propertyPhoneNumber']) {
                $fsTrans[] = array(
                    'field' => 'Property Phone Number changed', 'o' => $row['propertyPhoneNumber'], 'n' => $post['propertyPhoneNumber'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['zipCode']) && $row['zipCode'] != $post['zipCode']) {
                $fsTrans[] = array(
                    'field' => 'Zip Code changed', 'o' => $row['zipCode'], 'n' => $post['zipCode'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['compliance_license_notes']) && $row['compliance_license_notes'] != $post['compliance_license_notes']) {
                $fsTrans[] = array(
                    'field' => 'Compliance License Notes changed', 'o' => $row['compliance_license_notes'], 'n' => $post['compliance_license_notes'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }

            $LeadInstallerRate = 0;
            $Installer1Rate = 0;
            $Installer2Rate = 0;
            $Installer3Rate = 0;
            if (isset($post['LeadInstallerRate'])) {
                $LeadInstallerRate = $post['LeadInstallerRate'];
            }
            if (isset($post['Installer1Rate'])) {
                $Installer1Rate = $post['Installer1Rate'];
            }
            if (isset($post['Installer2Rate'])) {
                $Installer2Rate = $post['Installer2Rate'];
            }
            if (isset($post['Installer3Rate'])) {
                $Installer3Rate = $post['Installer3Rate'];
            }

            if (isset($post['client_id'])) {
                $client_id = $post['client_id'];
            }
            if (isset($post['property_id'])) {
                $property_id = $post['property_id'];
            }

            $non_billable_code = null;
            if (isset($post['non_billable_code'])) {
                $non_billable_code = $post['non_billable_code'];
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
                    , Property = :Property
                    , Location = :Location
                    , ST = :ST
                    , SignTheme = :SignTheme
                    , SignType = :SignType
                    , Comments = :Comments
                    , LeadInstaller = :LeadInstaller
                    , Installer1 = :Installer1
                    , Installer2 = :Installer2
                    , Installer3 = :Installer3
                    , LeadInstallerRate = :LeadInstallerRate
                    , Installer1Rate = :Installer1Rate
                    , Installer2Rate = :Installer2Rate
                    , Installer3Rate = :Installer3Rate
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
                    , address = :address
                    , ef_hourly_rate = :ef_hourly_rate
                    , ef_overtime_hourly_rate = :ef_overtime_hourly_rate
                    , markUpPercent = :markUpPercent
                    , paperWorkLocation = :paperWorkLocation
                    , billableFlatRateOrPO = :billableFlatRateOrPO
                    , contractorInvSentToAP = :contractorInvSentToAP
                    , period = :period
                    , propertyPhoneNumber = :propertyPhoneNumber
                    , zipCode = :zipCode
                    , compliance_license_notes = :compliance_license_notes
                    , client_id = :client_id
                    , property_id = :property_id
                    , non_billable_code = :non_billable_code
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
            $query->bindParam(':Property', $post['Property'], PDO::PARAM_STR);
            $query->bindParam(':Location', $post['Location'], PDO::PARAM_STR);
            $query->bindParam(':ST', $post['ST'], PDO::PARAM_STR);
            $query->bindParam(':SignTheme', $post['SignTheme'], PDO::PARAM_STR);
            $query->bindParam(':SignType', $post['SignType'], PDO::PARAM_STR);
            $query->bindParam(':Comments', $post['Comments'], PDO::PARAM_STR);
            $query->bindParam(':LeadInstaller', $post['LeadInstaller'], PDO::PARAM_STR);
            $query->bindParam(':Installer1', $post['Installer1'], PDO::PARAM_STR);
            $query->bindParam(':Installer2', $post['Installer2'], PDO::PARAM_STR);
            $query->bindParam(':Installer3', $post['Installer3'], PDO::PARAM_STR);

            $query->bindParam(':LeadInstallerRate', $LeadInstallerRate, PDO::PARAM_STR);
            $query->bindParam(':Installer1Rate', $Installer1Rate, PDO::PARAM_STR);
            $query->bindParam(':Installer2Rate', $Installer2Rate, PDO::PARAM_STR);
            $query->bindParam(':Installer3Rate', $Installer3Rate, PDO::PARAM_STR);

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
            $query->bindParam(':address', $post['address'], PDO::PARAM_STR);
            $query->bindParam(':ef_hourly_rate', $post['ef_hourly_rate'], PDO::PARAM_INT);
            $query->bindParam(':ef_overtime_hourly_rate', $post['ef_overtime_hourly_rate'], PDO::PARAM_STR);

            $query->bindParam(':markUpPercent', $post['markUpPercent'], PDO::PARAM_STR);
            $query->bindParam(':paperWorkLocation', $post['paperWorkLocation'], PDO::PARAM_STR);
            $query->bindParam(':billableFlatRateOrPO', $post['billableFlatRateOrPO'], PDO::PARAM_STR);
            $query->bindParam(':contractorInvSentToAP', $post['contractorInvSentToAP'], PDO::PARAM_STR);
            $query->bindParam(':period', $post['period'], PDO::PARAM_STR);
            $query->bindParam(':propertyPhoneNumber', $post['propertyPhoneNumber'], PDO::PARAM_STR);
            $query->bindParam(':zipCode', $post['zipCode'], PDO::PARAM_STR);
            $query->bindParam(':compliance_license_notes', $post['compliance_license_notes'], PDO::PARAM_STR);
            $query->bindParam(':client_id', $client_id, PDO::PARAM_STR);
            $query->bindParam(':property_id', $property_id, PDO::PARAM_STR);
            $query->bindParam(':non_billable_code', $non_billable_code, PDO::PARAM_STR);

            $query->bindParam(':id', $post['id'], PDO::PARAM_STR);
            $query->execute();

            $this->transactions($fsTrans);
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
                    , a.RequestedBy 
                    , a.Status 
                    , a.SalesOrderNumber 
                    , a.Invoice
                    , a.ServiceType 
                    , a.Customer 
                    , a.Property 
                    , a.Location 
                    , a.ST 
                    , a.SignTheme 
                    , a.SignType 
                    , a.Comments
                    , a.LeadInstaller 
                    , a.Installer1 
                    , a.Installer2 
                    , a.Installer3
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
                    , CONCAT_WS(', ', a.LeadInstaller, a.Installer1, a.Installer2, a.Installer3) installers
                    , b.hits
                    , b.dateSubmitted
                    , b.id workOrderTicketId
                    , concat(a.id, '-', b.id) fullWorkOrderId
                    , CoNumber
                    , DATE_FORMAT(a.RequestDate, '%W, %M %e, %Y') niceStartDateFormat
                    , TIME_FORMAT(a.StartTime, '%h:%i %p') niceStartTimeFormat
                    , a.address
                    , a.compliance_license_notes
                FROM eyefidb.fs_scheduler a
                LEFT JOIN (
                    SELECT fs_scheduler_id
                        , count(fs_scheduler_id) hits
                        , max(dateSubmitted) dateSubmitted
                        , max(id) id
                    FROM eyefidb.fs_workOrder
                    GROUP BY fs_scheduler_id
                ) b ON b.fs_scheduler_id = a.id
                WHERE a.id != -1
                AND nonWorkOrder = 0
                AND active = 1
                AND a.Status IN ('Confirmed', 'Pending')
            ";


            if ($readWorkOrderJobsByTech != 'All') {
                $qry .= " AND (a.LeadInstaller = :LeadInstaller
					OR a.Installer1 = :Installer1
					OR a.Installer2 = :Installer2
					OR a.Installer3 = :Installer3)";
            }

            if ($open == 'Open') {
                $qry .= " AND b.dateSubmitted IS NULL";
            } else if ($open == 'Completed') {
                $qry .= " AND b.dateSubmitted IS NOT NULL";
            }

            $qry .= " ORDER BY DATEDIFF(a.RequestDate, now()) ASC, a.RequestDate DESC ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':LeadInstaller', $readWorkOrderJobsByTech, PDO::PARAM_STR);
            $stmt->bindParam(':Installer1', $readWorkOrderJobsByTech, PDO::PARAM_STR);
            $stmt->bindParam(':Installer2', $readWorkOrderJobsByTech, PDO::PARAM_STR);
            $stmt->bindParam(':Installer3', $readWorkOrderJobsByTech, PDO::PARAM_STR);
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

    /**
     * Create field service ticket
     *
     * @param [number] $fs_scheduler_id
     * @return void
     */
    public function createTicket($fs_scheduler_id)
    {

        $workOrderCheck = $this->checkIfTicketAlreadyCreated($fs_scheduler_id);
        if ($workOrderCheck) {
            return array('updatedId' => $workOrderCheck);
        }

        $this->db->beginTransaction();

        try {
            $qry = "
                INSERT INTO eyefidb.fs_workOrder(
                    userId
                    , createdDate
                    , fs_scheduler_id
                ) 
                values(
                    :userId
                    , :createdDate
                    , :fs_scheduler_id
                )
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
            $stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
            $stmt->bindParam(':fs_scheduler_id', $fs_scheduler_id, PDO::PARAM_STR);
            $stmt->execute();
            $updatedId = $this->db->lastInsertId();

            $qry = "
                INSERT INTO eyefidb.fs_workOrderProject(
                    workOrderId
                    , userId
                    , createdDate
                    , proj_type
                    , seq
                ) 
                values(
                    :workOrderId
                    , :userId
                    , :createdDate
                    , :proj_type
                    , :seq
                )
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':workOrderId', $updatedId, PDO::PARAM_STR);
            $stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
            $stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);

            $workInfo = ['Travel To Site', 'Unpack/Offload', 'Install', 'Clean-up/Post Installation', 'Travel From Site'];
            $oo = 0;

            /**
             * Automatically create job fields
             */
            for ($kk = 0; $kk < count($workInfo); $kk++) {
                $oo++;
                $stmt->bindParam(':proj_type', array_values($workInfo)[$kk], PDO::PARAM_STR);
                $stmt->bindParam(':seq', $oo, PDO::PARAM_INT);
                $stmt->execute();
            }

            /**
             * Automatically create mics fields
             */
            $qry = "
                INSERT INTO eyefidb.fs_workOrderMisc(
                    workOrderId
                ) values (
                    :workOrderId
                )
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':workOrderId', $updatedId, PDO::PARAM_STR);

            for ($kk = 0; $kk < 3; $kk++) {
                $stmt->execute();
            }

            $qry = "
                INSERT INTO eyefidb.fs_workOrderDetail(
                    workOrderId
                    , userId
                    , createdDate
                    , travelType
                ) 
                values(
                    :workOrderId
                    , :userId
                    , :createdDate
                    , :travelType
                    
                )
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':workOrderId', $updatedId, PDO::PARAM_STR);
            $stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
            $stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);

            /**
             * Automatically create travel fields
             */
            $travelType = ['Travel Out', 'Travel In'];
            for ($k = 0; $k < 2; $k++) {
                $stmt->bindParam(':travelType', array_values($travelType)[$k], PDO::PARAM_STR);
                $stmt->execute();
            }

            $this->db->commit();

            return $updatedId;
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getTicketInfoById($ticketId)
    {

        $qry = '
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
                , a.dateSubmitted
                , a.comments
                , a.accept
                , a.workCompletedDate
                , a.flightDelayed
                , a.hrsDelayed
                , a.customerSignatureImage
                , a.technicianSignatureImage
                , CASE 
                    WHEN b.surveyCount 
                        THEN "Yes" 
                    ELSE "No" 
                END surveyCount
                , false errorCheck
                , c.LeadInstaller 
                , c.Installer1
                , c.Installer2
                , c.Installer3
                , c.id fs_scheduler_id
                , c.property
                , CONCAT_WS(", ", c.LeadInstaller, c.Installer1, c.Installer2, c.Installer3) installers
                , c.serviceType
                , c.Customer
                , c.platform
                , c.billable
                , c.SignTheme
                , concat(c.id, "-", a.id) fullWorkOrderId
                , c.RequestDate
                , DATE_FORMAT(concat(c.RequestDate, " ", c.StartTime), "%W, %M %e, %Y @ %l:%i%p" ) RequestDateFormat
                , c.outOfState
                , c.CoNumber
                , c.SalesOrderNumber
                , a.repairComment
                , d.qir
                , a.partReceivedByName
                , a.partReceivedBySignature
                , a.partLocation
                , c.InvoiceDate
                , c.InvoiceNumber
                , c.Notes
                , c.compliance_license_notes
                , c.SignType
            FROM eyefidb.fs_workOrder a
            
            LEFT JOIN (
                SELECT count(fs_workOrder_id) surveyCount
                    , fs_workOrder_id
                FROM eyefidb.customerSatisfactionsSurvey
                GROUP BY fs_workOrder_id
            ) b ON a.id = b.fs_workOrder_id
            
            LEFT JOIN (
                SELECT SalesOrderNumber
                    , LeadInstaller 
                    , Installer1
                    , Installer2
                    , Installer3
                    , id
                    , property
                    , concat(", ", LeadInstaller, Installer1, Installer2, Installer3) installers
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
                FROM eyefidb.fs_scheduler
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
        ';
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

    public function getTravelTicketById($ticketId)
    {
        $qry = '
            SELECT id 
                , workOrderId 
                , travelType
                , typeOfTravel
                , totalTraveled
                , travelDate
                , travelBill
                , flightDelayed
                , flightHrsDelayed
                , DATE_FORMAT(flyStart, "%Y-%m-%d %H:%i") flyStart
                , DATE_FORMAT(flyEnd, "%Y-%m-%d %H:%i") flyEnd
                , DATE_FORMAT(flyBreakStart, "%Y-%m-%d %H:%i") flyBreakStart
                , DATE_FORMAT(flyBreakEnd, "%Y-%m-%d %H:%i") flyBreakEnd
                , DATE_FORMAT(drStart, "%Y-%m-%d %H:%i") drStart
                , DATE_FORMAT(drEnd, "%Y-%m-%d %H:%i") drEnd
                , DATE_FORMAT(drBreakStart, "%Y-%m-%d %H:%i") drBreakStart
                , DATE_FORMAT(drBreakEnd, "%Y-%m-%d %H:%i") drBreakEnd
                , totalHours
                , createdDate 
                , userId 
                , active
                , false errorCheck
                , false isOpen
                , CASE WHEN travelType = "Travel In" THEN "in" ELSE "out" END travelTypeAbbr
            FROM eyefidb.fs_workOrderDetail a
            WHERE workOrderId = :workOrderId
                AND a.active = 1
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":workOrderId", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTicketJobDetailsById($ticketId)
    {
        $qry = "
            SELECT a.id 
                , workOrderId 
                , projectDate 
                , proj_type 
                , description 
                , DATE_FORMAT(projectStart, '%Y-%m-%d %H:%i') projectStart
                , DATE_FORMAT(projectFinish, '%Y-%m-%d %H:%i') projectFinish
                , projectBill
                , totalHours
                , a.createdDate 
                , a.userId 
                , a.active 
                , a.seq
                , false errorCheck
                , b.calculateTime
            FROM eyefidb.fs_workOrderProject a
            LEFT JOIN eyefidb.fs_scheduler_settings b ON b.value = a.proj_type AND type IN ('Work Order Project Type')
            WHERE workOrderId = :workOrderId
                AND a.active = 1
            ORDER BY a.seq ASC
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
        $qry = '
            SELECT *
            FROM eyefidb.fs_workOrderTrip
            WHERE workOrderId = :id
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }



    public function generateTicketInfoById($ticketId)
    {
        $ticketInfo = array();
        $ticketInfo['travelInfo'] = array();
        $ticketInfo['workOrderProject'] = array();
        $ticketInfo['misc'] = array();
        $ticketInfo['tripExpenses'] = array();

        $ticketInfo['workOrder'] = $this->getTicketInfoById($ticketId);

        if ($ticketInfo['workOrder']) {
            $ticketInfo['travelInfo'] = $this->getTravelTicketById($ticketId);
            $ticketInfo['workOrderProject'] = $this->getTicketJobDetailsById($ticketId);
            $ticketInfo['misc'] = $this->getTicketMiscById($ticketId);
            $ticketInfo['tripExpenses'] = $this->getTicketTripExpense($ticketId);
        }

        return array(
            'details' => $ticketInfo,
            'settings' => $this->getFormValues(false),
            'attachments' => $this->getAttachments($ticketId),
            'authUsers' => $this->fieldServiceTicketAuthUsers(),
            'qirs' => $this->getQirs($ticketId),
            'coInfo' => false


        );
    }

    public function getAttachments($ticketId)
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

        $data = $this->uploader->getAttachments($ticketId, 'Field Service', 'fieldService');


        foreach ($data as $row) {
            if ($row['mainId'] != 0) {
                $receipts[] = $row;
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

    public function getImagesById($ticketId)
    {

        $images = array();
        $receipts = array();

        $mainQry = "
			select *
            from eyefidb.attachments a
			where a.field = 'Field Service'
                and uniqueId = :id
		";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
        
        
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
