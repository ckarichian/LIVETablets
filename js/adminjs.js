/*

 LIVESurvey Tablet Software
 Author: Carl Karichian  2015
 Designed to produce customizable surveys for use in the LIVELab that are synchronized
 to a master controller.

 */

/***********************/
/*Environment Variables*/
/***********************/

	var aaSession = Date.now();
	var left, opacity, scale;
	var ws, basin;
	var clients = {};
	var lastError;
	var surveyLengths = 0;
	var canIndex = false;
	var didIdothat = false;
	var slide;

/**********************/
/* Client Code Begins */
/**********************/

	//Define the Client class which will represent each new connection to the server
	function Client(ip, adminHash) {
		this.state = 'rendered'; //default state should be rendering
		this.timestamp = Date.now(); //the last time we heard from this client
		this.hash = adminHash; //the hash of the client
		this.html = '<li ondblclick="doRefresh(this)" data-ip="' + ip + '" id="' + this.hash + '">' + ip + '</li>'; //the HTML for the icon

		if (Object.keys(clients).length === 1) {
			//if this is the first client, append it to the basin
			basin.append(this.html);
		}
		else {
			//otherwise, add it to the appropriate position based on the tablet number
			var next = basin.find('li').filter(function () {
				return $(this).attr("data-ip") < ip;
			}).last();

			if (next.length) {
				next.after(this.html);
			}
			else {
				basin.prepend(this.html);
			}
		}
		this.jquery = $('#'+this.hash);
	}

	//client function to change the current state of the client and associated properties
	Client.prototype.set = function (target) {
		this.state = target;
		this.jquery.removeClass().addClass('basin' + target);
		this.time();
		return true;
	};

	//client function to update its current timestamp
	Client.prototype.time = function () {
		this.timestamp = Date.now();
		return true;
	};

	//function to call to refresh the current tablet
	function doRefresh(obj)
	{
		ws.send(JSON.stringify({type:'REFRESH', tgthash: $(obj).attr('id') }));
	}

/**********************/
/* Admin Code Begins */
/**********************/

