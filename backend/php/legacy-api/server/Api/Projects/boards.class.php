<?php

class Boards
{
    
    protected $db; 
    public $sessionId;
    
    public function __construct($db)
    {
    
        $this->db = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->nowDateTime = date("Y-m-d H:i:s", time());
        
    }	

    public function transactions($trans)
    {
        
        foreach($trans as $item) {
            $field = isset($item['field']) ? $item['field'] : "";
            $o = isset($item['o']) ? $item['o'] : "";
            $n = isset($item['n']) ? $item['n'] : "";
            $createDate = $this->nowDateTime;
            $comment = isset($item['comment']) ? $item['comment'] : "";
            $userId = $this->sessionId;
            $uniqueId = isset($item['uniqueId']) ? $item['uniqueId'] : "";
            $type = isset($item['type']) ? $item['type'] : "";
            $board_id = isset($item['board_id']) ? $item['board_id'] : 0;
            $task_name = isset($item['task_name']) ? $item['task_name'] : "";
            
            
            $qry = '
                INSERT INTO projects.project_trans (
                    field
                    , o
                    , n
                    , createDate
                    , comment
                    , userId
                    , uniqueId
                    , type
                    , board_id
                    , task_name
                ) 
                VALUES( 
                    :field
                    , :o
                    , :n
                    , :createDate
                    , :comment
                    , :userId
                    , :uniqueId
                    , :type
                    , :board_id
                    , :task_name
                )
            ';
            
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':field', $field, PDO::PARAM_STR);
            $stmt->bindParam(':o', $o, PDO::PARAM_STR);
            $stmt->bindParam(':n', $n, PDO::PARAM_STR);
            $stmt->bindParam(':createDate', $createDate, PDO::PARAM_STR);
            $stmt->bindParam(':comment', $comment, PDO::PARAM_STR);
            $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
            $stmt->bindParam(':uniqueId', $uniqueId, PDO::PARAM_INT);
            $stmt->bindParam(':type', $type, PDO::PARAM_STR);
            $stmt->bindParam(':board_id', $board_id, PDO::PARAM_STR);
            $stmt->bindParam(':task_name', $task_name, PDO::PARAM_STR);
            $stmt->execute(); 
        }
    }

    //ReadAll
    public function readTransactions($workOrderId)
    {
        $mainQry = "
            SELECT a.id 
                , a.field 
                , a.o 
                , a.n 
                , a.createDate 
                , a.comment 
                , a.userId 
                , a.uniqueId 
                , a.type 
                , a.reasonCode 
                , a.workOrderId 
                , concat(b.first, ' ', b.last) modifiedBy
                , a.task_name
            FROM projects.project_trans a
            LEFT JOIN db.users b ON a.userId = b.id 
            WHERE a.workOrderId = :workOrderId
            ORDER BY a.createDate DESC
            LIMIT 30
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":workOrderId", $workOrderId, PDO::PARAM_INT);
        $query->execute(); 	
        $row = $query->fetchAll(PDO::FETCH_ASSOC);
        return $row;
    }	

    // read all items
    public function getById($table_name, $id)
    {

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
                
                , a.status
                , a.deleted
                , start_date
                , due_date

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
                , b.group_owner_name
                , b.group_owner
                , c.shareable
                , c.shareable_token
                , c.todo_update_progress
                , TRUNCATE(IFNULL(
                    a.percent_complete
                , 0), 2) percent_complete

                , a.to_do_auto_progress
                , a.linked_board_id
                
                , IFNULL(e.linked_hits, 0) linked_hits
                , e.linked_due_date_max
                , e.linked_start_date_min 
                , IFNULL(e.linked_status_completed, 0) linked_status_completed
                , IFNULL(e.linked_percent_completed, 0) linked_percent_completed
                , e.linked_status_completed_count
                , a.seq
                , a.requestor
                , a.comments
            FROM projects.items a
            join (
                select a.id 
                    , a.board_id 
                    , a.title 
                    , a.position 
                    , a.deleted 
                    , a.color 
                    , a.archived 
                    , a.created_by 
                    , a.created_at 
                    , a.group_owner 
                    , concat(b.first, ' ', b.last) group_owner_name
                    , a.seq
                from projects.groups a
                LEFT JOIN db.users b ON a.group_owner = b.id 
                WHERE a.deleted = 0
            ) b ON b.id = a.group_id
            
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

            left join (
                select count(*) linked_hits
                    , max(due_date) linked_due_date_max
                    , min(start_date) linked_start_date_min
                    , board_id
                    , TRUNCATE(IFNULL(( sum(case when status = 'Complete' then 1 else 0 end) / count(*)) * 100,0), 2) linked_status_completed
                    , TRUNCATE(IFNULL(( sum(percent_complete) / count(*)),0), 2) linked_percent_completed
                    , sum(case when status = 'Complete' then 1 else 0 end) linked_status_completed_count
                from projects.items
                WHERE deleted = 0
                group by board_id
            ) e ON e.board_id = a.linked_board_id
            
            WHERE a.id = :id

        ";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        // $mainQry = "
        //     SELECT *
        //     FROM " . $table_name . " a
        //     WHERE a.id = :id
        // ";
        // $query = $this->db->prepare($mainQry);
        // $query->bindParam(":id", $id, PDO::PARAM_INT);
        // $query->execute(); 	
        return $stmt->fetch();
    }


    // read all items
    public function subscribers($board_id){
    
        // select all query
        $q = "
            SELECT a.id 
                , a.board_id 
                , a.user_id
                , concat(b.first, ' ', b.last) user_name
                , b.email
                , a.owner
            FROM projects.owners a
            LEFT JOIN db.users b ON a.user_id = b.id 
            where board_id = :board_id
            order by a.owner DESC
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':board_id', $board_id);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    // update Subscribers
    public function updateSubscribers($data){
    
        $board_id = ISSET($data['board_id']) ? $data['board_id'] : 0;
        $user_id = ISSET($data['user_id']) ? $data['user_id'] : '';
        $owner = ISSET($data['owner']) ? $data['owner'] : 0;
        $id = ISSET($data['id']) ? $data['id'] : 0;

        $q = "
            UPDATE projects.owners 
            SET user_id = :user_id
                , board_id = :board_id
                , owner = :owner
            where id = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':user_id', $user_id);
        $query->bindParam(':board_id', $board_id);
        $query->bindParam(':owner', $owner);
        $query->bindParam(':id', $id);
        $query->execute();
        
    }

    // update Subscribers
    public function deleteSubscribers($data){
    
        $user_name = ISSET($data['user_name']) ? $data['user_name'] : 0;
        $board_id = ISSET($data['board_id']) ? $data['board_id'] : 0;
        $id = ISSET($data['id']) ? $data['id'] : 0;

        $q = "
            DELETE FROM projects.owners 
            where id = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':id', $id);
        $query->execute();

        $trans[] = array(
            'field' => 'Unsubscribed'
            , 'o' => ''
            , 'n' => $user_name
            , 'comment' => ''
            , 'uniqueId' => 0
            , 'type' => 'Projects'
            , 'board_id' => $board_id
        );

        //$this->transactions($trans);
        
    }

    // update Subscribers
    public function createSubscribers($data){
    
        $user_id = ISSET($data['user_id']) ? $data['user_id'] : 0;
        $board_id = ISSET($data['board_id']) ? $data['board_id'] : 0;
        $user_name = ISSET($data['user_name']) ? $data['user_name'] : 0;
        $email = ISSET($data['email']) ? $data['email'] : 0;
        $owner = ISSET($data['owner']) ? $data['owner'] : 0;
        $p_owner = ISSET($data['p_owner']) ? $data['p_owner'] : 0;

        $q = "
            INSERT INTO projects.owners(
                user_id,
                board_id, 
                owner, 
                p_owner

            ) VALUES (
                :user_id,
                :board_id, 
                :owner, 
                :p_owner
            )
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':user_id', $user_id);
        $query->bindParam(':board_id', $board_id);
        $query->bindParam(':owner', $owner);
        $query->bindParam(':p_owner', $p_owner);
        $query->execute();
        $lastInsertId = $this->db->lastInsertId();

        $obj = array(
            "id" => $lastInsertId,
            "board_id" => $board_id,
            "user_id" => $user_id,
            "user_name" => $user_name,
            "email" => $email,
            "owner" => $owner,
            "p_owner" => $p_owner,
        );

        $trans[] = array(
            'field' => 'Subscribed'
            , 'o' => ''
            , 'n' => $user_name
            , 'comment' => ''
            , 'uniqueId' => 0
            , 'type' => 'Projects'
            , 'board_id' => $board_id
        );

        $this->transactions($trans);

        return $obj;
        
    }


    // read all items
    public function getGroups($board_id){
    
        // select all query
        $q = "
            SELECT *
            FROM projects.groups a
            where board_id = :board_id
            ORDER BY seq ASC
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':board_id', $board_id);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    // read all items
    public function getViews($board_id){
    
        // select all query
        $q = "
            SELECT a.name 
                , a.filter filter
                , filter_by_person filter_by_person
                , 'false' edit
                , a.id
            FROM projects.views a
            where board_id = :board_id
                AND created_by = :user_id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':board_id', $board_id);
        $query->bindParam(':user_id', $this->sessionId);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

     // read all items
     public function createFilterView($data){
    
        $name = ISSET($data['name']) ? $data['name'] : 0;
        $board_id = ISSET($data['board_id']) ? $data['board_id'] : 0;
        $filter = ISSET($data['filter']) ? $data['filter'] : 0;
        $filter_by_person = ISSET($data['filter_by_person']) ? $data['filter_by_person'] : 0;

        $q = "
            INSERT INTO projects.views(
                name,
                filter, 
                board_id, 
                created_by, 
                filter_by_person

            ) VALUES (
                :name,
                :filter, 
                :board_id, 
                :created_by, 
                :filter_by_person
            )
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':name', $name);
        $query->bindParam(':filter', $filter);
        $query->bindParam(':board_id', $board_id);
        $query->bindParam(':created_by', $this->sessionId);
        $query->bindParam(':filter_by_person', $filter_by_person);
        $query->execute();
        $lastInsertId = $this->db->lastInsertId();

        return array(
            "id" => $lastInsertId
        );
    }

    // read all items
    public function checkBoardPermissions($board_id){
        $q = "
            SELECT permission 
            FROM projects.boards
            WHERE id = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':id', $board_id);
        $query->execute();
        $o = $query->fetch();

        if($o['permission'] == 'View Only'){
            throw new PDOException('View Only');
        }

    }

    // read all items
    public function deleteView($data){
        $q = "
            DELETE FROM projects.views
            WHERE id = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':id', $data['id']);
        $query->execute();

    }

    // read all items
    public function updateView($data){
        $q = "
            UPDATE projects.views
            set name = :name
            WHERE id = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':id', $data['id']);
        $query->bindParam(':name', $data['name']);
        $query->execute();

    }

    // read all items
    public function getBoards($id = false){
    
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
                , a.todo_update_progress
                , max(a.id) board_id
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

        if($id){
            $q .= ' WHERE a.id = ' . $id;
        }else{
            $q .= ' 
            
                left join projects.owners b ON b.board_id = a.id
                WHERE ( a.created_by = ' . $this->sessionId . ' OR b.user_id = ' . $this->sessionId . ' OR a.board_kind = "Main") AND 
                a.deleted = 0

            ';

        }
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
                , a.todo_update_progress
        ";
        
        $query = $this->db->prepare($q);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        return array(
            "results" => $results,
            "getBoardKindTypes" => $this->getBoardKindTypes()
        );
    }
    
    // read all items
    public function getBoardKindTypes(){
        $obj = array();
        $q = "
            SELECT a.id 
                , a.name 
                , a.icon 
                , a.colors
                , a.description
            FROM projects.board_kind_types a
        ";
        $query = $this->db->prepare($q);
        $query->execute(); 
        return $query->fetchAll(PDO::FETCH_ASSOC); 
    }

    
    // read all items
    public function statusColors(){
        $obj = array();
        $q = "
            SELECT *
            FROM projects.status_colors a
        ";
        $query = $this->db->prepare($q);
        $query->execute(); 
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    // read all items
    public function toDoList($board_id){
        $q = "
            SELECT *
            FROM projects.to_do_list a
            where board_id = :board_id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':board_id', $board_id);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    
    // read all items
    public function getTodoList($board_id, $item_id){
        $q = "
        SELECT *
            FROM projects.to_do_list a
            where board_id = :board_id
                AND item_id = :item_id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':board_id', $board_id);
        $query->bindParam(':item_id', $item_id);
        $query->execute();
        $l = $query->fetchAll(PDO::FETCH_ASSOC);

        foreach($l as &$rowToDoListInfo){
            $rowToDoListInfo['done'] = $rowToDoListInfo['done'] == 'true' ? true : false;
        }

        return $l;
    }
    
    // read all items
    public function toDoListUpdate($data){
        $q = "
            UPDATE projects.to_do_list 
            SET todoText = :todoText
                , done = :done
            where id = :id
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':todoText', $data['todoText']);
        $query->bindParam(':done', $data['done']);
        $query->bindParam(':id', $data['id']);
        $query->execute();
    }
    
    // read all items
     public function toDoListAdd($data){

        
        $q = "
            INSERT INTO projects.to_do_list(
                board_id,
                todoText, 
                done, 
                created_by, 
                created_at,
                item_id

            ) VALUES (
                :board_id,
                :todoText, 
                :done, 
                :created_by, 
                :created_at,
                :item_id
            )
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':board_id', $data['board_id']);
        $query->bindParam(':todoText', $data['todoText']);
        $query->bindParam(':done', $data['done']);
        $query->bindParam(':created_by', $this->sessionId);
        $query->bindParam(':created_at', $this->nowDateTime);
        $query->bindParam(':item_id', $data['item_id']);
        $query->execute();
        $lastInsertId = $this->db->lastInsertId();

        return array(
            "id" => $lastInsertId
        );
    }

    // read all items
    public function getBoardById($board_id){


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
        $query = $this->db->prepare($comments);
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
                
                , a.status
                , a.deleted
                , start_date
                , due_date

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
                , b.group_owner_name
                , b.group_owner
                , c.shareable
                , c.shareable_token
                , c.todo_update_progress
                , TRUNCATE(IFNULL(
                    a.percent_complete
                , 0), 2) percent_complete

                , a.to_do_auto_progress
                , a.linked_board_id
                
                , IFNULL(e.linked_hits, 0) linked_hits
                , e.linked_due_date_max
                , e.linked_start_date_min 
                , IFNULL(e.linked_status_completed, 0) linked_status_completed
                , IFNULL(e.linked_percent_completed, 0) linked_percent_completed
                , e.linked_status_completed_count
                , a.seq
                , a.requestor
                , a.comments
            FROM projects.items a
            join (
                select a.id 
                    , a.board_id 
                    , a.title 
                    , a.position 
                    , a.deleted 
                    , a.color 
                    , a.archived 
                    , a.created_by 
                    , a.created_at 
                    , a.group_owner 
                    , concat(b.first, ' ', b.last) group_owner_name
                    , a.seq
                from projects.groups a
                LEFT JOIN db.users b ON a.group_owner = b.id 
                WHERE a.deleted = 0
            ) b ON b.id = a.group_id
            
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

            left join (
                select count(*) linked_hits
                    , max(due_date) linked_due_date_max
                    , min(start_date) linked_start_date_min
                    , board_id
                    , TRUNCATE(IFNULL(( sum(case when status = 'Complete' then 1 else 0 end) / count(*)) * 100,0), 2) linked_status_completed
                    , TRUNCATE(IFNULL(( sum(percent_complete) / count(*)),0), 2) linked_percent_completed
                    , sum(case when status = 'Complete' then 1 else 0 end) linked_status_completed_count
                from projects.items
                WHERE deleted = 0
                group by board_id
            ) e ON e.board_id = a.linked_board_id
            
            WHERE a.board_id = :board_id
            AND a.deleted = 0

            ORDER BY 
                CASE WHEN b.seq IS NOT NULL THEN b.seq ELSE a.created_at END ASC, a.seq ASC

        ";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':board_id', $board_id);
        $stmt->execute();

        // $query = "
        //     SELECT * FROM projects.tasks
        // ";
        // $stmt = $this->db->prepare($query);
        // $stmt->bindParam(':board_id', $board_id);
        // $stmt->execute();
        
        $products_arr=array();

        $rowData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $boardPermissionOptions = array();

        $boardPermissionOptions[] = array( 
            "id" => 1, 
            "name" => "Edit Everything",
            "icon" => "feather icon-unlock
            ", 
            "details" => ""
        ); 
        $boardPermissionOptions[] = array( 
            "id" => 2, 
            "name" => "Edit Content",
            "icon" => "feather icon-file-text", 
            "details" => "Team members can only edit the content of the board, but cant change the board structure."
        ); 
        $boardPermissionOptions[] = array( 
            "id" => 3, 
            "name" => "Edit rows assigned to them in the Owner column",
            "icon" => "feather icon-edit-3", 
            "details" => "Team members can only edit rows assigned to them"
        ); 
        $boardPermissionOptions[] = array( 
            "id" => 4,  
            "name" => "View Only",
            "icon" => "feather icon-lock", 
            "details" => "Team members can only view and write updates."
        ); 
        
        $toDoListInfo = $this->toDoList($board_id);

        foreach($rowData as $row){ 
            // $row['todo_update_progress'] = $row['todo_update_progress'] == 'true' ? true : false;
            // $row['to_do_auto_progress'] = $row['to_do_auto_progress'] == 'true' ? true : false;
            // $row['toDoListInfo'] = array();
            // foreach($toDoListInfo as $rowToDoListInfo){

            //     if($row['id'] == $rowToDoListInfo['item_id']){
            //         $rowToDoListInfo['done'] = $rowToDoListInfo['done'] == 'true' ? true : false;
            //         $row['toDoListInfo'][] = $rowToDoListInfo;
            //     }
            
            // }

            //comments
            // $row['COMMENTS'] = true;
            // $row['COMMENTSMAX'] = "";
            // $row['COMMENTSCLASS'] = "";
            
            // foreach($commentInfo as $rowComments){
            //     if($row['id'] == $rowComments['unique_id']){
            //         $row['COMMENTS'] = true;
            //         $row['COMMENTSMAX'] = $rowComments['comments'];
            //         $row['COMMENTSCOUNT'] = $rowComments['hits'];
                    
            //         ///color the comments 
            //         if($rowComments['byDate'] == $this->nowDate){
            //             $row['COMMENTSCLASS'] = "text-success";
            //         }else{
            //             $row['COMMENTSCLASS'] = "text-info";
            //         }
                    
            //     }
            // }

            $products_arr[] = $row;
        }


        
        $boardResults = $this->getBoards($board_id)['results'];
        $viewResults = $this->getViews($board_id);
        $owners = $this->subscribers($board_id);

        //check if user has access to this board. 

        $boardResults = (object) $boardResults[0];
        
        
        $boardResults->statusColors =$this->statusColors();

        $boardResults->todo_update_progress = filter_var($boardResults->todo_update_progress , FILTER_VALIDATE_BOOLEAN);


        foreach($boardPermissionOptions as $row){
            if($row['name'] == $boardResults->permission){
                $boardResults->permissions = $row;
            }

        }
        
        return array(
            "results" => $products_arr
            , "boardResults" => $boardResults
            , "viewResults" => $viewResults 
            , "owners" => $owners
            , "getBoardKindTypes" => $this->getBoardKindTypes()
            , "commentInfo" => $commentInfo
            , "boardPermissionOptions" => $boardPermissionOptions
            
        );
        
        http_response_code(200);
    }

    public function createComments($data)
    {
        $q = "
            INSERT INTO projects.comments (
                board_id
                , unique_id 
                , user_id 
                , comments
                , type
                , created_date

            ) VALUES (
                :board_id
                , :unique_id 
                , :user_id 
                , :comments
                , :type
                , :created_date
            )
        ";
        $query = $this->db->prepare($q);
        $query->bindParam(':board_id', $data['board_id'] , PDO::PARAM_INT);
        $query->bindParam(':unique_id', $data['unique_id'] , PDO::PARAM_INT);
        $query->bindParam(':user_id', $this->sessionId , PDO::PARAM_INT);
        $query->bindParam(':comments', $data['comments'] , PDO::PARAM_STR);
        $query->bindParam(':type', $data['type'] , PDO::PARAM_STR);
        $query->bindParam(':created_date', $this->nowDateTime , PDO::PARAM_STR);
        $query->execute();
        $lastInsertId = $this->db->lastInsertId();

        return array(
            "id" => $lastInsertId
        );

    }

    public function getComments($board_id, $id)
        {
            
        $obj = array();
        $q = "
            SELECT a.id 
                , a.board_id 
                , a.unique_id 
                , a.user_id 
                , a.comments 
                , a.type 
                , a.created_date 
                , concat(b.first, ' ', b.last) created_by
            FROM projects.comments a
            LEFT JOIN db.users b ON b.id = a.user_id 
            WHERE a.type = 'Projects'
            AND a.board_id = :board_id
        ";

        if(ISSET($id)){
            $q .= '
                AND a.unique_id =  ' .$id. '
            ';
        }

        $q .= '
            ORDER BY a.created_date DESC
        ';
        $query = $this->db->prepare($q);
        $query->bindParam(':board_id', $board_id);
        $query->execute(); 
        return $query->fetchAll(PDO::FETCH_ASSOC); 
    }


    public function getActivity($board_id, $id){
        
        $q = "
            SELECT a.id 
                , a.field 
                , a.o 
                , a.n
                , a.createDate 
                , DATE_FORMAT(TIMEDIFF(now(), a.createDate), '%H:%i') createDateByHour
                , DATE_FORMAT(a.createDate, '%b %e, %Y @ %H:%i') createDateFormat
                , a.comment 
                , a.userId 
                , a.uniqueId 
                , a.type 
                , a.board_id
                , concat(b.first, ' ', b.last) user_name
                , a.task_name
            FROM projects.project_trans a
            LEFT JOIN db.users b on b.id = a.userId
            WHERE a.type = 'Projects'
                AND a.board_id = :board_id
            
        ";

        if(ISSET($id)){
            $q .= '
                AND a.uniqueId =  ' .$id. '
            ';
        }

        $q .= '
            ORDER BY a.createDate DESC
            LIMIT 30
        ';
        $query = $this->db->prepare($q);
        $query->bindParam(':board_id', $board_id);
        $query->execute(); 
        return $query->fetchAll(PDO::FETCH_ASSOC); 
    }

    public function createBoard($data){
    
        $this->db->beginTransaction();

        try {

            $q = "
                INSERT INTO projects.boards (
                    board_kind
                    , name 
                    , created_by 
                    , created_at
                    , owner

                ) VALUES (
                    :board_kind
                    , :name 
                    , :created_by 
                    , :created_at
                    , :owner
                )
            ";
            $query = $this->db->prepare($q);
            $query->bindParam(':board_kind', $data['board_kind'] , PDO::PARAM_STR);
            $query->bindParam(':name', $data['name'] , PDO::PARAM_STR);
            $query->bindParam(':created_by', $this->sessionId , PDO::PARAM_STR);
            $query->bindParam(':owner', $this->sessionId , PDO::PARAM_INT);
            $query->bindParam(':created_at', $this->nowDateTime , PDO::PARAM_STR);
            $query->execute();

            $lastInsertId = $this->db->lastInsertId();

            $addOwner = array(
                "user_id" => $this->sessionId
                , "board_id" => $lastInsertId
                , "owner" => 1
                , "p_owner" => 1
            );
            
            $this->createSubscribers($addOwner);

            $trans[] = array(
                'field' => 'Owner Created'
                , 'o' => ''
                , 'n' => $this->sessionId
                , 'comment' => ''
                , 'uniqueId' => 0
                , 'type' => 'Projects'
                , 'board_id' => $lastInsertId
            );

            $trans[] = array(
                'field' => 'New Board Created'
                , 'o' => ''
                , 'n' => $data['name']
                , 'comment' => ''
                , 'uniqueId' => $lastInsertId
                , 'type' => 'Projects'
                , 'board_id' => $lastInsertId
            );
            
            $obj = array(
                "id" => $lastInsertId
                , "board_kind" => $data['board_kind']
                , "name" => $data['name']
            );

            //create group
            $createGroupData = $this->createGroup(
                array(
                    "board_id" => $lastInsertId
                    , "group_id" => $lastInsertId
                )
            );
            
            //create items
            $array = array();
            $addItemsXTimes = 3;
            for($i = 0 ; $i < $addItemsXTimes; $i++){
                $array[] = array(
                    "name" => "item " . $i
                    , "board_id" => $lastInsertId
                    , "group_id" => isset($row['group_id']) ? $row['group_id'] : $createGroupData['id']
                );
            }

            $this->createItems($array);
            $this->transactions($trans);

            $this->db->commit();

            return $obj;

        } catch(PDOException $e) { 
            $this->db->rollBack();
        }

    }

    public function createGroup($data){

        $q = "
            INSERT INTO projects.groups (
                board_id
                , title 
                , position 
                , deleted 
                , color 
                , archived 
                , created_by 
                , created_at
                , group_id
                , group_owner

            ) VALUES (
                :board_id
                , :title 
                , :position 
                , :deleted 
                , :color 
                , :archived 
                , :created_by 
                , :created_at
                , :group_id
                , :group_owner
            )
        ";
        $query = $this->db->prepare($q);

        
        $board_id = ISSET($data['board_id']) ? $data['board_id'] : 0;
        $title = ISSET($data['title']) ? $data['title'] : 'Title name';
        $position = ISSET($data['position']) ? $data['position'] : 0;
        $color = ISSET($data['color']) ? $data['color'] : 'red';
        $deleted = ISSET($data['deleted']) ? $data['deleted'] : 0;
        $archived = ISSET($data['archived']) ? $data['archived'] : 0;
        $created_by = $this->sessionId;
        $group_owner = $this->sessionId;
        $created_at = $this->nowDateTime;
        $group_id = ISSET($data['group_id']) ? $data['group_id'] : 0;

        $query->bindParam(':board_id', $board_id , PDO::PARAM_INT);
        $query->bindParam(':title', $title , PDO::PARAM_STR);
        $query->bindParam(':position', $position , PDO::PARAM_STR);
        $query->bindParam(':color', $color , PDO::PARAM_STR);
        $query->bindParam(':deleted', $deleted , PDO::PARAM_INT);
        $query->bindParam(':archived', $archived , PDO::PARAM_INT);
        $query->bindParam(':created_by', $created_by , PDO::PARAM_STR);
        $query->bindParam(':group_owner', $group_owner , PDO::PARAM_INT);
        $query->bindParam(':created_at', $created_at , PDO::PARAM_STR);
        $query->bindParam(':group_id', $group_id , PDO::PARAM_INT);
        $query->execute();

        $lastInsertId = $this->db->lastInsertId();

        $obj = array(
            "id" => $lastInsertId
        );

        $trans[] = array(
            'field' => 'New Group Created'
            , 'o' => ''
            , 'n' => $title
            , 'comment' => ''
            , 'uniqueId' => $lastInsertId
            , 'type' => 'Projects'
            , 'board_id' => $board_id
        );

        $this->transactions($trans);

        return $obj;
    }

    public function createItems($dataArraY = array()){

        $obj = array();
        $q = "
            INSERT INTO projects.items (
                board_id
                , group_id 
                , name 
                , state 
                , creator 
                , created_at 
                , owner 
                , priority
                , due_date
                , status
                , creator_id
                , completed_on
                , due_date_original
                , percent_complete
                , start_date
                , to_do_auto_progress
                , last_updated
                , last_updated_by
                , seq

            ) VALUES (
                :board_id
                , :group_id 
                , :name 
                , :state 
                , :creator 
                , :created_at 
                , :owner 
                , :priority
                , :due_date
                , :status
                , :creator_id
                , :completed_on
                , :due_date_original
                , :percent_complete
                , :start_date
                , :to_do_auto_progress
                , :last_updated
                , :last_updated_by
                , :seq
            )
        ";
        
        $query = $this->db->prepare($q);

        $array = array();
        foreach($dataArraY as $row){

            $board_id = ISSET($row['board_id']) ? $row['board_id'] : 0;
            $group_id = ISSET($row['group_id']) ? $row['group_id'] : 0;
            $name = ISSET($row['name']) ? $row['name'] : '';
            $state = ISSET($row['state']) ? $row['state'] : '';
            $creator = $this->sessionId;
            $creator_id = $this->sessionId;
            $created_at = $this->nowDateTime;
            $owner = ISSET($row['owner']) && $row['owner'] != '' ? $row['owner'] : null;
            $priority = ISSET($row['priority']) ? $row['priority'] : '';
            $due_date = ISSET($row['due_date']) ? $row['due_date'] : null;
            $status = ISSET($row['status']) ? $row['status'] : '';
            $completed_on = ISSET($row['completed_on']) && $row['completed_on'] != '' ? $row['completed_on'] : null;
            $due_date_original = ISSET($row['due_date_original']) && $row['due_date_original'] != '' ? $row['due_date_original'] : null;
            $percent_complete = ISSET($row['percent_complete']) ? $row['percent_complete'] : '';
            $group_title = ISSET($row['group_title']) ? $row['group_title'] : '';
            $start_date = ISSET($row['start_date']) ? $row['start_date'] : null;
            $to_do_auto_progress = ISSET($row['to_do_auto_progress']) ? $row['to_do_auto_progress'] : false;
            $seq = ISSET($row['seq']) && $row['seq'] != '' ? $row['seq'] : null;
            $last_updated = $this->nowDateTime;
            $last_updated_by = $this->sessionId;

            $query->bindParam(':board_id', $board_id , PDO::PARAM_INT);
            $query->bindParam(':group_id', $group_id , PDO::PARAM_INT);
            $query->bindParam(':name', $name , PDO::PARAM_STR);
            $query->bindParam(':state', $state , PDO::PARAM_INT);
            $query->bindParam(':creator', $creator , PDO::PARAM_STR);
            $query->bindParam(':creator_id', $creator_id , PDO::PARAM_STR);
            $query->bindParam(':created_at', $created_at , PDO::PARAM_STR);
            $query->bindParam(':owner', $owner , PDO::PARAM_STR);
            $query->bindParam(':priority', $priority , PDO::PARAM_STR);
            $query->bindParam(':due_date', $due_date , PDO::PARAM_STR);
            $query->bindParam(':status', $status , PDO::PARAM_STR);
            $query->bindParam(':completed_on', $completed_on , PDO::PARAM_STR);
            $query->bindParam(':due_date_original', $due_date_original , PDO::PARAM_STR);
            $query->bindParam(':percent_complete', $percent_complete , PDO::PARAM_INT);
            $query->bindParam(':start_date', $start_date , PDO::PARAM_STR);
            $query->bindParam(':to_do_auto_progress', $to_do_auto_progress , PDO::PARAM_STR);
            $query->bindParam(':last_updated', $last_updated , PDO::PARAM_STR);
            $query->bindParam(':last_updated_by', $last_updated_by , PDO::PARAM_STR);
            $query->bindParam(':seq', $seq , PDO::PARAM_INT);
            $query->execute();

            $lastInsertId = $this->db->lastInsertId();
            $array[] = $this->getById('projects.items', $lastInsertId);

            $trans[] = array(
                'field' => 'New Item Created'
                , 'o' => ''
                , 'n' => $name
                , 'comment' => ''
                , 'uniqueId' => $lastInsertId
                , 'type' => 'Projects'
                , 'board_id' => $board_id
                , 'task_name' => $name
            );

            // $obj[] = array(
            //     "id" => $lastInsertId,
            //     "board_id" => $board_id,
            //     "group_id" => $group_id,
            //     "name" => $name,
            //     "state" => $state,
            //     "creator" => $creator,
            //     "creator_id" => $creator_id,
            //     "created_at" => $created_at,
            //     "owner" => $owner,
            //     "priority" => $priority,
            //     "due_date" => $due_date,
            //     "status" => $status,
            //     "completed_on" => $completed_on,
            //     "due_date_original" => $due_date_original,
            //     "percent_complete" => $percent_complete,
            //     "group_title" => $group_title, 
            //     "start_date" => $start_date, 
            //     "to_do_auto_progress" => $to_do_auto_progress, 
            //     "last_updated" => $last_updated,  
            //     "last_updated_by" => $last_updated_by,
            //     "seq" => $seq,
            //     "deleted" => 0,
            //     "linked_board_id" => null
            // );

        }

        $this->transactions($trans);

        return $array;

    }

    public function updateItems($data = array())
    {
        

        $this->db->beginTransaction();


        try {
            $q = "
                UPDATE projects.items 
                SET board_id = :board_id
                    , group_id = :group_id 
                    , name = :name
                    , state = :state 
                    , owner = :owner 
                    , priority = :priority 
                    , due_date = :due_date 
                    , status = :status
                    , deleted = :deleted
                    , completed_on = :completed_on
                    , start_date = :start_date 
                    , percent_complete = :percent_complete 
                    , to_do_auto_progress = :to_do_auto_progress
                    , last_updated = :last_updated
                    , last_updated_by = :last_updated_by
                    , linked_board_id = :linked_board_id
                    , seq = :seq
                    , requestor = :requestor
                    , comments = :comments
                WHERE id = :id
            ";
            $query = $this->db->prepare($q);

            foreach($data as $row){
                
                $board_id = ISSET($row['board_id']) ? $row['board_id'] : 0;
                $group_id = ISSET($row['group_id']) ? $row['group_id'] : 0;
                $name = ISSET($row['name']) ? $row['name'] : '';
                $state = ISSET($row['state']) ? $row['state'] : '';
                $owner = ISSET($row['owner']) && $row['owner'] != '' ? $row['owner'] : null;
                $priority = ISSET($row['priority']) ? $row['priority'] : '';
                $due_date = ISSET($row['due_date']) ? $row['due_date'] : null;
                $status = ISSET($row['status']) ? $row['status'] : '';
                $deleted = ISSET($row['deleted']) ? $row['deleted'] : 0;
                $completed_on = ISSET($row['status']) && $row['status'] == 'Complete' ? $this->nowDateTime : null;
                $start_date = ISSET($row['start_date']) ? $row['start_date'] : null;
                $percent_complete = ISSET($row['percent_complete']) ? $row['percent_complete'] : '';
                $to_do_auto_progress = ISSET($row['to_do_auto_progress']) ? $row['to_do_auto_progress'] : false;
                $linked_board_id = ISSET($row['linked_board_id']) && $row['linked_board_id'] != "" ? $row['linked_board_id'] : null;
                $seq = ISSET($row['seq']) && $row['seq'] != '' ? $row['seq'] : null;
                $requestor = ISSET($row['requestor']) ? $row['requestor'] : null;
                $comments = ISSET($row['comments']) ? $row['comments'] : null;
                $last_updated = $this->nowDateTime;
                $last_updated_by = $this->sessionId;
                
                $id = $row['id'];


                //transactions
                $tr_trans = $this->getById('projects.items', $id);

                if(ISSET($tr_trans['board_id']) && $tr_trans['board_id'] != $board_id){
					$trans[] = array(
						'field' => 'Board Id changed'
						, 'o' => $tr_trans['board_id']
						, 'n' => $board_id
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['group_id']) && $tr_trans['group_id'] != $group_id){
					$trans[] = array(
						'field' => 'Group Id changed'
						, 'o' => $tr_trans['group_id']
						, 'n' => $group_id
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['name']) && $tr_trans['name'] != $name){
					$trans[] = array(
						'field' => 'Item Name changed'
						, 'o' => $tr_trans['name']
						, 'n' => $name
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['state']) && $tr_trans['state'] != $state){
					$trans[] = array(
						'field' => 'Item State changed'
						, 'o' => $tr_trans['state']
						, 'n' => $state
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['owner']) && $tr_trans['owner'] != $owner){
					$trans[] = array(
						'field' => 'Item Owner changed'
						, 'o' => $tr_trans['owner']
						, 'n' => $owner
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['priority']) && $tr_trans['priority'] != $priority){
					$trans[] = array(
						'field' => 'Item Priority changed'
						, 'o' => $tr_trans['priority']
						, 'n' => $priority
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['due_date']) && $tr_trans['due_date'] != $due_date){
					$trans[] = array(
						'field' => 'Item Due Date changed'
						, 'o' => $tr_trans['due_date']
						, 'n' => $due_date
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['status']) && $tr_trans['status'] != $status){
					$trans[] = array(
						'field' => 'Item Status changed'
						, 'o' => $tr_trans['status']
						, 'n' => $status
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['deleted']) && $tr_trans['deleted'] != $deleted){
					$trans[] = array(
						'field' => 'Item Deleted'
						, 'o' => $name
						, 'n' => ''
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['completed_on']) && $tr_trans['completed_on'] != $completed_on){
					$trans[] = array(
						'field' => 'Item Completed On Date Changed'
						, 'o' => $tr_trans['completed_on']
						, 'n' => $completed_on
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['start_date']) && $tr_trans['start_date'] != $start_date){
					$trans[] = array(
						'field' => 'Item Started Date Changed'
						, 'o' => $tr_trans['start_date']
						, 'n' => $start_date
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['percent_complete']) && $tr_trans['percent_complete'] != $percent_complete){
					$trans[] = array(
						'field' => 'Item Percent Completed Changed'
						, 'o' => $tr_trans['percent_complete']
						, 'n' => $percent_complete
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['to_do_auto_progress']) && $tr_trans['to_do_auto_progress'] != $to_do_auto_progress){
					$trans[] = array(
						'field' => 'todo auto progress Changed'
						, 'o' => $tr_trans['to_do_auto_progress']
						, 'n' => $to_do_auto_progress
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['requestor']) && $tr_trans['requestor'] != $requestor){
					$trans[] = array(
						'field' => 'Requestor Changed'
						, 'o' => $tr_trans['requestor']
						, 'n' => $requestor
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                if(ISSET($tr_trans['comments']) && $tr_trans['comments'] != $comments){
					$trans[] = array(
						'field' => 'Comments Changed'
						, 'o' => $tr_trans['comments']
						, 'n' => $comments
						, 'comment' => ''
						, 'uniqueId' => $id
						, 'type' => 'Projects'
						, 'board_id' => $board_id
                        , 'task_name' => $name
					);
				}
                

                $query->bindParam(':board_id', $board_id , PDO::PARAM_INT);
                $query->bindParam(':group_id', $group_id , PDO::PARAM_INT);
                $query->bindParam(':name', $name , PDO::PARAM_STR);
                $query->bindParam(':state', $state , PDO::PARAM_STR);
                $query->bindParam(':owner', $owner , PDO::PARAM_STR);
                $query->bindParam(':priority', $priority , PDO::PARAM_STR);
                $query->bindParam(':due_date', $due_date , PDO::PARAM_STR);
                $query->bindParam(':status', $status , PDO::PARAM_STR);
                $query->bindParam(':deleted', $deleted , PDO::PARAM_INT);
                $query->bindParam(':completed_on', $completed_on , PDO::PARAM_STR);
                $query->bindParam(':start_date', $start_date , PDO::PARAM_STR);
                $query->bindParam(':percent_complete', $percent_complete , PDO::PARAM_INT); 
                $query->bindParam(':to_do_auto_progress', $to_do_auto_progress , PDO::PARAM_STR); 
                $query->bindParam(':last_updated', $last_updated , PDO::PARAM_STR); 
                $query->bindParam(':last_updated_by', $last_updated_by , PDO::PARAM_INT);
                $query->bindParam(':linked_board_id', $linked_board_id , PDO::PARAM_INT);
                $query->bindParam(':seq', $seq , PDO::PARAM_INT);
                $query->bindParam(':requestor', $requestor , PDO::PARAM_STR);
                $query->bindParam(':comments', $comments , PDO::PARAM_STR);
                $query->bindParam(':id', $id , PDO::PARAM_INT);
                $query->execute();
            }

            //$this->transactions($trans);
            $this->db->commit();
			
        } catch(PDOException $e) { 
            $this->db->rollBack();
        }
    }

    public function updateGroup($data)
    {
        
        $trans = array();

        $q = "
            UPDATE projects.groups
            SET board_id = :board_id
                , title = :title 
                , position = :position
                , deleted = :deleted 
                , color = :color 
                , archived = :archived 
                , group_id = :group_id
            WHERE id = :id
        ";
        $query = $this->db->prepare($q);

        foreach($data as $row){

            $board_id = ISSET($row['board_id']) ? $row['board_id'] : 0;
            $title = ISSET($row['title']) ? $row['title'] : '';
            $position = ISSET($row['position']) ? $row['position'] : 0;
            $deleted = ISSET($row['deleted']) ? $row['deleted'] : 0;
            $color = ISSET($row['color']) ? $row['color'] : 0;
            $archived = ISSET($row['archived']) ? $row['archived'] : 0;
            $group_id = ISSET($row['group_id']) ? $row['group_id'] : 0;
            $id = ISSET($row['id']) ? $row['id'] : 0;

            //transactions
            $tr_row = $this->getById('projects.groups', $id);

            if(ISSET($tr_row['board_id']) && $tr_row['board_id'] != $board_id){
                $trans[] = array(
                    'field' => 'Board Id changed'
                    , 'o' => $tr_row['board_id']
                    , 'n' => $board_id
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $title
                );
            }
            if(ISSET($tr_row['title']) && $tr_row['title'] != $title){
                $trans[] = array(
                    'field' => 'Group Title changed'
                    , 'o' => $tr_row['title']
                    , 'n' => $title
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $title
                );
            }
            if(ISSET($tr_row['position']) && $tr_row['position'] != $position){
                $trans[] = array(
                    'field' => 'Group Position changed'
                    , 'o' => $tr_row['position']
                    , 'n' => $position
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $title
                );
            }
            if(ISSET($tr_row['deleted']) && $tr_row['deleted'] != $deleted){
                $trans[] = array(
                    'field' => 'Deleted Group'
                    , 'o' => $tr_row['deleted']
                    , 'n' => $deleted
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $title
                );
            }
            if(ISSET($tr_row['color']) && $tr_row['color'] != $color){
                $trans[] = array(
                    'field' => 'Group Color Changed'
                    , 'o' => $tr_row['color']
                    , 'n' => $color
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $title
                );
            }
            if(ISSET($tr_row['archived']) && $tr_row['archived'] != $archived){
                $trans[] = array(
                    'field' => 'Group Archived Changed'
                    , 'o' => $tr_row['archived']
                    , 'n' => $archived
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $title
                );
            }
            if(ISSET($tr_row['group_id']) && $tr_row['group_id'] != $group_id){
                $trans[] = array(
                    'field' => 'Group Id Changed'
                    , 'o' => $tr_row['group_id']
                    , 'n' => $group_id
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $title
                );
            }

            $query->bindParam(':board_id', $board_id , PDO::PARAM_INT);
            $query->bindParam(':title', $title , PDO::PARAM_STR);
            $query->bindParam(':position', $position , PDO::PARAM_INT);
            $query->bindParam(':deleted', $deleted , PDO::PARAM_INT);
            $query->bindParam(':color', $color , PDO::PARAM_STR);
            $query->bindParam(':archived', $archived , PDO::PARAM_INT);
            $query->bindParam(':group_id', $group_id , PDO::PARAM_INT);
            $query->bindParam(':id', $id , PDO::PARAM_INT);
            $query->execute();
        }
        
        $this->transactions($trans);
            
    }

    public function updateBoard($data)
    {

        // if($data->todo_update_progress){

        // }
        $trans= array();

        $q = "
            UPDATE projects.boards
            SET board_kind = :board_kind
                , name = :name 
                , description = :description
                , permission = :permission 
                , owner = :owner 
                , state = :state 
                , position = :position
                , deleted = :deleted
                , shareable = :shareable
                , include_report = :include_report
                , shareable_token = :shareable_token
                , todo_update_progress = :todo_update_progress
            WHERE id = :id
        ";
        $query = $this->db->prepare($q);

        foreach($data as $row){

            $board_kind = ISSET($row['board_kind']) ? $row['board_kind'] : '';
            $name = ISSET($row['name']) ? $row['name'] : '';
            $description = ISSET($row['description']) ? $row['description'] : '';
            $permission = ISSET($row['permission']) ? $row['permission'] : '';
            $owner = ISSET($row['owner']) ? $row['owner'] : null;
            $state = ISSET($row['state']) ? $row['state'] : '';
            $position = ISSET($row['position']) && $row['position'] != '' ? $row['position'] : 0; 
            $deleted = ISSET($row['deleted']) ? $row['deleted'] : 0;
            $board_id = ISSET($row['board_id']) ? $row['board_id'] : 0;
            $shareable = ISSET($row['shareable']) ? $row['shareable'] : 0;
            $include_report = ISSET($row['include_report']) ? $row['include_report'] : 0;
            $shareable_token = ISSET($row['shareable_token']) ? $row['shareable_token'] : 0;
            $todo_update_progress = ISSET($row['todo_update_progress']) ? $row['todo_update_progress'] : 0;
            $id = ISSET($row['id']) ? $row['id'] : 0;

            //transactions
            $tr_row = $this->getById('projects.boards', $id);

            if(ISSET($tr_row['board_kind']) && $tr_row['board_kind'] != $board_kind){
                $trans[] = array(
                    'field' => 'Board Kind changed'
                    , 'o' => $tr_row['board_kind']
                    , 'n' => $board_kind
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['name']) && $tr_row['name'] != $name){
                $trans[] = array(
                    'field' => 'Board Name changed'
                    , 'o' => $tr_row['name']
                    , 'n' => $name
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['description']) && $tr_row['description'] != $description){
                $trans[] = array(
                    'field' => 'Board Description changed'
                    , 'o' => $tr_row['description']
                    , 'n' => $description
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['permission']) && $tr_row['permission'] != $permission){
                $trans[] = array(
                    'field' => 'Board Permission changed'
                    , 'o' => $tr_row['permission']
                    , 'n' => $permission
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['owner']) && $tr_row['owner'] != $owner){
                $trans[] = array(
                    'field' => 'Board Owner changed'
                    , 'o' => $tr_row['owner']
                    , 'n' => $owner
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['state']) && $tr_row['state'] != $state){
                $trans[] = array(
                    'field' => 'Board State changed'
                    , 'o' => $tr_row['state']
                    , 'n' => $state
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['position']) && $tr_row['position'] != $position){
                $trans[] = array(
                    'field' => 'Board Position changed'
                    , 'o' => $tr_row['position']
                    , 'n' => $position
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['deleted']) && $tr_row['deleted'] != $deleted){
                $trans[] = array(
                    'field' => 'Board Deleted'
                    , 'o' => $name
                    , 'n' => ''
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['shareable']) && $tr_row['shareable'] != $shareable){
                $trans[] = array(
                    'field' => 'Shareable updated'
                    , 'o' => $shareable
                    , 'n' => ''
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['include_report']) && $tr_row['include_report'] != $include_report){
                $trans[] = array(
                    'field' => 'Include report updated'
                    , 'o' => $include_report
                    , 'n' => ''
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['shareable_token']) && $tr_row['shareable_token'] != $shareable_token){
                $trans[] = array(
                    'field' => 'Shareable Token updated'
                    , 'o' => $shareable_token
                    , 'n' => ''
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            if(ISSET($tr_row['todo_update_progress']) && $tr_row['todo_update_progress'] != $todo_update_progress){
                $trans[] = array(
                    'field' => 'todo update progress updated'
                    , 'o' => $todo_update_progress
                    , 'n' => ''
                    , 'comment' => ''
                    , 'uniqueId' => $id
                    , 'type' => 'Projects'
                    , 'board_id' => $board_id
                    , 'task_name' => $name
                );
            }
            
            $query->bindParam(':board_kind', $board_kind , PDO::PARAM_STR);
            $query->bindParam(':name', $name , PDO::PARAM_STR);
            $query->bindParam(':description', $description , PDO::PARAM_STR);
            $query->bindParam(':permission', $permission , PDO::PARAM_STR);
            $query->bindParam(':owner', $owner , PDO::PARAM_NULL);
            $query->bindParam(':state', $state , PDO::PARAM_STR);
            $query->bindParam(':position', $position , PDO::PARAM_INT);
            $query->bindParam(':deleted', $deleted , PDO::PARAM_INT);
            $query->bindParam(':shareable', $shareable , PDO::PARAM_INT);
            $query->bindParam(':include_report', $include_report , PDO::PARAM_INT);
            $query->bindParam(':shareable_token', $shareable_token , PDO::PARAM_STR);
            $query->bindParam(':todo_update_progress', $todo_update_progress , PDO::PARAM_STR);
            $query->bindParam(':id', $id , PDO::PARAM_INT);
            $query->execute();
        }
        
        $this->transactions($trans);
            
    }



    public function readStatus()
    {
        
        $q = "
            SELECT status
                , count(*) hits 
            FROM projects.items
            group by status
        ";
        $query = $this->db->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function shareable()
    {
        
        $q = "
            SELECT status
                , count(*) hits 
            FROM projects.items
            group by status
        ";
        $query = $this->db->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

}
