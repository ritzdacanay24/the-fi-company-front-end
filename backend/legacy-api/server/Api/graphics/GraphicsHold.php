<?php

namespace EyefiDb\Api\Graphics;

use PDO;
use PDOException;

class GraphicsHold
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

    public function updateById($post)
    {
        try {
            $qry = "
                UPDATE eyefidb.holds
                SET orderNum = :orderNum,
                    reasonCode = :reasonCode,
                    comment = :comment,
                    createdBy = :createdBy,
                    createdDate = :createdDate,
                    active = :active,
                    pageApplied = :pageApplied,
                    deptResponsible = :deptResponsible,
                    itemNumber = :itemNumber,
                    qty = :qty,
                    userId = :userId,
                    removeUserId = :removeUserId,
                    removeDate = :removeDate
                WHERE id = :id
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':orderNum', $post['orderNum'], PDO::PARAM_STR);
            $stmt->bindParam(':reasonCode', $post['reasonCode'], PDO::PARAM_STR);
            $stmt->bindParam(':comment', $post['comment'], PDO::PARAM_STR);
            $stmt->bindParam(':createdBy', $post['createdBy'], PDO::PARAM_STR);
            $stmt->bindParam(':createdDate', $post['createdDate'], PDO::PARAM_STR);
            $stmt->bindParam(':active', $post['active'], PDO::PARAM_INT);
            $stmt->bindParam(':pageApplied', $post['pageApplied'], PDO::PARAM_STR);
            $stmt->bindParam(':deptResponsible', $post['deptResponsible'], PDO::PARAM_STR);
            $stmt->bindParam(':itemNumber', $post['itemNumber'], PDO::PARAM_STR);
            $stmt->bindParam(':qty', $post['qty'], PDO::PARAM_INT);
            $stmt->bindParam(':userId', $post['userId'], PDO::PARAM_INT);
            $stmt->bindParam(':removeUserId', $post['removeUserId'], PDO::PARAM_INT);
            $stmt->bindParam(':removeDate', $post['removeDate'], PDO::PARAM_STR);
            $stmt->bindParam(':id', $post['id'], PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->rowCount();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function insert($post)
    {
        try {
            $qry = "
                INSERT INTO eyefidb.holds(
                    orderNum
                    , reasonCode
                    , comment
                    , createdBy
                    , createdDate
                    , active
                    , pageApplied
                    , deptResponsible
                    , itemNumber
                    , qty
                    , userId
                    , removeUserId
                    , removeDate
                ) values (
                    :orderNum
                    , :reasonCode
                    , :comment
                    , :createdBy
                    , :createdDate
                    , :active
                    , :pageApplied
                    , :deptResponsible
                    , :itemNumber
                    , :qty
                    , :userId
                    , :removeUserId
                    , :removeDate
                )
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':orderNum', $post['orderNum'], PDO::PARAM_STR);
            $stmt->bindParam(':reasonCode', $post['reasonCode'], PDO::PARAM_STR);
            $stmt->bindParam(':comment', $post['comment'], PDO::PARAM_STR);
            $stmt->bindParam(':createdBy', $post['createdBy'], PDO::PARAM_STR);
            $stmt->bindParam(':createdDate', $post['createdDate'], PDO::PARAM_STR);
            $stmt->bindParam(':active', $post['active'], PDO::PARAM_INT);
            $stmt->bindParam(':pageApplied', $post['pageApplied'], PDO::PARAM_STR);
            $stmt->bindParam(':deptResponsible', $post['deptResponsible'], PDO::PARAM_STR);
            $stmt->bindParam(':itemNumber', $post['itemNumber'], PDO::PARAM_STR);
            $stmt->bindParam(':qty', $post['qty'], PDO::PARAM_INT);
            $stmt->bindParam(':userId', $post['userId'], PDO::PARAM_INT);
            $stmt->bindParam(':removeUserId', $post['removeUserId'], PDO::PARAM_INT);
            $stmt->bindParam(':removeDate', $post['removeDate'], PDO::PARAM_STR);
            $stmt->execute();
            return $this->db->lastInsertId();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function createHold($data)
    {

        $this->db->beginTransaction();

        try {
            $lastInsertId = $this->insert($data);

            $userTrans[] = array(
                'field' => "Hold Created",
                'o' => "",
                'n' => $data['reasonCode'],
                'comment' => "Hold Id: " . $lastInsertId,
                'so' => $data['orderNum'],
                'userId' => $data['userId'],
                'type' => 'Graphics'
            );

            $this->userTransaction($userTrans);
            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getHoldsByOrderNumber($orderNumber)
    {
        $qry = '
            SELECT a.id
                , a.orderNum
                , a.reasonCode
                , a.comment
                , a.userId
                , a.createdDate
                , a.active
                , a.pageApplied
                , a.deptResponsible
                , a.itemNumber
                , a.qty
                , concat(b.first, " ", b.last) userName
            FROM eyefidb.holds a
            LEFT JOIN db.users b
                ON a.userId = b.id
            WHERE a.orderNum = :orderNum
            AND a.active = 1
            ORDER BY a.createdDate DESC
        ';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':orderNum', $orderNumber, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function removeHold($post)
    {

        $this->db->beginTransaction();

        try {
            $updatedId = $this->updateById($post);

            $userTrans[] = array(
                'field' => "Hold Remove",
                'o' => $post['reasonCode'],
                'n' => "",
                'comment' => "Hold Id: " . $post['id'],
                'so' => $post['orderNum'], 'userId' => $post['userId'],
                'type' => 'Graphics'
            );

            $this->userTransaction($userTrans);

            $this->db->commit();

            return $updatedId;
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }
}
