<?php

namespace EyefiDb\Api\Graphics;

use PDO;
use PDOException;

class GraphicsDemands
{
    protected $db;
    protected $db1;

    public function __construct($db, $dbQad)
    {
        $this->db = $dbQad;  // QAD database for ps_mstr
        $this->db1 = $db;    // EyeFi database
    }

    public function getBomHierarchyForPart($partNumber)
    {
        try {
            $query = "
                SELECT
                    ps_par as parent_part,
                    ps_comp as component_part,
                    ps_qty_per as quantity_per,
                    ps_end as end_date
                FROM ps_mstr
                WHERE ps_domain = 'EYE'
                    AND ps_par = :partNumber
                    AND ps_end IS NULL
                ORDER BY ps_comp
                WITH (NOLOCK)
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            http_response_code(500);
            die('Error getting BOM hierarchy: ' . $e->getMessage());
        }
    }

    public function getBomHierarchyForMultipleParts($partNumbers)
    {
        if (empty($partNumbers)) {
            return [];
        }

        try {
            // Ensure we have a proper array and remove any empty values
            $partNumbers = array_filter(array_values($partNumbers));

            if (empty($partNumbers)) {
                return [];
            }

            // Create named placeholders instead of positional ones
            $placeholders = [];
            $params = [];

            for ($i = 0; $i < count($partNumbers); $i++) {
                if (isset($partNumbers[$i]) && !empty($partNumbers[$i])) {
                    $placeholders[] = ":part$i";
                    $params[":part$i"] = $partNumbers[$i];
                }
            }

            if (empty($placeholders)) {
                return [];
            }

            $placeholderString = implode(',', $placeholders);

            $query = "
                SELECT
                    ps_par as parent_part,
                    ps_comp as component_part,
                    ps_qty_per as quantity_per,
                    ps_end as end_date,
                    ps_start as start_date,
                    SUBSTRING(ps_ref, 1, 50) as reference,
                    ps_scrp_pct as scrap_percent,
                    ps_op as operation,
                    ps_item_no as item_number,
                    ps_mandatory as mandatory,
                    ps_exclusive as exclusive_flag,
                    SUBSTRING(ps_rmks, 1, 100) as remarks,
                    ps_fcst_pct as forecast_percent,
                    ps_default as default_flag,
                    ps_group as group_code,
                    ps_critical as critical,
                    ps_userid as last_user,
                    ps_mod_date as mod_date,
                    ps_start_ecn as start_ecn,
                    ps_end_ecn as end_ecn,
                    ps_comp_um as component_um,
                    ps_um_conv as um_conversion
                FROM ps_mstr
                WHERE ps_domain = 'EYE'
                    AND ps_par IN ($placeholderString)
                    AND ps_end IS NULL
                ORDER BY ps_par, ps_comp
                WITH (NOLOCK)
            ";

            $stmt = $this->db->prepare($query);

            // Bind each parameter individually
            foreach ($params as $param => $value) {
                $stmt->bindValue($param, $value, PDO::PARAM_STR);
            }

            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            http_response_code(500);
            die('Error getting BOM hierarchy for multiple parts: ' . $e->getMessage());
        }
    }

    public function getFullBomHierarchy($partNumber, $maxLevels = 5)
    {
        $allBoms = [];
        $currentLevel = [$partNumber];
        $level = 1;

        while (!empty($currentLevel) && $level <= $maxLevels) {
            $levelBoms = $this->getBomHierarchyForMultipleParts($currentLevel);

            if (empty($levelBoms)) {
                break;
            }

            foreach ($levelBoms as &$bom) {
                $bom['level'] = $level;
                $bom['root_parent'] = $partNumber;
            }

            $allBoms = array_merge($allBoms, $levelBoms);

            // Get components for next level
            $currentLevel = array_unique(array_column($levelBoms, 'component_part'));
            $level++;
        }

        return $allBoms;
    }

    public function getSalesOrderParts($dateTo, $salesOrderNumber = null)
    {
        try {
            $query = "
                SELECT DISTINCT
                    a.sod_part as part_number,
                    a.sod_nbr as sales_order,
                    a.sod_line as line_number,
                    a.sod_qty_ord - a.sod_qty_ship as open_quantity,
                    a.sod_due_date as due_date
                FROM sod_det a
                LEFT JOIN so_mstr b ON b.so_nbr = a.sod_nbr AND b.so_domain = 'EYE'
                WHERE a.sod_domain = 'EYE'
                    AND a.sod_qty_ord != a.sod_qty_ship
                    AND a.sod_due_date <= :dateTo
                    AND b.so_compl_date IS NULL";

            // Add sales order filter if provided
            if ($salesOrderNumber) {
                $query .= " AND a.sod_nbr = :salesOrderNumber";
            }

            $query .= " ORDER BY a.sod_due_date ASC
                WITH (NOLOCK)";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);

            if ($salesOrderNumber) {
                $stmt->bindParam(':salesOrderNumber', $salesOrderNumber, PDO::PARAM_STR);
            }

            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            http_response_code(500);
            die('Error getting sales order parts: ' . $e->getMessage());
        }
    }

    public function getGraphicsParts($partNumbers, $showOnlyGraphics = false)
    {
        if (empty($partNumbers)) {
            return [];
        }

        try {
            // Ensure we have a proper array and remove any empty values
            $partNumbers = array_filter(array_values($partNumbers));

            if (empty($partNumbers)) {
                return [];
            }

            // Create named placeholders instead of positional ones
            $placeholders = [];
            $params = [];

            for ($i = 0; $i < count($partNumbers); $i++) {
                if (isset($partNumbers[$i]) && !empty($partNumbers[$i])) {
                    $placeholders[] = ":part$i";
                    $params[":part$i"] = $partNumbers[$i];
                }
            }

            if (empty($placeholders)) {
                return [];
            }

            $placeholderString = implode(',', $placeholders);

            // Build dynamic WHERE condition based on graphics filter
            $whereCondition = "pt_domain = 'EYE' AND pt_part IN ($placeholderString)";

            if ($showOnlyGraphics) {
                // Only show graphics parts (pt_prod_line = '014')
                $whereCondition .= " AND pt_prod_line = '014'";
            }
            // If not filtering for graphics only, show ALL parts (no additional filter)

            $query = "
                SELECT
                    pt_part as part_number,
                    pt_desc1 as description,
                    pt_desc2 as description2,
                    pt_pm_code as pm_code,
                    pt_prod_line as product_line,
                    pt_bom_code as bom_code,
                    pt_phantom as phantom,
                    pt_part_type as part_type,
                    pt_status as status,
                    pt_abc as abc_class,
                    pt_draw as drawing,
                    pt_group as part_group,
                    pt_buyer as buyer,
                    pt_vend as vendor,
                    pt_routing as routing,
                    pt_rev as revision,
                    pt_site as site,
                    pt_added as date_added,
                    pt_mod_date as date_modified,
                    pt_userid as last_user,
                    CASE
                        WHEN pt_prod_line = '014' THEN 'YES'
                        ELSE 'NO'
                    END as is_graphics_prod_line,
                    CASE
                        WHEN pt_status = 'A' THEN 'Active'
                        WHEN pt_status = 'I' THEN 'Inactive'
                        WHEN pt_status = 'P' THEN 'Planned'
                        WHEN pt_status = 'O' THEN 'Obsolete'
                        ELSE pt_status
                    END as status_description,
                    CASE
                        WHEN pt_routing IS NULL OR pt_routing = '' THEN 'NO_ROUTING'
                        ELSE pt_routing
                    END as routing_status
                FROM pt_mstr
                WHERE $whereCondition
                WITH (NOLOCK)
            ";

            $stmt = $this->db->prepare($query);

            // Bind each parameter individually
            foreach ($params as $param => $value) {
                $stmt->bindValue($param, $value, PDO::PARAM_STR);
            }

            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            http_response_code(500);
            die('Error getting graphics parts: ' . $e->getMessage());
        }
    }

