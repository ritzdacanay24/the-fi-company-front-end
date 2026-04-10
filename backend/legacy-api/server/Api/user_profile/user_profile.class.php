<?php

class UserAccount
{

	protected $db;
	public $sessionId;
	public $email;
	public $nowDate;

	public function __construct($db)
	{
		$this->db = $db;
	}

	public function getUserInfo()
	{

		$qry = "
				SELECT *
				FROM db.users
				WHERE  id = :sessionId
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(':sessionId', $this->sessionId, PDO::PARAM_INT);
		$query->execute();
		return $query->fetch();
	}

	public function update($row)
	{

		$active = $row['active'] == 'false' ? 0 : 1;
		
		if(ISSET($row['id'])){
		$qry = "
			UPDATE eyefidb.cron_email_notifications
			SET active = :active
			WHERE id = :id
				
		";
		$query = $this->db->prepare($qry);
		$query->bindParam(':active', $active, PDO::PARAM_INT);
		$query->bindParam(':id', $row['id'], PDO::PARAM_INT);
		$query->execute();
		$count = $query->rowCount();
		}else{
			$qry = "
			INSERT INTO eyefidb.cron_email_notifications (email, subscribed_to, user_id)
			VALUES (:email, :subscribed_to, :user_id)
				
		";
		$query = $this->db->prepare($qry);
		$query->bindParam(':email', $this->email, PDO::PARAM_STR);
		$query->bindParam(':subscribed_to', $row['name'], PDO::PARAM_STR);
		$query->bindParam(':user_id', $this->sessionId, PDO::PARAM_INT);
		$query->execute();
		$count = $query->rowCount();
		}
	}
	
	public function getUserNotificationCron()
		{

		$qry = "
				select id, subscribed_to
				from eyefidb.cron_email_notifications a
				where user_id = :sessionId
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(':sessionId', $this->sessionId, PDO::PARAM_INT);
		$query->execute();
		$data = $query->fetchAll();

		$availableCrons = array(
			array(
				'name' => 'total_shipped_orders',
				'title' => 'Total shipped orders (5pm Daily)',
				'active' => false
			),
			array(
				'name' => 'open_shortages',
				'title' => 'Open Shortages Report (5pm Daily)',
				'active' => false
			),
			array(
				'name' => 'drop_in_work_orders',
				'title' => 'Drop In Graphic Work Orders',
				'active' => false
			),
			array(
				'name' => 'qirs',
				'title' => 'QIR',
				'active' => false
			),
			array(
				'name' => 'material_request_report',
				'title' => 'Material Request Report (5pm Daily)',
				'active' => false
			),
			array(
				'name' => 'Owners',
				'title' => 'Owners',
				'active' => false
			),
			array(
				'name' => 'once_shipped_order',
				'title' => 'As soon as a order ships',
				'active' => false
			)
		);

		for ($i = 0; $i < count($availableCrons); $i++) {
			foreach ($data as $item1) {
				if ($availableCrons[$i]['name'] == $item1['subscribed_to']) {
					$availableCrons[$i]['active'] = true;
					$availableCrons[$i]['id'] = $item1['id'];
				}
			}
		}

		return $availableCrons;
	}

	public function VerifyPassword($currentPassword)
	{

		$pass = trim($currentPassword);
		$pass = strip_tags($pass);
		$pass = htmlspecialchars($pass);
		$pass = hash('sha256', $pass);

		$qry = "
				SELECT id, pass
				FROM users
				WHERE pass = :pass
					AND id = :sessionId
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(':pass', $pass, PDO::PARAM_STR);
		$query->bindParam(':sessionId', $this->sessionId, PDO::PARAM_INT);
		$query->execute();
		$row = $query->fetch();

		return $row ? $row['pass'] : 0;
	}

