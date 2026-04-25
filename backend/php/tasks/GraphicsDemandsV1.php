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
                'excluded_from_bom_no_routing' => !isset($routingInfo[$soPartNumber]) || empty($routingInfo[$soPartNumber]['routing']),
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
                        'debug_source' => 'SO_PART_DIRECT_' . ($isGraphicsPart ? 'GRAPHICS' : 'NON_GRAPHICS')
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
                        'bom_path' => $bomComponent['bom_path'],
                        'path_depth' => $bomComponent['path_depth'],
                        'bom_reference' => $bomComponent['bom_reference'] ?? '',
                        'bom_operation' => $bomComponent['bom_operation'] ?? '',
                        'bom_mandatory' => $bomComponent['bom_mandatory'] ?? '',
                        'bom_remarks' => $bomComponent['bom_remarks'] ?? '',
                        'debug_source' => 'BOM_COMPONENT_LEVEL_' . $bomComponent['level'] . '_' . ($isGraphicsPart ? 'GRAPHICS' : 'NON_GRAPHICS')
                    ];
                }
            } else {
                // Mark that this SO part was excluded from BOM processing due to no routing
                $debugInfo[$soPartNumber]['bom_path_source'] = 'EXCLUDED_NO_ROUTING';
                $debugInfo[$soPartNumber]['bom_start_part_used'] = 'N/A - No Routing';
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
        
        return $result;
    }

    public function convertToTable($results)
    {
        // Extract debug info if present
        $debugInfo = null;
        $allBomDataCount = 0;
        $graphicsPartsCount = 0;
        $soPartsCount = 0;
        $allPartsLookup = [];
        $showOnlyGraphics = false;
        
        if (isset($results['DEBUG_INFO'])) {
            $debugInfo = $results['DEBUG_INFO'];
            $allBomDataCount = $results['ALL_BOM_DATA_COUNT'] ?? 0;
            $graphicsPartsCount = $results['GRAPHICS_PARTS_COUNT'] ?? 0;
            $soPartsCount = $results['SO_PARTS_COUNT'] ?? 0;
            $allPartsLookup = $results['ALL_PARTS_LOOKUP'] ?? [];
            $showOnlyGraphics = $results['SHOW_ONLY_GRAPHICS'] ?? false;
            
            // Remove debug entries from results
            unset($results['DEBUG_INFO']);
            unset($results['ALL_BOM_DATA_COUNT']);
            unset($results['GRAPHICS_PARTS_COUNT']);
            unset($results['SO_PARTS_COUNT']);
            unset($results['ALL_BOM_DATA_SAMPLE']);
            unset($results['GRAPHICS_PARTS_SAMPLE']);
            unset($results['CURRENT_LEVEL_PARTS']);
            unset($results['BOM_ROOT_PARTS']);
            unset($results['ALL_PARTS_LOOKUP']);
            unset($results['SHOW_ONLY_GRAPHICS']);
            unset($results['GRAPHICS_PARTS_LOOKUP_COUNT']);
            unset($results['ALL_PARTS_LOOKUP_COUNT']);
            unset($results['RESULT_COUNT_BEFORE_RETURN']);
        } else {
            // Check if graphics_only is set in URL
            $showOnlyGraphics = isset($_GET['graphics_only']) && $_GET['graphics_only'] == '1';
            
            // If not in debug mode, get parts data for the table
            $allPartNumbers = [];
            foreach ($results as $row) {
                if (isset($row['item_part']) && !empty($row['item_part'])) {
                    $allPartNumbers[] = $row['item_part'];
                }
                if (isset($row['so_part']) && !empty($row['so_part'])) {
                    $allPartNumbers[] = $row['so_part'];
                }
            }
            $allPartNumbers = array_unique($allPartNumbers);
            
            if (!empty($allPartNumbers)) {
                $allPartsData = $this->getAllPartsInfo($allPartNumbers);
                foreach ($allPartsData as $part) {
                    $allPartsLookup[$part['part_number']] = $part;
                }
            }
        }
        
        if (empty($results)) {
            $html = '<div class="alert alert-warning">No graphics demand found for the specified criteria.</div>';
            if ($debugInfo) {
                $html .= $this->generateDebugTables($debugInfo, $allBomDataCount, $graphicsPartsCount, $soPartsCount, [], [], [], [], null);
            }
            return $html;
        }

        // Generate summary cards
        $html = $this->generateSummaryCards($results, []);
        
        // Show different table based on graphics_only setting
        if ($showOnlyGraphics) {
            $html .= $this->generateGraphicsOnlyTable($results, $allPartsLookup);
        } else {
            // Group results by sales order and line number for full table
            $groupedResults = [];
            foreach ($results as $row) {
                if (!isset($row['sales_order']) || !isset($row['line_number']) || !isset($row['bom_level'])) {
                    continue;
                }
                
                $salesOrder = $row['sales_order'];
                $lineNumber = $row['line_number'];
                $bomLevel = $row['bom_level'];
                $groupedResults[$salesOrder][$lineNumber][$bomLevel][] = $row;
            }

            // Sort hierarchically
            foreach ($groupedResults as $salesOrder => &$lines) {
                foreach ($lines as $lineNumber => &$bomLevels) {
                    $bomLevels = $this->buildHierarchicalOrder($bomLevels);
                }
            }

            // Add view toggle buttons (now with Folder Structure)
            $html .= '<div class="mb-3">';
            $html .= '<div class="btn-group" role="group" aria-label="View Options">';
            $html .= '<button type="button" class="btn btn-outline-primary active" id="tableViewBtn" onclick="switchView(\'table\')">Table View</button>';
            $html .= '<button type="button" class="btn btn-outline-success" id="treeViewBtn" onclick="switchView(\'tree\')">Tree View</button>';
            $html .= '<button type="button" class="btn btn-outline-warning" id="orgChartViewBtn" onclick="switchView(\'orgchart\')">Org Chart View</button>';
            $html .= '<button type="button" class="btn btn-outline-info" id="folderViewBtn" onclick="switchView(\'folder\')">Folder Structure View</button>';
            $html .= '</div>';
            $html .= '</div>';

            // Generate all three views
            $html .= '<div id="tableView">';
            $html .= $this->generateTableView($groupedResults, $allPartsLookup);
            $html .= '</div>';

            $html .= '<div id="treeView" style="display: none;">';
            $html .= $this->generateTreeView($groupedResults, $allPartsLookup);
            $html .= '</div>';

            $html .= '<div id="orgChartView" style="display: none;">';
            $html .= $this->generateOrgChartView($groupedResults, $allPartsLookup);
            $html .= '</div>';

            // Add Folder Structure View
            $html .= '<div id="folderView" style="display: none;">';
            $html .= $this->generateFolderStructureView($groupedResults, $allPartsLookup);
            $html .= '</div>';

            // Add JavaScript for view switching (add folder)
            $html .= '<script>
            function switchView(viewType) {
                const tableView = document.getElementById("tableView");
                const treeView = document.getElementById("treeView");
                const orgChartView = document.getElementById("orgChartView");
                const folderView = document.getElementById("folderView");
                const tableBtn = document.getElementById("tableViewBtn");
                const treeBtn = document.getElementById("treeViewBtn");
                const orgChartBtn = document.getElementById("orgChartViewBtn");
                const folderBtn = document.getElementById("folderViewBtn");

                tableView.style.display = (viewType === "table") ? "block" : "none";
                treeView.style.display = (viewType === "tree") ? "block" : "none";
                orgChartView.style.display = (viewType === "orgchart") ? "block" : "none";
                folderView.style.display = (viewType === "folder") ? "block" : "none";

                tableBtn.classList.toggle("active", viewType === "table");
                treeBtn.classList.toggle("active", viewType === "tree");
                orgChartBtn.classList.toggle("active", viewType === "orgchart");
                folderBtn.classList.toggle("active", viewType === "folder");
            }
            </script>';

            // Add debug information if requested
            if ($debugInfo && isset($_GET['debug']) && $_GET['debug'] == '1') {
                $html .= $this->generateDebugTables($debugInfo, $allBomDataCount, $graphicsPartsCount, $soPartsCount, [], [], [], [], null);
            }
        }
        
        // Add debug information if requested
        if ($debugInfo && isset($_GET['debug']) && $_GET['debug'] == '1') {
            $html .= $this->generateDebugTables($debugInfo, $allBomDataCount, $graphicsPartsCount, $soPartsCount, [], [], [], [], null);
        }
        
        return $html;
    }

    private function generateGraphicsOnlyTable($results, $allPartsLookup)
    {
        $html = '<div class="alert alert-info"><i class="fas fa-filter"></i> <strong>Graphics Only View</strong> - Showing only graphics parts (Product Line 014)</div>';
        
        $html .= '<div class="table-responsive">';
        $html .= '<table class="table table-striped table-bordered table-hover">';
        
        // Simplified header for graphics-only view
        $html .= '<thead class="thead-dark"><tr>';
        $html .= '<th>Sales Order</th>';
        $html .= '<th>Line</th>';
        $html .= '<th>SO Part</th>';
        $html .= '<th>Due Date</th>';
        $html .= '<th>SO Qty</th>';
        $html .= '<th>Graphics Part</th>';
        $html .= '<th>Description</th>';
        $html .= '<th>Status</th>';
        $html .= '<th>PM Code</th>';
        $html .= '<th>Qty Needed</th>';
        $html .= '<th>Level</th>';
        $html .= '<th>Parent</th>';
        $html .= '<th>Buyer</th>';
        $html .= '<th>Part Type</th>';
        $html .= '</tr></thead>';
        
        $html .= '<tbody>';
        
        foreach ($results as $row) {
            // Skip non-graphics parts - they should already be filtered but double-check
            if (empty($row['graphics_part'])) {
                continue;
            }
            
            $html .= '<tr>';
            $html .= '<td>' . htmlspecialchars($row['sales_order']) . '</td>';
            $html .= '<td>' . htmlspecialchars($row['line_number']) . '</td>';
            $html .= '<td><span class="font-monospace">' . htmlspecialchars($row['so_part']) . '</span></td>';
            $html .= '<td>' . date('m/d/Y', strtotime($row['due_date'])) . '</td>';
            $html .= '<td class="text-end">' . number_format($row['open_quantity']) . '</td>';
            $html .= '<td><span class="font-monospace text-success"><strong>' . htmlspecialchars($row['graphics_part']) . '</strong></span></td>';
            $html .= '<td>' . htmlspecialchars($row['graphics_description'] ?? '') . '</td>';
            $html .= '<td class="text-center">' . ($row['item_status'] ? '<span class="badge bg-' . $this->getStatusBadgeColor($row['item_status']) . '">' . htmlspecialchars($row['item_status']) . '</span>' : '') . '</td>';
            $html .= '<td class="text-center">' . ($row['pm_code'] ? '<span class="badge bg-' . ($row['pm_code'] == 'M' ? 'success' : 'secondary') . '">' . htmlspecialchars($row['pm_code']) . '</span>' : '') . '</td>';
            $html .= '<td class="text-end"><strong>' . number_format($row['qty_needed'], 2) . '</strong></td>';
            
            $actualLevel = $row['bom_level'] ?? 0;
            $html .= '<td class="text-center">' . ($actualLevel == 0 ? '<span class="badge bg-warning">Parent</span>' : '<span class="badge bg-primary">L' . $actualLevel . '</span>') . '</td>';
            
            $html .= '<td><span class="font-monospace text-muted">' . htmlspecialchars($row['parent_component'] ?? 'SO Part') . '</span></td>';
            
            // Get part data for additional info
            $partData = isset($allPartsLookup[$row['graphics_part']]) ? $allPartsLookup[$row['graphics_part']] : [];
            $html .= '<td>' . htmlspecialchars($partData['buyer'] ?? '') . '</td>';
            $html .= '<td>' . htmlspecialchars($partData['part_type'] ?? '') . '</td>';
            
            $html .= '</tr>';
        }
        
        $html .= '</tbody>';
        $html .= '</table>';
        $html .= '</div>';
        
        return $html;
    }

    private function generateTableView($groupedResults, $allPartsLookup)
    {
        // Generate main table with improved styling
        $html = '<div class="table-responsive">';
        $html .= '<table class="table table-striped table-bordered table-hover">';
        
        // Expanded table header with ALL pt_mstr columns for debugging
        $html .= '<thead class="thead-dark"><tr>';
        $html .= '<th width="3%">Sales Order</th>';
        $html .= '<th width="2%">Line</th>';
        $html .= '<th width="5%">SO Part</th>';
        $html .= '<th width="4%">Due Date</th>';
        $html .= '<th width="3%">SO Qty</th>';
        $html .= '<th width="5%">Item</th>';
        $html .= '<th width="6%">Item Description</th>';
        $html .= '<th width="5%">Graphics Part</th>';
        $html .= '<th width="6%">Graphics Description</th>';
        $html .= '<th width="3%">Status</th>';
        $html .= '<th width="2%">PM</th>';
        $html .= '<th width="3%">Qty Needed</th>';
        $html .= '<th width="2%">Level</th>';
        $html .= '<th width="5%">Parent</th>';
        $html .= '<th width="4%">BOM Path</th>';
        $html .= '<th width="3%">Source</th>';
        // Add all pt_mstr debug columns
        $html .= '<th width="3%">Prod Line</th>';
        $html .= '<th width="3%">Part Type</th>';
        $html .= '<th width="3%">BOM Code</th>';
        $html .= '<th width="3%">Routing</th>';
        $html .= '<th width="2%">Phantom</th>';
        $html .= '<th width="3%">ABC</th>';
        $html .= '<th width="3%">Drawing</th>';
        $html .= '<th width="3%">Group</th>';
        $html .= '<th width="3%">Buyer</th>';
        $html .= '<th width="3%">Vendor</th>';
        $html .= '<th width="3%">Revision</th>';
        $html .= '<th width="3%">Site</th>';
        $html .= '<th width="2%">M/B</th>';
        $html .= '<th width="2%">MRP</th>';
        $html .= '<th width="3%">Order Policy</th>';
        $html .= '<th width="3%">Safety Stock</th>';
        $html .= '<th width="3%">ROP</th>';
        $html .= '<th width="3%">Mfg Lead</th>';
        $html .= '<th width="3%">Pur Lead</th>';
        $html .= '<th width="2%">Insp Req</th>';
        $html .= '<th width="3%">Order Min</th>';
        $html .= '<th width="3%">Order Max</th>';
        $html .= '<th width="3%">Order Mult</th>';
        $html .= '<th width="3%">Price</th>';
        $html .= '<th width="3%">Net Weight</th>';
        $html .= '<th width="2%">Taxable</th>';
        $html .= '<th width="2%">Critical</th>';
        $html .= '<th width="3%">UPC</th>';
        $html .= '<th width="2%">Hazard</th>';
        $html .= '<th width="4%">Date Added</th>';
        $html .= '<th width="4%">Date Modified</th>';
        $html .= '<th width="3%">Last User</th>';
        $html .= '</tr></thead>';
        
        // Count total columns for proper colspan
        $totalColumns = 47; // Update this to match actual column count
        
        // Table body with improved organization
        $html .= '<tbody>';
        foreach ($groupedResults as $salesOrder => $lines) {
            $totalSoItems = 0;
            foreach ($lines as $bomLevels) {
                $totalSoItems += array_sum(array_map('count', $bomLevels));
            }
            
            // Sales order header with collapse functionality
            $html .= '<tr class="table-primary" data-bs-toggle="collapse" data-bs-target="#so_' . $salesOrder . '" style="cursor: pointer;">';
            $html .= '<td colspan="' . $totalColumns . '"><strong><i class="fas fa-chevron-down"></i> Sales Order: ' . htmlspecialchars($salesOrder) . '</strong> <span class="badge bg-secondary">' . count($lines) . ' lines, ' . $totalSoItems . ' items</span></td>';
            $html .= '</tr>';
            
            $html .= '<tbody id="so_' . $salesOrder . '" class="collapse show">';
            
            foreach ($lines as $lineNumber => $bomLevels) {
                $totalLineItems = array_sum(array_map('count', $bomLevels));
                
                // Line number sub-header
                $html .= '<tr class="table-info">';
                $html .= '<td colspan="' . $totalColumns . '"><em>&nbsp;&nbsp;<i class="fas fa-caret-right"></i> Line ' . htmlspecialchars($lineNumber) . '</em> <span class="badge bg-info">' . $totalLineItems . ' items</span></td>';
                $html .= '</tr>';
                
                // Display items in hierarchical order (already sorted by buildHierarchicalOrder)
                foreach ($bomLevels as $level => $levelRows) {
                    foreach ($levelRows as $row) {
                        // Use visual_level for proper indentation, not the original bom_level
                        $visualLevel = isset($row['visual_level']) ? $row['visual_level'] : ($row['bom_level'] ?? 0);
                        $hierarchyDepth = isset($row['hierarchy_depth']) ? $row['hierarchy_depth'] : $visualLevel;
                        
                        $rowClass = $visualLevel == 0 ? 'table-light' : '';
                        
                        // Create proper indentation based on hierarchy depth
                        if ($visualLevel == 0) {
                            $levelIndicator = '<i class="fas fa-star text-warning"></i>';
                        } else {
                            $indent = str_repeat('&nbsp;&nbsp;&nbsp;&nbsp;', $hierarchyDepth);
                            $levelIndicator = $indent . '<i class="fas fa-arrow-right text-muted"></i>';
                        }
                        
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
                        $html .= '<td class="text-center">' . ($row['item_status'] ? '<span class="badge bg-' . $this->getStatusBadgeColor($row['item_status']) . '">' . htmlspecialchars($row['item_status']) . '</span>' : '') . '</td>';
                        $html .= '<td class="text-center">' . ($row['pm_code'] ? '<span class="badge bg-' . ($row['pm_code'] == 'M' ? 'success' : 'secondary') . '">' . htmlspecialchars($row['pm_code']) . '</span>' : '') . '</td>';
                        $html .= '<td class="text-end"><strong>' . number_format($row['qty_needed'], 2) . '</strong></td>';
                        
                        // Show the actual BOM level, not the visual grouping
                        $actualLevel = $row['bom_level'] ?? 0;
                        $html .= '<td class="text-center">' . ($actualLevel == 0 ? '<span class="badge bg-warning">Parent</span>' : '<span class="badge bg-primary">L' . $actualLevel . '</span>') . '</td>';
                        
                        $html .= '<td><span class="font-monospace text-muted">' . htmlspecialchars($row['parent_component'] ?? 'N/A') . '</span></td>';
                        $html .= '<td><small title="' . htmlspecialchars($row['bom_path'] ?? '') . '">' . htmlspecialchars(substr($row['bom_path'] ?? '', -20)) . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($row['debug_source'] ?? 'N/A') . '</small></td>';
                        
                        // Get part master data for this item
                        $partData = isset($allPartsLookup[$row['item_part']]) ? $allPartsLookup[$row['item_part']] : [];
                        
                        // Add all pt_mstr debug columns
                        $html .= '<td><small>' . htmlspecialchars($partData['product_line'] ?? '') . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['part_type'] ?? '') . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['bom_code'] ?? '') . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['routing'] ?? '') . '</small></td>';
                        $html .= '<td class="text-center">' . (($partData['phantom'] ?? false) ? '<span class="badge bg-info">Y</span>' : '<span class="badge bg-secondary">N</span>') . '</td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['abc_class'] ?? '') . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['drawing'] ?? '') . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['part_group'] ?? '') . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['buyer'] ?? '') . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['vendor'] ?? '') . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['revision'] ?? '') . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['site'] ?? '') . '</small></td>';
                        $html .= '<td class="text-center"><small>' . htmlspecialchars($partData['make_buy'] ?? '') . '</small></td>';
                        $html .= '<td class="text-center">' . (($partData['mrp_flag'] ?? false) ? '<span class="badge bg-success">Y</span>' : '<span class="badge bg-secondary">N</span>') . '</td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['order_policy'] ?? '') . '</small></td>';
                        $html .= '<td class="text-end"><small>' . number_format((float)($partData['safety_stock'] ?? 0), 2) . '</small></td>';
                        $html .= '<td class="text-end"><small>' . number_format((float)($partData['reorder_point'] ?? 0), 2) . '</small></td>';
                        $html .= '<td class="text-end"><small>' . htmlspecialchars($partData['mfg_lead_time'] ?? '') . '</small></td>';
                        $html .= '<td class="text-end"><small>' . htmlspecialchars($partData['pur_lead_time'] ?? '') . '</small></td>';
                        $html .= '<td class="text-center">' . (($partData['inspection_required'] ?? false) ? '<span class="badge bg-warning">Y</span>' : '<span class="badge bg-secondary">N</span>') . '</td>';
                        $html .= '<td class="text-end"><small>' . number_format((float)($partData['order_minimum'] ?? 0), 2) . '</small></td>';
                        $html .= '<td class="text-end"><small>' . number_format((float)($partData['order_maximum'] ?? 0), 2) . '</small></td>';
                        $html .= '<td class="text-end"><small>' . number_format((float)($partData['order_multiple'] ?? 0), 2) . '</small></td>';
                        $html .= '<td class="text-end"><small>' . number_format((float)($partData['price'] ?? 0), 2) . '</small></td>';
                        $html .= '<td class="text-end"><small>' . number_format((float)($partData['net_weight'] ?? 0), 4) . '</small></td>';
                        $html .= '<td class="text-center">' . (($partData['taxable'] ?? false) ? '<span class="badge bg-info">Y</span>' : '<span class="badge bg-secondary">N</span>') . '</td>';
                        $html .= '<td class="text-center">' . (($partData['critical'] ?? false) ? '<span class="badge bg-danger">Y</span>' : '<span class="badge bg-secondary">N</span>') . '</td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['upc_code'] ?? '') . '</small></td>';
                        $html .= '<td class="text-center">' . (($partData['hazard'] ?? false) ? '<span class="badge bg-warning">Y</span>' : '<span class="badge bg-secondary">N</span>') . '</td>';
                        $html .= '<td><small>' . (($partData['date_added'] ?? '') ? date('m/d/Y', strtotime($partData['date_added'])) : '') . '</small></td>';
                        $html .= '<td><small>' . (($partData['date_modified'] ?? '') ? date('m/d/Y', strtotime($partData['date_modified'])) : '') . '</small></td>';
                        $html .= '<td><small>' . htmlspecialchars($partData['last_user'] ?? '') . '</small></td>';
                        
                        $html .= '</tr>';
                    }
                }
            }
            $html .= '</tbody>';
        }
        $html .= '</tbody>';
        $html .= '</table>';
        $html .= '</div>';
        
        return $html;
    }

    private function generateTreeView($groupedResults, $allPartsLookup)
    {
        $html = '<div class="tree-view-container">';
        
        // Add tree view styles
        $html .= '<style>
        .tree-view-container {
            font-family: "Courier New", monospace;
        }
        .tree-node {
            margin: 5px 0;
            padding: 8px 12px;
            border-left: 3px solid transparent;
            background: #f8f9fa;
            border-radius: 4px;
            transition: all 0.2s;
        }
        .tree-node:hover {
            background: #e9ecef;
        }
        .tree-node.level-0 {
            border-left-color: #ffc107;
            background: #fff3cd;
            font-weight: bold;
        }
        .tree-node.level-1 {
            border-left-color: #0d6efd;
            margin-left: 20px;
        }
        .tree-node.level-2 {
            border-left-color: #6f42c1;
            margin-left: 40px;
        }
        .tree-node.level-3 {
            border-left-color: #d63384;
            margin-left: 60px;
        }
        .tree-node.level-4 {
            border-left-color: #fd7e14;
            margin-left: 80px;
        }
        .tree-node.level-5 {
            border-left-color: #198754;
            margin-left: 100px;
        }
        .part-number {
            font-weight: bold;
            color: #0d6efd;
        }
        .graphics-part {
            color: #198754;
        }
        .quantity {
            font-weight: bold;
            color: #dc3545;
        }
        .description {
            color: #6c757d;
            font-style: italic;
        }
        .status-badge {
            font-size: 0.75em;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .so-header {
            background: #0d6efd;
            color: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            font-size: 1.1em;
            font-weight: bold;
        }
        .line-header {
            background: #17a2b8;
            color: white;
            padding: 10px;
            margin: 8px 0;
            border-radius: 6px;
            font-weight: bold;
        }
        .tree-connector {
            color: #6c757d;
            margin-right: 8px;
        }
        </style>';
        
        foreach ($groupedResults as $salesOrder => $lines) {
            $totalSoItems = 0;
            foreach ($lines as $bomLevels) {
                $totalSoItems += array_sum(array_map('count', $bomLevels));
            }
            
            // Sales Order Header
            $html .= '<div class="so-header">';
            $html .= '<i class="fas fa-shopping-cart"></i> Sales Order: ' . htmlspecialchars($salesOrder);
            $html .= ' <span class="badge bg-light text-dark ms-2">' . count($lines) . ' lines, ' . $totalSoItems . ' items</span>';
            $html .= '</div>';
            
            foreach ($lines as $lineNumber => $bomLevels) {
                $totalLineItems = array_sum(array_map('count', $bomLevels));
                
                // Line Header
                $html .= '<div class="line-header">';
                $html .= '<i class="fas fa-list-ol"></i> Line ' . htmlspecialchars($lineNumber);
                $html .= ' <span class="badge bg-light text-dark ms-2">' . $totalLineItems . ' items</span>';
                $html .= '</div>';
                
                // Display items in tree structure
                foreach ($bomLevels as $level => $levelRows) {
                    foreach ($levelRows as $row) {
                        $visualLevel = isset($row['visual_level']) ? $row['visual_level'] : ($row['bom_level'] ?? 0);
                        $actualLevel = $row['bom_level'] ?? 0;
                        
                        // Determine tree connector
                        $connector = '';
                        if ($visualLevel == 0) {
                            $connector = '<i class="fas fa-star tree-connector"></i>';
                        } else {
                            $connector = '<i class="fas fa-arrow-right tree-connector"></i>';
                        }
                        
                        $html .= '<div class="tree-node level-' . $visualLevel . '">';
                        $html .= $connector;
                        
                        // Part number and graphics info
                        $html .= '<span class="part-number">' . htmlspecialchars($row['item_part'] ?? $row['so_part']) . '</span>';
                        
                        if (!empty($row['graphics_part'])) {
                            $html .= ' <span class="graphics-part">(' . htmlspecialchars($row['graphics_part']) . ')</span>';
                        }
                        
                        // Level badge
                        if ($actualLevel == 0) {
                            $html .= ' <span class="badge bg-warning status-badge">Parent</span>';
                        } else {
                            $html .= ' <span class="badge bg-primary status-badge">L' . $actualLevel . '</span>';
                        }
                        
                        // Status badges
                        if ($row['item_status']) {
                            $html .= ' <span class="badge bg-' . $this->getStatusBadgeColor($row['item_status']) . ' status-badge">' . htmlspecialchars($row['item_status']) . '</span>';
                        }
                        
                        if ($row['pm_code']) {
                            $html .= ' <span class="badge bg-' . ($row['pm_code'] == 'M' ? 'success' : 'secondary') . ' status-badge">' . htmlspecialchars($row['pm_code']) . '</span>';
                        }
                        
                        $html .= '<br>';
                        
                        // Description
                        if (!empty($row['item_description'])) {
                            $html .= '<span class="description">' . htmlspecialchars($row['item_description']) . '</span><br>';
                        }
                        
                        // Quantity and other details
                        $html .= '<small>';
                        $html .= '<span class="quantity">Qty: ' . number_format($row['qty_needed'], 2) . '</span>';
                        
                        if ($visualLevel > 0) {
                            $html .= ' | Parent: <span class="part-number">' . htmlspecialchars($row['parent_component'] ?? 'N/A') . '</span>';
                        }
                        
                        $html .= ' | Due: ' . date('m/d/Y', strtotime($row['due_date']));
                        
                        // Get part master data for additional info
                        $partData = isset($allPartsLookup[$row['item_part']]) ? $allPartsLookup[$row['item_part']] : [];
                        
                        if (!empty($partData['product_line'])) {
                            $html .= ' | Prod Line: ' . htmlspecialchars($partData['product_line']);
                        }
                        
                        if (!empty($partData['buyer'])) {
                            $html .= ' | Buyer: ' . htmlspecialchars($partData['buyer']);
                        }
                        
                        if (!empty($partData['routing'])) {
                            $html .= ' | Routing: ' . htmlspecialchars($partData['routing']);
                        }
                        
                        $html .= '</small>';
                        $html .= '</div>';
                    }
                }
            }
        }
        
        $html .= '</div>';
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
            
            for ($i =  0; $i < count($partNumbers); $i++) {
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
                    pt_status as status,
                    pt_pm_code as pm_code,
                    pt_bom_code as bom_code,
                    pt_phantom as phantom,
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
                    pt_ms as make_buy,
                    pt_plan_ord as plan_order,
                    pt_mrp as mrp_flag,
                    pt_ord_pol as order_policy,
                    pt_ord_qty as order_quantity,
                    pt_ord_per as order_period,
                    pt_sfty_stk as safety_stock,
                    pt_sfty_time as safety_time,
                    pt_rop as reorder_point,
                    pt_mfg_lead as mfg_lead_time,
                    pt_pur_lead as pur_lead_time,
                    pt_insp_rqd as inspection_required,
                    pt_insp_lead as inspection_lead,
                    pt_cum_lead as cumulative_lead,
                    pt_ord_min as order_minimum,
                    pt_ord_max as order_maximum,
                    pt_ord_mult as order_multiple,
                    pt_yield_pct as yield_percent,
                    pt_price as price,
                    pt_lot_ser as lot_serial,
                    pt_timefence as time_fence,
                    pt_qc_lead as qc_lead_time,
                    pt_auto_lot as auto_lot,
                    pt_assay as assay,
                    pt_batch as batch,
                    pt_net_wt as net_weight,
                    pt_net_wt_um as net_weight_um,
                    pt_size as size_field,
                    pt_size_um as size_um,
                    pt_taxable as taxable,
                    pt_taxc as tax_code,
                    pt_rollup as rollup,
                    pt_shelflife as shelf_life,
                    pt_critical as critical,
                    pt_sngl_lot as single_lot,
                    pt_upc as upc_code,
                    pt_hazard as hazard,
                    pt_length as length_field,
                    pt_height as height_field,
                    pt_width as width_field,
                    pt_dim_um as dimension_um,
                    pt_pkg_code as package_code,
                    pt_network as network,
                    pt_fr_class as fr_class,
                    pt_spec_hdlg as special_handling,
                    pt_loc_type as location_type,
                    pt_transtype as transaction_type,
                    pt_warr_cd as warranty_code,
                    pt_pvm_days as pvm_days,
                    pt_isb as isb,
                    pt_mttr as mttr,
                    pt_mtbf as mtbf,
                    pt_svc_type as service_type,
                    pt_svc_group as service_group,
                    pt_ven_warr as vendor_warranty,
                    pt_fru as fru,
                    pt_mfg_mttr as mfg_mttr,
                    pt_mfg_mtbf as mfg_mtbf,
                    pt_sttr as sttr,
                    pt_origin as origin,
                    pt_tariff as tariff,
                    pt_sys_type as system_type,
                    pt_inst_call as install_call,
                    pt_cover as cover,
                    pt_unit_isb as unit_isb,
                    pt_article as article,
                    pt_ll_drp as ll_drp,
                    pt_po_site as po_site,
                    pt_ship_wt as ship_weight,
                    pt_ship_wt_um as ship_weight_um,
                    pt_obs_date as obsolete_date,
                    pt_pvm_bom as pvm_bom,
                    pt_pvm_route as pvm_route,
                    pt_vend as vendor,
                    pt_routing as routing,
                    pt_rev as revision,
                    pt_site as site,
                    pt_added as date_added,
                    pt_mod_date as date_modified,
                    pt_userid as last_user,
                    pt_ms as make_buy,
                    pt_plan_ord as plan_order,
                    pt_mrp as mrp_flag,
                    pt_ord_pol as order_policy,
                    pt_ord_qty as order_quantity,
                    pt_ord_per as order_period,
                    pt_sfty_stk as safety_stock,
                    pt_sfty_time as safety_time,
                    pt_rop as reorder_point,
                    pt_mfg_lead as mfg_lead_time,
                    pt_pur_lead as pur_lead_time,
                    pt_insp_rqd as inspection_required,
                    pt_insp_lead as inspection_lead,
                    pt_cum_lead as cumulative_lead,
                    pt_ord_min as order_minimum,
                    pt_ord_max as order_maximum,
                    pt_ord_mult as order_multiple,
                    pt_yield_pct as yield_percent,
                    pt_price as price,
                    pt_lot_ser as lot_serial,
                    pt_timefence as time_fence,
                    pt_qc_lead as qc_lead_time,
                    pt_auto_lot as auto_lot,
                    pt_assay as assay,
                    pt_batch as batch,
                    pt_net_wt as net_weight,
                    pt_net_wt_um as net_weight_um,
                    pt_size as size_field,
                    pt_size_um as size_um,
                    pt_taxable as taxable,
                    pt_taxc as tax_code,
                    pt_rollup as rollup,
                    pt_shelflife as shelf_life,
                    pt_critical as critical,
                    pt_sngl_lot as single_lot,
                    pt_upc as upc_code,
                    pt_hazard as hazard,
                    pt_length as length_field,
                    pt_height as height_field,
                    pt_width as width_field,
                    pt_dim_um as dimension_um,
                    pt_pkg_code as package_code,
                    pt_network as network,
                    pt_fr_class as fr_class,
                    pt_spec_hdlg as special_handling,
                    pt_loc_type as location_type,
                    pt_transtype as transaction_type,
                    pt_warr_cd as warranty_code,
                    pt_pvm_days as pvm_days,
                    pt_isb as isb,
                    pt_mttr as mttr,
                    pt_mtbf as mtbf,
                    pt_svc_type as service_type,
                    pt_svc_group as service_group,
                    pt_ven_warr as vendor_warranty,
                    pt_fru as fru,
                    pt_mfg_mttr as mfg_mttr,
                    pt_mfg_mtbf as mfg_mtbf,
                    pt_sttr as sttr,
                    pt_origin as origin,
                    pt_tariff as tariff,
                    pt_sys_type as system_type,
                    pt_inst_call as install_call,
                    pt_cover as cover,
                    pt_unit_isb as unit_isb,
                    pt_article as article,
                    pt_ll_drp as ll_drp,
                    pt_po_site as po_site,
                    pt_ship_wt as ship_weight,
                    pt_ship_wt_um as ship_weight_um,
                    pt_obs_date as obsolete_date,
                    pt_pvm_bom as pvm_bom,
                    pt_pvm_route as pvm_route,
                    pt_pvm_um as pvm_um,
                    pt_rp_bom as rp_bom,
                    pt_rp_route as rp_route,
                    pt_rp_vendor as rp_vendor,
                    pt_rctpo_status as rctpo_status,
                    pt_rollup_id as rollup_id,
                    pt_spec_grav as specific_gravity,
                    pt_joint_type as joint_type,
                    pt_mfg_pct as mfg_percent,
                    pt_pur_pct as pur_percent,
                    pt_drp_pct as drp_percent,
                    pt_pou_code as pou_code,
                    pt_wks_avg as weeks_average,
                    pt_wks_max as weeks_maximum,
                    pt_wks_min as weeks_minimum,
                    pt_pick_logic as pick_logic,
                    pt_fiscal_class as fiscal_class,
                    pt_dsgn_grp as design_group,
                    pt_drwg_loc as drawing_location,
                    pt_ecn_rev as ecn_revision,
                    pt_drwg_size as drawing_size,
                    pt_model as model,
                    pt_repairable as repairable,
                    pt_rctwo_status as rctwo_status,
                    pt_rctpo_active as rctpo_active,
                    pt_lot_grp as lot_group,
                    pt_rctwo_active as rctwo_active,
                    pt_break_cat as break_category,
                    pt_fsc_code as fsc_code,
                    pt_trace_active as trace_active,
                    pt_trace_detail as trace_detail,
                    pt_pm_mrp as pm_mrp,
                    pt_ins_call_type as install_call_type,
                    pt_ins_bom as install_bom,
                    pt_ins_route as install_route,
                    pt_promo as promo,
                    pt_meter_interval as meter_interval,
                    pt_meter_um as meter_um,
                    pt_wh as warehouse,
                    pt_btb_type as btb_type,
                    pt_cfg_type as config_type,
                    pt_app_owner as app_owner,
                    pt_op_yield as op_yield,
                    pt_run_seq1 as run_sequence1,
                    pt_run_seq2 as run_sequence2,
                    pt_atp_enforcement as atp_enforcement,
                    pt_atp_family as atp_family,
                    pt_domain as domain_field
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
        
        // Flatten all items into a single array with proper sorting
        $allItems = [];
        foreach ($bomLevels as $level => $levelItems) {
            foreach ($levelItems as $item) {
                $item['sort_level'] = $level;
                $allItems[] = $item;
            }
        }
        
        // Build parent-child map for quick lookup
        $childrenMap = [];
        foreach ($allItems as $item) {
            $parentPart = $item['parent_component'] ?? '';
            if ($parentPart && $parentPart !== 'SO Part') {
                if (!isset($childrenMap[$parentPart])) {
                    $childrenMap[$parentPart] = [];
                }
                $childrenMap[$parentPart][] = $item;
            }
        }
        
        // Recursive function to build hierarchical order - KEEP FLAT FOR DISPLAY
        $buildHierarchy = function($items, $level = 0) use (&$buildHierarchy, $childrenMap) {
            $result = [];
            
            foreach ($items as $item) {
                // Add the current item with proper visual hierarchy info
                $item['visual_level'] = $level;
                $item['hierarchy_depth'] = $level;
                $result[] = $item;
                
                // Add its children recursively immediately after parent
                $itemPart = $item['item_part'] ?? '';
                if (isset($childrenMap[$itemPart])) {
                    // Sort children by part number for consistent ordering
                    $children = $childrenMap[$itemPart];
                    usort($children, function($a, $b) {
                        return strcmp($a['item_part'] ?? '', $b['item_part'] ?? '');
                    });
                    
                    $childResults = $buildHierarchy($children, $level + 1);
                    $result = array_merge($result, $childResults);
                }
            }
            
            return $result;
        };
        
        // Start with level 0 items (parents) and build hierarchy
        $parentItems = isset($bomLevels[0]) ? $bomLevels[0] : [];
        
        // Sort parent items by part number
        usort($parentItems, function($a, $b) {
            return strcmp($a['item_part'] ?? '', $b['item_part'] ?? '');
        });
        
        // Build the complete hierarchical structure as a FLAT ORDERED LIST
        $hierarchicalItems = $buildHierarchy($parentItems);
        
        // Return as a single "level 0" group to preserve order in display
        return [0 => $hierarchicalItems];
    }

    private function getStatusBadgeColor($status)
    {
        switch (strtoupper($status)) {
            case 'A':
            case 'ACTIVE':
                return 'success';
            case 'I':
            case 'INACTIVE':
                return 'secondary';
            case 'P':
            case 'PLANNED':
                return 'info';
            case 'O':
            case 'OBSOLETE':
                return 'danger';
            case 'PROTO':
            case 'PROTOTYPE':
                return 'warning';
            case 'DEV':
            case 'DEVELOPMENT':
                return 'primary';
            case 'TEST':
                return 'dark';
            default:
                return 'light';
        }
    }

    private function generateSummaryCards($results, $groupedResults)
    {
        $totalItems = 0;
        $graphicsOnlyItems = 0;
        $totalQuantityNeeded = 0;
        $uniqueSalesOrders = [];
        $uniqueLines = [];
        
        // Count items and gather unique sales orders/lines
        foreach ($results as $result) {
            if (isset($result['qty_needed'])) {
                $totalItems++;
                $totalQuantityNeeded += $result['qty_needed'];
                
                if (!empty($result['graphics_part'])) {
                    $graphicsOnlyItems++;
                }
                
                if (isset($result['sales_order'])) {
                    $uniqueSalesOrders[$result['sales_order']] = true;
                    if (isset($result['line_number'])) {
                        $uniqueLines[$result['sales_order'] . '-' . $result['line_number']] = true;
                    }
                }
            }
        }
 
        
        $totalSalesOrders = count($uniqueSalesOrders);
        $totalLines = count($uniqueLines);
        
        $html = '<div class="row mb-4">';
        $html .= '<div class="col-md-3"><div class="card bg-primary text-white"><div class="card-body"><h5>' . $totalSalesOrders . '</h5><p>Sales Orders</p></div></div></div>';
        $html .= '<div class="col-md-3"><div class="card bg-info text-white"><div class="card-body"><h5>' . $totalLines . '</h5><p>SO Lines</p></div></div></div>';
        $html .= '<div class="col-md-3"><div class="card bg-success text-white"><div class="card-body"><h5>' . $totalItems . '</h5><p>Total Items</p></div></div></div>';
        $html .= '<div class="col-md-3"><div class="card bg-warning text-white"><div class="card-body"><h5>' . $graphicsOnlyItems . '</h5><p>Graphics Items</p></div></div></div>';
        $html .= '</div>';
        
        $html .= '<div class="row mb-4">';
        $html .= '<div class="col-md-12"><div class="card bg-dark text-white"><div class="card-body text-center"><h5>' . number_format($totalQuantityNeeded) . '</h5><p>Total Quantity Needed</p></div></div></div>';
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
        
        $html .= '<p><strong>Debug information available in development mode.</strong></p>';
        $html .= '</div>';
        
        return $html;
    }

    private function generateOrgChartView($groupedResults, $allPartsLookup)
    {
        $html = '<div class="orgchart-container">';
        foreach ($groupedResults as $salesOrder => $lines) {
            $html .= '<div class="mb-4">';
            $html .= '<div class="orgchart-node" style="background:#e3f2fd;"><i class="fas fa-shopping-cart"></i> Sales Order: <span class="part">' . htmlspecialchars($salesOrder) . '</span></div>';
            foreach ($lines as $lineNumber => $bomLevels) {
                $html .= '<div class="orgchart-node" style="background:#fffbe7;margin-left:2em;"><i class="fas fa-list-ol"></i> Line <span class="part">' . htmlspecialchars($lineNumber) . '</span></div>';
                // Only one group [0] after buildHierarchicalOrder
                foreach ($bomLevels as $levelRows) {
                    $html .= $this->renderOrgChartList($levelRows, $allPartsLookup);
                }
            }
            $html .= '</div>';
        }
        $html .= '</div>';
        return $html;
    }

    private function renderOrgChartList($rows, $allPartsLookup, $level = 0)
    {
        if (empty($rows)) return '';
        $html = '<ul class="orgchart-list">';
        foreach ($rows as $row) {
            $part = htmlspecialchars($row['item_part'] ?? $row['so_part']);
            $desc = htmlspecialchars($row['item_description'] ?? '');
            $qty = number_format($row['qty_needed'], 2);
            $actualLevel = $row['bom_level'] ?? 0;
            $levelBadge = $actualLevel == 0 ? '<span class="badge bg-warning level-badge">Parent</span>' : '<span class="badge bg-primary level-badge">L' . $actualLevel . '</span>';
            $html .= '<li>';
            $html .= '<div class="orgchart-node">';
            $html .= '<span class="part">' . $part . '</span>';
            if ($desc) $html .= ' <span class="desc">' . $desc . '</span>';
            $html .= ' <span class="qty">Qty: ' . $qty . '</span>';
            $html .= $levelBadge;
            $html .= '</div>';
            // Find children (if any)
            $children = [];
            foreach ($rows as $child) {
                if (($child['parent_component'] ?? '') === $part && ($child['item_part'] ?? '') !== $part) {
                    $children[] = $child;
                }
            }
            if (!empty($children)) {
                $html .= $this->renderOrgChartList($children, $allPartsLookup, $level + 1);
            }
            $html .= '</li>';
        }
        $html .= '</ul>';
        return $html;
    }

    private function generateFolderStructureView($groupedResults, $allPartsLookup)
    {
        $html = '<div class="folder-structure-container">';
        $html .= '<style>
        .folder-structure-container { font-family: "Segoe UI", Arial, sans-serif; }
        .folder-tree, .folder-tree ul { list-style: none; margin: 0; padding-left: 1.5em; position: relative; }
        .folder-tree ul { margin-left: 1.5em; }
        .folder-tree li { margin: 0.5em 0; position: relative; }
        .folder-tree li::before {
            content: "";
            position: absolute;
            top: 0;
            left: -1em;
            border-left: 2px solid #6c757d;
            height: 100%;
        }
        .folder-tree li:last-child::before { height: 1em; }
        .folder-label {
            cursor: pointer;
            display: flex;
            align-items: center;
            font-size: 1em;
            padding: 0.2em 0.5em;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .folder-label:hover { background: #f1f3f4; }
        .folder-icon { margin-right: 0.5em; color: #0d6efd; }
        .file-icon { margin-right: 0.5em; color: #198754; }
        .folder-children { display: none; }
        .folder-open > .folder-children { display: block; }
        .folder-open > .folder-label .folder-icon { color: #ffc107; }
        </style>';
        $html .= '<script>
        function toggleFolder(el) {
            el.parentElement.classList.toggle("folder-open");
        }
        </script>';

        foreach ($groupedResults as $salesOrder => $lines) {
            $html .= '<ul class="folder-tree">';
            $html .= '<li class="folder-open">';
            $html .= '<div class="folder-label" onclick="toggleFolder(this)"><span class="folder-icon"><i class="fas fa-folder"></i></span>Sales Order: <b>' . htmlspecialchars($salesOrder) . '</b></div>';
            $html .= '<ul class="folder-children">';
            foreach ($lines as $lineNumber => $bomLevels) {
                $html .= '<li class="folder-open">';
                $html .= '<div class="folder-label" onclick="toggleFolder(this)"><span class="folder-icon"><i class="fas fa-folder"></i></span>Line <b>' . htmlspecialchars($lineNumber) . '</b></div>';
                $html .= '<ul class="folder-children">';
                // Only one group [0] after buildHierarchicalOrder
                foreach ($bomLevels as $levelRows) {
                    $html .= $this->renderFolderTree($levelRows, $allPartsLookup);
                }
                $html .= '</ul></li>';
            }
            $html .= '</ul></li></ul>';
        }
        $html .= '</div>';
        return $html;
    }

    private function renderFolderTree($rows, $allPartsLookup, $parent = null)
    {
        // Build a map of children by parent_component
        $childrenMap = [];
        foreach ($rows as $row) {
            $parentKey = $row['parent_component'] ?? 'SO Part';
            $childrenMap[$parentKey][] = $row;
        }
        // Recursive render function
        $render = function($parentKey) use (&$render, $childrenMap, $allPartsLookup) {
            if (empty($childrenMap[$parentKey])) return '';
            $html = '<ul class="folder-tree">';
            foreach ($childrenMap[$parentKey] as $row) {
                $part = htmlspecialchars($row['item_part'] ?? $row['so_part']);
                $desc = htmlspecialchars($row['item_description'] ?? '');
                $qty = number_format($row['qty_needed'], 2);
                $actualLevel = $row['bom_level'] ?? 0;
                $isParent = isset($childrenMap[$part]);
                $icon = $isParent ? '<span class="folder-icon"><i class="fas fa-folder"></i></span>' : '<span class="file-icon"><i class="fas fa-file"></i></span>';
                $label = $icon . $part . ($desc ? ' <span class="text-muted">' . $desc . '</span>' : '') . ' <span class="badge bg-secondary ms-2">Qty: ' . $qty . '</span>' . ($actualLevel == 0 ? ' <span class="badge bg-warning">Parent</span>' : '');
                if ($isParent) {
                    $html .= '<li class="folder-open"><div class="folder-label" onclick="toggleFolder(this)">' . $label . '</div>';
                    $html .= '<ul class="folder-children">' . $render($part) . '</ul></li>';
                } else {
                    $html .= '<li>' . $label . '</li>';
                }
            }
            $html .= '</ul>';
            return $html;
        };
        // Start from 'SO Part' or null
        return $render($parent ?? 'SO Part');
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
$showOnlyGraphics = isset($_GET['graphics_only']) && $_GET['graphics_only'] == '1';

$results = $data->getGraphicsDemandReport($daysOut, $maxBomLevels, $showOnlyLevel, $salesOrderNumber, $showOnlyGraphics);

// Build level filter description
$levelFilter = '';
if ($showOnlyLevel !== null) {
    $levelFilter = $showOnlyLevel === 0 ? ' (Parent Parts Only)' : ' (BOM Level ' . $showOnlyLevel . ' Only)';
}

$graphicsFilter = $showOnlyGraphics ? ' (Graphics Parts Only)' : '';

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
        .tree-view-container {
            font-family: "Courier New", monospace;
        }
        .tree-node {
            margin: 5px 0;
            padding: 8px 12px;
            border-left: 3px solid transparent;
            background: #f8f9fa;
            border-radius: 4px;
            transition: all 0.2s;
        }
        .tree-node:hover {
            background: #e9ecef;
        }
        .tree-node.level-0 {
            border-left-color: #ffc107;
            background: #fff3cd;
            font-weight: bold;
        }
        .tree-node.level-1 {
            border-left-color: #0d6efd;
            margin-left: 20px;
        }
        .tree-node.level-2 {
            border-left-color: #6f42c1;
            margin-left: 40px;
        }
        .tree-node.level-3 {
            border-left-color: #d63384;
            margin-left: 60px;
        }
        .tree-node.level-4 {
            border-left-color: #fd7e14;
            margin-left: 80px;
        }
        .tree-node.level-5 {
            border-left-color: #198754;
            margin-left: 100px;
        }
        .part-number {
            font-weight: bold;
            color: #0d6efd;
        }
        .graphics-part {
            color: #198754;
        }
        .quantity {
            font-weight: bold;
            color: #dc3545;
        }
        .description {
            color: #6c757d;
            font-style: italic;
        }
        .status-badge {
            font-size: 0.75em;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .so-header {
            background: #0d6efd;
            color: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            font-size: 1.1em;
            font-weight: bold;
        }
        .line-header {
            background: #17a2b8;
            color: white;
            padding: 10px;
            margin: 8px 0;
            border-radius: 6px;
            font-weight: bold;
        }
        .tree-connector {
            color: #6c757d;
            margin-right: 8px;
        }
        .orgchart-container { font-family: "Segoe UI", Arial, sans-serif; }
        .orgchart-list, .orgchart-list ul { list-style: none; padding-left: 1.5em; }
        .orgchart-list { margin: 0; }
        .orgchart-node { margin: 0.5em 0; padding: 0.5em 1em; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6; display: inline-block; }
        .orgchart-node .part { font-weight: bold; color: #0d6efd; }
        .orgchart-node .desc { color: #6c757d; font-size: 0.95em; }
        .orgchart-node .qty { color: #dc3545; font-weight: bold; margin-left: 1em; }
        .orgchart-node .level-badge { margin-left: 0.5em; font-size: 0.85em; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2><i class="fas fa-chart-line"></i> Graphics Demand Report' . $levelFilter . $graphicsFilter . '</h2>
        
        <div class="controls">
            <h5><i class="fas fa-cogs"></i> Report Controls:</h5>
            <p><strong>Current Parameters:</strong> Days Out: ' . $daysOut . ', Max BOM Levels: ' . $maxBomLevels . ', Show Level: ' . ($showOnlyLevel !== null ? $showOnlyLevel : 'All') . ', Sales Order: ' . ($salesOrderNumber ?: 'All') . ', Graphics Only: ' . ($showOnlyGraphics ? 'Yes' : 'No') . '</p>
            <div class="row">
                <div class="col-md-8">
                    <p><strong>Quick Links:</strong></p>
                    <div class="btn-group mb-2" role="group">
                        <a href="?days=300&max_levels=5" class="btn btn-outline-primary btn-sm">All Levels</a>
                        <a href="?days=300&max_levels=5&level=0" class="btn btn-outline-warning btn-sm">Parents Only</a>
                        <a href="?days=60&max_levels=3" class="btn btn-outline-info btn-sm">60 Days</a>
                        <a href="?' . http_build_query(array_merge($_GET, ['debug' => '1'])) . '" class="btn btn-outline-danger btn-sm">Debug Mode</a>
                    </div>
                    <br>
                    <div class="btn-group" role="group">
                        <a href="?' . http_build_query(array_merge($_GET, ['graphics_only' => '0'])) . '" class="btn btn-outline-success btn-sm' . (!$showOnlyGraphics ? ' active' : '') . '">Show All BOM Items</a>
                        <a href="?' . http_build_query(array_merge($_GET, ['graphics_only' => '1'])) . '" class="btn btn-outline-primary btn-sm' . ($showOnlyGraphics ? ' active' : '') . '">Show Graphics Only</a>
                    </div>
                </div>
            </div>
        </div>
        
        <p><small class="text-muted">Generated on: ' . date('Y-m-d H:i:s') . '</small></p>
        ' . $data->convertToTable($results) . '
    </div>
</body>
</html>';