<?php

namespace EyefiDb\Api\VehicleInformation;

use EyefiDb\Api\Upload\Upload;
use EyefiDb\Api\Comment\Comment;


use PDO;
use PDOException;

class VehicleInformation
{

	protected $db;
	public $nowDate;

	public function __construct($db)
	{
		$this->db = $db;

		$this->uploader = new Upload($this->db);

		$this->comment = new Comment($db);
	}

	public function create($data)
	{
		try {
			$mainQry = "
                INSERT INTO eyefidb.vehicleInformation (
                    department
                    , vehicleMake
                    , year
                    , vin
                    , vehicleNumber
                    , exp
                    , mileage
                    , lastServiceDate
                    , typeOfService
                    , fuelType
					, createdBy
					, licensePlate
                ) VALUES ( 
                    :department
                    , :vehicleMake
                    , :year
                    , :vin
                    , :vehicleNumber
                    , :exp
                    , :mileage
                    , :lastServiceDate
                    , :typeOfService
                    , :fuelType
					, :createdBy
					, :licensePlate
                )
			";
			$query = $this->db->prepare($mainQry);
			$query->bindParam(':department', $data['department'], PDO::PARAM_STR);
			$query->bindParam(':vehicleMake', $data['vehicleMake'], PDO::PARAM_STR);
			$query->bindParam(':year', $data['year'], PDO::PARAM_STR);
			$query->bindParam(':vin', $data['vin'], PDO::PARAM_STR);
			$query->bindParam(':vehicleNumber', $data['vehicleNumber'], PDO::PARAM_STR);
			$query->bindParam(':exp', $data['exp'], PDO::PARAM_STR);
			$query->bindParam(':mileage', $data['mileage'], PDO::PARAM_INT);
			$query->bindParam(':lastServiceDate', $data['lastServiceDate'], PDO::PARAM_STR);
			$query->bindParam(':typeOfService', $data['typeOfService'], PDO::PARAM_STR);
			$query->bindParam(':fuelType', $data['fuelType'], PDO::PARAM_STR);
			$query->bindParam(':createdBy', $data['createdBy'], PDO::PARAM_INT);
			$query->bindParam(':licensePlate', $data['licensePlate'], PDO::PARAM_STR);
			$query->execute();
			$insertid = $this->db->lastInsertId();

			if ($insertid) {
				return "Record inserted successfully";
			} else {
				http_response_code(400);
				return "Record insertion failed";
			}
		} catch (PDOException $e) {
			http_response_code(400);
			die($e->getMessage());
		}
	}

	public function update($data)
	{

		try {
			$mainQry = "
                UPDATE eyefidb.vehicleInformation
                SET department = :department
                    , vehicleMake = :vehicleMake
                    , year = :year
                    , vin = :vin
                    , vehicleNumber = :vehicleNumber
                    , exp = :exp
                    , mileage = :mileage
                    , lastServiceDate = :lastServiceDate
                    , typeOfService = :typeOfService
                    , fuelType = :fuelType
					, active = :active
					, licensePlate = :licensePlate
                WHERE id = :id
			";
			$query = $this->db->prepare($mainQry);
			$query->bindParam(':department', $data['department'], PDO::PARAM_STR);
			$query->bindParam(':vehicleMake', $data['vehicleMake'], PDO::PARAM_STR);
			$query->bindParam(':year', $data['year'], PDO::PARAM_STR);
			$query->bindParam(':vin', $data['vin'], PDO::PARAM_STR);
			$query->bindParam(':vehicleNumber', $data['vehicleNumber'], PDO::PARAM_STR);
			$query->bindParam(':exp', $data['exp'], PDO::PARAM_STR);
			$query->bindParam(':mileage', $data['mileage'], PDO::PARAM_INT);
			$query->bindParam(':lastServiceDate', $data['lastServiceDate'], PDO::PARAM_STR);
			$query->bindParam(':typeOfService', $data['typeOfService'], PDO::PARAM_STR);
			$query->bindParam(':fuelType', $data['fuelType'], PDO::PARAM_STR);
			$query->bindParam(':active', $data['active'], PDO::PARAM_INT);
			$query->bindParam(':id', $data['id'], PDO::PARAM_INT);
			$query->bindParam(':licensePlate', $data['licensePlate'], PDO::PARAM_STR);
			$query->execute();
			return $query->rowCount();

			// if ($count == '0') {
			// 	http_response_code(400);
			// 	return "There was an error processing your request.";
			// } else {
			// 	http_response_code(200);
			// 	return "Updated successfully";
			// }
		} catch (PDOException $e) {

			http_response_code(500);
			die($e->getMessage());
		}
	}

	public function delete($id)
	{
		try {
			$mainQry = "
                DELETE from eyefidb.vehicleInformation
                WHERE id = :id
			";
			$query = $this->db->prepare($mainQry);
			$query->bindParam(':id', $id, PDO::PARAM_INT);
			$query->execute();
			$count = $query->rowCount();

			if ($count == 0) {
				http_response_code(400);
				return "There was an error processing your request.";
			} else {
				http_response_code(200);
				return "Updated successfully";
			}
		} catch (PDOException $e) {
			http_response_code(500);
			die($e->getMessage());
		}
	}

	public function readById($id)
	{

		try {
			$mainQry = "
                select id
                    , department
                    , vehicleMake 
                    , year
                    , vin
                    , exp 
                    , vehicleNumber
                    , mileage
                    , lastServiceDate
                    , typeOfService
                    , fuelType
					, createdBy
					, licensePlate
                    , datediff(exp, curdate()) expiresInDays
                from eyefidb.vehicleInformation a 
                Where id = :id
					and active = 1
			";
			$query = $this->db->prepare($mainQry);
			$query->bindParam(':id', $id, PDO::PARAM_INT);
			$query->execute();
			$result = $query->fetch(PDO::FETCH_ASSOC);

			$attachmentsResults = $this->uploader->getAttachments($id, 'Vehicle Information', 'vehicleInformation');

			return array(
				"results" => $result,
				"attachmentsResults" => $attachmentsResults,
			);
		} catch (PDOException $e) {
			http_response_code(500);
			die($e->getMessage());
		}
	}

	public function readAll()
	{
		try {
			$mainQry = "
                select id
                    , department
                    , vehicleMake
                    , year
                    , vin
                    , exp 
                    , vehicleNumber
                    , mileage
                    , lastServiceDate
                    , typeOfService
                    , fuelType
					, createdBy
					, licensePlate
                    , datediff(exp, curdate()) expiresInDays
                from eyefidb.vehicleInformation a 
				WHERE active = 1
			";
			$query = $this->db->prepare($mainQry);
			$query->execute();
			$result = $query->fetchAll(PDO::FETCH_ASSOC);

			$commentInfo = $this->comment->readRecentComment('Vehicle Information');

			foreach ($result as &$row) {

				foreach ($commentInfo as $commentInfoRow) {
					if ($row['id'] == $commentInfoRow['orderNum']) {
						$row['recent_comments'] = $commentInfoRow;
					}
				}
			}

			return $result;
		} catch (PDOException $e) {
			http_response_code(500);
			die($e->getMessage());
		}
	}
}
