-- Variables for testing - Set these values at the top
SET @job_id = 7089;  -- Replace with actual job ID
SET @request_date = '2024-01-15';  -- Replace with actual request date
SET @tech_id = 123;  -- Replace with actual tech ID for specific queries

-- 1. Get Available Techs for a Specific Date (Not Already Assigned)
SELECT 
    u.id as user_id,
    CONCAT(u.first, ' ', u.last) as name,
    -- Use default rates since not in users table
    35.00 as user_rate,
    52.50 as overtime_rate,
    u.city,
    u.state,
    u.address,
    u.address1,
    u.zipCode,
    u.title,
    u.department,
    u.workArea as skills,
    u.area as certifications,
    0.75 as performance_rating, -- Default since not in schema
    u.active,
    u.leadInstaller,
    COALESCE(weekly_jobs.job_count, 0) as weekly_workload
FROM db.users u
LEFT JOIN (
    -- Count weekly jobs for workload calculation
    SELECT 
        ft.user_id,
        COUNT(*) as job_count
    FROM fs_team ft
    JOIN fs_scheduler fs ON ft.fs_det_id = fs.id
    WHERE DATE(fs.request_date) >= DATE_SUB(@request_date, INTERVAL 7 DAY)
        AND DATE(fs.request_date) <= DATE_ADD(@request_date, INTERVAL 7 DAY)
        AND fs.active = 1
        AND ft.active = 1
    GROUP BY ft.user_id
) weekly_jobs ON u.id = weekly_jobs.user_id
WHERE u.active = 1 
    AND u.isEmployee = 1
    AND (u.title LIKE '%tech%' OR u.title LIKE '%field%' OR u.title LIKE '%service%' OR u.leadInstaller = 1)
    -- Not already assigned on this specific date
    AND u.id NOT IN (
        SELECT ft.user_id 
        FROM fs_team ft 
        JOIN fs_scheduler fs ON ft.fs_det_id = fs.id 
        WHERE DATE(fs.request_date) = DATE(@request_date)
            AND fs.active = 1
            AND ft.active = 1
    )
    -- Not on holiday/PTO on this date
    AND u.id NOT IN (
        SELECT CAST(ch.resource_id AS UNSIGNED)
        FROM companyHoliday ch
        WHERE ch.active = 1
            AND DATE(@request_date) BETWEEN DATE(ch.start) AND DATE(ch.end)
            AND ch.type IN ('Holiday', 'PTO', 'Sick Leave')
    )
ORDER BY COALESCE(weekly_jobs.job_count, 0) ASC, u.leadInstaller DESC;

-- 2. Get Job Details for Smart Scheduling
SELECT 
    fs.id,
    fs.request_date,
    fs.start_time,
    fs.service_type,
    fs.customer,
    fs.property,
    fs.fs_lat,
    fs.fs_lon,
    fs.address1,
    fs.city,
    fs.state,
    fs.zip_code,
    fs.licensing_required,
    fs.per_tech_rate,
    fs.per_tech_rate_ot,
    fs.status,
    fs.comments,
    fs.notes,
    -- Calculate estimated job complexity based on service type
    CASE 
        WHEN LOWER(fs.service_type) LIKE '%install%' THEN 'Complex'
        WHEN LOWER(fs.service_type) LIKE '%repair%' THEN 'Moderate'
        WHEN LOWER(fs.service_type) LIKE '%maintenance%' THEN 'Moderate'
        WHEN LOWER(fs.service_type) LIKE '%inspection%' THEN 'Simple'
        WHEN LOWER(fs.service_type) LIKE '%delivery%' THEN 'Simple'
        ELSE 'Moderate'
    END as job_complexity,
    -- Estimate duration in hours
    CASE 
        WHEN LOWER(fs.service_type) LIKE '%install%' THEN 4
        WHEN LOWER(fs.service_type) LIKE '%repair%' THEN 2
        WHEN LOWER(fs.service_type) LIKE '%maintenance%' THEN 3
        WHEN LOWER(fs.service_type) LIKE '%inspection%' THEN 1
        WHEN LOWER(fs.service_type) LIKE '%delivery%' THEN 0.5
        ELSE 2
    END as estimated_duration
FROM fs_scheduler fs
WHERE fs.id = @job_id;

-- 3. Check Tech Availability Conflicts
SELECT 
    ch.resource_id,
    ch.type,
    ch.title,
    ch.start,
    ch.end,
    ch.tech_name
FROM companyHoliday ch
WHERE ch.active = 1 
    AND ch.resource_id = @tech_id
    AND DATE(@request_date) BETWEEN DATE(ch.start) AND DATE(ch.end)
ORDER BY ch.start;

-- 4. Get Tech Weekly Workload  
SELECT 
    ft.user_id,
    COUNT(*) as job_count,
    SUM(CASE 
        WHEN LOWER(fs.service_type) LIKE '%install%' THEN 4
        WHEN LOWER(fs.service_type) LIKE '%repair%' THEN 2
        WHEN LOWER(fs.service_type) LIKE '%maintenance%' THEN 3
        WHEN LOWER(fs.service_type) LIKE '%inspection%' THEN 1
        WHEN LOWER(fs.service_type) LIKE '%delivery%' THEN 0.5
        ELSE 2
    END) as estimated_hours
