<?php

namespace EyefiDb\Api\FieldService\Ticket;

use PDO;

class Ticket
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAssignments(){
        
        $mainQry = "
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
                , timestampdiff(MINUTE, DATE_FORMAT(curDate(), '%Y-%m-%d %H:%m'), DATE_FORMAT(start, '%Y-%m-%d %H:%m')) timediff
                ,'' platform
                , start
                , start date
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
                , timestampdiff(MINUTE, DATE_FORMAT(curDate(), '%Y-%m-%d %H:%m'), concat(a.request_date,  ' ', a.start_time)) timediff
                , platform
                , a.start_time start
                , DATE_FORMAT(a.request_date, '%Y-%m-%d') date
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
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);
        return $result;
    }
}
