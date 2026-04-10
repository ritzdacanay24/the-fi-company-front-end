<?php

class SgAssetGenerator
{

    protected $db;
    public $user_full_name;

    public function __construct($db)
    {

        $this->db = $db;
        $this->nowDate = date("Y-m-d H:i:s", time());
    }

    public function getWeekNumber($date)
    {
        $ddate = $date;
        $date = new DateTime($ddate);
        return $date->format("W");
    }

    public function getYearNumber($date)
    {
        $ddate = $date;
        $date = new DateTime($ddate);
        return $date->format("Y");
    }

    public function generateSerialNumber($previous_sequence, $lastRecordedWeekNumber, $lastRecordedYearNumber)
    {

        //set values
        $defaultFirst = 'US14';
        $currentYear = date("y");
        $currentWeekNumber = date("W");
        $sequence = '01';

        if ($currentWeekNumber == $lastRecordedWeekNumber) {
            $sequence = str_pad($previous_sequence + 1, 2, "0", STR_PAD_LEFT);
        }

        //standard
        return $defaultFirst . $currentWeekNumber . $currentYear . $sequence;
    }

    public function addNew($data)
    {

        $mainQry = "
            select RIGHT(generated_SG_asset, 2) generatedAssetNumber,
                id, 
                date(timeStamp) dateCreated
            from eyefidb.sgAssetGenerator
            where manualUpdate IS NULL OR manualUpdate = ''
            ORDER BY id DESC
            LIMIT 1
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetch();

        $manualUpdate = false;
        if(ISSET($data['generated_SG_asset']) && $data['generated_SG_asset'] != ''){
            $generatedAssetNumber = $data['generated_SG_asset'];
            $manualUpdate = true;
        }else{

            $lastRecordedWeekNumber = $this->getWeekNumber($result['dateCreated']);
            $lastRecordedYearNumber = $this->getYearNumber($result['dateCreated']);

            $generatedAssetNumber = $this->generateSerialNumber($result['generatedAssetNumber'], $lastRecordedWeekNumber, $lastRecordedYearNumber);

        }

        $mainQry = "
				INSERT INTO eyefidb.sgAssetGenerator (
					timeStamp
					, poNumber
					, property_site
					, sgPartNumber
					, inspectorName
					, generated_SG_asset
					, serialNumber
					, lastUpdate
                    , manualUpdate
				) VALUES (
					:timeStamp
					, :poNumber
					, :property_site
					, :sgPartNumber
					, :inspectorName
					, :generated_SG_asset
					, :serialNumber
					, :lastUpdate
                    , :manualUpdate
				)
			";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(':timeStamp', $this->nowDate, PDO::PARAM_STR);
        $query->bindParam(':poNumber', $data['poNumber'], PDO::PARAM_STR);
        $query->bindParam(':property_site', $data['property_site'], PDO::PARAM_STR);
        $query->bindParam(':sgPartNumber', $data['sgPartNumber'], PDO::PARAM_STR);
        $query->bindParam(':inspectorName', $this->user_full_name, PDO::PARAM_STR);
        $query->bindParam(':generated_SG_asset', $generatedAssetNumber, PDO::PARAM_STR);
        $query->bindParam(':serialNumber', $data['serialNumber'], PDO::PARAM_STR);
        $query->bindParam(':lastUpdate', $this->nowDate, PDO::PARAM_STR);
        $query->bindParam(':manualUpdate', $manualUpdate, PDO::PARAM_STR);
        $query->execute();
        return $generatedAssetNumber;
    }

    public function delete($data)
    {
        $mainQry = "
            UPDATE eyefidb.sgAssetGenerator
                SET active = :active
            WHERE id = :id	
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':active', $data['active'], PDO::PARAM_INT);
        $query->bindParam(':id', $data['id'], PDO::PARAM_INT);
        $query->execute();
    }

    public function edit($data)
    {

        $mainQry = "
				UPDATE eyefidb.sgAssetGenerator
					SET poNumber = :poNumber
						, property_site = :property_site
						, sgPartNumber = :sgPartNumber
						, serialNumber = :serialNumber
						, lastUpdate = :lastUpdate
				WHERE id = :id	
			";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(':poNumber', $data['poNumber'], PDO::PARAM_STR);
        $query->bindParam(':property_site', $data['property_site'], PDO::PARAM_STR);
        $query->bindParam(':sgPartNumber', $data['sgPartNumber'], PDO::PARAM_STR);
        $query->bindParam(':serialNumber', $data['serialNumber'], PDO::PARAM_STR);
        $query->bindParam(':lastUpdate', $this->nowDate, PDO::PARAM_STR);
        $query->bindParam(':id', $data['id'], PDO::PARAM_INT);
        $query->execute();
    }


    public function readAll()
    {

        $mainQry = "
				select id 
					, timeStamp
					, poNumber 
					, property_site 
					, sgPartNumber 
					, inspectorName
					, generated_SG_asset
					, serialNumber
				from eyefidb.sgAssetGenerator
                where active = 1
				ORDER BY timeStamp DESC
			";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        return $result;
    }

    public function getById($id)
    {

        $mainQry = "
				select id 
					, timeStamp
					, poNumber 
					, property_site 
					, sgPartNumber 
					, inspectorName
					, generated_SG_asset
					, serialNumber
				from eyefidb.sgAssetGenerator
                where id = :id
				ORDER BY timeStamp DESC
			";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);

        return $result;
    }
}
