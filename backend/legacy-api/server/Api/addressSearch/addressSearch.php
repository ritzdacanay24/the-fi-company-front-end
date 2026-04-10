<?php

$q = $_GET['q'];

$url = "https://api.tomtom.com/search/2/search/$q.json?key=KrCCpKUkIeNDTqz4XfAj5MI56UsdZ9NM&typeahead=true&limit=100&ofs=0&countrySet=us&extendedPostalCodesFor=POI,Str,XStr,Addr";
$obj = json_decode(file_get_contents($url), true);
echo json_decode($obj);