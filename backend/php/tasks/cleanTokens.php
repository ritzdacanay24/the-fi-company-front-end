<?php

	class CleanUsers
	{
	 
		protected $db;
		
		public function __construct($db)
		{
			$this->db = $db;
		}			

		public function DeleteToken()
		{
			
			$sql = 'DELETE FROM db.token where TIMESTAMPDIFF(MINUTE, createdDate, now()) > ' . DB_TOKEN_EXPIRATION;
			$stmt = $this->db->prepare($sql);
			$stmt->execute();
		}
		
		public function __destruct() {
			$this->db = null;
		}
	}
	
	use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

	$db_connect = new DatabaseEyefi();
	$db = $db_connect->getConnection();

	$deleteSessions = new CleanUsers($db);
	$deleteSessions->DeleteToken();
		