    public function getMiscInfoBySalesOrderNumbers($in)
    {
        try {
            $comments = "
                SELECT *
                FROM eyefidb.workOrderOwner a
                WHERE a.so IN ($in)
            ";
            $query = $this->db1->prepare($comments);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die('Error getting work order owner info: ' . $e->getMessage());
        }
    }

    public function updateMisc($data)
    {
        try {
            $qry = "
                UPDATE eyefidb.workOrderOwner
                SET userName = :userName
                    , fs_install = :fs_install
                    , lastModDate = :lastModDate
                    , lastModUser = :lastModUser
                    , fs_install_date = :fs_install_date
                    , arrivalDate = :arrivalDate
                    , shipViaAccount = :shipViaAccount
                    , source_inspection_required = :source_inspection_required
                    , source_inspection_completed = :source_inspection_completed
                    , source_inspection_waived = :source_inspection_waived
                    , pallet_count = :pallet_count
                    , container = :container
                    , container_due_date = :container_due_date
                    , tj_po_number = :tj_po_number
                    , tj_due_date = :tj_due_date
                    , last_mod_info = :last_mod_info
                    , g2e_comments = :g2e_comments
                    , shortages_review = :shortages_review
                    , recoveryDate = :recoveryDate
                    , lateReasonCode = :lateReasonCode
                WHERE so = :so
            ";
            $query = $this->db1->prepare($qry);
            $query->bindParam(":userName", $data['userName'], PDO::PARAM_STR);
            $query->bindParam(":so", $data['so'], PDO::PARAM_STR);
            $query->bindParam(":fs_install", $data['fs_install'], PDO::PARAM_STR);
            $query->bindParam(":lastModDate", $data['lastModDate'], PDO::PARAM_STR);
            $query->bindParam(":lastModUser", $data['lastModUser'], PDO::PARAM_INT);
            $query->bindParam(":fs_install_date", $data['fs_install_date'], PDO::PARAM_STR);
            $query->bindParam(":arrivalDate", $data['arrivalDate'], PDO::PARAM_STR);
            $query->bindParam(":shipViaAccount", $data['shipViaAccount'], PDO::PARAM_STR);
            $query->bindParam(":source_inspection_required", $data['source_inspection_required'], PDO::PARAM_STR);
            $query->bindParam(":source_inspection_completed", $data['source_inspection_completed'], PDO::PARAM_STR);
            $query->bindParam(":source_inspection_waived", $data['source_inspection_waived'], PDO::PARAM_STR);
            $query->bindParam(":container", $data['container'], PDO::PARAM_STR);
            $query->bindParam(":container_due_date", $data['container_due_date'], PDO::PARAM_STR);
            $query->bindParam(":pallet_count", $data['pallet_count'], PDO::PARAM_STR);
            $query->bindParam(":tj_po_number", $data['tj_po_number'], PDO::PARAM_STR);
            $query->bindParam(":tj_due_date", $data['tj_due_date'], PDO::PARAM_STR);
            $query->bindParam(":last_mod_info", $data['last_mod_info'], PDO::PARAM_STR);
            $query->bindParam(":g2e_comments", $data['g2e_comments'], PDO::PARAM_STR);
            $query->bindParam(":shortages_review", $data['shortages_review'], PDO::PARAM_STR);
            $query->bindParam(":recoveryDate", $data['recoveryDate'], PDO::PARAM_STR);
            $query->bindParam(":lateReasonCode", $data['lateReasonCode'], PDO::PARAM_STR);
            $query->execute();
        } catch (PDOException $e) {
            http_response_code(500);
            die('Error updating work order owner: ' . $e->getMessage());
        }
    }

    public function insertMisc($data)
    {
        try {
            $qry = "
                INSERT INTO eyefidb.workOrderOwner (so, userName, fs_install, lastModDate, lastModUser)
                VALUES (:so, :userName, :fs_install, :lastModDate, :lastModUser)
                ON DUPLICATE KEY UPDATE
                    userName = VALUES(userName),
                    fs_install = VALUES(fs_install),
                    lastModDate = VALUES(lastModDate),
                    lastModUser = VALUES(lastModUser)
            ";
            $query = $this->db1->prepare($qry);
            $query->bindParam(":so", $data['so'], PDO::PARAM_STR);
            $query->bindParam(":userName", $data['userName'], PDO::PARAM_STR);
            $query->bindParam(":fs_install", $data['fs_install'], PDO::PARAM_STR);
            $query->bindParam(":lastModDate", $data['lastModDate'], PDO::PARAM_STR);
            $query->bindParam(":lastModUser", $data['lastModUser'], PDO::PARAM_INT);
            $query->execute();
        } catch (PDOException $e) {
            http_response_code(500);
            die('Error inserting work order owner: ' . $e->getMessage());
        }
    }

