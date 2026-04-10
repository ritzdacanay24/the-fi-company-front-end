<?php

class ShortageRequest
{

    protected $db;
    public $sessionId;

    public function __construct($db, $dbQad)
    {

        $this->db = $db;
        $this->db1 = $dbQad;

        $this->nowDate = date("Y-m-d H:i:s", time());
        $this->dateNow = date("Y-m-d", time());
    }

    public function AuthUsers()
    {
        return (object) array(
            'buyers' => array(
                'Marti Cowan', 'Odulon Fierros', 'Amber Clark', 'Mike Brown', 'Bryon Jones', 'Ritz Dacanay'
            ),
            'supplyCompleteBtn' => array(
                'Mike Brown', 'Amber Clark', 'Marti Cowan', 'Odulon Fierros', 'Bryon Jones'
            ),
            'receivingCompleteBtn' => array(
                'Bryon Jones', 'Marti Cowan', 'Adrian Nellish', 'Amber Clark', 'Darren McGraw', 'Mike Brown', 'Bryon Jones', 'Kevin Wiggins', 'Greg Nix'
            ),
            'cellEdit' => array(
                'Mike Brown', 'Amber Clark', 'Marti Cowan', 'Scott Zilio', 'Bryon Jones', 'Ritz Dacanay'
            ),
            'deliverCompleteBtn' => array(
                'Odulon Fierros', 'Marti Cowan', 'Amber Clark', 'Mike Brown', 'Bryon Jones', 'Kevin Wiggins'
            )
        );
    }

    public function AuthUserCheck($accessSection)
    {
        if (in_array($this->userInfo->userName, $accessSection)) {
            return true;
        }
        return false;
    }

    public function SaveCellUpdate($data, $column)
    {

        if (!$this->AuthUserCheck($this->AuthUsers()->cellEdit)) {
            throw new PDOException("Access Denied. ");
        }

        $qry = "
				UPDATE eyefidb.shortageRequest
				SET buyer = :buyer
					, woNumber = :woNumber
					, poNumber = :poNumber
					, supplier = :supplier
				WHERE id = :id
			";
        $query = $this->db->prepare($qry);
        $query->bindParam(':buyer', $data['buyer'], PDO::PARAM_STR);
        $query->bindParam(':woNumber', $data['woNumber'], PDO::PARAM_STR);
        $query->bindParam(':poNumber', $data['poNumber'], PDO::PARAM_STR);
        $query->bindParam(':supplier', $data['supplier'], PDO::PARAM_STR);
        $query->bindParam(':id', $data['id'], PDO::PARAM_INT);
        $query->execute();

        if ($column == 'poNumber') {
            $comments = "
					SELECT purchaseOrder
						, customerPartNumber
						, graphicsWorkOrder
						, max(c.name) status
					FROM eyefidb.graphicsSchedule a
					LEFT JOIN eyefidb.graphicsQueues c
						ON c.queueStatus = a.status
					WHERE a.active = 1
						AND purchaseOrder = :purchaseOrder
						AND customerPartNumber = :customerPartNumber
					GROUP BY purchaseOrder
						, customerPartNumber
						, graphicsWorkOrder
				";
            $query = $this->db->prepare($comments);
            $query->bindParam(':purchaseOrder', $data['poNumber'], PDO::PARAM_STR);
            $query->bindParam(':customerPartNumber', $data['partNumber'], PDO::PARAM_STR);
            $query->execute();
            $commentInfo = $query->fetch();

            if ($commentInfo) {
                return $commentInfo;
            } else {
                return "No Status found";
            }
        }
    }

    public function DeliveredCompleted($data)
    {
        if (!$this->AuthUserCheck($this->AuthUsers()->deliverCompleteBtn)) {
            throw new PDOException("Access Denied. ");
        }

        $qry = "
				UPDATE eyefidb.shortageRequest
				SET deliveredCompleted = :deliveredCompleted
					, deliveredCompletedBy = :deliveredCompletedBy
				WHERE id = :id
			";
        $query = $this->db->prepare($qry);
        $query->bindParam(':deliveredCompleted', $this->nowDate, PDO::PARAM_STR);
        $query->bindParam(':deliveredCompletedBy', $this->sessionId, PDO::PARAM_INT);
        $query->bindParam(':id', $data['id'], PDO::PARAM_INT);
        $query->execute();
    }

