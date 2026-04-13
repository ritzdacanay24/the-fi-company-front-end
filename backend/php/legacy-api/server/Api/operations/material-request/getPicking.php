<?php
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

try {

    $qry = "
        SELECT a.*
            , b.printedBy
            , b.printedDate
            , b.notes
            , TIMESTAMPDIFF(SECOND, b.printedDate, now()) timeDiff
        FROM eyefidb.mrf a
        LEFT JOIN (
            SELECT max(printedBy) printedBy
                , max(printedDate) printedDate
                , max(notes) notes
                , mrf_id
            FROM eyefidb.mrf_det 
            where qty != qtyPicked
            GROUP BY mrf_id
            ORDER BY printedDate DESC
        ) b ON b.mrf_id = a.id			
        WHERE a.validated IS NOT NULL
            AND pickedCompletedDate IS NULL
            AND a.active = 1
        ORDER BY 
            CASE 	
                WHEN priority = 'true'
                    THEN 1
            END DESC, 
            a.createdDate ASC
    ";
    $query = $db->prepare($qry);
    $query->execute();
    $results = $query->fetchAll(PDO::FETCH_ASSOC);

    $ids = array();
    foreach ($results as $row) {
        $ids[] = $row['id'];
    }

    $inIds = "'" . implode("','", $ids) . "'";

    $items = array();
    $locationDetails = array();

    if ($results) {
        $qryDetails = "
            SELECT *
                , qty openQty
                , upper(partNumber) partNumber
            FROM eyefidb.mrf_det 
            WHERE mrf_id IN ($inIds)
        ";
        $queryDetails = $db->prepare($qryDetails);
        $queryDetails->execute();
        $lineDetails = $queryDetails->fetchAll(PDO::FETCH_ASSOC);


        foreach ($lineDetails as $row) {
            $items[] = trim($row['partNumber']);
        }

        $in  = str_repeat('?,', count($items) - 1) . '?';

        $qadDetails = "
            SELECT CAST(a.ld_loc AS CHAR(25)) ld_loc
                , upper(a.ld_part) ld_part
                , cast(a.ld_qty_oh as numeric(36,0)) ld_qty_oh
                , a.ld_qty_all ld_qty_all
                , a.ld_qty_oh-a.ld_qty_all availableQty
                , a.ld_lot
                , a.ld_ref
            FROM ld_det a
            WHERE a.ld_part IN ($in)
                AND a.ld_domain = 'EYE'
                AND a.ld_qty_oh > 0 
                AND a.ld_loc NOT IN ('INTGRTD', 'JIAXING', 'QACOMP')
            WITH (noLock)
        ";
        $queryQADDetails = $dbQad->prepare($qadDetails);
        $queryQADDetails->execute($items);
        $locationDetails = $queryQADDetails->fetchAll(PDO::FETCH_ASSOC);

        $qadDetails = "
            SELECT upper(pt_part) pt_part
                , pt_desc1
            FROM pt_mstr
            WHERE pt_domain = 'EYE'
                AND pt_part IN ($in)
            GROUP BY pt_part
                , pt_desc1
            WITH (noLock)
        ";
        $queryQADDetails = $dbQad->prepare($qadDetails);
        $queryQADDetails->execute($items);
        $desc = $queryQADDetails->fetchAll(PDO::FETCH_ASSOC);

        foreach ($results as &$row) {

            //count the total count from each from row
            $row['shortFound'] = 0;

            foreach ($lineDetails as $row1) {

                //only pull information if the header matches the detail id
                if ($row['id'] == $row1['mrf_id']) {
                    $row1['totalAvail'] = 0;
                    $row1['itemDescription'] = "";
                    $row1['COMMENTS'] = false;
                    $row1['COMMENTSMAX'] = '';
                    $row1['COMMENTSCLASS'] = "";

                    foreach ($desc as $rowDesc) {
                        if ($rowDesc['PT_PART'] == $row1['partNumber']) {
                            $row1['itemDescription'] = $rowDesc['pt_desc1'];
                        }
                    }

                    foreach ($locationDetails as &$row2) {

                        $row1['shortDetail'] = true;

                        //only pull information if it matches part number
                        if ($row2['LD_PART'] == $row1['partNumber']) {

                            $row1['totalAvail'] = $row2['AVAILABLEQTY'] + $row1['totalAvail'];
                            $row['shortFound'] = $row1['openQty'] + $row['shortFound'];

                            // only display locations if there is open qty for picking
                            if ($row1['openQty'] > 0) {
                                $row1['locations'][] = $row2;
                            }

                            //display if we have inventory
                            if ($row1['openQty'] < $row2['AVAILABLEQTY']) {
                                $row1['shortDetail'] = false;
                            }
                        }
                    }
                    $row['details'][] = $row1;
                }
            }
        }
    }
    
    echo $db_connect->json_encode(array('result' => $results, 'items' => $items, 'locationDetails' => $locationDetails));

} catch (PDOException $e) {
    http_response_code(500);
    die($e->getMessage());
}