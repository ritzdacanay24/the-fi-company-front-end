<?php

$d = explode(',', emailNotification('field_service_comment_notification_request_form'));

$to = ['schedulinglv@the-fi-company.com'];

$result = array_merge($to, $d);



    echo json_encode($d);