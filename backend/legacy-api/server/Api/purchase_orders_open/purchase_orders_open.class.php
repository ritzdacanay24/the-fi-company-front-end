<?php

class PurchaseOrders
{

    /**
     * Set the connection
     *
     * @param $db pass the connection object
     */
    public function __construct($dbQad)
    {
        $this->db = $dbQad;
    }

    /**
     * Display all open purchase order from detail level
     *
     * @return array
     */
    public function read_open_po_details()
    {
        $q = "
                SELECT a.pod_nbr pod_nbr
                    , a.pod_due_date pod_due_date
                    , a.pod_line pod_line
                    , a.pod_part pod_part
                    , cast(a.pod_qty_ord as numeric(36,0)) pod_qty_ord
                    , cast(a.pod_qty_rcvd as numeric(36,0)) pod_qty_rcvd
                    , cast(a.pod_qty_ord-a.pod_qty_rcvd as numeric(36,0)) qty_open
                    , a.pod_status pod_status
                    , a.pod_due_date-curdate() age
                    , cast(a.pod_pur_cost*(a.pod_qty_ord-a.pod_qty_rcvd) as numeric(36,2)) open_order_amount
                    , cast(a.pod_pur_cost*a.pod_qty_ord as numeric(36,2)) full_order_amount
                    , a.pod_loc pod_loc
                    , a.pod_rev pod_rev
                    , b.po_vend po_vend
                    , b.po_ord_date po_ord_date
                    , b.po_rmks po_rmks
                    , b.po_shipvia po_shipvia
                    , b.po_user_id po_user_id
                    , CASE 
                        WHEN a.pod_due_date < curdate()
                            THEN 'Past Due'
                        WHEN a.pod_due_date = curdate()
                            THEN 'Due Today'
                        ELSE 'Due Future'
                    END po_status_text
                FROM pod_det a
                LEFT JOIN po_mstr b ON 
                    a.pod_nbr = b.po_nbr AND 
                    b.po_domain = 'EYE'
                WHERE a.pod_qty_ord != a.pod_qty_rcvd
                    AND a.pod_status NOT IN ('c', 'x')
                    AND a.pod_domain = 'EYE'
                ORDER BY a.pod_due_date ASC
                with (noLock)
            ";
        $query = $this->db->prepare($q);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $past = 0;
        $today = 0;
        $future = 0;
        foreach ($results as $row) {
            $poText = trim($row['PO_STATUS_TEXT']);
            if ($poText == 'Past Due') {
                $past++;
            } else if ($poText == 'Due Today') {
                $today++;
            } else if ($poText == 'Due Future') {
                $future++;
            }
        }

        return array(
            "details" => $results,
            "past" => $past,
            "today" => $today,
            "future" => $future
        );
    }

    /**
     * Display all open purchase order from header level
     * 
     * @return array
     */
    public function read_all_open_po()
    {
        $q = "
                SELECT a.po_vend po_vend
                    , a.po_ord_date po_ord_date
                    , a.po_rmks po_rmks
                    , a.po_shipvia po_shipvia
                    , a.po_user_id po_user_id
                    , a.po_nbr po_nbr
                    , a.po_stat
                FROM po_mstr a
                WHERE a.po_domain = 'EYE'
                    AND a.po_stat != 'c'
                WITH (noLock)
            ";
        $query = $this->db->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Display purchase order from header level by po number
     *
     * @return object
     */
    public function read_open_po_header_by_po_number(String $poNumber)
    {
        $q = "
                SELECT a.po_vend po_vend
                    , a.po_ord_date po_ord_date
                    , a.po_rmks po_rmks
                    , a.po_shipvia po_shipvia
                    , a.po_user_id po_user_id
                    , a.po_nbr po_nbr
                    , a.po_stat po_stat
                FROM po_mstr a
                WHERE a.po_domain = 'EYE'
                    AND a.po_nbr = :poNumber
                WITH (noLock)
            ";
        $query = $this->db->prepare($q);
        $query->bindParam(':poNumber', $poNumber, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchObject();
    }

    /**
     * Display purchase order from detail level by po number
     *
     * @return array
     */
    public function read_open_po_detail_by_po_number(String $poNumber)
    {
        $q = "
                SELECT a.pod_nbr pod_nbr
                    , a.pod_due_date pod_due_date
                    , a.pod_line pod_line
                    , a.pod_part pod_part
                    , cast(a.pod_qty_ord as numeric(36,0)) pod_qty_ord
                    , cast(a.pod_qty_rcvd as numeric(36,0)) pod_qty_rcvd
                    , cast(a.pod_qty_ord-a.pod_qty_rcvd as numeric(36,0)) qty_open
                    , a.pod_status pod_status
                    , a.pod_due_date-curdate() age
                    , cast(a.pod_pur_cost*(a.pod_qty_ord-a.pod_qty_rcvd) as numeric(36,2)) open_order_amount
                    , cast(a.pod_pur_cost*a.pod_qty_ord as numeric(36,2)) full_order_amount
                    , a.pod_loc pod_loc
                    , a.pod_rev pod_rev
                FROM pod_det a
                WHERE a.pod_domain = 'EYE'
                    AND a.pod_nbr = :poNumber
                ORDER BY a.pod_due_date ASC
                with (noLock)
            ";
        $query = $this->db->prepare($q);
        $query->bindParam(':poNumber', $poNumber, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Close the connection
     * 
     */
    public function __destruct()
    {
        $this->db = null;
    }
}
