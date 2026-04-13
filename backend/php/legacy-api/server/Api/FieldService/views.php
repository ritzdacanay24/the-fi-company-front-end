<?php

namespace EyefiDb\Api\FieldService;

use PDO;
use PDOException;

//soruce of truth

class FsmViwes
{

	protected $db;

	public function __construct($db)
	{

		$this->db = $db;
     
	}

  public function fs_billing_labor_views(){

    $qry = "
    create or replace view fs_billing_summary_monthly_view AS
  SELECT MONTHNAME(request_date) month
    , MONTH(request_date)
    , YEAR(request_date) year 
    , SUM(labor_bill_amount) total_labor_bill_amount
    , SUM(expense_bill_amount) total_expense_bill_amount
    , SUM(total_to_bill) total_to_bill
    , SUM(invoice_amount) total_invoice_amount
  FROM fs_billing_summary_detail_view
  GROUP BY MONTHNAME(request_date), MONTH(request_date), YEAR(request_date);

    create or replace view fs_billing_summary_detail_view AS
    SELECT c.request_date, a.id, labor.billing_total labor_bill_amount, expense.billing expense_bill_amount, labor.billing_total+expense.billing total_to_bill, c.invoice invoice_amount
    FROM fs_workOrder a 
    LEFT JOIN (
      SELECT workOrderId, sum(billing_total) billing_total
      FROM fs_billing_labor_view
      group by workOrderId
    ) labor ON labor.workOrderId = a.id
    
    LEFT JOIN (
      SELECT workOrderId, sum(billing) billing
      FROM fs_billing_expense_view
      group by workOrderId
    ) expense ON expense.workOrderId = a.id
    
    INNER JOIN eyefidb.fs_scheduler c ON c.id = a.fs_scheduler_id;


    create or replace view fs_billing_labor_overtime_monthly_view AS
    SELECT SUM(cost_total) cost_total
      , SUM(billing_total) billing_total
      , AVG(cost_rate) avg_cost_rate
      , MONTHNAME(request_date) month
      , month(request_date) month_number
      , SUM(total_hrs) total_hrs
      , year(request_date) year
      , COUNT(1) jobs
      , truncate(avg(billing_total),2) avg_job_billing
      , truncate(avg(cost_total),2) avg_job_cost
      , DAY(LAST_DAY(request_date)) days
      , truncate(sum(cost_total/DAY(LAST_DAY(request_date))),2) avg_monthly_cost
      , truncate(sum(billing_total/DAY(LAST_DAY(request_date))),2) avg_monthly_billing
    FROM fs_billing_labor_view a
    INNER JOIN eyefidb.fs_workOrder b ON b.id = a.workOrderId
    INNER JOIN eyefidb.fs_scheduler c ON c.id = b.fs_scheduler_id
    WHERE typeOf = 'Overtime'
    group by MONTHNAME(request_date), year(request_date), month(request_date), DAY(LAST_DAY(request_date))
    order by  year(request_date) desc, month(request_date) ASC;


    create or replace view fs_billing_labor_regular_monthly_view AS
    SELECT SUM(total_hrs) total_hrs
      , avg(total_hrs) avg_hrs
      , SUM(billing_total) billing_total
      , SUM(cost_total) cost_total
      , AVG(cost_rate) avg_cost_rate
      , MONTHNAME(request_date) month
      , month(request_date) month_number
       , year(request_date) year
       , COUNT(1) jobs
      , truncate(avg(billing_total),2) avg_job_billing
      , truncate(avg(cost_total),2) avg_job_cost
       , DAY(LAST_DAY(request_date)) days
       , truncate(sum(cost_total/DAY(LAST_DAY(request_date))),2) avg_monthly_cost
       , truncate(sum(billing_total/DAY(LAST_DAY(request_date))),2) avg_monthly_billing
    FROM fs_billing_labor_view a
    INNER JOIN eyefidb.fs_workOrder b ON b.id = a.workOrderId
    INNER JOIN eyefidb.fs_scheduler c ON c.id = b.fs_scheduler_id
    group by MONTHNAME(request_date), year(request_date), month(request_date), DAY(LAST_DAY(request_date))
    order by  year(request_date) desc, month(request_date) ASC;
    

    create or replace view fs_billing_labor_overall_monthly_view AS
    SELECT SUM(travel+INSTALL) regular, SUM(travel_overtime+INSTALL) overtime
      , MONTHNAME(request_date) month
      , month(request_date) month_number
       , year(request_date) year
FROM fs_billing_view a
    INNER JOIN eyefidb.fs_workOrder b ON b.id = a.workOrderId
    INNER JOIN eyefidb.fs_scheduler c ON c.id = b.fs_scheduler_id
GROUP BY MONTHNAME(request_date) 
      , month(request_date) 
       , year(request_date);
    

    ";
    $stmt = $this->db->prepare($qry);
    $stmt->execute();

}

public function fs_billing_expense_views(){

    $qry = "
        
    create or replace view fs_billing_expense_monthly_view AS
    select MONTHNAME(request_date) month
                , count(1) jobs
                , month(request_date) month_number
                , year(request_date) year
                , truncate(sum(total_cost),2) total_cost
                , truncate(sum(billing),2) total_billing
                , truncate(avg(billing),2) avg_job_billing
                , truncate(avg(total_cost),2) avg_job_cost
                , DAY(LAST_DAY(request_date)) days
                , truncate(sum(total_cost/DAY(LAST_DAY(request_date))),2) avg_monthly_cost
                , truncate(sum(billing/DAY(LAST_DAY(request_date))),2) avg_monthly_billing
            from fs_billing_expense_view 
            group by MONTHNAME(request_date), year(request_date), month(request_date), DAY(LAST_DAY(request_date))
            order by  year(request_date) desc, month(request_date) ASC;
    
                create or replace view fs_billing_expense_daily_view AS
            select request_date year
                , count(1) jobs
                , truncate(sum(total_cost),2) total_cost
                , truncate(sum(billing),2) total_billing
                , truncate(avg(billing),2) avg_billing
                , truncate(avg(total_cost),2) avg_cost
            from fs_billing_expense_view 
            group by request_date;
    
                create or replace view fs_billing_expense_yearly_view AS
            select year(request_date) year
                , count(1) jobs
                , truncate(sum(total_cost),2) total_cost
                , truncate(sum(billing),2) total_billing
                , truncate(avg(billing),2) avg_billing
                , truncate(avg(total_cost),2) avg_cost
                , DAYOFYEAR(LAST_DAY(DATE_ADD(request_date, INTERVAL 12-MONTH(request_date) MONTH))) days
                , truncate(sum(total_cost/DAYOFYEAR(LAST_DAY(DATE_ADD(request_date, INTERVAL 12-MONTH(request_date) MONTH)))),2) avg_yearly_cost
                , truncate(sum(billing/DAYOFYEAR(LAST_DAY(DATE_ADD(request_date, INTERVAL 12-MONTH(request_date) MONTH)))),2) avg_yearly_billing
            from fs_billing_expense_view 
            group by year(request_date), DAYOFYEAR(LAST_DAY(DATE_ADD(request_date, INTERVAL 12-MONTH(request_date) MONTH)))
            order by  year(request_date) DESC;
    
                create or replace view fs_billing_expense_summary_view AS
            select count(1) jobs
                , truncate(sum(total_cost),2) total_cost
                , truncate(sum(billing),2) total_billing
                , truncate(avg(billing),2) avg_billing
                , truncate(avg(total_cost),2) avg_cost
            from fs_billing_expense_view 

    ";
    $stmt = $this->db->prepare($qry);
    $stmt->execute();

}
    

