<?php
namespace EyefiDb\Api\EFInventoryRollforward;

use PDO;

class EFInventoryRollforward
{

    protected $db;

    public function __construct($dbQad)
    {
        $this->db = $dbQad;
        $this->nowDate = date("Y-m-d");
    }

    public function getJimatLoad($startDate, $endDate)
    {
        $mainQry = "
                     select cast(sum(pod_qty_ord*pod_pur_cost) as numeric(36,2))  balance
                     from po_mstr a 
                     LEFT JOIN ( 
                            SELECT pod_nbr
                                   , pod_pur_cost 
                                   , pod_part
                                   , pod_qty_ord
                                   , pod_status
                                   , pod_due_date
                            FROM pod_det 
                            WHERE pod_domain = 'EYE' 
                     ) b ON a.po_nbr = b.pod_nbr 
                     where po_vend IN ('JIAMET')
                            AND po_domain = 'EYE'
                            AND b.pod_due_date between :startDate AND :endDate
                     with (noLock) 				
              ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(':startDate', $startDate, PDO::PARAM_STR);
        $query->bindParam(':endDate', $endDate, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function getNonJimatLoad($startDate, $endDate)
    {
        $mainQry = "
                     select cast(sum(pod_qty_ord*pod_pur_cost) as numeric(36,2))  balance
                     from po_mstr a 
                     LEFT JOIN ( 
                            SELECT pod_nbr
                                   , pod_pur_cost 
                                   , pod_part
                                   , pod_qty_ord
                                   , pod_status
                                   , pod_due_date
                            FROM pod_det 
                            WHERE pod_domain = 'EYE' 
                     ) b ON a.po_nbr = b.pod_nbr 
                     where po_vend NOT IN ('JIAMET')
                            AND po_domain = 'EYE'
                            AND b.pod_due_date between :startDate AND :endDate
                     with (noLock) 				
              ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(':startDate', $startDate, PDO::PARAM_STR);
        $query->bindParam(':endDate', $endDate, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function getSumByWeek($startDate, $endDate)
    {

        $mainQry = "
                     select sum((a.sod_qty_ord-a.sod_qty_ship) * a.sod_price) balance
                     from sod_det a
                     join (
                            select so_nbr	
                                   , so_cust
                                   , so_ord_date
                                   , so_ship
                                   , so_bol
                                   , so_cmtindx
                                   , so_compl_date
                                   , so_shipvia
                            from so_mstr
                            where so_domain = 'EYE'
                            AND so_compl_date IS NULL
                     ) c ON c.so_nbr = a.sod_nbr

                     WHERE sod_domain = 'EYE'
                            AND sod_qty_ord != sod_qty_ship
                            AND a.sod_due_date between :startDate AND :endDate
                     ORDER BY a.sod_due_date ASC
                     WITH (NOLOCK)			
              ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':startDate', $startDate, PDO::PARAM_STR);
        $query->bindParam(':endDate', $endDate, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }
    public function run()
    {

        $columns = array(
            "Inventory - Beginning of Week",
            "Receipts - Jiaxing",
            "Receipts - Other than Jiaxing",
            "Cost of Goods on Sales",
            "Inventory - End of Week"
        );

        $range = 11;

        $now = new \DateTime;
        $now1 = new \DateTime;
        $interval = (new \DateTime)->setISODate($now->format('Y'), $now->format('W') + 7);
        $to = (new \DateTime)->setISODate($now1->format('Y'), $now1->format('W') + $range);
        $from = (new \DateTime)->setISODate($interval->format('Y'), $interval->format('W') - 7);
        $from->modify("friday this week");

        $obj = array();
        $dates = array();


        function x_week_range1($date)
        {
            $ts = strtotime($date);
            $start = (date('w', $ts) == 0) ? $ts : strtotime('last sunday', $ts);
            return array(
                date('Y-m-d', $start),
                date('Y-m-d', strtotime('next friday', $start))
            );
        }

        function getPreviousEndingBalance($columns)
        {
            echo json_encode($columns);
        }

        $index1 = 1;
        $mainIndex = 0;
        //loop through dates and put array to set the columns
        $memoryEndOfWeekDate = "";
        while ($from < $to) {
            $date = $from->format('Y-m-d');

            list($start_date1, $end_date1) = x_week_range1($date);
            $total = 0;
            foreach ($columns as $row) {
                $balance = 0;
                if ($mainIndex === 0) {
                    $balance = 7389548.09;
                } else if ($row === 'Inventory - Beginning of Week') {

                    //get previous inventory end of week value
                    $balance = $memoryEndOfWeekDate;
                }

                if ($row === 'Receipts - Jiaxing') {
                    list($start_date, $end_date) = x_week_range1($date);
                    $Jiaxing = $this->getJimatLoad($start_date, $end_date);
                    $balance = $Jiaxing['BALANCE'];
                }

                if ($row === 'Receipts - Other than Jiaxing') {
                    list($start_date, $end_date) = x_week_range1($date);
                    $nonJiaxing = $this->getNonJimatLoad($start_date, $end_date);
                    $balance = $nonJiaxing['BALANCE'];
                }
                if ($row === 'Cost of Goods on Sales') {
                    list($start_date, $end_date) = x_week_range1($date);
                    $cogs = $this->getSumByWeek($start_date, $end_date);
                    $balance = $cogs['BALANCE'] * .49;
                }

                if ($row === 'Inventory - End of Week') {
                    $balance = $total;
                    $memoryEndOfWeekDate = $balance;
                }

                if ($row === 'Cost of Goods on Sales') {
                    $total = $total - $balance;
                } else {
                    $total = $total + $balance;
                }

                $dates[] = array(
                    "date" => $start_date1 . ' thru ' . $end_date1,
                    "field" => $row,
                    "balance" => "$" . number_format($balance, 2)
                );
                $mainIndex++;
            }

            $index1++;


            $from->modify("+1 week");
        }

        return $dates;
    }
    
}
