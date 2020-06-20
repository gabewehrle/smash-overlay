//All dialogs / toasts / messages / prompts

function swalPromptToken(error) {
	return Swal.fire({
		title: (error ? "Invalid token" : "Please enter your API token"),
		text: (error ? "Please verify the token and try again" : null),
		input: 'text',
		icon: (error ? 'error' : 'question'),
		showCancelButton: false,
		confirmButtonText: "Submit",
		footer: '<a href="https://smashgg-developer-portal.netlify.app/docs/authentication" style="color:#2196f3;font-weight:600;cursor:pointer">Get a Smash.gg API Token</a>',
		inputValidator: (value) => {
			if (!value) {
				return "Please enter a token";
			}
		}
	});
}

function swalPromptSlug(error) {
	return Swal.fire({
		title: (error ? "Invalid tournament slug" : "Please enter your tournament slug"),
		text: (error ? "Please verify the slug and try again.\nEnter the part of the address immediately following '/tournament/' but no further than the next '/'" : "Enter the part of the address immediately following '/tournament/' but no further than the next '/'"),
		input: 'text',
		icon: (error ? 'error' : null),
		imageUrl: 'slug_help.png',
		showCancelButton: false,
		confirmButtonText: "Submit",
		inputValidator: (value) => {
			if (!value) {
				return "Please enter a slug";
			}
		}
	});
}

function swalEntryCanceled(what) {
	what = capitalizeFirstLetter(what);
	console.log(what + " entry canceled by user. Please reload");
	Swal.fire({
		title: 'Error:',
		text: what + ' entry canceled by user. Please reload.',
		toast: true,
		position: 'top-end',
		icon: 'error',
		confirmButtonText: 'Reload'
	}).then(() => {
		location.reload();
	})
}

function swalInformNoMatch() {
	if (Swal.isVisible()) {
		Swal.increaseTimer((updateRate * 2) - Swal.getTimerLeft());
	} else {
		Swal.fire({
			title: 'No currently streaming match.',
			text: 'Waiting for one to start...',
			toast: true,
			position: 'top-end',
			icon: 'warning',
			showConfirmButton: false,
			timer: updateRate * 2,
			timerProgressBar: false
		})
	}
}

function swalSelectEvent(html) {
	return Swal.fire({
		title: "Select an Event",
		showConfirmButton: false,
		html: html,
		onOpen: function () {
			var buttons = document.getElementsByClassName("eventButton");
			for (var i = 0; i < buttons.length; i++) {
				buttons[i].onclick = function (buttonId) {
					console.log(this.id);
					swal.clickConfirm();
					Swal.update({ titleText: this.id });
				}
			}
		},
		preConfirm: () => {
			return Swal.getTitle().innerHTML;
		}
	})
}

function swalError(what, data, reload) {
	//Using a switch statement makes this easily expandable
	var msg;
	switch (what) {
		case "server":
			msg = "An unexpected error occured. Server returned '" + data.status + ": " + data.statusText;
			break;
		case "no_events":
			msg = "No events found!";
			break;
		default:
			msg = data;
			break;
	}
	return Swal.fire({
		icon: 'error',
		title: 'Error',
		text: msg,
		confirmButtonText: (reload ? 'Reload' : 'Ok')
	}).then(() => {
		if (reload) location.reload();
	})
}

function swalInformTournament(tournament, eventIndex) {
	return Swal.fire({
		title: tournament.name + " | " + tournament.events[eventIndex].name,
		position: 'top-end',
		icon: 'success',
		showConfirmButton: false,
		timer: 3000,
		timerProgressBar: true,
		toast: true
	})
}

function swalInformAutoUpdateDisabled() {
	return Swal.fire({
		title: "Autoupdate is currently disabled. Press 'T' to toggle",
		position: 'top-end',
		icon: 'info',
		toast: true,
		confirmButtonText: 'Ok',
		timer: 10000,
		timerProgressBar: true,
	})
}