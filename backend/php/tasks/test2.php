<?php


$date1 = "2019-10-30";
$date2 = "2022-02-15";

$diff = abs(strtotime($date2) - strtotime($date1));

$years = floor($diff / (365 * 60 * 60 * 24));
$months = floor(($diff - $years * 365 * 60 * 60 * 24) / (30 * 60 * 60 * 24));
$days = floor(($diff - $years * 365 * 60 * 60 * 24 - $months * 30 * 60 * 60 * 24) / (60 * 60 * 24));


function numberOfDays($startDate, $endDate) 
{
    //1) converting dates to timestamps
     $startSeconds = strtotime($startDate);
     $endSeconds = strtotime($endDate);
   
    //2) Calculating the difference in timestamps
    $diffSeconds = $startSeconds  - $endSeconds;
     
    
    //3) converting timestamps to days
    $days=round($diffSeconds / 86400);
    
      /*  note :
          1 day = 24 hours 
          24 * 60 * 60 = 86400 seconds
      */
   
    //4) printing the number of days
    printf("Difference between two dates: ". abs($days) . " Days ");
    
    return abs($days);
}
echo numberOfDays($date1, $date2);

return;