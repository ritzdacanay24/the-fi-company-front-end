<?php

class Rma
{

	protected $db;
	public $sessionId;

	public function __construct($db)
	{
		$this->db = $db;
		$this->nowDate = date("Y-m-d H:i:s", time());
	}

	public function getById($rmaNumber)
	{

		$mainQry = "
				SELECT a.id 
					, a.rmaNumber 
					, a.type 
					, a.dateIssued 
					, a.customer 
					, a.partNumber 
					, a.qty 
					, a.tag_qn_number 
					, a.returnMethod 
					, a.returnType 
					, a.failureCode 
					, a.customerComment 
					, a.notes 
					, a.createdDate 
					, a.createdBy 
					, a.orderNumber 
					, a.partDescription
					, a.qirNumber 
					, concat(b.first, ' ', b.last) createdByfullName
					, disposition
					, status
				FROM eyefidb.rma a 
				LEFT JOIN db.users b ON b.id = a.createdBy
				WHERE a.rmaNumber = :rmaNumber
				ORDER by id DESC
			";

		$query = $this->db->prepare($mainQry);
		$query->bindParam(':rmaNumber', $rmaNumber, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetch(PDO::FETCH_ASSOC);

		return $result;
	}
	public function ReadAll()
	{

		$mainQry = "
				SELECT a.id 
					, a.rmaNumber 
					, a.type 
					, a.dateIssued 
					, a.customer 
					, a.partNumber 
					, a.qty 
					, a.tag_qn_number 
					, a.returnMethod 
					, a.returnType 
					, a.failureCode 
					, a.customerComment 
					, a.notes 
					, a.createdDate 
					, a.createdBy 
					, a.orderNumber 
					, a.partDescription
					, a.qirNumber 
					, concat(b.first, ' ', b.last) createdByfullName
					, disposition
					, status
				FROM eyefidb.rma a 
				LEFT JOIN db.users b ON b.id = a.createdBy
				WHERE a.active = 1
				ORDER by id DESC
			";

		$query = $this->db->prepare($mainQry);
		$query->execute();
		$result = $query->fetchAll(PDO::FETCH_ASSOC);

		return $result;
	}

	public function delete($post)
	{
		$qry = '
			UPDATE eyefidb.rma
			SET active = :active
			WHERE id = :id
		';
		$stmt = $this->db->prepare($qry);
		$stmt->bindParam(':active', $post['active'], PDO::PARAM_INT);
		$stmt->bindParam(':id', $post['id'], PDO::PARAM_INT);
		$stmt->execute();
	}

	public function Edit($post)
	{
		$qry = '
				UPDATE eyefidb.rma
				SET rmaNumber = :rmaNumber
					, type = :type
					, dateIssued = :dateIssued
					, customer = :customer
					, partNumber = :partNumber
					, qty = :qty
					, tag_qn_number = :tag_qn_number
					, returnMethod = :returnMethod
					, returnType = :returnType
					, failureCode = :failureCode
					, customerComment = :customerComment
					, notes = :notes
					, qirNumber = :qirNumber 
					, orderNumber = :orderNumber 
					, partDescription = :partDescription
					, disposition = :disposition
					, status = :status
				WHERE id = :id
			';
		$stmt = $this->db->prepare($qry);
		$stmt->bindParam(':rmaNumber', $post['rmaNumber'], PDO::PARAM_STR);
		$stmt->bindParam(':type', $post['type'], PDO::PARAM_STR);
		$stmt->bindParam(':dateIssued', $post['dateIssued'], PDO::PARAM_STR);
		$stmt->bindParam(':customer', $post['customer'], PDO::PARAM_STR);
		$stmt->bindParam(':partNumber', $post['partNumber'], PDO::PARAM_STR);
		$stmt->bindParam(':qty', $post['qty'], PDO::PARAM_STR);
		$stmt->bindParam(':tag_qn_number', $post['tag_qn_number'], PDO::PARAM_STR);
		$stmt->bindParam(':returnMethod', $post['returnMethod'], PDO::PARAM_STR);
		$stmt->bindParam(':returnType', $post['returnType'], PDO::PARAM_STR);
		$stmt->bindParam(':failureCode', $post['failureCode'], PDO::PARAM_STR);
		$stmt->bindParam(':customerComment', $post['customerComment'], PDO::PARAM_STR);
		$stmt->bindParam(':notes', $post['notes'], PDO::PARAM_STR);
		$stmt->bindParam(':qirNumber', $post['qirNumber'], PDO::PARAM_STR);
		$stmt->bindParam(':orderNumber', $post['orderNumber'], PDO::PARAM_STR);
		$stmt->bindParam(':partDescription', $post['partDescription'], PDO::PARAM_STR);
		$stmt->bindParam(':disposition', $post['disposition'], PDO::PARAM_STR);
		$stmt->bindParam(':status', $post['status'], PDO::PARAM_STR);
		$stmt->bindParam(':id', $post['id'], PDO::PARAM_STR);
		$stmt->execute();
	}

	public function Add($post)
	{
		$qry = '
				INSERT INTO eyefidb.rma (
					type
					, dateIssued
					, customer
					, partNumber
					, qty
					, tag_qn_number
					, returnMethod
					, returnType
					, failureCode
					, customerComment
					, notes
					, createdDate
					, createdBy
					, qirNumber
					, orderNumber
					, partDescription
					, disposition
					, status
				
				) VALUES (
					:type
					, :dateIssued
					, :customer
					, :partNumber
					, :qty
					, :tag_qn_number
					, :returnMethod
					, :returnType
					, :failureCode
					, :customerComment
					, :notes
					, :createdDate
					, :createdBy
					, :qirNumber
					, :orderNumber
					, :partDescription
					, :disposition
					, :status
				)
			';
		$stmt = $this->db->prepare($qry);
		$stmt->bindParam(':type', $post['type'], PDO::PARAM_STR);
		$stmt->bindParam(':dateIssued', $post['dateIssued'], PDO::PARAM_STR);
		$stmt->bindParam(':customer', $post['customer'], PDO::PARAM_STR);
		$stmt->bindParam(':partNumber', $post['partNumber'], PDO::PARAM_STR);
		$stmt->bindParam(':qty', $post['qty'], PDO::PARAM_STR);
		$stmt->bindParam(':tag_qn_number', $post['tag_qn_number'], PDO::PARAM_STR);
		$stmt->bindParam(':returnMethod', $post['returnMethod'], PDO::PARAM_STR);
		$stmt->bindParam(':returnType', $post['returnType'], PDO::PARAM_STR);
		$stmt->bindParam(':failureCode', $post['failureCode'], PDO::PARAM_STR);
		$stmt->bindParam(':customerComment', $post['customerComment'], PDO::PARAM_STR);
		$stmt->bindParam(':notes', $post['notes'], PDO::PARAM_STR);
		$stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
		$stmt->bindParam(':createdBy', $this->sessionId, PDO::PARAM_STR);
		$stmt->bindParam(':qirNumber', $post['qirNumber'], PDO::PARAM_STR);
		$stmt->bindParam(':orderNumber', $post['orderNumber'], PDO::PARAM_STR);
		$stmt->bindParam(':partDescription', $post['partDescription'], PDO::PARAM_STR);
		$stmt->bindParam(':disposition', $post['disposition'], PDO::PARAM_STR);
		$stmt->bindParam(':status', $post['status'], PDO::PARAM_STR);
		$stmt->execute();
		$id = $this->db->lastInsertId();


		$mainQry = "
				select max(id) id
				from eyefidb.rma a 
				LIMIT 1
			";
		$query = $this->db->prepare($mainQry);
		$query->execute();
		$result = $query->fetch();

		$nextId = 'RMA' . $result['id'];

		$qry = '
				UPDATE eyefidb.rma
				SET rmaNumber = :rmaNumber
				WHERE id = :id
			';
		$stmt = $this->db->prepare($qry);
		$stmt->bindParam(':rmaNumber', $nextId, PDO::PARAM_STR);
		$stmt->bindParam(':id', $id, PDO::PARAM_INT);
		$stmt->execute();

		return $id;
	}
}
