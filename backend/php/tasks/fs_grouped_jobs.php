<?php

class test
{

    protected $db;

    public function __construct($db)
    {

        $this->db1 = $db;
    }

    public function getJobs()
    {
        $mainQry = "
            SELECT a.id, 
                a.property, 
                a.RequestDate,
                b.id ticket_id
            FROM eyefidb.fs_scheduler a
            left join eyefidb.fs_workOrder b ON b.fs_scheduler_id = a.id
            where group_id = 10
		";
        $query = $this->db1->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        return $results;
    }

    public function getTripTypes()
    {
        $mainQry = "
            SELECT category
            FROM eyefidb.fs_trip_settings
		";
        $query = $this->db1->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);


        return $results;
    }


    public function getTripExpenses()
    {
        $mainQry = "
        SELECT a.category, ext_cost, workOrderId
        FROM eyefidb.fs_trip_settings a
        left join (
        select workOrderId, name, sum(cost) ext_cost 
        from fs_workOrderTrip 
        where workOrderId IN (2416, 2414, 2418) 
        group by workOrderId, name
        ) b ON b.name = a.category
		";
        $query = $this->db1->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);


        return $results;
    }

    public function getLaborExpenses()
    {
        $mainQry = "
        SELECT a.category, ext_cost, workOrderId
        FROM eyefidb.fs_trip_settings a
        left join (
        select workOrderId, name, sum(cost) ext_cost 
        from fs_workOrderTrip 
        where workOrderId IN (2416, 2414, 2418) 
        group by workOrderId, name
        ) b ON b.name = a.category
		";
        $query = $this->db1->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);


        return $results;
    }


    public function run()
    {

        $jobs = $this->getJobs();
        $trip_settings = $this->getTripTypes();
        $getTripExpenses = $this->getTripExpenses();

        // $in_array = array();
        // foreach ($jobs as $row) {
        //     $in_array[] = $row['SOD_NBR'] . '-' . $row['SOD_LINE'];
        // }

        // $in = "'" . implode("','", $in_array) . "'";
        foreach ($trip_settings as &$row) {
            $total = 0;
            foreach ($jobs as $job) {
                $row[$job['ticket_id']] = 0;
                foreach ($getTripExpenses as $getTripExpensesRow) {
                    if (
                        $row['category'] == $getTripExpensesRow['category'] &&
                        $job['ticket_id'] == $getTripExpensesRow['workOrderId']
                    )
                        $row[$job['ticket_id']] = $getTripExpensesRow['ext_cost'];
                }
                $total += $row[$job['ticket_id']];
            }
            $row['Total'] = $total;
        }

        return $trip_settings;

    }
}


use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();


$data = new test($db);
$r = $data->run();

echo $jsonText = $db_connect->jsonToTable($r);
echo $db_connect->jsonToDebug($jsonText);
