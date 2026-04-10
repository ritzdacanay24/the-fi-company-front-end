<?php
// filepath: /var/www/html/server/Api/FieldServiceMobile/trip-expense/getPredictApi.php

/**
 * API Key Rotation System
 * Switches between two API keys every 7 days starting from today
 */

// Define the two API keys
// $apiKeys = [
//     'key1' => 'fc735213fb88a525f2b21710e8050455',
//     'key2' => 'b2294d761e71417bbf8b18e8371dcc62'
// ];

// // Define the start date (today)
// $startDate = new DateTime('2025-01-25'); // Today's date

// // Calculate which key to use based on current date
// $currentDate = new DateTime();
// $daysDifference = $currentDate->diff($startDate)->days;

// // Determine which key period we're in (every 7 days)
// $keyPeriod = floor($daysDifference / 7) % 2;

// // Select the appropriate API key
// $currentApiKey = $keyPeriod === 0 ? $apiKeys['key1'] : $apiKeys['key2'];

// // Optional: Add debug information (remove in production)
// $debugInfo = [
//     'current_api_key' => $currentApiKey,
//     'start_date' => $startDate->format('Y-m-d'),
//     'current_date' => $currentDate->format('Y-m-d'),
//     'days_since_start' => $daysDifference,
//     'key_period' => $keyPeriod,
//     'next_switch_date' => $currentDate->add(new DateInterval('P' . (7 - ($daysDifference % 7)) . 'D'))->format('Y-m-d')
// ];

// Return the current API key
echo json_encode("md_dDpvruhnQKhMKCP50tiaVZygqQSV6LF2");

// Uncomment the line below if you want to see debug information
// echo json_encode($debugInfo);
?>