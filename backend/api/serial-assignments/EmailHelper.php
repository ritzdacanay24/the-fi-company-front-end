<?php
/**
 * Email Helper - Simple email utility using PHP's mail() function
 * For production use, consider PHPMailer for more robust email handling
 */
class EmailHelper {
    
    /**
     * Send email with HTML content
     * 
     * @param string $to Recipient email address
     * @param string $subject Email subject
     * @param string $htmlBody HTML email body
     * @param string $fromEmail Sender email (optional)
     * @param string $fromName Sender name (optional)
     * @return bool Success status
     */
    public static function sendEmail($to, $subject, $htmlBody, $fromEmail = null, $fromName = null) {
        // Default sender info
        if (!$fromEmail) {
            $fromEmail = 'noreply@eyefi.com';
        }
        if (!$fromName) {
            $fromName = 'EyeFi Quality System';
        }
        
        // Email headers
        $headers = [];
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "Content-Type: text/html; charset=UTF-8";
        $headers[] = "From: {$fromName} <{$fromEmail}>";
        $headers[] = "Reply-To: {$fromEmail}";
        $headers[] = "X-Mailer: PHP/" . phpversion();
        
        // Send email
        try {
            $success = mail($to, $subject, $htmlBody, implode("\r\n", $headers));
            
            if ($success) {
                error_log("Email sent successfully to: {$to}");
            } else {
                error_log("Failed to send email to: {$to}");
            }
            
            return $success;
        } catch (Exception $e) {
            error_log("Email error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Generate UL Audit Report HTML
     */
    public static function generateULAuditReportHTML($signoffData) {
        $auditDate = date('F j, Y g:i A', strtotime($signoffData['audit_date']));
        $ulNumbers = is_array($signoffData['ul_numbers']) ? $signoffData['ul_numbers'] : json_decode($signoffData['ul_numbers'], true);
        $itemsAudited = count($ulNumbers);
        
        // Generate UL numbers in columns (6 columns like print layout)
        $ulNumbersHtml = '';
        $columns = 6;
        $rows = ceil($itemsAudited / $columns);
        
        for ($row = 0; $row < $rows; $row++) {
            $ulNumbersHtml .= '<tr>';
            for ($col = 0; $col < $columns; $col++) {
                $index = $row + ($col * $rows);
                if ($index < $itemsAudited) {
                    $ulNumbersHtml .= '<td style="padding: 4px 8px; border: 1px solid #dee2e6; font-family: monospace; font-size: 9pt;">' . 
                                     htmlspecialchars($ulNumbers[$index]) . '</td>';
                } else {
                    $ulNumbersHtml .= '<td style="padding: 4px 8px; border: 1px solid #dee2e6;"></td>';
                }
            }
            $ulNumbersHtml .= '</tr>';
        }
        
        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #198754 0%, #157347 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
        }
        .info-section {
            background: #f8f9fa;
            border-left: 4px solid #198754;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-row {
            display: flex;
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: bold;
            min-width: 150px;
            color: #495057;
        }
        .info-value {
            color: #212529;
        }
        .ul-numbers-section {
            margin: 30px 0;
        }
        .ul-numbers-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #198754;
            margin: 20px 0 10px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #198754;
        }
        .notes {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>✓ UL New Audit Sign-Off Report</h1>
        <p>Quality Control Documentation</p>
    </div>
    
    <div class="info-section">
        <div class="info-row">
            <span class="info-label">Audit Date:</span>
            <span class="info-value">{$auditDate}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Auditor Name:</span>
            <span class="info-value">{$signoffData['auditor_name']}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Auditor Signature:</span>
            <span class="info-value">{$signoffData['auditor_signature']}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Items Audited:</span>
            <span class="info-value"><strong>{$itemsAudited}</strong> UL New items</span>
        </div>
    </div>
    
    <div class="section-title">Audited UL Numbers</div>
    <div class="ul-numbers-section">
        <table class="ul-numbers-table">
            {$ulNumbersHtml}
        </table>
    </div>
HTML;

        if (!empty($signoffData['notes'])) {
            $html .= <<<HTML
    <div class="notes">
        <strong>Audit Notes:</strong><br>
        {$signoffData['notes']}
    </div>
HTML;
        }
        
        $html .= <<<HTML
    <div class="footer">
        <p>This is an automated email from the EyeFi Quality Control System.</p>
        <p>Generated on: {$auditDate}</p>
    </div>
</body>
</html>
HTML;
        
        return $html;
    }
}
