<?php

class InventoryDetailItemUsage
{

    protected $db;
    public $partNumber;
    public $itemSearchQuery;

    public function __construct($db)
    {

        $this->db = $db;
        $this->nowDate = date("Y-m-d");
    }

    public function getData()
    {

        $from = date("Y-m-d", strtotime("-6 months"));
        $from6 = date("n", strtotime("-6 months"));
        $from5 = date("n", strtotime("-5 months"));
        $from4 = date("n", strtotime("-4 months"));
        $from3 = date("n", strtotime("-3 months"));
        $from2 = date("n", strtotime("-2 months"));
        $from1 = date("n", strtotime("-1 months"));
        $to = date('Y-m-d', strtotime('last day of previous month'));

        $qry = "
            select a.pt_part part_number
                , a.pt_added part_added
                , c.ld_date location_date
                , a.pt_desc1 descrption_1
                , a.pt_desc2 descrption_2
                , a.pt_um um
                , IFNULL(cast(c.ld_qty_oh as decimal(10,2)), 0) qty_on_hand
                , IFNULL(cast(b.lastMonth1 as decimal(10,2)), 0) last_Month_1
                , IFNULL(cast(b.lastMonth2 as decimal(10,2)), 0) last_Month_2
                , IFNULL(cast(b.lastMonth3 as decimal(10,2)), 0) last_Month_3
                , IFNULL(cast(b.lastMonth4 as decimal(10,2)), 0) last_Month_4
                , IFNULL(cast(b.lastMonth5 as decimal(10,2)), 0) last_Month_5
                , IFNULL(cast(b.lastMonth6 as decimal(10,2)), 0) last_Month_6
            from pt_mstr a
            LEFT JOIN (
                select tr_part
                , sum(case when month(tr_date) = " . $from1  . " then tr_qty_chg else 0 end) lastMonth1
                , sum(case when month(tr_date) = " . $from2  . " then tr_qty_chg else 0 end) lastMonth2
                , sum(case when month(tr_date) = " . $from3  . " then tr_qty_chg else 0 end) lastMonth3
                , sum(case when month(tr_date) = " . $from4  . " then tr_qty_chg else 0 end) lastMonth4
                , sum(case when month(tr_date) = " . $from5  . " then tr_qty_chg else 0 end) lastMonth5
                , sum(case when month(tr_date) = " . $from6  . " then tr_qty_chg else 0 end) lastMonth6
                FROM tr_hist
                WHERE tr_domain = 'EYE'
                AND tr_type IN ('ISS-SO', 'ISS-WO')
                AND tr_date between '" . $from . "' and '" . $to  . "'
                GROUP BY tr_part
            ) b ON a.pt_part = b.tr_part

            LEFT JOIN (
                select a.ld_part
                    , max(ld_date) ld_date
                    , sum(ld_qty_oh) ld_qty_oh
                from ld_det a
                where a.ld_domain = 'EYE' 
                GROUP BY a.ld_part
            ) c ON c.ld_part = a.pt_part
            
            where a.pt_domain = 'EYE'
                AND (a.pt_desc1 != '' AND a.pt_desc2 != '')
        ";

        if ($this->itemSearchQuery != 'undefined') {
            $qry .= " and pt_part LIKE '%" . $this->itemSearchQuery . "%' ";
        }
        $qry .= " WITH (nolock) ";
        $query = $this->db->prepare($qry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
