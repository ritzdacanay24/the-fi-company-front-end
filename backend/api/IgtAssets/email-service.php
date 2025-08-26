<?php
/**
 * Email Service for Inventory Alerts
 * Handles sending emails using PHP's mail() function or SMTP
 */

class EmailService {
    private $fromEmail = 'noreply@yourcompany.com'; // Update with your company email
    private $fromName = 'Inventory Management System';
    private $smtpEnabled = false; // Set to true if using SMTP
    
    // SMTP Configuration (if using SMTP)
    private $smtpHost = 'smtp.gmail.com';
    private $smtpPort = 587;
    private $smtpUsername = '';
    private $smtpPassword = '';
    private $smtpSecure = 'tls'; // 'tls' or 'ssl'

    public function __construct() {
        // You can initialize SMTP settings here or load from config
    }

    /**
     * Send inventory alert email
     */
    public function sendAlert($toEmail, $subject, $htmlBody) {
        try {
            if ($this->smtpEnabled) {
                return $this->sendViaSMTP($toEmail, $subject, $htmlBody);
            } else {
                return $this->sendViaPHPMail($toEmail, $subject, $htmlBody);
            }
        } catch (Exception $e) {
            error_log("Email sending failed: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Send email using PHP's built-in mail() function
     */
    private function sendViaPHPMail($toEmail, $subject, $htmlBody) {
        // Generate plain text version for better compatibility
        $plainTextBody = $this->htmlToPlainText($htmlBody);
        
        // Email headers
        $headers = [];
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "Content-Type: multipart/alternative; boundary=\"" . md5(time()) . "\"";
        $headers[] = "From: {$this->fromName} <{$this->fromEmail}>";
        $headers[] = "Reply-To: {$this->fromEmail}";
        $headers[] = "X-Mailer: PHP/" . phpversion();
        $headers[] = "X-Priority: 1"; // High priority for alerts
        
        $boundary = md5(time());
        
        // Create multipart message body
        $body = "--{$boundary}\r\n";
        $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $body .= $plainTextBody . "\r\n\r\n";
        
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $body .= $htmlBody . "\r\n\r\n";
        
        $body .= "--{$boundary}--\r\n";
        
        // Send email
        $result = mail($toEmail, $subject, $body, implode("\r\n", $headers));
        
        if ($result) {
            error_log("Email sent successfully to: {$toEmail}");
            return ['success' => true];
        } else {
            $errorMessage = "Failed to send email to: {$toEmail}";
            error_log($errorMessage);
            return [
                'success' => false,
                'error' => $errorMessage
            ];
        }
    }

    /**
     * Send email using SMTP (requires additional libraries like PHPMailer)
     * This is a placeholder - you would need to implement PHPMailer or similar
     */
    private function sendViaSMTP($toEmail, $subject, $htmlBody) {
        // This would require PHPMailer or similar SMTP library
        // For now, fall back to PHP mail
        return $this->sendViaPHPMail($toEmail, $subject, $htmlBody);
        
        /* Example PHPMailer implementation:
        use PHPMailer\PHPMailer\PHPMailer;
        use PHPMailer\PHPMailer\SMTP;
        
        $mail = new PHPMailer(true);
        
        try {
            $mail->isSMTP();
            $mail->Host = $this->smtpHost;
            $mail->SMTPAuth = true;
            $mail->Username = $this->smtpUsername;
            $mail->Password = $this->smtpPassword;
            $mail->SMTPSecure = $this->smtpSecure;
            $mail->Port = $this->smtpPort;
            
            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addAddress($toEmail);
            
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = $this->htmlToPlainText($htmlBody);
            
            $mail->send();
            return ['success' => true];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $mail->ErrorInfo
            ];
        }
        */
    }

    /**
     * Convert HTML to plain text for email compatibility
     */
    private function htmlToPlainText($html) {
        // Remove HTML tags and convert to plain text
        $text = strip_tags($html);
        
        // Clean up whitespace
        $text = preg_replace('/\s+/', ' ', $text);
        $text = trim($text);
        
        // Add some basic formatting
        $text = str_replace(['&nbsp;', '&amp;', '&lt;', '&gt;'], [' ', '&', '<', '>'], $text);
        
        return $text;
    }

    /**
     * Validate email address
     */
    public function isValidEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Send test email
     */
    public function sendTestEmail($toEmail) {
        $subject = "Test Email - Inventory Alert System";
        $body = "
            <h2>Test Email</h2>
            <p>This is a test email from the Inventory Alert System.</p>
            <p>If you received this email, the system is working correctly.</p>
            <p>Sent at: " . date('Y-m-d H:i:s T') . "</p>
        ";
        
        return $this->sendAlert($toEmail, $subject, $body);
    }

    /**
     * Bulk send emails
     */
    public function sendBulkAlerts($recipients, $subject, $htmlBody) {
        $results = [];
        
        foreach ($recipients as $email) {
            if ($this->isValidEmail($email)) {
                $result = $this->sendAlert($email, $subject, $htmlBody);
                $results[] = [
                    'email' => $email,
                    'success' => $result['success'],
                    'error' => $result['error'] ?? null
                ];
            } else {
                $results[] = [
                    'email' => $email,
                    'success' => false,
                    'error' => 'Invalid email address'
                ];
            }
            
            // Small delay to prevent overwhelming the mail server
            usleep(100000); // 0.1 second delay
        }
        
        return $results;
    }

    /**
     * Get email configuration status
     */
    public function getEmailConfig() {
        return [
            'smtp_enabled' => $this->smtpEnabled,
            'from_email' => $this->fromEmail,
            'from_name' => $this->fromName,
            'mail_function_available' => function_exists('mail')
        ];
    }
}
?>
