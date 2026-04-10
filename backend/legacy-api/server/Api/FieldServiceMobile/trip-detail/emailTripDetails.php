<?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

use PHPMailer\PHPMailer\PHPMailer;

//get assigned user emails

$FSID = $_GET['fsId'];


$mainQry = "
    SELECT b.customer
        , b.request_date
        , b.start_time
        , b.address1 job_address_1
        , b.address2 job_address_2
        , b.city job_city
        , b.state job_state
        , b.zip_code job_zip_code
        , b.sign_theme
        , b.service_type
        , b.id fsId
        , b.property
    from fs_travel_det a
    LEFT JOIN fs_scheduler b ON b.id = a.fsId
    WHERE a.fs_travel_header_id = :fsId
    group by b.customer
        , b.request_date
        , b.start_time
        , b.address1 
        , b.address2 
        , b.city 
        , b.state 
        , b.zip_code 
        , b.sign_theme
        , b.service_type
        , b.id
        , b.property
";
$query = $db->prepare($mainQry);
$query->bindParam(':fsId', $FSID, PDO::PARAM_STR);
$query->execute();
$jobs =  $query->fetchAll(PDO::FETCH_ASSOC);

$mainQry = "
    SELECT a.*
        , b.customer
        , b.request_date
        , b.start_time
        , b.address1 job_address_1
        , b.address2 job_address_2
        , b.city job_city
        , b.state job_state
        , b.zip_code job_zip_code
        , b.sign_theme
        , b.service_type
        , DATE_FORMAT(a.start_datetime,'%m/%d/%Y %H:%i') start_datetime
        , DATE_FORMAT(a.end_datetime,'%m/%d/%Y %H:%i') end_datetime
    from fs_travel_det a
    LEFT JOIN fs_scheduler b ON b.id = a.fsId
    WHERE a.fs_travel_header_id = :fsId
    ORDER BY DATE_FORMAT(a.start_datetime,'%m/%d/%Y %H:%i') asc
";
$query = $db->prepare($mainQry);
$query->bindParam(':fsId', $FSID, PDO::PARAM_STR);
$query->execute();
$tripDetails =  $query->fetchAll(PDO::FETCH_ASSOC);

$fsId = array();
$isFlight = false;
foreach($tripDetails as $row){
    $fsId[] = $row['fsId'];

    if($row['type_of_travel'] == 'flight'){
        $isFlight = true;
    }
}


$fsId = implode(',', $fsId);

$mainQry = "
    SELECT GROUP_CONCAT(DISTINCT b.email) emails, group_concat(DISTINCT CONCAT(b.first, ' ', b.last)) names
    from fs_team a
    LEFT JOIN db.users b ON b.id = a.user_id
    where fs_det_id IN ($fsId)
";
$query = $db->prepare($mainQry);
$query->execute();
$results =  $query->fetch(PDO::FETCH_ASSOC);


$emailUsers         = $results['emails'];

$mail = new PHPMailer(true);
$mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
$mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
$mail->Subject = "Trip Itinerary for Group # " . $FSID;

$addresses = explode(',', $emailUsers);
foreach ($addresses as $address) {
    $mail->AddAddress($address);
}
        
    $mail->addCC("ritz.dacanay@the-fi-company.com");
    $mail->addCC("adriann.k@the-fi-company.com");
    $mail->addCC("juvenal.torres@the-fi-company.com");
    $mail->addCC("heidi.elya@the-fi-company.com");


$mail->Body = '<html><body><div >';
//$mail->Body .= "------------------THIS IS A TEST--------------------";
$mail->Body .= "<style type='text/css'>
    
table {
    border-collapse: collapse;
    bacground-color:#fff;
}
table, th, td {
    border: 0px solid black;
    white-space:nowrap;
}
th {
    font-family: Arial, Helvetica, sans-serif;
    font-size: .7em;
    background: #666;
    color: #FFF;
    border-collapse: separate;
    border: 1px solid #000;
}
td {
    font-family: Arial, Helvetica, sans-serif;
    border: 1px solid #DDD;
    padding:5px;
}

</style>";

$mail->Body .= "

<div style='position:absolute;left:10px;top:10px'>
        <img src='https://dashboard.eye-fi.com/test/signatures/Picture1.png' alt='The Fi Company' style='width:100px'/>

</div>
<table  style='text-align:center;width:75%' border='0'>
    <tr>
        <td>
            Service Team Travel & Job Itinerary #$FSID
        </td>
    </tr>
