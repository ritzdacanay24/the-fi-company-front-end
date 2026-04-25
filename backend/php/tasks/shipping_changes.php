<?php

class ShippingChanges
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d");
        $this->nowDateTime = date("Y-m-d h:m:s", time());
    }

    public function getRecentChanges()
    {
        $qry = "select data from eyefidb.shipping_changes order by id DESC LIMIT 1";
        $stmt = $this->db->prepare($qry);
        $stmt->execute();
        $res = $stmt->fetch(PDO::FETCH_ASSOC);

        return json_decode($res['data'], true);
    }

    public function insert($data)
    {
        $qry = "
				INSERT INTO eyefidb.osor_changes(
					so
					, line
					, part_number
					, type_of_change
					, previous_value
                    , new_value
				) 
				VALUES (
					:so
					, :line
					, :part_number
					, :type_of_change
					, :previous_value
                    , :new_value
				)
			";

        foreach ($data as $row1) {
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(":so", $row1['so_number']);
            $stmt->bindParam(":line", $row1['so_line_number']);
            $stmt->bindParam(":part_number", $row1['sod_part']);
            $stmt->bindParam(":type_of_change", $row1['type_of_change']);
            $stmt->bindParam(":previous_value", $row1['old']);
            $stmt->bindParam(":new_value", $row1['new']);
            $stmt->execute();
        }
    }

    public function sendEmail($data, $unique)
    {
        $to         = 'ritz.dacanay@the-fi-company.com';
        $bccEmails = "ritz.dacanay@the-fi-company.com";
        $subject    = "Shipping Changes - " . date("m/d/Y");




        $body  = 'Hello Team, <br>';
        $body .= 'Here are the shipping changes recorded on ' . date("m/d/Y");
        $body .= '<br>';
        $body .= 'Total Changes: ' . $unique;
        $body .= '<br><br>';
        $body .= '<html><body>';
        $body .= "<style type='text/css'>
                body{
                    padding:0 !important;
                    margin:0 !important;
                }
                table tr:first-child>th{
                    position: sticky;
                    top: 0;
                }
                table {
                    margin: 8px;
                    border-collapse: collapse;
                }
                table, th, td {
                    border: 1px solid black;
                    padding:5px;
                    white-space:nowrap;
                }
                th {
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: .7em;
                    background: #666;
                    color: #FFF;
                    padding: 2px 6px;
                    border-collapse: separate;
                    border: 1px solid #000;
                }
                td {
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: .7em;
                    border: 1px solid #DDD;
                }
            </style>";

        $body .= '<table rules="all">';
        $body .= "<tr style='background: #eee;'>";
        $body .= "<td><strong>SO Number</strong></td>";
        $body .= "<td><strong>Details</strong></td>";
        foreach ($data as $row) {
            $body .= "<tr> \r\n";
            $body .= "<td>" . $row['so_number'] . "</td> \r\n";
            $body .= "<td>";

            $body .= "<table style='min-width:300px;'>";
            $body .= "<tr style='background: #eee;'>";
            $body .= "<td><strong>SO Number</strong></td>";
            $body .= "<td><strong>Line Number</strong></td>";
            $body .= "<td><strong>Part Number</strong></td>";
            $body .= "<td><strong>Type Of Change</strong></td>";
            $body .= "<td><strong>Previous Value</strong></td>";
            $body .= "<td><strong>New Value</strong></td>";
            foreach ($row['details'] as $row1) {



                $body .= "<tr> \r\n";
                $body .= "<td>" . $row1['so_number'] . "</td> \r\n";
                $body .= "<td>" . $row1['so_line_number'] . "</td> \r\n";
                $body .= "<td>" . $row1['sod_part'] . "</td> \r\n";
                $body .= "<td>" . $row1['type_of_change'] . "</td> \r\n";
                $body .= "<td>" . $row1['old'] . "</td> \r\n";
                $body .= "<td>" . $row1['new'] . "</td> \r\n";
                $body .= "</tr> \r\n";
            }
            $body .= "</tr>";
            $body .= "</table>";

            $body .= "</td> \r\n";
            $body .= "</tr> \r\n";
        }
        $body .= "</table>";
        $body .= '<br><hr>';
        $body .= 'This automated email will be sent daily @ 4am. <br>';
        $body .= 'Thank you.';

        $body .= "</body></html>";


        $headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n";
        $headers .= 'Reply-To:' . MAIL_EMAIL . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
        $headers .= "Content-Transfer-Encoding: 64bit\r\n";
        $headers .= "X-Priority: 3\r\n";
        $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";
        $headers .= "Bcc: $bccEmails\r\n"; #Your BCC Mail List

        $finalMessage = wordwrap($body, 100, "\n");

        if (count($data) > 0) {
            mail($to, $subject, $finalMessage, $headers);
            echo "Email sent";
        } else {
            echo "No changes";
        }
    }
}

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

use EyefiDb\Api\Shipping\Shipping;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new Shipping($db, $dbQad);
$records = new ShippingChanges($db);

