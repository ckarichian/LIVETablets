/*

 LIVESurvey Tablet Software
 Author: Carl Karichian,  2015
 Designed to produce customizable surveys for use in the LIVELab that are
 synchronized to a master controller.

 */

/***********************/
/*Environment Variables*/
/***********************/

//The global state of the survey, ie, what are participants currently seeing
// 0 - idle/waitscreen, 1 - question on screen, 2 - consent form
	global.svState = 0;

//The default port that the server runs on. The HTML server will run on (svPort - 5), and
//the OSC listener will listen on (svPort + 5)
	global.svPort = 9125;

//Has the survey been built from the admin screen
	global.svLaunch = false;

//Is the survey currently running in debug mode
	global.svDebug = (process.argv.indexOf('-debug') > 0);

//The current session number of the running survey, defaults to the current timestamp is not provided
	global.svSession = process.argv[2] || Date.now();

//Holder variable for the survey versions
	global.svSurveys = {};

//The current index of questionGroup that is currently being rendered
	global.gi = 0;

//Import the information for the questiontypes
	global.dataTypes = require('./js/modules.js');

//Is the screen blank function currently on
	global.isBlank = false;

/********************/
/*Server Code Beings*/
/********************/

	console.log('Session Number: ' +svSession+ '  Debug: ' +  svDebug);

//Start Websocket Server
	console.log('Starting Websocket Server');
	require('./js/ws.js');

//Start Web Routing
	require('./js/express.js');