</table>
<br/>
";

$techs = explode(",",$results['names']);

$mail->Body .= "<div   style='text-align:center;width:75%;position:relative'><table>";

$techIndex = 0;
foreach ($techs as $row) {
    $techIndex++;
    $mail->Body    .= "<tr>";
            $mail->Body    .= "<td style='background-color:#FFE55C;'>Tech #$techIndex:</td>";
            $mail->Body    .= "<td style='background-color:#FFE55C;'>$row</td>";
       $mail->Body    .=  "</tr>";
};
$mail->Body .= "</table> </div>
<br/>";


// if($isFlight){
//     $mail->Body .= "
//     <table  style='text-align:center;width:75%'>
//         <tr>
//             <td style='background-color:#6CB4EE;padding: 5px'>
//                 <h3 style='padding:0px;margin:0'>Flights</h3>
//                 <p style='margin-bottom:0px'>Please arrive at the airport 2 hours before take off</p>
//             </td>

//         </tr>

//     </table>

//     ";
// }

$jobIndex = 0;

$mail->Body .= "<table>
    <tr>
        ";
foreach ($jobs as $row) {
    $jobIndex++;

        
    $customer = $row['customer'];
    $request_date = $row['request_date'];
    $start_time = $row['start_time'];
    $service_type = $row['service_type'];
    $sign_theme = $row['sign_theme'];

    $address1 = $row['job_address_1'];
    $address2 = $row['job_address_2'];
    $city = $row['job_city']; 
    $state = $row['job_state'];
    $zip_code = $row['job_zip_code'];
    $property = $row['property'];
    
    $fsId = $row['fsId'];
    $mail->Body .= '<td><table rules="all" style="font-size:12px;" border="1">';
    $mail->Body .= "<tr><td style='background-color:#FFE5B4'>Job #$jobIndex</td> <td>$service_type</td></tr>";
    $mail->Body .= "<tr><td style='background-color:#FFE5B4'>Sign:</td> <td>$sign_theme</td></tr>";
    $mail->Body .= "<tr><td style='background-color:#FFE5B4'>Customer:</td> <td>$customer</td></tr>";
    $mail->Body .= "<tr><td style='background-color:#FFE5B4'>FSID:</td> <td>$fsId</td></tr>";
    $mail->Body .= "<tr><td style='background-color:#FFE5B4'>Date:</td> <td>$request_date</td></tr>";
    $mail->Body .= "<tr><td style='background-color:#FFE5B4'>Start Time:</td> <td>$start_time</td></tr>";
    $mail->Body .= "<tr> <td rowspan='4' style='background-color:#FFE5B4'>Location:</td>  </tr>";
    $mail->Body .= "<tr> <td>$property</td> </tr>";
    $mail->Body .= "<tr> <td>$address1 $address2</td> </tr>";
    $mail->Body .= "<tr> <td>$city, $state $zip_code</td> </tr>";
    $mail->Body .= "</table></td>";
}

$mail->Body .= "</table>
    </tr>
        </td>";


