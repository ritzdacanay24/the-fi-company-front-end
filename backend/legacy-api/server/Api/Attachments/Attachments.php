<?php

namespace EyefiDb\Api\Attachments;

use PDO;
use PDOException;

class Attachments
{
    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getAttachments($start)
    {
        $mainQry = "
			select a.fileName
				, a.fileName thumb
				, a.createdBy
				, a.createdDate
				, a.fileSizeConv
				, LOWER(a.ext) ext
				, a.id
				, concat(b.first, ' ', b.last) createdByFullName
				, mainId
                , c.value typeOfReceipt
			from eyefidb.attachments a 
			LEFT JOIN db.users b ON b.id = a.createdBy            
			LEFT JOIN eyefidb.fs_scheduler_settings c ON c.receipt_value = a.mainId AND c.type = 'Receipt Options'
            where a.field = 'Field Service' and a.mainId = 0
            limit " .$start. ", 20
		";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $image = [];
        foreach ($results as &$row) {
            $fileName = $row["fileName"];
            $image[] = "https://dashboard.eye-fi.com/attachments/fieldService/$fileName";
        }

        return $image;
    }
}
