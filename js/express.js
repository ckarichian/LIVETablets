/*

 LIVESurvey Tablet Software
 Author: Carl Karichian  2015
 Designed to produce customizable surveys for use in the LIVELab that are synchronized
 to a master controller.

 */

/***********************/
/*Environment Variables*/
/***********************/

//Nodejs Module Loaders
var fs = require('fs');
var express = require('express');
var app = express();

//Server port to listen on (defaul port minus 5)
var esPort = svPort - 5;

//Path to the files
var filePath = '/var/www/html/';


/********************/
/*Server Code Begins*/
/********************/


app.get('/data/:file.js', function (req, res) {
	//generates a .js file for each survey manifest upon request by a tablet. Is a pseudo file
	if (svSurveys.hasOwnProperty(req.params.file) && svLaunch) {
		res.type('application/javascript');
		res.send('var survey = ' + JSON.stringify(svSurveys[req.params.file]) + ';');
	}
	else {
		res.sendStatus(404);
	}

});

app.get('/list', function (req, res) {
	//if the survey has been built, then show a list of potential surveys to choose from
	if (svLaunch) {
		res.type('text/html');
		var output = '<!DOCTYPE html><html><head><title>Tablet Survey Window</title><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />' +
			'<link rel="stylesheet" type="text/css" href="css/style.css" /></head><body>';
		output += '<div class="wait"><h2 id="waitText">Please Select a Survey to Launch:</h2><br />';
		for (var index in svSurveys) {
			output += '<h4><a href="http://tablets.livepeople.ca:' + esPort + '/' + index + '.html" style="color: white;">' + index + '</a></h4><br />';
		}
		output += '</div></body></html>';
		res.send(output);
	}
	else {
		//survey has not been built. Show the error message
		res.type('text/html');
		var output = '<!DOCTYPE html><html><head><title>Tablet Survey Window</title><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />' +
			'<link rel="stylesheet" type="text/css" href="css/style.css" /></head><body>';
		output += '<div class="wait"><h2 id="waitText">No Survey Loaded</h2><br />';
			output += '<h4><a href="javascript:injectCode.doFresh()" style="color: white;">Retry</a></h4><br />';
		output += '</div></body></html>';
		res.send(output);
	}

});

app.get('/:file.html', function (req, res) {
	//builds the HTML file for the survey. Compiles all the questions into a single page
	if (svSurveys.hasOwnProperty(req.params.file) && svLaunch) {
		var file = fs.readFileSync(filePath + 'tablet.html', "utf8");
		file = file.replace(/CODEFILE/g, req.params.file);
		res.type('text/html');
		res.send(file);
	}
	else {
		//otherise, show the error that the survey has nott been built yet
		res.type('text/html');
		var output = '<!DOCTYPE html><html><head><title>Tablet Survey Window</title><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />' +
			'<link rel="stylesheet" type="text/css" href="css/style.css" /></head><body>';
		output += '<div class="wait"><h2 id="waitText">No Survey Loaded</h2><br />';
		output += '<h4><a href="javascript:injectCode.doFresh()" style="color: white;">Retry</a></h4><br />';
		output += '</div></body></html>';
		res.send(output);
	}

});

app.get('/js/:file.js', function (req, res) {
	//sends any other requested js files to the client
	if (req.params.file) {
		res.sendFile(filePath + '/js/' + req.params.file + '.js');
	}
	else {
		res.sendStatus(404);
	}

});

app.get('/css/:file.css', function (req, res) {
	//sends any other requested css files to the client
	if (req.params.file) {
		res.sendFile(filePath + '/css/' + req.params.file + '.css');
	}
	else {
		res.sendStatus(404);
	}

});

app.get('/css/fonts/:file.woff2', function (req, res) {
	//sends any other requested font files to the client
	if (req.params.file) {
		res.sendFile(filePath + '/css/fonts/' + req.params.file + '.woff2');
	}
	else {
		res.sendStatus(404);
	}

});

//Open the connectiona and print a message
var server = app.listen(esPort);
console.log('Express Server now running on port ' + esPort);