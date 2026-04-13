<?php

namespace EyefiDb\Api\auth;

use PDO;
use PDOException;

class Authorization
{

    protected $db;
    public $sessionId;

    public function __construct($db = null)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d H:i:s", time());
    }

    public function log($pathName)
    {
        function getBrowser()
        {
            $u_agent = $_SERVER['HTTP_USER_AGENT'];
            $bname = 'Unknown';
            $platform = 'Unknown';
            $version = "";

            //platform
            if (preg_match('/linux/i', $u_agent)) {
                $platform = 'Linux';
            } elseif (preg_match('/macintosh|mac os x/i', $u_agent)) {
                $platform = 'Mac';
            } elseif (preg_match('/windows|win32/i', $u_agent)) {
                $platform = 'Windows';
            } else {
                $platform = 'Other';
            }

            // Next get the name of the useragent yes seperately and for good reason
            if (preg_match('/MSIE/i', $u_agent) && !preg_match('/Opera/i', $u_agent)) {
                $bname = 'Internet Explorer';
                $ub = "MSIE";
            } elseif (preg_match('/Firefox/i', $u_agent)) {
                $bname = 'Mozilla Firefox';
                $ub = "Firefox";
            } elseif (preg_match('/Chrome/i', $u_agent)) {
                $bname = 'Google Chrome';
                $ub = "Chrome";
            } elseif (preg_match('/Safari/i', $u_agent)) {
                $bname = 'Apple Safari';
                $ub = "Safari";
            } elseif (preg_match('/Opera/i', $u_agent)) {
                $bname = 'Opera';
                $ub = "Opera";
            } elseif (preg_match('/Netscape/i', $u_agent)) {
                $bname = 'Netscape';
                $ub = "Netscape";
            } else {
                $bname = 'Other';
                $ub = "Other";
            }

            // finally get the correct version number
            $known = array('Version', $ub, 'other');
            $pattern = '#(?<browser>' . join('|', $known) .
                ')[/ ]+(?<version>[0-9.|a-zA-Z.]*)#';
            if (!preg_match_all($pattern, $u_agent, $matches)) {
                // we have no matching number just continue
            }

            // see how many we have
            $i = count($matches['browser']);
            if ($i != 1) {
                //we will have two since we are not using 'other' argument yet
                //see if version is before or after the name
                if (strripos($u_agent, "Version") < strripos($u_agent, $ub)) {
                    $version = $matches['version'][0];
                } else {
                    $version = $matches['version'][1];
                }
            } else {
                $version = $matches['version'][0];
            }

            // check if we have a number
            if ($version == null || $version == "") {
                $version = "?";
            }

            return array(
                'userAgent'                   => $u_agent,
                'browserName'             => $bname,
                'browserVersion'           => $version,
                'browserPlatform'          => $platform,
                'pattern'                          => $pattern
            );
        }

        $ua = getBrowser();

        $mainQry = '
            INSERT INTO db.logInfo (path, userId, createdDate, userAgent, browserName, browserVersion, browserPlatform) VALUES (:path, :userId, :createdDate, :userAgent, :browserName, :browserVersion, :browserPlatform)
        ';

        $stmt = $this->db->prepare($mainQry);
        $stmt->bindParam(":path", $pathName, PDO::PARAM_STR);
        $stmt->bindParam(":userId", $this->sessionId, PDO::PARAM_INT);
        $stmt->bindParam(":createdDate", $this->nowDate, PDO::PARAM_STR);
        $stmt->bindParam(":userAgent", $ua['userAgent'], PDO::PARAM_STR);
        $stmt->bindParam(":browserName", $ua['browserName'], PDO::PARAM_STR);
        $stmt->bindParam(":browserVersion", $ua['browserVersion'], PDO::PARAM_STR);
        $stmt->bindParam(":browserPlatform", $ua['browserPlatform'], PDO::PARAM_STR);
        $row = $stmt->execute();

        return $row;
    }
    public function verifyPinNumber($pin)
    {
        $obj = array();
        $mainQry = '
				SELECT a.id
					, TRIM(LEADING "0" FROM concat(time_format(a.createdDate, "%i%s"), a.id)) pin
					, employeeType
					, workArea
					, concat(first, " ", last) userName
				FROM db.users a
				WHERE TRIM(LEADING "0" FROM concat(time_format(a.createdDate, "%i%s"), a.id)) = :pin
			';
        $stmt = $this->db->prepare($mainQry);
        $stmt->bindParam(":pin", $pin, PDO::PARAM_INT);
        $stmt->execute();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['foundUpperManagment'] = $row['employeeType'] == 0 ? false : true;
            $obj[] = $row;
        };

        return array("details" => $obj);
    }

    public function getAllUsers()
    {
        $mainQry = "
            SELECT a.id
                , a.email
                , concat(a.first, ' ', a.last) fullname
                , concat(a.first, '', a.last) username
                , a.first
                , a.last
                , a.workArea
                , a.image avatar
                , a.area
                , a.employeeType
            FROM db.users a
            WHERE a.active = 1
                AND pass IS NOT NULL
                AND type != 3
        ";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll();
    }

    public function getUserData()
    {

        $mainQry = "
            SELECT a.id
                , a.email
                , a.first
                , a.last
                , a.loggedIn
                , a.city
                , a.state
                , a.admin
                , concat(time_format(a.createdDate, '%i%s'), a.id) pin
                , concat(a.first, ' ', a.last) full_name
                , a.type
                , a.employeeType
                , a.area
                , a.access
                , a.createdDate
                , a.attempts
                , a.lastUpdate
                , a.workArea
                , a.image
                , a.fileName
                , a.parentId
                , a.lastLoggedIn
                , a.fileName
                , a.address
                , a.address1
                , a.workPhone
                , a.title
                , a.zipCode
                , a.settings
                , a.employeeType1
                , CASE WHEN a.type = 1 THEN true else false END pinRequired
            FROM db.users a
            WHERE a.active = 1
            AND a.id = :userId
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":userId", $this->sessionId, PDO::PARAM_INT);
        $query->execute();
        $row = $query->fetch();

        $userAccessQry = "
                SELECT a.id
                , a.active
                , a.userId
                , a.writeGranted
                , a.readGranted 
                , a.pageId
                , a.route_title
                , a.route_name
                , concat(b.first, ' ' , b.last) fullName
                , b.employeeType1
                , b.employeeType 
                , b.email
            FROM db.useraccess a 
            LEFT JOIN db.users b ON b.id = a.userId  
        ";

        if ($row) {

            $routeName = json_decode($_COOKIE['curruntRoute']);

            //read access
            $userAccessInfo = $userAccessQry;
            $userAccessInfo .= ' WHERE a.userId = :id AND (a.route_name = :route_name OR a.route_name = :route_parent)';
            $userAccessInfoQry = $this->db->prepare($userAccessInfo);
            $userAccessInfoQry->bindParam(":id", $row['id'], PDO::PARAM_STR);
            $userAccessInfoQry->bindParam(":route_name", $routeName->route_name, PDO::PARAM_STR);
            $userAccessInfoQry->bindParam(":route_parent", $routeName->route_parent, PDO::PARAM_STR);
            $userAccessInfoQry->execute();
            $userAccessInfoResults = $userAccessInfoQry->fetch();

            $data = array();
            $data['userInfo'] = $row;
            $data['readAccess'] = $userAccessInfoResults ? true : false;
            $data['readAccess'] = true;
        } else {
            $data['userInfo'] = [];
            $data['readAccess'] = false;
        }

        return $data;
    }
}
