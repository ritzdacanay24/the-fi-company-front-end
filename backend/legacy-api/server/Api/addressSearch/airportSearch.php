<?php

$q = $_GET["q"];
$lat = $_GET["lat"];
$lon = $_GET["lon"];
$radius = $_GET["radius"];
$limit = $_GET["limit"];
$categorySet = $_GET["categorySet"];

$url = "https://api.tomtom.com/search/2/nearbySearch/.json?lat=$lat&lon=$lon&radius=$radius&categorySet=$categorySet&key=KrCCpKUkIeNDTqz4XfAj5MI56UsdZ9NM&limit=$limit";
$obj = json_decode(file_get_contents($url), true);
echo json_encode($obj);


// $url = "https://api.tomtom.com/search/2/search/airport.json?lat=$lat&lon=$lon&radius=$radius&key=KrCCpKUkIeNDTqz4XfAj5MI56UsdZ9NM&limit=300";
// $obj = json_decode(file_get_contents($url), true);
// echo json_encode($obj);


// $url = "https://api.tomtom.com/search/2/poiCategories.json?key=KrCCpKUkIeNDTqz4XfAj5MI56UsdZ9NM&poiCategories=AIRPORT";
// $obj = json_decode(file_get_contents($url), true);
// echo json_encode($obj);