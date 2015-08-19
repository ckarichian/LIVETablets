/*

LIVESurvey Tablet Software
Author: Carl Karichian  2015
Designed to produce customizable surveys for use in the LIVELab that are synchronized
to a master controller.

 */

//TODO Check all HTML Output for Validity
//TODO check time offset is being done properly
//TODO Re-evaluate sucess of render requests
//todo check the order of response commands to the admin
//todo finish inline comments

/***********************/
/*Environment Variables*/
/***********************/

//application state: 0 - idle; 1 - question on screen; 2 - presurvey
	var state = 0;

//should debug be turned on, if true, then prints messages to the console
	var debug = true;
	
//determine whether saves should be automatic or controlled via qLab; (future feature to develop) false = qlab save; default = true
	var autosave = (typeof(survey.autosave) === 'boolean') ? survey.autosave : true; 
	
//the address and port of the websocket server; Internal DNS on router routes 'tablets.livepeople.ca' to 192.168.25.16; On external world, routers to 130.113.48.169
	var webserver = 'ws://tablets.livepeople.ca:9125';

//Time interval in milliseconds that the system should ping the server
	var pingInterval = 4000;

//the current index of the question array that the survey is in
	var groupIndex;

//holder for the answers to questions
	var answers = {};

//Boolean for the current question group rendered
	var curData = false;

//a random text string to uniquely identify the tablet and session
	var svHash = Math.random().toString(36).substr(2, 10);

//holder for the question slide
	var $questionSlide = $('#questionSlide'), $container = $('.container'), $signatureSlide = $('#signatureSlide');

//the current time offset in ms of the tablet from the server
	var timeOffset = 0;

//the empty buffer for use by some questions for temporary calculations
	var buffer = {};

//holder for the websocket variable
	var websocket;

//Identifies if the survey is at the end of the questionGroups
	var isEnd = false;

//Current ready state of the tablet
	var isReady = false;

//load all the language strings and default values
	lang = {};
	if(!survey.hasOwnProperty('language')) survey.language = {};
	lang.waitText = survey.language.waitText || 'Please wait for the experiment to begin';
	lang.nextQuestion = survey.language.nextQuestion || 'Please wait for the next question to begin';
	lang.endText = survey.language.endText || 'You have reached the end of the experiment';
	lang.readyUp = survey.language.readyUp || 'Click When Ready';
	lang.readyDn = survey.language.readyDn || "You're Ready";
	lang.selfProgress = survey.language.selfProgress || "Finished";


/********************/
/*Survey Code Begins*/
/********************/

//call this function on document ready
	function constructSurvey()
	{
		if (debug) console.log('BEGIN');
		
		//Open a new connection to the server and get the appropriate state
		websocket = new ManagedSocket(webserver);

		//Set the default message on the wait screen
		$('#waitText').text(lang.waitText);

		//Set the survey title in the header
		$('#headercontent').html('<b>'+survey.title+'</b>');
		
	}


