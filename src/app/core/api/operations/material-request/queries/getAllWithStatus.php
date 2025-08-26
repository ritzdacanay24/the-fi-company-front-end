<?php
// PHP query for getAllWithStatus method

/**
 * Get all material requests with their current status for Kanban board
 * This includes review counts and summary information
 */
function getAllWithStatus($pdo) {
    $sql = "
        SELECT 
            m.id,
            m.requestor,
            m.lineNumber,
            m.dueDate,
            m.priority,
            m.createdDate,
            m.createdBy,
            m.validated,
            m.pickedCompletedDate,
            m.active,
            m.specialInstructions,
            m.assemblyNumber,
            m.isCableRequest,
            
            -- Status determination (if queue_status field exists, use it; otherwise calculate)
            COALESCE(
                m.queue_status,
                CASE 
                    WHEN m.active = 0 THEN 'cancelled'
                    WHEN m.pickedCompletedDate IS NOT NULL THEN 'complete'
                    WHEN m.validated IS NOT NULL THEN 'picking'
                    WHEN EXISTS(
                        SELECT 1 FROM material_request_reviews mr 
                        WHERE mr.mrf_id = m.id 
                        AND mr.review_status IN ('pending_review', 'assigned')
                    ) THEN 'pending_review'
                    WHEN m.validated IS NULL THEN 'under_validation'
                    ELSE 'new'
                END
            ) as status,
            
            -- Calculate request age in days
            DATEDIFF(NOW(), m.createdDate) as age_days,
            
            -- Get requester information
            u.firstName as requester_first_name,
            u.lastName as requester_last_name,
            CONCAT(u.firstName, ' ', u.lastName) as requester_name,
            u.department as requester_department,
            
            -- Count total items in this request
            (SELECT COUNT(*) FROM material_request_detail mrd WHERE mrd.mrf_id = m.id) as item_count,
            
            -- Count pending validations
            (SELECT COUNT(*) FROM material_request_detail mrd 
             WHERE mrd.mrf_id = m.id 
             AND mrd.validationStatus = 'pending') as pending_validations,
             
            -- Count approved items
            (SELECT COUNT(*) FROM material_request_detail mrd 
             WHERE mrd.mrf_id = m.id 
             AND mrd.validationStatus = 'approved') as approved_items,
             
            -- Count rejected items
            (SELECT COUNT(*) FROM material_request_detail mrd 
             WHERE mrd.mrf_id = m.id 
             AND mrd.validationStatus = 'rejected') as rejected_items,
            
            -- Review counts and status
            (SELECT COUNT(*) FROM material_request_reviews mr 
             WHERE mr.mrf_id = m.id) as total_reviews,
             
            (SELECT COUNT(*) FROM material_request_reviews mr 
             WHERE mr.mrf_id = m.id 
             AND mr.review_status IN ('pending_review', 'assigned')) as pending_reviews,
             
            (SELECT COUNT(*) FROM material_request_reviews mr 
             WHERE mr.mrf_id = m.id 
             AND mr.review_status = 'reviewed' 
             AND mr.review_decision = 'approved') as approved_reviews,
             
            (SELECT COUNT(*) FROM material_request_reviews mr 
             WHERE mr.mrf_id = m.id 
             AND mr.review_status = 'reviewed' 
             AND mr.review_decision = 'rejected') as rejected_reviews,
             
            (SELECT COUNT(*) FROM material_request_reviews mr 
             WHERE mr.mrf_id = m.id 
             AND mr.review_status = 'reviewed' 
             AND mr.review_decision = 'needs_clarification') as clarification_reviews,
            
            -- Validation progress percentage
            CASE 
                WHEN (SELECT COUNT(*) FROM material_request_detail mrd WHERE mrd.mrf_id = m.id) = 0 THEN 0
                ELSE ROUND(
                    (SELECT COUNT(*) FROM material_request_detail mrd 
                     WHERE mrd.mrf_id = m.id 
                     AND mrd.validationStatus IN ('approved', 'rejected')) * 100.0 /
                    (SELECT COUNT(*) FROM material_request_detail mrd WHERE mrd.mrf_id = m.id)
                )
            END as validation_progress,
            
            -- Last activity timestamp
            GREATEST(
                COALESCE(m.createdDate, '1970-01-01'),
                COALESCE(m.validated, '1970-01-01'),
                COALESCE(m.pickedCompletedDate, '1970-01-01'),
                COALESCE(
                    (SELECT MAX(mr.created_at) FROM material_request_reviews mr WHERE mr.mrf_id = m.id),
                    '1970-01-01'
                ),
                COALESCE(
                    (SELECT MAX(mrd.validatedAt) FROM material_request_detail mrd WHERE mrd.mrf_id = m.id),
                    '1970-01-01'
                )
            ) as last_activity,
            
            -- Determine if request has any reviews
            CASE WHEN EXISTS(
                SELECT 1 FROM material_request_reviews mr WHERE mr.mrf_id = m.id
            ) THEN 1 ELSE 0 END as has_reviews,
            
            -- Calculate total estimated value (if you have pricing data)
            -- (SELECT SUM(mrd.qty * COALESCE(p.unit_cost, 0)) 
            --  FROM material_request_detail mrd 
            --  LEFT JOIN parts p ON mrd.partNumber = p.part_number 
            --  WHERE mrd.mrf_id = m.id) as total_value,
            
            -- Generate request number for display
            CONCAT('MR-', LPAD(m.id, 6, '0')) as request_number
            
        FROM mrf m
        LEFT JOIN users u ON m.createdBy = u.id
        WHERE m.active = 1  -- Only show active requests
        ORDER BY 
            CASE m.priority 
                WHEN 'high' THEN 1 
                WHEN 'normal' THEN 2 
                WHEN 'low' THEN 3 
                ELSE 2 
            END,
            m.createdDate DESC
    ";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Post-process results to add computed fields
        foreach ($results as &$row) {
            // Determine if overdue (more than 7 days old)
            $row['is_overdue'] = ($row['age_days'] > 7) ? 1 : 0;
            
            // Format dates for frontend
            $row['created_at'] = $row['createdDate'];
            $row['validated_at'] = $row['validated'];
            $row['completed_at'] = $row['pickedCompletedDate'];
            
            // Add actionable flag
            $row['actionable'] = ($row['status'] !== 'complete' && $row['status'] !== 'cancelled') ? 1 : 0;
            
            // Clean up department field
            $row['department'] = $row['requester_department'] ?: 'Unknown';
        }
        
        return [
            'success' => true,
            'data' => $results,
            'total' => count($results)
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage(),
            'data' => []
        ];
    }
}

// Usage in your API endpoint:
// $result = getAllWithStatus($pdo);
// header('Content-Type: application/json');
// echo json_encode($result);
?>