// <div style='padding:3px'>
// <h3>Job Information</h3>
// <span>FSID: $fsId</span><br/>
// <span>Customer: $customer</span><br/>
// <span>Service Type: $service_type</span><br/>
// <span>Request Date: $request_date $start_time</span><br/>
// <span>Sign: $sign_theme</span><br/>
// <span>Casino Address: $address1 $address2 $city, $state $zip_code</span><br/>
// <span>Property: $property</span>
// </div>


    $mail->Body .= '<table rules="all" style="font-size:15px;width:75%;margin-top:10px">';
    $mail->Body .= "<tr><td colspan='4' style='background-color:#C8C8C8'>Trip Details</td></tr>";

        
    $mail->Body .= "
    <tr style='background-color:transparent;text-align:center;height:15px;border:none;border-color:transparent'>
        <td style='background-color:transparent;text-align:center;height:15px;border:none;border-color:transparent' colspan='4'>
        </td>
    </tr>";
    


    foreach ($tripDetails as $row) {
    $mail->Body .= "<tbody class='test'>";
        $mail->Body .= "<tr>";

            $mail->Body .= "<td  colspan='3' style='background-color:#6CB4EE;width:150px;max-width:150px;min-width:150px;font-weight:900;font-size:18px'> " . str_replace('_', ' ', strtoupper($row['type_of_travel'])) ." </td>";
            $mail->Body .= "<td  colspan='1' style='background-color:#6CB4EE;min-width:130px;font-weight:900;font-size:18px'> FSID# " . $row['fsId'] . "</td>";

        $mail->Body .= "</tr>";

        $mail->Body .= "<tr>";

            $mail->Body .= "<td style='background-color:#8FBC8B;width:150px;max-width:150px;min-width:150px'> Name </td>";
            $mail->Body .= "<td style='min-width:130px'>" . $row['address_name'] . "</td>";

            $mail->Body .= "<td style='background-color:#8FBC8B;width:150px;max-width:150px;min-width:150px'> Confirmation Number </td>";
            $mail->Body .= "<td style='min-width:130px'>" . $row['confirmation'] . "</td>";

        $mail->Body .= "</tr>";
        
        if($row['type_of_travel'] == 'flight'){
            $mail->Body .= "<tr>";
                $mail->Body .= "<td style='background-color:#8FBC8B;width:150px;max-width:150px;min-width:150px'> Flight Out </td>";
                $mail->Body .= "<td style='min-width:130px'>" . $row['flight_out'] . "</td>";

                $mail->Body .= "<td style='background-color:#8FBC8B;width:150px;max-width:150px;min-width:150px'> Flight In </td>";
                $mail->Body .= "<td style='min-width:130px'>" . $row['flight_in'] . "</td>";
            $mail->Body .= "</tr>";
            
        }

        $mail->Body .= "<tr>";
            $mail->Body .= "<td rowspan='2' style='background-color:#8FBC8B;width:150px;max-width:150px;min-width:150px'>" . $row['location_name'] . "</td>";
            $mail->Body .= "<td style='min-width:130px'>" . $row['address'] . ' ' .  $row['address1'] . "</td>";
            $mail->Body .= "<td style='background-color:#8FBC8B'>" . $row['start_datetime_name'] . "</td>";
            $mail->Body .= "<td style='min-width:130px'>" . $row['start_datetime'] . "</td>";
        $mail->Body .= "</tr>";
         
        $mail->Body .= "<tr>";
            $mail->Body .= "<td style='min-width:130px'>" . $row['city'] . ', ' . $row['state'] . ' '. $row['zip_code'] . "</td>";
            $mail->Body .= "<td style='background-color:#8FBC8B'>" . $row['end_datetime_name'] . "</td>";
            $mail->Body .= "<td style='min-width:130px'>" . $row['end_datetime'] . "</td>";
        $mail->Body .= "</tr>";
        
        
        if($row['type_of_travel'] == 'rental_car'){
            $mail->Body .= "<tr>";
                $mail->Body .= "<td style='background-color:#8FBC8B;width:150px;max-width:150px;min-width:150px'> Driver </td>";
                $mail->Body .= "<td colspan='3'>" . $row['rental_car_driver'] . "</td>";
            $mail->Body .= "</tr>";
        }
        
        if($row['notes']){
            $mail->Body .= "<tr>";
                $mail->Body .= "<td style='background-color:#8FBC8B;width:150px;max-width:150px;min-width:150px'> Notes </td>";
                $mail->Body .= "<td colspan='3'>" . $row['notes'] . "</td>";
            $mail->Body .= "</tr>";
        }

        
        if($row['type_of_travel'] == 'flight'){
            $mail->Body .= "
            <tr>
                <td style='background-color:#8FBC8B;text-align:center' colspan='4'>
                    Please arrive at the airport 2 hours before take off
                </td>
            </tr>";
        }

        
        $mail->Body .= "
        <tr style='background-color:transparent;text-align:center;height:25px;border:none;border-color:transparent'>
            <td style='background-color:transparent;text-align:center;height:25px;border:none;border-color:transparent' colspan='4'>
            </td>
        </tr>";
        
        
        $mail->Body .= "</tbody>";

        

    }

        $mail->Body .= "</table>";

        $mail->Body .= "</div>";

$mail->Body .= "</div></body></html>";

//only send if there is new orders, that have not been sent yet. 
if ($mail->send()) {

    $qry = "
        UPDATE eyefidb.fs_travel_det
            SET email_sent = now()
        WHERE fs_travel_header_id = :fsId	
    ";
    $stmt = $db->prepare($qry);
    $stmt->bindParam(':fsId', $FSID, PDO::PARAM_INT);
    $stmt->execute();
    $count = $stmt->rowCount();

    echo $db_connect->json_encode($tripDetails);
}else{
    echo "email failed";
}