    public function fs_billing_expense_view(){

        $qry = "
        create or replace view fs_billing_expense_view AS
        SELECT a.name
            , a.workOrderId
            , a.total_cost
            , a.mark_up
            , a.mark_up_percent
            , a.mark_up + a.total_cost billing
            , request_date
            FROM (
                SELECT a.name
                    , a.workOrderId
                    , SUM(a.cost) total_cost
                    , SUM(((a.cost * c.mark_up_percent) / 100)) mark_up
                    , c.mark_up_percent
                    , c.request_date
                FROM ((eyefidb.fs_workOrderTrip a
                LEFT JOIN eyefidb.fs_workOrder b ON((b.id = a.workOrderId)))
                LEFT JOIN eyefidb.fs_scheduler c ON((c.id = b.fs_scheduler_id)))
                GROUP BY a.name,a.workOrderId,c.mark_up_percent, c.request_date
            ) a
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->execute();

    }
    

    public function fs_billing_labor_view(){

        $qry = "
        create or replace view fs_billing_labor_view AS
        select workOrderId
        , typeOf
        , sum(total) total_hrs
        , sum( case when typeOf = 'Regular' AND total <= 8 THEN 0 else break END ) break_hrs
        , cost_rate
        , sum(total)*cost_rate cost_total
        , billing_rate
        , sum(total)*billing_rate billing_total
    from (
      SELECT a.workOrderId
        , 'Regular' typeOf
        , a.total - a.total_overtime total
        , team.combined_rates cost_rate
        , (a.total - a.total_overtime) * team.combined_rates cost_total
        , c.ef_hourly_rate billing_rate
        , (a.total - a.total_overtime) * c.ef_hourly_rate billing_total
        , team.total_techs
        , break
      FROM fs_billing_view a
      left join fs_workOrder b ON b.id = a.workOrderId
      left join fs_scheduler c ON c.id = b.fs_scheduler_id
      left join (
          select fs_det_id, sum(user_rate) combined_rates, count(id) total_techs from fs_team group by fs_det_id
      ) team ON team.fs_det_id = c.id
      UNION ALL 
      SELECT a.workOrderId
        , 'Overtime' typeOf
        , a.total_overtime total
        , team.combined_rates*1.50 cost_rate
        , a.total_overtime * team.combined_rates cost_total
        , c.ef_overtime_hourly_rate billing_rate
        , a.total_overtime * c.ef_overtime_hourly_rate billing_total
        , team.total_techs
        ,  break
      FROM fs_billing_view a
      left join fs_workOrder b ON b.id = a.workOrderId
      left join fs_scheduler c ON c.id = b.fs_scheduler_id
      left join (
          select fs_det_id, sum(user_rate) combined_rates, count(id) total_techs from fs_team group by fs_det_id
      ) team ON team.fs_det_id = c.id
    ) a 
    group by workOrderId
      , typeOf
      , cost_rate
      , billing_rate
      , total_techs
    order by typeOf DESC
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->execute();

    }
    

