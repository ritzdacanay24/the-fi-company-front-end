<?php

namespace EyefiDb\Api\at_risk;

use PDO;
use PDOException;

class AtRisk
{

	protected $db;
	public $sessionId;
	public $user_full_name;
	public $nowDate;

	public function __construct($db)
	{
		$this->db = $db;
	}

	public function save($post)
	{
		$comm = $post['comments'];
		function removeHtml($comment)
		{
			$newComment = strip_tags($comment);
			$newComment = html_entity_decode($newComment);
			$newComment = str_replace(chr(194), " ", $newComment);
			return $newComment;
		}
		$plainHtml = removeHtml($post['comments']);

		$qry = "
				INSERT INTO eyefidb.comments(
					comments
					, createdDate
					, orderNum
					, userId
					, type
					, pageApplied
					, pageName
					, comments_html
				) 
				values(
					:comments
					, :createdDate
					, :orderNum
					, :userId
					, :type
					, :pageApplied
					, :pageName
					, :comments_html
				)
			";
		$stmt = $this->db->prepare($qry);
		$stmt->bindParam(':comments', $post['comments'], PDO::PARAM_STR);
		$stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
		$stmt->bindParam(':orderNum', $post['orderNum'], PDO::PARAM_STR);
		$stmt->bindParam(':type', $post['type'], PDO::PARAM_STR);
		$stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
		$stmt->bindParam(':pageApplied', $post['locationPath'], PDO::PARAM_STR);
		$stmt->bindParam(':pageName', $post['pageName'], PDO::PARAM_STR);
		$stmt->bindParam(':comments_html', $plainHtml, PDO::PARAM_STR);
		$stmt->execute();
		$updatedId = $this->db->lastInsertId();

		echo implode(',', $post['toEmail']);
		if ($post['toEmail']) {
			$msg = $plainHtml;

			// use wordwrap() if lines are longer than 70 characters
			$msg = wordwrap($msg, 70);
			$msg = utf8_encode($msg);

			$link 	  = APP_SITEURL . '#' . $post['url']  . '?globalView_commentId=' . $post['orderNum'];

			$to      = implode(',', $post['toEmail']);
			$cc      = implode(',', $post['toCC']);
			$subject = $post['subject'];

			$message = '<html><body>';
			$message .= "<br>";
			$message .= $comm;
			// $message .= "<br><br>";
			// $message .= "Recovery date: " . $post['recoveryDate'];
			$message .= "<br><br>";
			$message .= $post['type'] . ": " . $post['orderNum'];
			$message .= "<br>";
			$message .= "To reply to this comment, click <a href='{$link}'> here </a>. ";
			$message .= "<br>";
			$message .= "This comment was added by " . $this->user_full_name;
			$message .= "</body></html>";

			$headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n" .
				'Reply-To:' . MAIL_EMAIL . "\r\n";
			$headers .= "Cc: $cc\r\n";
			$headers .= "Reply-To: " . ($to) . "\r\n";
			$headers .= "Return-Path: " . ($to) . "\r\n";
			$headers .= "MIME-Version: 1.0\r\n";
			$headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
			$headers .= "Content-Transfer-Encoding: 64bit\r\n";
			$headers .= "X-Priority: 1\r\n";
			$headers .= "X-Mailer: PHP" . phpversion() . "\r\n";


			mail($to, $subject, $message, $headers);
		}
	}
}