//Call this function when you want to generate a slide
	function render(slideType,content,oktosave)
	{
		// 1. Determine whether it is ok to save, and if not defined, default to true
		var oks = (typeof oktosave === 'boolean') ? oktosave : true;
		var output = '';
		if (debug) console.log('RENDER REQUESTED');
		
		// 2. Determine what data needs to be saved from this page and schedule it to be saved
		if ((state == 1 || state == 2) && curData && oks)
		{
			if (debug) console.log('DATA NEEDS SAVING:');
			saveData();			
		}
		
		// 3. Render the appropriate slide
		switch(slideType)
		{
			case 'consent':

				//to render the consent page. first determine if the consent page is not already loaded to prevent flashing
				if(groupIndex !== 'c' || groupIndex !== 'd')
				{
					isEnd = false;
					output = '<div><h3>' + survey.title + '</h3><br><p>' + survey.consent.body + '</p></div>';
					//set the state to the consent
					state = 2;

					//Determine if there are any nested consent questions to render
					try
					{
						$(survey.consent.nestedConsent.questions).each(function ()
						{
							//if found, print out each nested consent question as a yes/no option
							groupIndex = 'c';
							curData = survey.consent.nestedConsent;
							output += dataTypes['nest'].getHTML(this.question,false,false,'question_c_'+this.code);
						});
					} catch(err) { if (debug) console.log('NESTED CONSENT Skipped'); curData = false; }
						
					//determine if the signature page is requested for this survey
					if (survey.consent.signature === true) {
						if (debug) console.log('SIGNATURE: TRUE');
						$('#simple_sketch').jqScribble();
						output += '<br><div class="center"><div class="button" onclick="$signatureSlide.show()">Click to Sign</div></div>';
					} else {
						if (debug) console.log('SIGNATURE: FALSE');
						output += '<br><div class="center"><div class="button" onclick="render(\'demographics\')">I Hereby Consent</div></div>';
					}

					//Finally, show the rendered slide
					$container.html(output);
					$questionSlide.show();

					//sends confirmation that it received and rendered the command
					websocket.send('ECHO',{msg: 'RENDERED', slide: '', slideType: 'consent'});
				}
			
			break;
			case 'wait':
				//to render the wait screen. Does NOT prevent flashing in the event that you may want to change the wait text between screens
				if (debug) console.log('RENDERING WAIT');
				state = 0;

				//catches the different types of commands for wait screens
				if(typeof (content) !== 'string')
				{
					//is a wait screen commanded by the survey, not the server
					$('#waitText').text(content.text);
				}
				else {
					//is a wait screen requested by the server
					var renderedContent;
					if(content == 'end' )
					{
						$('#waitText').text(lang.endText);
						websocket.send('ECHO',{msg: 'RENDERED', slide: content, slideType: 'wait'});
						isEnd = true;
					} else {
						renderedContent = (content === '') ? lang.nextQuestion : content;
						$('#waitText').text(renderedContent);
						websocket.send('ECHO', {msg: 'RENDERED', slide: content, slideType: 'wait'});
					}
				}

				//hide the question content
				$questionSlide.hide();
			break;
			
			case 'demographics':

				//render the demographics slide onto the screen as a normal question group with slight modification
				if(survey.hasOwnProperty('demographics'))
				{
					//if there are demographic questions, render them and present them
					state = 2;
					groupIndex = 'd';
					if (debug) console.log('RENDERING DEMOGRAPHICS');
					pushHTML(survey.demographics);
				} else {
					//if not, skip right to the wait screen for the experiment to begin
					render('wait', {signal: false, text: lang.waitText});
					websocket.send('ECHO',{msg: 'READY'});
					isReady = true;
				}

				$signatureSlide.hide();
			break;
			
			case 'slide':
				//render the appropriate question group as per the render request, prevent flashing of the same question
				//by ignoring requests to load the same content as what is currently loaded
				if(groupIndex != content || isEnd)
				{
					isEnd = false;
					isReady = false;
					state = 1;
					groupIndex = content;
					if (debug) console.log('RENDERING SLIDE '+groupIndex);
					pushHTML(survey.questionGroups[groupIndex]);
					$signatureSlide.hide();

					//sends confirmation that it received and rendered the command
					websocket.send('ECHO',{msg: 'RENDERED', slide: content, slideType: 'slide'});
				}

			break;
		}

	}

//Call this function onClick on the ready button
	function ready(btn)
	{
		if(!$(btn).hasClass('signaled')) {
			//1. send ready signal to admin console
			websocket.send('ECHO',{msg: 'READY'});
			isReady = true;

			//2. If the ready was fired after the consent process, render a wait screen
			if (state === 2) {
				if (debug) console.log('Consent is complete');
				render('wait', {signal: false, text: lang.waitText} );
			} else {
				$(btn).addClass('signaled').text(lang.readyDn);
			}
		}
	}

//Call this function to save the survey data and schedule it to be sent
	function saveData()
	{
		if(curData)
		{
			if (debug) console.log('Saving Current Data Group');

			//Loop over each of the current questions on screen
			$(curData.questions).each( function() 
			{
				var qid = 'question_'+groupIndex+'_'+this.code;
				var val = dataTypes[this.type].getValue(qid);

				//2. Load thw answer into the queue
				answers[qid]= { ans: val, saved: false};

				//3. If autosave is enabled, send the answer to the server
				if (autosave && !dataTypes[this.type].hasOwnProperty('noSave')) {
					try
					{
						if (debug) console.log('Attempting to write: '+ qid + ' : ' + val);
						websocket.send('SAVE',{ qst: qid, ans: val}, function (w) {
							if (debug) console.log('Saved successfully: ' + w);
							answers[w].saved = true;
						});
					} catch (err) {
						if (debug) console.log(err);
					}
				}				
			});

			buffer = {};
		}		
	}
	
