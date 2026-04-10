<?php

class QirOverall
{

    protected $db;

    public function __construct($db)
    {

        $this->db = $db;
        $this->nowDate = date("Y-m-d H:i:s", time());
    }

    public function ReadAll($customerName, $type, $dateFrom, $dateTo, $partNumber)
    {

        $mainQry = "
				select count(*) hits
					, failureType 
				from eyefidb.qa_capaRequest 
                where id != 0 
			";

        if ($customerName != 'All') {
            $mainQry .= " AND customerName = '" . $customerName . "' ";
        }
        if ($type != 'All Types') {
            $mainQry .= " AND type1 = '" . $type . "' ";
        }
        if ($dateFrom != 'All') {
            $mainQry .= " AND date(createdDate) between '" . $dateFrom . "' AND '" . $dateTo . "'";
        }
        if ($partNumber != 'All') {
            $mainQry .= " AND eyefiPartNumber = '" . $partNumber . "' ";
        }

        $mainQry .= " group by failureType HAVING  count(*) >= 20";
        $mainQry .= " ORDER BY count(*) DESC ";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        $failureType = array();
        foreach ($result as $row) {
            $failureType['name'][] = $row['failureType'];
            $failureType['hits'][] = $row['hits'];
        }

        // $mainQry = "
		// 		select count(*) hits
		// 			, sum(case when status = 'Open' then 1 else 0 end) openStatus
		// 			, ( (count(*) - sum(case when status = 'Open' then 1 else 0 end)) / count(*) ) * 100 percent
		// 		from eyefidb.qa_capaRequest
		// 		where id != 0 
		// 	";

        // if ($customerName != 'All') {
        //     $mainQry .= " AND customerName = '" . $customerName . "' ";
        // }
        // if ($type != 'All Types') {
        //     $mainQry .= " AND type1 = '" . $type . "' ";
        // }
        // if ($dateFrom != 'All') {
        //     $mainQry .= " AND date(createdDate) between '" . $dateFrom . "' AND '" . $dateTo . "'";
        // }
        // if ($partNumber != 'All') {
        //     $mainQry .= " AND eyefiPartNumber = '" . $partNumber . "' ";
        // }

        // $query = $this->db->prepare($mainQry);
        // $query->execute();
        // $overallDetails = $query->fetch();

        // $mainQry = "
		// 		select count(*) hits
		// 			, type1 
		// 			, ( (count(*) - sum(case when status = 'Open' then 1 else 0 end)) / count(*) ) * 100 percent
		// 		from eyefidb.qa_capaRequest 
		// 		where id != 0 
		// 	";

        // if ($customerName != 'All') {
        //     $mainQry .= " AND customerName = '" . $customerName . "' ";
        // }
        // if ($type != 'All Types') {
        //     $mainQry .= " AND type1 = '" . $type . "' ";
        // }
        // if ($dateFrom != 'All') {
        //     $mainQry .= " AND date(createdDate) between '" . $dateFrom . "' AND '" . $dateTo . "'";
        // }
        // if ($partNumber != 'All') {
        //     $mainQry .= " AND eyefiPartNumber = '" . $partNumber . "' ";
        // }

        // $mainQry .= " group by type1 ORDER BY count(*) DESC ";

        // $query = $this->db->prepare($mainQry);
        // $query->execute();
        // $type1 = $query->fetchAll(PDO::FETCH_ASSOC);

        // $mainQry = "
		// 		select count(*) hits
		// 			, customerName name
		// 		from eyefidb.qa_capaRequest 
		// 		where id != 0 
		// 	";

        // if ($customerName != 'All') {
        //     $mainQry .= " AND customerName = '" . $customerName . "' ";
        // }
        // if ($type != 'All Types') {
        //     $mainQry .= " AND type1 = '" . $type . "' ";
        // }
        // if ($dateFrom != 'All') {
        //     $mainQry .= " AND date(createdDate) between '" . $dateFrom . "' AND '" . $dateTo . "'";
        // }
        // if ($partNumber != 'All') {
        //     $mainQry .= " AND eyefiPartNumber = '" . $partNumber . "' ";
        // }

        // $mainQry .= " group by customerName ";
        // $mainQry .= " ORDER BY count(*) DESC ";

        // $query = $this->db->prepare($mainQry);
        // $query->execute();
        // $customers = $query->fetchAll(PDO::FETCH_ASSOC);


        // $mainQry = "
		// 		select *
		// 		from eyefidb.qa_capaRequest 
		// 		where id != 0 
		// 	";

        // if ($customerName != 'All') {
        //     $mainQry .= " AND customerName = '" . $customerName . "' ";
        // }
        // if ($type != 'All Types') {
        //     $mainQry .= " AND type1 = '" . $type . "' ";
        // }
        // if ($dateFrom != 'All') {
        //     $mainQry .= " AND date(createdDate) between '" . $dateFrom . "' AND '" . $dateTo . "'";
        // }
        // if ($partNumber != 'All') {
        //     $mainQry .= " AND eyefiPartNumber = '" . $partNumber . "' ";
        // }

        // $query = $this->db->prepare($mainQry);
        // $query->execute();
        // $details = $query->fetchAll(PDO::FETCH_ASSOC);


        // $customersDetails = array();
        // foreach ($customers as $row) {
        //     $customersDetails['name'][] = $row['name'];
        //     $customersDetails['hits'][] = $row['hits'];
        // }

        // $mainQry = "
		// 		select customerName name
		// 		from eyefidb.qa_capaRequest 
		// 		WHERE customerName IS NOT NULL and customerName != ''
		// 		group by customerName
		// 		ORDER BY customerName DESC
		// 	";

        // $query = $this->db->prepare($mainQry);
        // $query->execute();
        // $customersNames = $query->fetchAll(PDO::FETCH_ASSOC);

        $obj = array(
            "failureType" => $failureType, 
            // "overallDet" => $overallDetails, 
            // "type1" => $type1, 
            // "customers" => $customersDetails, 
            // "customersNames" => $customersNames, 
            // "details" => $details
        );

        return $obj;
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
