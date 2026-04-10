<?php
//  ini_set('display_errors', 1);
//  ini_set('display_startup_errors', 1);
//  error_reporting(E_ALL);

include_once '/var/www/config/.core.php';

$servername = getenv('DB_HOST_NAME');
$username = getenv('DB_USER_NAME');
$password = getenv('DB_PASSWORD');
$dbname =  getenv('DB_NAME');


$nowDate = date("Y-m-d", time());
$nowDateTime = date("Y-m-d H:i:s", time());

try {

    $dbh = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    // set the PDO error mode to exception
    $dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if (isset($_GET['shareable']) && $_GET['shareable'] != '') {
        $q = "
                SELECT shareable_token
                    , id
                FROM projects.boards
                WHERE shareable_token = :shareable_token
                and shareable = 1
            ";
        $query = $dbh->prepare($q);
        $query->bindParam(':shareable_token', $_GET['shareable']);
        $query->execute();
        $check = $query->fetch(PDO::FETCH_ASSOC);


        if ($check['id']) {

            $board_id = $check['id'];
            $obj = array();
            $comments = "
                    SELECT a.unique_id
                        , a.comments
                        , a.created_date
                        , date(a.created_date) byDate
                        , b.hits
                    FROM projects.comments a
                    INNER JOIN (
                        SELECT unique_id
                            , MAX(id) id
                            , MAX(date(created_date)) created_date
                            , count(*) hits
                        FROM projects.comments
                        GROUP BY unique_id
                    ) b ON a.unique_id = b.unique_id AND a.id = b.id
                    WHERE type = 'Projects'
                ";
            $query = $dbh->prepare($comments);
            $query->execute();
            $commentInfo = $query->fetchAll(PDO::FETCH_ASSOC);

            $query = "
                    SELECT a.id 
                        , a.board_id 
                        , a.name
                        , a.state 
                        , a.creator 
                        , a.created_at 
                        , a.creator_id 
                        , a.owner 
                        , a.priority 
                        , a.due_date 
                        , a.status
                        , a.deleted
                        , a.start_date
                        , date(a.completed_on) completed_on
                        , c.include_report

                        , b.id group_id 
                        , b.title group_title
                        , b.position group_position
                        , b.deleted group_deleted
                        , b.color group_color
                        , b.archived group_archived
                        , b.created_by group_created_by
                        , b.created_at group_created_at
                        , c.shareable
                        , c.shareable_token

                        
                        , TRUNCATE(IFNULL(CASE 
                            WHEN todo_update_progress = 'true' 
                                THEN (completed/hits)*100
                            ELSE a.percent_complete 
                        END, 0), 2) percent_complete
                        ,a.requestor
                    FROM projects.items a
                    join projects.groups b on b.id = a.group_id AND b.deleted = 0
                    join projects.boards c ON c.id = a.board_id AND c.deleted = 0
                    
                    left join (
                        select count(item_id) hits
                            , sum(case when done = 'true' then 1 else 0 end) completed
                            , board_id
                            , item_id
                        from projects.to_do_list 
                        group by board_id, item_id
                    ) d ON d.board_id = a.board_id 
                        AND item_id = a.id

                    WHERE a.board_id = :board_id
                        AND a.deleted = 0
                    ORDER BY a.created_at ASC
                ";
            $stmt = $dbh->prepare($query);
            $stmt->bindParam(':board_id', $board_id);
            $stmt->execute();

            $products_arr = array();


            $rowData = $stmt->fetchAll(PDO::FETCH_ASSOC);


            $boardPermissionOptions = array();

            $boardPermissionOptions[] = array(
                "id" => 1,
                "name" => "Edit Everything",
                "icon" => "icon-newspaper",
                "details" => ""
            );
            $boardPermissionOptions[] = array(
                "id" => 2,
                "name" => "Edit Content",
                "icon" => "icon-files-empty2",
                "details" => "Team members can only edit the content of the board, but cant change the board structure."
            );
            $boardPermissionOptions[] = array(
                "id" => 3,
                "name" => "Edit rows assigned to them in the Owner column",
                "icon" => "icon-pencil",
                "details" => "Team members can only edit rows assigned to them"
            );
            $boardPermissionOptions[] = array(
                "id" => 4,
                "name" => "View Only",
                "icon" => "icon-file-locked",
                "details" => "Team members can only view and write updates."
            );

            foreach ($rowData as $row) {
                //comments
                $row['COMMENTS'] = true;
                $row['COMMENTSMAX'] = "";
                $row['COMMENTSCLASS'] = "";

                foreach ($commentInfo as $rowComments) {
                    if ($row['id'] == $rowComments['unique_id']) {
                        $row['COMMENTS'] = true;
                        $row['COMMENTSMAX'] = $rowComments['comments'];
                        $row['COMMENTSCOUNT'] = $rowComments['hits'];

                        ///color the comments 
                        if ($rowComments['byDate'] == $nowDate) {
                            $row['COMMENTSCLASS'] = "text-success";
                        } else {
                            $row['COMMENTSCLASS'] = "text-info";
                        }
                    }
                }

                $products_arr[] = $row;
            }



            // select all query
            $q = "
                    SELECT max(a.id) id 
                        , a.board_kind
                        , a.name 
                        , case when a.description = '' OR a.description IS NULL then 'Add Description' else a.description END description
                        , a.permission
                        , a.owner 
                        , a.state 
                        , a.position 
                        , a.created_by 
                        , a.created_at
                        , 'false' edit
                        , a.deleted
                        , c.icon
                        , c.colors
                        , c.tooltip
                        , a.shareable
                        , a.include_report
                        , a.shareable_token
                    FROM projects.boards a
                    left join (
                        SELECT a.id 
                            , a.name 
                            , a.icon 
                            , a.colors
                            , a.description
                            , a.tooltip
                        FROM projects.board_kind_types a

                    ) c ON c.name = a.board_kind
                ";

            $q .= ' WHERE a.id = ' . $board_id;
            $q .= "
                    group by 
                        a.board_kind
                        , a.name 
                        , case when a.description = '' OR a.description IS NULL then 'Add Description' else a.description END
                        , a.permission
                        , a.owner 
                        , a.state 
                        , a.position 
                        , a.created_by 
                        , a.created_at
                        , 'false'
                        , a.deleted
                        , c.icon
                        , c.colors
                        , c.tooltip
                        , a.shareable
                        , a.include_report
                        , a.shareable_token
                ";

            $query = $dbh->prepare($q);
            $query->execute();
            $boardResults = $query->fetchAll(PDO::FETCH_ASSOC);


            //check if user has access to this board. 

            $boardResults = $boardResults[0];

            $boardResults->permissions = new stdClass;

            foreach ($boardPermissionOptions as $row) {
                if ($row['name'] == $boardResults->permission) {
                    $boardResults->permissions = $row;
                }
            }

            $obj = array(
                "results" => $products_arr, "boardResults" => $boardResults, "commentInfo" => $commentInfo, "boardPermissionOptions" => $boardPermissionOptions
            );


            echo json_encode(array(
                "message" => "success",
                "status" => 1,
                "data" => $obj
            ));
        } else {
            echo json_encode(array(
                "message" => "invalid token",
                "status" => 0
            ));
        }
    } else {
        echo json_encode(array(
            "message" => "invalid token not set",
            "status" => 0
        ));
    }
} catch (PDOException $e) {
    echo $e->getMessage();
}
