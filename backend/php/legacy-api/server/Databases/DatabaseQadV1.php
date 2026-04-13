<?php

putenv(ODBCINI);
putenv(ODBCINST);
putenv(LD_LIBRARY_PATH);


use Medoo\Medoo;
require '/var/www/html/api/eyefi/vendor/autoload.php';

$dsn = 'odbc:' . getenv('QAD_HOST');
$pdo = new PDO($dsn, getenv('QAD_USER'), getenv('QAD_PASSWORD'));


$databaseQad = new Medoo([
	// Initialized and connected PDO object.
	'pdo' => $pdo,
	'type' => 'mysql',
	
	'option' => [
		PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
	]
]);
