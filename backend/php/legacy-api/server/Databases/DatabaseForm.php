<?php
use Medoo\Medoo;
require '/var/www/html/api/eyefi/vendor/autoload.php';

$database = new Medoo([
	'type' => 'mysql',
	'host' => getenv('DB_HOST') ?: 'localhost',
	'database' => getenv('FORM_DB_NAME') ?: 'forms',
	'username' => getenv('DB_USER') ?: 'change_me',
	'password' => getenv('DB_PASSWORD') ?: 'change_me',
	'option' => [
		PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
		PDO::ATTR_ORACLE_NULLS => PDO::NULL_NATURAL
	]
]);