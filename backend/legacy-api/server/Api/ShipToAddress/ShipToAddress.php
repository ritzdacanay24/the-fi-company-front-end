<?php

namespace EyefiDb\Api\ShipToAddress;

class ShipToAddress
{

    protected $db;

    public function __construct($dbQad)
    {
        $this->db = $dbQad;
    }

    public function read($so_ship)
    {
        $mainQry = "
            select *
            from ad_mstr 
            where ad_addr = :so_ship 
                AND ad_domain = 'EYE'
            WITH (NOLOCK)
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(':so_ship', $so_ship, \PDO::PARAM_STR);
        $query->execute();
        return $query->fetch();
    }

    
}
