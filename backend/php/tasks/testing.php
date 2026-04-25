<?php 



$test = [];

$start = '2024-04-19';
$end = '2024-04-30';

function dateRange($first, $last, $step = '+1 day', $format = 'Y-m-d' ) {
        $dates = array();
        $current = strtotime($first);
        $last = strtotime($last);


        while( $current <= $last ) {    
        
            $weekDay = date('w', $current);
            if ($weekDay != 0 && $weekDay != 6){
                $dates[] = date($format, $current);
            }
            $current = strtotime($step, $current);
        }
        return $dates;
}

$data = dateRange($start, $end, "+1 day");//increase by one month


echo json_encode($data);