	public function UpdateProfileInfo($data)
	{

		$err = false;
		$errTyp = "success";
		$errMSG = "Password Correct";

		$check = new VerifyUserPassword();
		$pwCheck = $check->VerifyPassword($data['currentPassword']);

		if (!$pwCheck) {
			$err = true;
			$errTyp = "warning";
			$errMSG = "Password is incorrect";
		}

		if (!$err) {
			$qry = "
					UPDATE users
					SET first = :first
						, last = :last
						, address = :address
						, address1 = :address1
						, city = :city
						, state = :state
						, zipCode = :zipCode
						, workPhone = :workPhone 
						, lastUpdate = :lastUpdate
					WHERE id = :id
						
				";
			$query = $this->db->prepare($qry);
			$query->bindParam(':first', $data['first'], PDO::PARAM_STR);
			$query->bindParam(':last', $data['last'], PDO::PARAM_STR);
			$query->bindParam(':address', $data['address'], PDO::PARAM_STR);
			$query->bindParam(':address1', $data['address1'], PDO::PARAM_STR);
			$query->bindParam(':city', $data['city'], PDO::PARAM_STR);
			$query->bindParam(':state', $data['state'], PDO::PARAM_STR);
			$query->bindParam(':zipCode', $data['zipCode'], PDO::PARAM_STR);
			$query->bindParam(':workPhone', $data['workPhone'], PDO::PARAM_STR);
			$query->bindParam(':id', $this->sessionId, PDO::PARAM_INT);
			$query->bindParam(':lastUpdate', $this->nowDate, PDO::PARAM_INT);
			$query->execute();
			$count = $query->rowCount();

			if (!$count) {
				$updateMessge = "No changes were made";
			} else {
				$updateMessge = "account saved successfully";
			}

			$err = false;
			$errTyp = "success";
			$errMSG = "Updated successfully";
		}


		$obj = array(
			'message' 			=> $errMSG, 'type' 			=> $errTyp, 'error'			=> $err
		);

		return array('details' => $obj);
	}

	public function dbSettings($post)
	{
		$styles = json_encode($post['styles']);


		$err = true;
		$errTyp = "danger";
		$errMSG = "Did not update";

		$qry = "
				UPDATE users
				SET settings = :styles
				WHERE id = :id
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(':styles', $styles, PDO::PARAM_STR);
		$query->bindParam(':id', $this->sessionId, PDO::PARAM_INT);
		$query->execute();
		$count = $query->rowCount();

		if (!$count) {
			$updateMessge = "No changes were made";
		} else {
			$updateMessge = "account saved successfully";
		}

		$err = false;
		$errTyp = "success";
		$errMSG = "Updated successfully";


		$obj = array(
			'message' 			=> $errMSG, 'type' 			=> $errTyp, 'error'			=> $err
		);

		return array('details' => $obj);
	}

	public function UpdateAccountInfo($post)
	{

		$err = false;
		$errTyp = "success";
		$errMSG = "Password Correct";

		$check = new VerifyUserPassword();
		$pwCheck = $check->VerifyPassword($post['currentPassword']);

		if (!$pwCheck) {
			$err = true;
			$errTyp = "warning";
			$errMSG = "Password is incorrect";
		}

		$curPass = trim($post['currentPassword']);
		$curPass = strip_tags($curPass);
		$curPass = htmlspecialchars($curPass);
		$pw = hash('sha256', $curPass);

		if ($post['changePassword'] == "true") {
			if ($post['newPassword'] != $post['repeatNewPassword']) {
				$err = true;
				$errTyp = "warning";
				$errMSG = "Password does not match repeated new password.";
			}

			$newPass = trim($post['newPassword']);
			$newPass = strip_tags($newPass);
			$newPass = htmlspecialchars($newPass);
			$pw = hash('sha256', $newPass);
		}


		$styles = json_encode($post['styles']);

		if (!$err) {

			$qry = "
					UPDATE users
					SET pass = :pass
						, settings = :styles
					WHERE id = :id
				";
			$query = $this->db->prepare($qry);
			$query->bindParam(':pass', $pw, PDO::PARAM_STR);
			$query->bindParam(':styles', $styles, PDO::PARAM_STR);
			$query->bindParam(':id', $this->sessionId, PDO::PARAM_INT);
			$query->execute();
			$count = $query->rowCount();

			if (!$count) {
				$updateMessge = "No changes were made";
			} else {
				$updateMessge = "account saved successfully";
			}

			$err = false;
			$errTyp = "success";
			$errMSG = "Updated successfully";
		}

		$obj = array(
			'message' 			=> $errMSG, 'type' 			=> $errTyp, 'error'			=> $err
		);

		return array('details' => $obj);
	}

	public function RemoveProfilePicture($userId, $fileName)
	{

		$image = 'http://' . CONFIG['app_host'] . CONFIG['app_default_logo'];
		$qry = "
				UPDATE users
				SET image = :image
					, fileName = 'default-logo.jpg'
				WHERE id = :userId
			";
		$query = $this->db->prepare($qry);
		$query->bindParam(':userId', $userId, PDO::PARAM_INT);
		$query->bindParam(':image', $image, PDO::PARAM_INT);
		$query->execute();
		$count = $query->rowCount();

		if ($count) {
			$deleteImage = $rootPath . CONFIG['app_emp_upload_path'] . $fileName;
			unlink($deleteImage);
		}

		return !$count ? 'Failed' : 'Successful';
	}
}
