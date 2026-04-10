<?php

/*
 * User Class
 *
 * Author 
 * */

class CreateAccount
{

    // database connection and table name
    private $conn;
    private $table_name = "users";
    public $email;
    public $password;
    public $firstName;
    public $lastName;

    // constructor with $db as database connection
    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d H:i:s", time());
        $this->tokenLen = 25;
        $this->registerActivate = 'https://dashboard.eye-fi.com/app/src/assets/views/authentication/registration_activation/api/registration_activation';
    }

    /*
     * Check Email
     *
     * @param $email
     * @return boolean
     * */
    public function checkDuplicateEmail()
    {
        try {

            $query = $this->db->prepare("SELECT id FROM db.users WHERE email=:email");
            $query->bindParam("email", $this->email, PDO::PARAM_STR);
            $query->execute();
            if ($query->rowCount() > 0) {
                return true;
            } else {
                return false;
            }
        } catch (PDOException $e) {
            echo json_encode(array(
                "message" => $e->getMessage(),
                "status" => 'error',
                "status_code" => 0
            ));
        }
    }

    /*
     * Register
     *
     * @param $email
     * @return boolean
     * */
    public function Register($email, $first, $last, $password, $passRegistrationEmail = 2, $title, $department, $parentId)
    {

        $this->db->beginTransaction();

        try {

            $error = false;
            $errTyp = "success";
            $errMSG = "Account created. Please check your email inbox/spam folder to complete registration.";
            $status_code = 1;

            $access = $passRegistrationEmail;

            if ($access == 1) {
                $errMSG = "Account created.";
            }

            $email = trim($email);
            $email = strip_tags($email);
            $email = htmlspecialchars($email);

            $pass = trim($password);
            $pass = strip_tags($pass);
            $pass = htmlspecialchars($pass);

            $first = trim($first);
            $first = strip_tags($first);
            $first = htmlspecialchars($first);

            $last = trim($last);
            $last = strip_tags($last);
            $last = htmlspecialchars($last);

            if (empty($email)) {
                $error = true;
                $errTyp = "danger";
                $errMSG = "Please enter your email address.";
                $status_code = 0;
            } else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $error = true;
                $errTyp = "danger";
                $errMSG = "Please enter valid email address.";
                $status_code = 0;
            }

            $sql = '
                SELECT a.id
                    , a.email
                    , a.pass
                    , a.admin
                    , a.attempts
                    , a.access
                    , a.active
                FROM db.users a
                WHERE a.email = :email
            ';
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':email', $email, PDO::PARAM_STR);
            $stmt->execute();
            $row = $stmt->fetch();
            $count = $stmt->rowCount();

            if ($count) {
                $error = true;
                $errTyp = 'danger';
                $errMSG = 'This email already exists.';
                $status_code = 0;
            }

            if (!$error) {
                $password = hash('sha256', $pass);
                $sql = "
                    INSERT INTO db.users(
                        first
                        , last
                        , email
                        , pass
                        , active
                        , createdDate
                        , access
                        , title
                        , area
                        , workArea
                        , workPhone
                        , lastUpdate
                        , lastLoggedIn
                        , address
                        , address1
                        , zipCode
                        , settings
                        , department
                        , parentId
                    ) 
                    values(
                        :first
                        , :last
                        , :email
                        , :pass
                        , 1
                        , :createdDate
                        , :access
                        , :title
                        , ''
                        , ''
                        , ''
                        , :lastUpdate
                        , :lastLoggedIn
                        , ''
                        , ''
                        , 0
                        , ''
                        , :department
                        , :parentId
                    )
                ";
                $stmt = $this->db->prepare($sql);
                $stmt->bindParam(':first', $first, PDO::PARAM_STR);
                $stmt->bindParam(':last', $last, PDO::PARAM_STR);
                $stmt->bindParam(':email', $email, PDO::PARAM_STR);
                $stmt->bindParam(':pass', $password, PDO::PARAM_STR);
                $stmt->bindParam(':access', $access, PDO::PARAM_STR);
                $stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
                $stmt->bindParam(':lastUpdate', $this->nowDate, PDO::PARAM_STR);
                $stmt->bindParam(':lastLoggedIn', $this->nowDate, PDO::PARAM_STR);
                $stmt->bindParam(':title', $title, PDO::PARAM_STR);
                $stmt->bindParam(':department', $department, PDO::PARAM_STR);
                $stmt->bindParam(':parentId', $parentId, PDO::PARAM_STR);
                $stmt->execute();
                $createdId = $this->db->lastInsertId();

                $token = generateRandomString($this->tokenLen);

                $sql = "
                    INSERT INTO db.token(
                        token
                        , userId
                        , field
                    ) 
                    values(
                        :token
                        , :userId
                        , 'Registration code'
                    )
                ";
                $stmt = $this->db->prepare($sql);
                $stmt->bindParam(':token', $token, PDO::PARAM_STR);
                $stmt->bindParam(':userId', $createdId, PDO::PARAM_INT);
                $stmt->execute();

                $to         = $email;
                $subject       = "Registration";
                $from       = "Eyefi Dashboard <noreply@the-fi-company.com>";;

                $body = '<html><body>';
                $body .= 'Dear ' . $first . " " . $last . ", <br />";
                $body .= 'Thank you for registering. Please click <a href="' . $this->registerActivate . '?token=' . $token . '">here</a> to complete registration';
                $body .= "</body></html>";

                $headers  = "From: " . ($from) . "\r\n";
                $headers .= "Reply-To: " . ($to) . "\r\n";
                $headers .= "Return-Path: " . ($to) . "\r\n";
                $headers .= "MIME-Version: 1.0\r\n";
                $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
                $headers .= "X-Priority: 1\r\n";
                $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";

                mail($to, $subject, $body, $headers);
            }

            $obj = array(
                'message'         => $errMSG, 'type'         => $errTyp, 'error'        => $error, 'status_code'        => $status_code
            );

            $this->db->commit();

            return $obj;
        } catch (PDOException $e) {
            ___http_response_code(500);
            $obj = json_encode([
                "message" => $e->getMessage()
            ]);
            return $obj;
            $this->db->rollBack();
        }
    }
}
