
    <?php
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$mainQry = " 
	SELECT a.truck_license_plate, SUM(hits) total_errors
	FROM forms.vehicle_inspection_header a
	LEFT JOIN (
		SELECT COUNT(*) hits, forklift_checklist_id 
		FROM 
		forms.vehicle_inspection_details
		WHERE STATUS = 0 AND resolved_confirmed_date IS NULL
		GROUP BY forklift_checklist_id
	) b ON b.forklift_checklist_id = a.id
	WHERE  a.truck_license_plate = :license
	GROUP BY a.truck_license_plate
";
$mainQry = " 
	SELECT a.truck_license_plate, b.id, checklist_name, a.date_created, a.id checklist_id
	FROM forms.vehicle_inspection_header a
	 JOIN (
		SELECT  forklift_checklist_id, id, checklist_name
		FROM 
		forms.vehicle_inspection_details
		WHERE STATUS = 0 AND resolved_confirmed_date IS NULL
		
	) b ON b.forklift_checklist_id = a.id
	WHERE  a.truck_license_plate = :license
";
$query = $db->prepare($mainQry);
$query->bindParam(':license', $_GET['license'], PDO::PARAM_STR);
$query->execute();
$results =  $query->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
