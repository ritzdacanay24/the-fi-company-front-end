<?php

namespace EyefiDb\Api\FieldService;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;

use EyefiDb\Api\Upload\Upload;

function dynamicInsert($table_name, $assoc_array){
    $keys = array();
    $values = array();
    foreach($assoc_array as $key => $value){
        $keys[] = $key;
        $values[] = $value;
    }
    $query = "INSERT INTO `$table_name`(`".implode("`,`", $keys)."`) VALUES('".implode("','", $values)."')";
    return $query;
}

function dynamicUpdate($table, $data, $id){
    $cols = array();
    foreach($data as $key=>$val) {
        $cols[] = "$key = '$val'";
    }
    $sql = "UPDATE $table SET " . implode(', ', $cols) . " WHERE id = $id";
    return($sql);
}

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

        $this->vendors = ['Vegas Signs', 'CNC Signs', 'Metro Detroit Signs', 'Everything Tradeshows', 'Macklyn Casino Services', 'Calvi Electric Company', 'Superior Sign Company', 'CITY SIGN ERECTORS', 'Eagle', 'McNeill Signs'];

    }

    public function fsConfirmCreate($post){
		$qry = dynamicInsert('fs_confirms', $post);

        $query = $this->db->prepare($qry);
        $query->execute();
        return $this->db->lastInsertId();   
    }
    


    public function fsConfirmGetById($id){
        try {
            $mainQry = "
                select a.*, concat(first, ' ', last) confirmed_by
                from eyefidb.fs_confirms a
                left join db.users b ON b.id = a.created_by
                where a.id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':id', $id, PDO::PARAM_STR);
            $query->execute();
            $results = $query->fetch(PDO::FETCH_ASSOC);

            return $results;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function fsConfirmGetByFsId($id){
        try {
            $mainQry = "
                select a.*, concat(first, ' ', last) confirmed_by
                from eyefidb.fs_confirms a
                left join db.users b ON b.id = a.created_by
                where a.fs_scheduler_id = :fs_scheduler_id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':fs_scheduler_id', $id, PDO::PARAM_STR);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);

            return $results;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }
    

    public function createViews(){

        $qry = '
        Create or replace View fs_labor_ext As
        SELECT *, 
            TIMEDIFF(projectFinishTzConvert, projectStartTzConvert) timeDifference,
            case when projectFinishTz IS NULL AND projectStartTz IS NULL THEN TIMESTAMPDIFF(MINUTE, projectStart, projectFinish) ELSE TIMESTAMPDIFF(MINUTE, projectStartTzConvert, projectFinishTzConvert) END timeDifferenceMins
        from ( 
            select *, 
                case when projectFinishTz IS NOT NULL AND projectStartTz IS NOT NULL THEN 1 ELSE 0 END timezone_set
                CONVERT_TZ (projectStart,projectStartTz,"PST8PDT") projectStartTzConvert, 
                CONVERT_TZ (projectFinish,projectFinishTz,"PST8PDT") projectFinishTzConvert
            FROM fs_workOrderProject
            ORDER BY fs_workOrderProject.projectFinishTz  DESC  
        ) a
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->execute();
    }

    public function fieldServiceTicketAuthUsers()
    {
        return $authUsers = [
            'Ritz Dacanay',
            'Adriann Kamakahukilani',
            'Juvenal Torres',
            'Heidi Elya'
        ];
    }

    public function authorizedUsers()
    {

        return array(
            'Adriann Kamakahukilani',
            'Ritz Dacanay',
            'Juvenal Torres',,
            'Heidi Elya'
        );
    }


    //START EVENTS
    public function createEvents($data)
    {

        
        $end = $data['end'];
        if($data['allDay'] == false || $data['allDay'] == 'false'){
            $end =  date("Y-m-d",strtotime($data['start'])) . ' '. $data['end'];
        }

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
            $stmt->bindParam(':end', $end, PDO::PARAM_STR);
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
    
    function deleteAttachment($id){

		$qry = "
			DELETE from attachments 
			where id = :id
			AND field = 'Field Service Scheduler'
		";
		$query = $this->db->prepare($qry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
		$query->execute();  
	}

    public function getAttachmentByFsId($fsid)
    {
        try {
            $mainQry = "
                select *
                from eyefidb.attachments
                where field = 'Field Service Scheduler' and uniqueId = :uniqueId
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':uniqueId', $fsid, PDO::PARAM_STR);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);

            return $results;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    

    public function fs_full_events($user, $status){
        try {
            if($status == "All"){
                $mainQry = "
                    select  * 
                    from fs_full_events where LOWER(team) LIKE CONCAT('%', :team, '%') and request_date IS NOT NULL
                ";
            }else if($status == "Open"){
                $mainQry = "
                select  * 
                from fs_full_events where LOWER(team) LIKE CONCAT('%', :team, '%') 
            ";
            }else if($status == "Closed"){
                $mainQry = "
                select  * 
                from fs_full_events where LOWER(team) LIKE CONCAT('%', :team, '%') AND dateSubmitted IS NOT NULL and request_date IS NOT NULL
            ";
            }

            $query = $this->db->prepare($mainQry);
            $query->bindParam(':team', $user, PDO::PARAM_STR);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);

            return $results;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function requests(){
        try {
            $mainQry = "
                select a.*, b.id fsId
                from eyefidb.fs_request a
                LEFT JOIN fs_scheduler b ON b.request_id = a.id
                where a.active = 1
                order by ID DESC
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

    public function getServiceCall()
    {
        try {
            $mainQry = "
                select *
                from eyefidb.fs_scheduler_view
                order by ID DESC
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
    public function updateEvent($data)
        {

        $end = $data['end'];
        if($data['allDay'] == false || $data['allDay'] == 'false'){
            $end =  date("Y-m-d",strtotime($data['start'])) . ' '. $data['end'];
        }

        
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
            $stmt->bindParam(':end', $end, PDO::PARAM_STR);
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
                SELECT DISTINCT backgroundColor backgroundColors 
                FROM eyefidb.companyHoliday 
                WHERE backgroundColor != ''  group by backgroundColor
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
                SELECT DISTINCT textColor 
                FROM eyefidb.companyHoliday 
                WHERE textColor != '' 
                group by textColor
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
    
    
    public function mergeColors()
    {
        $presetBackgroundColors = ['#727cf5', '#7987a1', '#10b759', '#66d1d1', '#fbbc06', '#ff3366', 'green'];

        $generalColors = $this->generalColors();
        //$generalColors = explode(",", $generalColors);
        return array(
            "colors" => array_merge($presetBackgroundColors, $generalColors),
            "textColors" => $this->generalTextColors(),
            "users" => $this->getUsersFoFilter()
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

    //END EVENTS

    //START TRANSACTIONS
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

    public function readTransactions($workOrderId)
    {
        $mainQry = "
            SELECT a.id 
                , a.field 
                , a.o 
                , a.n 
                , a.createDate 
                , a.comment 
                , a.userId 
                , a.uniqueId 
                , a.type 
                , a.reasonCode 
                , a.workOrderId 
                , concat(b.first, ' ', b.last) modifiedBy
            FROM eyefidb.fs_userTrans a
            LEFT JOIN db.users b ON a.userId = b.id 
            WHERE a.workOrderId = :workOrderId
            ORDER BY a.createDate DESC
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":workOrderId", $workOrderId, PDO::PARAM_INT);
        $query->execute();
        $row = $query->fetchAll(PDO::FETCH_ASSOC);
        return $row;
    }
    //END TRANSACTIONS


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

    //START MAIN SETTINGS
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
                select TRIM(requested_by) value, 'Requests' type, count(*) hits 
                from eyefidb.fs_scheduler 
                where requested_by != ''
                group by TRIM(requested_by)
                UNION ALL
                select TRIM(sign_theme) value, 'Themes' type, count(*) hits 
                from eyefidb.fs_scheduler 
                where sign_theme != ''
                group by TRIM(sign_theme)
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

    //END MAIN SETTINGS

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
        
        $vendorLength = $this->vendors;
        
        foreach( $vendorLength as $value ) {

           $results[] = array(
                "id" => 0,
                "user" => $value,
                "checked" => false,
                "outside" => "Vendor",
                "user_rate" => 0
            );
          }

        return $results;
    }

    public function getUsersFoFilter()
    {
        $mainQry = "
            SELECT concat(a.first, ' ', a.last) userName
                , a.id
                , false checked
                , b.rate1 
            FROM db.users a
            left JOIN db.user_rates b ON a.id = b.userId
            WHERE area = 'Field Service'
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


    // START SCHEDULER
    public function byDate($dateFrom, $dateTo, $view = 'byDate', $groupId = null)
    {
        try {
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
            ";

            if ($view == 'Open') {
                $mainQry .= " AND a.status NOT LIKE '%completed%' ";
            }else if ($view == 'Group' && $groupId != null) {
                $mainQry .= " AND a.group_id = '" . $groupId . "' ";
            } else if ($view == 'Show All') {
            } else if ($view != 'All') {
                $mainQry .= " AND a.request_date between '" . $dateFrom . "' and '" . $dateTo . "' ";
            }

            $mainQry .= " order by concat(a.request_date, ' ', a.start_time) DESC";


            $query = $this->db->prepare($mainQry);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    
    public function byDateAndEvents($dateFrom, $dateTo, $view = 'byDate', $groupId = null)
    {
        $data = $this->byDate($dateFrom, $dateTo, 'All');

        $mainQry = "
            SELECT id, title, type, date(start) start
            FROM eyefidb.companyHoliday a
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $events = $query->fetchAll(PDO::FETCH_ASSOC);

        return array_merge($data, $events);
    }


    function getPendingInvoice(){
        $mainQry = "
        SELECT a.*, round(b.total_mins/60,2) total_mins, round(b.travel_mins/60,2) travel_mins, c.total_expenses, confirmed_date
            , d.total_to_bill
        FROM fs_scheduler_view a
        LEFT JOIN fs_work_order_summary_view b ON b.workOrderId = a.workOrderTicketId
        LEFT JOIN (
            SELECT sum(total_cost) total_expenses, workOrderId
            FROM fs_billing_expense_view
            GROUP BY workOrderId
        ) c ON c.workOrderId = a.workOrderTicketId
        left join fs_billing_summary_detail_view d ON d.id = a.workOrderTicketId
        
        LEFT JOIN (
            select count(fs_scheduler_id) hit, max(created_date) confirmed_date, fs_scheduler_id
            from fs_confirms
            group by fs_scheduler_id
        ) confirm ON confirm.fs_scheduler_id = a.fs_scheduler_id

        WHERE ( ISNULL(a.invoice_date) AND (a.paper_work_location = 'Accounting'))
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
    
    //ticket complete
    function getOpenJobs(){
        $mainQry = "
        SELECT a.*, b.total_qtr_hrs total_mins, b.travel_mins_qtr_hrs travel_mins, c.total_expenses, confirmed_date
        FROM fs_scheduler_view a
        LEFT JOIN fs_work_order_summary_view b ON b.workOrderId = a.workOrderTicketId
        LEFT JOIN (
            SELECT sum(total_cost) total_expenses, workOrderId
            FROM fs_billing_expense_view
            GROUP BY workOrderId
        ) c ON c.workOrderId = a.workOrderTicketId

        LEFT JOIN (
            select count(fs_scheduler_id) hit, max(created_date) confirmed_date, fs_scheduler_id
            from fs_confirms
            group by fs_scheduler_id
        ) confirm ON confirm.fs_scheduler_id = a.fs_scheduler_id

        WHERE (a.dateSubmitted IS NOT NULL) AND (a.invoice_date IS NULL )
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
    

    public function confirmedJobs()
    {
        $mainQry = "
            SELECT a.*, confirmed_date
            FROM fs_scheduler_view a
            LEFT JOIN (
                select count(fs_scheduler_id) hit, max(created_date) confirmed_date, fs_scheduler_id
                from fs_confirms
                group by fs_scheduler_id
            ) b ON b.fs_scheduler_id = a.fs_scheduler_id
            WHERE  a.status = 'CONFIRMED' 
                and a.dateSubmitted IS NULL 
                and a.workOrderTicketId IS NULL
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }
    

    public function ticketInProcess()
    {
        $mainQry = "
        SELECT a.*, round(b.total_mins/60,2) total_mins, round(b.travel_mins/60,2) travel_mins, c.total_expenses, confirmed_date
        FROM fs_scheduler_view a
        LEFT JOIN fs_work_order_summary_view b ON b.workOrderId = a.workOrderTicketId
        LEFT JOIN (
            SELECT sum(total_cost) total_expenses, workOrderId
            FROM fs_billing_expense_view
            GROUP BY workOrderId
        ) c ON c.workOrderId = a.workOrderTicketId
        
        LEFT JOIN (
            select count(fs_scheduler_id) hit, max(created_date) confirmed_date, fs_scheduler_id
            from fs_confirms
            group by fs_scheduler_id
        ) confirm ON confirm.fs_scheduler_id = a.fs_scheduler_id

            WHERE a.workOrderTicketId IS NOT NULL AND ISNULL(a.dateSubmitted) AND ISNULL(invoice_Date) 
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }

    

    public function getCount()
    {
        $mainQry = "
        SELECT sum(case when a.status = 'CONFIRMED' and a.dateSubmitted IS NULL and a.workOrderTicketId IS NULL THEN 1 ELSE 0 END) confirmed_jobs 
            , sum(case when a.workOrderTicketId IS NOT NULL AND ISNULL(a.dateSubmitted) AND ISNULL(invoice_Date)   THEN 1 ELSE 0 END) ticketInProcess
            , sum(case when (a.dateSubmitted IS NOT NULL) AND (a.invoice_date IS NULL ) THEN 1 ELSE 0 END) openJobs
            , sum(case when ( ISNULL(a.invoice_date) AND (a.paper_work_location = 'Accounting')) THEN 1 ELSE 0 END) pending_invoice

        FROM fs_scheduler_view a
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return  $query->fetch(PDO::FETCH_ASSOC);
    }

    public function getSchedule()
    {
        $mainQry = "
        SELECT a.*, b.*, c.total_expenses, confirmed_date
        FROM fs_scheduler_view a
        LEFT JOIN fs_work_order_summary_view b ON b.workOrderId = a.workOrderTicketId
        LEFT JOIN (
            SELECT sum(total_cost) total_expenses, workOrderId
                FROM fs_billing_expense_view
                GROUP BY workOrderId
            ) c ON c.workOrderId = a.workOrderTicketId
            
        LEFT JOIN (
            select count(fs_scheduler_id) hit, max(created_date) confirmed_date, fs_scheduler_id
            from fs_confirms
            group by fs_scheduler_id
        ) confirm ON confirm.fs_scheduler_id = a.fs_scheduler_id

        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return  $query->fetchAll(PDO::FETCH_ASSOC);
    }

    function getGroupedJobs($groupId){
        $mainQry = "
            select a.*, b.id workOrderId
            from eyefidb.fs_scheduler a
            left join fs_workOrder b ON b.fs_scheduler_id = a.id
            WHERE a.group_id = :group_id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':group_id', $groupId, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        return $results;
    }

    public function byFsId($fsId)
    {
        try {
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
                    , case when a.platform = '' THEN null ELSE a.platform END platform
                    , a.billable 
                    , a.request_date
                    , IFNULL(team, 'No techs assigned') installers
                    
                    , concat(a.id, '-', b.id) fullWorkOrderId
                    , a.invoice_notes
                    , concat(a.request_date, ' ', a.start_time) as full_request_date
					, concat(a.request_date, ' ', a.start_time) + INTERVAL case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END MINUTE endTime
                    
                    , b.hits
                    , b.dateSubmitted
                    , b.id workOrderTicketId
                    , b.createdDate createdDateWorkOrder
                    , b.created_by createdByWorkOrder

                    , case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END timeToComplete
                    , co_number
                    , customer_cancelled
                    , cancellation_comments
                    , cancelled_type
                    , a.out_of_state

                    , concat(u.first, ' ', u.last) createdByName
                    , a.address1 address1
                    , a.address2 address2
                    , a.city city
                    , a.mark_up_percent
                    , a.ef_hourly_rate
                    , a.ef_overtime_hourly_rate

                    , a.paper_work_location
                    , a.billable_flat_rate_or_po
                    , a.contractor_inv_sent_to_ap
                    , a.period
                    , a.property_phone property_phone
                    , a.zip_code
                    , a.compliance_license_notes
                    , turnover_fsid
                    , a.group_id
                    , a.published
                    
                    , CASE WHEN a.published = 0 THEN '#fff' ELSE f.statusColor END backgroundColor 
                    , CASE WHEN f.statusColor IS NULL THEN  f.statusColor ELSE f.statusColor END borderColor
                    , CASE WHEN f.color IS NULL OR a.published = 0 THEN '#000' ELSE f.color  END color


                    , a.property_id
                    , CONCAT_WS(',', 
                    NULLIF(trim(a.property), ''),
                    NULLIF(trim(a.address1), ''),
                    NULLIF(trim(a.address2), ''),
                    NULLIF(trim(a.city), ''), 
                    NULLIF(trim(a.state), ''), 
                    NULLIF(trim(a.zip_code), ''),  
                    NULLIF(trim(a.property_phone), '')) full_address,
                    sign_responsibility

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
                    select fs_det_id, group_concat(user SEPARATOR ', ') team
                    from eyefidb.fs_team
                    group by fs_det_id
                ) e ON e.fs_det_id = a.id

                LEFT JOIN db.users u ON u.id = a.created_by

                
                LEFT JOIN eyefidb.fs_scheduler_settings f ON f.value = a.status AND f.type = 'status'


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

    
            // $qry = '
            //     INSERT INTO eyefidb.fs_mstr (
            //         created_date
            //         , created_by
            //     ) 
            //     VALUES( 
            //         :created_date
            //         , :created_by
            //     )
            // ';
            // $stmt = $this->db->prepare($qry);
            // $stmt->bindParam(':created_date', $post['created_date'], PDO::PARAM_STR);
            // $stmt->bindParam(':created_by', $post['created_by'], PDO::PARAM_STR);
            // $stmt->execute();
            // $fs_mstr_id = $this->db->lastInsertId();
    

            $request_date = $this->setEmptyValue($post['request_date']);
            $invoice_date = $this->setEmptyValue($post['invoice_date']);

            if (isset($post['turnover_fsid'])) {
                if($post['turnover_fsid'] == ""){
                    $turnover_fsid = null;
                }else{
                    $turnover_fsid = $post['turnover_fsid'];
                }
            }else{
                $turnover_fsid = null;
            }

            $property_id = ISSET($post['property_id']) ? $post['property_id']: null;
            $request_id = ISSET($post['request_id']) ? $post['request_id']: null;


            $mainQry = "
                INSERT INTO eyefidb.fs_scheduler (
                    request_date
                    , requested_by
                    , status
                    , sales_order_number
                    , invoice
                    , service_type
                    , customer
                    , sign_theme
                    , sign_type
                    , comments
                    , start_time
                    , notes
                    , created_date
                    , created_by
                    , vendor_inv_number
                    , vendor_cost
                    , invoice_date
                    , invoice_number
                    , acc_status
                    , platform
                    , billable
                    , original_request_date
                    , out_of_state
                    , invoice_notes
                    , co_number
                    , customer_cancelled
                    , cancellation_comments
                    , cancelled_type
                    , ef_hourly_rate
                    , ef_overtime_hourly_rate
                    , mark_up_percent
                    , paper_work_location
                    , billable_flat_rate_or_po
                    , contractor_inv_sent_to_ap
                    , period
                    , compliance_license_notes
                    , turnover_fsid
                    , published
                    , property_id
                    , non_billable_code
                    , property
                    , address1
                    , address2
                    , city
                    , state
                    , zip_code
                    , country
                    , property_phone
                    , request_id
                    , sign_responsibility
                    , per_tech_rate
                    , per_tech_rate_ot
                )VALUES(
                    :request_date
                    , :requested_by
                    , :status
                    , :sales_order_number
                    , :invoice
                    , :service_type
                    , :customer
                    , :sign_theme
                    , :sign_type
                    , :comments
                    , :start_time
                    , :notes
                    , :created_date
                    , :created_by
                    , :vendor_inv_number
                    , :vendor_cost
                    , :invoice_date
                    , :invoice_number
                    , :acc_status
                    , :platform
                    , :billable
                    , :original_request_date
                    , :out_of_state
                    , :invoice_notes	
                    , :co_number
                    , :customer_cancelled
                    , :cancellation_comments
                    , :cancelled_type
                    , :ef_hourly_rate
                    , :ef_overtime_hourly_rate
                    , :mark_up_percent
                    , :paper_work_location
                    , :billable_flat_rate_or_po
                    , :contractor_inv_sent_to_ap
                    , :period
                    , :compliance_license_notes
                    , :turnover_fsid
                    , :published
                    , :property_id
                    , :non_billable_code
                    , :property
                    , :address1
                    , :address2
                    , :city
                    , :state
                    , :zip_code
                    , :country
                    , :property_phone
                    , :request_id
                    , :sign_responsibility
                    , :per_tech_rate
                    , :per_tech_rate_ot
                )
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':request_date', $request_date, PDO::PARAM_STR);
            $query->bindParam(':requested_by', $post['requested_by'], PDO::PARAM_STR);
            $query->bindParam(':status', $post['status'], PDO::PARAM_STR);
            $query->bindParam(':sales_order_number', $post['sales_order_number'], PDO::PARAM_STR);
            $query->bindParam(':invoice', $post['invoice'], PDO::PARAM_STR);
            $query->bindParam(':service_type', $post['service_type'], PDO::PARAM_STR);
            $query->bindParam(':customer', $post['customer'], PDO::PARAM_STR);
            $query->bindParam(':sign_theme', $post['sign_theme'], PDO::PARAM_STR);
            $query->bindParam(':sign_type', $post['sign_type'], PDO::PARAM_STR);
            $query->bindParam(':comments', $post['comments'], PDO::PARAM_STR);
            $query->bindParam(':start_time', $post['start_time'], PDO::PARAM_STR);
            $query->bindParam(':notes', $post['notes'], PDO::PARAM_STR);
            $query->bindParam(':created_by', $post['created_by'], PDO::PARAM_INT);
            $query->bindParam(':created_date', $post['created_date'], PDO::PARAM_STR);
            $query->bindParam(':vendor_inv_number', $post['vendor_inv_number'], PDO::PARAM_STR);
            $query->bindParam(':vendor_cost', $post['vendor_cost'], PDO::PARAM_STR);
            $query->bindParam(':invoice_date', $invoice_date, PDO::PARAM_STR);
            $query->bindParam(':invoice_number', $post['invoice_number'], PDO::PARAM_STR);
            $query->bindParam(':acc_status', $post['acc_status'], PDO::PARAM_STR);
            $query->bindParam(':platform', $post['platform'], PDO::PARAM_STR);
            $query->bindParam(':billable', $post['billable'], PDO::PARAM_STR);
            $query->bindParam(':original_request_date', $request_date, PDO::PARAM_STR);
            $query->bindParam(':out_of_state', $post['out_of_state'], PDO::PARAM_STR);
            $query->bindParam(':invoice_notes', $post['invoice_notes'], PDO::PARAM_STR);
            $query->bindParam(':co_number', $post['co_number'], PDO::PARAM_STR);
            $query->bindParam(':customer_cancelled', $post['customer_cancelled'], PDO::PARAM_STR);
            $query->bindParam(':cancellation_comments', $post['cancellation_comments'], PDO::PARAM_STR);
            $query->bindParam(':cancelled_type', $post['cancelled_type'], PDO::PARAM_STR);
            $query->bindParam(':ef_hourly_rate', $post['ef_hourly_rate'], PDO::PARAM_STR);
            $query->bindParam(':ef_overtime_hourly_rate', $post['ef_overtime_hourly_rate'], PDO::PARAM_STR);
            $query->bindParam(':mark_up_percent', $post['mark_up_percent'], PDO::PARAM_STR);
            $query->bindParam(':paper_work_location', $post['paper_work_location'], PDO::PARAM_STR);
            $query->bindParam(':billable_flat_rate_or_po', $post['billable_flat_rate_or_po'], PDO::PARAM_STR);
            $query->bindParam(':contractor_inv_sent_to_ap', $post['contractor_inv_sent_to_ap'], PDO::PARAM_STR);
            $query->bindParam(':period', $post['period'], PDO::PARAM_STR);
            $query->bindParam(':compliance_license_notes', $post['compliance_license_notes'], PDO::PARAM_STR);
            $query->bindParam(':published', $post['published'], PDO::PARAM_INT);
            $query->bindParam(':turnover_fsid', $turnover_fsid, PDO::PARAM_INT);
            $query->bindParam(':property_id', $property_id, PDO::PARAM_INT);
            // $query->bindParam(':group_id', $fs_mstr_id, PDO::PARAM_INT);
            $query->bindParam(':non_billable_code', $post['non_billable_code'], PDO::PARAM_INT);
            $query->bindParam(':property', $post['property'], PDO::PARAM_STR);
            $query->bindParam(':address1', $post['address1'], PDO::PARAM_STR);
            $query->bindParam(':address2', $post['address2'], PDO::PARAM_STR);
            $query->bindParam(':city', $post['city'], PDO::PARAM_STR);
            $query->bindParam(':state', $post['state'], PDO::PARAM_STR);
            $query->bindParam(':zip_code', $post['zip_code'], PDO::PARAM_STR);
            $query->bindParam(':country', $post['country'], PDO::PARAM_STR);
            $query->bindParam(':property_phone', $post['property_phone'], PDO::PARAM_STR);
            $query->bindParam(':request_id', $post['request_id'], PDO::PARAM_INT);
            $query->bindParam(':sign_responsibility', $post['sign_responsibility'], PDO::PARAM_STR);

            
            $per_tech_rate = 33.50;
            $per_tech_rate_ot = 49.60;

            
            $query->bindParam(':per_tech_rate', $per_tech_rate, PDO::PARAM_STR);
            $query->bindParam(':per_tech_rate_ot', $per_tech_rate_ot, PDO::PARAM_STR);

            
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
                            "contractor_code" => $row['contractor_code'],
                        )
                    );
                }
            }

            if($post['sign_responsibility'] == "EyeFi"){
                $toEmailUsers = " 
                    daniela.rumbos@the-fi-company.com,
                    Logisticslv@the-fi-company.com,
                    schedulinglv@the-fi-company.com,
                ";

                $ccEmailUsers = " 
                    ritz.dacanay@the-fi-company.com
                ";



                
        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
        $mail->Subject = "Sign Responsibility for FSID #" . $last_id;

        $addresses = explode(',', $toEmailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }
           
        $addresses = explode(',', $ccEmailUsers);
        foreach ($addresses as $address) {
            $mail->addCC($address);
        }
           

                $mail->Body = '<html><body>';
                $mail->Body .= 'Hello Team, <br/>';
                $mail->Body .= 'Part delivery for FSID '. $last_id .' <br/><br/>';
                
                
                $mail->Body .= '<table rules="all" style="border-color: #000;" cellpadding="5" border="1">';
                $mail->Body .= "<tr style='background: #eee;'>";
                $mail->Body .= "<td><strong>Request Date</strong></td>";
                $mail->Body .= "<td><strong>CO #</strong></td>";
                $mail->Body .= "<td><strong>Property</strong></td>";
                $mail->Body .= "<td><strong>Platform</strong></td>";
                $mail->Body .= "<td><strong>Sign Theme</strong></td>";
                $mail->Body .= "<td><strong>Sign Rresponsibility</strong></td>";
                $mail->Body .= "</tr>";

                $mail->Body .= "<tr> \r\n";
                $mail->Body .= "<td>" . $request_date . "</td> \r\n";
                $mail->Body .= "<td>" . $post['co_number'] . "</td> \r\n";
                $mail->Body .= "<td>" . $post['property'] . "</td> \r\n";
                $mail->Body .= "<td>" . $post['platform'] . "</td> \r\n";
                $mail->Body .= "<td>" . $post['sign_theme'] . "</td> \r\n";
                $mail->Body .= "<td>" . $post['sign_responsibility'] . "</td> \r\n";
                $mail->Body .= "</tr> \r\n";
                $mail->Body .= "</table>";
                
                
                $mail->Body .= '<br><hr>';
                $mail->Body .= 'This is an automated email. Please do not respond. <br>';
                $mail->Body .= 'Thank you.';

                $mail->Body .= "</body></html>";


                $mail->send();
            
            }

            $this->db->commit();

            return $last_id;
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
                SET request_date = :request_date,
                    start_time = :start_time
                WHERE id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':request_date', $post['request_date'], PDO::PARAM_STR);
            $query->bindParam(':start_time', $post['start_time'], PDO::PARAM_STR);
            $query->bindParam(':id', $post['id'], PDO::PARAM_STR);
            $query->execute();
            
            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }


    
    public function updateWorkOrder($post)
    {

        $this->db->beginTransaction();
        $fsTrans = array();

        try {

            $request_date = $this->setEmptyValue($post['request_date']);
            $invoice_date = $this->setEmptyValue($post['invoice_date']);
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
            if (isset($row['request_date']) && $row['request_date'] != $request_date) {
                $fsTrans[] = array(
                    'field' => 'Request Date changed', 'o' => $row['request_date'], 'n' => $request_date, 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['requested_by']) && $row['requested_by'] != $post['requested_by']) {
                $fsTrans[] = array(
                    'field' => 'Request By changed', 'o' => $row['requested_by'], 'n' => $post['requested_by'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['status']) && $row['status'] != $post['status']) {
                $fsTrans[] = array(
                    'field' => 'status changed', 'o' => $row['status'], 'n' => $post['status'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['sales_order_number']) && $row['sales_order_number'] != $post['sales_order_number']) {
                $fsTrans[] = array(
                    'field' => 'Sales Order Number changed', 'o' => $row['sales_order_number'], 'n' => $post['sales_order_number'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['service_type']) && $row['service_type'] != $post['service_type']) {
                $fsTrans[] = array(
                    'field' => 'Service Type changed', 'o' => $row['service_type'], 'n' => $post['service_type'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['customer']) && $row['customer'] != $post['customer']) {
                $fsTrans[] = array(
                    'field' => 'customer changed', 'o' => $row['customer'], 'n' => $post['customer'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['sign_theme']) && $row['sign_theme'] != $post['sign_theme']) {
                $fsTrans[] = array(
                    'field' => 'Sign Theme changed', 'o' => $row['sign_theme'], 'n' => $post['sign_theme'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['sign_type']) && $row['sign_type'] != $post['sign_type']) {
                $fsTrans[] = array(
                    'field' => 'Sign Type changed', 'o' => $row['sign_type'], 'n' => $post['sign_type'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['comments']) && $row['comments'] != $post['comments']) {
                $fsTrans[] = array(
                    'field' => 'comments changed', 'o' => $row['comments'], 'n' => $post['comments'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            
            if (isset($row['start_time']) && $row['start_time'] != $post['start_time']) {
                $fsTrans[] = array(
                    'field' => 'start_time changed', 'o' => $row['start_time'], 'n' => $post['start_time'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['notes']) && $row['notes'] != $post['notes']) {
                $fsTrans[] = array(
                    'field' => 'notes changed', 'o' => $row['notes'], 'n' => $post['notes'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
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
            if (isset($row['vendor_inv_number']) && $row['vendor_inv_number'] != $post['vendor_inv_number']) {
                $fsTrans[] = array(
                    'field' => 'Vendor Inv Number changed', 'o' => $row['vendor_inv_number'], 'n' => $post['vendor_inv_number'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['vendor_cost']) && $row['vendor_cost'] != $post['vendor_cost']) {
                $fsTrans[] = array(
                    'field' => 'Vendor Cost changed', 'o' => $row['vendor_cost'], 'n' => $post['vendor_cost'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['invoice_date']) && $row['invoice_date'] != $invoice_date) {
                $fsTrans[] = array(
                    'field' => 'invoice Date changed', 'o' => $row['invoice_date'], 'n' => $invoice_date, 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['invoice_number']) && $row['invoice_number'] != $post['invoice_number']) {
                $fsTrans[] = array(
                    'field' => 'invoice Number changed', 'o' => $row['invoice_number'], 'n' => $post['invoice_number'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['acc_status']) && $row['acc_status'] != $post['acc_status']) {
                $fsTrans[] = array(
                    'field' => 'Acc status changed', 'o' => $row['acc_status'], 'n' => $post['acc_status'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['out_of_state']) && $row['out_of_state'] != $post['out_of_state']) {
                $fsTrans[] = array(
                    'field' => 'Out Of State changed', 'o' => $row['out_of_state'], 'n' => $post['out_of_state'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['invoice_notes']) && $row['invoice_notes'] != $post['invoice_notes']) {
                $fsTrans[] = array(
                    'field' => 'invoice notes changed', 'o' => $row['invoice_notes'], 'n' => $post['invoice_notes'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['co_number']) && $row['co_number'] != $post['co_number']) {
                $fsTrans[] = array(
                    'field' => 'Co Number changed', 'o' => $row['co_number'], 'n' => $post['co_number'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['customer_cancelled']) && $row['customer_cancelled'] != $post['customer_cancelled']) {
                $fsTrans[] = array(
                    'field' => 'customer Cancelled changed', 'o' => $row['customer_cancelled'], 'n' => $post['customer_cancelled'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['cancellation_comments']) && $row['cancellation_comments'] != $post['cancellation_comments']) {
                $fsTrans[] = array(
                    'field' => 'Cancellation changed', 'o' => $row['cancellation_comments'], 'n' => $post['cancellation_comments'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['cancelled_type']) && $row['cancelled_type'] != $post['cancelled_type']) {
                $fsTrans[] = array(
                    'field' => 'Cancellation Type changed', 'o' => $row['cancelled_type'], 'n' => $post['cancelled_type'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
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
            if (isset($row['mark_up_percent']) && $row['mark_up_percent'] != $post['mark_up_percent']) {
                $fsTrans[] = array(
                    'field' => 'Mark Up Percent changed', 'o' => $row['mark_up_percent'], 'n' => $post['mark_up_percent'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['paper_work_location']) && $row['paper_work_location'] != $post['paper_work_location']) {
                $fsTrans[] = array(
                    'field' => 'Paper Work Locationt changed', 'o' => $row['paper_work_location'], 'n' => $post['paper_work_location'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['billable_flat_rate_or_po']) && $row['billable_flat_rate_or_po'] != $post['billable_flat_rate_or_po']) {
                $fsTrans[] = array(
                    'field' => 'Billable Flat Rate/PO changed', 'o' => $row['billable_flat_rate_or_po'], 'n' => $post['billable_flat_rate_or_po'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['contractor_inv_sent_to_ap']) && $row['contractor_inv_sent_to_ap'] != $post['contractor_inv_sent_to_ap']) {
                $fsTrans[] = array(
                    'field' => 'Contractor Inv Sent To AP changed', 'o' => $row['contractor_inv_sent_to_ap'], 'n' => $post['contractor_inv_sent_to_ap'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['period']) && $row['period'] != $post['period']) {
                $fsTrans[] = array(
                    'field' => 'Period changed', 'o' => $row['period'], 'n' => $post['period'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['compliance_license_notes']) && $row['compliance_license_notes'] != $post['compliance_license_notes']) {
                $fsTrans[] = array(
                    'field' => 'Compliance License notes changed', 'o' => $row['compliance_license_notes'], 'n' => $post['compliance_license_notes'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['published']) && $row['published'] != $post['published']) {
                $fsTrans[] = array(
                    'field' => 'Published changed', 'o' => $row['published'], 'n' => $post['published'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['property_id']) && $row['property_id'] != $post['property_id']) {
                $fsTrans[] = array(
                    'field' => 'Property Id Changed', 'o' => $row['property_id'], 'n' => $post['property_id'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['property']) && $row['property'] != $post['property']) {
                $fsTrans[] = array(
                    'field' => 'Property Changed', 'o' => $row['property'], 'n' => $post['property'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['address1']) && $row['address1'] != $post['address1']) {
                $fsTrans[] = array(
                    'field' => 'Address1 Changed', 'o' => $row['address1'], 'n' => $post['address1'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['address2']) && $row['address2'] != $post['address2']) {
                $fsTrans[] = array(
                    'field' => 'Address2 Changed', 'o' => $row['address2'], 'n' => $post['address2'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['city']) && $row['city'] != $post['city']) {
                $fsTrans[] = array(
                    'field' => 'City Changed', 'o' => $row['city'], 'n' => $post['city'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['state']) && $row['state'] != $post['state']) {
                $fsTrans[] = array(
                    'field' => 'State Changed', 'o' => $row['state'], 'n' => $post['state'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['zip_code']) && $row['zip_code'] != $post['zip_code']) {
                $fsTrans[] = array(
                    'field' => 'Zip Code Changed', 'o' => $row['zip_code'], 'n' => $post['zip_code'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['country']) && $row['country'] != $post['country']) {
                $fsTrans[] = array(
                    'field' => 'Country Changed', 'o' => $row['country'], 'n' => $post['country'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['property_phone']) && $row['property_phone'] != $post['property_phone']) {
                $fsTrans[] = array(
                    'field' => 'Property Phone Changed', 'o' => $row['property_phone'], 'n' => $post['property_phone'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }
            if (isset($row['sign_responsibility']) && $row['sign_responsibility'] != $post['sign_responsibility']) {
                $fsTrans[] = array(
                    'field' => 'Sign Responsibility Changed', 'o' => $row['sign_responsibility'], 'n' => $post['sign_responsibility'], 'comment' => '', 'uniqueId' => $post['id'], 'type' => 'Field Service Calendar', 'workOrderId' => $post['id']
                );
            }

            if (isset($post['turnover_fsid'])) {
                $turnover_fsid = $post['turnover_fsid'];
            }

            
            $property_id = ISSET($post['property_id']) ? $post['property_id']: null;

            $mainQry = "
                UPDATE eyefidb.fs_scheduler 
                SET request_date = :request_date
                    , requested_by = :requested_by
                    , status = :status
                    , sales_order_number = :sales_order_number
                    , invoice = :invoice
                    , service_type = :service_type
                    , customer = :customer
                    , sign_theme = :sign_theme
                    , sign_type = :sign_type
                    , comments = :comments
                    , start_time = :start_time
                    , notes = :notes
                    , vendor_inv_number = :vendor_inv_number
                    , vendor_cost = :vendor_cost
                    , invoice_date = :invoice_date
                    , invoice_number = :invoice_number
                    , acc_status = :acc_status
                    , platform = :platform
                    , billable = :billable
                    , out_of_state = :out_of_state 
                    , invoice_notes = :invoice_notes
                    , co_number = :co_number
                    , customer_cancelled = :customer_cancelled 
                    , cancellation_comments = :cancellation_comments
                    , cancelled_type = :cancelled_type
                    , active = :active
                    , ef_hourly_rate = :ef_hourly_rate
                    , ef_overtime_hourly_rate = :ef_overtime_hourly_rate
                    , mark_up_percent = :mark_up_percent
                    , paper_work_location = :paper_work_location
                    , billable_flat_rate_or_po = :billable_flat_rate_or_po
                    , contractor_inv_sent_to_ap = :contractor_inv_sent_to_ap
                    , period = :period
                    , compliance_license_notes = :compliance_license_notes
                    , turnover_fsid = :turnover_fsid
                    , published = :published
                    , property_id = :property_id
                    , non_billable_code = :non_billable_code
                    , property = :property
                    , address1 = :address1
                    , address2 = :address2
                    , city = :city
                    , state = :state
                    , zip_code = :zip_code
                    , country = :country
                    , property_phone = :property_phone
                    , sign_responsibility = :sign_responsibility
                WHERE id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':request_date', $request_date, PDO::PARAM_STR);
            $query->bindParam(':requested_by', $post['requested_by'], PDO::PARAM_STR);
            $query->bindParam(':status', $post['status'], PDO::PARAM_STR);
            $query->bindParam(':sales_order_number', $post['sales_order_number'], PDO::PARAM_STR);
            $query->bindParam(':invoice', $post['invoice'], PDO::PARAM_STR);
            $query->bindParam(':service_type', $post['service_type'], PDO::PARAM_STR);
            $query->bindParam(':customer', $post['customer'], PDO::PARAM_STR);
            $query->bindParam(':sign_theme', $post['sign_theme'], PDO::PARAM_STR);
            $query->bindParam(':sign_type', $post['sign_type'], PDO::PARAM_STR);
            $query->bindParam(':comments', $post['comments'], PDO::PARAM_STR);

            $query->bindParam(':start_time', $post['start_time'], PDO::PARAM_STR);
            $query->bindParam(':notes', $post['notes'], PDO::PARAM_STR);
            $query->bindParam(':vendor_inv_number', $post['vendor_inv_number'], PDO::PARAM_STR);
            $query->bindParam(':vendor_cost', $post['vendor_cost'], PDO::PARAM_STR);
            $query->bindParam(':invoice_date', $invoice_date, PDO::PARAM_STR);
            $query->bindParam(':invoice_number', $post['invoice_number'], PDO::PARAM_STR);
            $query->bindParam(':acc_status', $post['acc_status'], PDO::PARAM_STR);
            $query->bindParam(':platform', $post['platform'], PDO::PARAM_STR);
            $query->bindParam(':billable', $billable, PDO::PARAM_STR);
            $query->bindParam(':out_of_state', $post['out_of_state'], PDO::PARAM_STR);
            $query->bindParam(':invoice_notes', $post['invoice_notes'], PDO::PARAM_STR);
            $query->bindParam(':co_number', $post['co_number'], PDO::PARAM_STR);
            $query->bindParam(':customer_cancelled', $post['customer_cancelled'], PDO::PARAM_STR);
            $query->bindParam(':cancellation_comments', $post['cancellation_comments'], PDO::PARAM_STR);
            $query->bindParam(':cancelled_type', $post['cancelled_type'], PDO::PARAM_STR);
            $query->bindParam(':active', $post['active'], PDO::PARAM_INT);
            $query->bindParam(':ef_hourly_rate', $post['ef_hourly_rate'], PDO::PARAM_STR);
            $query->bindParam(':ef_overtime_hourly_rate', $post['ef_overtime_hourly_rate'], PDO::PARAM_STR);

            $query->bindParam(':mark_up_percent', $post['mark_up_percent'], PDO::PARAM_STR);
            $query->bindParam(':paper_work_location', $post['paper_work_location'], PDO::PARAM_STR);
            $query->bindParam(':billable_flat_rate_or_po', $post['billable_flat_rate_or_po'], PDO::PARAM_STR);
            $query->bindParam(':contractor_inv_sent_to_ap', $post['contractor_inv_sent_to_ap'], PDO::PARAM_STR);
            $query->bindParam(':period', $post['period'], PDO::PARAM_STR);
            $query->bindParam(':compliance_license_notes', $post['compliance_license_notes'], PDO::PARAM_STR);
            $query->bindParam(':turnover_fsid', $turnover_fsid, PDO::PARAM_STR);
            $query->bindParam(':published', $post['published'], PDO::PARAM_INT);
            $query->bindParam(':property_id', $property_id, PDO::PARAM_INT);
            $query->bindParam(':non_billable_code', $post['non_billable_code'], PDO::PARAM_INT);

            
            $query->bindParam(':property', $post['property'], PDO::PARAM_STR);
            $query->bindParam(':address1', $post['address1'], PDO::PARAM_STR);
            $query->bindParam(':address2', $post['address2'], PDO::PARAM_STR);
            $query->bindParam(':city', $post['city'], PDO::PARAM_STR);
            $query->bindParam(':state', $post['state'], PDO::PARAM_STR);
            $query->bindParam(':zip_code', $post['zip_code'], PDO::PARAM_STR);
            $query->bindParam(':country', $post['country'], PDO::PARAM_STR);
            $query->bindParam(':property_phone', $post['property_phone'], PDO::PARAM_STR);
            $query->bindParam(':sign_responsibility', $post['sign_responsibility'], PDO::PARAM_STR);
            

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
                            "contractor_code" => $row['contractor_code'],
                        )
                    );
                }
            }

            // if($post['sign_responsibility'] == "EyeFi" && $post['sign_responsibility'] == "EyeFi"){
            //     $toEmailUsers = " 
            //         daniela.rumbos@the-fi-company.com,
            //         Logisticslv@the-fi-company.com,
            //         juvenal.torres@the-fi-company.com,
            //         simona.jones@the-fi-company.com
            //     ";

            //     $ccEmailUsers = " 
            //         ritz.dacanay@the-fi-company.com
            //     ";


            //     $to         = $toEmailUsers;
            //     $cc         = $ccEmailUsers;

            //     $subject       = "Sign Responsibility for FSID #" . $post['id'];

            //     $mail->Body = '<html><body>';
            //     $mail->Body .= 'Hello Team, <br/>';
            //     $mail->Body .= 'Part delivery for fsid '. $post['id'] .'<br/><br/>';
                
                
            //     $mail->Body .= '<table rules="all" style="border-color: #000;" cellpadding="5" border="1">';
            //     $mail->Body .= "<tr style='background: #eee;'>";
            //     $mail->Body .= "<td><strong>Request Date</strong></td>";
            //     $mail->Body .= "<td><strong>CO #</strong></td>";
            //     $mail->Body .= "<td><strong>Property</strong></td>";
            //     $mail->Body .= "<td><strong>Platform</strong></td>";
            //     $mail->Body .= "<td><strong>Sign Theme</strong></td>";
            //     $mail->Body .= "<td><strong>Sign Rresponsibility</strong></td>";
            //     $mail->Body .= "</tr>";

            //     $mail->Body .= "<tr> \r\n";
            //     $mail->Body .= "<td>" . $request_date . "</td> \r\n";
            //     $mail->Body .= "<td>" . $post['co_number'] . "</td> \r\n";
            //     $mail->Body .= "<td>" . $post['property'] . "</td> \r\n";
            //     $mail->Body .= "<td>" . $post['platform'] . "</td> \r\n";
            //     $mail->Body .= "<td>" . $post['sign_theme'] . "</td> \r\n";
            //     $mail->Body .= "<td>" . $post['sign_responsibility'] . "</td> \r\n";
            //     $mail->Body .= "</tr> \r\n";
            //     $mail->Body .= "</table>";
                
                
            //     $mail->Body .= '<br><hr>';
            //     $mail->Body .= 'This is an automated email. Please do not respond. <br>';
            //     $mail->Body .= 'Thank you.';

            //     $mail->Body .= "</body></html>";


            //     $headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n" .
            //         'Reply-To:' . MAIL_EMAIL . "\r\n";
            //     $headers .= "Cc: $cc\r\n";
            //     $headers .= "Reply-To: " . ($to) . "\r\n";
            //     $headers .= "Return-Path: " . ($to) . "\r\n";
            //     $headers .= "MIME-Version: 1.0\r\n";
            //     $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
            //     $headers .= "Content-Transfer-Encoding: 64bit\r\n";
            //     $headers .= "X-Priority: 3\r\n";
            //     $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";


            //     $finalMessage = wordwrap($mail->Body, 100, "\n");

            //     mail($to, $subject, $finalMessage, $headers);
            
            // }

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
                    , a.request_date 
                    , DATEDIFF(a.request_date, now()) dateDiff
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
                    , team installers
                    , b.hits
                    , b.dateSubmitted
                    , b.id workOrderTicketId
                    , concat(a.id, '-', b.id) fullWorkOrderId
                    , co_number
                    , concat(a.request_date,  ' ', a.start_time) full_request_date
                    , a.address1 address
                    , a.compliance_license_notes
                    , CONCAT(a.customer, ' ',  a.property) title
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

                WHERE a.id != -1
                AND active = 1
                AND a.published = 1
                AND a.status IN ('Confirmed', 'Pending', 'Cancelled - Bill', 'Test') 
            ";

            if ($open == 'Open') {
                $qry .= " AND b.dateSubmitted IS NULL AND a.status IN ('Confirmed', 'Pending', 'Cancelled - Bill', 'Test')";
            } else if ($open == 'Completed') {
                $qry .= " AND b.dateSubmitted IS NOT NULL";
            }


            if ($readWorkOrderJobsByTech != 'All') {
                $qry .= " HAVING team LIKE CONCAT('%', :team, '%')";
            }

            $qry .= " ORDER BY DATEDIFF(a.request_date, now()) ASC, a.request_date DESC";

            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':team', $readWorkOrderJobsByTech, PDO::PARAM_STR);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    // END SCHEDULER

    
    // START WORK ORDER TEAM
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

    // END WORK ORDER TEAM

    
    //START GROUPED JOBS

    function addToExistingGroup($post){
        $this->db->beginTransaction();

        try {
            $mainQry = "
                UPDATE eyefidb.fs_scheduler 
                SET group_id = :group_id
                WHERE id = :fsId
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':group_id', $post['groupId'], PDO::PARAM_STR);
            $query->bindParam(':fsId', $post['fsId'], PDO::PARAM_STR);
            $query->execute();

            $this->db->commit();

        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    function createNewGroup($fsId){
        $this->db->beginTransaction();


        try {

            $mainQry = "
                INSERT INTO eyefidb.fs_mstr (created_by) VALUES (:created_by)
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':created_by', $this->sessionId, PDO::PARAM_INT);
            $query->execute();
            $last_id = $this->db->lastInsertId();
            
            $mainQry = "
                UPDATE eyefidb.fs_scheduler 
                SET group_id = :last_id
                WHERE id = :id
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':id', $fsId, PDO::PARAM_STR);
            $query->bindParam(':last_id', $last_id, PDO::PARAM_INT);

            $query->execute();

            $this->db->commit();
            return $last_id;
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    function createGroup($in, $groupId){

        $this->db->beginTransaction();

        $in = "'" . implode("','", $in) . "'";

        try {

            $last_id = $groupId;

            //if no group assigned then assign a group
            if(!$groupId){
                $mainQry = "
                    INSERT INTO eyefidb.fs_mstr (created_by) VALUES (:created_by)
                ";
                $query = $this->db->prepare($mainQry);
                $query->bindParam(':created_by', $this->sessionId, PDO::PARAM_INT);
                $query->execute();
                $last_id = $this->db->lastInsertId();
            }

            $mainQry = "
                UPDATE eyefidb.fs_scheduler 
                SET group_id = :group_id
                WHERE id IN ($in)
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':group_id', $last_id, PDO::PARAM_INT);
            $query->execute();

            $this->db->commit();

        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    function removeFromGroup($id){
        $mainQry = "
            UPDATE eyefidb.fs_scheduler 
            SET group_id = null
            WHERE id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
    }

    //END GROUPED JOBS

    public function availableTechs($dateFrom, $dateTo)
    {
        return $this->structureCalendarData($dateFrom, $dateTo);
    }


    //START FORMAT DATA STRUCTURE FOR CALENDAR
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

        return array(
            "results" => $newDetails,
            "companyHoliday" => $obj
        );
    }

    
    
    function getInvoice(){

        $mainQry = "
        select SUM(invoice) invoice, 
        MONTH(request_date) MONTH, YEAR(request_date) YEAR 
        from eyefidb.fs_scheduler_view GROUP BY  MONTH(request_date), YEAR(request_date)
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);


        $begin = new \DateTime('2020-08-01');
        $end = new \DateTime($this->previous);

        $interval = \DateInterval::createFromDateString('1 month');
        $period = new \DatePeriod($begin, $interval, $end);

        $test = [];
        $chart1 = [];

        foreach ($period as $dt) {
            $y = $dt->format("Y");
            $m = $dt->format("F");
            $my = $m  . ' ' . $y;
            $chart1['label'][] = $my;
            $test['value'][$my] = 0;
            foreach ($result as $row) {
                $id = $row['month'] . ' ' . $row['year'];
                if($id == $my){
                    $test['value'][$my] += $row['total_Invoice'];
                }
            }

            $chart1['value'][] = $test['value'][$my];
        }

		return array(
            "chart" =>  $chart1,
            "overview" =>  $overview
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

    //END FORMAT DATA STRUCTURE FOR CALENDAR

    public function viewById($byFsId)
    {

        $main = $this->byFsId($byFsId);
        
        if($byFsId !== 'false'){
            $main['mainAttachmentsInfo'] = $this->uploader->getAttachments($byFsId, 'Field Service Scheduler', 'fieldService');
        }

        return array(
            "results" => $main,
            "techs" => $this->getTechsAssignedToJob($byFsId),
            "states" => $this->getStates(),
            "settings" => $this->getFormValues(true),
            "platforms" => $this->ReadPlatforms(),
            "users" => $this->getUsers(),
            "authorizedUsers" => $this->authorizedUsers(),
            "getGroupedJobs" => ISSET($main['group_id']) ? $this->getGroupedJobs($main['group_id']) : []
        );
    }

    public function setEmptyValue($date, $setDefaultValue = null)
    {
        if (empty($date)) {
            return $setDefaultValue;
        }

        return $date;
    }

    // START TICKET INFO
    public function getTicketInfoById($ticketId)
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
                , c.start_time
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
                        THEN 'Yes' 
                    ELSE 'No' 
                END surveyCount
                , false errorCheck
                , c.id fs_scheduler_id
                , c.property
                , c.installers
                , c.service_type
                , c.customer
                , c.platform
                , c.billable
                , c.sign_theme
                , concat(c.id, '-', a.id) fullWorkOrderId
                , c.request_date
                , full_request_date
                , c.out_of_state
                , c.co_number
                , c.sales_order_number
                , a.repairComment
                , d.qir
                , a.partReceivedByName
                , a.partReceivedBySignature
                , a.partLocation
                , c.invoice_date
                , c.invoice_number
                , c.notes
                , c.compliance_license_notes
                , c.sign_type
                , c.group_id
            FROM eyefidb.fs_workOrder a
            
            LEFT JOIN (
                SELECT count(fs_workOrder_id) surveyCount
                    , fs_workOrder_id
                FROM eyefidb.customerSatisfactionsSurvey
                GROUP BY fs_workOrder_id
            ) b ON a.id = b.fs_workOrder_id
            
            LEFT JOIN (
                SELECT sales_order_number
                    , fs_scheduler.id
                    , property
                    , team installers
                    , service_type
                    , customer
                    , platform
                    , billable
                    , sign_theme
                    , request_date
                    , out_of_state
                    , co_number
                    , start_time
                    , invoice_date
                    , invoice_number
                    , notes
                    , compliance_license_notes
                    , sign_type
                    , concat(request_date,  ' ', start_time) full_request_date
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

    public function getTicketJobDetailsById($ticketId)
    {
        $qry = "
            SELECT a.id 
                , workOrderId 
                , proj_type 
                , a.description 
                , DATE_FORMAT(projectStart, '%a, %b %e, %Y') projectStartDate
                , DATE_FORMAT(projectStart, '%Y-%m-%d %H:%i') projectStart
                , DATE_FORMAT(projectFinish, '%Y-%m-%d %H:%i') projectFinish
                , DATE_FORMAT(brStart, '%Y-%m-%d %H:%i') brStart
                , DATE_FORMAT(brEnd, '%Y-%m-%d %H:%i') brEnd
                , IFNULL(TIMESTAMPDIFF(MINUTE, projectStart, projectFinish), 0) - IFNULL(TIMESTAMPDIFF(MINUTE, brStart, brEnd), 0) totalHours
                , a.createdDate 
                , a.userId 
                , a.active 
                , a.seq
                , false errorCheck
                , a.flight_hrs_delay
                , b.calculateTime
                , b.work_order_labor_type
                , b.icon
                , projectStartTz
                , projectFinishTz
                , property
                , service_type
            FROM eyefidb.fs_workOrderProject a
            LEFT JOIN eyefidb.fs_scheduler_settings b ON b.value = a.proj_type AND type IN ('Work Order Project Type')

            
            left join fs_workOrder wo ON wo.id = a.workOrderId
            left join (
                select a.id, a.property, service_type
                from fs_scheduler a

            ) f ON f.id = wo.fs_scheduler_id

            WHERE workOrderId = :workOrderId
                AND a.active = 1
            ORDER BY a.projectStart IS  NULL , projectStart ASC
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":workOrderId", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTicketJobDetailsByIdTest($ticketId)
    {
        $qry = "
        SELECT a.id 
        , a.event_name proj_type
                       , workOrderId 
                       , a.description 
                       , DATE_FORMAT(projectStart, '%a, %b %e, %Y') projectStartDate
                       , DATE_FORMAT(projectStart, '%Y-%m-%d %H:%i') projectStart
                       , DATE_FORMAT(projectFinish, '%Y-%m-%d %H:%i') projectFinish
                       , DATE_FORMAT(brStart, '%Y-%m-%d %H:%i') brStart
                       , DATE_FORMAT(brEnd, '%Y-%m-%d %H:%i') brEnd
                       , IFNULL(TIMESTAMPDIFF(MINUTE, projectStart, projectFinish), 0) - IFNULL(TIMESTAMPDIFF(MINUTE, brStart, brEnd), 0) totalHours
                       , a.createdDate 
                       , a.userId 
                       , a.active 
                       , '' seq
                       , false errorCheck
                       , a.flight_hrs_delay
                       , b.calculateTime
                       , b.work_order_labor_type
                       , b.icon
                       , projectStartTz
                       , projectFinishTz
                       , property
                       , service_type
                       , qtr_hrs
                   FROM eyefidb.fs_labor_view a
                   LEFT JOIN eyefidb.fs_scheduler_settings b ON b.value = a.event_name AND type IN ('Work Order Project Type')
       
                   
                   left join fs_workOrder wo ON wo.id = a.workOrderId
                   left join (
                       select a.id, a.property, service_type
                       from fs_scheduler a
       
       
                   ) f ON f.id = wo.fs_scheduler_id
       
                   WHERE workOrderId = :workOrderId
                       AND a.active = 1
                   ORDER BY a.projectStart IS  NULL , projectStart ASC
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
            SELECT *, concat("https://dashboard.eye-fi.com/attachments/fieldService/", fileName) link
            FROM eyefidb.fs_workOrderTrip
            WHERE workOrderId = :id
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTicketTripExpenseById($id)
    {
        $qry = '
            SELECT *, concat("https://dashboard.eye-fi.com/attachments/fieldService/", fileName) link
            FROM eyefidb.fs_workOrderTrip
            WHERE id = :id
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function laborChart($id)
    {
        $qry = '
            SELECT * FROM fs_labor_view WHERE workOrderId = :id order by projectStart ASC
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function generateTicketInfoById($ticketId)
    {
        $ticketInfo = array();
        $ticketInfo['workOrderProject'] = array();
        $ticketInfo['misc'] = array();
        $ticketInfo['tripExpenses'] = array();
        $ticketInfo['laborChart'] = array();

        $ticketInfo['workOrder'] = $this->getTicketInfoById($ticketId);

        if ($ticketInfo['workOrder']) {
            $ticketInfo['workOrderProject'] = $this->getTicketJobDetailsByIdTest($ticketId);
             $ticketInfo['laborChart'] = $this->getTicketJobDetailsByIdTest($ticketId);
            $ticketInfo['misc'] = $this->getTicketMiscById($ticketId);
            $ticketInfo['tripExpenses'] = $this->getTicketTripExpense($ticketId);    
        }

        return array(
            'details' => $ticketInfo,
            'settings' => $this->getFormValues(false),
            'attachments' => $this->getAttachments($ticketId),
            'authUsers' => $this->fieldServiceTicketAuthUsers(),
            'qirs' => $this->getQirs($ticketId)
        );
    }
    

    // END TICKET INFO

    //START QIR
    public function getQirs($ticketId)
    {

        $qry = '
            SELECT a.fieldServiceSchedulerId
            , a.id
            , a.qir
            , a.issueComment
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

    
    public function getQirById($ticketId)
    {

        $qry = '
            SELECT a.*
            FROM eyefidb.qa_capaRequest a

            LEFT JOIN (
                SELECT id
                FROM eyefidb.fs_scheduler
            ) c ON c.id = a.fieldServiceSchedulerId

            LEFT JOIN (
                SELECT id, fs_scheduler_id
                FROM eyefidb.fs_workOrder
            ) d ON d.fs_scheduler_id = c.id

            where a.id = :id
            AND a.active = 1
            ORDER BY a.id DESC
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function updateQir($post)
    {

        $qry = '
            UPDATE eyefidb.qa_capaRequest 
            SET issueComment = :issueComment,
            qtyAffected = :qtyAffected,
            qtyAffected1 = :qtyAffected1,
            eyefiSerialNumber = :eyefiSerialNumber
            where id = :id
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":issueComment", $post['issueComment'], PDO::PARAM_STR);
        $stmt->bindParam(":qtyAffected", $post['qtyAffected'], PDO::PARAM_STR);
        $stmt->bindParam(":qtyAffected1", $post['qtyAffected1'], PDO::PARAM_STR);
        $stmt->bindParam(":eyefiSerialNumber", $post['eyefiSerialNumber'], PDO::PARAM_STR);
        $stmt->bindParam(":id", $post['id'], PDO::PARAM_INT);
        $stmt->execute();
    }


    public function deleteQir($id){
        $qry = '
            DELETE FROM eyefidb.qa_capaRequest 
            where id = :id
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
    }
    
    //END QIR

    //START ATTACHMENTS
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
        $mainQry = "
			select *, concat('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) link, concat('/var/www/html/attachments/fieldService/', fileName) fileLocation
            from eyefidb.attachments a
			where id = :id
		";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    //END ATTACHMENTS

    //customer survey

    public function customerSatisfactionReport($dateFrom, $dateTo)
    {

        $shipTo = "
            CREATE OR REPLACE VIEW customerSatisfacation as select a.id, a.property, a.service_type,  (case when vendorLeadTechName IS NULL THEN b.customerName1 ELSE vendorLeadTechName End) customer1,  c.*
            from fs_scheduler a
            left join (
                select a.id, fs_scheduler_id, customerName1
                from fs_workOrder a
                

            ) b ON b.fs_scheduler_id = a.id
            
            
            left join (
                SELECT fs_workOrder_id, jobNumber, dateSubmitted, sum(e+g+ni)/7 rating, comments, vendorLeadTechName
                from(
                    select DISTINCT a.fs_workOrder_id, a.jobNumber
                        , a.dateSubmitted
                        , sum(case when a.rating = 'Excellent' THEN 5 ELSE 0 END) e 
                        , sum(case when a.rating = 'Good' THEN 3 ELSE 0 END) g 
                        , sum(case when a.rating = 'Needs Improvements' THEN 1 ELSE 0 END) ni 
                        , max(comments) comments
                        , max(vendorLeadTechName) vendorLeadTechName
                    FROM customerSatisfactionsSurvey a
                    left join (
                        select fs_scheduler_id, id
                        from fs_workOrder
                    ) b ON b.id = a.id
                    group by a.fs_workOrder_id, a.dateSubmitted, a.jobNumber
                    order by a.dateSubmitted DESC
                ) a
                group by fs_workOrder_id, jobNumber, dateSubmitted
                HAVING sum(e+g+ni)/7 > 0
                order by dateSubmitted DESC
            ) c ON c.fs_workOrder_id = b.id
            where a.active = 1
            order by a.request_date DESC
        ";

        $query = $this->db->prepare($shipTo);
        $query->execute();
    }

    public function getCustomers($dateFrom, $dateTo)
    {

        $shipTo = "
            select *, TRUNCATE(rating,1) avg_rating
            from eyefidb.customerSatisfacation
            where fs_workOrder_id != '' AND dateSubmitted between :dateFrom AND :dateTo
            order by rating ASC
        ";

        $query = $this->db->prepare($shipTo);
        $query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function customerSatisfacationOverall($dateFrom, $dateTo)
    {

        $shipTo = "
            select TRUNCATE(avg(rating),2) avg_rating
            from eyefidb.customerSatisfacation
            where dateSubmitted between :dateFrom AND :dateTo
        ";

        $query = $this->db->prepare($shipTo);
        $query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    
    public function getSurvey($ticketId)
    {

        $shipTo = "
            select *
            from eyefidb.customerSatisfactionsSurvey
            where fs_workOrder_id = :ticketId
        ";

        $query = $this->db->prepare($shipTo);
        $query->bindParam(":ticketId", $ticketId, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function readCustomerSatisfacationData($dateFrom, $dateTo)
    {

        $this->customerSatisfactionReport($dateFrom, $dateTo);
        return array(
            "details" => $this->getCustomers($dateFrom, $dateTo),
            "overall" => $this->customerSatisfacationOverall($dateFrom, $dateTo)
        );
    }

    // END customer survey


    // Start platform avg
    
    public function getAvg1($dateFrom, $dateTo)
    {
        $mainQry = "
        select *
        , (CONCAT(FLOOR((total_avg_hrs)/60),'h ', MOD((total_avg_hrs),60),'m')) total_avg_hrs
      from (
        select count(b.id) total_work_orders
          , group_concat(distinct b.id separator ',') workOrders
          , a.service_type 
          , month(a.request_date) month
          , year(a.request_date) year
          , sum(total_hrs) total_hrs
          , max(a.request_date) request_date
          , ROUND(sum(total_hrs)/count(b.id),0) total_avg_hrs
        from fs_scheduler a
        join (
            select id, fs_scheduler_id from fs_workOrder where userId <> 3 and dateSubmitted IS NOT NULL
        ) b ON b.fs_scheduler_id = a.id
        
        LEFT JOIN (
          select workOrderId
            , proj_type
            , sum(TIMESTAMPDIFF(MINUTE, projectStart,projectFinish)) total_hrs
          from fs_workOrderProject 
          where proj_type = 'Install' and userId <> 3
          group by proj_type, workOrderId 
        ) c ON c.workOrderId = b.id

        where a.service_type IN ('Install', 'Removal') and request_date between :dateFrom and :dateTo and created_by <> 3
        group by month(a.request_date)
          , year(a.request_date)
          , a.service_type
        order by year(a.request_date) DESC
          , month(a.request_date) DESC
      ) a
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    

    public function platformChart($dateFrom, $dateTo, $typeOfView = 'Monthly')
    {

        $results = $this->getAvg1($dateFrom, $dateTo);
        $month = strtotime($dateFrom);
        $end = strtotime($dateTo);

        $keyName = 'request_date';

        $test = array();
        $chart = array();

        $goal = 5;

        
        $customers = [];
        foreach ($results as $row) {
            $customers[] = $row['service_type'];
        }

        $colors = ['#85144b', '#001f3f', '#3D9970', '#39CCCC', '#FF851B', '#7FDBFF', '#6495ED', '#008B8B', '#FF8C00'];

        $uniqueCustomers = array_values(array_unique($customers, SORT_REGULAR));


        while ($month <= $end) {
            $w = date('W', $month);
            $y = date('Y', $month);
            $m = date('M', $month);
            $d = date('m/d/y', $month);


            $yearQuarterSet = date("n", $month);
            $yearQuarter = ceil($yearQuarterSet / 3);

            if ($typeOfView == 'Weekly') {
                $obj['label'][] = $w . '-' . $y;
                $labelCheck = $w . '-' . $y;
                $ee = "W";
                $key = $w;
                $goal1 = $goal * 5;
            } else if ($typeOfView == 'Monthly') {
                $obj['label'][] = $m . '-' . $y;
                $labelCheck = $m . '-' . $y;
                $ee = "M";
                $key = $m;
                $goal1 = $goal * 31;
            } else if ($typeOfView == 'Annually') {
                $obj['label'][] = $y;
                $labelCheck =  $y;
                $ee = "Y";
                $key = $y;
                $goal1 = $goal * 365;
            } else if ($typeOfView == 'Daily') {
                $obj['label'][] = $d;
                $labelCheck =  $d . '-' . $y;
                $ee = "m/d/y";
                $key = $d;
                $goal1 = $goal;
            } else if ($typeOfView == 'Quarterly') {
                $obj['label'][] = "Qtr:" . $yearQuarter . '-' . $y;
                $labelCheck =  $yearQuarter . '-' . $y;
                $ee = "m/d/y";
                $key = $yearQuarter . '-' . $y;
                $goal1 = $goal * 90;
            }


            $calculateGoal = 180;
            $calculateGoal1 = 120;
            $test[$key] = 0;

            foreach ($uniqueCustomers as $vendorSelectedrow) {

                $test['test111'][$vendorSelectedrow] = 0;
                $test['ticketCount'][$vendorSelectedrow] = 0;
                $test['isFound'][$vendorSelectedrow] = false;

                $test['test'][$vendorSelectedrow] = array();
                $test['count'][$vendorSelectedrow] = 0;
                foreach ($results as $row) {

                    if ($typeOfView == 'Quarterly') {
                        $yearQuarterSet1 = date("n", strtotime($row[$keyName]));
                        $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row[$keyName]));
                    } else if ($typeOfView == 'Annually') {
                        $formatedDate = date('Y', strtotime($row[$keyName]));
                    } else {
                        $formatedDate = date($ee, strtotime($row[$keyName])) . '-' . date('Y', strtotime($row[$keyName]));
                    }

                    if ($labelCheck == $formatedDate && $row['service_type'] == $vendorSelectedrow) {
                        $test[$key] += (int)$row['total_hrs'];
                    }

                    if ($labelCheck == $formatedDate && $row['service_type'] == $vendorSelectedrow) {
                        
                        $test['ticketCount'][$vendorSelectedrow] += (int)$row['total_work_orders'];
                        $test['test111'][$vendorSelectedrow] += (int)$row['total_hrs'];
                        $test['isFound'][$vendorSelectedrow] = true;
                    }
                }
            }

            $color_index = 0;
            foreach ($uniqueCustomers as $vendorSelectedrow) {
                $avg = $test['ticketCount'][$vendorSelectedrow] > 0 ? $test['test111'][$vendorSelectedrow]/$test['ticketCount'][$vendorSelectedrow] : 0;
                $chart1[$vendorSelectedrow]['dataset'][] = round($avg);
                $chart1[$vendorSelectedrow]['test'][] = $test['ticketCount'][$vendorSelectedrow];
                $chart1[$vendorSelectedrow]['label'] = $vendorSelectedrow;
                $chart1[$vendorSelectedrow]['backgroundColor'] = $colors[$color_index];
                $color_index++;
            }

            $chart1['goalLine']['dataset'][] = $calculateGoal;
            $chart1['goalLine']['label'] = "Install Goal";
            $chart1['goalLine']['backgroundColor'] = '#963c68';
            $chart1['goalLine']['type'] = 'line';

            $chart1['goalLine1']['dataset'][] = $calculateGoal1;
            $chart1['goalLine1']['label'] = "Removal Goal";
            $chart1['goalLine1']['backgroundColor'] = '#001f3f';
            $chart1['goalLine1']['type'] = 'line';



            if ($typeOfView == 'Weekly') {
                $month = strtotime("+1 week", $month);
            } else if ($typeOfView == 'Monthly') {
                $month = strtotime("+1 month", $month);
            } else if ($typeOfView == 'Annually') {
                $month = strtotime("+1 year", $month);
            } else if ($typeOfView == 'Daily') {
                $month = strtotime("+1 day", $month);
            } else if ($typeOfView == 'Quarterly') {
                $month = strtotime("+3 month", $month);
            }

        }

        return array(
            "results" => $results,
            "obj" => $obj,
            "chartnew" => $chart1
        );
    }

    public function getAvg($dateFrom, $dateTo)
    {
        $mainQry = "
        select *
            , total_hrs/total_work_orders total_avg_hrs
            , TRUNCATE(total_hrs_service/total_work_orders,0) avg_total_hrs_service
            , CONCAT(FLOOR((total_hrs_service/total_work_orders)/60),'h ',TRUNCATE(MOD((total_hrs_service/total_work_orders),60),0),'m') avg_total_hrs_service_convert

            , TRUNCATE(total_hrs_non_service/total_work_orders,0) avg_total_hrs_non_service
            , CONCAT(FLOOR((total_hrs_non_service/total_work_orders)/60),'h ',TRUNCATE(MOD((total_hrs_non_service/total_work_orders),60),0),'m') avg_total_hrs_non_service_convert

            , TRUNCATE(total_hrs_travel/total_work_orders,0) avg_total_hrs_travel
            , CONCAT(FLOOR((total_hrs_travel/total_work_orders)/60),'h ',TRUNCATE(MOD((total_hrs_travel/total_work_orders),60),0),'m') avg_total_travel_convert

        from (
            select count(distinct b.id) total_work_orders
            , group_concat(distinct b.id separator ',') workOrders
            , a.service_type
            , month(a.request_date) month
            , year(a.request_date) year
            , sum(total_hrs) total_hrs
            , sum(total_hrs_travel) total_hrs_travel
            , sum(total_hrs_service) total_hrs_service
            , sum(total_hrs_non_service) total_hrs_non_service
          	, platform
            from fs_scheduler a
            join (
                select id, fs_scheduler_id from fs_workOrder where userId <> 3 and dateSubmitted IS NOT NULL
            ) b ON b.fs_scheduler_id = a.id
            
            LEFT JOIN (
              select workOrderId
                  , proj_type
                  , (TIMESTAMPDIFF(MINUTE, projectStart,projectFinish)) total_hrs
                  , case when work_order_labor_type = '1' THEN (TIMESTAMPDIFF(MINUTE, projectStart,projectFinish)) else 0 end total_hrs_travel
                  , case when work_order_labor_type = '2' THEN (TIMESTAMPDIFF(MINUTE, projectStart,projectFinish)) else 0 end total_hrs_non_service
                  , case when work_order_labor_type = '3' THEN (TIMESTAMPDIFF(MINUTE, projectStart,projectFinish)) else 0 end total_hrs_service
              from fs_workOrderProject 
              left join (
                  select value, work_order_labor_type 
                  from fs_scheduler_settings 
                  where type = 'Work Order Project Type'
              ) a ON a.value = proj_type

              where userId <> 3
            ) c ON c.workOrderId = b.id
          

            where  request_date between :dateFrom and :dateTo and created_by <> 3 and a.service_type IN ('Install', 'Removal')
            group by a.platform, month(a.request_date), year(a.request_date), a.service_type
            order by year(a.request_date) DESC
            , month(a.request_date) DESC
        ) a
			";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function platformAvgByServiceTypes($dateFrom, $dateTo)
    {

        $shipTo = "
        select *
        , total_hrs/total_work_orders total_avg_hrs
        , TRUNCATE(total_hrs_service/total_work_orders,0) avg_total_hrs_service
        , CONCAT(FLOOR((total_hrs_service/total_work_orders)/60),'h ',TRUNCATE(MOD((total_hrs_service/total_work_orders),60),0),'m') avg_total_hrs_service_convert

        , TRUNCATE(total_hrs_non_service/total_work_orders,0) avg_total_hrs_non_service
        , CONCAT(FLOOR((total_hrs_non_service/total_work_orders)/60),'h ',TRUNCATE(MOD((total_hrs_non_service/total_work_orders),60),0),'m') avg_total_hrs_non_service_convert

        , TRUNCATE(total_hrs_travel/total_work_orders,0) avg_total_hrs_travel
        , CONCAT(FLOOR((total_hrs_travel/total_work_orders)/60),'h ',TRUNCATE(MOD((total_hrs_travel/total_work_orders),60),0),'m') avg_total_travel_convert

    from (
        select count(distinct b.id) total_work_orders
        , a.service_type
        , sum(total_hrs) total_hrs
        , sum(total_hrs_travel) total_hrs_travel
        , sum(total_hrs_service) total_hrs_service
        , sum(total_hrs_non_service) total_hrs_non_service
        from fs_scheduler a
        join (
            select id, fs_scheduler_id from fs_workOrder where userId <> 3 and dateSubmitted IS NOT NULL
        ) b ON b.fs_scheduler_id = a.id
        
        LEFT JOIN (
          select workOrderId
              , proj_type
              , (TIMESTAMPDIFF(MINUTE, projectStart,projectFinish)) total_hrs
              , case when work_order_labor_type = '1' THEN (TIMESTAMPDIFF(MINUTE, projectStart,projectFinish)) else 0 end total_hrs_travel
              , case when work_order_labor_type = '2' THEN (TIMESTAMPDIFF(MINUTE, projectStart,projectFinish)) else 0 end total_hrs_non_service
              , case when work_order_labor_type = '3' THEN (TIMESTAMPDIFF(MINUTE, projectStart,projectFinish)) else 0 end total_hrs_service
          from fs_workOrderProject 
          left join (
              select value, work_order_labor_type 
              from fs_scheduler_settings 
              where type = 'Work Order Project Type'
          ) a ON a.value = proj_type

          where userId <> 3
        ) c ON c.workOrderId = b.id
      

        where  request_date between :dateFrom AND :dateTo and created_by <> 3
        group by a.service_type
    ) a
        ";

        $query = $this->db->prepare($shipTo);
        $query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function readPlatformData($dateFrom, $dateTo)
    {
        return array(
            "chart" => $this->platformChart($dateFrom, $dateTo),
            "details" => $this->getAvg($dateFrom, $dateTo),
            "overall" => $this->platformAvgByServiceTypes($dateFrom, $dateTo)
        );
    }

    // END platform avg


    // start turnover
    public function getTurnoverRateDetails($dateFrom, $dateTo)
    {
        $qry = "
            SELECT *
            FROM fs_scheduler 
            where service_type = 'Service Call'
            and request_date between :dateFrom and :dateTo
            and turnover_fsid IS NOT NULL
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $stmt->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);

    }

    public function getTurnoverRateDetailsGrouped($dateFrom, $dateTo)
    {
        $qry = "
        select *, 100-(turn_over_count/total)*100 completion_rate
        from (SELECT 
          
             sum(case when turnover_fsid IS NOT NULL THEN 1 END) turn_over_count
            , count(*) total
            
            , month(request_date) month
            , year(request_date) year
        FROM fs_scheduler 
        where service_type = 'Service Call' 
        and request_date between :dateFrom and :dateTo
            group by month(request_date),
            year(request_date)
              having turn_over_count > 0 
         ) a
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $stmt->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);

    }

    public function getTurnoverRate($dateFrom, $dateTo, $typeOfView = "Monthly")
    {
        $qry = "
            select * 
            from (SELECT 'Completion Rate' turn_rate
                , request_date
                , sum(case when turnover_fsid IS NOT NULL THEN 1 END) turn_over_count
                , count(*) total
                
                , month(request_date) month
                , year(request_date) year
            FROM fs_scheduler 
            where service_type = 'Service Call'
            and request_date between :dateFrom and :dateTo
                group by  request_date, month(request_date) 
                , year(request_date) 
        ) a
        
        
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $stmt->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $month = strtotime($dateFrom);
    $end = strtotime($dateTo);

    $keyName = 'request_date';

    $test = array();
    $chart1 = array();

    $goal = 80;

    
    $customers = [];
    foreach ($results as $row) {
        $customers[] = $row['turn_rate'];
    }

    $colors = ['#85144b', '#001f3f', '#3D9970', '#39CCCC', '#FF851B', '#7FDBFF', '#6495ED', '#008B8B', '#FF8C00'];

    $uniqueCustomers = array_values(array_unique($customers, SORT_REGULAR));


    while ($month <= $end) {
        $w = date('W', $month);
        $y = date('Y', $month);
        $m = date('M', $month);
        $d = date('m/d/y', $month);


        $yearQuarterSet = date("n", $month);
        $yearQuarter = ceil($yearQuarterSet / 3);

        if ($typeOfView == 'Weekly') {
            $obj['label'][] = $w . '-' . $y;
            $labelCheck = $w . '-' . $y;
            $ee = "W";
            $key = $w;
            $goal1 = $goal * 5;
        } else if ($typeOfView == 'Monthly') {
            $obj['label'][] = $m . '-' . $y;
            $labelCheck = $m . '-' . $y;
            $ee = "M";
            $key = $m;
            $goal1 = $goal * 31;
        } else if ($typeOfView == 'Annually') {
            $obj['label'][] = $y;
            $labelCheck =  $y;
            $ee = "Y";
            $key = $y;
            $goal1 = $goal * 365;
        } else if ($typeOfView == 'Daily') {
            $obj['label'][] = $d;
            $labelCheck =  $d . '-' . $y;
            $ee = "m/d/y";
            $key = $d;
            $goal1 = $goal;
        } else if ($typeOfView == 'Quarterly') {
            $obj['label'][] = "Qtr:" . $yearQuarter . '-' . $y;
            $labelCheck =  $yearQuarter . '-' . $y;
            $ee = "m/d/y";
            $key = $yearQuarter . '-' . $y;
            $goal1 = $goal * 90;
        }


        $calculateGoal = 180;
        $calculateGoal1 = 120;
        $test[$key] = 0;

        foreach ($uniqueCustomers as $vendorSelectedrow) {

            $test['test111'][$vendorSelectedrow] = 0;
            $test['ticketCount'][$vendorSelectedrow] = 0;
            $test['t'][$vendorSelectedrow] = 0;
            $test['isFound'][$vendorSelectedrow] = false;

            $test['test'][$vendorSelectedrow] = array();
            $test['count'][$vendorSelectedrow] = 0;
            foreach ($results as $row) {

                if ($typeOfView == 'Quarterly') {
                    $yearQuarterSet1 = date("n", strtotime($row[$keyName]));
                    $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row[$keyName]));
                } else if ($typeOfView == 'Annually') {
                    $formatedDate = date('Y', strtotime($row[$keyName]));
                } else {
                    $formatedDate = date($ee, strtotime($row[$keyName])) . '-' . date('Y', strtotime($row[$keyName]));
                }

                if ($labelCheck == $formatedDate && $row['turn_rate'] == $vendorSelectedrow) {
                    $test[$key] += $row['total'];
                }

                if ($labelCheck == $formatedDate && $row['turn_rate'] == $vendorSelectedrow) {
                    
                    $test['ticketCount'][$vendorSelectedrow] += $row['turn_over_count'];
                    $test['t'][$vendorSelectedrow] += $row['total'];
                    $test['test111'][$vendorSelectedrow] += $row['total'];
                    $test['isFound'][$vendorSelectedrow] = true;
                }
            }
        }

        $color_index = 0;
        foreach ($uniqueCustomers as $vendorSelectedrow) {
            $c = $test[$key] > 0 ? abs(100-(($test['ticketCount'][$vendorSelectedrow] / $test[$key])*100)) : 0;
            $chart1[$vendorSelectedrow]['dataset'][] = round($c);
            $chart1[$vendorSelectedrow]['label'] = $vendorSelectedrow;
            $chart1[$vendorSelectedrow]['backgroundColor'][] = $c < $goal ? "#FF4136" : "#3D9970";
            $color_index++;
        }

        
        $chart1['goalLine']['dataset'][] = $goal;
        $chart1['goalLine']['label'] = "Goal";
        $chart1['goalLine']['backgroundColor'] = 'green';
        $chart1['goalLine']['type'] = 'line';


        if ($typeOfView == 'Weekly') {
            $month = strtotime("+1 week", $month);
        } else if ($typeOfView == 'Monthly') {
            $month = strtotime("+1 month", $month);
        } else if ($typeOfView == 'Annually') {
            $month = strtotime("+1 year", $month);
        } else if ($typeOfView == 'Daily') {
            $month = strtotime("+1 day", $month);
        } else if ($typeOfView == 'Quarterly') {
            $month = strtotime("+3 month", $month);
        }

    }
    
    return array(
    "results" => $results,
    "details" => $this->getTurnoverRateDetails($dateFrom, $dateTo),
    "goal" =>  $goal,
    "getTurnoverRateDetailsGrouped" => $this->getTurnoverRateDetailsGrouped($dateFrom, $dateTo),
        "obj" => $obj,
        "chartnew" => $chart1
    );
}

    // end turnover


    //START TECH SCHEDULER
    public function ReadByWeek($dateFrom, $dateTo)
    {

        $dateFrom = $dateFrom;
        $dateTo = $dateTo;
        $begin = new \DateTime($dateFrom);
        $end = new \DateTime($dateTo);


        $interval = \DateInterval::createFromDateString('1 day');
        $period = new \DatePeriod($begin, $interval, $end);

        $mainQry = "
            SELECT id, title, type, date(start) start, backgroundColor, techRelated, until, techRelated, textColor
            FROM eyefidb.companyHoliday a
            where date(start) between :dateFrom and :dateTo 
            OR date(until) between :dateFrom1 and :dateTo1
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
        $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
        $query->bindParam(':dateFrom1', $dateFrom, PDO::PARAM_STR);
        $query->bindParam(':dateTo1', $dateTo, PDO::PARAM_STR);
        $query->execute();
        $events = $query->fetchAll(PDO::FETCH_ASSOC);

        $mainQry = "
				SELECT concat(a.first, ' ', a.last) fullname, title
				FROM db.users a
				WHERE area = 'Field Service'
					AND active = 1 
					AND type = 0
                    and title IN ('Lead Installer', 'Installer')
				ORDER BY concat(a.first, ' ', a.last) ASC
			";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $res = $query->fetchAll(PDO::FETCH_ASSOC);

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
					, a.request_date
					, team installers
					, concat(a.id, '-', b.id) fullWorkOrderId
					
                    , concat(a.request_date, ' ', a.start_time) full_request_date
					
					, b.hits
					, b.dateSubmitted
					, b.id workOrderTicketId
					, b.createdDate createdDateWorkOrder
					, b.created_by createdByWorkOrder
					, a.out_of_state
					, case 
						when out_of_state = true
							THEN 'green'
						when out_of_state = false
							THEN 'orange'
						END weeklyClass
					, invoice_notes
					, a.billable
					, c.timeToComplete
                    , co_number
                    , customer_cancelled
                    , cancellation_comments
                    , cancelled_type
                    , a.group_id
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
						, timeToComplete
					from eyefidb.fs_scheduler_platforms
				) c ON a.platform = c.name
				
                LEFT JOIN (
                    select fs_det_id, group_concat(user SEPARATOR ', ') team
                    from eyefidb.fs_team
                    group by fs_det_id
                ) e ON e.fs_det_id = a.id
                

				where a.request_date between :dateFrom and :dateTo
                AND a.active = 1
                AND a.published = 1
				order by a.request_date, concat(DATE_FORMAT(a.request_date, '%m/%d/%Y'), ' ', a.start_time) asc, id 
			";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
        $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
        $query->execute();
        $r = $query->fetchAll(PDO::FETCH_ASSOC);


        $dateFrom = $dateFrom;
        $dateTo = $dateTo;
        $begin = new \DateTime($dateFrom);
        $end = new \DateTime($dateTo);
        $end->modify('+1 day');


        $interval = new \DateInterval('P1D');
        $period = new \DatePeriod($begin, $interval, $end);

        $dateRange = [];

        foreach ($period as $dt) {
            $dateRange[] = $dt->format("D m/d/y");
        }

        $obj = [];

        //create array for users
        // $obj[] = array(
        //     "tech" => 'Unassigned',
        //     "dates" => array()
        // );

        foreach ($res as $row) {
            $obj[] = array(
                "tech" => $row['fullname'],
                "title" => $row['title'],
                "dates" => array()
            );
        }


        foreach ($this->vendors as $row) {
            $obj[] = array(
                "tech" => $row,
                "title" => 'Vendor',
                "dates" => array()
            );
        }

        //create array for dates
        $l = array();
        foreach ($obj as $row) {
            foreach ($period as $dt) {

                $d = array(
                    "date" => $dt->format("Y-m-d"),
                    "events" => []
                );
                $row['dates'][] = $d;
            }
            $l[] = $row;
        }

        //create array for dates
        $ll = array();
        foreach ($l as $row) {
            $ll[] = $row;
        }

        $o = array(
            "details" => $r,
            "schedule" => $ll,
            "dateRange" => $dateRange,
            "events" => $events
        );

        return $o;
    }
    //END TECH SCHEDULER


    public function getFullEvents($readWorkOrderJobsByTech, $ticketStatus)
    {
        $qry = "
            create or replace view fs_full_events AS
            select id id 
            , DATE_FORMAT(start, '%Y-%m-%d') full_request_date
            , DATE_FORMAT(start, '%Y-%m-%d') request_date
            , concat(type) property
            , 'Event' typeOf
            , '' service_type 
            , '' out_of_state
            , '' fs_scheduler_id
            , 'Event' status
            , 1 active
            , type title
            , title team
            , null dateSubmitted
            , '' workOrderTicketId
            , '' group_id
            , timestampdiff(DAY, curDate(), DATE_FORMAT(start, '%Y-%m-%d')) timediff
        from eyefidb.companyHoliday
        where DATE_FORMAT(start, '%Y-%m-%d') >= curDate()
        
            UNION ALL
        
            SELECT a.id 
                , concat(a.request_date,  ' ', a.start_time) full_request_date
                , concat(a.request_date,  ' ', a.start_time) request_date
                , a.property 
                , 'Job' typeOf
                , a.service_type 
                , out_of_state
                , b.id fs_scheduler_id 
                , a.status 
                , a.active
                , CONCAT(a.customer, ' ',  a.property) title
                , team
                , dateSubmitted
                , b.id workOrderTicketId
                , a.group_id
                , timestampdiff(DAY, curDate(), concat(a.request_date,  ' ', a.start_time)) timediff
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

                
                WHERE active = 1
                    AND a.published = 1

        ";
        $stmt = $this->db->prepare($qry);
        $stmt->execute();

        $qry = "
        SELECT *, timestampdiff(DAY, curDate(), full_request_date) timediff
        from fs_full_events

        WHERE active = 1
            HAVING team LIKE CONCAT('%', :team, '%')
            ORDER BY full_request_date DESC
        ";

        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':team', $readWorkOrderJobsByTech, PDO::PARAM_STR);
        $stmt->execute();
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);



        return $events;
    }


    /**
     * TESTING FOR MOBILE
     */

    public function getTicketJobDetailsByUnqiueId($ticketId)
    {
        $qry = "
            SELECT a.id
                , workOrderId
                , proj_type 
                , a.description 
                , projectStart projectStart
                , projectFinish projectFinish
                , brStart
                , brEnd
                , TIMESTAMPDIFF(MINUTE,projectStart,projectFinish) break_total
                , a.createdDate 
                , a.userId 
                , a.active 
                , a.seq
                , false errorCheck
                , b.calculateTime
                , b.work_order_labor_type
                , b.icon
                , a.flight_hrs_delay
                , projectStartTz
                , projectFinishTz
            FROM eyefidb.fs_workOrderProject a
            LEFT JOIN eyefidb.fs_scheduler_settings b ON b.value = a.proj_type AND type IN ('Work Order Project Type')
            WHERE a.id = :id
                AND a.active = 1
            ORDER BY a.projectStart ASC
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $ticketId, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetch(PDO::FETCH_ASSOC);

        return array(
            "results" => $results,
            "settings" => $this->getFormValues('WorkOrderProjectType')
        );
    }

    public function getData($dateFrom, $dateTo, $id, $key = null)
    {
        try {
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
            
            , a.start_time 
            , a.notes 
            , a.created_date 
            , a.created_by 
            , a.vendor_inv_number 
            , a.vendor_cost 
            , a.invoice_date 
            , a.invoice_number 
            , a.acc_status 
            , case when a.platform = '' THEN null ELSE a.platform END platform
            , a.billable 
            , a.request_date
            , IFNULL(team, 'No techs assigned') installers
            
            , concat(a.id, '-', b.id) fullWorkOrderId
            , a.invoice_notes
            , concat(a.request_date, ' ', a.start_time) as full_request_date
            , concat(a.request_date, ' ', a.start_time) + INTERVAL case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END MINUTE endTime
            
            , b.hits
            , b.dateSubmitted
            , b.id workOrderTicketId
            , b.createdDate createdDateWorkOrder
            , b.created_by createdByWorkOrder

            , case when c.timeToComplete IS NULL THEN 120 ELSE c.timeToComplete END timeToComplete
            , co_number
            , customer_cancelled
            , cancellation_comments
            , cancelled_type
            , a.out_of_state

            , concat(u.first, ' ', u.last) createdByName
            , a.address1 address
            , a.mark_up_percent
            , a.ef_hourly_rate
            , a.ef_overtime_hourly_rate

            , a.paper_work_location
            , a.billable_flat_rate_or_po
            , a.contractor_inv_sent_to_ap
            , a.period
            , a.property_phone property_phone
            , a.zip_code
            , a.compliance_license_notes
            , turnover_fsid
            , a.group_id
            , a.published
            
            , CASE WHEN a.published = 0 THEN '#fff' ELSE f.statusColor END backgroundColor 
            , CASE WHEN f.statusColor IS NULL THEN  f.statusColor ELSE f.statusColor END borderColor
            , CASE WHEN f.color IS NULL OR a.published = 0 THEN '#000' ELSE f.color  END color

            , CONCAT_WS(',', 
            NULLIF(trim(property), ''),
            NULLIF(trim(address1), ''),
            NULLIF(trim(city), ''), 
            NULLIF(trim(state), ''), 
            NULLIF(trim(zip_code), ''),  
            NULLIF(trim(property_phone), '')) full_address


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
            select fs_det_id, group_concat(user SEPARATOR ', ') team
            from eyefidb.fs_team
            group by fs_det_id
        ) e ON e.fs_det_id = a.id

        LEFT JOIN db.users u ON u.id = a.created_by

        
        LEFT JOIN eyefidb.fs_scheduler_settings f ON f.value = a.status AND f.type = 'status'

    
        WHERE a.active = 1
                
            ";

            if (isset($key)) {
                $mainQry .= " AND a.group_id = '$id' ";
            } else if ($id) {
                $mainQry .= " AND a.id = '$id' ";
            } else {
                $mainQry .= " AND a.request_date between '$dateFrom' and '$dateTo' ";
            }

            $mainQry .= "  order by a.request_date DESC ";

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
    
    public function get_group_jobs($groupId){
        return $this->getData(null, null, $groupId, true);
    }

    public function get_work_order_group_details($group_id){
        $mainQry = "
        select a.id
            , a.workOrderId
            , a.proj_type
            , b.work_order_labor_calculate
            , a.projectStart
            , a.projectFinish
            , a.projectStartTz
            , a.projectFinishTz
            , a.description
            , b.work_order_labor_type 
            , brStart
            , brEnd
            
            , DATE_FORMAT(a.projectStart, '%a, %b %e, %Y') projectStartDate
            , property
        from fs_workOrderProject a
            left join fs_scheduler_settings b ON b.value = a.proj_type AND type = 'Work Order Project Type'
            left join fs_workOrder wo ON wo.id = a.workOrderId
            join (
                select a.id, a.property
                from fs_scheduler a

                where a.group_id = :group_id
            ) f ON f.id = wo.fs_scheduler_id
            order by a.projectStart ASC
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':group_id', $group_id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC); 
    }

    public function generateTicketInfoById1($ticketId)
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

            $ticketInfo['laborDetails'] = $group_id ? $this->get_work_order_group_details($group_id) : $this->getTicketJobDetailsById($ticketId);
            $ticketInfo['tripExpense'] = $this->getTicketTripExpense($ticketId);
            $ticketInfo['misc'] = $this->getTicketMiscById($ticketId);
            $ticketInfo['attachments'] = $this->getAttachments($ticketId, $group_id);
            $ticketInfo['assets'] = $this->getAssets($ticketId);
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

    //START ASSETS
    function createAsset($post)
    {
        $qry = '
            INSERT INTO eyefidb.fs_assets (
                workOrderId
                , type
                , asset
            ) 
            VALUES( 
                :workOrderId
                , :type
                , :asset
            )
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':workOrderId', $post['workOrderId'], PDO::PARAM_STR);
        $stmt->bindParam(':type', $post['type'], PDO::PARAM_STR);
        $stmt->bindParam(':asset', $post['asset'], PDO::PARAM_STR);
        $stmt->execute();
    }

    function updateAsset($post)
    {
        $qry = '
            UPDATE eyefidb.fs_assets 
            set type = :type,
                asset = :asset
            where id = :id
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':type', $post['type'], PDO::PARAM_STR);
        $stmt->bindParam(':asset', $post['asset'], PDO::PARAM_STR);
        $stmt->bindParam(':id', $post['id'], PDO::PARAM_INT);
        $stmt->execute();
    }

    function removeAsset($id){
        $qry = '
            DELETE FROM eyefidb.fs_assets 
            where id = :id
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
    }

    

    function getAssets($ticketId){
        $mainQry = "
            SELECT * 
            FROM eyefidb.fs_assets 
            where workOrderId = :ticketId
            order by id desc
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':ticketId', $ticketId, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }


    function getAssetById($id){
        $mainQry = "
            SELECT * 
            FROM eyefidb.fs_assets 
            where id = :id
            order by id desc
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }
    //END ASSETS

    function getQirByFsId($id){
        $mainQry = "
            SELECT *
            FROM eyefidb.qa_capaRequest a
            LEFT JOIN db.users b on a.createdBy = b.id
            WHERE a.active = 1
                AND a.fieldServiceSchedulerId = :id
            ORDER BY a.createdDate ASC
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }


    public function __destruct()
    {
        $this->db = null;
    }
}
