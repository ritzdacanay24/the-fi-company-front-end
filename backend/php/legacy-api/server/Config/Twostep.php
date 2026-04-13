<?php

namespace EyefiDb\Config;

use \Firebase\JWT\JWT;
use Zend\Http\PhpEnvironment\Request;
use Firebase\JWT\ExpiredException;

require '/var/www/html/server/Api/db_config.php';


class Twostep
{

    public function __construct($protected = true)
    {
        $this->protectedSite = $protected;
    }

    public function getProtected()
    {

        $enableTwostep = get_db_config('enableTwostep');

        if($enableTwostep == 0) return;

        /*
        * Get all headers from the HTTP request
        */
        $request = new Request();

        $authHeader = $request->getHeader('Authorizationtwostep');

        /*
        * Look for the 'authorization' header
	    */

        
        if ($authHeader) {
            /*
            * Extract the jwt from the Bearer
            */
            list($jwt) = sscanf($authHeader->toString(), 'Authorizationtwostep: Bearer %s');


            if ($jwt) {
                $secret_key = '77c7be081fc39abae9f69e0cdec4352fd701b51dcc3d54762a17ac35c8493954';

                try {

                    /*
                    * decode the jwt using the key from config
                    */

                    JWT::$leeway = 0; // $leeway in seconds
                    $token =  JWT::decode(str_replace('"', '', $jwt), $secret_key, array('HS256'));

                    /*
                    * return protected asset
                    */
                    return (object) array(
                        'token' => $token,
                        'jwt' => $jwt,
                        'message' => "Success",
                        'code_status' => '200 Ok',
                        'code' => 'TWOSTEP'
                    );
                } catch (ExpiredException $e) {
                    // provided JWT is trying to be used after "exp" claim.
                    
                    header('HTTP/1.0 900 Unauthorized');
                    echo json_encode(array(
                        'message' => ' Expired Token',
                        'actualMessage' => $e->getMessage(),
                        'code_status' => '900 Bad Request',
                        'code' => '900',
                        'code' => 'TWOSTEP'
                    ));
                    die();

                } catch (\Exception $e) {
                    header('HTTP/1.0 900 Unauthorized');
                    echo json_encode(array(
                        'message' => ' Expired Token',
                        'actualMessage' => $e->getMessage(),
                        'code_status' => '900 Bad Request',
                        'code' => '900',
                        'code' => 'TWOSTEP'
                    ));
                    die();
                }
            } else {
                /*
                * No token was able to be extracted from the authorization header
                */
                header('HTTP/1.0 900 Bad Request');
                echo json_encode(array(
                    'message' => ' Expired Token',
                    'code_status' => '900 Bad Request',
                        'code' => 'TWOSTEP'
                ));
                die();
            }
        } else {
            /*
            * The request lacks the authorization token
            */
            // header('HTTP/1.0 900 Bad Request');
            // echo json_encode(array(
            //     'message' => 'Token not found in request',
            //     'code_status' => '900 Bad Request',
            //             'code' => 'TWOSTEP'
            // ));
            // die();
        }
    }
}
