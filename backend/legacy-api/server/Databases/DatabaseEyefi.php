<?php

namespace EyefiDb\Databases;

use PDO;
use PDOException;

class DatabaseEyefi
{

    /**
     * @var object
     */
    private $_connection;

    /**
     * @var object
     */
    private static $_instance;

    //set this to true to override $protected
    public $protectAll = false;

    // specify your own database credentials
    private $host;
    public $db_name;
    private $username;
    private $password;
    public $conn;

    //set to true if pages require login.
    public $protected = false;
    public $setError = true;

    /**
     * The object is created from within the class itself
     * only if the class has no instance.
     */
    public static function getInstance()
    {
        if (!self::$_instance) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct($obj = null)
    {

        $this->host = getenv('DB_HOST') ?: 'localhost';
        $this->db_name = 'db';
        $this->username = getenv('DB_USER') ?: 'change_me';
        $this->password = getenv('DB_PASSWORD') ?: 'change_me';

        if ($obj) {
            $this->run_options($obj);
        }

        if ($this->setError) {
            $this->set_error();
        }
    }


    public function run_options($obj)
    {

        if (isset($obj['displayError']) && $obj['displayError']) {
            $this->displayError($obj['displayError']);
        }
    }

    private function __clone()
    {
    }

    /**
     * Set custom exception handler and error handler
     */
    public function set_error()
    {

        // set the exception handler
        set_exception_handler(function ($e) {
            http_response_code(500);
            json_encode([
                "message" => $e->getMessage(),
                "status_code" => 500
            ]);
            echo $e->getMessage();
            die();
        });

        // set the error handler
        set_error_handler(function ($code, $message, $file, $line) {
            http_response_code(500);
            json_encode([
                "message" => " Error [$message]",
                "status_code" => 500
            ]);
            echo " Error [$message] on line $line";
            die();
        }, -1);
    }

    /**
     * Call this method to establish a connection
     */
    public function getConnection()
    {

        try {

            $db_options = array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_PERSISTENT => false,
            );

            $dsn = 'mysql:' . $this->host . ';charset=utf8mb4;dbname=eyefidb';
            $this->_connection = new PDO($dsn, $this->username, $this->password, $db_options);
            return $this->_connection;
        } catch (PDOException $e) {
            http_response_code(500);
            $error = array(
                "desc" => "Error!: " . $e->getMessage(), "error" => true
            );
            echo $e->getMessage();
            die();
        }
    }

    /**
     * Displays errors on screen
     * 
     * @param bool $val true|false 
     */
    public function displayError($val)
    {
        if ($val) {
            ini_set('display_errors', 1);
            ini_set('display_startup_errors', 1);
            error_reporting(E_ALL);
            $this->set_error();
        }
    }

    /**
     * Displays in json_encode
     * 
     * @param bool $val true|false 
     */
    public function json_encode($data)
    {
            header('Content-Type: application/json');
        return json_encode($data, JSON_NUMERIC_CHECK | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_IGNORE);
    }
    public function json_encode_v1($data)
    {
            header('Content-Type: application/json');
        return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_IGNORE);
    }
    /**
     * Displays in json_encode
     * 
     * @param bool $val true|false 
     */
    public function json_decode($data)
    {
        return json_encode($data, true);
    }

    /**
     * Display json in pretty format
     * 
     * @param mixed $data data can be an object or array
     * @param boolean $prettyFormat set to true if json should be formated to easily read data 
     */
    public function json($data, $prettyFormat = false)
    {
        if ($prettyFormat) {
            header('Content-Type: application/json');
            return json_encode($data, JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_ERROR_UTF8 | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            return json_encode($data, JSON_NUMERIC_CHECK | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_ERROR_UTF8 | JSON_INVALID_UTF8_SUBSTITUTE);
        }
    }

    /**
     * Display json into a table
     * 
     * @param mixed $data can be array or object
     * @param boolean $prettyFormat set to true if json should be formated to easily read data 
     * 
     */
    public function jsonToTable($data)
    {

        $table = "<style type='text/css'>
                body{
                    padding:0 !important;
                    margin:0 !important;
                }
                table tr:first-child>th{
                    position: sticky;
                    top: 0;
                }
                table {
                    margin: 8px;
                    border-collapse: collapse;
                    width:1500px
                }
                table, th, td {
                    border: 1px solid black;
                    padding:3px;
                    white-space:normal;
                }
                th {
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: .7em;
                    background: #666;
                    color: #FFF;
                    padding: 2px 6px;
                    border-collapse: separate;
                    border: 1px solid #000;
                }
                td {
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: .7em;
                    border: 1px solid #DDD;
                }
            </style>
            <table  class='mytable'><tbody>";

        if (is_object($data)) {
            $table .= "<tr>";
            foreach ($data as $name => $values) {
                $table .= "<td>$values</td>";
                $columns[$name] = $name;
            }
            $table .= "</tr>";
            $table .= "</tbody><thead>";
        } else {

            foreach ($data as $name => $values) {
                $table .= "<tr><td>$name</td>";
                foreach ($values as $k => $v) {
                    $table .= "<td>$v</td>";
                    $columns[$k] = $k;
                }
                $table .= "</tr>";
            }
            $table .= "</tbody><thead><tr><th>Id</th>";
        }
        foreach ($columns as $column) {
            $table .= "<th>$column</th>";
        }
        $table .= "</thead></table>";
        return $table;
    }

    public function jsonToDebug($jsonText)
    {
        $html = "<style type='text/css'>
        body{
            padding:5px !important;
            margin:5px !important;
        }

        .center:first-child {
            margin-left: auto;
            margin-right: auto;
          }

        table tr:first-child>th{
            position: sticky;
            top: 0;
        }
        table {
            margin: 0px;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid black;
            padding:3px;
            white-space:normal;
        }
        th {
            font-family: Arial, Helvetica, sans-serif;
            font-size: .75em;
            background: #666;
            color: #FFF;
            padding: 2px 6px;
            border-collapse: separate;
            border: 1px solid #000;
        }
        td {
            font-family: Arial, Helvetica, sans-serif;
            font-size: .75em;
            border: 1px solid #DDD;
        }
    </style>";
        if ($jsonText && is_array($jsonText)) {
            $html .= self::_arrayToHtmlTableRecursive($jsonText);
        }
        return $html;
    }

    private function _arrayToHtmlTableRecursive($arr)
    {
        $str = "<div class='center1'><table><tbody style='margin-left:0px'>";
        foreach ($arr as $key => $val) {
            $str .= "<tr>";
            $str .= "<td>$key</td>";
            $str .= "<td>";
            if (is_array($val)) {
                if (!empty($val)) {
                    $str .= self::_arrayToHtmlTableRecursive($val);
                }
            } else {
                $str .= "<strong>$val</strong>";
            }
            $str .= "</td></tr>";
        }
        $str .= "</tbody></table></div>";

        return $str;
    }
}
