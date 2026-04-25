<?php

class test
{

    protected $db;

    public function __construct($dbQad)
    {
        $this->db = $dbQad;
    }

    public function getData($operation, $dateFrom, $dateTo)
    {
        try {
            $mainQry = "
            select  op_wo_nbr work_order, 
            op_date operation_date, 
            op_type type, 
            op_qty_comp completed, 
            op_part part, 
            op_tran_date transaction_date, 
            op_wo_op operation, 
            op_line line_number, 
            op_userid user_id,
            op_trnbr, 
            op_act_run, 
            op_qty_wip, 
            op_wkctr,
            c.*
            from op_hist
            left join wo_mstr c on c.wo_nbr = op_hist.op_wo_nbr and c.wo_domain = 'EYE'  

            where op_tran_date between :dateFrom and :dateTo and op_wo_op = :operation and op_domain = 'EYE' 
            order by op_tran_date asc, op_userid asc, op_qty_comp asc
                WITH (NOLOCK)
            ";
            $query = $this->db->prepare($mainQry);
            $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
            $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
            $query->bindParam(':operation', $operation, PDO::PARAM_STR);
            $query->execute();
            $result = $query->fetchAll(PDO::FETCH_ASSOC);

            return $result;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }
}

use EyefiDb\Databases\DatabaseQad;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$instance = new test($dbQad);

$operation = ISSET($_GET['operation']) ? $_GET['operation'] : 10;
$dateFrom = ISSET($_GET['dateFrom']) ? $_GET['dateFrom'] : date("Y-m-d");;
$dateTo = ISSET($_GET['dateTo']) ? $_GET['dateTo'] : $dateFrom;


$results = $instance->getData($operation, $dateFrom, $dateTo);

$count = 0;

foreach($results as $x => $val) {
    if($val['TYPE'] == 'BACKFLSH'){
        $count++;  
    }
  }


?>
    <div style="padding:10px">
    <h2>Work Order Operation Transactions</h2>
        <p>

            <form action="work-order-routing-status.php" method="get">
                <label for="operation">Operation:</label>

                <select name="operation" id="operation">
                    <option  <?php echo ($operation == '10')?"selected":"" ?> >10</option>
                    <option   <?php echo ($operation == '20')?"selected":"" ?>>20</option>
                    <option   <?php echo ($operation == '30')?"selected":"" ?>>30</option>
                    <option   <?php echo ($operation == '40')?"selected":"" ?>>40</option>
                </select>
                <br/><br/>
                From:
                <input type="date" name="dateFrom" value="<?php echo $dateFrom; ?>" />
                <br/><br/>
                To:
                <input style="margin-left:18px" type="date" name="dateTo" value="<?php echo $dateTo; ?>" /> <br/><br/>
                <input type="submit" name="submit" value="Submit"/>
            </form>
        </p>
        <h4>Details</h4>
        <p> Total BACKFLSH = <?php echo $count ?> </p>
        <?php echo $db_connect_qad->jsonToTableNice($results);?>
    </div>
    
