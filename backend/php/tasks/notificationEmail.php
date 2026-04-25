<?php 

use EyefiDb\Databases\DatabaseEyefi;


function emailNotification($fileLocationName, $returnValue = 'notification_emails'){
    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();

    $mainQry = "
        select GROUP_CONCAT(IFNULL(b.email, notification_emails)) notification_emails, 
        GROUP_CONCAT(b.id) user_ids, 
        location
        from safety_incident_config a
        LEFT JOIN db.users b ON b.id = a.user_id
        where location = '$fileLocationName'
        GROUP BY location
    ";
    $query = $db->prepare($mainQry);
    $query->execute();
    $notice =  $query->fetch(PDO::FETCH_ASSOC);
    return $notice[$returnValue];
}