<?php
	   $session = $_GET['session'];
	   $type = $_GET['type'];
	   
	   if(isset($session) && isset($type))
	   {
			switch($type)
			{
			
				case 'node':
					
					$attachment = '/var/www/html/logs/'.$session.'.log';
				
					header($_SERVER["SERVER_PROTOCOL"] . " 200 OK");
					header("Cache-Control: public");
					header("Content-Type: text/plain");
					header("Content-Transfer-Encoding: Binary");
					header("Content-Length:".filesize($attachment));
					header("Content-Disposition: attachment; filename=".$session.".log");
					readfile($attachment);
					die;
				break;
				
				
				case 'csv':

					$db_con = new mysqli('localhost', 'root', 'infant', 'tablet_studies');
					$result = $db_con->query('SELECT * FROM `survey_'.$session.'`');
					if (!$result) die('Couldn\'t fetch records');
					$headers = array();

					while ($finfo = mysqli_fetch_field($result)) {
							$headers[] = $finfo->name;
                        }

					$fp = fopen('php://output', 'w');
					if ($fp && $result)
					{
						header('Content-Type: text/csv');
						header('Content-Disposition: attachment; filename="'.$session.'.csv"');
						header('Pragma: no-cache');
						header('Expires: 0');
						fputcsv($fp, $headers);
						while ($row = $result->fetch_array(MYSQLI_NUM))
						{
							fputcsv($fp, array_values($row));
						}
						die;
					}

				break;

				case 'sql':

					header($_SERVER["SERVER_PROTOCOL"] . " 200 OK");
					header("Cache-Control: public");
					header("Content-Type: text/plain");
					header("Content-Transfer-Encoding: Binary");
					header("Content-Disposition: attachment; filename=".$session.".sql");

					$command = "mysqldump --opt -h localhost -u root -pinfant tablet_studies survey_" . escapeshellarg($session);

					system($command);

					die;

					break;

				case 'xml':

					header($_SERVER["SERVER_PROTOCOL"] . " 200 OK");
					header("Cache-Control: public");
					header("Content-Type: text/xml");
					header("Content-Transfer-Encoding: Binary");
					header("Content-Disposition: attachment; filename=".$session.".xml");

					$command = "mysqldump --opt -h localhost -u root -pinfant --xml tablet_studies survey_" . escapeshellarg($session);

					system($command);

					die;

					break;
				
			
			} 
		} else { die('Not All Specified'); }
?>