    public function full_events(){

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
            , property.property 
            , 'Job' typeOf
            , a.service_type 
            , out_of_state
            , b.id fs_scheduler_id 
            , a.status 
            , a.active
            , CONCAT(a.customer, ' ',  property.property) title
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

            
            left join (
              select id, property, city, state, CONCAT_WS(',', 
                  NULLIF(trim(property), ''),
                  NULLIF(trim(address1), ''),
                  NULLIF(trim(city), ''), 
                  NULLIF(trim(state), ''), 
                  NULLIF(trim(zip_code), ''),  
                  NULLIF(trim(property_phone), '')) full_address
              from eyefidb.fs_property_det
          ) property ON property.id = a.property_id

            WHERE active = 1
                AND a.published = 1
        
        ";
        
        $stmt = $this->db->prepare($qry);
        $stmt->execute();

    }
    

        //billing event details by date and work order
        //This is working 8-20-2022
         public function fs_billing_view(){
            $qry = "
            
            
           
            create or replace view fs_billing_view AS
            SELECT workOrderId
            , isWeekEnd
            , start
            , travel_total travel
            , travel_overtime
            , install
            , install_overtime
            , case when isWeekEnd = 1 THEN total when total > 8 THEN total - 8 ELSE travel_overtime + install_overtime END total_overtime
            , total
            , break
        FROM ( 
          SELECT *
             , travel travel_total
              , travel + travel_overtime + install + install_overtime total
             FROM 
             ( 
               SELECT 
               workOrderId
                   , start
                   , max(isWeekEnd) isWeekEnd
                   , SUM(totalHrs) totalHrs
                   # travel regular
                   , sum(
                 case 
                   when isTravel = 1 THEN
                   CASE 
                     when isWeekEnd = 0 THEN 
                       CASE
                         when totalHrs > 8 THEN 8
                         when totalHrs <= 8 THEN totalHrs 
                         ELSE 0 
                       END
                     when isWeekEnd = 1 THEN 0
                     ELSE 0 
                   END
                   ELSE 0 
                 END 
               ) travel
               
                   , sum(
                 case 
                   when isTravel = 1
                   THEN 
                     CASE 
                       when isWeekEnd = 0 THEN 
                       CASE
                         when totalHrs > 8 THEN totalHrs - 8 
                         ELSE 0 
                       END
                     when isWeekEnd = 1 THEN totalHrs
                     ELSE 0 
                   END
                   ELSE 0 
                 END 
               ) travel_overtime
               
                   , sum(
                 case 
                   WHEN isTravel = 0 
                     THEN 
                       CASE
                         when isWeekEnd = 0 THEN actualHrs
                         when isWeekEnd = 1 THEN 0
                         ELSE 0 
                       END
                     ELSE 0 
                 END 
               ) install
               
                  , sum(
                 case 
                   WHEN isTravel = 0 
                     THEN 
                       CASE  
                         when isWeekEnd = 0 THEN 
                           CASE
                             when totalHrs > 8 THEN totalHrs - 8
                             ELSE 0 
                           END
                         when isWeekEnd = 1 THEN totalHrs
                         ELSE 0 
                       END
                     ELSE 0 
                 END 
               ) install_overtime
                   , IFNUll(sum(brkhrs),0) break
                 from (
                   select *
                     , (case when totalHrs > 8 then totalHrs-8 ELSE 0 END) overtime
                     , (case when totalHrs <= 8 then totalHrs ELSE (totalHrs-case when totalHrs > 8 then totalHrs-8 ELSE 0 END) END) actualHrs
                   from (
                     select workOrderId
                         , start 
                         , end
                         , isTravel
                         , max(isWeekEnd) isWeekEnd
                         , truncate((sum(total_break)+sum(total_break_project))/60,2) brkhrs 
                         , truncate(sum(totalHours)/60,2) totalHrs
                     from (
                       SELECT workOrderId
                         , isWeekEnd
                         , case 
								 		when DATEDIFF(DATE_FORMAT(date(projectStart), '%Y-%m-%d'), DATE_FORMAT(date(projectFinish), '%Y-%m-%d'))  < 0 
								 			THEN CONCAT(DATE_FORMAT(date(projectStart), '%m/%d/%Y'), ' to ', DATE_FORMAT(date(projectFinish), '%m/%d/%Y'))
								 		ELSE DATE_FORMAT(date(projectStart), '%m/%d/%Y')
								 	END start
                         , DATE_FORMAT(date(projectFinish), '%m/%d/%Y') end
                         , mins totalHours
                         , break_mins total_break 
                         , event_break_mins total_break_project
                         , event_name proj_type
                         , isTravel
                         , isEvent
                       FROM eyefidb.fs_labor_view
                       WHERE isEvent = 1
                       order by projectStart ASC
                     ) a
                   group by workOrderId
                     , start
                     , END
                     , isEvent
                     , isTravel
                   ) a
                 ) a
                 where start IS NOT NULL 
                 
                 group by workOrderId
                   , start
                 ) a
                 order by start ASC
                 ) a
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->execute();
    
        }

