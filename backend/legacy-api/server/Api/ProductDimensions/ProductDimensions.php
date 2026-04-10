<?php

namespace EyefiDb\Api\ProductDimensions;

use PDO;
use PDOException;

class ProductDimensions
{

    protected $db;

    public function __construct($db, $dbQad = false)
    {

        $this->db = $db;
        $this->dbQad = $dbQad;
        $this->nowDate = date(" Y-m-d H:i:s", time());
    }

    public function getPartNumbers()
    {
        $qry = "
            select LTRIM(RTRIM(pt_part)) pt_part
                , MAX(CONCAT(pt_desc1, pt_desc2)) full_desc 
            from pt_mstr 
            where pt_domain = 'EYE' 
                AND pt_status = 'ACTIVE'
            group by LTRIM(RTRIM(pt_part))
        ";
        $stmt = $this->dbQad->prepare($qry);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPartNumberById($partNumber)
    {
        $qry = "
            select LTRIM(RTRIM(pt_part)) pt_part
                , CONCAT(pt_desc1, pt_desc2) full_desc 
            from pt_mstr 
            where pt_domain = 'EYE' 
                AND LTRIM(RTRIM(pt_part)) = :part_number

        ";
        $stmt = $this->dbQad->prepare($qry);
        $stmt->bindParam(':part_number', $partNumber, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getPartNumberInfo($item = 'ELE-43300-043')
    {

        $itemInfo = "
            select a.pt_part
                , CONCAT(a.pt_desc1, a.pt_desc2) full_desc
                , a.pt_um
                , a.pt_pm_code
                , a.pt_status
                , a.pt_site
                , a.pt_added
                , a.pt_mod_date
            from pt_mstr a
            WHERE a.pt_part = :part
                AND pt_domain = 'EYE'
            WITH (NOLOCK)
        ";
        $query = $this->dbQad->prepare($itemInfo);
        $query->bindParam(':part', $item, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch();
    }

    public function addPlaceholder($text, $count = 0, $separator = ",")
    {
        $result = array();
        if ($count > 0) {
            for ($x = 0; $x < $count; $x++) {
                $result[] = $text;
            }
        }
        return implode($separator, $result);
    }

    public function delete($id)
    {
        $mainQry = "
            DELETE from eyefidb.product_dimensions
            WHERE id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
    }

    public function insert($data)
    {

        try {
            $qry = '
				INSERT INTO eyefidb.product_dimensions(
					item_number
					, description
					, length 
					, width 
					, height 
					, weight 
					, number_of_pallets 
					, number_of_boxes 
                    , number_of_item_per_pallet
                    , pallet_size
					, comments 
					, cycle_time 
				) VALUES (
					:item_number
					, :description
					, :length 
					, :width 
					, :height 
					, :weight 
					, :number_of_pallets 
					, :number_of_boxes 
                    , :number_of_item_per_pallet
                    , :pallet_size
					, :comments 
					, :cycle_time 
				)
			';
            $query = $this->db->prepare($qry);
            $query->bindParam(':item_number', $data['item_number'], PDO::PARAM_STR);
            $query->bindParam(':description', $data['description'], PDO::PARAM_STR);
            $query->bindParam(':length', $data['length'], PDO::PARAM_STR);
            $query->bindParam(':width', $data['width'], PDO::PARAM_STR);
            $query->bindParam(':height', $data['height'], PDO::PARAM_STR);
            $query->bindParam(':weight', $data['weight'], PDO::PARAM_STR);
            $query->bindParam(':number_of_pallets', $data['number_of_pallets'], PDO::PARAM_STR);
            $query->bindParam(':number_of_boxes', $data['number_of_boxes'], PDO::PARAM_STR);
            $query->bindParam(':number_of_item_per_pallet', $data['number_of_item_per_pallet'], PDO::PARAM_STR);
            $query->bindParam(':pallet_size', $data['pallet_size'], PDO::PARAM_STR);
            $query->bindParam(':comments', $data['comments'], PDO::PARAM_STR);
            $query->bindParam(':cycle_time', $data['cycle_time'], PDO::PARAM_STR);
            $query->execute();

            $data['id'] = (int) $this->db->lastInsertId();
            return $data;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function edit($data)
    {
        if ($data['id'] == "" || !$data['id']) {
            $this->insert($data);
        } else {
            $this->updateById($data);
        }
    }

    public function updateById($data)
    {

        try {

            $qry = '
				UPDATE eyefidb.product_dimensions
				SET item_number = :item_number
                    , description = :description
                    , length = :length
                    , width = :width
                    , height = :height
                    , weight = :weight
                    , number_of_pallets = :number_of_pallets
                    , number_of_boxes = :number_of_boxes
                    , number_of_item_per_pallet = :number_of_item_per_pallet
                    , comments = :comments
                    , cycle_time = :cycle_time
                    , pallet_size = :pallet_size
				WHERE id = :id
			';
            $query = $this->db->prepare($qry);
            $query->bindParam(':item_number', $data['item_number'], PDO::PARAM_STR);
            $query->bindParam(':description', $data['description'], PDO::PARAM_STR);
            $query->bindParam(':length', $data['length'], PDO::PARAM_STR);
            $query->bindParam(':width', $data['width'], PDO::PARAM_STR);
            $query->bindParam(':height', $data['height'], PDO::PARAM_STR);
            $query->bindParam(':weight', $data['weight'], PDO::PARAM_STR);
            $query->bindParam(':number_of_pallets', $data['number_of_pallets'], PDO::PARAM_STR);
            $query->bindParam(':number_of_boxes', $data['number_of_boxes'], PDO::PARAM_STR);
            $query->bindParam(':number_of_item_per_pallet', $data['number_of_item_per_pallet'], PDO::PARAM_STR);
            $query->bindParam(':comments', $data['comments'], PDO::PARAM_STR);
            $query->bindParam(':cycle_time', $data['cycle_time'], PDO::PARAM_STR);
            $query->bindParam(':pallet_size', $data['pallet_size'], PDO::PARAM_STR);
            $query->bindParam(':id', $data['id'], PDO::PARAM_INT);
            $query->execute();

            return $data;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getAll()
    {
        $mainQry = "
			select *
			FROM eyefidb.product_dimensions
            ORDER BY id ASC
		";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function searchById($id)
    {
        $mainQry = "
            select *
            FROM eyefidb.product_dimensions
            where id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function searchItemMaintByPartNumber($item_number)
    {
        $mainQry = "
            select *
            FROM eyefidb.product_dimensions
            where item_number = :item_number
            ORDER BY id desc
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':item_number', $item_number, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getByPartNumber($partNumber)
    {
        $partNumberInfo = $this->getPartNumberById($partNumber);
        $partNumberMain = $this->searchItemMaintByPartNumber($partNumber);        

        foreach ($partNumberMain as  &$partNumberMainRow) {
            $partNumberMainRow['item_number'] = $partNumberInfo['PT_PART'];
            $partNumberMainRow['description'] = $partNumberInfo['FULL_DESC'];
        }

        $partNumberInfo['item_number'] = $partNumberInfo['PT_PART'];
        $partNumberInfo['description'] = $partNumberInfo['FULL_DESC'];

        $obj_merged = (object) array_merge(
            (array) $partNumberInfo,
            (array) $partNumberMain
        );


        return array(
            "results" => count($partNumberMain) > 0 ? $partNumberMain[0] : $obj_merged,
            "allResults" => $partNumberMain,
            "palletSizes" => $this->palletSizes()
        );
    }


    public function getReport()
    {
        $partNumbers = $this->getPartNumbers();
        //$partNumbers = json_decode(file_get_contents("/var/www/html/server/Api/ProductDimensions/item.json"), true);
        $itemMaint = $this->getAll();
        foreach ($partNumbers as &$partNumbersRow) {

            foreach ($itemMaint as $itemMaintRow) {
                if ($partNumbersRow['PT_PART'] == $itemMaintRow['item_number']) {
                    $partNumbersRow['maint'] = $itemMaintRow;
                }
            }
        }
        return $partNumbers;
    }

    public function updateOnNewDashboard()
    {
        $mainQry = "
            select a.partNumber, b.item_number from eyefidb.shipping_cycle_times a LEFT join eyefidb.product_dimensions b ON a.partNumber = b.item_number WHERE b.item_number IS NULL
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $qry = "
            INSERT INTO eyefidb.product_dimensions(
                item_number
            ) VALUES (
                :item_number
            )
        ";
        foreach ($results as $row) {

            $query = $this->db->prepare($qry);
            $query->bindParam(':item_number', $row['partNumber'], PDO::PARAM_STR);
            $query->execute();
        }
    }

    public function palletSizes()
    {
        $mainQry = "
            select pt_part pallet_Size,
                cast(openPo as numeric(36,0))  open_po
            from pt_mstr  

            left join ( 
                select sum(pod_qty_ord) ordered, 
                        sum(pod_qty_rcvd) rec, 
                        sum(pod_qty_ord-pod_qty_rcvd) openPo, 
                        pod_part, 
                        min(pod_due_date) minDate 
                from pod_det 

                join po_mstr ON  po_vend  IN ('POWPAL', 'CRATER') AND po_domain = 'EYE' and po_nbr = pod_nbr

                join ( 
                        select pt_part,  
                                pt_desc1 
                        from pt_mstr   
                        where pt_vend IN ('POWPAL', 'CRATER')
                ) c ON c.pt_part = pod_part   

                WHERE pod_qty_ord != pod_qty_rcvd 
                        and pod_domain = 'EYE' 
                group by pod_part 
                
            ) a ON a.pod_part = pt_part 

            where pt_vend IN ('POWPAL', 'CRATER')
            ORDER BY pt_part ASC
            WITH (NOLOCK)
    ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $palletsSizes = array();
        foreach ($results as &$row) {
            $palletsSizes[] = $row['PALLET_SIZE'];
        }

        return $palletsSizes;
    }
}