//Pushes the HTML for the question slide in question
	function pushHTML (group) 
	{

		//.container->.questionGroup->.questionWrap
		curData = group;
		var output = '<div class="questionGroup">';

		//Loop over each question for the group to load
		for(var i = 0; i<group.questions.length; i++) {
			var key = group.questions[i];

			var qid = 'question_' + groupIndex + '_' + key.code;
			var hint = (key.hasOwnProperty('hint')) ? key.hint : false;
			output += '<div class="questionWrap">';

			//Load the modules.js function to prepare the HTML
			output += (dataTypes.hasOwnProperty(key.type)) ? dataTypes[key.type].getHTML(key.title, hint, key.options, qid): '<b>Error rendering question ' + qid + '</b>';

			//determines whether or not to print the divider
			if(!group.hasOwnProperty('noLines') && group.questions.length > 1) { output += '<hr />'; }

			output += '</div>';


		}

		output += '</div>';

		//Should a ready button be presented?
		if (group.showReady === true || group === survey.demographics) {
				output += '<div class="center"><div class="ready button" onclick="ready(this);">'+lang.readyUp+'</div></div>';
		}

		//Output the content
		$container.html(output).scrollTop(0);

		//Show the content
		$questionSlide.show();

		//After the content has been outputted, determine whether the question types in question require an init function, and if so, run it
		for(var i = 0; i<group.questions.length; i++) {
			var key =  group.questions[i];
			if(dataTypes[key.type].hasOwnProperty('init'))
				dataTypes[key.type].init('question_' + groupIndex + '_' + key.code);
		}
	}

//Function to call when user changes their input to clear the ready state
	function clearReady() {
		if(isReady) websocket.send('ECHO',{msg: 'NOTREADY'});
		$('.ready').removeClass('signaled').text(lang.readyUp);
		isReady = false;
	}

/*
Time Sync Functions
- Functions that determine the time offset from the server; Not as accurate as NTP sync, use only as last resort
 */
	var timepackets = [];
	var timeScheduler, roundTrip, maxTimePackets = 10;
	function syncTime() {
		timeScheduler = 0; roundTrip = 0;
		for(a=0; a<maxTimePackets; a++ ) {
			//Creates incremental times with a minimum of 801ms to a maximum of 4201ms
			var ms = (a+1)*800 + Math.floor(Math.random() * 1000) + 1;
			doTimeSend(a,ms);
		}
	}


	function doTimeSend(i,ms) {
		setTimeout(function () {
			timepackets[i] = {tabletTime: Date.now()+1};
			websocket.send('TIME', {seq: i}, function (msg) {
				timepackets[msg.seq].serverTime = msg.serverTime;
				timepackets[msg.seq].receivedTime = Date.now();
				returnSync();
			});
			if (debug) console.log('Sending time request #'+i + ' with a delay of ' + ms + 'ms');
		}, ms);
	}


	function returnSync()
	{
		timeScheduler++;
		if(timeScheduler == maxTimePackets)
		{
			for (var index in timepackets)
			{
				roundTrip = roundTrip + (timepackets[index].receivedTime - timepackets[index].tabletTime)/2;
			}

			timeOffset = timepackets[maxTimePackets-1].receivedTime - (timepackets[maxTimePackets-1].serverTime + (roundTrip)/maxTimePackets);
			console.log('Time offset is now: '+timeOffset);
		}
	}

//End Time Sync Functions

//Function called by the drop-in screen to clear the drop-in
	function clearDrop()
	{
		websocket.send('SAVE',{ qst: 'notes', ans: $('#notes').val()});
		state=0;
		$('#waitText').text(lang.nextQuestion);
	}


//Revolving Ping Function to Alert Admin of Connection State
	setInterval(function() {
		try
		{
			//if (debug) console.log('STATE '+state);
			websocket.send('TING');
		} catch (err) {
			if (debug) console.log(err);
		}
	}, pingInterval);

