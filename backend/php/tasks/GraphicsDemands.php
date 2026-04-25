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

    public function getGraphicsParts($partNumbers)
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
                WHERE pt_domain = 'EYE'
                    AND pt_part IN ($placeholderString)
                    AND (
                        pt_prod_line != '014' 
                        OR (pt_prod_line = '014' AND pt_routing IS NOT NULL AND pt_routing != '')
                    )
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

    public function getGraphicsDemandReport($daysOut = 300, $maxBomLevels = 5, $showOnlyLevel = null, $salesOrderNumber = null)
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
        
        // Get routing information for SO parts to help with BOM lookup
        $routingInfo = $this->getPartRoutingInfo($allSoPartNumbers);
        
        // Filter SO parts to only include those WITH routing for BOM processing
        $soPartsWithRouting = [];
        foreach ($allSoPartNumbers as $soPart) {
            if (isset($routingInfo[$soPart]) && !empty($routingInfo[$soPart]['routing'])) {
                $soPartsWithRouting[] = $soPart;
            }
        }
        
        // Start ONLY with SO parts that have routing - no variations, no BOM codes
        $allBomData = [];
        $processedParts = [];
        $currentLevelParts = $soPartsWithRouting;
        
        // Just collect all BOM data without level assignment
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
            
            // Store BOM data without level assignment - let recursive function handle levels
            $allBomData = array_merge($allBomData, $levelBomData);
            
            $currentLevelParts = array_unique(array_column($levelBomData, 'component_part'));
        }
        
        // Get all unique parts for graphics lookup
        $allParts = $allSoPartNumbers;
        foreach ($allBomData as $bomItem) {
            $allParts[] = $bomItem['component_part'];
        }
        $allParts = array_unique($allParts);
        
        // Get graphics parts data
        $graphicsPartsData = $this->getGraphicsParts($allParts);
        
        // Get ALL part descriptions (not just graphics)
        $allPartsData = $this->getAllPartsInfo($allParts);
        
        // Create lookup arrays
        $graphicsPartsLookup = [];
        foreach ($graphicsPartsData as $part) {
            $graphicsPartsLookup[$part['part_number']] = $part;
        }
        
        $allPartsLookup = [];
        foreach ($allPartsData as $part) {
            $allPartsLookup[$part['part_number']] = $part;
        }
        
        $result = [];
        $seenComponents = []; // Track seen components to avoid duplicates
        $debugInfo = []; // Add debugging information
        
        // Process each sales order part
        foreach ($salesOrderParts as $soPart) {
            $soPartNumber = $soPart['part_number'];
            
            // Add debug info for SO part including routing information
            $debugInfo[$soPartNumber] = [
                'found_in_so' => true,
                'sales_order' => $soPart['sales_order'],
                'line_number' => $soPart['line_number'],
                'is_graphics_part' => isset($graphicsPartsLookup[$soPartNumber]),
                'bom_root_found' => false,
                'bom_variations_tried' => [],
                'found_in_bom_as_parent' => false,
                'found_in_bom_as_component' => false,
                'bom_path_source' => 'none',
                'routing_info' => $routingInfo[$soPartNumber] ?? null,
                'has_routing' => isset($routingInfo[$soPartNumber]) && !empty($routingInfo[$soPartNumber]['routing']),
                'excluded_from_bom_no_routing' => !isset($routingInfo[$soPartNumber]) || empty($routingInfo[$soPartNumber]['routing'])
            ];
            
            // Check if SO part itself is a graphics part (Level 0)
            if (($showOnlyLevel === null || $showOnlyLevel === 0) && isset($graphicsPartsLookup[$soPartNumber])) {
                // Check if this SO part is also a parent in BOM
                $soIsParent = $this->isComponentAlsoParent($soPartNumber, $allBomData);
                $debugInfo[$soPartNumber]['found_in_bom_as_parent'] = $soIsParent;
                
                // Create unique key for SO part
                $uniqueKey = $soPart['sales_order'] . '-' . $soPart['line_number'] . '-' . $soPartNumber . '-SO';
                
                if (!isset($seenComponents[$uniqueKey])) {
                    $seenComponents[$uniqueKey] = true;
                    
                    $result[] = [
                        'sales_order' => $soPart['sales_order'],
                        'line_number' => $soPart['line_number'],
                        'so_part' => $soPartNumber,
                        'due_date' => $soPart['due_date'],
                        'open_quantity' => $soPart['open_quantity'],
                        'item_part' => $soPartNumber, // The SO part is the item
                        'item_description' => isset($allPartsLookup[$soPartNumber]) ? $allPartsLookup[$soPartNumber]['description'] : $graphicsPartsLookup[$soPartNumber]['description'],
                        'graphics_part' => $soPartNumber, // And also the graphics part
                        'graphics_description' => $graphicsPartsLookup[$soPartNumber]['description'],
                        'graphics_description2' => $graphicsPartsLookup[$soPartNumber]['description2'] ?? '',
                        'part_type' => $graphicsPartsLookup[$soPartNumber]['part_type'] ?? '',
                        'status' => $graphicsPartsLookup[$soPartNumber]['status'] ?? '',
                        'pm_code' => $graphicsPartsLookup[$soPartNumber]['pm_code'],
                        'bom_code' => $graphicsPartsLookup[$soPartNumber]['bom_code'] ?? '',
                        'buyer' => $graphicsPartsLookup[$soPartNumber]['buyer'] ?? '',
                        'revision' => $graphicsPartsLookup[$soPartNumber]['revision'] ?? '',
                        'qty_needed' => $soPart['open_quantity'],
                        'qty_per' => 1,
                        'bom_level' => 0,
                        'bom_level_hierarchical' => 'Parent',
                        'is_parent_part' => true,
                        'has_components' => $soIsParent,
                        'parent_component' => 'SO Part',
                        'bom_path' => $soPartNumber,
                        'debug_source' => 'SO_PART_DIRECT'
                    ];
                }
            }
            
            // Only process BOM components if the SO part has routing
            if (isset($routingInfo[$soPartNumber]) && !empty($routingInfo[$soPartNumber]['routing'])) {
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
                $debugInfo[$soPartNumber]['bom_path_source'] = 'SO_PART_AND_BOM_CODE';
                
                foreach ($allBomComponents as $bomComponent) {
                    $componentPart = $bomComponent['component_part'];
                    
                    // Add debug info for component parts
                    if (!isset($debugInfo[$componentPart])) {
                        $debugInfo[$componentPart] = [
                            'found_in_so' => false,
                            'is_graphics_part' => isset($graphicsPartsLookup[$componentPart]),
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
                    
                    // Create unique key for ALL BOM components (not just graphics parts)
                    $uniqueKey = $soPart['sales_order'] . '-' . $soPart['line_number'] . '-' . $componentPart;
                    
                    if (!isset($seenComponents[$uniqueKey])) {
                        $seenComponents[$uniqueKey] = true;
                        
                        // Calculate final quantity needed (SO quantity * cumulative BOM quantity)
                        $qtyNeeded = $soPart['open_quantity'] * $bomComponent['cumulative_qty'];
                        
                        // Check if this component is a graphics part
                        $isGraphicsPart = isset($graphicsPartsLookup[$componentPart]);
                        
                        $result[] = [
                            'sales_order' => $soPart['sales_order'],
                            'line_number' => $soPart['line_number'],
                            'so_part' => $soPartNumber,
                            'due_date' => $soPart['due_date'],
                            'open_quantity' => $soPart['open_quantity'],
                            'item_part' => $componentPart, // The actual BOM item
                            'item_description' => isset($allPartsLookup[$componentPart]) ? $allPartsLookup[$componentPart]['description'] : '',
                            'graphics_part' => $isGraphicsPart ? $componentPart : null, // Only if it's a graphics part
                            'graphics_description' => $isGraphicsPart ? $graphicsPartsLookup[$componentPart]['description'] : '',
                            'graphics_description2' => $isGraphicsPart ? ($graphicsPartsLookup[$componentPart]['description2'] ?? '') : '',
                            'part_type' => $isGraphicsPart ? ($graphicsPartsLookup[$componentPart]['part_type'] ?? '') : '',
                            'status' => $isGraphicsPart ? ($graphicsPartsLookup[$componentPart]['status'] ?? '') : '',
                            'pm_code' => $isGraphicsPart ? $graphicsPartsLookup[$componentPart]['pm_code'] : '',
                            'bom_code' => $isGraphicsPart ? ($graphicsPartsLookup[$componentPart]['bom_code'] ?? '') : '',
                            'buyer' => $isGraphicsPart ? ($graphicsPartsLookup[$componentPart]['buyer'] ?? '') : '',
                            'revision' => $isGraphicsPart ? ($graphicsPartsLookup[$componentPart]['revision'] ?? '') : '',
                            'qty_needed' => $qtyNeeded,
                            'qty_per' => $bomComponent['qty_per'],
                            'bom_level' => $bomComponent['level'],
                            'bom_level_hierarchical' => $bomComponent['bom_level_hierarchical'],
                            'is_parent_part' => false,
                            'has_components' => $bomComponent['is_also_parent'],
                            'parent_component' => $bomComponent['parent_component'],
                            'bom_path' => $bomComponent['bom_path'],
                            'path_depth' => $bomComponent['path_depth'],
                            'bom_reference' => $bomComponent['bom_reference'] ?? '',
                            'bom_operation' => $bomComponent['bom_operation'] ?? '',
                            'bom_mandatory' => $bomComponent['bom_mandatory'] ?? '',
                            'bom_remarks' => $bomComponent['bom_remarks'] ?? '',
                            'debug_source' => 'BOM_COMPONENT_LEVEL_' . $bomComponent['level'] . '_' . ($isGraphicsPart ? 'GRAPHICS' : 'NON_GRAPHICS')
                        ];
                    }
                }
            } else {
                // Mark that this SO part was excluded from BOM processing due to no routing
                $debugInfo[$soPartNumber]['bom_path_source'] = 'EXCLUDED_NO_ROUTING';
                $debugInfo[$soPartNumber]['bom_start_part_used'] = 'N/A - No Routing';
            }
        }
        
        // Enhanced debugging for ART-03505-110
        $specialDebug = [];
        $targetPart = 'ART-03505-110';
        
        // Check if ART-03505-110 is in sales orders
        foreach ($salesOrderParts as $soPart) {
            if ($soPart['part_number'] === $targetPart) {
                $specialDebug['found_in_sales_order'] = true;
                $specialDebug['so_details'] = $soPart;
            }
        }
        
        // Check if ART-03505-110 is in graphics parts lookup
        if (isset($graphicsPartsLookup[$targetPart])) {
            $specialDebug['found_in_graphics_lookup'] = true;
            $specialDebug['graphics_details'] = $graphicsPartsLookup[$targetPart];
        }
        
        // Check routing information for ART-03505-110
        if (isset($routingInfo[$targetPart])) {
            $specialDebug['routing_details'] = $routingInfo[$targetPart];
        }
        
        // Check if ART-03505-110 appears in BOM data
        foreach ($allBomData as $bomItem) {
            if ($bomItem['parent_part'] === $targetPart || $bomItem['component_part'] === $targetPart) {
                if (!isset($specialDebug['bom_relationships'])) {
                    $specialDebug['bom_relationships'] = [];
                }
                $specialDebug['bom_relationships'][] = [
                    'parent' => $bomItem['parent_part'],
                    'component' => $bomItem['component_part'],
                    'qty_per' => $bomItem['quantity_per'],
                    'relationship' => $bomItem['component_part'] === $targetPart ? 'IS_COMPONENT' : 'IS_PARENT'
                ];
            }
        }
        
        // Add special debug info to results
        if (isset($_GET['debug']) && $_GET['debug'] == '1') {
            $result['DEBUG_INFO'] = $debugInfo;
            $result['ALL_BOM_DATA_COUNT'] = count($allBomData);
            $result['GRAPHICS_PARTS_COUNT'] = count($graphicsPartsData);
            $result['SO_PARTS_COUNT'] = count($salesOrderParts);
            $result['ALL_BOM_DATA_SAMPLE'] = array_slice($allBomData, 0, 10);
            $result['GRAPHICS_PARTS_SAMPLE'] = array_slice($graphicsPartsData, 0, 10);
            $result['CURRENT_LEVEL_PARTS'] = $currentLevelParts ?? [];
            $result['BOM_ROOT_PARTS'] = [];
            $result['ALL_SO_PART_NUMBERS'] = $allSoPartNumbers;
            $result['ALL_PARTS_SEARCHED'] = array_slice($allParts, 0, 20);
            $result['BOM_VARIATIONS_ADDED'] = [];
            $result['ROUTING_INFO'] = $routingInfo;
            $result['SO_PARTS_WITH_ROUTING'] = $soPartsWithRouting;
            $result['SO_PARTS_WITHOUT_ROUTING'] = array_diff($allSoPartNumbers, $soPartsWithRouting);
            
            // Add specific BOM relationship debugging
            $result['BOM_RELATIONSHIPS'] = [];
            foreach ($allBomData as $bomItem) {
                $result['BOM_RELATIONSHIPS'][] = [
                    'parent' => $bomItem['parent_part'],
                    'component' => $bomItem['component_part'],
                    'qty_per' => $bomItem['quantity_per']
                ];
            }
            
            // Add debugging for VWL-03505-310 specifically
            $result['VWL_BOM_ANALYSIS'] = [];
            foreach ($allBomData as $bomItem) {
                if (strpos($bomItem['parent_part'], 'VWL-03505-310') !== false || 
                    strpos($bomItem['component_part'], 'VWL-03505-310') !== false) {
                    $result['VWL_BOM_ANALYSIS'][] = [
                        'parent' => $bomItem['parent_part'],
                        'component' => $bomItem['component_part'],
                        'qty_per' => $bomItem['quantity_per'],
                        'start_date' => $bomItem['start_date'] ?? '',
                        'end_date' => $bomItem['end_date'] ?? '',
                        'mod_date' => $bomItem['mod_date'] ?? ''
                    ];
                }
            }
            
            // Add debugging for items that shouldn't be there
            $result['UNEXPECTED_ITEMS'] = [];
            $result['INCORRECT_BOM_ITEMS'] = [];
            foreach ($result as $resultItem) {
                if (isset($resultItem['item_part'])) {
                    // Check for WLD-03505-180 (mentioned as not in ERP)
                    if ($resultItem['item_part'] === 'WLD-03505-180') {
                        $result['UNEXPECTED_ITEMS'][] = [
                            'item' => $resultItem['item_part'],
                            'parent' => $resultItem['parent_component'],
                            'level' => $resultItem['bom_level'],
                            'source' => $resultItem['debug_source']
                        ];
                    }
                    
                    // Check for WLD-03505-190 (Side Support Right - not in your ERP BOM)
                    if ($resultItem['item_part'] === 'WLD-03505-190') {
                        $result['INCORRECT_BOM_ITEMS'][] = [
                            'item' => $resultItem['item_part'],
                            'description' => $resultItem['item_description'],
                            'parent' => $resultItem['parent_component'],
                            'level' => $resultItem['bom_level'],
                            'qty' => $resultItem['qty_needed'],
                            'source' => $resultItem['debug_source'],
                            'bom_path' => $resultItem['bom_path']
                        ];
                    }
                }
            }
        }
        
        return $result;
    }

    public function convertToTable($results)
    {
        // Extract debug info if present
        $debugInfo = null;
        $specialDebug = null;
        $allBomDataCount = 0;
        $graphicsPartsCount = 0;
        $soPartsCount = 0;
        $bomDataSample = [];
        $graphicsPartsSample = [];
        $currentLevelParts = [];
        $bomRootParts = [];
        
        if (isset($results['DEBUG_INFO'])) {
            $debugInfo = $results['DEBUG_INFO'];
            $allBomDataCount = $results['ALL_BOM_DATA_COUNT'] ?? 0;
            $graphicsPartsCount = $results['GRAPHICS_PARTS_COUNT'] ?? 0;
            $soPartsCount = $results['SO_PARTS_COUNT'] ?? 0;
            $bomDataSample = $results['ALL_BOM_DATA_SAMPLE'] ?? [];
            $graphicsPartsSample = $results['GRAPHICS_PARTS_SAMPLE'] ?? [];
            $currentLevelParts = $results['CURRENT_LEVEL_PARTS'] ?? [];
            $bomRootParts = $results['BOM_ROOT_PARTS'] ?? [];
            
            unset($results['DEBUG_INFO']);
            unset($results['ALL_BOM_DATA_COUNT']);
            unset($results['GRAPHICS_PARTS_COUNT']);
            unset($results['SO_PARTS_COUNT']);
            unset($results['ALL_BOM_DATA_SAMPLE']);
            unset($results['GRAPHICS_PARTS_SAMPLE']);
            unset($results['CURRENT_LEVEL_PARTS']);
            unset($results['BOM_ROOT_PARTS']);
            
            // Extract special debug info
            if (isset($results['ART_03505_110_SPECIAL_DEBUG'])) {
                $specialDebug = $results['ART_03505_110_SPECIAL_DEBUG'];
            }
            
            unset($results['ART_03505_110_SPECIAL_DEBUG']);
        }
        
        if (empty($results)) {
            $html = '<div class="alert alert-warning">No graphics demand found for the specified criteria.</div>';
            if ($debugInfo) {
                $html .= $this->generateDebugTables($debugInfo, $allBomDataCount, $graphicsPartsCount, $soPartsCount, $bomDataSample, $graphicsPartsSample, $currentLevelParts, $bomRootParts);
            }
            return $html;
        }

        // Group results by sales order and line number, then organize by BOM hierarchy
        $groupedResults = [];
        foreach ($results as $row) {
            // Skip if this is debug info or other metadata
            if (!isset($row['sales_order']) || !isset($row['line_number']) || !isset($row['bom_level'])) {
                continue;
            }
            
            $salesOrder = $row['sales_order'];
            $lineNumber = $row['line_number'];
            $bomLevel = $row['bom_level'];
            $groupedResults[$salesOrder][$lineNumber][$bomLevel][] = $row;
        }

        // Sort each BOM level hierarchically to show proper parent-child relationships
        foreach ($groupedResults as $salesOrder => &$lines) {
            foreach ($lines as $lineNumber => &$bomLevels) {
                $bomLevels = $this->buildHierarchicalOrder($bomLevels);
            }
        }

        // Generate summary cards
        $html = $this->generateSummaryCards($results, $groupedResults);
        
        // Generate main table with improved styling
        $html .= '<div class="table-responsive">';
        $html .= '<table class="table table-striped table-bordered table-hover">';
        
        // Simplified table header with key information
        $html .= '<thead class="thead-dark"><tr>';
        $html .= '<th width="5%">Sales Order</th>';
        $html .= '<th width="3%">Line</th>';
        $html .= '<th width="8%">SO Part</th>';
        $html .= '<th width="6%">Due Date</th>';
        $html .= '<th width="4%">SO Qty</th>';
        $html .= '<th width="8%">Item</th>';
        $html .= '<th width="10%">Item Description</th>';
        $html .= '<th width="8%">Graphics Part</th>';
        $html .= '<th width="10%">Graphics Description</th>';
        $html .= '<th width="4%">PM Code</th>';
        $html .= '<th width="5%">Qty Needed</th>';
        $html .= '<th width="3%">Level</th>';
        $html .= '<th width="8%">Parent</th>';
        $html .= '<th width="8%">BOM Path</th>';
        $html .= '<th width="6%">Source</th>';
        $html .= '</tr></thead>';
        
        // Table body with improved organization
        $html .= '<tbody>';
        foreach ($groupedResults as $salesOrder => $lines) {
            $totalSoItems = 0;
            foreach ($lines as $bomLevels) {
                $totalSoItems += array_sum(array_map('count', $bomLevels));
            }
            
            // Sales order header with collapse functionality
            $html .= '<tr class="table-primary" data-bs-toggle="collapse" data-bs-target="#so_' . $salesOrder . '" style="cursor: pointer;">';
            $html .= '<td colspan="15"><strong><i class="fas fa-chevron-down"></i> Sales Order: ' . htmlspecialchars($salesOrder) . '</strong> <span class="badge bg-secondary">' . count($lines) . ' lines, ' . $totalSoItems . ' graphics items</span></td>';
            $html .= '</tr>';
            
            $html .= '<tbody id="so_' . $salesOrder . '" class="collapse show">';
            
            foreach ($lines as $lineNumber => $bomLevels) {
                $totalLineItems = array_sum(array_map('count', $bomLevels));
                
                // Line number sub-header
                $html .= '<tr class="table-info">';
                $html .= '<td colspan="15"><em>&nbsp;&nbsp;<i class="fas fa-caret-right"></i> Line ' . htmlspecialchars($lineNumber) . '</em> <span class="badge bg-info">' . $totalLineItems . ' graphics items</span></td>';
                $html .= '</tr>';
                
                // Sort BOM levels (0 = parent, 1+ = components) - hierarchy is already built
                ksort($bomLevels);
                
                foreach ($bomLevels as $level => $levelRows) {
                    foreach ($levelRows as $row) {
                        $rowClass = $level == 0 ? 'table-light' : '';
                        $levelIndicator = $level == 0 ? '<i class="fas fa-star text-warning"></i>' : str_repeat('&nbsp;&nbsp;', $level) . '<i class="fas fa-arrow-right text-muted"></i>';
                        
                        $html .= '<tr class="' . $rowClass . '">';
                        $html .= '<td>' . htmlspecialchars($row['sales_order']) . '</td>';
                        $html .= '<td>' . htmlspecialchars($row['line_number']) . '</td>';
                        $html .= '<td><span class="font-monospace">' . htmlspecialchars($row['so_part']) . '</span></td>';
                        $html .= '<td>' . date('m/d/Y', strtotime($row['due_date'])) . '</td>';
                        $html .= '<td class="text-end">' . number_format($row['open_quantity']) . '</td>';
                        $html .= '<td>' . $levelIndicator . ' <span class="font-monospace">' . htmlspecialchars($row['item_part'] ?? $row['so_part']) . '</span></td>';
                        $html .= '<td><small>' . htmlspecialchars($row['item_description'] ?? '') . '</small></td>';
                        $html .= '<td><span class="font-monospace text-success">' . htmlspecialchars($row['graphics_part'] ?? '') . '</span></td>';
                        $html .= '<td><small>' . htmlspecialchars($row['graphics_description'] ?? '') . '</small></td>';
                        $html .= '<td class="text-center">' . ($row['pm_code'] ? '<span class="badge bg-' . ($row['pm_code'] == 'M' ? 'success' : 'secondary') . '">' . htmlspecialchars($row['pm_code']) . '</span>' : '') . '</td>';
                        $html .= '<td class="text-end"><strong>' . number_format($row['qty_needed'], 2) . '</strong></td>';
                        $html .= '<td class="text-center">' . ($level == 0 ? '<span class="badge bg-warning">Parent</span>' : '<span class="badge bg-primary">L' . $level . '</span>') . '</td>';
                        $html .= '<td><span class="font-monospace text-muted">' . htmlspecialchars($row['parent_component'] ?? 'N/A') . '</span></td>';
                        $html .= '<td><small title="' . htmlspecialchars($row['bom_path'] ?? '') . '">' . htmlspecialchars(substr($row['bom_path'] ?? '', -20)) . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($row['debug_source'] ?? 'N/A') . '</small></td>';
                        $html .= '</tr>';
                    }
                }
            }
            $html .= '</tbody>';
        }
        $html .= '</tbody>';
        $html .= '</table>';
        $html .= '</div>';
        
        // Add detailed debug information if requested
        if ($debugInfo && isset($_GET['debug']) && $_GET['debug'] == '1') {
            $html .= $this->generateDebugTables($debugInfo, $allBomDataCount, $graphicsPartsCount, $soPartsCount, $bomDataSample, $graphicsPartsSample, $currentLevelParts, $bomRootParts, $specialDebug);
        }
        
        return $html;
    }

    private function generateSummaryCards($results, $groupedResults)
    {
        $totalGraphicsParts = 0;
        $totalSalesOrders = count($groupedResults);
        $totalLines = 0;
        $totalQuantityNeeded = 0;
        
        foreach ($groupedResults as $lines) {
            $totalLines += count($lines);
        }
        
        // Count only valid result rows and calculate total quantity
        foreach ($results as $result) {
            if (isset($result['qty_needed'])) {
                $totalGraphicsParts++;
                $totalQuantityNeeded += $result['qty_needed'];
            }
        }
        
        $html = '<div class="row mb-4">';
        $html .= '<div class="col-md-3"><div class="card bg-primary text-white"><div class="card-body"><h5>' . $totalSalesOrders . '</h5><p>Sales Orders</p></div></div></div>';
        $html .= '<div class="col-md-3"><div class="card bg-info text-white"><div class="card-body"><h5>' . $totalLines . '</h5><p>SO Lines</p></div></div></div>';
        $html .= '<div class="col-md-3"><div class="card bg-success text-white"><div class="card-body"><h5>' . $totalGraphicsParts . '</h5><p>Graphics Items</p></div></div></div>';
        $html .= '<div class="col-md-3"><div class="card bg-warning text-white"><div class="card-body"><h5>' . number_format($totalQuantityNeeded) . '</h5><p>Total Qty Needed</p></div></div></div>';
        $html .= '</div>';
        
        return $html;
    }

    private function generateDebugTables($debugInfo, $allBomDataCount, $graphicsPartsCount, $soPartsCount, $bomDataSample, $graphicsPartsSample, $currentLevelParts, $bomRootParts, $specialDebug = null)
    {
        $html = '<div class="mt-5">';
        $html .= '<h3><i class="fas fa-bug"></i> Debug Information</h3>';
        
        // Debug summary cards
        $html .= '<div class="row mb-3">';
        $html .= '<div class="col-md-2"><div class="card"><div class="card-body text-center"><h6>' . $soPartsCount . '</h6><small>SO Parts</small></div></div></div>';
        $html .= '<div class="col-md-2"><div class="card"><div class="card-body text-center"><h6>' . $allBomDataCount . '</h6><small>BOM Records</small></div></div></div>';
        $html .= '<div class="col-md-2"><div class="card"><div class="card-body text-center"><h6>' . $graphicsPartsCount . '</h6><small>Graphics Parts</small></div></div></div>';
        $html .= '<div class="col-md-2"><div class="card"><div class="card-body text-center"><h6>' . count($currentLevelParts) . '</h6><small>Current Level</small></div></div></div>';
        $html .= '<div class="col-md-2"><div class="card"><div class="card-body text-center"><h6>' . count($debugInfo) . '</h6><small>Debug Records</small></div></div></div>';
        $html .= '<div class="col-md-2"><div class="card"><div class="card-body text-center"><h6>0</h6><small>BOM Roots (Disabled)</small></div></div></div>';
        $html .= '</div>';
        
        // Tabbed debug sections
        $html .= '<ul class="nav nav-tabs" role="tablist">';
        $html .= '<li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#debug-parts">Part Analysis</a></li>';
        $html .= '<li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#debug-bom">BOM Sample</a></li>';
        $html .= '<li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#debug-graphics">Graphics Sample</a></li>';
        $html .= '<li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#debug-specific">ART-03505-110 Analysis</a></li>';
        $html .= '<li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#debug-bom-structure">BOM Structure</a></li>';
        $html .= '</ul>';
        
        $html .= '<div class="tab-content mt-3">';
        
        // Part Analysis Tab
        $html .= '<div id="debug-parts" class="tab-pane active">';
        $html .= '<div class="table-responsive">';
        $html .= '<table class="table table-sm table-bordered">';
        $html .= '<thead class="table-dark"><tr>';
        $html .= '<th>Part Number</th><th>Found in SO</th><th>Is Graphics</th><th>Has Routing</th><th>Routing</th><th>BOM Excluded</th><th>BOM Root</th><th>Multiple Paths</th><th>Path Count</th><th>As Parent</th><th>As Component</th><th>Source</th><th>Start Part Used</th>';
        $html .= '</tr></thead><tbody>';
        
        foreach ($debugInfo as $partNum => $info) {
            $pathCount = isset($info['bom_paths']) ? count($info['bom_paths']) : 0;
            $multiplePaths = $pathCount > 1;
            
            $html .= '<tr>';
            $html .= '<td><strong>' . htmlspecialchars($partNum) . '</strong></td>';
            $html .= '<td>' . ($info['found_in_so'] ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>') . '</td>';
            $html .= '<td>' . ($info['is_graphics_part'] ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>') . '</td>';
            $html .= '<td>' . ($info['has_routing'] ?? false ? '<span class="badge bg-info">Yes</span>' : '<span class="badge bg-warning">No</span>') . '</td>';
            $html .= '<td><small>' . htmlspecialchars($info['routing_info']['routing'] ?? 'N/A') . '</small></td>';
            $html .= '<td>' . ($info['excluded_from_bom_no_routing'] ?? false ? '<span class="badge bg-warning">Yes</span>' : '<span class="badge bg-success">No</span>') . '</td>';
            $html .= '<td>' . ($info['bom_root_found'] ?? false ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>') . '</td>';
            $html .= '<td>' . ($multiplePaths ? '<span class="badge bg-warning">Yes</span>' : '<span class="badge bg-success">No</span>') . '</td>';
            $html .= '<td class="text-center">' . $pathCount . '</td>';
            $html .= '<td>' . ($info['found_in_bom_as_parent'] ?? false ? '<span class="badge bg-primary">Yes</span>' : '<span class="badge bg-secondary">No</span>') . '</td>';
            $html .= '<td>' . ($info['found_in_bom_as_component'] ?? false ? '<span class="badge bg-info">Yes</span>' : '<span class="badge bg-secondary">No</span>') . '</td>';
            $html .= '<td><small>' . htmlspecialchars($info['bom_path_source'] ?? 'unknown') . '</small></td>';
            $html .= '<td><small>' . htmlspecialchars($info['bom_start_part_used'] ?? 'none') . '</small></td>';
            $html .= '</tr>';
            
            // Show multiple paths details if they exist
            if ($multiplePaths) {
                $html .= '<tr class="table-light">';
                $html .= '<td colspan="13"><small><strong>Multiple BOM Paths for ' . htmlspecialchars($partNum) . ':</strong><br>';
                foreach ($info['bom_paths'] as $idx => $pathInfo) {
                    $html .= ($idx + 1) . '. Level ' . $pathInfo['level'] . ': ' . htmlspecialchars($pathInfo['path']) . ' (Qty: ' . $pathInfo['qty'] . ')<br>';
                }
                $html .= '</small></td>';
                $html .= '</tr>';
            }
        }
        $html .= '</tbody></table></div></div>';
        
        // BOM Sample Tab
        $html .= '<div id="debug-bom" class="tab-pane">';
        if (!empty($bomDataSample)) {
            $html .= '<p><strong>Sample BOM Data (first 5 records):</strong></p>';
            $html .= '<div class="table-responsive">';
            $html .= '<table class="table table-sm table-bordered">';
            $html .= '<thead class="table-dark"><tr>';
            foreach (array_keys($bomDataSample[0]) as $key) {
                $html .= '<th>' . htmlspecialchars($key) . '</th>';
            }
            $html .= '</tr></thead><tbody>';
            foreach ($bomDataSample as $record) {
                $html .= '<tr>';
                foreach ($record as $value) {
                    $html .= '<td><small>' . htmlspecialchars($value) . '</small></td>';
                }
                $html .= '</tr>';
            }
            $html .= '</tbody></table></div>';
        } else {
            $html .= '<p class="text-muted">No BOM data sample available.</p>';
        }
        $html .= '</div>';
        
        // Graphics Sample Tab
        $html .= '<div id="debug-graphics" class="tab-pane">';
        if (!empty($graphicsPartsSample)) {
            $html .= '<p><strong>Sample Graphics Parts (first 5 records):</strong></p>';
            $html .= '<div class="table-responsive">';
            $html .= '<table class="table table-sm table-bordered">';
            $html .= '<thead class="table-dark"><tr>';
            foreach (array_keys($graphicsPartsSample[0]) as $key) {
                $html .= '<th>' . htmlspecialchars($key) . '</th>';
            }
            $html .= '</tr></thead><tbody>';
            foreach ($graphicsPartsSample as $record) {
                $html .= '<tr>';
                foreach ($record as $value) {
                    $html .= '<td><small>' . htmlspecialchars($value) . '</small></td>';
                }
                $html .= '</tr>';
            }
            $html .= '</tbody></table></div>';
        } else {
            $html .= '<p class="text-muted">No graphics parts sample available.</p>';
        }
        $html .= '</div>';
        
        // Add BOM Structure Analysis Tab
        $html .= '<div id="debug-bom-structure" class="tab-pane">';
        $html .= '<p><strong>BOM Structure Analysis:</strong></p>';
        
        // Add VWL-03505-310 specific analysis
        if (isset($results['VWL_BOM_ANALYSIS']) && !empty($results['VWL_BOM_ANALYSIS'])) {
            $html .= '<h6>VWL-03505-310 BOM Relationships in Database:</h6>';
            $html .= '<div class="table-responsive">';
            $html .= '<table class="table table-sm table-bordered">';
            $html .= '<thead class="table-dark"><tr>';
            $html .= '<th>Parent</th><th>Component</th><th>Qty Per</th><th>Start Date</th><th>End Date</th><th>Mod Date</th>';
            $html .= '</tr></thead><tbody>';
            
            foreach ($results['VWL_BOM_ANALYSIS'] as $rel) {
                $html .= '<tr>';
                $html .= '<td>' . htmlspecialchars($rel['parent']) . '</td>';
                $html .= '<td>' . htmlspecialchars($rel['component']) . '</td>';
                $html .= '<td>' . htmlspecialchars($rel['qty_per']) . '</td>';
                $html .= '<td>' . htmlspecialchars($rel['start_date']) . '</td>';
                $html .= '<td>' . htmlspecialchars($rel['end_date']) . '</td>';
                $html .= '<td>' . htmlspecialchars($rel['mod_date']) . '</td>';
                $html .= '</tr>';
            }
            $html .= '</tbody></table></div>';
        }
        
        if (isset($results['BOM_RELATIONSHIPS'])) {
            $html .= '<h6>All BOM Relationships:</h6>';
            $html .= '<div class="table-responsive">';
            $html .= '<table class="table table-sm table-bordered">';
            $html .= '<thead class="table-dark"><tr>';
            $html .= '<th>Parent</th><th>Component</th><th>Qty Per</th>';
            $html .= '</tr></thead><tbody>';
            
            foreach ($results['BOM_RELATIONSHIPS'] as $rel) {
                $html .= '<tr>';
                $html .= '<td>' . htmlspecialchars($rel['parent']) . '</td>';
                $html .= '<td>' . htmlspecialchars($rel['component']) . '</td>';
                $html .= '<td>' . htmlspecialchars($rel['qty_per']) . '</td>';
                $html .= '</tr>';
            }
            $html .= '</tbody></table></div>';
        }
        
        if (isset($results['INCORRECT_BOM_ITEMS']) && !empty($results['INCORRECT_BOM_ITEMS'])) {
            $html .= '<div class="alert alert-danger">';
            $html .= '<h6>Incorrect BOM Items Found (Not in ERP BOM):</h6>';
            foreach ($results['INCORRECT_BOM_ITEMS'] as $item) {
                $html .= '<p><strong>Item:</strong> ' . htmlspecialchars($item['item']) . ' (' . htmlspecialchars($item['description']) . ')<br>';
                $html .= '<strong>Parent:</strong> ' . htmlspecialchars($item['parent']) . ' | ';
                $html .= '<strong>Level:</strong> ' . $item['level'] . ' | ';
                $html .= '<strong>Qty:</strong> ' . $item['qty'] . ' | ';
                $html .= '<strong>Source:</strong> ' . htmlspecialchars($item['source']) . ' | ';
                $html .= '<strong>BOM Path:</strong> ' . htmlspecialchars($item['bom_path']) . '</p>';
            }
            $html .= '</div>';
        }
        
        if (isset($results['UNEXPECTED_ITEMS']) && !empty($results['UNEXPECTED_ITEMS'])) {
            $html .= '<div class="alert alert-warning">';
            $html .= '<h6>Other Unexpected Items Found:</h6>';
            foreach ($results['UNEXPECTED_ITEMS'] as $item) {
                $html .= '<p>Item: ' . htmlspecialchars($item['item']) . ' | Parent: ' . htmlspecialchars($item['parent']) . ' | Level: ' . $item['level'] . ' | Source: ' . htmlspecialchars($item['source']) . '</p>';
            }
            $html .= '</div>';
        }
        
        $html .= '</div>';
        
        // Add specific ART-03505-110 analysis tab
        $html .= '<div id="debug-specific" class="tab-pane">';
        $html .= '<p><strong>Analysis for ART-03505-110:</strong></p>';
        
        // Check for special debug info
        if ($specialDebug) {
            $html .= '<div class="alert alert-info">';
            $html .= '<h6>ART-03505-110 Special Debug Analysis:</h6>';
            $html .= '<ul>';
            $html .= '<li>Found in Sales Orders: ' . (isset($specialDebug['found_in_sales_order']) ? 'YES' : 'NO') . '</li>';
            $html .= '<li>Found in Graphics Lookup: ' . (isset($specialDebug['found_in_graphics_lookup']) ? 'YES' : 'NO') . '</li>';
            $html .= '<li>BOM Relationships Found: ' . (isset($specialDebug['bom_relationships']) ? count($specialDebug['bom_relationships']) : '0') . '</li>';
            
            if (isset($specialDebug['so_details'])) {
                $html .= '<li>SO Details: Order ' . $specialDebug['so_details']['sales_order'] . ', Line ' . $specialDebug['so_details']['line_number'] . '</li>';
            }
            
            if (isset($specialDebug['routing_details'])) {
                $html .= '<li>Routing Details: ' . ($specialDebug['routing_details']['routing'] ?? 'NO ROUTING') . '</li>';
                $html .= '<li>BOM Code: ' . ($specialDebug['routing_details']['bom_code'] ?? 'NO BOM CODE') . '</li>';
            }
            
            if (isset($specialDebug['graphics_details'])) {
                $html .= '<li>Graphics Details: Prod Line = ' . ($specialDebug['graphics_details']['product_line'] ?? 'N/A') . ', PM Code = ' . ($specialDebug['graphics_details']['pm_code'] ?? 'N/A') . '</li>';
                $html .= '<li>Drawing = ' . ($specialDebug['graphics_details']['drawing'] ?? 'N/A') . '</li>';
                $html .= '<li>Status = ' . ($specialDebug['graphics_details']['status'] ?? 'N/A') . '</li>';
                $html .= '<li>Routing Status = ' . ($specialDebug['graphics_details']['routing_status'] ?? 'N/A') . '</li>';
            }
            
            if (isset($specialDebug['bom_relationships'])) {
                $html .= '<li>BOM Relationships:</li><ul>';
                foreach ($specialDebug['bom_relationships'] as $rel) {
                    $html .= '<li>' . $rel['relationship'] . ': ' . $rel['parent'] . ' -> ' . $rel['component'] . ' (Qty: ' . $rel['qty_per'] . ')</li>';
                }
                $html .= '</ul>';
            }
            
            $html .= '</ul>';
            $html .= '</div>';
        }
        
        // Search for any parts containing "ART-03505"
        $html .= '<h6>All ART-03505 Related Parts in Debug:</h6>';
        $foundArtParts = false;
        foreach ($debugInfo as $partNum => $info) {
            if (strpos($partNum, 'ART-03505') !== false) {
                $foundArtParts = true;
                $html .= '<div class="card mb-2">';
                $html .= '<div class="card-body">';
                $html .= '<h6 class="card-title">' . htmlspecialchars($partNum) . '</h6>';
                $html .= '<small>';
                $html .= 'Found in SO: ' . ($info['found_in_so'] ? 'YES' : 'NO') . ' | ';
                $html .= 'Is Graphics: ' . ($info['is_graphics_part'] ? 'YES' : 'NO') . ' | ';
                $html .= 'Source: ' . ($info['bom_path_source'] ?? 'unknown');
                if (isset($info['source_so_part'])) {
                    $html .= ' | From SO Part: ' . $info['source_so_part'];
                }
                if (isset($info['sales_order'])) {
                    $html .= ' | Sales Order: ' . $info['sales_order'];
                }
                if (isset($info['bom_parent'])) {
                    $html .= ' | BOM Parent: ' . $info['bom_parent'];
                }
                $html .= '</small>';
                $html .= '</div></div>';
            }
        }
        
        if (!$foundArtParts) {
            $html .= '<div class="alert alert-info">No ART-03505 related parts found in debug info</div>';
        }
        
        $html .= '</div>';
        
        $html .= '</div></div>';
        
        return $html;
    }

    private function findRootParent($parentPart, $allSoPartNumbers, $allBomData)
    {
        // If parent is directly in SO parts, return it
        if (in_array($parentPart, $allSoPartNumbers)) {
            return $parentPart;
        }
        
        // Otherwise, find which SO part this parent belongs to
        foreach ($allBomData as $bomItem) {
            if ($bomItem['component_part'] == $parentPart && isset($bomItem['root_parent'])) {
                return $bomItem['root_parent'];
            }
        }
        
        // Fallback - shouldn't happen in normal cases
        return $allSoPartNumbers[0] ?? $parentPart;
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
                
                $component = [
                    'component_part' => $componentPart,
                    'parent_component' => $bomItem['parent_part'], // Use the immediate parent from BOM data
                    'qty_per' => $componentQty,
                    'cumulative_qty' => $totalQty,
                    'level' => $currentLevel,
                    'bom_level_hierarchical' => str_repeat('.', $currentLevel) . $currentLevel,
                    'is_also_parent' => $isAlsoParent,
                    'bom_path' => implode(' > ', array_merge($path, [$componentPart])), // Full path
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
                    $path,
                    $componentPart // Pass this component as parent for next level
                );
                
                $components = array_merge($components, $subComponents);
            }
        }
        
        return $components;
    }

    private function findBomRootsForParts($partNumbers)
    {
        if (empty($partNumbers)) {
            return [];
        }
        
        $bomRoots = [];
        
        foreach ($partNumbers as $partNumber) {
            // Look for BOM codes in pt_mstr table
            try {
                $query = "
                    SELECT pt_bom_code 
                    FROM pt_mstr 
                    WHERE pt_domain = 'EYE' 
                        AND pt_part = :partNumber 
                        AND pt_bom_code IS NOT NULL 
                        AND pt_bom_code != ''
                    WITH (NOLOCK)
                ";
                
                $stmt = $this->db->prepare($query);
                $stmt->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
                $stmt->execute();
                
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($result && !empty($result['pt_bom_code'])) {
                    $bomRoots[] = $result['pt_bom_code'];
                }
                
            } catch (PDOException $e) {
                // Continue if there's an error with this part
                continue;
            }
        }
        
        return array_unique($bomRoots);
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
                    pt_prod_line as product_line,
                    pt_part_type as part_type,
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
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            // Return empty array on error, don't halt execution
            return [];
        }
    }

    private function buildHierarchicalOrder($bomLevels)
    {
        // First, ensure we have the proper structure with level 0 (parent) first
        ksort($bomLevels);
        
        $hierarchicalOrder = [];
        $allItems = [];
        $parentChildMap = [];
        
        // Collect all items and build parent-child relationships
        foreach ($bomLevels as $level => $levelItems) {
            foreach ($levelItems as $item) {
                $allItems[$item['item_part']] = $item;
                $parentPart = $item['parent_component'] ?? '';
                
                if ($parentPart && $parentPart !== 'SO Part') {
                    if (!isset($parentChildMap[$parentPart])) {
                        $parentChildMap[$parentPart] = [];
                    }
                    $parentChildMap[$parentPart][] = $item;
                }
            }
        }
        
        // Start with level 0 (parent parts)
        if (isset($bomLevels[0])) {
            $hierarchicalOrder[0] = $bomLevels[0];
        }
        
        // Build hierarchy level by level, ensuring children follow their immediate parents
        for ($level = 1; $level <= 10; $level++) {
            if (!isset($bomLevels[$level])) {
                continue;
            }
            
            $hierarchicalOrder[$level] = [];
            $processedAtThisLevel = [];
            
            // For each item at this level, try to place it near its parent
            foreach ($bomLevels[$level] as $item) {
                $parentPart = $item['parent_component'] ?? '';
                $itemPart = $item['item_part'];
                
                // Skip if already processed
                if (in_array($itemPart, $processedAtThisLevel)) {
                    continue;
                }
                
                // Add this item
                $hierarchicalOrder[$level][] = $item;
                $processedAtThisLevel[] = $itemPart;
                
                // If this item has children at the next level, we'll handle them there
                // For now, just ensure we have all items at this level
            }
            
            // Add any remaining items that weren't processed
            foreach ($bomLevels[$level] as $item) {
                if (!in_array($item['item_part'], $processedAtThisLevel)) {
                    $hierarchicalOrder[$level][] = $item;
                    $processedAtThisLevel[] = $item['item_part'];
                }
            }
        }
        
        return $hierarchicalOrder;
    }
}

