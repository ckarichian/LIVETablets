//add a new question to the nested consent
function addNestedConsent() {
	$('#nestedQuestionsHolder').append('<tr class="nestedConsentrow"><td><input type="text" class="nest_code">'+
		'</td><td><input type="text" class="nest_question"></td><td valign="top"><button type="button" class="delete-button" '+
		'onClick="$(this).parent().parent().remove()"> <i class="fa fa-minus"></i> </button></td></tr>');

	$('#nestedQuestionsWell').slideDown('fast');
}

function addOption(target)
{
	$well = $(target).parent().parent().parent().parent().find('tbody');
	$well.append('<tr class="optionRow"><td><input type="text" class="option_code">'+
		'</td><td><input type="text" class="option_value"></td><td><button type="button" class="delete-button" '+
		'onClick="$(this).parent().parent().remove()"> <i class="fa fa-minus"></i> </button></td></tr>');
}

function addQuestionGroup()
{
	$('#questionGroupWell').append('<div class="groupbox questionGroup" data-waitnext="yes" data-showready="yes"> <ul class="sortable"></ul>'+
		' <input type="button" name="next" class="action-button" value="Add" onClick="addQuestion(this)" '+
		'style="width: 50px"/>  <input type="button" class="action-button" value="waitNext" onClick="toggleButton(\'waitnext\', this);" '+
		'style="width: 75px"/><input type="button" class="action-button" value="showReady" onClick="toggleButton(\'showready\', this);" '+
		'style="width: 80px"/><button class="delete-button" '+
		'onClick="removeQuestionGroup(this)"> <i class="fa fa-minus"></i> </button></div>');

	$('.sortable').sortable({
		connectWith: ".sortable"
	}).disableSelection();

}

function removeQuestionGroup(obj)
{
		$(obj).parent().hide('explode',{},500, function (){
			$(this).remove();
			console.log('removing object');
		});
}

function toggleButton(prop, obj)
{
	//console.log('click');
	if($(obj).parent().data(prop) === 'no') {
		$(obj).removeClass('toggle-button');
		$(obj).parent().data(prop,"yes");
	} else {
		$(obj).addClass('toggle-button');
		$(obj).parent().data(prop,"no");
	}

	$(obj).blur();
}

var targetChild;
function addQuestion(child) {
	targetChild = child;
	$('form').not($('#msform')).trigger('reset');
	$('.shade').toggle();
}

function pushQuestion(form) {
	$('.shade').toggle();
	var $form = $(form).parent();
	var obj = {
		code: $form.find('.used[name="code"]').val().trim(),
		title: $form.find('.used[name="title"]').val().trim() ,
		hint: $form.find('.used[name="hint"]').val().trim(),
		type: $form.find('.used[name="type"]').val().trim(),
		options: '',
		optionsType: $form.find('.used[name="optionsType"]').val().trim()
	};

	//var obj = {code: 'q1', title: 'What is your name?', hint: 'Hint: This is an easy question', type: 'text'}; 
	var tgt = $(targetChild).parent().find('.sortable');
	$tgtHTML = '<li><div class="questionLiBlock">'+obj.code+'<i class="fa fa-chevron-circle-down toggler"></i></div><div class="properties" data-visible="no">'+
		'<label>Title:</label><input type="text" value="'+obj.title+'" onkeyup="$(this).parent().parent().data(\'title\',this.value)" /><div class="clear"></div>'+
		'<label>Hint:</label><input type="text" value="'+obj.hint+'" onkeyup="$(this).parent().parent().data(\'hint\',this.value)" /><div class="clear"></div>'+
		'<label>Type:</label><input type="text" value="'+obj.type+'" disabled /><div class="clear"></div>';
	//switch options type
	switch(obj.optionsType)
	{
		case 'list':
			$form.find("input[type='text']").each(function() {
				$(this).attr('value', $(this).val());
			});
			var $clone = $form.find("table").wrap("<div />").parent().clone(true);
			$tgtHTML += '<label>Options:</label><br>'+ $clone.html() +'<div class="clear"></div>';
			$form.find('.optionRow').remove();
			$form.find("input[type='text']").each(function() {
				$(this).attr('value', '');
			});
			break;
		case 'text':
			obj.options = $form.find('.used[name="options"]').val().trim();
			$tgtHTML += '<label>Option:</label><input type="text" value="'+obj.options+'" onkeydown="$(this).parent().parent().data(\'options\',this.value)" /><div class="clear"></div>';
			break;
		case 'hidden':
			obj.options = $form.find('.used[name="options"]').val().trim();
			break;
		case 'slider':
				obj.options = JSON.stringify({
					min: $form.find('.used[name="min"]').val().trim(),
					mid: $form.find('.used[name="mid"]').val().trim(),
					max: $form.find('.used[name="max"]').val().trim()
				});
			$tgtHTML += '<label>Options:</label><br><pre>'+ obj.options +'</pre><div class="clear"></div>';
			break;
	}

	$tgtHTML +=	'<div class="delete-button" onClick="removeQuestion(this)" style="width:100px"> <i class="fa fa-remove"></i> Delete </div></div></li>';
	$tgtHTML = $($tgtHTML);
	$tgtHTML.data('code',obj.code).data('title',obj.title).data('hint',obj.hint).data('type',obj.type).data('options',obj.options).data('optionsType',obj.optionsType);
	$tgtHTML.appendTo(tgt);

}