    public function getGraphicsDemandStatusInfo()
    {
        $qry = "
            SELECT a.so 
                , a.line
                , a.id
                , a.part
                , a.uniqueId
                , a.poNumber
                , a.active
                , case when a.woNumber != '' THEN c.graphicsWorkOrder else b.graphicsWorkOrder END graphicsWorkOrderNumber
                , b.graphicsSalesOrder
                , case when a.woNumber != '' THEN c.status ELSE b.status END graphicsStatus
                , b.graphicsWorkOrder
                , concat(usr.first, ' ', usr.last) createdBy
                , woNumber
            FROM eyefidb.graphicsDemand a
            LEFT JOIN (
                SELECT a.poNumber
                    , a.poLine 
                    , a.graphicsWorkOrderNumber graphicsWorkOrder
                    , a.partNumber
                    , c.name status
                    , b.graphicsSalesOrder 
                FROM eyefidb.graphicsWorkOrderCreation a
                left join eyefidb.graphicsSchedule b ON b.graphicsWorkOrder = a.graphicsWorkOrderNumber
                LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = b.status
                WHERE a.active = 1
            ) b ON b.poNumber = a.poNumber 
                AND b.partNumber = a.part
            LEFT JOIN (
                SELECT a.graphicsWorkOrder
                    , c.name status 
                FROM eyefidb.graphicsSchedule a
                LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = a.status
                WHERE a.active = 1
            ) c ON c.graphicsWorkOrder = a.woNumber 
            left join db.users usr ON usr.id = a.createdBy
        ";
        $query = $this->db1->prepare($qry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getGraphicsDemandReport($daysOut = 300, $maxBomLevels = 5, $showOnlyLevel = null, $salesOrderNumber = null, $showOnlyGraphics = false)
    {
        // Calculate target date
        $targetDate = date('Y-m-d', strtotime("+{$daysOut} days"));

        // Get sales order parts
        $salesOrderParts = $this->getSalesOrderParts($targetDate, $salesOrderNumber);

        if (empty($salesOrderParts)) {
            return [];
        }

        // Get all unique SO part numbers for batch processing
        $allSoPartNumbers = array_unique(array_column($salesOrderParts, 'part_number'));

        // Get routing information for SO parts for debug purposes only
        $routingInfo = $this->getPartRoutingInfo($allSoPartNumbers);

        // Don't filter by routing - process ALL SO parts like the original code
        $allBomData = [];
        $processedParts = [];
        $currentLevelParts = $allSoPartNumbers; // Use ALL SO parts, not just those with routing

        // Collect all BOM data without routing restrictions
        for ($level = 1; $level <= $maxBomLevels; $level++) {
            if (empty($currentLevelParts)) {
                break;
            }

            $currentLevelParts = array_diff($currentLevelParts, $processedParts);

            if (empty($currentLevelParts)) {
                break;
            }

            $levelBomData = $this->getBomHierarchyForMultipleParts($currentLevelParts);

            if (empty($levelBomData)) {
                break;
            }

            $processedParts = array_merge($processedParts, $currentLevelParts);
            $allBomData = array_merge($allBomData, $levelBomData);

            $currentLevelParts = array_unique(array_column($levelBomData, 'component_part'));
        }

        // Get all unique parts for graphics lookup
        $allParts = $allSoPartNumbers;
        foreach ($allBomData as $bomItem) {
            $allParts[] = $bomItem['component_part'];
        }
        $allParts = array_unique($allParts);

        // ALWAYS get ALL parts data first - don't filter at query level
        $graphicsPartsData = $this->getGraphicsParts($allParts, false); // Always get all parts first

        // Get ALL part descriptions (not just graphics)
        $allPartsData = $this->getAllPartsInfo($allParts);

        // Create lookup arrays - Apply graphics filtering HERE instead of at query level
        $graphicsPartsLookup = [];
        foreach ($graphicsPartsData as $part) {
            // Store ALL parts in the graphics lookup for now
            $graphicsPartsLookup[$part['part_number']] = $part;
        }

        $allPartsLookup = [];
        foreach ($allPartsData as $part) {
            $allPartsLookup[$part['part_number']] = $part;
        }

        $result = [];
        $debugInfo = []; // Add debugging information

        // Process each sales order part
        foreach ($salesOrderParts as $soPart) {
            $soPartNumber = $soPart['part_number'];

            // Add debug info for SO part including routing information
            $debugInfo[$soPartNumber] = [
                'found_in_so' => true,
                'sales_order' => $soPart['sales_order'],
                'line_number' => $soPart['line_number'],
                'is_graphics_part' => isset($allPartsLookup[$soPartNumber]) && $allPartsLookup[$soPartNumber]['product_line'] === '014',
                'bom_root_found' => false,
                'bom_variations_tried' => [],
                'found_in_bom_as_parent' => false,
                'found_in_bom_as_component' => false,
                'bom_path_source' => 'none',
                'routing_info' => $routingInfo[$soPartNumber] ?? null,
                'has_routing' => isset($routingInfo[$soPartNumber]) && !empty($routingInfo[$soPartNumber]['routing']),
                'excluded_from_bom_no_routing' => false, // Never exclude based on routing
                'part_prod_line' => isset($allPartsLookup[$soPartNumber]) ? $allPartsLookup[$soPartNumber]['product_line'] : 'UNKNOWN'
            ];

            // Check if SO part itself is a graphics part (Level 0)
            if (($showOnlyLevel === null || $showOnlyLevel === 0)) {
                // Get the SO part's product line from allPartsLookup (which has complete data)
                $soPartProdLine = isset($allPartsLookup[$soPartNumber]) ? $allPartsLookup[$soPartNumber]['product_line'] : '';
                $isGraphicsPart = ($soPartProdLine === '014');

                // Debug: Add logging to see what's happening
                $debugInfo[$soPartNumber]['so_part_prod_line'] = $soPartProdLine;
                $debugInfo[$soPartNumber]['is_graphics_check'] = $isGraphicsPart;
                $debugInfo[$soPartNumber]['show_only_graphics'] = $showOnlyGraphics;

                // Apply graphics filter for SO parts
                $includeSoPart = true;
                if ($showOnlyGraphics && !$isGraphicsPart) {
                    $includeSoPart = false; // Skip non-graphics SO parts when filtering for graphics only
                    $debugInfo[$soPartNumber]['excluded_so_not_graphics'] = true;
                } else {
                    $debugInfo[$soPartNumber]['excluded_so_not_graphics'] = false;
                }

                if ($includeSoPart) {
                    // Check if this SO part is also a parent in BOM
                    $soIsParent = $this->isComponentAlsoParent($soPartNumber, $allBomData);
                    $debugInfo[$soPartNumber]['found_in_bom_as_parent'] = $soIsParent;

                    $result[] = [
                        'sales_order' => $soPart['sales_order'],
                        'line_number' => $soPart['line_number'],
                        'so_part' => $soPartNumber,
                        'due_date' => $soPart['due_date'],
                        'open_quantity' => $soPart['open_quantity'],
                        'item_part' => $soPartNumber, // The SO part is the item
                        'item_description' => isset($allPartsLookup[$soPartNumber]) ? $allPartsLookup[$soPartNumber]['description'] : '',
                        'item_status' => isset($allPartsLookup[$soPartNumber]) ? $allPartsLookup[$soPartNumber]['status'] : '',
                        'graphics_part' => $isGraphicsPart ? $soPartNumber : null, // Only if it's a graphics part
                        'graphics_description' => $isGraphicsPart ? ($allPartsLookup[$soPartNumber]['description'] ?? '') : '',
                        'graphics_description2' => $isGraphicsPart ? ($allPartsLookup[$soPartNumber]['description2'] ?? '') : '',
                        'part_type' => $isGraphicsPart ? ($allPartsLookup[$soPartNumber]['part_type'] ?? '') : '',
                        'status' => $isGraphicsPart ? ($allPartsLookup[$soPartNumber]['status'] ?? '') : '',
                        'pm_code' => $isGraphicsPart ? ($allPartsLookup[$soPartNumber]['pm_code'] ?? '') : '',
                        'bom_code' => $isGraphicsPart ? ($allPartsLookup[$soPartNumber]['bom_code'] ?? '') : '',
                        'buyer' => $isGraphicsPart ? ($allPartsLookup[$soPartNumber]['buyer'] ?? '') : '',
                        'revision' => $isGraphicsPart ? ($allPartsLookup[$soPartNumber]['revision'] ?? '') : '',
                        'qty_needed' => $soPart['open_quantity'],
                        'qty_per' => 1,
                        'bom_level' => 0,
                        'bom_level_hierarchical' => 'Parent',
                        'is_parent_part' => true,
                        'has_components' => $soIsParent,
                        'parent_component' => 'SO Part',
                        'bom_path' => $soPartNumber,
                        'debug_source' => 'SO_PART_DIRECT_' . ($isGraphicsPart ? 'GRAPHICS' : 'NON_GRAPHICS'),
                        'id' => $soPart['sales_order'] . '-' . $soPart['line_number'] . '-' . $soPartNumber, // For root, bom_path is just the part number
                        'unique_id_legacy' => $soPart['sales_order'] . '-' . $soPart['line_number'] . '-' . $soPartNumber . '-SO', // Legacy format for compatibility
                        'details' => $allPartsLookup[$soPartNumber] ?? [], // Add details here
                    ];
                }
            }

            // Process BOM components for ALL parts, not just those with routing
            // Try multiple BOM starting points: SO part itself AND its BOM code if it exists
            $bomStartParts = [$soPartNumber];

            // Add BOM code as alternative starting point if it exists
            if (isset($routingInfo[$soPartNumber]['bom_code']) && !empty($routingInfo[$soPartNumber]['bom_code'])) {
                $bomCode = $routingInfo[$soPartNumber]['bom_code'];
                if ($bomCode !== $soPartNumber) { // Don't duplicate if BOM code is same as part number
                    $bomStartParts[] = $bomCode;
                }
            }

            $allBomComponents = [];
            $debugInfo[$soPartNumber]['bom_variations_tried'] = $bomStartParts;

            // Try each potential BOM starting point
            foreach ($bomStartParts as $bomStartPart) {
                $bomComponents = $this->getBomComponentsForPart($bomStartPart, $allBomData, $maxBomLevels, 1, 1, [], $bomStartPart);

                if (!empty($bomComponents)) {
                    $allBomComponents = array_merge($allBomComponents, $bomComponents);
                    $debugInfo[$soPartNumber]['bom_start_part_used'] = $bomStartPart;
                    break; // Use the first one that returns results
                }
            }

            $debugInfo[$soPartNumber]['bom_root_found'] = !empty($allBomComponents);
            $debugInfo[$soPartNumber]['bom_roots'] = $bomStartParts;
            $debugInfo[$soPartNumber]['bom_path_source'] = 'ALL_PARTS_PROCESSED';

            foreach ($allBomComponents as $bomComponent) {
                $componentPart = $bomComponent['component_part'];

                // Add debug info for component parts
                if (!isset($debugInfo[$componentPart])) {
                    $debugInfo[$componentPart] = [
                        'found_in_so' => false,
                        'is_graphics_part' => isset($allPartsLookup[$componentPart]) && $allPartsLookup[$componentPart]['product_line'] === '014',
                        'found_in_bom_as_component' => true,
                        'bom_parent' => $bomComponent['parent_component'],
                        'bom_level' => $bomComponent['level'],
                        'source_so_part' => $soPartNumber,
                        'bom_paths' => []
                    ];
                }

                // Track all BOM paths for this component
                $debugInfo[$componentPart]['bom_paths'][] = [
                    'path' => $bomComponent['bom_path'],
                    'level' => $bomComponent['level'],
                    'parent' => $bomComponent['parent_component'],
                    'qty' => $bomComponent['cumulative_qty']
                ];

                // Skip if we're filtering to a specific level and this isn't it
                if ($showOnlyLevel !== null && $bomComponent['level'] !== $showOnlyLevel) {
                    continue;
                }

                // Check if this component is a graphics part using allPartsLookup
                $componentProdLine = isset($allPartsLookup[$componentPart]) ? $allPartsLookup[$componentPart]['product_line'] : '';
                $isGraphicsPart = ($componentProdLine === '014');

                // Debug: Add logging for BOM components
                $debugInfo[$componentPart]['component_prod_line'] = $componentProdLine;
                $debugInfo[$componentPart]['is_graphics_check'] = $isGraphicsPart;

                // Apply graphics filter for BOM components
                if ($showOnlyGraphics && !$isGraphicsPart) {
                    $debugInfo[$componentPart]['excluded_bom_not_graphics'] = true;
                    continue; // Skip non-graphics components when filtering for graphics only
                } else {
                    $debugInfo[$componentPart]['excluded_bom_not_graphics'] = false;
                }

                // Calculate final quantity needed (SO quantity * cumulative BOM quantity)
                $qtyNeeded = $soPart['open_quantity'] * $bomComponent['cumulative_qty'];

                // Get component data and merge with BOM data for details
                $componentData = $allPartsLookup[$componentPart] ?? [];
                $bomDetails = [
                    'bom_reference' => $bomComponent['bom_reference'] ?? '',
                    'bom_operation' => $bomComponent['bom_operation'] ?? '',
                    'bom_mandatory' => $bomComponent['bom_mandatory'] ?? '',
                    'bom_remarks' => $bomComponent['bom_remarks'] ?? '',
                    'bom_start_date' => $bomComponent['bom_start_date'] ?? '',
                    'bom_end_date' => $bomComponent['bom_end_date'] ?? '',
                    'bom_last_user' => $bomComponent['bom_last_user'] ?? '',
                    'bom_mod_date' => $bomComponent['mod_date'] ?? ''
                ];
                $details = array_merge($componentData, $bomDetails);

                $result[] = [
                    'sales_order' => $soPart['sales_order'],
                    'line_number' => $soPart['line_number'],
                    'so_part' => $soPartNumber,
                    'due_date' => $soPart['due_date'],
                    'open_quantity' => $soPart['open_quantity'],
                    'item_part' => $componentPart, // The actual BOM item
                    'item_description' => isset($allPartsLookup[$componentPart]) ? $allPartsLookup[$componentPart]['description'] : '',
                    'item_status' => isset($allPartsLookup[$componentPart]) ? $allPartsLookup[$componentPart]['status'] : '',
                    'graphics_part' => $isGraphicsPart ? $componentPart : null, // Only if it's a graphics part
                    'graphics_description' => $isGraphicsPart ? ($allPartsLookup[$componentPart]['description'] ?? '') : '',
                    'graphics_description2' => $isGraphicsPart ? ($allPartsLookup[$componentPart]['description2'] ?? '') : '',
                    'part_type' => $isGraphicsPart ? ($allPartsLookup[$componentPart]['part_type'] ?? '') : '',
                    'status' => $isGraphicsPart ? ($allPartsLookup[$componentPart]['status'] ?? '') : '',
                    'pm_code' => $isGraphicsPart ? ($allPartsLookup[$componentPart]['pm_code'] ?? '') : '',
                    'bom_code' => $isGraphicsPart ? ($allPartsLookup[$componentPart]['bom_code'] ?? '') : '',
                    'buyer' => $isGraphicsPart ? ($allPartsLookup[$componentPart]['buyer'] ?? '') : '',
                    'revision' => $isGraphicsPart ? ($allPartsLookup[$componentPart]['revision'] ?? '') : '',
                    'qty_needed' => $qtyNeeded,
                    'qty_per' => $bomComponent['qty_per'],
                    'bom_level' => $bomComponent['level'],
                    'bom_level_hierarchical' => $bomComponent['bom_level_hierarchical'],
                    'is_parent_part' => false,
                    'has_components' => $bomComponent['is_also_parent'],
                    'parent_component' => $bomComponent['parent_component'],
                    'bom_path' => $bomComponent['bom_path'], // This now contains the full path from the recursive function
                    'path_depth' => $bomComponent['path_depth'],
                    'bom_reference' => $bomComponent['bom_reference'] ?? '',
                    'bom_operation' => $bomComponent['bom_operation'] ?? '',
                    'bom_mandatory' => $bomComponent['bom_mandatory'] ?? '',
                    'bom_remarks' => $bomComponent['bom_remarks'] ?? '',
                    'debug_source' => 'BOM_COMPONENT_LEVEL_' . $bomComponent['level'] . '_' . ($isGraphicsPart ? 'GRAPHICS' : 'NON_GRAPHICS'),
                    'details' => $details, // Add merged details here
                    'id' => $soPart['sales_order'] . '-' . $soPart['line_number'] . '-' . $bomComponent['bom_path'],
                    'unique_id_legacy' => $soPart['sales_order'] . '-' . $soPart['line_number'] . '-' . $componentPart . '-' . $bomComponent['parent_component'], // Legacy format for compatibility
                ];
            }
        }

        // Add special debug info to results INCLUDING when graphics_only filter is active
        if (isset($_GET['debug']) && $_GET['debug'] == '1') {
            $result['DEBUG_INFO'] = $debugInfo;
            $result['ALL_BOM_DATA_COUNT'] = count($allBomData);
            $result['GRAPHICS_PARTS_COUNT'] = count($graphicsPartsData);
            $result['SO_PARTS_COUNT'] = count($salesOrderParts);
            $result['SHOW_ONLY_GRAPHICS'] = $showOnlyGraphics;
            $result['GRAPHICS_PARTS_LOOKUP_COUNT'] = count($graphicsPartsLookup);
            $result['ALL_PARTS_LOOKUP_COUNT'] = count($allPartsLookup);
            $result['ALL_PARTS_LOOKUP'] = $allPartsLookup;
            $result['RESULT_COUNT_BEFORE_RETURN'] = count($result) - 7; // Subtract debug entries
        }

        // Use a proper method to integrate work order and status info like the original
        return $this->integrateWorkOrderAndStatusInfo($result);
    }

    private function integrateWorkOrderAndStatusInfo($result)
    {
        if (empty($result)) {
            return $result;
        }

        // Create ID array for work order lookup using LEGACY format for compatibility
        $in_array = [];
        foreach ($result as $row) {
            if (isset($row['unique_id_legacy'])) {
                $in_array[] = $row['unique_id_legacy'];
            }
        }

        if (empty($in_array)) {
            return $result;
        }

        $in = "'" . implode("','", $in_array) . "'";
        $misc_info = $this->getMiscInfoBySalesOrderNumbers($in);
        $statusInfo = $this->getGraphicsDemandStatusInfo();

        $processedResult = [];
        
        // Process each result row using LEGACY ID for lookups
        foreach ($result as $key => $row) {
            // Skip debug entries
            if (is_string($key) && (strpos($key, 'DEBUG') !== false || in_array($key, [
                'ALL_BOM_DATA_COUNT', 'GRAPHICS_PARTS_COUNT', 'SO_PARTS_COUNT',
                'SHOW_ONLY_GRAPHICS', 'GRAPHICS_PARTS_LOOKUP_COUNT', 'ALL_PARTS_LOOKUP_COUNT',
                'ALL_PARTS_LOOKUP', 'RESULT_COUNT_BEFORE_RETURN'
            ]))) {
                $processedResult[$key] = $row;
                continue;
            }

            if (isset($row['unique_id_legacy'])) {
                // Keep the new BOM path-based ID as primary, but use legacy for lookups
                $row['misc'] = new \stdClass(); // Initialize as empty object
                
                // Initialize graphics status fields like original
                $row['checked'] = 'Not Ordered';
                $row['graphicsStatus'] = "";
                $row['graphicsWorkOrderNumber'] = "";
                $row['graphicsSalesOrder'] = "";
                $row['poEnteredBy'] = "";
                $row['woNumber'] = "";

                // Match work order info using LEGACY ID format
                foreach ($misc_info as $misc_info_row) {
                    if ($row['unique_id_legacy'] == $misc_info_row['so']) {
                        $row['misc'] = $misc_info_row;
                        break;
                    }
                }
                
                // Match graphics demand status info using LEGACY ID format
                foreach ($statusInfo as $status_row) {
                    if (isset($status_row['uniqueId']) && $status_row['uniqueId'] == $row['unique_id_legacy']) {
                        $row['checked'] = $status_row['active'] == 1 ? 'Ordered' : 'Not Ordered';
                        $row['checkedId'] = $status_row['id'] ?? '';
                        $row['poNumber'] = $status_row['poNumber'] ?? '';
                        $row['poEnteredBy'] = $status_row['createdBy'] ?? '';
                        $row['woNumber'] = $status_row['woNumber'] ?? '';
                        $row['graphicsStatus'] = $status_row['graphicsStatus'] ?? '';
                        $row['graphicsWorkOrderNumber'] = $status_row['graphicsWorkOrderNumber'] ?? '';
                        $row['graphicsSalesOrder'] = $status_row['graphicsSalesOrder'] ?? '';
                        break;
                    }
                }

                // Add work order info to details as well
                if (isset($row['details'])) {
                    $row['details']['work_order_info'] = $row['misc'];
                    $row['details']['graphics_status_info'] = [
                        'checked' => $row['checked'],
                        'graphicsStatus' => $row['graphicsStatus'],
                        'graphicsWorkOrderNumber' => $row['graphicsWorkOrderNumber'],
                        'graphicsSalesOrder' => $row['graphicsSalesOrder'],
                        'poEnteredBy' => $row['poEnteredBy'],
                        'woNumber' => $row['woNumber']
                    ];
                }
            }
            
            $processedResult[] = $row;
        }

        return $processedResult;
    }

    public function getBomAndPartInfoByPart($partNumber, $maxBomLevels = 5, $showOnlyGraphics = false)
    {
        // Get the part's routing info to check for BOM code, just like the original does
        $partRoutingInfo = $this->getPartRoutingInfo([$partNumber]);
        
        // Use BOM code if it exists and is different from the part number (like original logic)
        $bomStartPart = $partNumber;
        if (isset($partRoutingInfo[$partNumber]['bom_code']) && 
            !empty($partRoutingInfo[$partNumber]['bom_code']) && 
            $partRoutingInfo[$partNumber]['bom_code'] !== $partNumber) {
            $bomStartPart = $partRoutingInfo[$partNumber]['bom_code'];
        }

        // Use the BOM start part for BOM hierarchy collection
        $allBomData = [];
        $processedParts = [];
        $currentLevelParts = [$bomStartPart]; // Use BOM code if available

        // Collect all BOM data using the same method as getGraphicsDemandReport
        for ($level = 1; $level <= $maxBomLevels; $level++) {
            if (empty($currentLevelParts)) {
                break;
            }

            $currentLevelParts = array_diff($currentLevelParts, $processedParts);

            if (empty($currentLevelParts)) {
                break;
            }

            $levelBomData = $this->getBomHierarchyForMultipleParts($currentLevelParts);

            if (empty($levelBomData)) {
                break;
            }

            $processedParts = array_merge($processedParts, $currentLevelParts);
            $allBomData = array_merge($allBomData, $levelBomData);

            $currentLevelParts = array_unique(array_column($levelBomData, 'component_part'));
        }

        // Collect all unique parts (original part, BOM start part, and all components)
        $allParts = [$partNumber, $bomStartPart];
        foreach ($allBomData as $bomItem) {
            $allParts[] = $bomItem['component_part'];
        }
        $allParts = array_unique($allParts);

        // Get part info
        $allPartsData = $this->getAllPartsInfo($allParts);
        $allPartsLookup = [];
        foreach ($allPartsData as $part) {
            $allPartsLookup[$part['part_number']] = $part;
        }

        $result = [];
        
        // Add the root part as level 0 (always use the original part number for display)
        $rootPartData = $allPartsLookup[$partNumber] ?? [];
        $isGraphicsPart = isset($rootPartData['product_line']) && $rootPartData['product_line'] === '014';
        if (!$showOnlyGraphics || $isGraphicsPart) {
            $result[] = [
                'so_part' => $partNumber,
                'item_part' => $partNumber,
                'item_description' => $rootPartData['description'] ?? '',
                'item_status' => $rootPartData['status'] ?? '',
                'graphics_part' => $isGraphicsPart ? $partNumber : null,
                'graphics_description' => $isGraphicsPart ? ($rootPartData['description'] ?? '') : '',
                'graphics_description2' => $isGraphicsPart ? ($rootPartData['description2'] ?? '') : '',
                'part_type' => $isGraphicsPart ? ($rootPartData['part_type'] ?? '') : '',
                'status' => $isGraphicsPart ? ($rootPartData['status'] ?? '') : '',
                'pm_code' => $isGraphicsPart ? ($rootPartData['pm_code'] ?? '') : '',
                'bom_code' => $isGraphicsPart ? ($rootPartData['bom_code'] ?? '') : '',
                'buyer' => $isGraphicsPart ? ($rootPartData['buyer'] ?? '') : '',
                'revision' => $isGraphicsPart ? ($rootPartData['revision'] ?? '') : '',
                'qty_needed' => 1,
                'qty_per' => 1,
                'bom_level' => 0,
                'bom_level_hierarchical' => 'Parent',
                'is_parent_part' => true,
                'has_components' => !empty($allBomData),
                'parent_component' => 'SO Part',
                'bom_path' => $partNumber,
                'debug_source' => 'PART_SEARCH_ROOT_' . ($isGraphicsPart ? 'GRAPHICS' : 'NON_GRAPHICS') . 
                    ($bomStartPart !== $partNumber ? '_USING_BOM_CODE_' . $bomStartPart : ''),
                'details' => $rootPartData
            ];
        }

        // Now use the recursive function to get all BOM components with proper hierarchy
        // Use the BOM start part for the hierarchy traversal
        $allBomComponents = $this->getBomComponentsForPart($bomStartPart, $allBomData, $maxBomLevels, 1, 1, [], $bomStartPart);

        // Add BOM components using the recursive results
        foreach ($allBomComponents as $bomComponent) {
            $componentPart = $bomComponent['component_part'];
            $componentData = $allPartsLookup[$componentPart] ?? [];
            $isGraphicsComponent = isset($componentData['product_line']) && $componentData['product_line'] === '014';
            
            if ($showOnlyGraphics && !$isGraphicsComponent) {
                continue;
            }
            
            // Merge all BOM fields and part details into 'details'
            $details = array_merge($bomComponent, $componentData);

            $result[] = [
                'so_part' => $partNumber,
                'item_part' => $componentPart,
                'item_description' => $componentData['description'] ?? '',
                'item_status' => $componentData['status'] ?? '',
                'graphics_part' => $isGraphicsComponent ? $componentPart : null,
                'graphics_description' => $isGraphicsComponent ? ($componentData['description'] ?? '') : '',
                'graphics_description2' => $isGraphicsComponent ? ($componentData['description2'] ?? '') : '',
                'part_type' => $isGraphicsComponent ? ($componentData['part_type'] ?? '') : '',
                'status' => $isGraphicsComponent ? ($componentData['status'] ?? '') : '',
                'pm_code' => $isGraphicsComponent ? ($componentData['pm_code'] ?? '') : '',
                'bom_code' => $isGraphicsComponent ? ($componentData['bom_code'] ?? '') : '',
                'buyer' => $isGraphicsComponent ? ($componentData['buyer'] ?? '') : '',
                'revision' => $isGraphicsComponent ? ($componentData['revision'] ?? '') : '',
                'qty_needed' => $bomComponent['cumulative_qty'], // Use cumulative quantity
                'qty_per' => $bomComponent['qty_per'],
                'bom_level' => $bomComponent['level'],
                'bom_level_hierarchical' => $bomComponent['bom_level_hierarchical'],
                'is_parent_part' => false,
                'has_components' => $bomComponent['is_also_parent'],
                'parent_component' => $bomComponent['parent_component'],
                'bom_path' => $bomComponent['bom_path'], // Use the full hierarchical path from recursive function
                'path_depth' => $bomComponent['path_depth'],
                'bom_reference' => $bomComponent['bom_reference'] ?? '',
                'bom_operation' => $bomComponent['bom_operation'] ?? '',
                'bom_mandatory' => $bomComponent['bom_mandatory'] ?? '',
                'bom_remarks' => $bomComponent['bom_remarks'] ?? '',
                'debug_source' => 'PART_SEARCH_BOM_' . ($isGraphicsComponent ? 'GRAPHICS' : 'NON_GRAPHICS'),
                'details' => $details,
                'id' => $partNumber . '-' . $componentPart, // Add ID field for components
                'unique_id_legacy' => $partNumber . '-' . $bomComponent['parent_component'] . '-'. $componentPart, // Legacy format for part search
            ];
        }

        return $result;
    }

    private function getBomComponentsForPart($partNumber, $allBomData, $maxLevels, $currentLevel = 1, $cumulativeQty = 1, $path = [], $parentComponent = null)
    {
        $components = [];

        if ($currentLevel > $maxLevels || in_array($partNumber, $path)) {
            return $components; // Prevent infinite loops
        }

        $path[] = $partNumber;

        foreach ($allBomData as $bomItem) {
            if ($bomItem['parent_part'] == $partNumber) {
                $componentPart = $bomItem['component_part'];

                // Check for circular references in the current path
                if (in_array($componentPart, $path)) {
                    continue; // Skip this component to avoid circular reference
                }

                $componentQty = $bomItem['quantity_per']; // Direct quantity per
                $totalQty = $cumulativeQty * $componentQty; // Total cumulative quantity

                // Check if this component is also a parent of other items
                $isAlsoParent = $this->isComponentAlsoParent($componentPart, $allBomData);

                // Build the complete BOM path including the component
                $fullBomPath = implode(' > ', array_merge($path, [$componentPart]));

                $component = [
                    'component_part' => $componentPart,
                    'parent_component' => $bomItem['parent_part'], // Use the immediate parent from BOM data
                    'qty_per' => $componentQty,
                    'cumulative_qty' => $totalQty,
                    'level' => $currentLevel,
                    'bom_level_hierarchical' => str_repeat('.', $currentLevel) . $currentLevel,
                    'is_also_parent' => $isAlsoParent,
                    'bom_path' => $fullBomPath, // Full hierarchical path from root to this component
                    'bom_reference' => $bomItem['reference'] ?? '',
                    'bom_operation' => $bomItem['operation'] ?? '',
                    'bom_mandatory' => $bomItem['mandatory'] ?? '',
                    'bom_remarks' => $bomItem['remarks'] ?? '',
                    'bom_start_date' => $bomItem['start_date'] ?? '',
                    'bom_end_date' => $bomItem['end_date'] ?? '',
                    'bom_last_user' => $bomItem['last_user'] ?? '',
                    'bom_mod_date' => $bomItem['mod_date'] ?? '',
                    'path_depth' => count($path) + 1
                ];

                $components[] = $component;

                // Recursively get components of this component with the new cumulative quantity
                $subComponents = $this->getBomComponentsForPart(
                    $componentPart,
                    $allBomData,
                    $maxLevels,
                    $currentLevel + 1,
                    $totalQty, // Pass the cumulative quantity
                    $path, // Pass the current path so sub-components get full hierarchy
                    $componentPart // Pass this component as parent for next level
                );

                $components = array_merge($components, $subComponents);
            }
        }

        return $components;
    }

    private function isComponentAlsoParent($componentPart, $allBomData)
    {
        foreach ($allBomData as $bomItem) {
            if ($bomItem['parent_part'] == $componentPart) {
                return true;
            }
        }
        return false;
    }

    private function getPartRoutingInfo($partNumbers)
    {
        if (empty($partNumbers)) {
            return [];
        }

        try {
            // Ensure we have a proper array and remove any empty values
            $partNumbers = array_filter(array_values($partNumbers));

            if (empty($partNumbers)) {
                return [];
            }

            // Create named placeholders
            $placeholders = [];
            $params = [];

            for ($i = 0; $i < count($partNumbers); $i++) {
                if (isset($partNumbers[$i]) && !empty($partNumbers[$i])) {
                    $placeholders[] = ":part$i";
                    $params[":part$i"] = $partNumbers[$i];
                }
            }

            if (empty($placeholders)) {
                return [];
            }

            $placeholderString = implode(',', $placeholders);

            $query = "
                SELECT
                    pt_part as part_number,
                    pt_routing as routing,
                    pt_bom_code as bom_code,
                    pt_prod_line as product_line,
                    pt_status as status
                FROM pt_mstr
                WHERE pt_domain = 'EYE'
                    AND pt_part IN ($placeholderString)
                WITH (NOLOCK)
            ";

            $stmt = $this->db->prepare($query);

            // Bind each parameter individually
            foreach ($params as $param => $value) {
                $stmt->bindValue($param, $value, PDO::PARAM_STR);
            }

            $stmt->execute();

            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Convert to lookup array
            $routingLookup = [];
            foreach ($results as $result) {
                $routingLookup[$result['part_number']] = $result;
            }

            return $routingLookup;

        } catch (PDOException $e) {
            // Return empty array on error, don't halt execution
            return [];
        }
    }

    private function getAllPartsInfo($partNumbers)
    {
        if (empty($partNumbers)) {
            return [];
        }

        try {
            // Ensure we have a proper array and remove any empty values
            $partNumbers = array_filter(array_values($partNumbers));

            if (empty($partNumbers)) {
                return [];
            }

            // Create named placeholders
            $placeholders = [];
            $params = [];

            for ($i = 0; $i < count($partNumbers); $i++) {
                if (isset($partNumbers[$i]) && !empty($partNumbers[$i])) {
                    $placeholders[] = ":part$i";
                    $params[":part$i"] = $partNumbers[$i];
                }
            }

            if (empty($placeholders)) {
                return [];
            }

            $placeholderString = implode(',', $placeholders);

            $query = "
                SELECT
                    pt_part as part_number,
                    pt_desc1 as description,
                    pt_desc2 as description2,
                    pt_um,
                    pt__qad13,
                    pt__qad12,
                    pt_draw,
                    pt_prod_line as product_line,
                    pt_group,
                    pt_part_type as part_type,
                    pt_status as status,
                    pt_abc,
                    pt_iss_pol,
                    pt_phantom,
                    pt_loc,
                    pt__qad01,
                    pt__qad02,
                    pt_abc_amt,
                    pt__qad03,
                    pt__qad04,
                    pt_avg_int,
                    pt__qad05,
                    pt_cyc_int,
                    pt__qad06,
                    pt__qad07,
                    pt__qad08,
                    pt_ms,
                    pt_plan_ord,
                    pt_mrp,
                    pt_ord_pol,
                    pt_ord_qty,
                    pt_ord_per,
                    pt_sfty_stk,
                    pt_sfty_time,
                    pt_rop,
                    pt_buyer,
                    pt_vend,
                    pt__qad09,
                    pt_pm_code,
                    pt_mfg_lead,
                    pt_pur_lead,
                    pt_insp_rqd,
                    pt_insp_lead,
                    pt_cum_lead,
                    pt_ord_min,
                    pt_ord_max,
                    pt_ord_mult,
                    pt_yield_pct,
                    pt__qad16,
                    pt_setup,
                    pt_setup_ll,
                    pt_run_ll,
                    pt_run,
                    pt_price,
                    pt_xmtl_tl,
                    pt_xlbr_tl,
                    pt_xbdn_tl,
                    pt_xsub_tl,
                    pt_xmtl_ll,
                    pt_xlbr_ll,
                    pt_xbdn_ll,
                    pt_xsub_ll,
                    pt_xtot_cur,
                    pt_cur_date,
                    pt_xmtl_stdtl,
                    pt_xlbr_stdtl,
                    pt_xbdn_stdtl,
                    pt_xsub_stdtl,
                    pt_xtot_std,
                    pt_std_date,
                    pt_ll_code,
                    pt_abc_qty,
                    pt__qad10,
                    pt__qad11,
                    pt_routing,
                    pt_lot_ser,
                    pt_timefence,
                    pt_xmtl_stdll,
                    pt_xlbr_stdll,
                    pt_xbdn_stdll,
                    pt_xsub_stdll,
                    pt_rev as revision,
                    pt_last_eco,
                    pt__qad15,
                    pt__qad17,
                    pt_qc_lead,
                    pt_auto_lot,
                    pt_assay,
                    pt_batch,
                    pt__qad14,
                    pt_user3,
                    pt_user1,
                    pt_user2,
                    pt_net_wt,
                    pt_net_wt_um,
                    pt_size,
                    pt_size_um,
                    pt_taxable,
                    pt_taxc,
                    pt_rollup,
                    pt_xovh_ll,
                    pt_xovh_tl,
                    pt_xovh_stdll,
                    pt_xovh_stdtl,
                    pt_site,
                    pt_shelflife,
                    pt_critical,
                    pt_sngl_lot,
                    pt_upc,
                    pt_hazard,
                    pt_added as date_added,
                    pt__chr01,
                    pt__chr02,
                    pt__chr03,
                    pt__chr04,
                    pt__chr05,
                    pt__chr06,
                    pt__chr07,
                    pt__chr08,
                    pt__chr09,
                    pt__chr10,
                    pt__dte01,
                    pt__dte02,
                    pt__dec01,
                    pt__dec02,
                    pt__log01,
                    pt__log02,
                    pt__qad18,
                    pt__qad21,
                    pt__qad19,
                    pt__qad20,
                    pt_length,
                    pt_height,
                    pt_width,
                    pt_dim_um,
                    pt_pkg_code,
                    pt_network,
                    pt_fr_class,
                    pt_spec_hdlg,
                    pt_bom_code,
                    pt_loc_type,
                    pt_transtype,
                    pt_warr_cd,
                    pt_pvm_days,
                    pt_isb,
                    pt_mttr,
                    pt_mtbf,
                    pt_svc_type,
                    pt_svc_group,
                    pt_ven_warr,
                    pt_fru,
                    pt_mfg_mttr,
                    pt_mfg_mtbf,
                    pt_sttr,
                    pt_origin,
                    pt_tariff,
                    pt_sys_type,
                    pt_inst_call,
                    pt_cover,
                    pt_unit_isb,
                    pt_article,
                    pt_ll_drp,
                    pt_po_site,
                    pt_ship_wt,
                    pt_ship_wt_um,
                    pt_userid as last_user,
                    pt_mod_date as date_modified,
                    pt__qad26,
                    pt_comm_code,
                    pt__qad22,
                    pt_dea,
                    pt_formula,
                    pt__qad23,
                    pt__qad24,
                    pt__qad25,
                    pt_obs_date,
                    pt_pvm_bom,
                    pt_pvm_route,
                    pt_pvm_um,
                    pt_rp_bom,
                    pt_rp_route,
                    pt_rp_vendor,
                    pt_rctpo_status,
                    pt_rollup_id,
                    pt_spec_grav,
                    pt_joint_type,
                    pt_mfg_pct,
                    pt_pur_pct,
                    pt_drp_pct,
                    pt_pou_code,
                    pt_wks_avg,
                    pt_wks_max,
                    pt_wks_min,
                    pt_pick_logic,
                    pt_fiscal_class,
                    pt_dsgn_grp,
                    pt_drwg_loc,
                    pt_ecn_rev,
                    pt_drwg_size,
                    pt_model,
                    pt_repairable,
                    pt_rctwo_status,
                    pt_rctpo_active,
                    pt_lot_grp,
                    pt_rctwo_active,
                    pt_break_cat,
                    pt_fsc_code,
                    pt_trace_active,
                    pt_trace_detail,
                    pt_pm_mrp,
                    pt_ins_call_type,
                    pt_ins_bom,
                    pt_ins_route,
                    pt_promo,
                    pt_meter_interval,
                    pt_meter_um,
                    pt_wh,
                    pt_btb_type,
                    pt_cfg_type,
                    pt_app_owner,
                    pt_op_yield,
                    pt_run_seq1,
                    pt_run_seq2,
                    pt_atp_enforcement,
                    pt_atp_family,
                    pt_domain,
                    oid_pt_mstr,
                    pt_classification,
                    pt_memo_type,
                    pt_um_group,
                    pt_opc_threshold,
                    pt_pop_code,
                    pt_whse_part_type,
                    pt_issue_method,
                    pt_rep_type,
                    pt_same_days,
                    pt_invent_days,
                    pt_crit_days,
                    pt_shelf_offset,
                    pt_single_trans,
                    pt_print_id,
                    pt_id_qty,
                    pt_insp_req,
                    pt__qad27,
                    pt_sample_pct,
                    pt_insp_freq,
                    pt_destructive,
                    pt_insp_days,
                    pt_barcode1,
                    pt_barcode2,
                    pt_insp_ref,
                    pt_random_insp_pct,
                    pt_atp_horizon,
                    pt_gcfg_type,
                    pt_replenishment_mthd,
                    pt_gtin_barcode1,
                    pt_gtin_barcode2,
                    pt_fiscal_type,
                    pt_service_code,
                    pt_freight_nature,
                    pt_trade_class,
                    pt_serialized,
                    pt_sample_qty,
                    pt_sourcetype,
                    pt_nve1_code,
                    pt_nve2_code,
                    pt_nve3_code,
                    pt_nve4_code,
                    pt_nve5_code,
                    pt_nve6_code,
                    pt_nve7_code,
                    pt_nve8_code,
                    pt_cest_code,
                    pt_enforce_cert,
                    pt_relev_scale,
                    pt_service_type,
                    pt_xml_group,
                    pt_anp_code,
                    pt_pk_ord,
                    pt_pk_ord_ascend,
                    pt_pick_pol,
                    pt_all_pol,
                    pt_xfer_all_pol,
                    pt_picklist_ord_mult,
                    pt_picklist_ord_max,
                    pt_picklist_ord_min,
                    pt_comp_iss_pol,
                    pt_po_buyer,
                    pt_plan_pos_var,
                    pt_plan_neg_var,
                    pt_ship_pos_var,
                    pt_ship_neg_var,
                    pt_schedule_type,
                    pt_smoothing_rule,
                    pt_avg_period,
                    pt_period_type,
                    pt_anp_desc,
                    pt_relevant_scale
                FROM pt_mstr
                WHERE pt_domain = 'EYE'
                    AND pt_part IN ($placeholderString)
                WITH (NOLOCK)
            ";

            $stmt = $this->db->prepare($query);

            // Bind each parameter individually
            foreach ($params as $param => $value) {
                $stmt->bindValue($param, $value, PDO::PARAM_STR);
            }

            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            // Return empty array on error, don't halt execution
            return [];
        }
    }

    private function buildBomPathForPart($rootPart, $targetPart, $bomData)
    {
        // Build a lookup for parent-child relationships
        $parentLookup = [];
        foreach ($bomData as $bom) {
            $parentLookup[$bom['component_part']] = $bom['parent_part'];
        }

        // Build path from target part back to root
        $path = [$targetPart];
        $currentPart = $targetPart;

        while (isset($parentLookup[$currentPart]) && $parentLookup[$currentPart] !== $rootPart) {
            $currentPart = $parentLookup[$currentPart];
            array_unshift($path, $currentPart);
        }

        // Add the root part at the beginning
        array_unshift($path, $rootPart);

        return implode(' > ', $path);
    }
}

// Initialize and run - ADD THIS SECTION
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$data = new GraphicsDemands($db, $dbQad);

// Get URL parameters for BOM level control
$daysOut = isset($_GET['days']) ? (int)$_GET['days'] : 300;
$maxBomLevels = isset($_GET['max_levels']) ? (int)$_GET['max_levels'] : 5;
$showOnlyLevel = isset($_GET['level']) ? (int)$_GET['level'] : null;
$salesOrderNumber = isset($_GET['so']) ? $_GET['so'] : null;
$showOnlyGraphics = isset($_GET['graphics_only']) && $_GET['graphics_only'] == '1';
// Add a parameter to control output structure: flat (default) or nested
$nested = isset($_GET['nested']) && ($_GET['nested'] === '1' || $_GET['nested'] === 'true');
// Add part search parameter
$searchPartNumber = isset($_GET['part']) ? trim($_GET['part']) : null;

if ($searchPartNumber) {
    // Search by part number only, not by sales order
    $results = $data->getBomAndPartInfoByPart($searchPartNumber, $maxBomLevels, $showOnlyGraphics);
} else {
    $results = $data->getGraphicsDemandReport($daysOut, $maxBomLevels, $showOnlyLevel, $salesOrderNumber, $showOnlyGraphics);
}

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

if ($nested) {
    // Only keep rows with 'item_part' and 'parent_component' keys for tree building
    $flatRows = array_filter($results, function($row) {
        return isset($row['item_part']) && isset($row['parent_component']);
    });
    // Re-index for tree builder
    $flatRows = array_values($flatRows);
    echo json_encode(buildBomTree($flatRows));
} else {
    echo json_encode($results);
}

// Add a function to convert flat BOM to nested tree structure
function buildBomTree(array $flatRows): array {
    // Assign an index to each row for reference
    foreach ($flatRows as $i => &$row) {
        $row['children'] = [];
        $row['_idx'] = $i;
    }
    unset($row);

    // Build a map of all nodes by their index
    $nodes = $flatRows;
    $tree = [];

    // For each node, find its parent in the flat array and attach as child
    foreach ($nodes as $i => &$node) {
        $parent = $node['parent_component'] ?? null;
        if (!$parent || $parent === 'SO Part') {
            $tree[] = &$node;
        } else {
            // Find all possible parents in the flat array (could be multiple if same part number under different parents)
            $found = false;
            foreach ($nodes as $j => &$potentialParent) {
                if (
                    $potentialParent['item_part'] === $parent
                    && $potentialParent['sales_order'] === $node['sales_order']
                    && $potentialParent['line_number'] === $node['line_number']
                ) {
                    $potentialParent['children'][] = &$node;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $tree[] = &$node;
            }
        }
    }
    unset($node);

    // Remove helper index
    foreach ($tree as &$n) {
        unset($n['_idx']);
    }
    unset($n);

    return $tree;
}