$(document).ready(function () {

	//slide object is a function to animate the fieldsets when moving between them
	slide = {
		fieldIndex : 0,
		animating: false,
		fieldsets : $("fieldset"),
		next_fs : '',
		previous_fs : '',
		current_fs : '',

		//animate to the next fieldset appropriately
		next : function () {
			if (this.animating) return false;
			this.animating = true;

			var next_index = this.fieldIndex + 1;
			this.next_fs = this.fieldsets.eq(next_index);
			this.current_fs = this.fieldsets.eq(this.fieldIndex);

			$("#progressbar").find("li").eq(next_index).addClass("active");
			this.next_fs.show();

			this.current_fs.animate({opacity: 0}, {
				step: function (now, mx) {
					scale = 1 - (1 - now) * 0.2;
					left = (now * 50) + "%";
					opacity = 1 - now;
					slide.current_fs.css({'transform': 'scale(' + scale + ')'});
					slide.next_fs.css({'left': left, 'opacity': opacity});
				},
				duration: 800,
				complete: function () {
					slide.current_fs.hide();
					slide.animating = false;
				},
				easing: 'easeInOutBack'
			});

			this.fieldIndex = next_index;
		},

		//navigate to the previous fieldset
		prev : function () {

			if (this.animating) return false;
			this.animating = true;

			var next_index = this.fieldIndex - 1;
			this.previous_fs = this.fieldsets.eq(next_index);
			this.current_fs = this.fieldsets.eq(this.fieldIndex);

			$("#progressbar").find("li").eq(this.fieldIndex).removeClass("active");

			this.previous_fs.show();
			this.current_fs.animate({opacity: 0}, {
				step: function (now, mx) {
					scale = 0.8 + (1 - now) * 0.2;
					left = ((1 - now) * 50) + "%";
					opacity = 1 - now;
					slide.current_fs.css({'left': left});
					slide.previous_fs.css({'transform': 'scale(' + scale + ')', 'opacity': opacity});
				},
				duration: 800,
				complete: function () {
					slide.current_fs.hide();
					slide.animating = false;
				},
				easing: 'easeInOutBack'
			});

			this.fieldIndex = next_index;
		}

	};

	//Define the basin for the new connections

	// clients = { '192.168.30.100' : { state: '', currentView: 'c', timestamp: 12345654 }  }
	//states = *ready, rendering, rendered, error

	basin = $('#basin');

	//reset the state of the client every second
	setInterval(function () {
		try {
			var now = Date.now();

			for (var index in clients) {
				if (clients[index].state == 'rendering' && now - clients[index].timestamp > 1999) {
					clients[index].set('error'); //error out a client if no response after 2 seconds
					console.log('Self expiring ' + index);
				}
			}
		}
		catch (err) {
			console.log('Loop error ' + err)
		}

	}, 1000);

	//When the new sessionn button is clicked, run the following commands
	$(".newSession").click(function () {
		//was debug selected
		adebug = $('#adebug').find('option:selected').val();
		//get the session number from the box; Eventually may allow for user to enter their own session number
		var ss = $('#svSession').val();
		//open the console window
		window.open('./exec.php?session=' + ss + '&debug=' + adebug, 'win1', 'width=800,height=800,location=0,menubar=0,scrollbars=1,status=1,toolbar=0,resizable=1');

		//connect to the websocket
		ws = new ReconnectingWebSocket('ws://tablets.livepeople.ca:9125', null, {debug: true, reconnectInterval: 400, automaticOpen: false});

		setTimeout(function(){
			//wait 1.6s for the server to open nodejs console and wait for the server to be ready
			ws.open();
			$('.waitforws').removeAttr('disabled');
			slide.next();
		}, 1650);

		//call this function once the websocket is open and ready
		ws.onopen = function () {
			//identify itself as the admin when the connection is opened
			ws.send(JSON.stringify({type: 'cmd', data: 'MAKEADMIN'}));
		};

		//handle each message received
		ws.onmessage = function (evt) {

			var msg = JSON.parse(evt.data) || evt.data;

			switch (msg.type) {
				case 'BUILT':
					//means the server says the build was successful
					//slide.fieldIndex = 2;
					slide.next();
					break;
				case 'CONNECT':
					//triggered whenever a new tablet connects; Adds a new client to its basin
					if (clients.hasOwnProperty(msg.hash)) {
						clients[msg.ip].set('rendered');
					}
					else {
						clients[msg.hash] = new Client(msg.ip.split('.')[3] - 100, msg.hash);
					}
					break;
				case 'READY':
					//tablet says it is ready
					clients[msg.hash].set('ready');
					break;
				case 'DISCONNECT':
					//tablet disconnected
					clients[msg.hash].set('error');
					break;
				case 'RENDER':
					if(msg.data.page == "slide") $('#indexSelect').val(msg.data.group + '');
					if(msg.data.page == "consent") $('#indexSelect').val('c');
					break;
				case 'NOTREADY':
				case 'RENDERED':
					//tablet says it is rendered its slide
					clients[msg.hash].set('rendered');
					break;
				case 'ERROR':
					//received an error message from the server
					lastError = msg;
					var m = msg.data.code || msg.data;
					alert('Error Code Received: ' + m);
					break;
			}

		};

		//called when the websocket gets closed
		ws.onclose = function () {
			if(!didIdothat) alert('The admin panel has been disconnected from the server');
		};

	});

	$(".savenew").click(function () {
		//sends the survey code data to the server
		var as = $('#surveyCode').val();
		var $jsonerror = $('#jsonerror');
		$jsonerror.hide();

		//todo add validation of demographics section

		/* The following section tries to validate a number of checklist items for the JSON code submitted. Even
		   though the JSON might be valid from a syntax perspective and no issues are raised from the JSON.parse
		   function, there might be issues around the actual content of the manifest. This code will try to validate
		   as many different checks as I could thik of to ensure that the manifest is complete and functional
		 */

		try {
			var parse = JSON.parse(as);

			if (!parse.hasOwnProperty('consent') || typeof(parse.consent) !== 'object')
				throw 'Survey is either missing consent or consent is not property written as an object';
			if (!parse.hasOwnProperty('title') || typeof(parse.title) !== 'string') throw 'Survey is missing a title or is formatted incorrectly';
			if (!parse.consent.hasOwnProperty('body') || typeof(parse.consent.body) !== 'string') throw 'The consent information is missing or not properly formatted';

			if(parse.consent.hasOwnProperty('nestedConsent')) {
				/**/
				if (typeof(parse.consent.nestedConsent) !== 'object') throw 'Nested consent needs to be an object';
				if (!Array.isArray(parse.consent.nestedConsent.questions)) throw 'Nested consent is not properly formatted. Please review the documentation';

				for (var i = 0; i < parse.consent.nestedConsent.questions.length; i++) {
					var ia = parse.consent.nestedConsent.questions[i];
					if (typeof(ia) !== 'object') throw 'Nested consent (' + i + ') should be an object';
					if (!ia.hasOwnProperty('code') || typeof(ia.code) !== 'string') throw 'Nested consent (' + i + ') is missing a code property';
					if (!ia.hasOwnProperty('question') || typeof(ia.question) !== 'string') throw 'Nested consent (' + i + ') is missing a question property';
					if (!ia.hasOwnProperty('type') || ia.type !== 'nest') throw 'Nested consent (' + i + ') must be of type "nest"';
				}
			}

			if (!Array.isArray(parse.questionGroups)) throw 'questionGroups needs to be an array or is missing';
			if (parse.questionGroups.length < 1) throw 'You have no question slides in your questionGroups';

			if(parse.hasOwnProperty('version'))
			{
				if(/^\w+$/.test(parse.version) === false) throw 'Version should only contain letters and numbers';
			}

			for(var i=0; i<parse.questionGroups.length;i++)
			{
				if(typeof(parse.questionGroups[i]) !== 'object') throw 'Question Group ('+i+') is not a proper question object';
				if(!parse.questionGroups[i].hasOwnProperty('waitNext')) throw 'Question Group ('+i+') is missing a waitNext parameter';
				if(!parse.questionGroups[i].hasOwnProperty('showReady')) throw 'Question Group ('+i+') is missing a showReady parameter';
				if(!parse.questionGroups[i].hasOwnProperty('questions')) throw 'Question Group ('+i+') is missing a questions parameter';
				if(!Array.isArray(parse.questionGroups[i].questions)) throw 'Question Group ('+i+') does not properly set the questions parameter as an array';

				for(var m=0;m<parse.questionGroups[i].questions.length; m++)
				{
					if(!parse.questionGroups[i].questions[m].hasOwnProperty('code') || typeof(parse.questionGroups[i].questions[m].code) !== 'string')
						throw 'Question Group ('+i+'), Question ('+m+') is either missing or has an improper code parameter';

					if(/^\w+$/.test(parse.questionGroups[i].questions[m].code) === false)
						throw 'Question Group ('+i+'), Question ('+m+') code must only contain letters and numbers';

					if(!parse.questionGroups[i].questions[m].hasOwnProperty('type') || typeof(parse.questionGroups[i].questions[m].type) !== 'string')
						throw 'Question Group ('+i+'), Question ('+m+') is either missing or has an improper type parameter';

					if(parse.questionGroups[i].questions[m].type !== 'divider') {
						if (!parse.questionGroups[i].questions[m].hasOwnProperty('title') || typeof(parse.questionGroups[i].questions[m].title) !== 'string')
							throw 'Question Group (' + i + '), Question (' + m + ') is either missing or has an improper title parameter';
					}

					switch(parse.questionGroups[i].questions[m].type)
					{
						case 'radio':
						case 'dropdown':
						case 'timedRadio':
						case 'checkbox':
						case 'icons':
							if(!Array.isArray(parse.questionGroups[i].questions[m].options))
								throw 'Question Group ('+i+'), Question ('+m+') options should be an array';

							for(var e=0; e<parse.questionGroups[i].questions[m].options.length; e++)
							{
								var ea = parse.questionGroups[i].questions[m].options[e];
								if(!ea.hasOwnProperty('code') || !ea.hasOwnProperty('value') ||
									!(typeof(ea.value) == 'string'||typeof(ea.value) == 'number') || !(typeof(ea.code) == 'string'||typeof(ea.code) == 'number'))
									throw 'Question Group ('+i+'), Question ('+m+') has incorrectly set options. Please review';

								if(/^\w+$/.test(ea.code) === false) throw 'Question Group ('+i+'), Question ('+m+') code must be alphanumeric';
							}

							break;
						case 'bigtext':
							if(!parse.questionGroups[i].questions[m].hasOwnProperty('options') || !isAnInt(parse.questionGroups[i].questions[m].options) || parse.questionGroups[i].questions[m].options == '' )
								throw 'Question Group ('+i+'), Question ('+m+') options should be an integer only';

							break;
						case 'tapper':
								if(parse.questionGroups[i].questions[m].hasOwnProperty('options') && typeof(parse.questionGroups[i].questions[m].options) !== 'string')
									throw 'Question Group ('+i+'), Question ('+m+') options should be a string';
							break;
						case 'slider':
							if(parse.questionGroups[i].questions[m].hasOwnProperty('options') && typeof(parse.questionGroups[i].questions[m].options) !== 'object')
								throw 'Question Group ('+i+'), Question ('+m+') options should be an object for slider questions';
								break;

						case '':
							throw 'Question Group ('+i+'), Question ('+m+') has a blank type parameter';
						default:
							if(!dataTypes.hasOwnProperty(parse.questionGroups[i].questions[m].type))
								throw 'Question Group ('+i+'), Question ('+m+') is using datatype ('+parse.questionGroups[i].questions[m].type+') which is not a valid option';
					}
				}
			}


			//at this point, we can consider the manifest to have passed all validation requirements

			//adds the indexes to the dropdown list for easy selection
			surveyLengths = parse.questionGroups.length;

			var $tmp = '<option value="c">Consent</option>';

			for(w=0;w<surveyLengths;w++)
			{
				$tmp += '<option value="'+w+'">Index '+w+'</option>';
			}

			$('#indexSelect').empty().append($tmp);

			canIndex = true;

			ws.send(JSON.stringify({type: 'LOAD', data: as.replace(/\n/g, '').replace(/\t/g, '')}));
			document.getElementById("surveyCode").value = "";

			if($(this).attr('data-value') == 'next') slide.next();

		} catch (err) {
			$jsonerror.show().text("ERROR: " + err );
		}

	});

	//Function to handle when the user clicks the build button on the admin screen
	$(".build").click(function () { ws.send(JSON.stringify({type: 'cmd', data: 'BUILD'})); });

	//Function to handle when the user clicks the finish button on the admin screen
	$(".finished").click(function () {

		//confirm that they are aware they are closing the survey and any unsaved questions will be lost
		if (confirm("Are you sure you wish to end the survey? This cannot be undone!! \n\n Make sure that there isn't a question on screen as that data will not be saved unless you click next first") === true) {
			ws.send(JSON.stringify({type: 'cmd', data: 'FINISHED'}));
			didIdothat = true;
			ws.close();
			slide.next();
		}

	});

	$(".wsnext").click(function () {

		//When the user clicks next to move all the tablets to the next screen; Tells the server to move next

		ws.send(JSON.stringify({type: 'MOVE', data: 'NEXT'}));

		//set all the clients into a rendering state
		for (var index in clients) {
			if (clients[index].state != 'error') {
				//set all clients that are not errored out to be rendering
				clients[index].set('rendering');
			}
		}

		//temporarily block the button Prevents double clicks
		$(".wsnext").attr('disabled', 'disabled');

		var wsnextTimeout = setTimeout(function () {
			//clear the disabled button after 800ms
			$(".wsnext").removeAttr('disabled')
		}, 800);

	});

	var $wsblank = $(".wsblank");
	$wsblank.click(function () {
	//toggle blanking the screens
		ws.send(JSON.stringify({type: 'MOVE', data: 'BLANK'}));

		$wsblank.attr('disabled', 'disabled');

		var wsblankTimeout = setTimeout(function () {
			$(".wsblank").removeAttr('disabled')
		}, 800);

		return $wsblank.hasClass('basinerror') ? $wsblank.removeClass('basinerror') : $wsblank.addClass('basinerror');

	});

	$(".wsprev").click(function () {
	//tell the server to move backwards
		ws.send(JSON.stringify({type: 'MOVE', data: 'PREV'}));
		for (var index in clients) {
			if (clients[index].state != 'error') {
				clients[index].set('rendering');
			}
		}

		$(".wsprev").attr('disabled', 'disabled');

		var wsprevTimeout = setTimeout(function () {
			$(".wsprev").removeAttr('disabled')
		}, 900);

	});

	//download the selected file after finishing
	$(".download").click(function () { location.href = './dl.php?type=' + $(this).attr('data-dl') + '&session=' + aaSession; });

	var ajaxwaiting = 0;

	$(".saveajax").click(function () {
		//connect to the internal and external servers to update the forwarding address
		ajaxwaiting = 2;
		var svRoute = $('#svRoute').val();

		//todo test if source is an outside apk

		//connect to the external server as specified and set the new route information
		$.ajax({
			method: "POST",
			url: "http://" + $('#svExternal').val() + "/tablets/index.html",
			data: {
				action: "save",
				key: "e12a465aefc5173862ea2375fded407e5ce1b3d3b3e814e530731569b1d2a16a",
				newdest: svRoute
			}
		})
			.done(function (msg) {
				//called once the call was successful
				ajaxwaiting--;
				console.log('Call to external server yielded ' + msg);
				if (msg != 'success') {
					alert('Failed to save to external server');
				}
				doneajax();

			});

		$.ajax({
			method: "POST",
			url: "http://" + $('#svInternal').val() + "/index.html",
			data: {
				action: "save",
				key: "e12a465aefc5173862ea2375fded407e5ce1b3d3b3e814e530731569b1d2a16a",
				newdest: svRoute
			}
		})
			.done(function (msg) {
				ajaxwaiting--;
				console.log('Call to internal server yielded ' + msg);
				if (msg != 'success') {
					alert('Failed to save to internal server');
				}
				doneajax();

			});

	});

	//whenever the index was changed on the dropdown list
	$("#indexSelect").on("change",function () {
		if(canIndex) {
			//tell the server to move backwards
			ws.send(JSON.stringify({type: 'MOVE', data: this.value}));
			for (var index in clients) {
				if (clients[index].state != 'error') {
					clients[index].set('rendering');
				}
			}

			$(this).attr('disabled', 'disabled');

			var indexSelecttimeout = setTimeout(function () {
				$("#indexSelect").removeAttr('disabled')
			}, 900);
		}

	});

	function doneajax() {
		if (ajaxwaiting === 0)	slide.prev();
	}

	//set the session number as the current timestamp
	$("#svSession").val(aaSession);

});