FROM fs_team ft
JOIN fs_scheduler fs ON ft.fs_det_id = fs.id
WHERE DATE(fs.request_date) >= DATE_SUB(@request_date, INTERVAL 7 DAY)
    AND DATE(fs.request_date) <= DATE_ADD(@request_date, INTERVAL 7 DAY)
    AND fs.active = 1
    AND ft.active = 1
    AND ft.user_id = @tech_id
GROUP BY ft.user_id;

-- 5. Get Tech Performance History
SELECT 
    ft.user_id,
    COUNT(*) as total_jobs,
    AVG(CASE WHEN wo.workCompleted = 'Yes' THEN 1 ELSE 0 END) as completion_rate,
    AVG(CASE WHEN wo.survey = 'Yes' THEN 1 ELSE 0 END) as customer_satisfaction,
    AVG(ft.user_rate) as avg_rate,
    u.leadInstaller,
    CONCAT(u.first, ' ', u.last) as tech_name
FROM fs_team ft
JOIN fs_scheduler fs ON ft.fs_det_id = fs.id
JOIN db.users u ON ft.user_id = u.id
LEFT JOIN fs_workOrder wo ON fs.id = wo.fs_scheduler_id
WHERE ft.user_id = @tech_id
    AND fs.active = 1
    AND ft.active = 1
    AND fs.request_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
GROUP BY ft.user_id;

-- 6. Calculate Distance-Based Travel Score (using city/state since no lat/lng)
SELECT 
    u.id as user_id,
    CONCAT(u.first, ' ', u.last) as name,
    u.city as home_city,
    u.state as home_state,
    u.address,
    u.zipCode
FROM db.users u
WHERE u.active = 1 
    AND u.isEmployee = 1
    AND (u.title LIKE '%tech%' OR u.title LIKE '%field%' OR u.title LIKE '%service%' OR u.leadInstaller = 1)
    AND u.city IS NOT NULL 
    AND u.state IS NOT NULL
ORDER BY u.city, u.state;

-- 7. Smart Scheduling Recommendation Query (Fixed syntax)
SELECT 
    tech_data.*,
    job_data.service_type,
    job_data.licensing_required,
    job_data.per_tech_rate,
    job_data.job_complexity,
    job_data.estimated_duration,
    job_data.job_city,
    job_data.job_state,
    COALESCE(conflicts.conflict_count, 0) as availability_conflicts,
    COALESCE(performance.completion_rate, 0.7) as performance_rating,
    -- Calculate skill match score based on workArea/title
    CASE 
        WHEN job_data.service_type LIKE '%electrical%' AND (tech_data.skills LIKE '%electrical%' OR tech_data.title LIKE '%electrical%') THEN 1.0
        WHEN job_data.service_type LIKE '%install%' AND tech_data.leadInstaller = 1 THEN 1.0
        WHEN job_data.service_type LIKE '%maintenance%' AND tech_data.skills LIKE '%maintenance%' THEN 0.9
        WHEN job_data.service_type LIKE '%repair%' AND tech_data.skills LIKE '%repair%' THEN 0.9
        WHEN tech_data.skills LIKE '%general%' OR tech_data.title LIKE '%general%' THEN 0.7
        ELSE 0.6
    END as skill_match_score,
    -- Calculate cost effectiveness score (using default rates)
    CASE 
        WHEN tech_data.user_rate <= job_data.per_tech_rate THEN 1.0
        WHEN tech_data.user_rate <= job_data.per_tech_rate * 1.1 THEN 0.8
        WHEN tech_data.user_rate <= job_data.per_tech_rate * 1.2 THEN 0.6
        ELSE 0.4
    END as cost_score,
    -- Calculate workload balance score
    CASE 
        WHEN tech_data.weekly_workload = 0 THEN 1.0
        WHEN tech_data.weekly_workload <= 2 THEN 0.8
        WHEN tech_data.weekly_workload <= 4 THEN 0.6
        ELSE 0.4
    END as workload_score,
    -- Location preference score (same city/state bonus)
    CASE 
        WHEN tech_data.city = job_data.job_city AND tech_data.state = job_data.job_state THEN 1.0
        WHEN tech_data.state = job_data.job_state THEN 0.7
        ELSE 0.5
    END as location_score
