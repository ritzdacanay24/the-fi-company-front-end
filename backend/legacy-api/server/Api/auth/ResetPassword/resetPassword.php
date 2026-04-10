<?php

class ResetPassword
{
	protected $db;

	public function __construct($db)
	{
		$this->db = $db;
		$this->nowDate = date("Y-m-d H:i:s", time());
	}

	public function ValidateToken($token)
	{
		//default variables
		$error = true;
		$errTyp = "danger";
		$errMSG = 'Token is invalid.';
		$userId = false;

		$DB_PASSWORD_TOKEN_EXPIRATION_TIME = DB_PASSWORD_TOKEN_EXPIRATION_TIME;
		$sql = '
				SELECT a.token
					, a.userId
				FROM db.token a
				WHERE a.token = :token
					AND field = "Reset Password"
					AND TIMESTAMPDIFF(MINUTE, `createdDate`, NOW()) <= :resetPasswordTokenExpirationTime
			';
		$stmt = $this->db->prepare($sql);
		$stmt->bindParam(":token", $token, PDO::PARAM_STR);
		$stmt->bindParam(":resetPasswordTokenExpirationTime", $DB_PASSWORD_TOKEN_EXPIRATION_TIME, PDO::PARAM_INT);
		$stmt->execute();
		$row = $stmt->fetch();

		if ($row) {
			$error = false;
			$errTyp = "success";
			$errMSG = 'Token is valid.';
			$userId = $row['userId'];
		}

		$obj = array(
			'message' 		=> $errMSG, 'error' 		=> $error, 'type' 		=> $errTyp, 'userId' 		=> $userId
		);

		return $obj;
	}

	public function validateEmail($email)
	{
		$sql = 'select id, email from db.users WHERE email = :email';
		$stmt = $this->db->prepare($sql);
		$stmt->bindParam(":email", $email, PDO::PARAM_STR);
		$stmt->execute();
		return $stmt->rowCount();
	}

	public function reset($newPassword, $email)
	{
		$isEmailFound = $this->validateEmail($email);

		if (!$isEmailFound) {
			$errMSG = "Email not found";
			$type = "danger";
		} else {

			$password = hash('sha256', $newPassword);

			$sql = 'UPDATE db.users SET pass = :pass WHERE email = :email';
			$stmt = $this->db->prepare($sql);
			$stmt->bindParam(':pass', $password, PDO::PARAM_STR);
			$stmt->bindParam(":email", $email, PDO::PARAM_STR);
			$stmt->execute();
			$count = $stmt->rowCount();

			if ($count) {
				$errMSG = "Password is now reset.";
				$type = "success";
			} else {
				$errMSG = "Unable to update password";
				$type = "success";
			}
		}

		return array(
			'message' => $errMSG,
			'type' => $type
		);
	}

	public function ReadPassword($resetPassword, $token)
	{
		$obj = array();
		$this->db->beginTransaction();

		try {
			$isTokenExpired = $this->ValidateToken($token);

			if ($isTokenExpired['error']) {
				return  array(
					'message' => "Expired Token",
					'type' => "danger",
					'error' => true
				);
				die();
			}

			$errMSG = "Incorrect token";
			$type = "danger";

			$password = hash(APP_HASH_PASS, $resetPassword);

			$sql = 'SELECT a.userId FROM db.token a WHERE a.token = :token';
			$stmt = $this->db->prepare($sql);
			$stmt->bindParam(":token", $token, PDO::PARAM_STR);
			$stmt->execute();
			$row = $stmt->fetch();

			$sql = 'UPDATE db.users SET pass = :pass WHERE id = :userId';
			$stmt = $this->db->prepare($sql);
			$stmt->bindParam(':pass', $password, PDO::PARAM_STR);
			$stmt->bindParam(":userId", $row['userId'], PDO::PARAM_INT);
			$stmt->execute();

			if ($row) {
				$errMSG = "Password is now reset. Please sign in.";
				$type = "success";
			}

			$sql = '
					DELETE from db.token 
					WHERE token = :token
					AND field = "Reset Password"
				';
			$stmt = $this->db->prepare($sql);
			$stmt->bindParam(':token', $token, PDO::PARAM_STR);
			$stmt->execute();

			$sql = '
					UPDATE db.users 
					SET attempts = 0 
					WHERE id = :id
					AND attempts > 0
				';
			$stmt = $this->db->prepare($sql);
			$stmt->bindParam(":id", $row['userId'], PDO::PARAM_INT);
			$stmt->execute();


			$obj = array(
				'message' 			=> $errMSG, 'type' 			=> $type,
				'error' => false
			);

			$this->db->commit();

			return $obj;
		} catch (PDOException $e) {
			___http_response_code(500);
			json_encode([
				"message" => $e->getMessage()
			]);
			return "Error: Unable to perform your request.";
			$this->db->rollBack();
		}
	}

	public function __destruct()
	{
		$this->db = null;
	}
}
