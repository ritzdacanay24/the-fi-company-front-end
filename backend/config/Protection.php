<?php

namespace EyefiDb\Config;

use \Firebase\JWT\JWT;
use Zend\Http\PhpEnvironment\Request;

class Protection
{

    public function __construct($protected = true)
    {
        $this->protectedSite = $protected;
    }

    public function getProtected()
    {

        /*
        * Bypass authentication for tablet-companion endpoints
        */
        $requestUri = $_SERVER['REQUEST_URI'] ?? '';
        $referer = $_SERVER['HTTP_REFERER'] ?? '';
        
        // Allow verification-session endpoints to be public (for tablet use)
        if (strpos($requestUri, '/verification-session/') !== false || 
            strpos($referer, 'tablet-companion.html') !== false) {
            return (object) array(
                'token' => null,
                'data' => (object) ['tablet_mode' => true],
                'message' => "Public Access - Tablet Mode",
                'code_status' => '200 Ok',
                'code' => '200'
            );
        }

        /*
        * Get all headers from the HTTP request
        */
        $request = new Request();

        $authHeader = $request->getHeader('Authorization');

        /*
        * Look for the 'authorization' header
	    */

        
        if ($authHeader) {
            /*
            * Extract the jwt from the Bearer
            */
            list($jwt) = sscanf($authHeader->toString(), 'Authorization: Bearer %s');


            if ($jwt) {

                try {

                    /*
                    * decode the jwt using the key from config
                    */
                    JWT::$leeway = JWT_LEEWWAY;
                    $token =  JWT::decode(str_replace('"', '', $jwt), APP_SECRET_KEY, array('HS256'));

                    

                    /*
                    * return protected asset
                    */
                    return (object) array(
                        'token' => $token,
                        'data' => (object) $token->data,
                        'message' => "Success",
                        'code_status' => '200 Ok',
                        'code' => '200'
                    );
                } catch (\Exception $e) {

                    /*
                    * the token was not able to be decoded.
                    * this is likely because the signature was not able to be verified (tampered token)
                    */

                    try {

                        //Southfi
                        $token1 =  JWT::decode(str_replace('"', '', $jwt), 'fne&9j^4kw1yxyyc)b-9qr9$7n#v2poa^ml!0b_5nut%z0hb)f', array('HS512'));
                        if ($token1) {
                            return (object) array(
                                'token' => $token1,
                                'data' => (object) $token1,
                                'message' => "Success",
                                'code_status' => '200 Ok',
                                'code' => '200'
                            );
                        } else {
                            header('HTTP/1.0 900 Unauthorized');
                            echo json_encode(array(
                                'message' => 'Expired Token',
                                'actualMessage' => 'Token validation failed',
                                'code_status' => '900 Bad Request',
                                'code' => '900'
                            ));
                            die();
                        }
                        
                        
                    } catch (\Exception $e2) {
                        header('HTTP/1.0 900 Unauthorized');
                        echo json_encode(array(
                            'message' => 'Expired Token',
                            'actualMessage' => $e2->getMessage(),
                            'code_status' => '900 Bad Request',
                            'code' => '900'
                        ));
                        die();
                    }
                }
            } else {
                /*
                * No token was able to be extracted from the authorization header
                */
                header('HTTP/1.0 900 Bad Request');
                echo json_encode(array(
                    'message' => 'Missing Token',
                    'actualMessage' => 'No token was able to be extracted from the authorization header',
                    'code_status' => '900 Bad Request',
                    'code' => '900'
                ));
                die();
            }
        } else {
            /*
            * The request lacks the authorization token
            */
            header('HTTP/1.0 900 Bad Request');
            echo json_encode(array(
                'message' => 'Missing Authorization Header',
                'actualMessage' => 'The request lacks the authorization token',
                'code_status' => '900 Bad Request',
                'code' => '900'
            ));
            die();
        }
    }
}
