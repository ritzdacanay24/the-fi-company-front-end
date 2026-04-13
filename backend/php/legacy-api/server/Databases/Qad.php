<?php




define('ODBCINI', 'ODBCINI=/opt1/Progress/DataDirect/Connect64_for_ODBC_71/odbc.ini');
define('ODBCINST', 'ODBCINST=/opt1/Progress/DataDirect/Connect64_for_ODBC_71/odbcinst.ini');
define('LD_LIBRARY_PATH', 'LD_LIBRARY_PATH=/opt1/Progress/DataDirect/Connect64_for_ODBC_71/lib:/opt1/Progress/DataDirect/Connect64_for_ODBC_71/lib');



class Qad
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
    private $username;
    private $password;

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

        $this->host = getenv('QAD_HOST');
        $this->username = getenv('QAD_USER');
        $this->password = getenv('QAD_PASSWORD');

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
            ___http_response_code(500);
            json_encode([
                "message" => $e->getMessage(),
                "status_code" => 500
            ]);
            echo $e->getMessage();
            die();
        });

        // set the error handler
        set_error_handler(function ($code, $message, $file, $line) {
            ___http_response_code(500);
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
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            );

            $dsn = 'odbc:' . $this->host;
            $this->_connection = new PDO($dsn, $this->username, $this->password, $db_options);
            return $this->_connection;
        } catch (PDOException $e) {
            http_response_code(500);
            $error = array(
                "desc" => "Error!: " . $e->getMessage(), "error" => true, "status_code" => 500.1
            );
            echo json_encode($error);
            die();
        }
    }

    public function set_host($host)
    {
        $this->host = $host;
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
        return json_encode($data, JSON_NUMERIC_CHECK | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_ERROR_UTF8 | JSON_INVALID_UTF8_SUBSTITUTE);
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
                }
                table, th, td {
                    border: 1px solid black;
                    padding:3px;
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
    /**
     * Display json into a table
     * 
     * @param mixed $data can be array or object
     * @param boolean $prettyFormat set to true if json should be formated to easily read data 
     * 
     */

    public function jsonToTableNice($data)
    {

        $table = "<style type='text/css'>
                body{
                    padding:10px !important;
                }
                table tr:first-child>th{
                    padding:8px;
                    position: sticky;
                    top: 0;
                    text-align:left;
                }
                table {
                    border-collapse: collapse;
                    width:1500px
                }
                table, th, td {
                    border: 1px solid black;
                    padding:10px;
                    white-space:normal;
                }
                th {
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: .9em;
                    background: #696969;
                    color: #FFF;
                    padding: 5px 6px;
                    border-collapse: separate;
                    border: 1px solid #696969;
                }
                td {
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: .9em;
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
}
