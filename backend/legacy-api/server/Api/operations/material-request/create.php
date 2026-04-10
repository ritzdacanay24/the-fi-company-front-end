<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    require '/var/www/html/shared/EmailTemplate.php';

    
    $_POST = json_decode(file_get_contents("php://input"), true);
    
    $database->insert("mrf", $_POST['main']);

    $insertId = $database->id();

    foreach ($_POST['details'] as $row) {
        $row['mrf_id'] = $insertId;
        $data = $database->insert("mrf_det", $row);
    }

    // Send email using new EmailTemplate service
    $emailTemplate = new EmailTemplate();
    
    // Get email addresses
    $addresses = explode(',', emailNotification('create_material_request'));
    $recipients = array_filter(array_map('trim', $addresses)); // Clean up addresses
    
    // Fetch the material request details for the email
    $mrDetails = $database->select("mrf_det", "*", ["mrf_id" => $insertId]);
    $mrInfo = $database->select("mrf", "*", ["id" => $insertId]);
    
    // Prepare email variables
    $link = 'https://dashboard.eye-fi.com/dist/web/operations/material-request/validate-list?id=' . $insertId;
    
    // Build the details table
    $detailsTable = '';
    if (!empty($mrDetails)) {
        $detailsTable = '
        <div style="border-radius: 12px; overflow: hidden; box-shadow: 0px rgba(0, 0, 0, 0.12); border: 1px solid #e9ecef; background-color: #ffffff; margin: 20px 0;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; margin: 0; background-color: #ffffff;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <th style="background: transparent; color: #ffffff; padding: 18px 15px; text-align: left; font-weight: 700; font-size: 14px; border: none; font-family: Arial, sans-serif; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px;">📦 Part Number</th>
                        <th style="background: transparent; color: #ffffff; padding: 18px 15px; text-align: left; font-weight: 700; font-size: 14px; border: none; font-family: Arial, sans-serif; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px;">📝 Description</th>
                        <th style="background: transparent; color: #ffffff; padding: 18px 15px; text-align: center; font-weight: 700; font-size: 14px; border: none; font-family: Arial, sans-serif; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px;">🔢 Qty</th>
                        <th style="background: transparent; color: #ffffff; padding: 18px 15px; text-align: center; font-weight: 700; font-size: 14px; border: none; font-family: Arial, sans-serif; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Priority</th>
                    </tr>
                </thead>
                <tbody>';
        
        $rowIndex = 0;
        foreach ($mrDetails as $detail) {
            $rowIndex++;
            $priorityColor = '';
            $priorityIcon = '';
            // Priority comes from main mrf table, not detail table
            $priority = ucfirst($mrInfo[0]['priority'] ?? 'normal');
            switch (strtolower($priority)) {
                case 'urgent':
                    $priorityColor = 'background: linear-gradient(135deg, #ffebee 0%, #f8d7da 100%); color: #721c24; border: 1px solid #f5c6cb;';
                    $priorityIcon = '🔥';
                    break;
                case 'high':
                    $priorityColor = 'background: linear-gradient(135deg, #fffde7 0%, #fff3cd 100%); color: #856404; border: 1px solid #ffeaa7;';
                    $priorityIcon = '⚠️';
                    break;
                default:
                    $priorityColor = 'background: linear-gradient(135deg, #f3e5f5 0%, #d4edda 100%); color: #155724; border: 1px solid #c3e6cb;';
                    $priorityIcon = '✅';
            }
            
            $rowBg = $rowIndex % 2 === 0 ? '#f8f9fa' : '#ffffff';
            
            $detailsTable .= '
                    <tr style="background-color: ' . $rowBg . '; transition: all 0.2s ease;">
                        <td style="padding: 20px 15px; border-bottom: 1px solid #e9ecef; vertical-align: middle; background-color: transparent;">
                            <div style="display: flex; align-items: center;">
                                <span style="background: #007bff; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 10px;">' . $rowIndex . '</span>
                                <strong style="color: #495057; font-size: 15px;">' . htmlspecialchars($detail['partNumber'] ?? 'N/A') . '</strong>
                            </div>
                        </td>
                        <td style="padding: 20px 15px; border-bottom: 1px solid #e9ecef; vertical-align: middle; background-color: transparent;">
                            <span style="color: #6c757d; line-height: 1.4;">' . htmlspecialchars($detail['description'] ?? 'N/A') . '</span>
                        </td>
                        <td style="padding: 20px 15px; border-bottom: 1px solid #e9ecef; vertical-align: middle; background-color: transparent; text-align: center;">
                            <span style="background: #e9ecef; color: #495057; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 14px;">' . htmlspecialchars($detail['qty'] ?? 'N/A') . '</span>
                        </td>
                        <td style="padding: 20px 15px; border-bottom: 1px solid #e9ecef; vertical-align: middle; background-color: transparent; text-align: center;">
                            <span style="display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 25px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; ' . $priorityColor . '">
                                <span style="margin-right: 6px;">' . $priorityIcon . '</span>' . $priority . '
                            </span>
                        </td>
                    </tr>';
        }
        
        $detailsTable .= '
                </tbody>
            </table>
            <div style="background: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #e9ecef;">
                <span style="color: #6c757d; font-size: 13px; font-weight: 600;">Total Items: ' . count($mrDetails) . ' • Request ID: MRF#' . htmlspecialchars($insertId) . '</span>
            </div>
        </div>';
    }
    
    $emailContent = '
    <div class="notification">
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; border-left: 5px solid #007bff;">
            <h2 style="color: #007bff; margin: 0; font-size: 24px; font-weight: 700;">📋 New Material Request</h2>
            <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 16px;">Requires Your Immediate Attention</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #495057;">A new material request has been submitted to the system and is pending validation. Please review the details below and take appropriate action.</p>
        
        <div class="info-box primary" style="margin: 25px 0; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-left: 4px solid #2196f3; border-radius: 8px;">
            <h4 style="color: #0d47a1; margin-top: 0; display: flex; align-items: center;"><span style="margin-right: 8px;">📄</span>Request Information</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <div>
                    <p style="margin: 8px 0;"><strong style="color: #1565c0;">Request ID:</strong> <span style="background: #fff; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #007bff; font-weight: bold;">MRF#' . htmlspecialchars($insertId) . '</span></p>
                    ' . (!empty($mrInfo[0]['requestor']) ? '<p style="margin: 8px 0;"><strong style="color: #1565c0;">Requestor:</strong> <span style="color: #495057;">' . htmlspecialchars($mrInfo[0]['requestor']) . '</span></p>' : '') . '
                    ' . (!empty($mrInfo[0]['dueDate']) ? '<p style="margin: 8px 0;"><strong style="color: #1565c0;">Due Date:</strong> <span style="color: #dc3545; font-weight: 600;">' . htmlspecialchars(date('M d, Y', strtotime($mrInfo[0]['dueDate']))) . '</span></p>' : '') . '
                </div>
                <div>
                    ' . (!empty($mrInfo[0]['lineNumber']) ? '<p style="margin: 8px 0;"><strong style="color: #1565c0;">Line Number:</strong> <span style="color: #495057;">' . htmlspecialchars($mrInfo[0]['lineNumber']) . '</span></p>' : '') . '
                    ' . (!empty($mrInfo[0]['assemblyNumber']) ? '<p style="margin: 8px 0;"><strong style="color: #1565c0;">Assembly:</strong> <span style="color: #495057;">' . htmlspecialchars($mrInfo[0]['assemblyNumber']) . '</span></p>' : '') . '
                    ' . (!empty($mrInfo[0]['priority']) ? '<p style="margin: 8px 0;"><strong style="color: #1565c0;">Priority:</strong> <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; ' . 
                        (strtolower($mrInfo[0]['priority']) === 'urgent' ? 'background-color: #f8d7da; color: #721c24;' : 
                        (strtolower($mrInfo[0]['priority']) === 'high' ? 'background-color: #fff3cd; color: #856404;' : 'background-color: #d4edda; color: #155724;')) . '">' . 
                        htmlspecialchars(ucfirst($mrInfo[0]['priority'])) . '</span></p>' : '') . '
                </div>
            </div>
            ' . (!empty($mrInfo[0]['createdDate']) ? '<p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #c3d9ff; font-size: 14px; color: #6c757d;"><strong>Submitted:</strong> ' . htmlspecialchars(date('M d, Y \a\t g:i A', strtotime($mrInfo[0]['createdDate']))) . '</p>' : '') . '
        </div>
        
        ' . (!empty($mrInfo[0]['specialInstructions']) ? '
        <div class="info-box warning" style="margin: 25px 0; background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%); border-left: 4px solid #ff9800; border-radius: 8px;">
            <h4 style="color: #e65100; margin-top: 0; display: flex; align-items: center;"><span style="margin-right: 8px;">⚠️</span>Special Instructions</h4>
            <div style="background: #fff; padding: 15px; border-radius: 6px; border: 1px solid #ffe0b2;">
                <p style="margin: 0; color: #bf360c; font-style: italic; line-height: 1.5;">' . nl2br(htmlspecialchars($mrInfo[0]['specialInstructions'])) . '</p>
            </div>
        </div>' : '') . '
        
        <div style="margin: 30px 0;">
            <h4 style="color: #495057; display: flex; align-items: center; margin-bottom: 20px;"><span style="margin-right: 8px;">📦</span>Requested Items (' . count($mrDetails) . ' item' . (count($mrDetails) !== 1 ? 's' : '') . ')</h4>
            ' . $detailsTable . '
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; border: 1px solid #dee2e6;">
                <h4 style="color: #495057; margin: 0 0 15px 0;">Ready to Review?</h4>
                <p style="color: #6c757d; margin: 0 0 20px 0; font-size: 14px;">Click the button below to access the validation dashboard</p>
                <a href="' . htmlspecialchars($link) . '" class="btn" style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); border: none; box-shadow: 0 4px 15px rgba(0, 123, 255, 0.4); transform: translateY(0); transition: all 0.3s ease;">
                    🔍 Review & Validate Request
                </a>
            </div>
        </div>
        
        <div class="info-box" style="margin: 30px 0; background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%); border-left: 4px solid #4caf50; border-radius: 8px;">
            <h4 style="color: #1b5e20; margin-top: 0; display: flex; align-items: center;"><span style="margin-right: 8px;">✅</span>Validation Checklist</h4>
            <div style="background: #fff; padding: 15px; border-radius: 6px; border: 1px solid #c8e6c9;">
                <ul style="margin: 0; padding-left: 20px; color: #2e7d32; line-height: 1.8;">
                    <li><strong>Verify part numbers</strong> and quantities against inventory</li>
                    <li><strong>Check availability</strong> and lead times for requested items</li>
                    <li><strong>Review priority level</strong> and due date requirements</li>
                    <li><strong>Validate assembly compatibility</strong> if applicable</li>
                    <li><strong>Approve, reject, or request modifications</strong> as needed</li>
                </ul>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;"><strong>Questions or Issues?</strong> Contact the requesting department or your system administrator for assistance.</p>
            <p style="color: #007bff; font-weight: 600; margin: 10px 0 0 0;">Thank you for maintaining our operational excellence!</p>
        </div>
    </div>';
    
    // Set template variables
    $emailTemplate->setVars([
        'content' => $emailContent,
        'mrf_id' => $insertId,
        'validation_link' => $link
    ]);
    
    // Set sender information
    $emailTemplate->setFrom('noreply@the-fi-company.com', 'EyeFi Material Request System');
    
    // Send email to all recipients
    foreach ($recipients as $recipient) {
        if (!empty($recipient) && filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            $result = $emailTemplate->sendWithResult(
                $recipient,
                "Material Request Submitted - MRF#" . $insertId,
                $emailContent,
                false // This is template content, not a file
            );
            
            // Log any email failures
            if (!$result['success']) {
                error_log("Failed to send material request email to {$recipient}: " . $result['message']);
            }
        }
    }


    echo json_encode(array("insertId" => $insertId));