FROM (
    -- Tech availability data
    SELECT 
        u.id as user_id,
        CONCAT(u.first, ' ', u.last) as name,
        35.00 as user_rate, -- Default rate
        52.50 as user_rate_ot,
        u.city,
        u.state,
        u.workArea as skills,
        u.area as certifications,
        u.title,
        u.leadInstaller,
        u.active,
        COALESCE(weekly_jobs.job_count, 0) as weekly_workload
    FROM db.users u
    LEFT JOIN (
        SELECT 
            ft.user_id,
            COUNT(*) as job_count
        FROM fs_team ft
        JOIN fs_scheduler fs ON ft.fs_det_id = fs.id
        WHERE DATE(fs.request_date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND DATE(fs.request_date) <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            AND fs.active = 1
            AND ft.active = 1
        GROUP BY ft.user_id
    ) weekly_jobs ON u.id = weekly_jobs.user_id
    WHERE u.active = 1 
        AND u.isEmployee = 1
        AND (u.title LIKE '%tech%' OR u.title LIKE '%field%' OR u.title LIKE '%service%' OR u.leadInstaller = 1)
        AND u.id NOT IN (
            SELECT ft.user_id 
            FROM fs_team ft 
            JOIN fs_scheduler fs ON ft.fs_det_id = fs.id 
            WHERE DATE(fs.request_date) = DATE(@request_date)
                AND fs.active = 1
                AND ft.active = 1
        )
) tech_data
CROSS JOIN (
    -- Job details
    SELECT 
        fs.service_type,
        fs.licensing_required,
        fs.per_tech_rate,
        fs.city as job_city,
        fs.state as job_state,
        CASE 
            WHEN LOWER(fs.service_type) LIKE '%install%' THEN 'Complex'
            WHEN LOWER(fs.service_type) LIKE '%repair%' THEN 'Moderate'
            WHEN LOWER(fs.service_type) LIKE '%maintenance%' THEN 'Moderate'
            WHEN LOWER(fs.service_type) LIKE '%inspection%' THEN 'Simple'
            WHEN LOWER(fs.service_type) LIKE '%delivery%' THEN 'Simple'
            ELSE 'Moderate'
        END as job_complexity,
        CASE 
            WHEN LOWER(fs.service_type) LIKE '%install%' THEN 4
            WHEN LOWER(fs.service_type) LIKE '%repair%' THEN 2
            WHEN LOWER(fs.service_type) LIKE '%maintenance%' THEN 3
            WHEN LOWER(fs.service_type) LIKE '%inspection%' THEN 1
            WHEN LOWER(fs.service_type) LIKE '%delivery%' THEN 0.5
            ELSE 2
        END as estimated_duration
    FROM fs_scheduler fs
    WHERE fs.id = @job_id
) job_data
LEFT JOIN (
    -- Availability conflicts
    SELECT 
        CAST(ch.resource_id AS UNSIGNED) as user_id,
        COUNT(*) as conflict_count
    FROM companyHoliday ch
    WHERE ch.active = 1
        AND DATE(@request_date) BETWEEN DATE(ch.start) AND DATE(ch.end)
    GROUP BY ch.resource_id
) conflicts ON tech_data.user_id = conflicts.user_id
LEFT JOIN (
    -- Performance data (updated table name)
    SELECT 
        ft.user_id,
        AVG(CASE WHEN wo.workCompleted = 'Yes' THEN 1 ELSE 0 END) as completion_rate
    FROM fs_team ft
    JOIN fs_scheduler fs ON ft.fs_det_id = fs.id
    LEFT JOIN fs_workOrder wo ON fs.id = wo.fs_scheduler_id
    WHERE fs.active = 1
        AND ft.active = 1
        AND fs.request_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY ft.user_id
) performance ON tech_data.user_id = performance.user_id
WHERE COALESCE(conflicts.conflict_count, 0) = 0  -- Only available techs
ORDER BY 
    (skill_match_score * 0.25 + 
     cost_score * 0.20 + 
     workload_score * 0.20 + 
     location_score * 0.15 +
     COALESCE(performance.completion_rate, 0.7) * 0.15 +
     tech_data.leadInstaller * 0.05) DESC
LIMIT 10;

-- 8. Simplified Available Techs Query (Fixed syntax)
SELECT 
    u.id,
    CONCAT(u.first, ' ', u.last) as name,
    u.title,
    u.leadInstaller,
    u.city,
    u.state,
    u.workArea as skills,
    COALESCE(current_jobs.job_count, 0) as current_workload
FROM db.users u
LEFT JOIN (
    SELECT 
        ft.user_id,
        COUNT(*) as job_count
    FROM fs_team ft
    JOIN fs_scheduler fs ON ft.fs_det_id = fs.id
    WHERE DATE(fs.request_date) = DATE(@request_date)
        AND fs.active = 1
        AND ft.active = 1
    GROUP BY ft.user_id
) current_jobs ON u.id = current_jobs.user_id
WHERE u.active = 1 
    AND u.isEmployee = 1
    AND (u.title LIKE '%tech%' OR u.title LIKE '%field%' OR u.title LIKE '%service%' OR u.leadInstaller = 1)
    AND u.id NOT IN (
        SELECT CAST(ch.resource_id AS UNSIGNED)
        FROM companyHoliday ch
        WHERE ch.active = 1
            AND DATE(@request_date) BETWEEN DATE(ch.start) AND DATE(ch.end)
            AND ch.type IN ('Holiday', 'PTO', 'Sick Leave')
    )
ORDER BY 
    COALESCE(current_jobs.job_count, 0) ASC, 
    u.leadInstaller DESC, 
    u.first ASC;
    u.first ASC;
