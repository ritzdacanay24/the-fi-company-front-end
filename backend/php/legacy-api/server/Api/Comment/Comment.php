<?php

namespace EyefiDb\Api\Comment;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;

class Comment
{

    protected $db;
    public $sessionId;
    public $user_full_name;
    public $nowDate;
    public $dbQad;

    public function __construct($db, $dbQad = false)
    {
        $this->db = $db;
        $this->dbQad = $dbQad;
    }

    public function readRecentComment($type)
    {
        $comments = "
            SELECT a.orderNum
                , comments_html comments_html
                , comments comments
                , a.createdDate
                , date(a.createdDate) byDate
                , case when date(a.createdDate) = curDate() then 'text-success' else 'text-info' end color_class_name
                , case when date(a.createdDate) = curDate() then 'bg-success' else 'bg-info' end bg_class_name
                , concat('SO#:', ' ', a.orderNum) comment_title
                , concat(c.first, ' ', c.last) created_by_name
            FROM eyefidb.comments a
            INNER JOIN (
                SELECT orderNum
                    , MAX(id) id
                    , MAX(date(createdDate)) createdDate
                FROM eyefidb.comments
                GROUP BY orderNum
            ) b ON a.orderNum = b.orderNum AND a.id = b.id
            LEFT JOIN db.users c ON c.id = a.userId
            WHERE a.type = :type
            AND a.active = 1
		";
        $query = $this->db->prepare($comments);
        $query->bindParam(':type', $type, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function delete($post)
    {
        $qry = '
            UPDATE eyefidb.comments 
            SET active = :active
            WHERE id = :id
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':active', $post['active'], PDO::PARAM_INT);
        $stmt->bindParam(':id', $post['id'], PDO::PARAM_INT);
        $stmt->execute();
    }

    public function update($post)
    {
        $qry = '
            UPDATE eyefidb.comments 
            SET comments = :comments,
                comments_html = :comments_html,
                active = :active
            WHERE id = :id
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':comments', $post['comments'], PDO::PARAM_STR);
        $stmt->bindParam(':comments_html', $post['comments_html'], PDO::PARAM_STR);
        $stmt->bindParam(':active', $post['active'], PDO::PARAM_INT);
        $stmt->bindParam(':id', $post['id'], PDO::PARAM_INT);
        $stmt->execute();
    }

    public function create($post)
    {
        $this->insert($post);

        if ($post['emailToSendFromMention']) {
            $this->mentionedCommentEmail($post);
        }

        if (isset($post['productionCommitDateEmailOfChange']) && $post['productionCommitDateEmailOfChange'] == 'true') {
            $this->productionCommitDateEmailOfChange($post);
        }
    }

    public function productionCommitDateEmailOfChange($post)
    {

        $msg = $post['comments'];

        $link       = $post['emailCallBackUrl'];

        $emailUsers      = 'daniela.rumbos@the-fi-company.com, nick.walter@the-fi-company.com';
        
        $mail = new PHPMailer(true);
        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
        $mail->Subject = "Production Commit Date Changed- " . $post['type'] . ": " . $post['orderNum'];

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }
           

        $mail->Body = '<html><body>';
        $mail->Body .= "<br>";
        $mail->Body .= $msg;
        $mail->Body .= "<br><br>";
        $mail->Body .= "<br>";
        $mail->Body .= $post['recoveryDateText'];
        $mail->Body .= "<br>";
        $mail->Body .= "<br>";
        $mail->Body .= "To reply to this comment, click <a href='{$link}'> here </a>. ";
        $mail->Body .= "<br>";
        $mail->Body .= "This comment was added by " . $this->user_full_name;
        $mail->Body .= "</body></html>";