// Initialize and run
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

$results = $data->getGraphicsDemandReport($daysOut, $maxBomLevels, $showOnlyLevel, $salesOrderNumber);

// Build level filter description
$levelFilter = '';
if ($showOnlyLevel !== null) {
    $levelFilter = $showOnlyLevel === 0 ? ' (Parent Parts Only)' : ' (BOM Level ' . $showOnlyLevel . ' Only)';
}

// Output as HTML table instead of JSON
echo '<!DOCTYPE html>
<html>
<head>
    <title>Graphics Demand Report</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <style>
        body { padding: 20px; }
        .table { font-size: 0.85em; }
        .table th { background-color: #343a40; color: white; position: sticky; top: 0; z-index: 10; }
        .table-primary { background-color: #cfe2ff !important; font-weight: bold; }
        .table-info { background-color: #d1ecf1 !important; font-weight: bold; }
        .table-secondary { background-color: #e9ecef !important; font-style: italic; }
        .table-light { background-color: #f8f9fa !important; }
        .controls { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
        .font-monospace { font-family: "Courier New", monospace; font-size: 0.9em; }
        .table-hover tbody tr:hover { background-color: rgba(0,0,0,.075); }
        .card { transition: transform 0.2s; }
        .card:hover { transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2><i class="fas fa-chart-line"></i> Graphics Demand Report' . $levelFilter . '</h2>
        
        <div class="controls">
            <h5><i class="fas fa-cogs"></i> Report Controls:</h5>
            <p><strong>Current Parameters:</strong> Days Out: ' . $daysOut . ', Max BOM Levels: ' . $maxBomLevels . ', Show Level: ' . ($showOnlyLevel !== null ? $showOnlyLevel : 'All') . ', Sales Order: ' . ($salesOrderNumber ?: 'All') . '</p>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Quick Links:</strong></p>
                    <div class="btn-group" role="group">
                        <a href="?days=300&max_levels=5" class="btn btn-outline-primary btn-sm">All Levels</a>
                        <a href="?days=300&max_levels=5&level=0" class="btn btn-outline-warning btn-sm">Parents Only</a>
                        <a href="?days=60&max_levels=3" class="btn btn-outline-info btn-sm">60 Days</a>
                        <a href="?' . http_build_query(array_merge($_GET, ['debug' => '1'])) . '" class="btn btn-outline-danger btn-sm">Debug Mode</a>
                    </div>
                </div>
            </div>
        </div>
        
        <p><small class="text-muted">Generated on: ' . date('Y-m-d H:i:s') . '</small></p>
        ' . $data->convertToTable($results) . '
    </div>
</body>
</html>';