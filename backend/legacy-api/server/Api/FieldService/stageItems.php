<?php

namespace EyefiDb\Api\FieldService;


class StageItems
{

    protected $db;

    public function __construct($dbQad)
    {
        $this->db = $dbQad;
    }

    public function send_email($post)
    {
        $toEmailUsers = " 
            anthony.foster@the-fi-company.com,
            seisa.lopez@the-fi-company.com
        ";

        $ccEmailUsers = " 
            ritz.dacanay@the-fi-company.com,
            eyefishipping@eyefishipping@the-fi-company.com
        ";

        $coNumber = $post[0]['sod_order_category'];

        $to         = $toEmailUsers;
        $cc         = $ccEmailUsers;

        $subject       = "Staged Items for CO # " . $coNumber;

        $body  = 'Hello Team, <br>';
        $body .= 'Listed below are staged items.';
        $body .= '<br><br>';
        $body .= '<html><body>';
        $body .= '<table rules="all" style="border-color: #000;" cellpadding="5" border="1">';
        $body .= "<tr style='background: #eee;'>";
        $body .= "<td><strong>CO #</strong></td>";
        $body .= "<td><strong>Part Number</strong></td>";
        $body .= "<td><strong>Qty Ordered</strong></td>";
        $body .= "<td><strong>Qty Shipped</strong></td>";
        $body .= "</tr>";

        foreach ($post as $row) {

            $body .= "<tr> \r\n";
            $body .= "<td>" . $row['sod_order_category'] . "</td> \r\n";
            $body .= "<td>" . $row['sod_part'] . "</td> \r\n";
            $body .= "<td>" . $row['sod_qty_ord'] . "</td> \r\n";
            $body .= "<td>" . $row['sod_qty_ship'] . "</td> \r\n";
            $body .= "</tr> \r\n";
        }

        $body .= "</table>";
        $body .= '<br><hr>';
        $body .= 'This is an automated email. Please do not respond. <br>';
        $body .= 'Thank you.';

        $body .= "</body></html>";


        $headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n" .
            'Reply-To:' . MAIL_EMAIL . "\r\n";
        $headers .= "Cc: $cc\r\n";
        $headers .= "Reply-To: " . ($to) . "\r\n";
        $headers .= "Return-Path: " . ($to) . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
        $headers .= "Content-Transfer-Encoding: 64bit\r\n";
        $headers .= "X-Priority: 3\r\n";
        $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";


        $finalMessage = wordwrap($body, 100, "\n");

        mail($to, $subject, $finalMessage, $headers);
    }

}
