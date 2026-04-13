<?php

namespace EyefiDb\Api\shared\transactions;

use PDO;

class Transactions
{

    protected $dbQad;

    public function __construct($dbQad)
    {

        $this->dbQad = $dbQad;
    }

    public function getTransactionByPartNumber($partNumber)
    {
        $qry = "
            select tr_date
                , tr_time
                , FLOOR( tr_time / 86400 ) AS DAYS
                , FLOOR( ( tr_time / 3600 ) - FLOOR( tr_time / 86400 ) * 24 ) AS HOURS
                , FLOOR( ( tr_time / 60 ) - FLOOR( tr_time / 3600 ) * 60 ) AS MINUTES
                , tr_time - FLOOR( tr_time / 60 ) * 60 AS SECONDS
                , tr_trnbr
                , tr_part 
                , tr_loc
                , tr_type
                , tr_nbr
                , tr_trnbr
                , tr_userid
                , tr_line
            from tr_hist 
            WHERE tr_domain = 'EYE'
                AND tr_ref_site = 'eye01'
                AND tr_part = :partNumber
                AND tr_loc IN ('LV200', 'LV300', 'GPHSTOCK', 'GPHTHK01', 'LVFG', 'SHPSTG', 'COIPTWY')

            ORDER BY tr_date DESC
            WITH (NOLOCK)
        ";
        $query = $this->dbQad->prepare($qry);
        $query->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
        $query->execute();
        return $query;
    }
}