        public function runTasksToIncludeId(){

            $qry = '
                UPDATE fs_workOrderProject a
                INNER JOIN eyefidb.fs_scheduler_settings b ON b.value = a.proj_type AND type IN ("Work Order Project Type")
                SET a.event_id = b.id;
            ';
            $stmt = $this->db->prepare($qry);
            $stmt->execute();
    
        }
        
    ////////////////////////////////////////////////

    public function getPlatformAverage(){

        $qry = '
            Create or replace View fs_platform_avg_view As 
            SELECT platform, service_type, SUM(service_mins) total_mins, truncate(AVG(service_mins),2) avg_mins, COUNT(platform) jobs
            FROM fs_work_order_summary_view
            WHERE platform <> ""
            GROUP BY platform, service_type
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->execute();

    }

    // labor extension time conversion
    // This is the query to be used. 8-20-2022
    public function fs_labor_view(){
        $qry = '
        
        Create or replace View fs_labor_view As
            SELECT id
            , workOrderId
            , event_name
            , description
            , projectStart
            , projectFinish
            , createdDate
            , userId
            , active
            , brStart
            , brEnd
            , flight_hrs_delay
            , projectStartTz
            , projectFinishTz
            , (mins + break_mins) mins
            , TRUNCATE((mins+break_mins)/60,2) qtr_hrs
            , SEC_TO_TIME((mins+break_mins)*60) time
            , break_mins
            , event_break_mins
            , isEvent
            , event_type
            , isBreak
            , isTravel
            , isWeekEnd
            from ( 
            SELECT a.*,
                b.isEvent,
                b.event_type,
                b.isBreak,
                b.isTravel,
                event_name,
                case when DAYOFWEEK(projectStart) IN(1, 7)  THEN 1 ELSE 0 END isWeekEnd, 
                case 
                    when b.isBreak = 1 
                    THEN (-1 * TIMESTAMPDIFF(MINUTE, projectStart, projectFinish))
                        ELSE CASE
                            when projectFinishTz IS NOT NULL AND projectStartTz IS NOT NULL 
                            THEN TIMESTAMPDIFF(MINUTE, CONVERT_TZ (projectStart,projectStartTz,"PST8PDT"), CONVERT_TZ (projectFinish,projectFinishTz,"PST8PDT"))   
                            ELSE TIMESTAMPDIFF(MINUTE, projectStart, projectFinish)
                        END END mins,
                IFNULL(-1 * TIMESTAMPDIFF(MINUTE,brStart,brEnd),0) break_mins, 
                case when b.isBreak = 1 then -1 * TIMESTAMPDIFF(MINUTE,projectStart,projectFinish) else 0 END event_break_mins
                
                FROM fs_workOrderProject a
                LEFT JOIN eyefidb.fs_event_type b ON b.event_name = a.proj_type
            ) a
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->execute();
    }

