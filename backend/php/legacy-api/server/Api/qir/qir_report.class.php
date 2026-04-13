<?php

class QirReport
{

    protected $db;

    public function __construct($db)
    {

        $this->db = $db;

        $this->nowDate = date(" Y-m-d H:i:s", time());
        $this->todayDate = date("Y-m-d");
    }


    public function getQirReport($dateFrom, $dateTo)
    {

        $mainQry = "
				SELECT a.id
					, a.qir
					, a.capaId
					, a.eyefiPartNumber
					, a.customerPartNumber
					, a.purchaseOrder
					, a.failureType
					, a.issueComment
					, a.stakeholder
					, case when a.assignedTo IS NULL THEN 'Not Assigned' ELSE a.assignedTo END assignedTo
					, a.priority
					, CASE 
						WHEN a.priority = 'Critical'
							THEN 'badge badge-warning'
						WHEN a.priority = 'High'
							THEN 'badge badge-danger'
						WHEN a.priority = 'Medium'
							THEN 'badge badge-info'
						WHEN a.priority = 'Low'
							THEN 'badge badge-light'
					END priorityClass
					, a.createdDate
					, date(a.createdDate) createDt
					, a.assignedDate 
					, a.respondBy
					, a.respondBy respondByDate
					, a.type
					, CASE WHEN a.email IS NOT NULL AND a.email != '' THEN a.email WHEN installer IS NOT NULL THEN a.installer ELSE concat(b.first, ' ', b.last) END userName 
					, a.active
					, a.status
					, a.completedDate
					, a.completedBy
					, a.verifiedBy
					, a.verifiedDate
					, a.customerName
					, dateDiff(date(now()), a.createdDate) age
					, dateDiff(date(now()), a.assignedTo) assignedToAge
					, a.owner
					, a.requestSubmitted
					, a.qtyAffected
					, a.source
					, a.customerReportedDate
					, a.componentType
					, a.platformType
					, a.type1
					, a.cl_input_main_id
					, a.qaComments
					, a.supplierName
                    , a.qtyAffected1
					, a.casinoName
					, a.typeSub
					, c.id ncr_id
				FROM eyefidb.qa_capaRequest a
				LEFT JOIN db.users b ON a.createdBy = b.id
				left join eyefidb.ncr c ON c.qir_number = a.qir
				WHERE a.active = 1
					and date(a.createdDate) between :dateFrom AND :dateTo
				ORDER BY a.createdDate DESC
			";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        return $result;
    }


    public function __destruct()
    {
        $this->db = null;
    }
}
