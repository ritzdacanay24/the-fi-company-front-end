<?php

use EyefiDb\Api\FieldService\FieldService;


use EyefiDb\Databases\DatabaseEyefi;
$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

    $data = new FieldService($db);


    
    $turnOverInfo = $data->getTurnoverRate($_GET['dateFrom'], $_GET['dateTo']);


    $chartData1 = $turnOverInfo['chartnew'];
    $chartLabel1 = $turnOverInfo['obj']['label'];
    
    $barChartData1 = [];

    foreach($chartData1 as $key=>$val){


    $barChartData1[] = array(
        "data" => $chartData1[$key]['dataset'],
        "label" => $chartData1[$key]['label'],
        
        "borderWidth"=> 1,
        "pointRadius"=> 0.5,
        "tension"=> 1,
        "fill"=> false,
        "type" => $chartData1[$key]['label'] == 'Goal' ? 'line' : 'bar',
            "datalabels" => array(
                "display" => $chartData1[$key]['label'] == 'Goal' ? false : true
            )
        
    );

   }
  
   $chartConfigArr1 = array(
    "type" => 'bar',
        'data' => array(
        'labels' => $chartLabel1,
        'datasets' => $barChartData1
        ),
        "options" => array(
            "title" => 
                array(
                    "display" =>  true,
                    "text" =>  'Turnover'
                ),
                "plugins" =>  array(
                    "datalabels" => array(
                        "display" => false,
                        "anchor" => 'end',
                        "align" => 'top',
                        "formatter" =>  "Math.ceil",
                    )
                )
        ),
    );



    echo $chartConfig1 =  json_encode($chartConfigArr1);



//***************************************************************************************** */
    $results = $data->readPlatformData($_GET['dateFrom'], $_GET['dateTo']);

    $chartData = $results['chart']['chartnew'];
    $chartLabel = $results['chart']['obj']['label'];
    
    $barChartData = [];

    $array = (array) $chartData;  
    foreach($chartData as $key=>$val){


    $barChartData[] = array(
        "data" => $chartData[$key]['dataset'],
        "label" => $chartData[$key]['label'],
        
        "borderWidth"=> 1,
        "pointRadius"=> 0.5,
        "tension"=> 1,
        "fill"=> false,
        "type" => $chartData[$key]['label'] == 'Install Goal' || $chartData[$key]['label'] == 'Removal Goal' ? 'line' : 'bar'
    );

   }
  
   $chartConfigArr = array(
    "type" => 'bar',
        'data' => array(
        'labels' => $chartLabel,
        'datasets' => $barChartData
        ),
        "options" => array(
            "title" => 
                array(
                    "display" =>  true,
                    "text" =>  'Platform Averages'
                ),
                "plugins" =>  array(
                    "datalabels" => array(
                        "display" => false,
                        "anchor" => 'end',
                        "align" => 'top',
                        "formatter" =>  "Math.ceil",
                    )
                )
        ),
    );


     echo $chartConfig =  json_encode($chartConfigArr);
     
    //$chartConfig = json_encode($chartConfigArr);

    $chartUrl = 'https://quickchart.io/chart?w=500&h=300&c=' . urlencode($chartConfig);
    $chartUrl1 = 'https://quickchart.io/chart?w=500&h=300&c=' . urlencode($chartConfig1);

    $emailUsers = "ritz.dacanay@the-fi-company.com";


    $to         = $emailUsers;
    $subject   	= "Hot Drop In - Work Order ";
    $from       = "do-not-reply@training.knowbe4.com";

    $body  = 'Hello Nich, <br>';
    $body .= "Please see the chart below:<br><br><img src=\"$chartUrl\"><br><br>";
    $body .= "Please see the chart below:<br><br><img src=\"$chartUrl1\">";
    $body .= '<html><body>';
        

    $body .= "</body></html>";

    $headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n" .
        'Reply-To:' . MAIL_EMAIL . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
    $headers .= "Content-Transfer-Encoding: 64bit\r\n";
    $headers .= "X-Priority: 3\r\n";
    $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";


    $finalMessage = wordwrap($body, 100, "\n");

    
    mail($to, $subject, $finalMessage, $headers);