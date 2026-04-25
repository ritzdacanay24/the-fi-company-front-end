<?php

	class CleanUsers
	{
	 
		protected $db;
		
		public function __construct($db)
		{
			$this->db = $db;
            $this->nowDate = date("Y-m-d", time());
		}			

		public function get()
		{
			
			$sql = "
                select a.sod_nbr order_number
                    , a.sod_line line_number
                    , sod_custpart customer_part
                    , cast(a.sod_qty_ord as numeric(36,0)) qty_ordered
                    , cast(a.sod_qty_ship as numeric(36,0)) qty_shipped
                    , cast(a.sod_qty_ord - a.sod_qty_ship as numeric(36,0)) qty_open
                    , b.pt_desc1 description_1
                    , b.pt_desc2 description_2
                    , c.so_rmks remarks
                    , c.so_po po_number
                    , case when c.so_ship = 'NV.PROTO' THEN 'R200' ELSE 'Z024' END to_loc
                    , so_cust customer
                from sod_det a
                left join (
                    select pt_part			
                        , max(pt_desc1) pt_desc1
                        , max(pt_desc2) pt_desc2		
                    from pt_mstr
                    where pt_domain = 'EYE'
                    group by pt_part		
                ) b ON b.pt_part = a.sod_part
                join so_mstr c on c.so_nbr = a.sod_nbr and so_domain = 'EYE' AND so_cust = 'INTGAM'
                where c.so_rmks = '' and sod_domain = 'EYE' and a.sod_qty_ord - a.sod_qty_ship != 0
                order by a.sod_nbr  ASC, a.sod_line ASC
            ";
			$query = $this->db->prepare($sql);
            $query->execute();
            return  $query->fetchAll(PDO::FETCH_ASSOC);

		}


		
	}
	
use EyefiDb\Databases\DatabaseQad;

$db_connect_qad = new DatabaseQad();


$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute( PDO::ATTR_CASE, PDO::CASE_LOWER );


	$d = new CleanUsers($dbQad);
    $details = $d->get();
    ?>
    <div style="padding:10px">
        <h4>SO Lines With No Remarks</h4>
        <?php echo $db_connect_qad->jsonToTable($details);?>
    </div>