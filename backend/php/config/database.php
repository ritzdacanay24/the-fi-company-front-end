<?php
class Database {
    private $host;
    private $port;
    private $database_name;
    private $username;
    private $password;
    private $charset = "utf8mb4";
    public $conn;

    public function __construct() {
        $this->host = getenv("DB_HOST") ?: "localhost";
        $this->port = getenv("DB_PORT") ?: "3306";
        $this->database_name = getenv("DB_NAME") ?: "igt_database";
        $this->username = getenv("DB_USER") ?: "root";
        $this->password = getenv("DB_PASSWORD");
        if ($this->password === false) {
            $this->password = "";
        }
    }

    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->database_name . ";charset=" . $this->charset;
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        
        return $this->conn;
    }
}
?>
