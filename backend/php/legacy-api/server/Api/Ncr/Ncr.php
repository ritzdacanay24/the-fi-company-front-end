<?php

namespace EyefiDb\Api\Ncr;

use PDO;


function dynamicInsert($table_name, $assoc_array){
    $keys = array();
    $values = array();
    foreach($assoc_array as $key => $value){
        $keys[] = $key;
        $values[] = $value;
    }
    $query = "INSERT INTO `$table_name`(`".implode("`,`", $keys)."`) VALUES('".implode("','", $values)."')";
    return $query;
}

function dynamicUpdate($table, $data, $id){
    $cols = array();
    foreach($data as $key=>$val) {
        $cols[] = "$key = '$val'";
    }
    $sql = "UPDATE $table SET " . implode(', ', $cols) . " WHERE id = $id";
    return($sql);
}

class Ncr
{

	protected $db;

	public function __construct($db)
	{
		$this->db = $db;
        $this->nowDate = date("Y-m-d H:i:s", time());
	}

    function getAttachment($uniqueId){

		$qry = "
			SELECT *
			from attachments 
			where uniqueId = :uniqueId
			AND field = 'NCR'
		";
		$query = $this->db->prepare($qry);
        $query->bindParam(':uniqueId', $uniqueId, PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);   
	}

	function deleteAttachment($id){

		$qry = "
			DELETE from attachments 
			where id = :id
			AND field = 'NCR'
		";
		$query = $this->db->prepare($qry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
		$query->execute();  
	}

    function validateToken($post){
        $qry = "
            SELECT *
            FROM eyefidb.ncr_token a 
            WHERE password = :password 
                and ncr_id = :ncr_id
        ";
        $query = $this->db->prepare($qry);
        $query->bindParam(':password', $post['password'], PDO::PARAM_STR);
        $query->bindParam(':ncr_id', $post['ncr_id'], PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    function validatePassword($post){
        $qry = "
            SELECT *
            FROM eyefidb.ncr_token a 
            WHERE password = :password 
        ";
        $query = $this->db->prepare($qry);
        $query->bindParam(':password', $post['password'], PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

	public function insert($post)
	{
		$qry = dynamicInsert('ncr', $post);

        $query = $this->db->prepare($qry);
        $query->execute();
        return $this->db->lastInsertId();    
    
	}

	public function update($id, $post)
	{
		$qry = dynamicUpdate('ncr', $post, $id);

        $info = $this->getById($id);

        foreach($info as $x => $val) {
            foreach($post as $x1 => $val1) {
                if($x == $x1){
                    if($val != $val1){
                        $this->ncrTrans(array(
                            "field" => $x,
                            "o" => $val,
                            "n" => $val1,
                            "userId" => $post['updated_by'],
                            "uniqueId" => $id,
                            "createDate" => $this->nowDate
                        ));
                    }  
                }
            }
        }

        $query = $this->db->prepare($qry);
        $query->execute();
        return $post;   
    
	}
    
	public function getById($id)
	{
        $qry = "
            SELECT *
            FROM eyefidb.ncr a 
            WHERE id = :id
        ";
        $query = $this->db->prepare($qry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }
    
    
	public function deleteById($id)
	{
        $qry = "
            DELETE FROM eyefidb.ncr
            WHERE id = :id
        ";
        $query = $this->db->prepare($qry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
    }
    
	public function getAll()
	{
        $qry = "
            SELECT *
            FROM eyefidb.ncr a 
        ";
        $query = $this->db->prepare($qry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
    
	public function ncrTrans($post)
	{
        $qry = dynamicInsert('ncr_trans', $post);

        $query = $this->db->prepare($qry);
        $query->execute();
        return $this->db->lastInsertId();    
    }


    public function getFailureTypeChart()
    {

        $mainQry = "
				select count(*) hits
					, case when complaint_code IS NULL THEN 'NA' ELSE complaint_code END complaint_code
				from eyefidb.ncr 
			";


        $mainQry .= " group by case when complaint_code IS NULL THEN 'NA' ELSE complaint_code END";
        $mainQry .= " ORDER BY count(*) DESC ";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        $failureType = array();
        foreach ($result as $row) {
            $failureType['name'][] = $row['complaint_code'];
            $failureType['hits'][] = $row['hits'];
        }

        $obj = array(
            "failureType" => $failureType
        );

        return $obj;
    }
    public function getFailureTypeCodes()
    {
        $qry = "
            SELECT *
            FROM eyefidb.ncr_complaint_codes a 
        ";
        $query = $this->db->prepare($qry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

}
