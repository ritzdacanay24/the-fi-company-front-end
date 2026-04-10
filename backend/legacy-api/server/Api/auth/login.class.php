<?php

/*
 * User Class
 *
 * Author 
 * */

class Login
{

    // database connection and table name
    private $conn;
    private $table_name = "users";

    public $id;
    public $name;
    public $email;
    public $password;
    public $created_at;
    public $is_guest;
    public $is_pending;

    // constructor with $db as database connection
    public function __construct($db)
    {
        $this->conn = $db;
        $this->nowDate = date("Y-m-d", time());
    }


    /*
     * Check Username
     *
     * @param $username
     * @return boolean
     * */
    public function isUsername()
    {
        try {
            $query = $this->conn->prepare("SELECT id FROM db.users WHERE username=:username");
            $query->bindParam("username", $this->username, PDO::PARAM_STR);
            $query->execute();
            if ($query->rowCount() > 0) {
                return true;
            } else {
                return false;
            }
        } catch (PDOException $e) {
            exit($e->getMessage());
        }
    }

    /*
     * Check Email
     *
     * @param $email
     * @return boolean
     * */
    public function isEmail()
    {
        try {

            $query = $this->conn->prepare("SELECT id FROM db.users WHERE email=:email");
            $query->bindParam("email", $this->email, PDO::PARAM_STR);
            $query->execute();
            if ($query->rowCount() > 0) {
                return true;
            } else {
                return false;
            }
        } catch (PDOException $e) {
            exit($e->getMessage());
        }
    }

