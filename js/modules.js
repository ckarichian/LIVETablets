/*

 LIVESurvey Tablet Software
 Author: Carl Karichian  2015
 Designed to produce customizable surveys for use in the LIVELab that are synchronized
 to a master controller.

 */

/* load the dataTypes (types of questions) for use in the survey. Only add modifications at the end
   where it is marked safe to do so. Please read the documentation carefully for an explaination of
   each datatype in more detail or for information on the structure of dataTypes overall
 */


var dataTypes = {

	block : {

		//Plain block of text to write on the screen

		databaseType: '',

		noSave: true,

		getHTML: function (title, hint, objects, qid) {
			return '<div class="question ' + qid + '"><h3 id="questionTitle" style="text-align: center">' + title + '</h3></div>';
		},

		getValue: function (qid){
			return '';
		}
	},

	divider : {

		//splits a questionGroup between multiple screens

		databaseType: '',

		noSave: true,

		hasAppended : false,

		helper: function(){
			render('wait', {signal: false, text: lang.waitText} );
			websocket.send('ECHO',{msg: 'READY'});
			isReady = true;
		},

		getHTML: function (title, hint, objects, qid) {
			dataTypes.divider.hasAppended = false;
			return '</div><div class="center"><br><div class="button" onclick="$(this).parent().parent().hide();$(this).parent().parent().next().show();">Next</div></div>'
				+ '</div><div class="questionGroup" style="display:none"><div class="questionWrap">';
		},

		getValue: function (qid){
			return '';
		},

		init: function(qid)
		{
			if(!dataTypes.divider.hasAppended) {
				$('.questionGroup').last().append('<div class="center"><div class="button" onclick="dataTypes.divider.helper()">Finished</div></div>');
				dataTypes.divider.hasAppended = true;
			}
		}

	},

	text: {

		//Renders a text input and allows for a short text fragment to be entered up to 255 characters

		databaseType: 'VARCHAR (255)',

		getHTML: function (title, hint, objects, qid) {
			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div>';

			output += '<div class="answerWrap"><input type="text" name="' + qid + '" id="' + qid + '"  onClick="clearReady()" maxlength="255"';
			if(answers.hasOwnProperty(qid)) output += ' value="'+answers[qid].ans+'" ';
			output += '></div>';

			return output;
		},

		getValue: function (qid) {

			return $('#' + qid).val() || '';
		}

	},

	bigtext: {

		//Renders a textarea and allows for a large blob of text to be entered

		databaseType: 'TEXT',

		getHTML: function (title, hint, objects, qid) {
			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div>';

			if ($.isNumeric(objects)) {
				output += '<div class="answerWrap"><textarea rows="' + objects + '" name="' + qid + '" id="' + qid + '" onClick="clearReady()">';
				if(answers.hasOwnProperty(qid)) output += answers[qid].ans;
				output += '</textarea></div>';
			}
			else {
				output += '<b>Question ' + qid + ' is not properly defined';
			}

			return output;
		},

		getValue: function (qid) {
			return $('#' + qid).val() || '';
		}

	},

	radio: {

		//Renders a single choice list of options. The value saved can be up to 255 characters

		databaseType: 'VARCHAR (255)',

		getHTML: function (title, hint, objects, qid) {
			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div>';

			output += '<div class="answerWrap"><table border="0" class="radios"> ';


			$(objects).each(function () {
				var isChecked = (answers.hasOwnProperty(qid) && this.code == answers[qid].ans) ? ' checked' : '';
				if (this.hasOwnProperty('code') && this.hasOwnProperty('value'))
					output += '<tr><td><input type="radio" name="' + qid + '" id="' + qid + '" value="' + this.code
					+ '" onClick="clearReady()"'+isChecked+'></td><td valign="middle"> ' + this.value + ' </td></tr> ';
			});

			output += '</table></div>';

			return output;
		},

		getValue: function (qid) {
			return $("input[name='" + qid + "']:checked").val() || '';
		}

	},

	dropdown: {

		//Renders a drop down list of options to choose from. The saved value can be up to 255 characters

		databaseType: 'VARCHAR (255)',

		getHTML: function (title, hint, objects, qid) {
			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div>';

			output += '<div class="answerWrap"><select onchange="clearReady()" name="' + qid + '" id="' + qid + '">';

			output += '<option value="" disabled';
			if(!answers.hasOwnProperty(qid)) output += ' selected';
			output += '>Select an Answer</option>';

			$(objects).each(function () {
				var isChecked = (answers.hasOwnProperty(qid) && this.code == answers[qid].ans) ? ' selected' : '';
				if (this.hasOwnProperty('code') && this.hasOwnProperty('value'))
					output += '<option value="' + this.code + '"'+isChecked+'>' + this.value + '</option>';
			});

			output += '</select></div>';

			return output;
		},

		getValue: function (qid) {
			return $('#' + qid).val() || '';
		}

	},

	yesno: {

		//Renders a radio list as before, but with only yes and no. More of a time saver than a unique question type

		databaseType: 'VARCHAR (1)',

		getHTML: function (title, hint, objects, qid) {
			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div>';

			output += '<div class="answerWrap"><table border="0" class="radios"> '
			+ '<tr><td><input type="radio" name="' + qid + '" id="' + qid + '" value="Y" onClick="clearReady()"';
			if(answers.hasOwnProperty(qid) && answers[qid].ans == 'Y') output += ' checked';
			output += '></td><td valign="middle"> Yes </td></tr>'
			+ '<tr><td><input type="radio" name="' + qid + '" id="' + qid + '" value="N" onClick="clearReady()"';
			if(answers.hasOwnProperty(qid) && answers[qid].ans == 'N') output += ' checked';
			output += '></td><td valign="middle"> No </td></tr>'
			+ '</table></div>';

			return output;
		},

		getValue: function (qid) {
			return $("input[name='" + qid + "']:checked").val() || '';
		}

	},

	nest: {

		//Special option for the nested consent questions

		databaseType: 'VARCHAR (1)',

		getHTML: function (title, hint, objects, qid) {
			var output = '<hr /><div class="nest"><p>' + title + '</p>';

			output += '<table border="0" class="radios"> '
			+ '<tr><td><input type="radio" name="' + qid + '" id="' + qid + '" value="Y"';
			if(answers.hasOwnProperty(qid) && answers[qid].ans == 'Y') output += ' checked';
			output += '></td><td valign="middle"> Yes </td></tr>'
			+ '<tr><td><input type="radio" name="' + qid + '" id="' + qid + '" value="N"';
			if(answers.hasOwnProperty(qid) && answers[qid].ans == 'N') output += ' checked';
			output += '></td><td valign="middle"> No </td></tr>'
			+ '</table>';

			return output;
		},

		getValue: function (qid) {
			return $("input[name='" + qid + "']:checked").val() || '';
		}

	},

	number: {

		//Renders a text input that will only accept numbers and special characters using the android numeric pad

		databaseType: 'VARCHAR (255)',

		getHTML: function (title, hint, objects, qid) {
			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div>';

			output += '<div class="answerWrap"><input type="number" maxlength="50" size="15" name="' + qid + '" id="' + qid + '" onClick="clearReady()" ';
			if(answers.hasOwnProperty(qid)) output += 'value = "'+answers[qid].ans+'" ';
			output += '/></div>';

			return output;
		},

		getValue: function (qid) {
			return $('#' + qid).val() || '';
		}

	},

	tapper: {

		//Renders a button that when tapped will record the current timestamp of the tablet repeatedly

		databaseType: 'TEXT',

		getHTML: function (title, hint, objects, qid) {
			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div>';

			var text = (objects) ? objects : 'Tap Here';

			output += '<div class="center"><br><br><br><div class="button tapper" onClick="buffer[\''+qid+'\'].tap()" '
			+'onTouchStart="this.style.background=\'#2DDB8C\'" onTouchEnd="this.style.background=\'#1FB6DB\'"> '
			+ text + '</div></div>';

			return output;
		},

		getValue: function (qid) {
			return buffer[qid].values;
		},

		init: function (qid) {
			buffer[qid] = {
				values: ((answers.hasOwnProperty(qid)) ? answers[qid].ans : ''),
				tap: function () {
					buffer[qid].values += (Date.now() - timeOffset) + ',';
				}
			};
		}

	},

	checkbox: {

		//Renders a list of potential options where one can choose multiple answers

		databaseType: 'TEXT',

		getHTML: function (title, hint, objects, qid) {
			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div><br>';

			output += '<div class="answerWrap"></div><table border="0" class="radios"> ';

			buffer = (answers.hasOwnProperty(qid)) ? answers[qid].ans.split(",") : [0];
			$(objects).each(function () {
				if (this.hasOwnProperty('code') && this.hasOwnProperty('value')) {
					output += '<tr><td><input type="checkbox" name="' + qid + '" id="' + qid + '" value="' + this.code + '" onClick="clearReady()"';
					if(buffer.indexOf(this.code) > -1) { output += ' checked';}
					output += '></td><td valign="middle"> ' + this.value + ' </td></tr> ';
				}
			});

			output += '</table></div>';

			return output;
		},

		getValue: function (qid) {
			return $("#" + qid + ":checked").map(
					function () {
						return this.value;
					}).get().join(",") || '';
		}
	},

	timedRadio: {

		//Renders a single choice list of options. Times how long it takes for the participant to enter their final
		//response. The value saved can be up to 255 characters, but includes the timestamp

		databaseType: 'VARCHAR (255)',

		getHTML: function (title, hint, objects, qid) {
			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div>';

			output += '<div class="answerWrap"><table border="0" class="radios"> ';

			$(objects).each(function () {
				if (this.hasOwnProperty('code') && this.hasOwnProperty('value')) {
					output += '<tr><td><input type="radio" name="' + qid + '" id="' + qid + '" value="' + this.code
					+ '" onClick="buffer.'+qid+'.endTime = Date.now(); clearReady()"></td><td valign="middle"> ' + this.value + ' </td></tr> ';
				}
			});

			output += '</table></div>';

			return output;
		},

		getValue: function (qid) {
			buffer[qid].obj = $("input[name='" + qid + "']:checked");
			buffer.prev = (answers.hasOwnProperty(qid)) ? answers[qid].ans + ', ' : '';
			if (buffer[qid].obj.length > 0) {
				buffer[qid].valopt = buffer[qid].obj.val();

				return buffer.prev + buffer[qid].valopt + ' in ' + (buffer[qid].endTime - buffer[qid].startTime);
			}
			else {
				return buffer.prev + 'No Answer';
			}
		},

		init: function (qid) {
			buffer[qid] = {};
			buffer[qid].startTime = Date.now();
			buffer[qid].endTime = 999999999;
		}

	},

	icons : {

		//renders a grid of between 2 to 9 icons that the user can tap on to select

		databaseType: 'VARCHAR (255)',

		helper: function (item) {
			var $qid = $(item).attr('data-qid');
			buffer[$qid].endTime = Date.now();
			$('.boxSelect > .'+$qid).removeClass('selected');
			buffer[$qid].val = $(item).attr('data-value');
			$(item).addClass('selected');
			clearReady();

		},

		getHTML: function (title, hint, objects, qid) {

			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div>';

			$tmp = (Array.isArray(objects)) ? objects.length : 0;
			$class = 'boxSelect';

			if($tmp < 3 || $tmp == 4) $class += ' box4';
			if($tmp == 3 || $tmp > 4) $class += ' box9';

			output += '<div class="'+$class+'">';
			$(objects).each(function () {
				output += '<div class="'+qid+'" data-value="'+this.code+'" data-qid="'+qid+'" onClick="dataTypes.icons.helper(this)"><i class="fa '
					+ ((this.icon) ? this.icon : 'fa-volume-up') + '"></i><br>' + this.value + '</div>';
			});

			output += '</div>';

			return output;
		},

		getValue: function (qid) {

			buffer[qid].val = (buffer[qid].val !== '') ? buffer[qid].val + ' in ' + (buffer[qid].endTime - buffer[qid].startTime) : 'No Answer';
			return (answers.hasOwnProperty(qid)) ? answers[qid].ans + ', ' + buffer[qid].val : buffer[qid].val;
		},

		init: function (qid) {
			buffer[qid] = {};
			buffer[qid].val = '';
			buffer[qid].startTime = Date.now();
			buffer[qid].endTime = 999999999;
			return true ;
		}
	},

	slider : {

		//renders a slider on the screen

		databaseType: 'LONGTEXT',

		getHTML: function (title, hint, objects, qid){
			var output = '<div class="question ' + qid + '"><h3 id="questionTitle">' + title + '</h3>';
			output += (hint) ? '<p id="questionHint">' + hint + '</p></div>' : '</div>';

			output += '<div class="sliderLabels"><div>'+((objects && objects.hasOwnProperty('max')) ? objects.max : 'max') +'</div>'
				+'<div>'+((objects && objects.hasOwnProperty('mid')) ? objects.mid : 'mid') +'</div>'
				+'<div>'+((objects && objects.hasOwnProperty('min')) ? objects.min : 'min') +'</div></div><div class="sliderhld">'
				+ '<div class="slider noUi-extended '+qid+'" id="uislider" style="height:100%"></div></div>';
			return output;
		},

		getValue: function (qid) {

			clearInterval(buffer[qid].timer);
			return ((answers.hasOwnProperty(qid)) ? answers[qid].ans + '; NEW SESSION - ' + buffer[qid].values : buffer[qid].values);

		},

		init: function (qid) {

			buffer[qid] = {};
			buffer[qid].slider = $('#uislider.'+qid);
			buffer[qid].slider.noUiSlider(
				{
					start: 50,
					behaviour: 'none',
					orientation: 'vertical',
					range: {
						'min': 0,
						'max': 100
					}
				});

			buffer[qid].values = (Date.now()-timeOffset)+'|50';
			buffer[qid].timer = setInterval(function ()
			{
				buffer[qid].values += ','+(100-Math.floor(buffer[qid].slider.val()));

			},500);
		}
	}
};

//   !!!   ONLY EDIT OR ADD NEW MODULES AFTER THIS LINE

/*

Example:

dataTypes['newTypeOfQuestion'] = {

	databaseType : 'VARCHAR (200)',
	getHTML: function (title, hint, objects, qid){ ... },
	getValue: function (qid) { ... },
	init: function (qid) { ... }
}


 */




//   !!!   DO NOT EDIT PAST THIS LINE

//Allow NodeJS to pass this object to other required modules but not within the tablet mode
if (typeof exports !== 'undefined' && this.exports !== exports) {
	module.exports = dataTypes;
}