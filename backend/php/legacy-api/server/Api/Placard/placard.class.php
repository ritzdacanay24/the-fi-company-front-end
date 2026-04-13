<?php

class Placard
{

	protected $db;

	public $order;
	public $partNumber;
	public $line;

	public function __construct($dbQad, $dbEyeFi)
	{

		$this->db = $dbQad;
		$this->dbEyeFi = $dbEyeFi;
	}

	public function validateWo($woNumber)
	{
		$mainQry = "
				select wo_nbr 
				, wo_part 
			, fullDesc wo_desc
			from wo_mstr a  
			left join ( 
				select a.sod_nbr	 
					, a.sod_part 
					, a.sod_custpart 
					, b.fullDesc 
				from sod_det a 
				left join (  
					select pt_part			 
						, max(pt_desc1) pt_desc1 
						, max(pt_desc2) pt_desc2			 	
						, max(CONCAT(pt_desc1, pt_desc2)) fullDesc 
						, max(pt_routing) pt_routing 
					from pt_mstr 
					where pt_domain = 'EYE'  
					group by pt_part		  
				) b ON b.pt_part = a.sod_part 
			) b on b.sod_part = a.wo_part 

			

			where wo_domain = 'EYE' 
		and wo_nbr = :woNumber
		";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(":woNumber", $woNumber, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetch();

		return $result;
	}

	public function searchSerialNumber($serialNumber)
	{
		$mainQry = "
			select generated_SG_asset customerSerial, 
			serialNumber, 
			'AGS' customer
			from eyefidb.agsSerialGenerator
			where generated_SG_asset = :serialNumber1
			and active = 1
			UNION all			
			select generated_SG_asset customerSerial, 
			serialNumber , 
			'SG' customer
			from eyefidb.sgAssetGenerator
			where generated_SG_asset = :serialNumber2
			and active = 1
		";
		$query = $this->dbEyeFi->prepare($mainQry);
		$query->bindParam(":serialNumber1", $serialNumber, PDO::PARAM_STR);
		$query->bindParam(":serialNumber2", $serialNumber, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetch();

		return $result;
	}

	public function ReadAll()
	{

		//, a.sod_order_category misc
		$mainQry = "
				SELECT a.sod_part
					, sod_nbr
					, b.so_po
					, CONCAT(pt_desc1, pt_desc2) fullDesc
					, cp_cust_part sod_custpart
					, sod_line	
					, so_cust
					, so_ship location
					
                    , REPLACE(f.cmt_cmmt, ';' , ' ')  misc
				FROM sod_det a

				
                LEFT JOIN (
                    select cmt_cmmt
                        , cmt_indx
                    from cmt_det 
                    where cmt_domain = 'EYE' 
                ) f ON f.cmt_indx = a.sod_cmtindx

				JOIN (
					SELECT so_cust
						, so_nbr
						, so_po
						, so_ship
					FROM so_mstr 
					WHERE so_domain = 'EYE'
				) b ON b.so_nbr = a.sod_nbr
				
				LEFT JOIN ( 
					select pt_part
						, max(pt_desc1) pt_desc1
						, max(pt_desc2) pt_desc2
					FROM pt_mstr
					WHERE pt_domain = 'EYE'
					GROUP by pt_part
				) c ON c.pt_part = a.sod_part

				LEFT JOIN (
					select cp_cust_part, cp_part 
					from cp_mstr 
					where cp_domain = 'EYE'
				) d ON d.cp_part = a.sod_part
				
				WHERE a.sod_nbr = :order 
					AND a.sod_part = :partNumber
					AND sod_line = :line
					AND sod_domain = 'EYE'
				WITH (NOLOCK)
			";
		$query = $this->db->prepare($mainQry);
		$query->bindParam(":order", $this->order, PDO::PARAM_STR);
		$query->bindParam(":partNumber", $this->partNumber, PDO::PARAM_STR);
		$query->bindParam(":line", $this->line, PDO::PARAM_STR);
		$query->execute();
		$result = $query->fetch();

		return $result;
	}
}
