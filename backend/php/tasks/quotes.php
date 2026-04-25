
<html>
    <body>
        <style>
            form {
  position: relative;
}

input {
  width: 300px;
  padding-right: 40px;
}

button {
  position: absolute;
  top: 0;
  right: 0;
}
</style>
    <h2>(tr_hist) Price History for <?php echo ISSET($_GET['search']) ? $_GET['search'] : '' ?></h2>

    <div style="width:400px">
        <form action="quotes.php" method="get">
        Search <input type="search" name="search" placeholder="Search by part number" value="<?php echo ISSET($_GET['search']) ? $_GET['search'] : '' ?>"><br>
        <button type="submit">Submit</button>
        </form>
        <div>
    </body>
</html>
<?php


setlocale(LC_MONETARY, 'en_US');

class TotalShippedOrders
{
    protected $db;


    public function __construct($dbQad)
    {
        $this->dbQad = $dbQad;
        $this->nowDate = date("Y-m-d");
        $this->nowDateTime = date("Y-m-d h:m:s", time());
        $this->todayDate = date("Y-m-d", time());
        $this->nowDate1 = date("Y-m-d H:i:s", time());
    }

    public function test($part)
    {

        
        $mainQry = "
            select tr_price 
                , tr_mtl_std  
                , tr_gl_amt  
                , tr_so_job  
                , tr_date  
                , tr_type  
                , tr_part 
                , tr_line  
                , tr_ship_date  
                , ABS(tr_qty_chg) tr_qty_chg 
                , ABS(tr_price*tr_qty_chg) ext 
                , tr_trnbr
            from tr_hist  
            where tr_domain = 'EYE' AND tr_type = 'ISS-SO' AND tr_part = :part 
            order by tr_date DESC 
		";

        $query = $this->dbQad->prepare($mainQry);
		$query->bindParam(":part", $part);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);
        
        $mainQry = "
            select tr_part
                , MAX(tr_ship_date) last_ship 
                , COUNT(DISTINCT tr_price) total_price_changes 
                , AVG(tr_price) avg_price 
                , MAX(tr_price) max_ext 
                , MIN(tr_price)  min_ext 
                , AVG(ABS(tr_price*tr_qty_chg)) avg_ext 
            from tr_hist  
            where tr_domain = 'EYE' AND tr_type = 'ISS-SO' AND tr_part = :part 
            group by tr_part
            order by tr_date DESC 
		";

        $query = $this->dbQad->prepare($mainQry);
		$query->bindParam(":part", $part);
        $query->execute();
        $results1 = $query->fetchAll(PDO::FETCH_ASSOC);

        $newData = array();
        foreach($results as &$row){
            $row['TR_QTY_CHG'] =  number_format($row['TR_QTY_CHG'], 2);
            $tr_price = '$' . number_format($row['tr_price'], 2);
            $row['tr_gl_amt'] = '$' . number_format($row['tr_gl_amt'], 2);
            $row['tr_mtl_std'] = '$' . number_format($row['tr_mtl_std'], 2);
            $ext = '$' . number_format($row['EXT'], 2);

            $newData[] = array(
                "Sales Order" => $row['tr_so_job'],
                "Line #" => $row['tr_line'],
                "Price" => $tr_price,
                "Shipped Qty" => $row['TR_QTY_CHG'],
                "Ext" => $ext,
                "Ship Date" => $row['tr_ship_date'],
                "Type" => $row['tr_type'],
                "Transaction #" => $row['tr_trnbr']
            );

        }

        
        $newData1 = array();
        foreach($results1 as &$row){
            $row['AVG_EXT'] =  '$' . number_format($row['AVG_EXT'], 2);
            $row['MIN_EXT'] =  '$' . number_format($row['MIN_EXT'], 2);
            $row['MAX_EXT'] =  '$' . number_format($row['MAX_EXT'], 2);
            $row['AVG_PRICE'] =  '$' . number_format($row['AVG_PRICE'], 2);

            $newData1[] = array(
                "Last Ship Date" => $row['LAST_SHIP'],
                "Average Unit Price" => $row['AVG_PRICE'],
                "Min Unit Price" => $row['MIN_EXT'],
                "Max Unit Price" => $row['MAX_EXT'],
                "Total Price Changes" => $row['TOTAL_PRICE_CHANGES'] > 1 ? $row['TOTAL_PRICE_CHANGES'] - 1 : 0,
            );

        }

        return array("results"=>$newData,"results1"=>$newData1 );
    }

    
    
}

use EyefiDb\Databases\DatabaseQad;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new TotalShippedOrders($dbQad);


$search = $_GET['search'];

$data1 = $data->test($search);

if(count($data1) > 0){

    echo $db_connect_qad->jsonToTableNice($data1['results1']);
    echo "<br>";
    
    echo $db_connect_qad->jsonToTableNice($data1['results']);
}else{
    echo "No record found..";
}

?>