if (isset($_GET['runShippingChanges'])) {
    $results = $data->runOpenShippingReport();
    $recordsInfo = $records->getRecentChanges();

    $changes = [];
    $newSoFound = [];
    $soNumbers = [];
    foreach ($results as $row) {

        foreach ($recordsInfo as $recordsInfoRow) {

            //check for changes
            if ($recordsInfoRow['SOD_NBR'] . '-' . $recordsInfoRow['SOD_LINE'] == $row['SOD_NBR'] . '-' . $row['SOD_LINE']) {

                if ($recordsInfoRow['SOD_DUE_DATE'] != $row['SOD_DUE_DATE']) {
                    $soNumbers[] = $row['SOD_NBR'];
                    $changes[] = array(
                        "so_number" => $recordsInfoRow['SOD_NBR'],
                        "so_line_number" => $recordsInfoRow['SOD_LINE'],
                        "sod_part" => $recordsInfoRow['SOD_PART'],
                        "type_of_change" => "Due Date Changed",
                        "old" => $recordsInfoRow['SOD_DUE_DATE'],
                        "new" => $row['SOD_DUE_DATE']
                    );
                }

                if ($recordsInfoRow['SOD_QTY_ORD'] != $row['SOD_QTY_ORD']) {
                    $soNumbers[] = $row['SOD_NBR'];
                    $changes[] = array(
                        "so_number" => $recordsInfoRow['SOD_NBR'],
                        "so_line_number" => $recordsInfoRow['SOD_LINE'],
                        "sod_part" => $recordsInfoRow['SOD_PART'],
                        "type_of_change" => "Ordered Qty Changed",
                        "old" => $recordsInfoRow['SOD_QTY_ORD'],
                        "new" => $row['SOD_QTY_ORD']
                    );
                }

                if ($recordsInfoRow['SO_CUST'] != $row['SO_CUST']) {
                    $soNumbers[] = $row['SOD_NBR'];
                    $changes[] = array(
                        "so_number" => $recordsInfoRow['SOD_NBR'],
                        "so_line_number" => $recordsInfoRow['SOD_LINE'],
                        "sod_part" => $recordsInfoRow['SOD_PART'],
                        "type_of_change" => "Customer Changed",
                        "old" => $recordsInfoRow['SO_CUST'],
                        "new" => $row['SO_CUST']
                    );
                }
                if ($recordsInfoRow['CMT_CMMT'] != $row['CMT_CMMT']) {
                    $soNumbers[] = $row['SOD_NBR'];
                    $changes[] = array(
                        "so_number" => $recordsInfoRow['SOD_NBR'],
                        "so_line_number" => $recordsInfoRow['SOD_LINE'],
                        "sod_part" => $recordsInfoRow['SOD_PART'],
                        "type_of_change" => "QAD Comments Changed",
                        "old" => $recordsInfoRow['CMT_CMMT'],
                        "new" => $row['CMT_CMMT']
                    );
                }
                if ($recordsInfoRow['SO_SHIPVIA'] != $row['SO_SHIPVIA']) {
                    $soNumbers[] = $row['SOD_NBR'];
                    $changes[] = array(
                        "so_number" => $recordsInfoRow['SOD_NBR'],
                        "so_line_number" => $recordsInfoRow['SOD_LINE'],
                        "sod_part" => $recordsInfoRow['SOD_PART'],
                        "type_of_change" => "Ship Via Changed",
                        "old" => $recordsInfoRow['SO_SHIPVIA'],
                        "new" => $row['SO_SHIPVIA']
                    );
                }
                if ($recordsInfoRow['CP_CUST_PART'] != $row['CP_CUST_PART']) {
                    $soNumbers[] = $row['SOD_NBR'];
                    $changes[] = array(
                        "so_number" => $recordsInfoRow['SOD_NBR'],
                        "so_line_number" => $recordsInfoRow['SOD_LINE'],
                        "sod_part" => $recordsInfoRow['SOD_PART'],
                        "type_of_change" => "Customer Part Changed",
                        "old" => $recordsInfoRow['CP_CUST_PART'],
                        "new" => $row['CP_CUST_PART']
                    );
                }
                if ($recordsInfoRow['SOD_ORDER_CATEGORY'] != $row['SOD_ORDER_CATEGORY']) {
                    $soNumbers[] = $row['SOD_NBR'];
                    $changes[] = array(
                        "so_number" => $recordsInfoRow['SOD_NBR'],
                        "so_line_number" => $recordsInfoRow['SOD_LINE'],
                        "sod_part" => $recordsInfoRow['SOD_PART'],
                        "type_of_change" => "PO # Changed",
                        "old" => $recordsInfoRow['SOD_ORDER_CATEGORY'],
                        "new" => $row['SOD_ORDER_CATEGORY']
                    );
                }
            }
        }
    }

    function cmp($a, $b)
    {
        return strcmp($a["so_number"], $b["so_number"]);
    }

    $unique = array_unique($soNumbers);

    $n = [];
    foreach ($unique as &$row) {
        $n[] = array(
            "so_number" => $row,
            "details" => []
        );
    }



    foreach ($n as &$row) {
        foreach ($changes as $changesRow) {
            if ($changesRow['so_number'] == $row['so_number']) {
                $row['details'][] = $changesRow;
            }
        }
    }

    //$records->insert($changes);
    //$records->sendEmail($n, count($unique));
    echo $db_connect->json_encode($changes);
}
