<?php

namespace EyefiDb\Api\DailyMeeting;

use PDO;
use PDOException;

class DailyMeeting
{

    protected $db;

    public function __construct($db)
    {

        $this->db = $db;
        $this->nowDate = date("Y-m-d", time());
    }

    public function readOverview()
    {
        $mainQry = "
            SELECT month(createdDate) month, MONTHNAME(createdDate) monthName, count(*) total
            FROM `qa_capaRequest` where fieldServiceSchedulerId != 0
            AND date(createdDate) between '2021-01-01' AND '2021-12-31'
            group by month(createdDate), MONTHNAME(createdDate)
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $fieldServiceComplaints = $query->fetchAll(PDO::FETCH_ASSOC);

        return array(
            "fieldServiceComplaints" => $fieldServiceComplaints
        );
    }

}
