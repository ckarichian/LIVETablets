<?php

	ini_set('output_buffering', 'off');
	ini_set('zlib.output_compression', false);
	ini_set('implicit_flush', true);
	ob_implicit_flush(true);

    while (ob_get_level() > 0) {
        $level = ob_get_level();
        ob_end_clean();
        if (ob_get_level() == $level) break;
    }
    if (function_exists('apache_setenv')) {
        apache_setenv('no-gzip', '1');
        apache_setenv('dont-vary', '1');
    }
	
	
	echo '<!DOCTYPE html>
	<html>
		<head>
			<title>Console Monitor</title>				
			<style>
			body {
				background-color: black;
				color: white;
				font-face: Courier;
				font-size: 12px;
				padding: 20px;
			}
			img {display:none;}
			</style>
		</head>
		<body>
				<script language="javascript">
					  window.onbeforeunload = confirmExit;
					  function confirmExit()
					  {
						return "Are you sure you want to close the console? Doing so means you will lose access to the server output.";
					  }
			</script>
		<pre style="color:white;">';
		echo "> ssh open \n"."> pkill -f node \n";
		system('pkill -f nodejs');
		system('pkill -f node');
		echo "> node /var/www/html/server.js " .$_GET['session'] . ' ' . $_GET['debug'] . " 2>&1 | tee /var/www/html/logs/" .$_GET['session'] . ".log \n";
		system('node /var/www/html/server.js ' .$_GET['session'] . ' ' . $_GET['debug'] . " 2>&1 | tee /var/www/html/logs/" .$_GET['session'] . ".log");

	echo '! <span style="color:yellow;"><b>END OF FILE</b></span>';

	echo '</pre>
			</body>
			</html>';
?>