    /*
     * Stay Connected
     *
     * */
    public function StayConnected($userId)
    {

        $query = "
            SELECT p.id
                , p.email 
                , concat(p.first, ' ', p.last) name
                , p.access
                , image
                , employeeType1
                , title
            FROM db." . $this->table_name . " p 
            WHERE id = :id
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam("id", $userId, PDO::PARAM_INT);

        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            $result = $stmt->fetch(PDO::FETCH_OBJ);
            return $result;
        } else {
            return false;
        }
    }

    /*
     * Login
     *
     * */

    public function Login()
    {

        $enc_password = hash(APP_HASH_PASS, $this->password);

        $query = "
            SELECT p.id
                , p.email 
                , concat(p.first, ' ', p.last) name
                , p.access
                , image
                , employeeType1
                , title
                , active
                , attempts
                , p.pass
                , p.first 
                , p.last
                , DATEDIFF(curDate(),date(lastLoggedIn)) daysOfInactivity
                , r.roles
                , p.workArea
                , p.admin
            FROM db." . $this->table_name . " p 
            left join db.roles r ON r.userId = p.id
            WHERE email = :email
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam("email", $this->email, PDO::PARAM_STR);

        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            $result = $stmt->fetch(PDO::FETCH_OBJ);
            return $result;
        } else {
            return false;
        }
    }

    /*
     * update login
     *
     * */
    public function updateLogin($userId)
    {
        // update query
        $query = "
            UPDATE db." . $this->table_name . "
            SET lastLoggedIn = :lastLoggedIn
                , attempts = 0
            WHERE id = :id
        ";

        // prepare query statement
        $stmt = $this->conn->prepare($query);

        // bind new values
        $stmt->bindParam("id", $userId, PDO::PARAM_INT);
        $stmt->bindParam("lastLoggedIn", $this->nowDate, PDO::PARAM_STR);

        // execute the query
        $stmt->execute();
        $count = $stmt->rowCount();

        if ($count > 0) {
            return true;
        }

        return false;
    }
    /*
     * get User Details
     *
     * */
    public function userDetails()
    {
        $query = "
            SELECT
                p.id, 
                p.name, 
                p.email
            FROM
            db." . $this->table_name . " p 
            WHERE id = :id
        ";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam("id", $this->id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_OBJ);
    }

    /*
     * get User
     *
     * */
    public function readAll()
    {

        $query = "
            SELECT
                p.id, 
                p.name, 
                p.email
            FROM
            db." . $this->table_name . " p 
        ";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt;
    }

    // update the user
    function update()
    {

        // update query
        $query = "
            UPDATE " . $this->table_name . "
            SET
                name = :name,
                email = :email,
                is_guest = :is_guest,
                is_pending = :is_pending
            WHERE id = :id
        ";

        // prepare query statement
        $stmt = $this->conn->prepare($query);

        // bind new values
        $stmt->bindParam("name", $this->name, PDO::PARAM_STR);
        $stmt->bindParam("email", $this->email, PDO::PARAM_STR);
        $stmt->bindParam("is_guest", $this->is_guest, PDO::PARAM_INT);
        $stmt->bindParam("is_pending", $this->is_pending, PDO::PARAM_INT);
        $stmt->bindParam("id", $this->id, PDO::PARAM_INT);

        // execute the query
        $stmt->execute();
        $count = $stmt->rowCount();

        if ($count > 0) {
            return true;
        }

        return false;
    }
    
    // update the user
    function updateAttempts($id)
    {

        $sql = 'UPDATE db.users SET attempts = LAST_INSERT_ID(attempts + 1) WHERE id= :id';
							
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();

        return 1;
    }

    function accountLocked($row){

        
        $error = true;
        $errTyp = 'danger';
        $errMSG = 'You are now locked. Please contact the administrator ';
        
        $adminQry = '
            SELECT a.email
            FROM db.users a
            WHERE a.admin = 1
            LIMIT 5
        ';
        $adminQuery = $this->conn->prepare($adminQry);
        $adminQuery->execute(); 
        
        while ($adminRow = $adminQuery->fetch(PDO::FETCH_ASSOC)) {
            $adminUsers[] = $adminRow['email'];
        }
        
        $to         = 'ritz.dacanay@the-fi-company.com';
        $subject   	= "Account Locked";
        $from       = MAIL_EMAIL;
        $link 		= APP_SITEURL . '/#/login/forgot';
        
        $body = '<html><body>';
        $body .= '<table rules="all" style="border-color: #666;" cellpadding="10">';
        $body .= "<tr style='background: #eee;'><td colspan='2'><strong>Account Locked:</strong> </td></tr>";
        $body .= "<tr><td><strong>User Id:</strong> </td><td>" . $row->id . "</td></tr>";
        $body .= "<tr><td><strong>Email:</strong> </td><td>" . $row->email . "</td></tr>";
        $body .= "<tr><td><strong>First:</strong> </td><td>" . $row->first . "</td></tr>";
        $body .= "<tr><td><strong>Last:</strong> </td><td>" . $row->last . "</td></tr>";
        $body .= "<tr><td><strong>IP:</strong> </td><td>" . $_SERVER['REMOTE_ADDR'] . "</td></tr>";
        $body .= "</table>";
        $body .= "</body></html>";	
    
        $body = '<html><body>';
        $body .= 'Hello ' . $row->first . ' ' . $row->last . ', <br>';
        $body .= '<br>';
        $body .= 'You are receiving this email because you have reached the limit amount of log in attempts. <br>';
        $body .= "<p> <a href='{$link}'>Reset Password</a> </p>";
        $body .= '<br>';
        $body .= "Thank you <br>";
        $body .= "<p> Ref #" . 	$this->nowDate . "</p>";
        $body .= '</html></body>';
            
        
        $headers  = "From: " .($from) . "\r\n";
        $headers .= "Reply-To: ".($to) . "\r\n";
        $headers .= "Return-Path: ".($to) . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
        $headers .= "X-Priority: 1\r\n";
        $headers .= "X-Mailer: PHP". phpversion() ."\r\n";
        
        
        if($row->attempts < APP_MAX_LOGIN_ATTEMPTS + 2){

            mail($to,$subject,$body,$headers);
        }

        echo json_encode(array(
            "access_token" => false,
            "message" => $errMSG,
            "data" => "",
            "name" => "",
            "status" => 'danger',
            "status_code" => 0
        ));
        die();

    }
}
