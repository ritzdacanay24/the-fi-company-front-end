<?php

namespace EyefiDb\Api\Receiving;

use PDO;
use PDOException;


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

class Receiving
{

	protected $db;

	public function __construct($dbQad)
	{
		$this->db = $dbQad;
	}

	

	function getById($id)
	{
		$qry = "
			SELECT  *
				, case 
					when inbound_or_pickup = 'Outbound'
						THEN '#FF8C00' 
					when inbound_or_pickup = 'Inbound'
						THEN '#4B6F44' 
					when inbound_or_pickup = 'Pick up'
						THEN '#6CB4EE' 
					when inbound_or_pickup = 'PTO'
						THEN '#AA0000' 
					ELSE '#8fbc8f' 
				END backgroundColor
				, case 
					when inbound_or_pickup = 'Outbound'
						THEN '#FF8C00' 
					when inbound_or_pickup = 'Inbound'
						THEN '#4B6F44' 
					when  inbound_or_pickup = 'Pick up'
						THEN '#6CB4EE' 
					when inbound_or_pickup = 'PTO'
						THEN '#AA0000' 
					ELSE '#8fbc8f' 
				END  borderColor
				, case 
					when inbound_or_pickup = 'Outbound'
						THEN 'bg-warning' 
					when inbound_or_pickup = 'Inbound'
						THEN 'bg-success' 
					when inbound_or_pickup = 'Pick up'
						THEN 'bg-info' 
					when inbound_or_pickup = 'PTO'
						THEN 'bg-danger' 
					ELSE 'bg-success bg-opacity-50' 
				END backgroundColorClass
				, case 
					when inbound_or_pickup = 'Outbound'
						THEN 'bg-warning rounded' 
					when inbound_or_pickup = 'Inbound'
						THEN 'bg-success rounded' 
					when  inbound_or_pickup = 'Pick up'
						THEN 'bg-info rounded' 
					when inbound_or_pickup = 'PTO'
						THEN 'bg-danger rounded' 
						ELSE 'bg-success bg-opacity-50 rounded' 
				END  borderColorClass
				, case when status = 'Open' THEN '#fff ' ELSE '#fff' END textColor
				, concat(start_date, ' ', start_time) start, 
				concat(end_date, ' ', start_time) end 
			from receiving 
			where id = :id
		";
		$query = $this->db->prepare($qry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
		$query->execute();
		return $query->fetch(PDO::FETCH_ASSOC);   
    
	}

	public function getOpenPoOriginal()
	{
		$qry = "
		SELECT id,
		comments,
		inbound_or_pickup, 
		po_number,
		status, 
		title, 
		start_date,
		end_date
					, (case 
						when inbound_or_pickup = 'Outbound'
							THEN '#FF8C00' 
						when inbound_or_pickup = 'Inbound'
							THEN '#4B6F44' 
						when inbound_or_pickup = 'Pick up'
							THEN '#6CB4EE' 
						when inbound_or_pickup = 'PTO'
							THEN '#AA0000' 
						ELSE '#8fbc8f' 
					END) backgroundColor
					, (case 
						when inbound_or_pickup = 'Outbound'
							THEN '#FF8C00' 
						when inbound_or_pickup = 'Inbound'
							THEN '#4B6F44' 
						when  inbound_or_pickup = 'Pick up'
							THEN '#6CB4EE' 
						when inbound_or_pickup = 'PTO'
							THEN '#AA0000' 
						ELSE '#8fbc8f'  
					END)  borderColor
					, (case when status = 'Open' THEN '#fff ' ELSE '#fff' END) textColor
					, concat(start_date, ' ', start_time) start
					, concat(end_date, ' ', start_time) end 
				from receiving 
				where start_date >= :start AND end_date <= :end
		";
		$query = $this->db->prepare($qry);
        $query->bindParam(':start', $_GET['start'], PDO::PARAM_STR);
        $query->bindParam(':end', $_GET['end'], PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}

	public function getOpenPo()
	{
		$qry = "
		SELECT  'logistics' type_of, id,
    comments,
    inbound_or_pickup, 
    po_number,
    status, 
    title, 
	background_color,
	text_color,
    start_date
				, (case 
					when inbound_or_pickup = 'Outbound'
						THEN '#FF8C00' 
					when inbound_or_pickup = 'Inbound'
						THEN '#4B6F44' 
					when inbound_or_pickup = 'Pick up'
						THEN '#6CB4EE' 
					when inbound_or_pickup = 'PTO'
						THEN '#AA0000' 
					ELSE '#8fbc8f' 
				END) backgroundColor
				, (case 
					when inbound_or_pickup = 'Outbound'
						THEN '#FF8C00' 
					when inbound_or_pickup = 'Inbound'
						THEN '#4B6F44' 
					when  inbound_or_pickup = 'Pick up'
						THEN '#6CB4EE'
					when inbound_or_pickup = 'PTO'
						THEN '#AA0000'  
					ELSE '#8fbc8f'  
				END)  borderColor
				, case 
					when inbound_or_pickup = 'Outbound'
						THEN 'bg-warning' 
					when inbound_or_pickup = 'Inbound'
						THEN 'bg-success' 
					when inbound_or_pickup = 'Pick up'
						THEN 'bg-info' 
					when inbound_or_pickup = 'PTO'
						THEN 'bg-danger' 
					ELSE 'bg-success bg-opacity-50' 
				END backgroundColorClass
				, case 
					when inbound_or_pickup = 'Outbound'
						THEN 'bg-warning rounded' 
					when inbound_or_pickup = 'Inbound'
						THEN 'bg-success rounded' 
					when  inbound_or_pickup = 'Pick up'
						THEN 'bg-info rounded' 
					when inbound_or_pickup = 'PTO'
						THEN 'bg-danger rounded' 
						ELSE 'bg-success bg-opacity-50 rounded' 
				END  borderColorClass
				, (case when status = 'Open' THEN '#fff ' ELSE '#fff' END) textColor
				, concat(start_date, ' ', start_time) start
				, concat(end_date, ' ', start_time) end
                , '' property
                , '' customer
                , '' platform
                , '' sign_type
                , '' fs_scheduler_id
			from receiving 
			WHERE start_date BETWEEN :start AND :end 
OR end_date BETWEEN :start_ AND :end_

            UNION ALL 
            select 'fs_scheduler' type_of, null id 
            	, 'Info pulled from field service' comments
                , '' inbound_or_pickup
                , '' po_number
                , status
                , title
                , request_date start_date
                , '' background_color
                , '' text_color
                , 'yellow' backgroundColor
				, 'yellow' borderColor
                , 'bg-warning' backgroundColorClass
				, 'bg-warning' borderColorClass
                , 'black' textColor
				, concat(full_request_date) start
                , concat(full_request_date) end
                , a.property
                , customer
                , platform
                , sign_type
                , fs_scheduler_id
            from fs_scheduler_view a
            where a.service_type = 'Removal' AND lower(a.state) = 'nv'
            and request_date between :start1 AND :end1
		";
		$query = $this->db->prepare($qry);
        $query->bindParam(':start', $_GET['start'], PDO::PARAM_STR);
        $query->bindParam(':end', $_GET['end'], PDO::PARAM_STR);
        $query->bindParam(':start_', $_GET['start'], PDO::PARAM_STR);
        $query->bindParam(':end_', $_GET['end'], PDO::PARAM_STR);
        $query->bindParam(':start1', $_GET['start'], PDO::PARAM_STR);
        $query->bindParam(':end1', $_GET['end'], PDO::PARAM_STR);
		$query->execute();
		return $query->fetchAll(PDO::FETCH_ASSOC);
	}

	public function insert($post){
		$qry = dynamicInsert('receiving',  $post);

        $query = $this->db->prepare($qry);
        $query->execute();
        return $this->db->lastInsertId();  
	}

	public function update($id, $post)
	{
		$qry = dynamicUpdate('receiving', $post, $id);
        $query = $this->db->prepare($qry);
        $query->execute();
        return $post;   
    
	}
	public function delete($id)
	{
		$qry = "
			DELETE FROM receiving where id = :id
		";
		$query = $this->db->prepare($qry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
		$query->execute();
    
	}

	function getAttachment($uniqueId){

		$qry = "
			SELECT *
			from attachments 
			where uniqueId = :uniqueId
			AND field = 'LOGISTICS_CALENDAR'
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
			AND field = 'LOGISTICS_CALENDAR'
		";
		$query = $this->db->prepare($qry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
		$query->execute();  
	}

	

}
