<?php

namespace EyefiDb\Api\FieldService;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;

class ServiceJobs
{
    protected $db;
    public $sessionId;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d H:i:s", time());
    }

    public function getStatus()
    {
        try {
            $mainQry = "
                SELECT status, count(status) count
                FROM eyefidb.fs_scheduler
                WHERE active = 1
                GROUP BY status
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

    public function getServiceType()
    {
        try {
            $mainQry = "
                SELECT service_type, count(*) count
                FROM eyefidb.fs_scheduler
                WHERE active = 1
                GROUP BY service_type
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

    public function getTravelInfo($IN)
    {
        $q = "
            SELECT workOrderId, 
                sum(case when project_type = 'Fly - Travel Out' THEN (hrs-brkHrs)/60 END) flyToState,
                sum(case when project_type = 'Drive - Travel Out' THEN (hrs-brkHrs)/60 END) driveToState,
                sum(case when project_type = 'Travel To Site' THEN (hrs-brkHrs)/60 END) driveToSite,
                sum(case when isTravel = 0 THEN hrs/60 END) service,
                sum(case when project_type = 'Travel From Site' THEN (hrs-brkHrs)/60 END) driveFromSite,
                sum(case when project_type = 'Drive - Travel In' THEN (hrs-brkHrs)/60 END) driveFromState,
                sum(case when project_type = 'Fly - Travel In' THEN (hrs-brkHrs)/60 END) flyFromState
            FROM eyefidb.fs_full_timeline
            WHERE workOrderId IN ($IN)
            group by workOrderId
		";
        $query = $this->db->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTravelSites($IN)
    {
        $q = "
            SELECT workOrderId,
                sum((case when proj_type = 'Travel To Site' THEN TIMESTAMPDIFF(MINUTE,projectStart,projectFinish)/60 END)) driveToSite,
                sum((case when proj_type = 'Travel From Site' THEN TIMESTAMPDIFF(MINUTE,projectStart,projectFinish)/60 END)) driveFromSite
            from eyefidb.fs_workOrderProject 
            WHERE workOrderId IN ($IN)
            group by workOrderId
		";
        $query = $this->db->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTripExpenses($IN)
    {
        $q = "
            SELECT a.*, 
                c.mark_up_percent, 
                (a.cost * c.mark_up_percent) /100 markUp,
                ((a.cost * c.mark_up_percent) /100) + a.cost markUpTotal
            FROM eyefidb.fs_workOrderTrip a
                left join eyefidb.fs_workOrder b ON b.id = a.workOrderId
                left join eyefidb.fs_scheduler c ON c.id = b.fs_scheduler_id
            WHERE workOrderId IN ($IN)
		";
        $query = $this->db->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getServiceJobs($dateFrom, $dateTo)
    {
        $shipTo = "
			select a.*, b.id ticket_id, 
            techCombinedRates,
            totalTeams,
            property.property,
            property.address1,
            property.city,
            property.state
            FROM eyefidb.fs_scheduler a
            LEFT JOIN eyefidb.fs_workOrder b ON b.fs_scheduler_id = a.id
            
            LEFT JOIN (
                select fs_det_id, count(fs_det_id) totalTeams, group_concat(user SEPARATOR ', ') team, sum(user_rate) techCombinedRates
                from eyefidb.fs_team
                group by fs_det_id
            ) e ON e.fs_det_id = a.id

            
            left join (
                select id, property, city, state, address1, property_phone, zip_code, CONCAT_WS(',', 
                    NULLIF(trim(property), ''),
                    NULLIF(trim(address1), ''),
                    NULLIF(trim(city), ''), 
                    NULLIF(trim(state), ''), 
                    NULLIF(trim(zip_code), ''),  
                    NULLIF(trim(property_phone), '')) full_address
                from eyefidb.confirmedJobs
            ) property ON property.id = a.property_id

            WHERE request_date between :dateFrom AND :dateTo
            ORDER BY request_date ASC, id asc
		";
        $query = $this->db->prepare($shipTo);
        $query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function ticketSummary($in)
    {

        $sql = "SET @maxHrs := 8;";
        $sth = $this->db->prepare($sql);
        $sth->execute();
        $sth->closeCursor();

        $shipTo = "
        select sum(case when isTravel = 1 AND totalHrs > @maxHrs THEN 8 when isTravel = 1 AND totalHrs <= @maxHrs THEN totalHrs ELSE 0 END ) travelTimeHrs
                    , sum(case when isTravel = 1 AND totalHrs > @maxHrs THEN totalHrs-@maxHrs ELSE 0 END ) travel_over_time_hrs
                    , sum(case when isTravel = 0 THEN actualHrs ELSE 0 END ) installTimes
                    , sum(case when isTravel = 0 AND totalHrs > @maxHrs THEN totalHrs-@maxHrs  ELSE 0 END ) install_overtime_hrs
                    , case when sum(totalHrs) > @maxHrs THEN sum(totalHrs)-@maxHrs ELSE 0 END  total_overtime_from_total_hrs
                    , sum(totalHrs) totalHrs
                    , sum(brkhrs) totalBrkHrs
                    , workOrderId
                from (
                    select *
                        , (case when totalHrs > @maxHrs then totalHrs-@maxHrs ELSE 0 END) overtime
                        , (case when totalHrs <= @maxHrs then totalHrs ELSE (totalHrs-case when totalHrs > @maxHrs then totalHrs-@maxHrs ELSE 0 END) END) actualHrs
                    from (
                        SELECT workOrderId 
                        , DATE_FORMAT(date(start), '%m/%d/%Y')  start
                        , DATE_FORMAT(date(start), '%a %m/%d/%Y')  startFormate
                        , DATE_FORMAT(date(end), '%m/%d/%Y')  end
                        , truncate(sum(hrs-brkhrs)/60,2) totalHrs
                        , truncate(sum(brkhrs)/60,2) brkhrs
                        , isTravel 
                    FROM eyefidb.fs_full_timeline
                    where workOrderId in ($in)
                    group by workOrderId, DATE_FORMAT(date(start), '%m/%d/%Y'), DATE_FORMAT(date(end), '%m/%d/%Y'), DATE_FORMAT(date(start), '%a %m/%d/%Y'), isTravel
                    order by  DATE_FORMAT(date(start), '%m/%d/%Y'), DATE_FORMAT(date(end), '%m/%d/%Y')
                    ) a
                ) b 
                group by workOrderId
		";
        $query = $this->db->prepare($shipTo);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function generateReport($dateFrom, $dateTo)
    {
        $details = $this->getServiceJobs($dateFrom, $dateTo);

        $in_array = array();
        foreach ($details as $row) {
            $in_array[] = $row['ticket_id'];
        }

        $in = "'" . implode("','", $in_array) . "'";

        $tripExpenses = $this->getTripExpenses($in);
        $travelInfo = $this->getTravelInfo($in);
        $getTravelSitesInfo = $this->getTravelSites($in);
        $ticketSummary = $this->ticketSummary($in);

        $newResults = array();
        $per_diem = 'Per Deim';
        foreach ($details as $resultsRow) {

            $resultsRow['totalHours'] = 0;
            $resultsRow['totalInstallers'] = 0;
            $resultsRow['totalJobExpenses'] = 0;
            $resultsRow['totalLabor'] = 0;
            $resultsRow['billableLabor'] = 0;
            $resultsRow['totalBillable'] = 0;

            $techCombinedOvertimeHrlyRates = ($resultsRow['techCombinedRates'] / 2) + $resultsRow['techCombinedRates'];

            $resultsRow['ticketSummary'] = new \stdClass();
            foreach ($ticketSummary as $row) {
                if ($resultsRow['ticket_id'] == $row['workOrderId']) {
                    $row['travelTimeHrs_cost'] = $row['travelTimeHrs'] * $resultsRow['techCombinedRates'];
                    $row['travel_over_time_hrs_cost'] = $row['travel_over_time_hrs'] * $techCombinedOvertimeHrlyRates;
                    $row['installTimes_cost'] = $row['installTimes'] * $resultsRow['techCombinedRates'];
                    $row['install_overtime_hrs_cost'] = $row['install_overtime_hrs'] * $techCombinedOvertimeHrlyRates;
                    $row['totalHrs_cost'] = $row['travelTimeHrs_cost'] + $row['travel_over_time_hrs_cost'] + $row['installTimes_cost'] + $row['install_overtime_hrs_cost'];
                    $resultsRow['totalLabor'] += $row['totalHrs_cost'];

                    $resultsRow['ticketSummary'] = $row;
                }
            }

            $resultsRow['ticketBillableSummary'] = new \stdClass();
            foreach ($ticketSummary as $row) {
                if ($resultsRow['ticket_id'] == $row['workOrderId']) {
                    $row['travelTimeHrs_cost'] = $row['travelTimeHrs'] * $resultsRow['ef_hourly_rate'];
                    $row['travel_over_time_hrs_cost'] = $row['travel_over_time_hrs'] * $resultsRow['ef_overtime_hourly_rate'];
                    $row['installTimes_cost'] = $row['installTimes'] * $resultsRow['ef_hourly_rate'];
                    $row['install_overtime_hrs_cost'] = $row['install_overtime_hrs'] * $resultsRow['ef_overtime_hourly_rate'];
                    $row['totalHrs_cost'] = $row['travelTimeHrs_cost'] + $row['travel_over_time_hrs_cost'] + $row['installTimes_cost'] + $row['install_overtime_hrs_cost'];
                    $resultsRow['billableLabor'] += $row['totalHrs_cost'];

                    $resultsRow['ticketBillableSummary'] = $row;
                }
            }

            $resultsRow['travelInfo'] = new \stdClass();
            foreach ($travelInfo as $row) {
                if ($resultsRow['ticket_id'] == $row['workOrderId']) {
                    $resultsRow['travelInfo'] = $row;
                    $resultsRow['totalHours'] += $row['driveFromState'] + $row['driveToState'] + $row['flyFromState'] + $row['flyToState'] + $row['service'];
                }
            }

            $resultsRow['travelSitesInfo'] = new \stdClass();
            foreach ($getTravelSitesInfo as $row) {
                if ($resultsRow['ticket_id'] == $row['workOrderId']) {
                    $resultsRow['travelSitesInfo'] = $row;
                    $resultsRow['totalHours'] += $row['driveToSite'] + $row['driveFromSite'];
                }
            }

            $resultsRow['totalInstallers'] = $resultsRow['totalTeams'];

            // $resultsRow['installers'] = new \stdClass();
            // $resultsRow['installers']->tech = $resultsRow['LeadInstaller'];
            // $resultsRow['installers']->tech_hrly_rate = $resultsRow['LeadInstallerRate'];

            // $resultsRow['installers']->tech_1 = $resultsRow['Installer1'];
            // $resultsRow['installers']->tech_1_hrly_rate = $resultsRow['Installer1Rate'];

            // $resultsRow['installers']->tech_2 = $resultsRow['Installer2'];
            // $resultsRow['installers']->tech_2_hrly_rate = $resultsRow['Installer2Rate'];

            // $resultsRow['installers']->tech_3 = $resultsRow['Installer3'];
            // $resultsRow['installers']->tech_3_hrly_rate = $resultsRow['Installer3Rate'];


            $resultsRow['tripInfo'] = array(
                "Airfare" => 0,
                "Bag Fees" => 0,
                "Rental Car" => 0,
                "Hotel" => 0,
                "Gas" => 0,
                "Parking/Taxi" => 0,
                "Per Diem" => 0,
                "Equipment Rental" => 0,
                "Supplies" => 0
            );
            $resultsRow['tripInfoTotal'] = 0;

            foreach ($tripExpenses as $key => $value) {
                if ($resultsRow['ticket_id'] == $value['workOrderId']) {
                    $resultsRow['tripInfo'][trim($value['name'])] = $value['cost'];
                    $resultsRow['tripInfoTotal'] = $resultsRow['tripInfoTotal'] + $value['cost'];
                }
            }


            $resultsRow['tripInfo_markup'] = array(
                "Airfare" => 0,
                "Bag Fees" => 0,
                "Rental Car" => 0,
                "Hotel" => 0,
                "Gas" => 0,
                "Parking/Taxi" => 0,
                "Per Diem" => 0,
                "Equipment Rental" => 0,
                "Supplies" => 0
            );
            $resultsRow['tripInfo_markup_total'] = 0;

            foreach ($tripExpenses as $key => $value) {
                if ($resultsRow['ticket_id'] == $value['workOrderId']) {
                    $resultsRow['tripInfo_markup'][trim($value['name'])] = $value['markUpTotal'];
                    $resultsRow['tripInfo_markup_total'] += $value['markUpTotal'];
                }
            }
            $totalBillable = $resultsRow['billableLabor'] + $resultsRow['tripInfo_markup_total'];
            $totalJobExpenses = $resultsRow['tripInfoTotal'] + $resultsRow['totalLabor'];

            //$resultsRow['flyToState'] + $resultsRow['driveToState'] + $resultsRow['driveToSite'] + $resultsRow['driveFromSite'] + $resultsRow['driveFromState'] + $resultsRow['flyFromState'];
            $newResults[] = array(
                "id" => $resultsRow['id'],
                "ticket_id" => $resultsRow['ticket_id'],
                "billable" => $resultsRow['billable'],
                "request_date" => $resultsRow['request_date'],
                "customer" => $resultsRow['customer'],
                "customer_contact" => $resultsRow['requested_by'],
                "service_order_number" => $resultsRow['sales_order_number'],
                "service_type" => $resultsRow['service_type'],
                "property" => $resultsRow['property'],
                "address" => $resultsRow['address1'],
                "location" => $resultsRow['city'],
                "state" => $resultsRow['state'],
                "sign_theme" => $resultsRow['sign_theme'],
                "sign_type" => $resultsRow['sign_type'],
                "ef_contractor" => 'NOT RECORDED',
                "contractor_invoice_number" => 'NOT RECORDED',
                "job_type" => 'NOT RECORDED',
                "job_status" => $resultsRow['status'],
                "invoice_status" => $resultsRow['invoice_number'] == 'Non billable' ? 'Non-billable' : $resultsRow['acc_status'],
                "paper_work_location" => $resultsRow['paper_work_location'],
                "tripExpenses" => $resultsRow['tripInfo'],
                "tripInfoTotal" => $resultsRow['tripInfoTotal'],
                "markUpPercentStandard" => $resultsRow['mark_up_percent'],
                "tripExpenses_markup" => $resultsRow['tripInfo_markup'],
                "svNumber" => $resultsRow['co_number'],
                "InvoiceDate" => $resultsRow['invoice_date'],
                "InvoiceNumber" => $resultsRow['invoice_number'],
                "travelInfo" => $resultsRow['travelInfo'],
                "ef_hourly_rate" => $resultsRow['ef_hourly_rate'],
                "ef_overtime_hourly_rate" => $resultsRow['ef_overtime_hourly_rate'],
                "travelSitesInfo" => $resultsRow['travelSitesInfo'],
                "totalHours" => $resultsRow['totalHours'],
                "totalInstallers" => $resultsRow['totalInstallers'],
                // "installers" => $resultsRow['installers'],
                // "techCombinedRates" => $resultsRow['techCombinedRates'],
                // "techCombinedOvertimeHrlyRates" => $techCombinedOvertimeHrlyRates,
                "ticketSummary" => $resultsRow['ticketSummary'],
                "ticketBillableSummary" => $resultsRow['ticketBillableSummary'],
                "totalJobExpenses" => $totalJobExpenses,
                "totalBillable" => $totalBillable,
                "totalBillableExpenses" => $resultsRow['tripInfo_markup_total'],
                "billableFlatRateOrPO" => $resultsRow['billable_flat_rate_or_po'],
                "contractorInvSentToAP" => $resultsRow['contractor_inv_sent_to_ap'],
                "period" => $resultsRow['period'],
                "profit" => $totalBillable - $totalJobExpenses,
                "markUpPercent" => $totalJobExpenses == 0 ? 0 : (($totalBillable - $totalJobExpenses) / $totalJobExpenses) * 100,
                "gpmPercent" => $totalBillable == 0 ? 0 : (($totalBillable - $totalJobExpenses) / $totalBillable) * 100

                //TRAVEL INFO
                // "flight_to_state" => '',
                // "drive_to_state" => '',
                // "drive_to_site" => '',
                // "job_hours" => '',
                // "job_hours_overtime" => '',

                // "drive_from_site" => '',
                // "drive_from_state" => '',
                // "flight_out_of_state" => '',

                // "drive_from_site_overtime" => '',
                // "drive_to_state_overtime" => '',
                // "flight_out_of_state_overtime" => '',
                // "total_hors" => '',


                // "tech_travel" => '',
                // "tech_travel_overtime" => '',
                // "job_labor" => '',
                // "job_labor_overtime" => '',
                // "total_labor" => '',

                // "airfair" => '',
                // "bag_fee" => '',
                // "rental_car" => '',
                // "hotel" => '',
                // "gas" => '',
                // "parking_taxi" => '',
                // "per_diem" => '',
                // "equipment_rental" => '',
                // "supplies" => '',
                // "parts" => '',
                // "contractors" => '',
                // "total_expenses" => '',
            );
        }

        return array(
            "results" => $newResults,
            "Status" => $this->getStatus(),
            "serviceType" => $this->getServiceType()
        );
    }
}
