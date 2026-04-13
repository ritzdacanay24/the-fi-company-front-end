<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

    $mainQry = "
        SELECT *
        from time_tracker a
        LEFT JOIN (
		  	SELECT sum(TIMESTAMPDIFF(HOUR, start_time,end_time)) total_time, time_tracker_id
		  	FROM time_tracker_detail 
		  	GROUP BY time_tracker_id
		  ) b ON b.time_tracker_id = a.id
    ";

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);