        $mail->send();
    }

    public function insert($post)
    {

        $pid = isset($post['pid']) ? $post['pid'] : null;

        $qry = "
            INSERT INTO eyefidb.comments(
                comments
                , createdDate
                , orderNum
                , userId
                , type
                , pageApplied
                , pageName
                , comments_html
                , pid
            ) 
            values(
                :comments
                , :createdDate
                , :orderNum
                , :userId
                , :type
                , :pageApplied
                , :pageName
                , :comments_html
                , :pid
            )
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':comments', $post['comments'], PDO::PARAM_STR);
        $stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
        $stmt->bindParam(':orderNum', $post['orderNum'], PDO::PARAM_STR);
        $stmt->bindParam(':userId', $post['userId'], PDO::PARAM_INT);
        $stmt->bindParam(':type', $post['type'], PDO::PARAM_STR);
        $stmt->bindParam(':pageApplied', $post['locationPath'], PDO::PARAM_STR);
        $stmt->bindParam(':pageName', $post['pageName'], PDO::PARAM_STR);
        $stmt->bindParam(':comments_html', $post['comments_html'], PDO::PARAM_STR);
        $stmt->bindParam(':pid', $pid, PDO::PARAM_STR);
        $stmt->execute();
        return $this->db->lastInsertId();
    }

    public function getSalesOrderInfo($soNumber)
    {
        $arr = explode("-", $soNumber, 2);
        $first = $arr[0];
        $last = $arr[1];

        $mainQry = "
            select a.sod_nbr sod_nbr
                , a.sod_due_date sod_due_date
                , a.sod_part sod_part
                , cast(a.sod_qty_ord-a.sod_qty_ship as numeric(36,2)) qtyOpen
                , CASE 
                    WHEN b.pt_part IS NULL 
                        THEN a.sod_desc
                    ELSE b.fullDesc
                END fullDesc
                , c.so_cust so_cust
                , a.sod_line sod_line
            from sod_det a
            
            left join (
                select pt_part							
                    , max(CONCAT(pt_desc1, pt_desc2)) fullDesc
                    , max(pt_routing) pt_routing
                from pt_mstr
                where pt_domain = 'EYE'
                group by pt_part		
            ) b ON b.pt_part = a.sod_part
            
            join (
                select so_nbr	
                    , so_cust
                    , so_ord_date
                    , so_ship
                    , so_bol
                    , so_cmtindx
                    , so_compl_date
                    , so_shipvia
                from so_mstr
                where so_domain = 'EYE'
            ) c ON c.so_nbr = a.sod_nbr
                
            WHERE sod_domain = 'EYE'
                AND sod_qty_ord != sod_qty_ship	
                AND so_compl_date IS NULL
                AND a.sod_nbr = :soNumber
                AND a.sod_line = :lineNumber
            ORDER BY a.sod_due_date ASC 
            WITH (NOLOCK)
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->bindParam(':soNumber', $first, PDO::PARAM_STR);
        $query->bindParam(':lineNumber', $last, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function mentionedCommentEmail($post)
    {
        if ($post['emailToSendFromMention']) {
            $msg = $post['comments'];

            $link       = $post['emailCallBackUrl'];

            $emailUsers =  implode(", ", $post['emailToSendFromMention']);

            $mail = new PHPMailer(true);
            $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';

            $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
            $mail->Subject = 'You were mentioned in a comment. ' . $post['type'];

            $addresses = explode(',', $emailUsers);
            foreach ($addresses as $address) {
                $mail->AddAddress($address);
            }
                

            $salesOrderInfo = false;
            if ($post['type'] == 'Sales Order') {
                $salesOrderInfo = $this->getSalesOrderInfo($post['orderNum']);
            }

            $mail->Body = '<html><body>';
            $mail->Body .= "<br>";
            $mail->Body .= $msg;
            $mail->Body .= "<br><br>";
            if ($salesOrderInfo) {
                $mail->Body .= "Customer: " . $salesOrderInfo['SO_CUST'] . "<br>";
                $mail->Body .= "Due Date: " . $salesOrderInfo['SOD_DUE_DATE'] . "<br>";
                $mail->Body .= "Qty Open: " . $salesOrderInfo['QTYOPEN'] . "<br>";
                $mail->Body .= "Part #: " . $salesOrderInfo['SOD_PART'] . "<br>";
                $mail->Body .= "Desc: " . $salesOrderInfo['FULLDESC'] . "<br>";
            }

            $mail->Body .= "<br><br>";
            $mail->Body .= $post['type'] . ": " . $post['orderNum'];
            $mail->Body .= "<br>";
            $mail->Body .= "To reply to this comment, click <a href='{$link}'> here </a>. ";
            $mail->Body .= "<br>";
            $mail->Body .= "This comment was added by " . $this->user_full_name;
            $mail->Body .= "</body></html>";
            
            $mail->send();
        }
    }

    public function atRiskComment($post)
    {
        /**
         * Save comment
         */
        $this->insert($post);

        /**
         * And send at risk email
         */
        $this->atRiskEmail($post);
    }

    public function atRiskEmail($post)
    {
        if ($post['toEmail']) {
            $msg = $post['comments'];

            $link       = $post['emailCallBackUrl'];

            $emailUsers      = implode(',', $post['toEmail']);
            
            $mail = new PHPMailer(true);
            $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
            $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
            $mail->Subject = $post['subject'];

            $addresses = explode(',', $emailUsers);
            foreach ($addresses as $address) {
                $mail->AddAddress($address);
            }

            $mail->Body = '<html><body>';
            $mail->Body .= "<br>";
            $mail->Body .= $msg;
            $mail->Body .= "<br><br>";
            $mail->Body .= $post['type'] . ": " . $post['orderNum'];
            $mail->Body .= "<br>";
            $mail->Body .= "To reply to this comment, click <a href='{$link}'> here </a>. ";
            $mail->Body .= "<br>";
            $mail->Body .= "This comment was added by " . $this->user_full_name;
            $mail->Body .= "</body></html>";

            $mail->send();
        }
    }

    public function getAttachmentsById($id)
    {
        $mainQry = "
			select a.fileName thumbUrl
				, concat('https://dashboard.eye-fi.com/attachments/comments/', a.fileName) url
				, createdBy
				, fileSizeConv
				, ext
				, id
				, uniqueId
			from eyefidb.attachments a 
			where mainId = :id
			AND field = 'Comments'
		";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function readById($id)
    {
        $qry = '
            SELECT a.id
                , a.pid
                , a.comments
                , a.userId
                , a.createdDate
                , concat(b.first, " ", b.last) userName
                , pageApplied
                , pageName
                , comments_html
                , a.active
                , b.image
            FROM eyefidb.comments a
            LEFT JOIN db.users b
                ON a.userId = b.id
            WHERE a.orderNum = :id
            AND a.active = 1
            ORDER BY a.createdDate DESC
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':id', $id, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getCommentById($id)
    {
        $comments = $this->readById($id);
        $attachments = $this->getAttachmentsById($id);

        foreach ($comments as &$row) {
            $row['attachments'] = array();
            foreach ($attachments as $row1) {
                if ($row['id'] == $row1['uniqueId']) {
                    $row['attachments'][] = $row1;
                }
            }
        }

        return $comments;
    }

    public function getAttachments($id)
    {
        $mainQry = "
			select a.fileName thumbUrl
				, concat('https://dashboard.eye-fi.com/attachments/capa/', a.fileName) url
				, createdBy
				, fileSizeConv
				, ext
				, id
				, uniqueId
                , concat('https://dashboard.eye-fi.com/attachments/capa/', a.fileName)  src

                , a.fileName thumb
			from eyefidb.attachments a 
			where mainId = :id
			AND field = 'QIR Investigation'
		";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getCommentQirInvestigation($id)
    {
        $comments = $this->readById($id);
        $attachments = $this->getAttachments($id);

        foreach ($comments as &$row) {
            $row['attachments'] = array();
            foreach ($attachments as $row1) {
                if ($row['id'] == $row1['uniqueId']) {
                    $row['attachments'][] = $row1;
                }
            }
        }

        return $comments;
    }
}