    //TEST 2022-08-20
    public function workOrderSummary(){
        $qry = "
        create or replace view fs_work_order_summary_view AS
        SELECT a.workOrderId
        , SUM(case when a.event_type = 1 THEN a.mins ELSE 0 END) service_mins
        , SUM(case when a.event_type = 2 THEN a.mins ELSE 0 END) travel_mins
        , SUM(case when a.event_type = 3 THEN a.mins ELSE 0 END) non_service_mins
        , SUM(a.mins) total_mins
        , TRUNCATE(SUM(a.mins)/60,2) total_qtr_hrs
        , MIN(a.projectStart) start
        , MAX(a.projectFinish) finished
        , d.team
        , d.total_techs
        , c.request_date
        , b.dateSubmitted
        , b.createdDate
        , c.service_type
        , c.out_of_state
        , c.sign_theme
        , c.platform
        , case when b.dateSubmitted IS NULL THEN 'In Process' ELSE b.workCompleted END workCompleted
    FROM fs_labor_view a
    INNER JOIN fs_workOrder b ON b.id = a.workOrderId
    INNER JOIN fs_scheduler c ON c.id = b.fs_scheduler_id
    LEFT JOIN (
        select fs_det_id, group_concat(user SEPARATOR ', ') team,
        count(fs_det_id) total_techs
        from eyefidb.fs_team
        group by fs_det_id
    ) d ON d.fs_det_id = c.id
     WHERE a.isEvent = 1
    GROUP BY a.workOrderId
                  , c.platform
                , d.team
                , d.total_techs
                , c.request_date
                , b.dateSubmitted
        , c.service_type
            ";
        $stmt = $this->db->prepare($qry);
        $stmt->execute();
    }