function removeQuestion(obj){
	$(obj).parent().parent().hide('explode',{},800, function (){
		$(this).remove();
		console.log('removing object');
	});
}

//sanitize text strings for inclusion
function sanitize(i) {
	var $s = $('#' + i);
	var str = $s.val();
	if (str !== false && str !== '' && str.length > 1) {
		return str.trim();
	}
	else {
		return (($s.attr('data-default') === 'null') ? null : $s.attr('data-default'));
	}
}

$(document).ready(function () {

	$('#accordion').load('inputs.html', function (){
		$('#accordion').find('.accordion-toggle').click(function () {

			//Expand or collapse this panel
			$(this).next().slideToggle('fast');

			//Hide the other panels
			$(".accordion-content").not($(this).next()).slideUp('fast');

		});

		$('form').on('submit', function (e) {e.preventDefault()});
	});


	$('#consentContent').trumbowyg({
		resetCss: true,
		btns: ['bold', 'italic', 'underline', 'strikethrough','|','justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull','|','unorderedList', 'orderedList','|','horizontalRule','|',"viewHTML"]
	});


	$( "fieldset" ).on( "click", ".toggler", function() {

		$target = $( this ).parent().next();
		if($target.attr('data-visible') == 'yes')
		{
			$target.slideUp('fast');
			$(this).removeClass().addClass('toggler fa fa-chevron-circle-down');
			$target.attr('data-visible', 'no');
		} else if($target.data('visible') == 'no')
		{
			$target.slideDown('fast');
			$(this).removeClass().addClass('toggler fa fa-chevron-circle-up');
			$target.attr('data-visible', 'yes');
		}
		//   <li><div class="questionLiBlock">Q1<i></i></div><div class="properties">properties</div></li>
	});

	$('.sortable').sortable().disableSelection();

	window.onbeforeunload = confirmExit;
	function confirmExit()
	{
		return "Are you sure you want to close the builder? You cannot restore a survey from a manifest";
	}

});