    public function ReceivingCompleted($data)
    {

        if (!$this->AuthUserCheck($this->AuthUsers()->receivingCompleteBtn)) {
            throw new PDOException("Access Denied. ");
        }

        $qry = "
				UPDATE eyefidb.shortageRequest
				SET receivingCompleted = :receivingCompleted
					, receivingCompletedBy = :receivingCompletedBy
				WHERE id = :id
			";
        $query = $this->db->prepare($qry);
        $query->bindParam(':receivingCompleted', $this->nowDate, PDO::PARAM_STR);
        $query->bindParam(':receivingCompletedBy', $this->sessionId, PDO::PARAM_INT);
        $query->bindParam(':id', $data['id'], PDO::PARAM_INT);
        $query->execute();
    }

    public function SupplyCompleted($data)
    {

        if (!$this->AuthUserCheck($this->AuthUsers()->supplyCompleteBtn)) {
            throw new PDOException("Access Denied. ");
        }

        $qry = "
				UPDATE eyefidb.shortageRequest
				SET supplyCompleted = :supplyCompleted
					, supplyCompletedBy = :supplyCompletedBy
				WHERE id = :id
			";
        $query = $this->db->prepare($qry);
        $query->bindParam(':supplyCompleted', $this->nowDate, PDO::PARAM_STR);
        $query->bindParam(':supplyCompletedBy', $this->sessionId, PDO::PARAM_INT);
        $query->bindParam(':id', $data['id'], PDO::PARAM_INT);
        $query->execute();
    }
    