    public function schedulerView(){
        $qry = "
        
        create or replace view fs_scheduler_view AS
              select a.id 
							 , DATEDIFF(CURDATE(),b.dateSubmitted) age_from_ticket_submitted
							 , DATEDIFF(CURDATE(),b.createdDate) age_from_ticket_started
               , DATEDIFF(concat(a.request_date, ' ', a.start_time),CURDATE())  days_before_service

                      , a.id fs_scheduler_id
                      , a.requested_by 
                      , a.queue queue_status
                      , a.status 
                      , a.sales_order_number 
                      , a.invoice
                      , a.service_type 
                      , a.customer 
                      , property.property 
                      , property.city location 
                      , property.state 
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
                      , a.billable
                      
                      , request_date
                      
                      , IFNULL(team, 'No techs assigned') installers
                      , isVendor
                      
                      , total_techs
                      
                      , concat(a.id, '-', b.id) fullWorkOrderId
                      
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
                      , CONCAT(a.customer, ' ',  property.property, ' (', a.service_type, ')') title
  
                      , CASE WHEN a.published = 0 THEN '#fff' ELSE f.statusColor END backgroundColor 
                      , CASE WHEN f.statusColor IS NULL THEN  f.statusColor ELSE f.statusColor END borderColor
                      , CASE WHEN f.color IS NULL OR a.published = 0 THEN '#000' ELSE f.color  END color
                      
  
                      , property.property_phone property_phone_number
                      , property.zip_code
                      , a.compliance_license_notes
                      , user.createdByUserName 
                                , turnover_fsid
                      , a.group_id
  
                      , property.full_address
                      , a.published
                      , eyeFiAsset
                      , customerAsset
                      , a.paper_work_location
                      
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
                      select fs_det_id, group_concat(user ORDER BY user SEPARATOR ', ') team,
                      count(fs_det_id) total_techs,
                      COUNT(case when b.id IS NOT NULL THEN 1 END) isVendor
                      from eyefidb.fs_team a
                      LEFT JOIN eyefidb.fs_vendors b ON b.name = a.user
                      group by fs_det_id
                  ) e ON e.fs_det_id = a.id
  
                  LEFT JOIN eyefidb.fs_scheduler_settings f ON f.value = a.status AND f.type = 'status'
  
                  LEFT JOIN (
                      SELECT concat(first, ' ' , last) createdByUserName
                          , id
                      from db.users
                  ) user ON user.id = a.created_by

                  
                left join (
                    SELECT workOrderId, 
                    GROUP_CONCAT(DISTINCT eyefiAsset ORDER BY eyefiAsset ASC SEPARATOR ',') eyeFiAsset,
                    GROUP_CONCAT(DISTINCT customerAsset ORDER BY customerAsset ASC SEPARATOR ',') customerAsset
                    FROM eyefidb.fs_workOrderMisc a
                    group by workOrderId
                ) misc ON misc.workOrderId = b.id

                  
                  left join (
			            select id, property, city, state, address1, property_phone, zip_code, CONCAT_WS(',', 
			                NULLIF(trim(property), ''),
			                NULLIF(trim(address1), ''),
			                NULLIF(trim(city), ''), 
			                NULLIF(trim(state), ''), 
			                NULLIF(trim(zip_code), ''),  
			                NULLIF(trim(property_phone), '')) full_address
			            from eyefidb.fs_property_det
			        ) property ON property.id = a.property_id
  
                  WHERE a.active = 1
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->execute();
    }

	public function __destruct()
	{
		$this->db = null;
	}
}