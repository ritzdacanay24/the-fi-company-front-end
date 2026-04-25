<?php

namespace EyefiDb\Api\Upload;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class Upload
{

	protected $db;
	public $sessionId;
	public $path;
	public $fileBrowse;
	public $field;
	public $uniqueId;
	public $mainId;
	public $partNumber;
	public $fileName;

	public function __construct($db)
	{

		$this->db = $db;
		$this->nowDate = date(" Y-m-d H:i:s", time());

		$this->hostName = gethostname();
		$this->rootPath = $_SERVER['DOCUMENT_ROOT'];
	}

	public function getAttachments($id, $fieldName, $folderName)
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

			where a.uniqueId = :id
			AND a.field = :fieldName
		";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(':id', $id, PDO::PARAM_INT);
		$query->bindParam(':fieldName', $fieldName, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetchAll(PDO::FETCH_ASSOC);

		foreach ($results as &$row) {
			$fileName = $row["fileName"];
			$row['folderName'] = $folderName;
			$row['field'] = $fieldName;
			$row['caption'] =  "Attachment added by " . $row['createdByFullName'];
			$row['fileLocation'] = "/var/www/html/attachments/$folderName/$fileName";
			$row['src'] = "https://dashboard.eye-fi.com/attachments/$folderName/$fileName";
		}

		return $results;
	}

	public function deleteFile()
	{

		try {

			$this->db->beginTransaction();

			$fileLocation = $this->fileLocation;

			$qry = "
				DELETE FROM eyefidb.attachments
				WHERE id = :id
				limit 1
			";
			$stmt = $this->db->prepare($qry);
			$stmt->bindParam(':id', $this->id, PDO::PARAM_INT);
			$stmt->execute();
			$count = $stmt->rowCount();
			
			$obj = array();
			if ($count) {
				// Use unlink() function to delete a file  
				if (!unlink($fileLocation)) {
					$obj =  array('status' => 'warning', 'message' => "$fileLocation cannot be deleted due to an error", 'status_code' => 0);
				} else {
					$obj =  array('status' => 'success', 'message' => "File has been deleted", 'status_code' => 1);
				}
			} else {
				$obj = array('status' => 'warning', 'message' => "$fileLocation Cannot be deleted due to an error--", 'status_code' => 0);
			}

			$this->db->commit();
			return $obj;
		} catch (Exception $e) {
			$this->db->rollBack();
			return array('status' => 'error', 'message' => $e->getMessage(), 'status_code' => 0);
		}
	}

	public function uploadFile($obj)
	{

		try {

			$this->db->beginTransaction();

			$field = $obj['field'];
			$uniqueId = $obj['uniqueId'];
			$path = $obj['location'];
			$mainId = $obj['mainId'];
			$partNumber = $obj['partNumber'];
			$fileBrowse = $obj['fileBrowse'];

			$qry = "
				INSERT INTO eyefidb.attachments(
					fileName
					, link
					, createdBy
					, createdDate
					, field
					, uniqueId
					, fileSize
					, fileSizeConv
					, ext
					, mainId
					, partNumber
					, width
					, height
				) 
				values(
					:fileName
					, :link
					, :createdBy
					, :createdDate
					, :field
					, :uniqueId
					, :fileSize
					, :fileSizeConv
					, :ext
					, :mainId
					, :partNumber
					, :width
					, :height
				)
			";

			function formatSizeUnits($bytes)
			{
				if ($bytes >= 1073741824) {
					$bytes = number_format($bytes / 1073741824, 2) . ' GB';
				} elseif ($bytes >= 1048576) {
					$bytes = number_format($bytes / 1048576, 2) . ' MB';
				} elseif ($bytes >= 1024) {
					$bytes = number_format($bytes / 1024, 2) . ' KB';
				} elseif ($bytes > 1) {
					$bytes = $bytes . ' bytes';
				} elseif ($bytes == 1) {
					$bytes = $bytes . ' byte';
				} else {
					$bytes = '0 bytes';
				}

				return $bytes;
			}

			function image_fix_orientation($filename)
			{
				if (function_exists('exif_read_data')) {
					$exif = exif_read_data($filename);
					if (!empty($exif['Orientation'])) {
						$image = imagecreatefromjpeg($filename);
						switch ($exif['Orientation']) {
							case 3:
								$image = imagerotate($image, 180, 0);
								break;

							case 6:
								$image = imagerotate($image, -90, 0);
								break;

							case 8:
								$image = imagerotate($image, 90, 0);
								break;
							default:
								$image = $image;
						}

						imagejpeg($image, $filename, 90);
					}
				}
			}

			if (isset($_FILES) && (count($_FILES)) > 0) {

				foreach ($_FILES as $key => $file) {

					$filename = basename($_FILES[$fileBrowse]['name']);

					$image_info = getimagesize($_FILES[$fileBrowse]['tmp_name']);
					$image_width = $image_info[0];
					$image_height = $image_info[1];

					$_FILESize = $_FILES[$fileBrowse]['size'];
					$_FILESizeConv = formatSizeUnits($_FILESize);

					$time = time();
					//echo '<pre>';print_r($filename);            
					$ext = pathinfo($filename, PATHINFO_EXTENSION);
					$file1 = $_FILES[$fileBrowse]['tmp_name'];
					$base_dir = $path;
					$new_file_name = $time . '.' . $ext;
					$target = $base_dir . $time . "_" . $filename;


					//image_fix_orientation($_FILES[$fileBrowse]['tmp_name']);

					$move = move_uploaded_file($file1, $target);


					$f = $time . "_" . $filename;
					$link = $this->hostName . $base_dir . $time . "_" . $filename;


					if ($move) {
						$stmt = $this->db->prepare($qry);
						$stmt->bindParam(':fileName', $f, PDO::PARAM_STR);
						$stmt->bindParam(':link', $link, PDO::PARAM_STR);
						$stmt->bindParam(':createdBy', $this->sessionId, PDO::PARAM_INT);
						$stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
						$stmt->bindParam(':field', $field, PDO::PARAM_STR);
						$stmt->bindParam(':uniqueId', $uniqueId, PDO::PARAM_STR);
						$stmt->bindParam(':fileSize', $_FILESize, PDO::PARAM_STR);
						$stmt->bindParam(':fileSizeConv', $_FILESizeConv, PDO::PARAM_STR);
						$stmt->bindParam(':ext', $ext, PDO::PARAM_STR);
						$stmt->bindParam(':mainId', $mainId, PDO::PARAM_STR);
						$stmt->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
						$stmt->bindParam(':width', $image_width, PDO::PARAM_INT);
						$stmt->bindParam(':height', $image_height, PDO::PARAM_INT);
						$stmt->execute();
						$_FILES[$fileBrowse]['lastInsertId'] = $this->db->lastInsertId();
					}
				}

				if ($move) {

					$obj = array('status' => 'success', 'message' => 'File is valid, and was successfully uploaded', 'data' => $_FILES, 'status_code' => 1);
				} else {
					$obj = array('status' => 'error', 'message' => 'Upload failed', 'status_code' => 0);
				}
			} else {
				$obj = array('status' => 'warning', 'message' => 'Select File', 'status_code' => 0);
			}

			$this->db->commit();
			return array('details' => $obj);
		} catch (Exception $e) {
			$this->db->rollBack();
			return array('status' => 'error', 'message' => $e->getMessage(), 'status_code' => 0);
		}
	}

	/**
	 * Automatically closes the mysql connection
	 * at the end of the program.
	 */
	public function __destruct()
	{
		$this->db = null;
	}
}
