<?php
namespace EyefiDb\Api\userTrans;
use PDO;

class UserTrans
{

    protected $db;

    public function __construct($db)
    {

        $this->db = $db;
    }

    public function getUserTransactionsByFieldName($fieldName, $so)
    {
        $qry = "
            SELECT a.id
                , a.field
                , a.o
                , a.n 
                , a.createDate 
                , a.comment 
                , a.userId 
                , a.so 
                , a.type 
                , a.partNumber
                , a.reasonCode
                , concat(b.first, ' ', b.last) createdByFullName
            FROM eyefidb.userTrans a
            LEFT JOIN db.users b ON a.userId = b.id
            WHERE a.field = :field AND a.so = :so
            ORDER BY a.id DESC
        ";
        $query = $this->db->prepare($qry);		
        $query->bindParam(':field', $fieldName, PDO::PARAM_STR);
        $query->bindParam(':so', $so, PDO::PARAM_STR);
        $query->execute();
        return $query;
    }
}

