<?php

namespace EyefiDb\Api\Tables;
use PDO; 
use PDOException;	

	class GridTables
	{
	 
		protected $db;
		public $sessionId;
		public $path;
		
		public function __construct($db)
		{
		
			$this->db = $db;
			$this->nowDate = date("Y-m-d H:i:s", time());
			
			
		}
		
		public function Save($post)
		{
			
			$qry = '
				SELECT a.id 
					, a.data 
					, a.pageId 
                    , a.userId
				FROM eyefidb.tableSettings a
				WHERE a.pageId = :pageId
					AND a.userId = :userId
			';
			$stmt = $this->db->prepare($qry);
			$stmt->bindParam(':pageId', $this->path, PDO::PARAM_STR);
			$stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
			$stmt->execute(); 		
			$row = $stmt->fetch();
			
			if($row){
				$qry = "
					UPDATE eyefidb.tableSettings
						SET data = :data
					WHERE id = :id
				";
				$stmt = $this->db->prepare($qry);
				$stmt->bindParam(':data', $post['data'], PDO::PARAM_STR);
				$stmt->bindParam(':id', $row['id'], PDO::PARAM_INT);
				$stmt->execute();
				
			}else{
				$qry = "
					INSERT INTO eyefidb.tableSettings(
						data
						, pageId
						, userId
					) 
					values(
						:data
						, :pageId
						, :userId
					)
				";
				$stmt = $this->db->prepare($qry);
				$stmt->bindParam(':data', $post['data'], PDO::PARAM_STR);
				$stmt->bindParam(':pageId', $this->path, PDO::PARAM_STR);
				$stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
				$stmt->execute();
				return $this->db->lastInsertId();
			}
		} 
		
		public function Read()
		{
			
			$obj['details'] = json_encode(array(
				"details" => false
			));
			
			$qry = '
				SELECT a.id 
					, a.data 
					, a.pageId 
					, a.userId
				FROM eyefidb.tableSettings a
				WHERE a.pageId = :pageId
					AND a.userId = :userId
			';
			$stmt = $this->db->prepare($qry);
			$stmt->bindParam(':pageId', $this->path, PDO::PARAM_STR);
			$stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
			$stmt->execute(); 		
			$row = $stmt->fetch();
			
			if($row){
				$obj['details'] = $row['data'];
			}else{
			}
			
			return json_decode($obj['details']);
			
		} 
		
				
	}
	
	
	 