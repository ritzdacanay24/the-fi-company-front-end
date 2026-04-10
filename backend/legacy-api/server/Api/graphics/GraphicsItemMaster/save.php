<?php
include_once __DIR__ . '/graphics_item_master.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new GraphicsItemMaster($db);

$newObj = array();

try {

    $post = json_decode(file_get_contents('php://input'), true);

    if (isset($_GET['type']) &&  $_GET['type'] == 'update') {
        $newObj = $data->updateById($post['id'], 'eyefidb.graphicsInventory', $post);
    } else if (isset($_GET['type']) &&  $_GET['type'] == 'insert') {
        $l[] = $post;
        $data->insert('eyefidb.graphicsInventory', $l);
        $newObj = "Record created";
    } else {
        if ($_GET['typeOfTransaction'] == 'update') {
            $newObj = $data->updateById($_POST['id'], 'eyefidb.graphicsInventory', $_POST);
        }
        if ($_GET['typeOfTransaction'] == 'insert') {
            $l[] = $_POST;
            $newObj = $data->insert('eyefidb.graphicsInventory', $l);
        }

        if ($_GET['typeOfTransaction'] == 'insertImage2') {

            if (isset($_FILES) && (count($_FILES)) > 0) {
                foreach ($_FILES as $key => $file) {
                    $filename = basename($_FILES[$key]['name']);
                    $file1 = $_FILES[$key]['tmp_name'];
                    $base_dir = '/attachments_mount/Yellowfish/';
                    $target = $_SERVER['DOCUMENT_ROOT'] . $base_dir . $filename;
                    $move = move_uploaded_file($file1, $target);
                }

                if ($move) {
                    $newObj[] = array('status' => 'success', 'message' => 'File is valid, and was successfully uploaded');
                } else {
                    $newObj[] = array('status' => 'failure', 'message' => 'Upload failed');
                }
            } else {
                $newObj[] = array('status' => 'failure', 'message' => 'Select File');
            }
        }

        if ($_GET['typeOfTransaction'] == 'updateRevision') {
            $newObj = $data->updateRevision($_POST);
        }
    }



    echo $db_connect->json_encode($newObj);
} catch (PDOException $e) {
}