    public function searchById($jobNumber)
    {
        $mainQry = "
            select a.id 
                , a.jobNumber 
                , a.woNumber 
                , a.lineNumber 
                , a.dueDate 
                , a.reasonPartNeeded 
                , a.priority 
                , a.partNumber 
                , a.qty 
                , a.createdBy 
                , a.createdDate 
                , a.active 
                , a.status 
                , a.comments 
                , concat(b.first, ' ', b.last) fullName
                , a.partDesc
                , a.buyer
                , a.assemblyNumber
                , a.supplyCompleted
                , a.receivingCompleted
                , a.graphicsShortage
                , a.poNumber
                , a.supplier
                , a.deliveredCompleted
                , case when a.mrfId IS NULL then '' else a.mrfId end mrfId
            from eyefidb.shortageRequest a
            LEFT JOIN db.users b ON b.id = a.createdBy
            WHERE a.jobNumber = :jobNumber
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(':jobNumber', $jobNumber, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function GetShortageLog($type)
        {

        $comments = "
				SELECT a.orderNum
					, a.comments
					, a.createdDate
					, date(a.createdDate) byDate
				FROM eyefidb.comments a
				INNER JOIN (
					SELECT orderNum
						, MAX(id) id
						, MAX(date(createdDate)) createdDate
					FROM eyefidb.comments
					GROUP BY orderNum
				) b ON a.orderNum = b.orderNum AND a.id = b.id
				WHERE type = 'Shortage Request'
			";
        $query = $this->db->prepare($comments);
        $query->execute();
        $commentInfo = $query->fetchAll(PDO::FETCH_ASSOC);

        $mainQry = "
				select a.id 
					, a.jobNumber 
					, a.woNumber 
					, a.lineNumber 
					, a.dueDate 
					, a.reasonPartNeeded 
					, a.priority 
					, a.partNumber 
					, a.qty 
					, a.createdBy 
					, a.createdDate 
					, a.active 
					, a.status 
					, a.comments 
					, concat(b.first, ' ', b.last) fullName
					, a.partDesc
					, a.buyer
					, a.assemblyNumber
					, a.supplyCompleted
					, a.receivingCompleted
					, a.graphicsShortage
					, a.poNumber
					, a.supplier
					, c.status statusGraphics
					, c.graphicsWorkOrder graphicsWorkOrder
					, a.deliveredCompleted
					, case when a.mrfId IS NULL then '' else a.mrfId end mrfId
				from eyefidb.shortageRequest a
				LEFT JOIN db.users b ON b.id = a.createdBy
				LEFT JOIN (
					SELECT purchaseOrder
						, customerPartNumber
						, max(c.name) status
						, max(graphicsWorkOrder) graphicsWorkOrder
					FROM eyefidb.graphicsSchedule a
					LEFT JOIN eyefidb.graphicsQueues c
						ON c.queueStatus = a.status
						
					WHERE a.active = 1
					GROUP BY purchaseOrder
						, customerPartNumber
				) c ON c.purchaseOrder = a.poNumber
					AND c.customerPartNumber = a.partNumber
				WHERE a.active = 1
					
				
			";

        if ($type == 'shortageLogCompleted') {
            $mainQry .= " AND a.receivingCompleted IS NOT NULL ";
        }

        if ($type == 'shortageLog') {
            $mainQry .= " AND a.receivingCompleted IS NULL ";
            $mainQry .= " AND a.graphicsShortage = 'false' ";
        }

        if ($type == 'graphicsShortageLog') {
            $mainQry .= " AND a.receivingCompleted IS NULL ";
            $mainQry .= " AND a.graphicsShortage = 'true' ";
        }


        $mainQry .= " ORDER BY a.priority DESC, a.dueDate ASC ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $details = $query->fetchAll(PDO::FETCH_ASSOC);

        $obj = array();
        foreach ($details as $row) {
            $row['COMMENTSCLASS'] = false;
            $row['COMMENTSMAX'] = '';
            foreach ($commentInfo as $row1) {
                if ($row['id'] == $row1['orderNum']) {
                    ///color the comments 
                    if ($row1['byDate'] == $this->dateNow) {
                        $row['COMMENTSCLASS'] = "text-success";
                    } else {
                        $row['COMMENTSCLASS'] = "text-info";
                    }

                    $row['COMMENTSMAX'] = $row1['comments'];
                }
            }
            $obj[] = $row;
        }

        $o = array(
            "details" => $obj,
            "authUsers" => $this->authUsers()->supplyCompleteBtn,
            "userInfo" => $this->userInfo->userName
        );

        return $o;
    }

    public function ReadByItem($item)
    {

        $mainQry = "
				select sum(b.in_qty_oh) - sum(b.in_qty_all) totalAvail 
					, sum(b.in_qty_oh) onHandQty
					, max(concat(desc1, desc2)) fullDesc
					, b.in_part in_part
				from in_mstr b 
				LEFT JOIN (
					SELECT pt_part
						, max(pt_desc1) desc1
						, max(pt_desc2) desc2
					FROM pt_mstr
					WHERE pt_domain = 'EYE'
					GROUP BY pt_part
				) c ON c.pt_part = b.in_part
				WHERE b.in_part = :part 
					AND b.in_domain = 'EYE'
				GROUP BY in_part
				WITH (NOLOCK)
			";
        $query = $this->db1->prepare($mainQry);
        $query->bindParam(':part', $item, PDO::PARAM_STR);
        $query->execute();
        $locationDet = $query->fetch();


        $obj['checking'] = false;
        $obj['message'] = 'Item Not Found In QAD';
        $obj['messageClass'] = 'text-danger';
        $obj['totalAvailable'] = 0;
        $obj['qtyOnHand'] = 0;
        $obj['fullDesc'] = '';

        if ($locationDet) {
            $obj['message'] = 'Item Found In QAD';
            $obj['messageClass'] = 'text-success';
            $obj['totalAvailable'] = number_format((float) $locationDet['TOTALAVAIL'], 2, '.', '');
            $obj['qtyOnHand'] = number_format((float) $locationDet['ONHANDQTY'], 2, '.', '');
            $obj['fullDesc'] = $locationDet['FULLDESC'];
        }

        return $obj;
    }

    public function CheckIfMRAlreadyInshortageLog($mrfid, $partNumber)
    {

        $mainQry = "
				select a.partNumber 
					, a.mrfId
				from eyefidb.shortageRequest a
				WHERE a.active = 1
					AND a.mrfId = :mrfid1
					AND a.partNumber  = :partNumber
			";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':mrfid1', $mrfid, PDO::PARAM_STR);
        $query->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
        $query->execute();
        $findResults = $query->fetch();

        if ($findResults) {
            return true;
        } else {
            return false;
        }
    }

    public function SaveMain($post, $details, $pageUpdatedFrom = '')
    {

        $this->db->beginTransaction();

        $jobNumber = time() . '-' . $this->sessionId;

        $mrfId = ISSET($post['mrfId']) && $post['mrfId'] ? $post['mrfId'] : false;
        if ($mrfId) {
            $checkMRF = $this->CheckIfMRAlreadyInshortageLog($mrfId, $details[0]['partNumber']);
            if ($checkMRF) {
                throw new PDOException("MR Shortage Already created.");
            }
        }
        
        try {

            $qry = "
					INSERT INTO eyefidb.shortageRequest(
						woNumber
						, lineNumber
						, dueDate
						, reasonPartNeeded
						, priority
						, partNumber
						, qty
						, createdBy
						, jobNumber 
						, comments
						, partDesc
						, assemblyNumber
						, graphicsShortage
						, mrfId
						, mrf_line
					) 
					VALUES(
						:woNumber
						, :lineNumber
						, :dueDate
						, :reasonPartNeeded
						, :priority
						, :partNumber
						, :qty
						, :createdBy
						, :jobNumber
						, :comments
						, :partDesc
						, :assemblyNumber
						, :graphicsShortage
						, :mrfId
						, :mrf_line
					)
				";
            $query = $this->db->prepare($qry);

            $obj = array();
            foreach ($details as $item) {

                //MRF
                $mrf_line = ISSET($item['mrf_line']) && $item['mrf_line'] && !empty($item['mrf_line']) ? $item['mrf_line'] : null;

                $query->bindParam(':woNumber', $post['woNumber'], PDO::PARAM_STR);
                $query->bindParam(':lineNumber', $post['lineNumber'], PDO::PARAM_STR);
                $query->bindParam(':dueDate', $post['dueDate'], PDO::PARAM_STR);
                $query->bindParam(':reasonPartNeeded', $post['reasonPartNeeded'], PDO::PARAM_STR);
                $query->bindParam(':priority', $post['priority'], PDO::PARAM_STR);
                $query->bindParam(':partNumber', $item['partNumber'], PDO::PARAM_STR);
                $query->bindParam(':qty', $item['qty'], PDO::PARAM_STR);
                $query->bindParam(':createdBy', $this->sessionId, PDO::PARAM_STR);
                $query->bindParam(':jobNumber', $jobNumber, PDO::PARAM_STR);
                $query->bindParam(':comments', $item['comments'], PDO::PARAM_STR);
                $query->bindParam(':partDesc', $item['fullDesc'], PDO::PARAM_STR);
                $query->bindParam(':assemblyNumber', $post['assemblyNumber'], PDO::PARAM_STR);
                $query->bindParam(':graphicsShortage', $item['graphicsShortage'], PDO::PARAM_STR);
                $query->bindParam(':mrfId', $post['mrfId'], PDO::PARAM_STR);
                $query->bindParam(':mrf_line', $mrf_line, PDO::PARAM_STR);
                $query->execute();
                $id = $this->db->lastInsertId();

                $obj[] = array(
                    'woNumber' => $post['woNumber'], 
                    'lineNumber' => $post['lineNumber'], 
                    'dueDate' => $post['dueDate'], 
                    'reasonPartNeeded' => $post['reasonPartNeeded'], 
                    'priority' => $post['priority'], 
                    'partNumber' => $item['partNumber'], 
                    'qty' => $item['qty'], 
                    'fullName' => $post['userCreatedBy'], 
                    'createdDate' => $this->nowDate, 
                    'jobNumber' => $jobNumber, 
                    'comments' => $item['comments'], 
                    'partDesc' => $item['fullDesc'], 
                    'assemblyNumber' => $post['assemblyNumber'], 
                    'graphicsShortage' => $item['graphicsShortage'], 
                    'id' => $id, 
                    'qtyOnHand' => $item['qtyOnHand'], 
                    'mrfId' => $post['mrfId'],
                    'mrf_line' => $mrf_line
                );
            }

            $this->db->commit();

            return $obj;
        } catch (PDOException $e) {
            $this->db->rollBack();
        }
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
