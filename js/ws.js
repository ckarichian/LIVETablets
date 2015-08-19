/*

 LIVESurvey Tablet Software
 Author: Carl Karichian  2015
 Designed to produce customizable surveys for use in the LIVELab that are synchronized
 to a master controller.

 */

/**************/
/*  Variables */
/**************/

//MySql Username
	var msUser = 'root';

//MySQL Password
	var msPass = 'infant';

/**************/
/*  Scripting */
/**************/

	//load the websocket helper library
	var WebSocketServer = require('ws').Server;
	var wss = new WebSocketServer({port: svPort});
	var survey;
	var allClients = {}; // { ip: '', socket: ws, lastMessage : '', expired: false, lastPong: Date.now(); }

	//all admin communication is held within this object
	var admin = {
		sockets: [],
		send: function(msg,errkey)
		{
			try {
				//future potential for multiple admin monitors to be active
				var success = false;
				for(var i = 0; i<admin.sockets.length; i++) {
					admin.sockets[i].send(JSON.stringify(msg));
					success = true;
				}

				if (success && svDebug) console.tlog('051 - Sent message to admins ' + JSON.stringify(msg));
			} catch (err)
			{
				errkey = (errkey) ? errkey : 92;
				console.log('Error('+errkey+') communicating with the admins: '+err);
			}
		}
	};

	console.log('Websocket Server is now running on port ' + svPort);

	//helper functions to assist with formatting output to the console
	console.tlog = function (a) {
		var b = new Date().toISOString().replace('T', ' ').substr(0, 19);
		return console.log(b + ' - ' + a);
	};

	console.mlog = function (b,a) {
		console.log("<span style='color:red;'>ERROR("+b+"): </span>" + a + '.');
		admin.send({type: "ERROR", data: a.message},30);
		return true;
	};

	console.nlog = function (a) {
		return console.log("<span style='color:#fffd1e;'>Notice: </span>" + a);
	};

	//initiate the connection to the database
	var mysql = require('mysql');
	var myConnection = mysql.createConnection({
		host: 'localhost',
		user: msUser,
		password: msPass
	});

	myConnection.connect();

	//select the table to use to save the data
	myConnection.query('USE tablet_studies', function (err) {
		if (err) console.mlog(2,err);
	});

	//associate function used to send a render command to all tablets at the same time
	wss.broadcastRender = function (page, group, save) {
		if (svLaunch) {
			try {
				var obj = {
					type: 'RENDER',
					data: {
						page: page,
						group: group,
						save: save
					}
				};
				var keys = Object.keys(allClients);
				for(var i = 0; i<keys.length; i++) {
					var key = keys[i];
					if (!allClients[key].expired) {
						allClients[key].lastMessage = obj;
						allClients[key].socket.send(JSON.stringify(obj), function (err) {
							if (err) console.mlog(3, err);
						});
					}
					if (svDebug) console.tlog('010 - Sent RENDER ' + page + ' ' + gi + ' to ' + allClients[key].ip);
				}

				admin.send(obj);
			}
			catch (err) {
				console.mlog(4,err);
			}
		}
	};

	//associate function to broadcast any message to all the clients at the same time
	wss.broadcastMessage = function (msg,errkey) {
		if (svLaunch) {
			try {
				console.nlog('Broadcasting message: ' + JSON.stringify(msg));
				var keys = Object.keys(allClients);
				for(var i = 0; i<keys.length; i++) {
					var key = keys[i];
					if(!allClients[key].expired) {
						allClients[key].lastMessage = msg;
						allClients[key].socket.send(JSON.stringify(msg), function (err) {
							if(err) console.mlog(99,err);
						});
					}
					if (svDebug) console.tlog('016 - Sent broadcasted message to ' + allClients[key].ip);
				}
			} catch (err) {
				console.mlog(errkey,err);
			}
		}
	};

	//associate function to send a message to a specific hash (client)
	wss.hashedSend = function (innerSocket, dataObject, socketHash, doNotPost)
	{
		try {
			dataSObject = JSON.stringify(dataObject) || dataObject;
			if (allClients.hasOwnProperty(socketHash)) {
				allClients[socketHash].lastMessage = dataObject;
				allClients[socketHash].socket = innerSocket;
				allClients[socketHash].lastPong = Date.now();
			}
			innerSocket.send(dataSObject, function (err) {
				if (err) console.mlog(5, err);
			});

			if (svDebug && !doNotPost) console.tlog('017 - Sent ' + dataObject.type + ' ' + gi + ' to ' + allClients[socketHash].ip);
		} catch (err) { console.mlog(27,err); }
	};

