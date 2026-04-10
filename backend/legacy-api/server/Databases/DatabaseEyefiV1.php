<?php
// Polyfill for array_key_last() function for older PHP versions
if (!function_exists('array_key_last')) {
    function array_key_last($array) {
        if (!is_array($array) || empty($array)) {
            return null;
        }
        return array_keys($array)[count($array) - 1];
    }
}

use Medoo\Medoo;
require '/var/www/html/api/eyefi/vendor/autoload.php';

$database = new Medoo([
	'type' => 'mysql',
	'host' => getenv('DB_HOST') ?: 'localhost',
	'database' => getenv('DB_NAME') ?: 'eyefidb',
	'username' => getenv('DB_USER') ?: 'change_me',
	'password' => getenv('DB_PASSWORD') ?: 'change_me',
	'option' => [
		PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
		PDO::ATTR_ORACLE_NULLS => PDO::NULL_NATURAL
	]
]);