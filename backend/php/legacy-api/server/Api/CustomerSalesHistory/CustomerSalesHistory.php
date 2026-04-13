<?php

namespace EyefiDb\Api\CustomerSalesHistory;

use PDO;

class CustomerSalesHistory
{

    protected $dbQad;

    public function __construct($dbQad)
    {

        $this->dbQad = $dbQad;
    }

    public function getData()
    {
        $qry = "
            select top 1000 cmh_cust, cmh_tot_cost, cmh_year
            from cmh_hist
            where cmh_domain = 'EYE'
            WITH (NOLOCK)
        ";
        $query = $this->dbQad->prepare($qry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        return $results;

    }
}