$('.finish').click(function () {

	try {
		var output = {
			title: sanitize("consentTitle"),
			language: {
				waitText: sanitize("waitText"),
				nextQuestion: sanitize("nextQuestion"),
				endText: sanitize("endText")
			},
			version: sanitize("verCode"),
			consent: {
				signature: ((sanitize("consentSignature")) === "true"),
				body : sanitize("consentContent")

			},
			questionGroups: []
		};


			var nestCodeList =[];
			if($('.nestedConsentrow').length > 0) {
				output.consent.nestedConsent = { questions: [] };
				$('.nestedConsentrow').each(function () {

					var nQuest = $(this).find('.nest_question').val();
					var nCode = $(this).find('.nest_code').val().replace(/[^a-z0-9]/gi, '');

					if (nestCodeList.indexOf(nCode) > -1 || nCode.length < 1)
						throw "Each Nested Consent Question Must Have a Unique Code";

					nestCodeList[nestCodeList.length] = nCode;
					output.consent.nestedConsent.questions.push({code: nCode, question: nQuest, type: "nest"});

				});
		}

		$demo = $('.demographicGroup').find('.sortable li');
		if($demo.length > 0) {
			output.demographics = { questions: [] };

			$demo.each(function () {

				var optionsType = $(this).data('optionsType');
				var options = null;
				if(optionsType == 'list') {
					options = [];
					$(this).find('.optionRow').each(function () {
						options.push({
							code: $(this).find('.option_code').val().trim(),
							value: $(this).find('.option_value').val().trim()
						});
					});
				}

				if(optionsType == 'text') {
					options = $(this).data('options');
				}

				if(optionsType == 'slider') {
					options = JSON.parse($(this).data('options'));
				}

				output.demographics.questions.push({
					code: $(this).data('code'),
					title: $(this).data('title'),
					hint: $(this).data('hint'),
					type: $(this).data('type'),
					options: options
				});
			});
		}

		$('.questionGroup').each(function () {

				$demo = $(this).find('.sortable li');
				if($demo.length > 0) {
					var grp = {showReady: ($(this).data('showready') == 'yes'), waitNext: ($(this).data('waitnext')=='yes'), questions: []};

					$demo.each(function () {

						var optionsType = $(this).data('optionsType');
						var options = null;
						if(optionsType == 'list') {
							options = [];
							$(this).find('.optionRow').each(function () {
								options.push({
									code: $(this).find('.option_code').val().trim(),
									value: $(this).find('.option_value').val().trim()
								});
							});
						}

						if(optionsType == 'text') {
							options = $(this).data('options');
						}

						if(optionsType == 'slider') {
							options = JSON.parse($(this).data('options'));
						}

						var el = {
							code: $(this).data('code'),
								title: $(this).data('title'),
							hint: $(this).data('hint'),
							type: $(this).data('type'),
							options: options
						};

						if(el.options === null) delete el[options];

						grp.questions.push(el);
					});

					output.questionGroups.push(grp);
				}


			});

		//return the output

		$('#yourCode').val(JSON.stringify(output));
	}
	catch (err) {
		alert(err);
	}

});


function saveTextAsFile()
{
	var textToWrite = $('#yourCode').val();
	var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
	var fileNameToSaveAs = 'manifest.txt';

	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs;
	downloadLink.innerHTML = "Download File";
	if (window.webkitURL != null)
	{
		// Chrome allows the link to be clicked
		// without actually adding it to the DOM.
		downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
	}
	else
	{
		// Firefox requires the link to be added to the DOM
		// before it can be clicked.
		downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
		downloadLink.onclick = destroyClickedElement;
		downloadLink.style.display = "none";
		document.body.appendChild(downloadLink);
	}

	downloadLink.click();
}

function postToAdmin()
{
		var text = $('#yourCode').val();
		$('<form class="hidden-form" target="_blank" action="../../admin/admin.html" method="post" style="display: none;"><textarea name="fill">'+text+'</textarea></form>')
			.appendTo('body');
		$('.hidden-form').submit().remove();
}


function jsonEditor()
{
	var text = $('#yourCode').val();
	$('<form class="hidden-form" target="_blank" action="http://jsoneditoronline.org" method="get" style="display: none;"><textarea name="json">'+text+'</textarea></form>')
		.appendTo('body');
	$('.hidden-form').submit().remove();
}