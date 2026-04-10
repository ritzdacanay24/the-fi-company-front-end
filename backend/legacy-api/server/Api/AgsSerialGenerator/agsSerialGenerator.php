<?php

// Include base class
require_once __DIR__ . '/../BaseAssetGenerator.php';

class AgsSerialGenerator extends BaseAssetGenerator
{
    public function __construct($db)
    {
        // Initialize base class with customer type ID and code
        parent::__construct($db, 2, 'ags');  // customerTypeId = 2 for AGS
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
        // Set values
        $defaultFirst = 'EF';
        $currentYear = date("y");
        $currentWeekNumber = date("W");
        $dateSequence = date("mdy");
        $sequence = '1000';

        if ($currentWeekNumber == $lastRecordedWeekNumber) {
            $sequence = str_pad($previous_sequence + 1, 4, "0", STR_PAD_LEFT);
        }

        return $defaultFirst . $dateSequence . $sequence;
    }

    public function addNew($data)
    {
        $mainQry = "
            SELECT RIGHT(generated_SG_asset, 4) generatedAssetNumber, 
                id, 
                DATE(timeStamp) dateCreated
            FROM eyefidb.agsSerialGenerator
            WHERE manualUpdate IS NULL OR manualUpdate = ''
            ORDER BY id DESC
            LIMIT 1
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetch();

        $manualUpdate = false;
        if (ISSET($data['generated_SG_asset']) && $data['generated_SG_asset'] != '') {
            $generatedAssetNumber = $data['generated_SG_asset'];
            $manualUpdate = true;
        } else {
            $lastRecordedWeekNumber = $this->getWeekNumber($result['dateCreated']);
            $lastRecordedYearNumber = $this->getYearNumber($result['dateCreated']);
    
            $generatedAssetNumber = $this->generateSerialNumber($result['generatedAssetNumber'], $lastRecordedWeekNumber, $lastRecordedYearNumber);
        }

        $mainQry = "
            INSERT INTO eyefidb.agsSerialGenerator (
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
     * Bulk create multiple AGS serials in a single transaction
     * Now uses BaseAssetGenerator with assignment tracking
     * Returns array of generated AGS serial numbers
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
     * Generate AGS serial number using formula: EFMMDDYYSSSS
     * Implements abstract method from BaseAssetGenerator
     * 
     * @param array $assignment Assignment data
     * @return string Generated AGS serial number
     */
    protected function generateAssetNumber($assignment)
    {
        // Fresh query for latest sequence for EACH iteration to ensure sequential numbers
        $mainQry = "
            SELECT RIGHT(generated_SG_asset, 4) generatedAssetNumber, 
                id, 
                DATE(timeStamp) dateCreated
            FROM eyefidb.agsSerialGenerator
            WHERE manualUpdate IS NULL OR manualUpdate = ''
            ORDER BY id DESC
            LIMIT 1
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetch();

        $lastRecordedWeekNumber = $this->getWeekNumber($result['dateCreated']);
        $lastRecordedYearNumber = $this->getYearNumber($result['dateCreated']);
        
        // Generate sequential AGS serial number (EFMMDDYYSSSS format)
        return $this->generateSerialNumber(
            $result['generatedAssetNumber'], 
            $lastRecordedWeekNumber, 
            $lastRecordedYearNumber
        );
    }

    /**
     * Insert record into agsSerialGenerator table
     * Implements abstract method from BaseAssetGenerator
     * 
     * @param array $assignment Assignment data
     * @param string $generatedAssetNumber Generated AGS serial number
     * @return int Insert ID
     */
    protected function insertCustomerAsset($assignment, $generatedAssetNumber)
    {
        $insertQry = "
            INSERT INTO eyefidb.agsSerialGenerator (
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
                NULL
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
        $insertQuery->execute();

        return $this->db->lastInsertId();
    }

    public function delete($data)
    {
        $qry = "
            UPDATE eyefidb.agsSerialGenerator
                SET active = :active
            WHERE id = :id	
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':active', $data['active'], PDO::PARAM_INT);
        $stmt->bindParam(':id', $data['id'], PDO::PARAM_INT);
        $stmt->execute();
        $count = $stmt->rowCount();
        
        if ($count == '0') {
            return false;
        } else {
            return true;
        }
    }

    public function edit($data)
    {
        $mainQry = "
            UPDATE eyefidb.agsSerialGenerator
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
            FROM eyefidb.agsSerialGenerator
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
            FROM eyefidb.agsSerialGenerator
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
