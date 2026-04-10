<?php

class QualityPhotoChecklist
{

	protected $db;
	public $sessionId;

	public function __construct($db, $dbQad)
	{

		$this->db = $db;
		$this->db1 = $dbQad;
		$this->nowDate = date("Y-m-d H:i:s", time());
		$this->hostName = gethostname();
	}

	public function read($woNumber, $partNumber, $serialNumber, $typeOfView)
	{

        $qry = "
            SELECT a.*,concat('https://dashboard.eye-fi.com',b.fileName) url, b.fileName, b.id photoId, b.submittedDate
            FROM eyefidb.qualityPhotoChecklist a
            LEFT JOIN eyefidb.qualityPhotos b ON b.partNumber = a.partNumber AND b.checklist = a.checklist and serialNumber = :serialNumber
            WHERE a.partNumber = :partNumber
            order by a.seq ASC
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
        $stmt->bindParam(':serialNumber', $serialNumber, PDO::PARAM_STR);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);


        if ($typeOfView == 'create') {
            $isDuplicateFound = $this->checkIfPartNumberWoNumberAndSerialNumberExist($woNumber, $partNumber, $serialNumber);

            if ($isDuplicateFound) {
                http_response_code(400);
                return "duplicate entry " . $isDuplicateFound;

                return;
            }
        }

        return $results;
        
    }

	public function checkIfPartNumberWoNumberAndSerialNumberExist($woNumber, $partNumber, $serialNumber)
	{

        $s = trim($serialNumber);
        $serialNumbersToCheck = explode(",",preg_replace('/\s+?\'\s+?/', '\'',$s));
        $serialNumbersToChecks = array_map('trim', $serialNumbersToCheck);
        
        $qry = "
            SELECT serialNumber, partNumber, woNumber
            FROM eyefidb.qualityPhotos 
            WHERE woNumber = :woNumber 
                AND partNumber = :partNumber
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':woNumber', $woNumber, PDO::PARAM_STR);
        $stmt->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach($results as $row){
            if(in_array(trim($row['serialNumber']), $serialNumbersToChecks)){
                return $row['serialNumber'];
            }
        }

        return false;
    }

	public function getOpenChecklists()
	{

        $qry = "
            SELECT serialNumber, woNumber, createdBy, partNumber, submittedDate FROM eyefidb.qualityPhotos group by serialNumber, woNumber, createdBy, partNumber, submittedDate
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function uploadPhoto($obj)
        {
            
        $path = $obj['location'];
        $fileBrowse = $obj['fileBrowse'];
        $subLocation = $obj['subLocation'];

        if (isset($_FILES) && (count($_FILES)) > 0) {

            $filename = basename($_FILES['file']['name']);


            $time = time();
            $file1 = $_FILES['file']['tmp_name'];
            $base_dir = $path;
            $target = $base_dir . $time . "_" . $filename;

            $move = move_uploaded_file($file1, $target);

            $link = $subLocation . $time . "_" . $filename;


            if ($move) {

                return array('status' => 'success', 'message' => 'File is valid, and was successfully uploaded','fileName' => $link);
            } else {
                return array('status' => 'error', 'message' => 'Upload failed');
            }

        } else {
            return array('status' => 'warning', 'message' => 'Select File');
        }
    }

    public function save($data)
    {
		$qry = "
            INSERT INTO eyefidb.qualityPhotos(
                woNumber
                , name
                , checklist
                , fileUrl
                , fileName
                , createdDate
                , createdBy
                , submittedDate
                , submitedBy
                , partNumber
                , serialNumber
            ) 
            VALUES(
                :woNumber
                , :name
                , :checklist
                , :fileUrl
                , :fileName
                , :createdDate
                , :createdBy
                , :submittedDate
                , :submitedBy
                , :partNumber
                , :serialNumber
            )
        ";
        $query = $this->db->prepare($qry);
        $query->bindParam(':woNumber', $data['woNumber'], PDO::PARAM_STR);
        $query->bindParam(':name', $data['name'], PDO::PARAM_STR);
        $query->bindParam(':checklist', $data['checklist'], PDO::PARAM_STR);
        $query->bindParam(':fileUrl', $data['fileUrl'], PDO::PARAM_STR);
        $query->bindParam(':fileName', $data['fileName'], PDO::PARAM_STR);
        $query->bindParam(':createdDate', $data['createdDate'], PDO::PARAM_STR);
        $query->bindParam(':createdBy', $data['createdBy'], PDO::PARAM_STR);
        $query->bindParam(':submittedDate', $data['submittedDate'], PDO::PARAM_STR);
        $query->bindParam(':submitedBy', $data['submitedBy'], PDO::PARAM_STR);
        $query->bindParam(':partNumber', $data['partNumber'], PDO::PARAM_STR);
        $query->bindParam(':serialNumber', $data['serialNumber'], PDO::PARAM_STR);
        $query->execute();
        return $this->db->lastInsertId();
    }

    public function removePhoto($data)
    {

        try {

            $this->db->beginTransaction();
            $qry = "
                DELETE FROM eyefidb.qualityPhotos
                WHERE id = :id
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':id', $data['id'], PDO::PARAM_STR);
            $stmt->execute();

            $count = $stmt->rowCount();

            if($count > 0){
                if (is_file($data['fileName']) && @unlink($data['fileName'])) {
                    $this->db->commit();
                }else{
                    $this->db->rollBack();
                }
            }
        }

        catch(Exception $e) {
            echo 'Message: ' .$e->getMessage();
            $this->db->rollBack();
        }

    }

    public function submit($data)
    {
        $qry = "
                UPDATE eyefidb.qualityPhotos
                SET submittedDate = :submittedDate,
                    submitedBy = :submitedBy
                WHERE woNumber = :woNumber 
                    and serialNumber = :serialNumber
                    and partNumber = :partNumber
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':woNumber', $data['woNumber'], PDO::PARAM_STR);
            $stmt->bindParam(':serialNumber', $data['serialNumber'], PDO::PARAM_STR);
            $stmt->bindParam(':partNumber', $data['partNumber'], PDO::PARAM_STR);
            $stmt->bindParam(':submittedDate', $data['submittedDate'], PDO::PARAM_STR);
            $stmt->bindParam(':submitedBy', $data['submitedBy'], PDO::PARAM_STR);
            $stmt->execute();

            $count = $stmt->rowCount();

            if($count > 0){
                return true;
            }

            return false;
    }
	
	public function __destruct()
	{
		$this->db = null;
	}
}
