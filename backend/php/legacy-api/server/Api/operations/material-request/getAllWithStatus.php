<?php
// PHP query for getAllWithStatus method
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

/**
 * Get all material requests with their current status for Kanban board
 * This includes review counts and summary information
 */
function getAllWithStatus($db) {
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
            m.queue_status as status,
            
            -- Calculate request age in days
            DATEDIFF(NOW(), m.createdDate) as age_days,
            
            -- Get requester information
            u.first as requester_first_name,
            u.last as requester_last_name,
            CONCAT(u.first, ' ', u.last) as requester_name,
            u.department as requester_department,
            
            -- Aggregated counts from mrf_det
            COALESCE(det_stats.item_count, 0) as item_count,
            COALESCE(det_stats.pending_validations, 0) as pending_validations,
            COALESCE(det_stats.approved_items, 0) as approved_items,
            COALESCE(det_stats.rejected_items, 0) as rejected_items,
            COALESCE(det_stats.validation_progress, 0) as validation_progress,
            COALESCE(det_stats.last_validated_at, '1970-01-01') as last_validated_at,
            
            -- Aggregated review counts
            COALESCE(review_stats.total_reviews, 0) as total_reviews,
            COALESCE(review_stats.pending_reviews, 0) as pending_reviews,
            COALESCE(review_stats.approved_reviews, 0) as approved_reviews,
            COALESCE(review_stats.rejected_reviews, 0) as rejected_reviews,
            COALESCE(review_stats.clarification_reviews, 0) as clarification_reviews,
            COALESCE(review_stats.last_review_date, '1970-01-01') as last_review_date,
            
            -- Last activity timestamp
            GREATEST(
                COALESCE(m.createdDate, '1970-01-01'),
                COALESCE(m.validated, '1970-01-01'),
                COALESCE(m.pickedCompletedDate, '1970-01-01'),
                COALESCE(review_stats.last_review_date, '1970-01-01'),
                COALESCE(det_stats.last_validated_at, '1970-01-01')
            ) as last_activity,
            
            -- Determine if request has any reviews
            CASE WHEN review_stats.total_reviews > 0 THEN 1 ELSE 0 END as has_reviews,
            
            -- Generate request number for display
            CONCAT('MR-', LPAD(m.id, 6, '0')) as request_number
            
        FROM mrf m
        LEFT JOIN db.users u ON m.createdBy = u.id
        
        -- Aggregate mrf_det statistics
        LEFT JOIN (
            SELECT 
                mrd.mrf_id,
                COUNT(*) as item_count,
                SUM(CASE WHEN mrd.validationStatus = 'pending' THEN 1 ELSE 0 END) as pending_validations,
                SUM(CASE WHEN mrd.validationStatus = 'approved' THEN 1 ELSE 0 END) as approved_items,
                SUM(CASE WHEN mrd.validationStatus = 'rejected' THEN 1 ELSE 0 END) as rejected_items,
                CASE 
                    WHEN COUNT(*) = 0 THEN 0
                    ELSE ROUND(
                        SUM(CASE WHEN mrd.validationStatus IN ('approved', 'rejected') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                    )
                END as validation_progress,
                MAX(mrd.validatedAt) as last_validated_at
            FROM mrf_det mrd 
            GROUP BY mrd.mrf_id
        ) det_stats ON m.id = det_stats.mrf_id
        
        -- Aggregate review statistics
        LEFT JOIN (
            SELECT 
                md.mrf_id,
                COUNT(*) as total_reviews,
                SUM(CASE WHEN mr.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) as pending_reviews,
                SUM(CASE WHEN mr.reviewStatus = 'reviewed' AND mr.reviewDecision = 'approved' THEN 1 ELSE 0 END) as approved_reviews,
                SUM(CASE WHEN mr.reviewStatus = 'reviewed' AND mr.reviewDecision = 'rejected' THEN 1 ELSE 0 END) as rejected_reviews,
                SUM(CASE WHEN mr.reviewStatus = 'reviewed' AND mr.reviewDecision = 'needs_clarification' THEN 1 ELSE 0 END) as clarification_reviews,
                MAX(mr.createdDate) as last_review_date
            FROM mrf_det_reviews mr 
            INNER JOIN mrf_det md ON mr.mrf_det_id = md.id
            GROUP BY md.mrf_id
        ) review_stats ON m.id = review_stats.mrf_id
        
        WHERE m.active = 1  -- Only show active requests
        AND m.queue_status NOT IN ('complete', 'cancelled')  -- Only show unfinished requests
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
        $stmt = $db->prepare($sql);
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

$result = getAllWithStatus($db);
header('Content-Type: application/json');
echo json_encode($result);
?>
