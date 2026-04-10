<?php

namespace EyefiDb\Api\ShippingRequest;

use EyefiDb\Api\Upload\Upload;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;

class ShippingRequest
{

    protected $db;

    public function __construct($db)
    {

        $this->db = $db;
        $this->nowDate = date(" Y-m-d H:i:s", time());

        $this->uploader = new Upload($this->db);
    }

    public function authUsers()
    {
        return (object) array(
            'accessRights' => array(
                'Ritz Dacanay',
                'Greg Nix'
            )
        );
    }

    public function authCheck($accessSection)
    {
        if (in_array($this->full_name, $accessSection))  return true;
        return false;
    }

    public function throwError($message, $responseCode)
    {
        http_response_code($responseCode);
        echo $message;
        die();
    }

    public function createRequest($data)
    {

        try {
            $lastInsertId = $this->insert($data);
            $this->newRequestEmail($data['callbackUrl'], $lastInsertId);

            return $lastInsertId;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function updateTracking($data)
    {
        $updatedCount = $this->update($data);

        if ($updatedCount) {
            $this->sendEmailAboutTrackingNumber($data['sendTrackingNumberTo'], $data['trackingNumber'], $data['callBackUrl'], $data['id']);
        }
    }

    public function newRequestEmail($url, $lastInsertId)
    {
        $mail = new PHPMailer(true);
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
        $mail->Subject = "Shipping Request Form #" . $lastInsertId;

        $mail->AddAddress("eyefilogistics@the-fi-company.com");
        $mail->addCC("ritz.dacanay@the-fi-company.com");

        //$link = 'https://dashboard.eye-fi.com/dist/v1/forms/shipping-request?shippingRequestId=' . $lastInsertId;
        $link = "https://dashboard.eye-fi.com/dist/web/operations/forms/shipping-request/edit?id=" . $lastInsertId;

        $mail->Body = '<html><body>';

        $mail->Body .= 'Hello Team, <br /><br />';
        $mail->Body .= 'A shipping request form was submitted. <br>';
        $mail->Body .= 'Please click <a href="' . $link . '">here</a> to view the shipping request details. <br> <br>';
        $mail->Body .= '---------------------------------------------------- <br>';
        $mail->Body .= 'This is an automated email. Please do not respond.';
        $mail->Body .= '<br><br><br>';
        $mail->Body .= "</body></html>";

        if ($mail->send()) {
            return "Email sent";
        } else {
            return "Email not sent";
        };
    }

    public function insert($data)
    {
        $trackingNumberStrings = "";
        if (isset($data['sendTrackingNumberTo'])) {
            $trackingNumberStrings = implode(",", $data['sendTrackingNumberTo']);
        }
        if (isset($data['createdById'])) {
            $createdById = $data['createdById'];
        }else{
            $createdById = 0;

        }
        if (isset($data['active'])) {
            $active = $data['active'];
        }else{
            $active = 1;

        }

        $qry = "
            INSERT INTO forms.shipping_request(
                requestorName
                , emailAddress
                , companyName
                , streetAddress
                , city
                , state
                , zipCode
                , contactName
                , phoneNumber
                , freightCharges
                , thridPartyAccountNumber
                , serviceTypeName
                , saturdayDelivery
                , cost
                , sendTrackingNumberTo
                , comments
                , createdDate
                , createdById
                , active
                , serviceType
                , completedDate
                , completedBy
                , trackingNumber
            ) 
            VALUES(
                :requestorName
                , :emailAddress
                , :companyName
                , :streetAddress
                , :city
                , :state
                , :zipCode
                , :contactName
                , :phoneNumber
                , :freightCharges
                , :thridPartyAccountNumber
                , :serviceTypeName
                , :saturdayDelivery
                , :cost
                , :sendTrackingNumberTo
                , :comments
                , :createdDate
                , :createdById
                , :active
                , :serviceType
                , :completedDate
                , :completedBy
                , :trackingNumber
            )
        ";
        $query = $this->db->prepare($qry);
        $query->bindParam(':requestorName', $data['requestorName'], PDO::PARAM_STR);
        $query->bindParam(':emailAddress', $data['emailAddress'], PDO::PARAM_STR);
        $query->bindParam(':companyName', $data['companyName'], PDO::PARAM_STR);
        $query->bindParam(':streetAddress', $data['streetAddress'], PDO::PARAM_STR);
        $query->bindParam(':city', $data['city'], PDO::PARAM_STR);
        $query->bindParam(':state', $data['state'], PDO::PARAM_STR);
        $query->bindParam(':zipCode', $data['zipCode'], PDO::PARAM_STR);
        $query->bindParam(':contactName', $data['contactName'], PDO::PARAM_STR);
        $query->bindParam(':phoneNumber', $data['phoneNumber'], PDO::PARAM_STR);
        $query->bindParam(':freightCharges', $data['freightCharges'], PDO::PARAM_STR);
        $query->bindParam(':thridPartyAccountNumber', $data['thridPartyAccountNumber'], PDO::PARAM_STR);
        $query->bindParam(':serviceTypeName', $data['serviceTypeName'], PDO::PARAM_STR);
        $query->bindParam(':saturdayDelivery', $data['saturdayDelivery'], PDO::PARAM_STR);
        $query->bindParam(':cost', $data['cost'], PDO::PARAM_STR);
        $query->bindParam(':sendTrackingNumberTo', $trackingNumberStrings, PDO::PARAM_STR);
        $query->bindParam(':comments', $data['comments'], PDO::PARAM_STR);
        $query->bindParam(':createdDate', $data['createdDate'], PDO::PARAM_STR);
        $query->bindParam(':createdById', $createdById, PDO::PARAM_STR);
        $query->bindParam(':active', $active, PDO::PARAM_STR);
        $query->bindParam(':serviceType', $data['serviceType'], PDO::PARAM_STR);
        $query->bindParam(':completedDate', $data['completedDate'], PDO::PARAM_STR);
        $query->bindParam(':completedBy', $data['completedBy'], PDO::PARAM_STR);
        $query->bindParam(':trackingNumber', $data['trackingNumber'], PDO::PARAM_STR);
        $query->execute();
        return $this->db->lastInsertId();
    }

    public function update($data)
    {

        try {
            $qry = "
                UPDATE forms.shipping_request
                SET requestorName = :requestorName
                    , emailAddress = :emailAddress
                    , companyName = :companyName
                    , streetAddress = :streetAddress
                    , city = :city
                    , state = :state
                    , zipCode = :zipCode
                    , contactName = :contactName
                    , phoneNumber = :phoneNumber
                    , freightCharges = :freightCharges
                    , thridPartyAccountNumber = :thridPartyAccountNumber
                    , serviceTypeName = :serviceTypeName
                    , saturdayDelivery = :saturdayDelivery
                    , cost = :cost
                    , sendTrackingNumberTo = :sendTrackingNumberTo
                    , comments = :comments
                    , createdDate = :createdDate
                    , createdById = :createdById
                    , active = :active
                    , serviceType = :serviceType
                    , completedDate = :completedDate
                    , completedBy = :completedBy
                    , trackingNumber = :trackingNumber
                WHERE id = :id
            ";
            $query = $this->db->prepare($qry);
            $query->bindParam(':requestorName', $data['requestorName'], PDO::PARAM_STR);
            $query->bindParam(':emailAddress', $data['emailAddress'], PDO::PARAM_STR);
            $query->bindParam(':companyName', $data['companyName'], PDO::PARAM_STR);
            $query->bindParam(':streetAddress', $data['streetAddress'], PDO::PARAM_STR);
            $query->bindParam(':city', $data['city'], PDO::PARAM_STR);
            $query->bindParam(':state', $data['state'], PDO::PARAM_STR);
            $query->bindParam(':zipCode', $data['zipCode'], PDO::PARAM_STR);
            $query->bindParam(':contactName', $data['contactName'], PDO::PARAM_STR);
            $query->bindParam(':phoneNumber', $data['phoneNumber'], PDO::PARAM_STR);
            $query->bindParam(':freightCharges', $data['freightCharges'], PDO::PARAM_STR);
            $query->bindParam(':thridPartyAccountNumber', $data['thridPartyAccountNumber'], PDO::PARAM_STR);
            $query->bindParam(':serviceTypeName', $data['serviceTypeName'], PDO::PARAM_STR);
            $query->bindParam(':saturdayDelivery', $data['saturdayDelivery'], PDO::PARAM_STR);
            $query->bindParam(':cost', $data['cost'], PDO::PARAM_STR);
            $query->bindParam(':sendTrackingNumberTo', $data['sendTrackingNumberTo'], PDO::PARAM_STR);
            $query->bindParam(':comments', $data['comments'], PDO::PARAM_STR);
            $query->bindParam(':createdDate', $data['createdDate'], PDO::PARAM_STR);
            $query->bindParam(':createdById', $data['createdById'], PDO::PARAM_STR);
            $query->bindParam(':active', $data['active'], PDO::PARAM_STR);
            $query->bindParam(':serviceType', $data['serviceType'], PDO::PARAM_STR);
            $query->bindParam(':completedDate', $data['completedDate'], PDO::PARAM_STR);
            $query->bindParam(':completedBy', $data['completedBy'], PDO::PARAM_STR);
            $query->bindParam(':trackingNumber', $data['trackingNumber'], PDO::PARAM_STR);
            $query->bindParam(':id', $data['id'], PDO::PARAM_STR);
            $query->execute();
            return $query->rowCount();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function sendEmailAboutTrackingNumber($to, $trackingNumber, $callBackUrl, $id)
    {
        $cc         = "eyefilogistics@the-fi-company.com, ritz.dacanay@the-fi-company.com";

        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
        $mail->Subject = "Shipping Request Form #" . $id;

        $mail->AddAddress($to);

        $cc = explode(',', $cc);
        foreach ($cc as $address) {
            $mail->addCC($address);
        }
           

        //$link = 'https://dashboard.eye-fi.com/dist/v1/forms/shipping-request?shippingRequestId=' . $id;
        $link = "https://dashboard.eye-fi.com/dist/web/operations/forms/shipping-request/edit?id=" . $id;


        $mail->Body = '<html><body>';

        $mail->Body .= 'Hello your shipment has been processed.  Your tracking # is ' . $trackingNumber . '<br><br>';
        $mail->Body .= 'Please click <a href="' . $link . '">here</a> to view the shipping request details. <br> <br>';

        $mail->Body .= 'Thank you. <br>';
        $mail->Body .= '---------------------------------------------------- <br>';
        $mail->Body .= 'This is an automated email. Please do not respond.';
        $mail->Body .= '<br><br><br>';
        $mail->Body .= "</body></html>";

        if ($mail->send()) {
            return "Email sent.";
        } else {
            return "Email not sent";
        }
    }

    public function getReportByUserId($userId)
    {
        $mainQry = "
            select *
            FROM forms.shipping_request
            WHERE createdById = :createdById
            order by completedDate ASC, 
                createdDate DESC
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':createdById', $userId, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function viewReport($userId)
    {
        $authUsers = $this->authCheck($this->authUsers()->accessRights);
        $results = array();

        if ($authUsers) {
            $results = $this->getAll();
        } else {
            $results = $this->getReportByUserId($userId);
        }

        return array(
            "results" => $results,
            "authUsers" => $authUsers
        );
    }

    public function getAll()
    {
        $mainQry = "
            select *
            FROM forms.shipping_request
            WHERE active = 1
            order by completedDate ASC,
                createdDate DESC
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getDataById($id)
    {
        $mainQry = "
            select *
            FROM forms.shipping_request
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function getAttachmentsById($id)
    {

        return  $this->uploader->getAttachments($id, 'Shipping Request', 'shippingRequest');
    }

    public function viewRequestById($id)
    {

        $attachmentsResults = $this->getAttachmentsById($id);

        $results = $this->getDataById($id);

        return array(
            "results" => $results,
            "attachmentsResults" => $attachmentsResults,
        );
    }
}
