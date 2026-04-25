<?php

	class UserInactivity
	{
	 
		protected $db;
		
		public function __construct($db)
		{
			$this->db = $db;
		}			

		public function UpdateAccessStatus()
		{
			
			$sql = 'UPDATE db.users SET access = 0 where access != 0 AND id NOT IN (473, 474) AND DATEDIFF(curDate(),date(lastLoggedIn) ) >= ' . DB_INACTIVITY;
			$stmt = $this->db->prepare($sql);
			echo $stmt->execute();
		}
		
		public function __destruct() {
			$this->db = null;
		}
	}
	
	use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

	$db_connect = new DatabaseEyefi();
	$db = $db_connect->getConnection();

	$runInstance = new UserInactivity($db);
	//$runInstance->UpdateAccessStatus();


		