<?php

namespace EyefiDb\Api\FieldService;

use PDO;
use PDOException;

class Clients
{

	protected $db;

	public function __construct($db)
	{

		$this->db = $db;

	}


	public function __destruct()
	{
		$this->db = null;
	}
}