/**************/
/*  OSC-min   */
/**************/

	//load the osc libraries for osc based communications
	var osc = require('osc-min');
	var udp = require('dgram');

	//create the new socket and add a listener function
	var oscsock = udp.createSocket("udp4", function(msg, rinfo) {
		if (svLaunch) {
			try {
				switch (osc.fromBuffer(msg).address) {
					case '/cue/next/start':
						fireNext();
						break;
					case '/cue/prev/start':
						firePrev();
						break;
					case '/cue/blank/start':
						blankScreen();
						break;
					case '/cue/time/start':
						console.nlog('SYNC Command Activated');
						wss.broadcastMessage({type: 'SYNCTIME'},6);
						break;
					default:
						//otherwise, try to move by a specific index number
						try{
							var o = osc.fromBuffer(msg).address.split('/');
							if(o[2] == 'slide') moveByInt(o[3]);
						} catch (err) {
							console.mlog(8, new Error('Unknown OSC Command Received'));
						}
				}
				return true;
			}
			catch (err) {
				return console.mlog(9, new Error("Invalid OSC packet " + err));
			}
		}
	});

	//bind the osc listener to the default port plus 5
	oscsock.bind(svPort+5);


/**************/
/*  Websocket */
/**************/

	//Event listener for new web socket connections to the server
	wss.on('connection', function (ws) {

		//create default local variables for the newly created object
		var connection;
		var connectionHash = 'Unknown';
		var isAdmin = false;
		console.tlog('001 - New Connection From ' + ws._socket.remoteAddress);

		//executed when the socket to a client is closed
		ws.on('close', function (message) {

			if (connection) {
				console.tlog('060 - Lost connection from ' + connection.ip);
				allClients[connectionHash].expired = true;
				admin.send({type:'DISCONNECT', hash: connectionHash});
			}
			if (isAdmin)
			{
				console.nlog('An admin just disconnected');
			}
		});


		//Event listener for when a connection sends a message to the server
		ws.on('message', function (message) {

			try {
				//try to read the received message into JSON
				var msg = JSON.parse(message) || message;
				var resp = {};
			}
			catch (err)
			{
				console.mlog(19,err);
			}

			// {type: [cmd, callback, ping, msg], data: DATA, callback: CB, result: success/error}

			//determine if a callback is required
			if (msg.hasOwnProperty('callback')) { resp.callback = msg.callback; }

			if (svDebug && msg.type != 'TING') console.tlog('050 - Received Message From ' + ws._socket.remoteAddress + ' ' + JSON.stringify(msg));

				//switch the function to run depending on the command type
				switch (msg.type) {
					case 'TIME':
						//if the request is for the current server time for sync purposes
						resp.data = {seq: msg.data.seq, serverTime: Date.now()};
						resp.send = true;
						break;
					case 'TING':
						//update the expiry of a socket when a new TING is received
						if(connectionHash !== 'Unknown') allClients[msg.hash].lastPong = Date.now();
						break;
					case 'cmd':
						//if the command type is "cmd" which is reserved for single commands not requiring additional
						// parameters or strings
						switch (msg.data) {
							case 'MAKEADMIN':
								//establishes a connection as the admin.
								admin.sockets.push(ws);
								console.nlog('Admin (' + ws._socket.remoteAddress + ') just joined');
								isAdmin = true;
								break;
							case 'BUILD':
								//Command issued from the admin to build the database tables and build the HTML files
								if (Object.keys(svSurveys).length > 0 && isAdmin) {
									var goingToBuild = true;
									var n = Object.keys(svSurveys)[0];
									survey = (typeof(svSurveys[n]) === 'object') ? svSurveys[n] : JSON.parse(svSurveys[n]);

									//start the SQL command writeup
									var sql = "CREATE TABLE survey_" + svSession + " ( \n"
										+ "`hash` VARCHAR(20) PRIMARY KEY, \n"
										+ "`tablet` VARCHAR(16) NOT NULL, \n"
										+ "`last_update` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP, \n"
										+ "`version` VARCHAR(50), \n"
										+ "`notes` VARCHAR(250), \n";

									//determine whether to add columns for nested consent questions
									if (survey.consent.hasOwnProperty('nestedConsent')) {
										if (typeof(survey.consent.nestedConsent.questions) === 'object') {
											for (var index in survey.consent.nestedConsent.questions) {
												sql += '`question_c_' + survey.consent.nestedConsent.questions[index].code + "` VARCHAR(2), \n";
											}
										}
									}

									//determine whether to add columns for demographic questions
									if (survey.hasOwnProperty('demographics')) {
										if (typeof(survey.demographics.questions) === 'object') {
											for (var index in survey.demographics.questions) {
												sql += '`question_d_' + survey.demographics.questions[index].code + '` ' + columnType(survey.demographics.questions[index].type) + ", \n";
											}
										}
									}

									//determine whether questionGroups were included, if not, throw an error
									if (typeof(survey.questionGroups) === 'object') {
										for (var index in survey.questionGroups) {
											for (var sub in survey.questionGroups[index].questions) {
												if(!global.dataTypes.hasOwnProperty(survey.questionGroups[index].questions[sub].type)) {
													console.mlog(25, new Error('Invalid question type: ' + survey.questionGroups[index].questions[sub].type));
												}
												sql += (!global.dataTypes[survey.questionGroups[index].questions[sub].type].hasOwnProperty('noSave')) ?
												'`question_' + index + '_' + survey.questionGroups[index].questions[sub].code + '` ' + columnType(survey.questionGroups[index].questions[sub].type) + ", \n" : '';
											}
										}
									}
									else {
										//If any errors occurred during the building of the tables
										console.mlog(10, new Error('There is a fatal problem with the survey code. Please recheck your survey manifest and reboot the admin panel'));
										goingToBuild = false;
									}

									sql = sql.substring(0, sql.length - 3) + "\n )";
									console.log(sql);

									//Issue the table command to the database
									if(goingToBuild) myConnection.query(sql, function (err) {
										if (err) {
											console.mlog(11,err);
										}
										else {
											//signals to the admin that the build was successful and changes the
											// appropriate state variables
											admin.send({type: 'BUILT', data: 'Complete'});
											console.nlog('BUILD Complete');
											svLaunch = true;
											svState = 2;
										}
									});
								}
								else {
									console.mlog(12, new Error('No survey loaded to build'));
								}
								break;

							case 'FINISHED':
								//Command issued by the admin when the survey is finished and the software can shutdown
								if (isAdmin) {
									console.nlog('Finished Session');
									process.exit();
								}
								break;
						}
						//END CMD Switch Loop
						break;

					case 'JOIN':
						//command issued by the tablets when they want to join the survey pool
						if(svSurveys.hasOwnProperty(msg.data.version) && svLaunch)
						{
							//if the survey has been launched and the survey version they request is within the loaded survey object

							//tell the admin they connected
							admin.send({type: 'CONNECT', ip: ws._socket.remoteAddress, hash: msg.hash});

							if (allClients.hasOwnProperty(msg.hash)) {
								//existing client reconnected because hash is in pool. RECONNECT

								if (svState !== 2 && svState !== 0) {
									//only update if not in consent. If they were in consent and DC'd, there would be
									// no need for a refresh; If they dc'd and not in consent, then the last message
									// that was sent to them will be resent
									wss.hashedSend(ws, {
										type: 'RENDER',
										data: {page: 'slide', group: gi, save: true}
									}, msg.hash);
								}

								resp.data = 'SUCCESS';
								resp.type = 'JOIN';
								resp.send = true;

							} else {
								//new client connection. Connection. Add hash to the pool
								connectionHash = msg.hash;
								connection = { ip: ws._socket.remoteAddress, socket: ws, lastMessage : '', expired: false, lastPong: Date.now() };
								allClients[connectionHash] = connection;

								resp.data = 'SUCCESS';
								resp.type = 'JOIN';
								resp.send = true;

								if (svState === 2) {
									//currently in consent stage, so render consent
									wss.hashedSend(ws, {
										type: 'RENDER',
										data: {page: 'consent', group: 0, save: false}
									}, msg.hash);
								}
								else {
									//otherwise, the survey has started and we are in dropin stage
									wss.hashedSend(ws, {
										type: 'DROPIN',
										data: {page: 'drop', group: 0, save: false}
									}, msg.hash);
								}

								try {
									//insert a new row into the datbase for data collection
									var sqlj = 'INSERT INTO `tablet_studies`.`survey_' + svSession + '` (`tablet`,`hash`,`version`) VALUES (' + myConnection.escape(ws._socket.remoteAddress) +
										',' + myConnection.escape(msg.hash) + ',' + myConnection.escape(msg.data.version) + ') ON DUPLICATE KEY UPDATE tablet = '
										+ myConnection.escape(ws._socket.remoteAddress) + ', version = ' + myConnection.escape(msg.data.version) + ';';

									if (svDebug) console.tlog('090 - ' + sqlj);
									myConnection.query(sqlj, function (err, results) {
										if (err) console.mlog(13,err);
									});
								}
								catch (err) {
									console.mlog(14, new Error('Error writing version to db - '+err));
								}
							}
						} else {
							//an old version of the survey is running. Refresh the app
							resp.data = 'ERROR';
							resp.type = 'JOIN';
							resp.send = true;
						}

						break;

					case 'LOAD':
						//load a new survey into the database before building
						if (isAdmin) {
							try {
								var v = JSON.parse(msg.data);
								//will determine a letter based on the length of the existing svSurveys object or via the version code entered
								var e = (v.version) ? svSession + '' + v.version : svSession + '' + String.fromCharCode(65 + Object.keys(svSurveys).length);
								svSurveys[e] = v;
								console.tlog('070 - Loaded new survey code: ' + e);
							}
							catch (err) {
								console.mlog(15,new Error('Could not load the survey. Please check your survey code for errors.'));
							}
						}

						break;

					case 'ECHO':
						//simple echo commands to the admin
						admin.send({type: msg.data.msg, hash: msg.hash}, 16);
						break;

					case 'MOVE':
						//Command issued by the admin to go to a different slide
						if (isAdmin) {
							if (!svDebug) console.tlog('057 - Received Message From ' + ws._socket.remoteAddress + ' ' + JSON.stringify(msg));
							switch (msg.data) {
								case 'NEXT':
									fireNext();
									break;
								case 'PREV':
									firePrev();
									break;
								case 'BLANK':
									blankScreen();
									break;
								default:
									moveByInt(msg.data);
							}
						}
						break;

					case 'SAVE':
						//command for saving question data into the database
						if (svLaunch) {
							try {
								if (!svDebug) console.tlog('097 - Received Message From ' + ws._socket.remoteAddress + ' ' + JSON.stringify(msg));
								var saveIP = myConnection.escape(ws._socket.remoteAddress);
								var sqli = 'INSERT INTO `tablet_studies`.`survey_' + svSession + '` (`tablet`,`hash`,`' + msg.data.qst + '`) VALUES (' + saveIP +
									',' + myConnection.escape(msg.hash) + ',' + myConnection.escape(msg.data.ans) + ') ON DUPLICATE KEY UPDATE tablet = ' + saveIP +
									',' + msg.data.qst + ' = ' + myConnection.escape(msg.data.ans) + ';';

								if (svDebug) console.tlog('090 - ' + sqli);
								myConnection.query(sqli, function (err, results) {
									if (err) console.mlog(17,err);
								});

								//if there is a defined callback paramater, send a callback
								if (msg.hasOwnProperty('callback')) {
									resp.type = 'SQLR';
									resp.data = msg.data.qst;
									resp.send = true;
								}
							}
							catch (err) {
								console.mlog(18,err);
							}
						}

						break;

					case 'REFRESH':
						//command from admin to refresh the state of a single tablet
						if (svLaunch && svState === 1) {
							//if the current state is a question slide, issue the current question
							wss.hashedSend(allClients[msg.tgthash].socket, {
								type: 'RENDER',
								data: { page: 'slide', group: gi, save: true }
							}, msg.tgthash);
						}

						if (svLaunch && (svState === 0)) {
							//if the current state is a wait screen, issue a wait screen
							wss.hashedSend(allClients[msg.tgthash].socket, {
								type: 'RENDER',
								data: { page: 'wait', group: '', save: true }
							}, msg.tgthash);
						}
						break;
				}

				//handles any callback requests made in the above type switch and sends the message appropriately
				if (resp.hasOwnProperty('send')) {
					if(allClients.hasOwnProperty(connectionHash)) {
						wss.hashedSend(ws,resp,connectionHash,true);
					} else {
						ws.send(JSON.stringify(resp));
					}

					//log a message to the console window if svDewbug is true
					if (svDebug) console.tlog('091 - Sent Response to ' + ws._socket.remoteAddress + ' ' + JSON.stringify(resp));
				}


		});

	});

	//Interval for expiring connections that have not been heard from within 4 seconds
	var clearExpiredConnectionsTimer = setInterval(function clearExpiredConnections(){
		var expireTime = Date.now()-4000;

		var keys = Object.keys(allClients);
		for(var i = 0; i<keys.length; i++) {
			var key = keys[i];
			if(!allClients[key].expired && allClients[key].lastPong < expireTime )
			{
				//found an expired connection, set it as expired and alert the admin
				allClients[key].expired = true;
				admin.send({type:'DISCONNECT', hash: key});
			}
		}
	}, 6000);


	//helper to determine the MySQL column type for the dataType being polled
	function columnType(r)
	{
		return global.dataTypes[r].databaseType;
	}

	//function to invoke when an OSC or WS call was made to move the next slide in the groupIndex stack
	var isEnd = false;
	function fireNext()
	{
		if(svState === 2) {
			//if currently in the consent screen, render a slide and change the state
			wss.broadcastRender('slide',gi,true);
			svState = 1;

		} else {
			if (gi < survey.questionGroups.length - 1) {
				//if we have not yet hit the last question in the stack

				switch (svState) {
					case 1:
						if (survey.questionGroups[gi].waitNext === true) {
							//question was on screen, determine if the current group requires a wait screen after the
							// question

							wss.broadcastRender('wait','',true);
							svState = 0;
						}

						if (survey.questionGroups[gi].waitNext === false) {
							//question was on screen, but does not call for a wait screen after it
							gi++;
							wss.broadcastRender('slide',gi,true);
							svState = 1;
						}
						break;

					case 0:
						//a wait screen was currently on the screen, no need to determine a waitnext condition
						gi++;
						wss.broadcastRender('slide',gi,false);
						svState = 1;
						break;
				}
			}
			else {
				console.nlog('End of Survey Has Been Reached');
				svState = 0;
				if(!isEnd) wss.broadcastRender('wait','end',true);
				isEnd = true;
			}
		}
	}

	//function to invoke when an OSC or WS call was made to move the slide previous
	function firePrev()
	{
		//Do nothing if the tablets are still in consent stage
		if(svState !== 2)
		{
			if(gi === 0)
			{
				//if at the first slide of the survey, return to the consent form;
				// NOT RECOMMENDED TO DO

				wss.broadcastRender('consent',0,svState);
				svState = 2;
			}

			else {
				//if the current index is not the first slide
				if(!isEnd) gi--;
				if(isEnd) isEnd = false;
				wss.broadcastRender('slide',gi,svState);
				svState = 1;
			}
		}
	}

	function moveByInt(val)
	{
		if (!isNaN(val) && parseInt(Number(val)) == val && !isNaN(parseInt(val, 10))) {
			gi = val;
			wss.broadcastRender('slide', gi, svState, Date.now());
			svState = 1;
			isEnd = false;
		}
		else if(val === 'c')
		{
			wss.broadcastRender('consent',0,svState);
			svState = 2;
			isEnd = false;
		} else {
			console.mlog(31,new Error('Invalid Index Selected'));
		}
	}

	//function to invoke when a OSC or WS call was made to toggle the screens
	function blankScreen()
	{
		//toggle the current state
		isBlank = !isBlank;

		//For each connected client, send them a command 'BLANK' and a boolean  stating whether to blank or unblank
		wss.broadcastMessage({
			type: 'BLANK',
			data: isBlank
		},20);
	}