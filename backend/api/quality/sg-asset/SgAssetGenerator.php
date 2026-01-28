<?php

// Include base class
require_once __DIR__ . '/../BaseAssetGenerator.php';

class SgAssetGenerator extends BaseAssetGenerator
{
    public function __construct($db)
    {
        // Initialize base class with customer type ID and code
        parent::__construct($db, 1, 'sg');  // customerTypeId = 1 for SG (Light and Wonder)
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
            SELECT RIGHT(generated_SG_asset, 2) generatedAssetNumber,
                id, 
                DATE(timeStamp) dateCreated
            FROM eyefidb.sgAssetGenerator
            WHERE manualUpdate IS NULL OR manualUpdate = ''
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
        } else {
            $lastRecordedWeekNumber = $this->getWeekNumber($result['dateCreated']);
            $lastRecordedYearNumber = $this->getYearNumber($result['dateCreated']);

            $generatedAssetNumber = $this->generateSerialNumber($result['generatedAssetNumber'], $lastRecordedWeekNumber, $lastRecordedYearNumber);
        }

        $mainQry = "
            INSERT INTO eyefidb.sgAssetGenerator (
                timeStamp,
                poNumber,
                property_site,
                sgPartNumber,
                inspectorName,
                generated_SG_asset,
                serialNumber,
                lastUpdate,
                manualUpdate
            ) VALUES (
                :timeStamp,
                :poNumber,
                :property_site,
                :sgPartNumber,
                :inspectorName,
                :generated_SG_asset,
                :serialNumber,
                :lastUpdate,
                :manualUpdate
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
        
        $insertId = $this->db->lastInsertId();
        
        return [
            'generated_SG_asset' => $generatedAssetNumber,
            'insertId' => $insertId
        ];
    }

    /**
     * Bulk create multiple SG assets in a single transaction
     * Now uses BaseAssetGenerator with assignment tracking
     * Returns array of generated SG asset numbers
     */
    public function bulkCreate($assignments)
    {
        // Use base class method which handles:
        // - Transaction management
        // - Assignment tracking
        // - Serial consumption marking
        return $this->bulkCreateAssignments($assignments);
    }

    /**
     * Generate SG asset number using formula: US14WWYYSS
     * Implements abstract method from BaseAssetGenerator
     * 
     * @param array $assignment Assignment data
     * @return string Generated SG asset number
     */
    protected function generateAssetNumber($assignment)
    {
        // Get latest sequence for EACH iteration to ensure sequential numbers
        $mainQry = "
            SELECT RIGHT(generated_SG_asset, 2) generatedAssetNumber,
                id, 
                DATE(timeStamp) dateCreated
            FROM eyefidb.sgAssetGenerator
            WHERE manualUpdate IS NULL OR manualUpdate = ''
            ORDER BY id DESC
            LIMIT 1
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetch();

        $lastRecordedWeekNumber = $this->getWeekNumber($result['dateCreated']);
        $lastRecordedYearNumber = $this->getYearNumber($result['dateCreated']);
        
        // Generate sequential SG asset number
        return $this->generateSerialNumber(
            $result['generatedAssetNumber'], 
            $lastRecordedWeekNumber, 
            $lastRecordedYearNumber
        );
    }

    /**
     * Insert record into sgAssetGenerator table
     * Implements abstract method from BaseAssetGenerator
     * 
     * @param array $assignment Assignment data
     * @param string $generatedAssetNumber Generated SG asset number
     * @return int Insert ID
     */
    protected function insertCustomerAsset($assignment, $generatedAssetNumber)
    {
        // Use manualUpdate from assignment if provided (for USED category), otherwise NULL (for NEW/auto-generated)
        $manualUpdate = isset($assignment['manualUpdate']) ? $assignment['manualUpdate'] : null;
        
        $insertQry = "
            INSERT INTO eyefidb.sgAssetGenerator (
                timeStamp,
                poNumber,
                property_site,
                sgPartNumber,
                inspectorName,
                generated_SG_asset,
                serialNumber,
                lastUpdate,
                manualUpdate
            ) VALUES (
                :timeStamp,
                :poNumber,
                :property_site,
                :sgPartNumber,
                :inspectorName,
                :generated_SG_asset,
                :serialNumber,
                :lastUpdate,
                :manualUpdate
            )
        ";

        $insertQuery = $this->db->prepare($insertQry);
        $insertQuery->bindParam(':timeStamp', $this->nowDate, PDO::PARAM_STR);
        $insertQuery->bindParam(':poNumber', $assignment['poNumber'], PDO::PARAM_STR);
        $insertQuery->bindParam(':property_site', $assignment['property_site'], PDO::PARAM_STR);
        $insertQuery->bindParam(':sgPartNumber', $assignment['sgPartNumber'], PDO::PARAM_STR);
        $insertQuery->bindParam(':inspectorName', $this->user_full_name, PDO::PARAM_STR);
        $insertQuery->bindParam(':generated_SG_asset', $generatedAssetNumber, PDO::PARAM_STR);
        $insertQuery->bindParam(':serialNumber', $assignment['serialNumber'], PDO::PARAM_STR);
        $insertQuery->bindParam(':lastUpdate', $this->nowDate, PDO::PARAM_STR);
        $insertQuery->bindParam(':manualUpdate', $manualUpdate, PDO::PARAM_STR);
        $insertQuery->execute();

        return $this->db->lastInsertId();
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
                SET poNumber = :poNumber,
                    property_site = :property_site,
                    sgPartNumber = :sgPartNumber,
                    serialNumber = :serialNumber,
                    lastUpdate = :lastUpdate
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
            SELECT id,
                timeStamp,
                poNumber,
                property_site,
                sgPartNumber,
                inspectorName,
                generated_SG_asset,
                serialNumber
            FROM eyefidb.sgAssetGenerator
            WHERE active = 1
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
            SELECT id,
                timeStamp,
                poNumber,
                property_site,
                sgPartNumber,
                inspectorName,
                generated_SG_asset,
                serialNumber
            FROM eyefidb.sgAssetGenerator
            WHERE id = :id
            ORDER BY timeStamp DESC
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);

        return $result;
    }
}
