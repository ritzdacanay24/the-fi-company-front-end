<?php

namespace EyefiDb\Api\users;

use PDO;
use PDOException;

class Users
{

    protected $db;

    public function __construct($db)
    {

        $this->db = $db;
    }
    

    public function getById($id)
    {
        $qry = "
            SELECT id
                , concat(first, ' ', last) name
                , email id
                , first 
                , last 
                , parentId 
                , title 
                , image
                , area
                , active
                , workArea
                , createdDate
                , lastLoggedIn
                , geo_location_consent
            FROM db.users
            WHERE id = :id
        ";
        $query = $this->db->prepare($qry);
        $query->bindParam(':id', $id, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function getCommentUsers()
    {
        $qry = "
            SELECT id uniuqe
                , concat(first, ' ', last) value
                , email id
                , first 
                , last 
                , parentId 
                , title 
                , image
                , area
                , active
                , workArea
                , createdDate
                , lastLoggedIn
            FROM db.users
            WHERE active = 1 
                AND email != ''
            ORDER BY concat(first, ' ', last) ASC
        ";
        $query = $this->db->prepare($qry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function ReadAllUsers()
    {
        $qry = "
            SELECT id
                , concat(first, ' ', last) full_name
                , concat(first, ' ', last) name
                , email
                , first 
                , last 
                , parentId 
                , title 
                , area 
                , active 
                , workArea
                , createdDate 
                , lastLoggedIn 
                , CASE WHEN date_format(lastLoggedIn, '%Y-%m-%d') != '0000-00-00' THEN date_format(lastLoggedIn, '%Y-%m-%d') END lastLoggedIn
                , concat(time_format(createdDate, '%i%s'), id) pin
                , access
                , image
                , case 
                when title =  '' and email = ''
                    THEN 'bg-light-dark' 
                    when employeeType =  4
                        THEN 'bg-maroon' 
                    when employeeType =  3 
                        THEN 'bg-light-orange' 
                    when employeeType = 2 
                        THEN 'bg-light-green' 
                    when employeeType = 1 
                        THEN 'bg-light-blue' 
                END cssClass
            FROM db.users
            WHERE active = 1
        ";
        $query = $this->db->prepare($qry);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);


        foreach ($results as &$row) {
            $row['children'] = array();
        }

        return $results;
    }

    public function getByUserName($full_name)
    {

        $qry = "
				SELECT *,
                concat(time_format(createdDate, '%i%s'), id) pin

				FROM db.users a
				WHERE  concat(a.first, ' ', a.last) = :full_name OR email = :email
			";
        $query = $this->db->prepare($qry);
        $query->bindParam(':full_name', $full_name, PDO::PARAM_STR);
        $query->bindParam(':email', $full_name, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch();
    }
}
