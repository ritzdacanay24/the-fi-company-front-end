<?php

namespace EyefiDb\Api\Graphics;

use PDO;
use PDOException;

class GraphicsDamagedRejected
{

    protected $db;
    public $sessionId;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date(" Y-m-d H:i:s", time());
    }

    public function userTransaction($userTrans)
    {

        if (is_array($userTrans) || is_object($userTrans)) {
            foreach ($userTrans as $item) {
                $field = isset($item['field']) ? $item['field'] : "";
                $o = isset($item['o']) ? $item['o'] : "";
                $n = isset($item['n']) ? $item['n'] : "";
                $comment = isset($item['comment']) ? $item['comment'] : "";
                $so = isset($item['so']) ? $item['so'] : "";
                $type = isset($item['type']) ? $item['type'] : "";
                $partNumber = isset($item['partNumber']) ? $item['partNumber'] : "";
                $userId = isset($item['userId']) ? $item['userId'] : $this->sessionId;
                $reasonCode = isset($item['reasonCode']) ? $item['reasonCode'] : "";

                $qry = '
                    INSERT INTO eyefidb.userTrans (
                        field
                        , o
                        , n
                        , createDate
                        , comment
                        , userId
                        , so
                        , type
                        , partNumber
                        , reasonCode
                    ) 
                    VALUES( 
                        :field
                        , :o
                        , :n
                        , :createDate
                        , :comment
                        , :userId
                        , :so
                        , :type
                        , :partNumber
                        , :reasonCode
                    )
                ';
                $stmt = $this->db->prepare($qry);
                $stmt->bindParam(':field', $field, PDO::PARAM_STR);
                $stmt->bindParam(':o', $o, PDO::PARAM_STR);
                $stmt->bindParam(':n', $n, PDO::PARAM_STR);
                $stmt->bindParam(':createDate', $this->nowDate, PDO::PARAM_STR);
                $stmt->bindParam(':comment', $comment, PDO::PARAM_STR);
                $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
                $stmt->bindParam(':so', $so, PDO::PARAM_STR);
                $stmt->bindParam(':type', $type, PDO::PARAM_STR);
                $stmt->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
                $stmt->bindParam(':reasonCode', $reasonCode, PDO::PARAM_STR);
                $stmt->execute();
            }
        }
    }

    public function insert($post)
    {
        $qry = "
            INSERT INTO eyefidb.graphicsIssues(
                createdBy
                , createdDate
                , issueComment
                , issueType
                , issueQty
                , so
            ) values (
                :createdBy
                , :createdDate
                , :issueComment
                , :issueType
                , :issueQty
                , :so
            )
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':createdBy', $post['createdBy'], PDO::PARAM_STR);
        $stmt->bindParam(':createdDate', $post['createdDate'], PDO::PARAM_STR);
        $stmt->bindParam(':issueComment', $post['issueComment'], PDO::PARAM_STR);
        $stmt->bindParam(':issueQty', $post['issueQty'], PDO::PARAM_STR);
        $stmt->bindParam(':issueType', $post['issueType'], PDO::PARAM_STR);
        $stmt->bindParam(':so', $post['so'], PDO::PARAM_STR);
        $stmt->execute();
        return $this->db->lastInsertId();
    }

    public function update($post)
    {
        $qry = "
            UPDATE eyefidb.graphicsIssues
            SET so = :so
                , issueComment = :issueComment
                , issueQty = :issueQty
                , issueType = :issueType
                , createdBy = :createdBy
                , createdDate = :createdDate
                , active = :active
                , lastMod = :lastMod
            WHERE id = :id
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':so', $post['so'], PDO::PARAM_STR);
        $stmt->bindParam(':issueComment', $post['issueComment'], PDO::PARAM_STR);
        $stmt->bindParam(':issueQty', $post['issueQty'], PDO::PARAM_INT);
        $stmt->bindParam(':issueType', $post['issueType'], PDO::PARAM_STR);
        $stmt->bindParam(':createdBy', $post['createdBy'], PDO::PARAM_INT);
        $stmt->bindParam(':createdDate', $post['createdDate'], PDO::PARAM_STR);
        $stmt->bindParam(':active', $post['active'], PDO::PARAM_INT);
        $stmt->bindParam(':lastMod', $post['lastMod'], PDO::PARAM_STR);
        $stmt->bindParam(':id', $post['id'], PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount();
    }

    public function getDamageIssueById($id)
    {
        $qry = "
            SELECT * 
            FROM eyefidb.graphicsIssues
            WHERE id = :id
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function getDamageIssueByOrderNumber($orderNumber)
    {
        $qry = "
            SELECT * 
            FROM eyefidb.graphicsIssues
            WHERE so = :so
                AND active = 1
            LIMIT 1
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':so', $orderNumber, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function clearDamgedReject($post)
    {
        $issueDamageData = $this->getDamageIssueByOrderNumber($post['orderNum']);
        $issueDamageData['active'] = 0;
        $issueDamageData['lastMod'] = $this->nowDate;

        $this->update($issueDamageData);
    }

    public function changeGraphicsStatus($newStatus, $orderNumber)
    {
        $qry = "
            UPDATE eyefidb.graphicsSchedule
            SET status = :newQueueStatus
                , lastUpdate = :lastUpdate
            WHERE orderNum = :orderNum
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':newQueueStatus', $newStatus, PDO::PARAM_INT);
        $stmt->bindParam(':orderNum', $orderNumber, PDO::PARAM_STR);
        $stmt->bindParam(':lastUpdate', $this->nowDate, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->rowCount();
    }

    public function createDamageReject($post)
    {
        $this->db->beginTransaction();

        try {
            /**
             * Record Issue
             */
            $insertId = $this->insert($post);

            /**
             * Move order back to review queue
             */
            $this->changeGraphicsStatus(0, $post['so']);

            /**
             * Record transaction
             */
            $userTrans[] = array(
                'field' => $post['issueType'] . " item found and queue status reset to 0",
                'o' => '',
                'n' => 0,
                'comment' => $post['issueComment'],
                'so' => $post['so'],
                'type' => 'Graphics',
                'userId' => $post['createdBy']
            );

            $this->userTransaction($userTrans);
            $this->db->commit();

            return $insertId;
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }
}