/* Management websocket is a small wrapper I wrote around the HTML5 websocket API to facilitate some required functionality
not present in the standard API. It is a pretty simple design but gets the job done
*/
	function ManagedSocket(url) {
		//Essential Variables used within the socket
		this.url = url;
		this._socket = null;
		this.isOpen = false;
		this.callbacks = {};
		this.reconnectTimer = function(parent) { setTimeout(function() { parent.connect() }, 1000 ) };
		var self = this;

		//Connection initiation function
		this.connect = function() {
			if(!self.isOpen) {
				//if it is not currently open
				if(debug) console.debug('surveySocket','connecting',self.url);
				//establish a new socket
				self._socket = new WebSocket(url);
				//assign a callback for the successful open command
				self._socket.onopen = function(event) {
					if(debug) console.debug('surveySocket','connected',self.url);
					self.isOpen = true;
					self.onopen(event);
				};
				//assign a handler when the socket gets closed
				self._socket.onclose = function(event) {
					if(debug) console.debug('surveySocket','closed',self.url,event);
					self.isOpen = false;
					self.reconnectTimer(self);
				};
				//assign a handler for when the socket has an error
				self._socket.onerror = function (event) {
					console.debug('surveySocket','error',self.url,event)
				};
				//assign a handler for when the socket receives a message
				self._socket.onmessage = function(event) {
					//try to assume it is JSON otherwise assume it is text
					try { var msg = JSON.parse(event.data);
					} catch (err) { var msg = event; }
					if(debug) console.debug('surveySocket','onmessage',self.url,msg);
					//return it to the internal handler
					self.onmessage(msg);
				};
				return true;
			} else {
				return console.debug('surveySocket','EXCEPTION','Cannot connect an open socket');
			}
		};

		//internal handler for the close function. Closes the socket facade
		this.close = function() {
			self.isOpen = false;
			self._socket.close();
			return true;
		};

		//internal handler; tries to join the session on successful connection
		this.onopen = function () {
			self.send('JOIN', {version: myVersion});
		};

		//internal handler, perform the appropriate action based on the received message
		this.onmessage = function (msg) {

			switch(msg.type)
			{
				case 'RENDER':
					//if the received message was a render request, use the included render function
					if(state !==3) render(msg.data.page,msg.data.group,msg.data.save);
					break;
				case 'JOIN':
					//handles responses from the JOIN command on successful connections
					if(msg.data === 'ERROR') {
						try { injectCode.doFresh() } catch (err) { window.history.back(); }
					}
					break;
				case 'DROPIN':
					//Server says study already in progress and you are a drop in
					state = 3;
					$('#waitText').html('Session is already in progress<br><br><input type="input" id="notes" size="60" style="height:30px" />'+
						'<br><div class="button" onClick="clearDrop();">Accept</div>');
					break;
				case 'BLANK':
					//tggle the screen visibility
					$('#blankScreen').css('visibility', ((msg.data === true) ? 'visible' : 'hidden'));
					break;
				case 'SYNCTIME':
					//synchronize your time
					syncTime();
					break;
			}

			//if the message was the result of a callback, execute the callback and purge it
			if(msg.hasOwnProperty('callback'))
			{
				self.callbacks[msg.callback].fx(msg.data);
				delete self.callbacks[msg.callback];
			}
		};

		//send messages from the socket to the server
		this.send = function (sType, sData, sCallback) {
			var callId = Math.random().toString(36).substr(2, 15);
			if (self.isOpen)
			{
				//if it is open, do the following template message
				var resp = { type: sType, data: sData, hash: svHash };

				//if a callback was requested, define and store it
				if (typeof(sCallback) == 'function') {
					resp.callback = callId;
					self.callbacks[callId] = {resp: resp, fx: sCallback, timeout: Date.now(), attempts: 1 };
				}

				//try to send the message or fail in doing so
				try {
					self._socket.send(JSON.stringify(resp));
					if(debug) console.debug('surveySocket','onsend',self.url,resp);
				} catch (err) {
					console.debug('surveySocket','onsend error',self.url,err);
				}

				return true;
			} else {
				//otherwise, go back to the callback and see change the attempt count
				self.callbacks[callId] = {
					resp: { type: sType, data: sData, hash: svHash, callback: callId },
					fx: (typeof(sCallback) == 'function') ? sCallback : function () {} ,
					timeout: Date.now(),
					attempts: 0
				};
			}
		};

		//garbage collector for the callbacks and alerts for expired callbacks
		var callbackCollector = setInterval(function ()
		{
			if(self.isOpen)
			{
				var curnow = Date.now()-2000;
				for (var cbindex in self.callbacks)
				{
					if(self.callbacks[cbindex].attempts == 4)
					{
						console.debug('Critical Error! Could Not Send Message ('+cbindex+') ' + JSON.stringify(self.callbacks[cbindex].resp));
						delete self.callbacks[cbindex];
					}
					else if(self.callbacks[cbindex].timeout < curnow && self.callbacks[cbindex].attempts < 4)
					{
						self.callbacks[cbindex].attempts++;
						console.log('Resending attempt #'+self.callbacks[cbindex].attempts);
						self._socket.send(JSON.stringify(self.callbacks[cbindex].resp));
					}
				}
			}
		}, 4000);

		//connect the wrapper
		this.connect();
	}