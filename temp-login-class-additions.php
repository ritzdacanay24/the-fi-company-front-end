<?php

// This shows the additions needed to your existing login.class.php file

class Login {
    
    // ... existing properties ...
    public $card_number; // Add this property
    
    // ... existing methods ...
    
    /**
     * New method to authenticate by card number
     * Add this method to your existing Login class
     */
    public function LoginByCardNumber() {
        
        // SQL query to find user by card number
        $query = "SELECT 
                    id, 
                    name, 
                    email, 
                    card_number,
                    image, 
                    roles, 
                    type, 
                    first, 
                    last, 
                    employeeType, 
                    workArea, 
                    company_id, 
                    admin, 
                    enableTwostep,
                    active,
                    access,
                    attempts
                FROM users 
                WHERE card_number = :card_number 
                AND active = 1 
                LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitize and bind card number
        $this->card_number = htmlspecialchars(strip_tags($this->card_number));
        $stmt->bindParam(':card_number', $this->card_number);
        
        $stmt->execute();
        
        $num = $stmt->rowCount();
        
        if ($num > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row;
        }
        
        return false;
    }
    
    /**
     * Alternative method if you want to modify existing Login() method
     * You could update your existing Login() method to handle both email and card_number
     */
    public function LoginUnified() {
        
        $whereClause = "";
        $bindParam = "";
        
        if (!empty($this->card_number)) {
            // Card number authentication
            $whereClause = "card_number = :identifier";
            $bindParam = $this->card_number;
        } else {
            // Email authentication  
            $whereClause = "email = :identifier";
            $bindParam = $this->email;
        }
        
        $query = "SELECT 
                    id, 
                    name, 
                    email, 
                    card_number,
                    pass,
                    image, 
                    roles, 
                    type, 
                    first, 
                    last, 
                    employeeType, 
                    workArea, 
                    company_id, 
                    admin, 
                    enableTwostep,
                    active,
                    access,
                    attempts
                FROM users 
                WHERE {$whereClause}
                AND active = 1 
                LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitize identifier
        $identifier = htmlspecialchars(strip_tags($bindParam));
        $stmt->bindParam(':identifier', $identifier);
        
        $stmt->execute();
        
        $num = $stmt->rowCount();
        
        if ($num > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row;
        }
        
        return false;
    }
}

?>
