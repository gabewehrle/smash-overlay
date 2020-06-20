var tournamentSlug = null;
var authToken = null;

var tournament = {}; //To be populated after Smash.gg query
var eventIndex = -1; //Same here

var numPages = 10; //How many pages per query, max of 1000 objects per request
var autoUpdateID; //Store the ID returned by autoupdate so it can be turned off later
var autoUpdateEnabled = false;
var updateRate = 2500; //ms, max of 80 requests per minute

//Object to store current match / game info
//To be populated after query
var curGame = {
	teams: [
		{
			name: "TEAM1",
			score: "0"
		},
		{
			name: "TEAM2",
			score: "0"
        }
	],
	roundName: "ROUND",
	bestOf: 0,
	id: "ID", //Internal smash.gg ID for current match
	manual: false, //Has this match been manually selected by the user?
	state: "down" //Current state (up, warn, down)
}

function enableKeyListener() {
	document.addEventListener('keyup', (e) => {
		switch (e.code) {
			//Reset to the current match
			case "KeyR":
				if (curGame.manual) {
					if (confirm("Confirm reset to currently streaming match?")) {
						curGame.manual = false;
						//runQuery({ 'manual': false, 'page': 1 });
					}
				} else {
					//runQuery({ 'manual': false, 'page': 1 });
				}
				break;
			//Manually select a match by ID letter
			case "KeyM":
				var ident = prompt("Please enter letter ID of match:");
				if (ident == null || ident == "") {
					break;
				}
				curGame.manual = true;
				curGame.id = ident;
				//runQuery({ 'manual': ident, 'page': 1 })
				break;
			//If autoupdate disabled, manually pull newest data
			case "KeyQ":
				runQuery({ 'manual': curGame.manual, 'page': 1 });
				break;
			//Toggle autoupdate on and off
			case "KeyT":
				if (autoUpdateEnabled) stopAutoUpdate();
				else startAutoUpdate();
				break;
			//Help
			//TODO: Update this!
			case "KeyH":
				alert("R: 'Reload' - Get currently streaming match data\n" +
					"M: 'Manual' - Enter ID to manually select a match\n" +
					"Q: 'Query' - Get currently selected match data");
		}
	});
}

//Wait for the document to load completely, then ask user for token and slug
//NOTE: May not work in internet explorer
if (document.readyState === 'interactive' || document.readyState === 'complete') {
	getTokenAndSlug();
} else {
	document.addEventListener('DOMContentLoaded', getTokenAndSlug);
}

//Ask user for token and slug information
async function getTokenAndSlug() {
	//Get slug and token from local storage
	tournamentSlug = localStorage.getItem('tournamentSlug');
	authToken = localStorage.getItem('authToken');

	queryTournament();
}

//Asynchronous fetch for tournament info
const queryTournament = async () => {
	const templateVars = { slug: tournamentSlug };
	const response = await getQuery(fillTemplate(tournamentQueryString, templateVars));

	//const data = await response;
	const json = await response.json();
	verifyTokenSlug(response, json, !response.ok);
}

async function getQuery(json) {
	return fetch('https://api.smash.gg/gql/alpha', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Authorization': 'Bearer ' + authToken
		},
		body: JSON.stringify({
			query: json
		})
	});
}

async function getEventIndex() {
	if (tournament.events.length <= 0) {
		swalError("no_events");
		return -1;
	} else {
		var html = "";
		for (var i = 0; i < tournament.events.length; i++) {
			html = html +
				'<button class="eventButton" id="event' + i + '">' +
				'<img src="' + tournament.events[i].videogame.images[0].url + '" class="eventImage"></img>' +
				'<div class="eventDiv">' + tournament.events[i].name + '</div>' +
				'</button>'
		}
		return (await swalSelectEvent(html));
    }
}

//Try to get tournament info
async function verifyTokenSlug(data, json, error) {
	//console.log("Got " + data.status);
	//console.log(json);

	//One hot encoding to specify what we need to prompt the user for
	const PROMPT_TOKEN = 0b01;
	const PROMPT_SLUG = 0b10;
	var toPrompt = 0;

	//Figure out what we need
	if (!data) {
		toPrompt = PROMPT_TOKEN | PROMPT_SLUG;
	} else if (!data.ok) {
		if (json && json.message == "Invalid authentication token") {
			toPrompt = PROMPT_TOKEN;
			error = true;
		} else {
			//Unknown error
			swalError("server", data);
			return;
		}
	} else {
		if (!json.data.tournament) {
			toPrompt = PROMPT_SLUG;
        }
	}

	//Prompt for needed data
	if (toPrompt & PROMPT_TOKEN) {
		authToken = (await swalPromptToken(error)).value;
		if (!authToken || authToken == "") {
			swalEntryCanceled("token");
			return;
		}
	}
	if (toPrompt & PROMPT_SLUG) {
		tournamentSlug = (await swalPromptSlug(error)).value;
		if (!tournamentSlug || tournamentSlug == "") {
			swalEntryCanceled("slug");
			return;
		}
		tournamentSlug = tournamentSlug.replace(/^\/+|\/+$/g, '');
	}
	//Query smash.gg for the data again
	if (toPrompt) {
		queryTournament();
		return;
	}

	//Save tournament info and get event
	tournament = json.data.tournament;
	eventIndex = (await getEventIndex()).value;
	if (!eventIndex) {
		swalEntryCanceled();
		return;
	} else if (eventIndex == -1) {
		return;
	}
	eventIndex = parseInt(eventIndex.substring(5));

	//Inform user that tournament was successfully selected
	console.log("Got tournament data for \"" + tournament.name + " | " + tournament.events[eventIndex].name + "\"");
	document.title = tournament.name;
	await swalInformTournament(tournament, eventIndex);
	startAutoUpdate();
	enableKeyListener();

	//Save token and slug
	localStorage.setItem('tournamentSlug', tournamentSlug);
	localStorage.setItem('authToken', authToken);
}

function updateGui() {
	document.title = (autoUpdateEnabled ? "A" : "M") + " | " +
		curGame.id + " | " + 
		curGame.teams[0].name + " (" + curGame.teams[0].score + ") vs " + curGame.teams[1].name + " (" + curGame.teams[1].score + ")";
	setFavicon(curGame.state);
}

function setFavicon(state) {
	var statePath = "favicons/down";
	if (state == "up") {
		statePath = "favicons/up";
	} else if (state == "warn") {
		statePath = "favicons/warn";
    }
	document.getElementById("fav1").setAttribute("href", statePath + "/apple-touch-icon.png")
	document.getElementById("fav2").setAttribute("href", statePath + "/favicon-32x32.png")
	document.getElementById("fav3").setAttribute("href", statePath + "/favicon-16x16.png")
	document.getElementById("fav4").setAttribute("href", statePath + "/site.webmanifest")
	document.getElementById("fav5").setAttribute("href", statePath + "/safari-pinned-tab.svg")
	document.getElementById("fav6").setAttribute("href", statePath + "/favicon.ico")
	document.getElementById("fav7").setAttribute("href", statePath + "/browserconfig.xml")
}

function startAutoUpdate() {
	if (!autoUpdateEnabled) {
		console.log("Starting auto update");
		//Run the query once before enabling auto update so you don't have to wait
		//updateRate before the first data is pulled down
		runQuery({ 'manual': curGame.manual, 'page': 1 });

		autoUpdateID = window.setInterval(function () {

			runQuery({ 'manual': curGame.manual, 'page': 1 });

		}, updateRate);
		autoUpdateEnabled = true;
	}
}

function stopAutoUpdate() {
	console.log("Stopping auto update");
	clearInterval(autoUpdateID);
	autoUpdateEnabled = false;
	updateGui();
}

function getBestOf(round) {
	for (var i = 0; i < tournament.events[0].phaseGroups[0].rounds.length; i++) {
		if (tournament.events[0].phaseGroups[0].rounds[i].number == round) {
			return tournament.events[0].phaseGroups[0].rounds[i].bestOf;
        }
	}
	return 0;
}

function query(page) {
	const templateVars = { page: page, numPages: numPages, slug: tournamentSlug };
	return getQuery(fillTemplate(pageQueryString, templateVars))
		.then((r) => r.json())
		.catch(error => console.warn(error));
}

function runQuery(opts) {
	query(opts['page']).then(data => parseQuery(data, opts));
}

function setGameData(node) {
	try {
		//Set team names
		curGame.teams[0].name = node.slots[0].entrant.name;
		curGame.teams[1].name = node.slots[1].entrant.name;
		//Set round name
		curGame.roundName = node.fullRoundText;
		//Set current identifier
		curGame.id = node.identifier;
		//Set scores
		curGame.teams[0].score = node.slots[0].standing.stats.score.displayValue ? node.slots[0].standing.stats.score.displayValue : 0;
		curGame.teams[1].score = node.slots[1].standing.stats.score.displayValue ? node.slots[1].standing.stats.score.displayValue : 0;

		//Best of
		curGame.bestOf = getBestOf(node.round);

		curGame.state = "up";
	} catch (err) {
		//alert("Selected match's data is not fully populated");
		console.warn("Selected match's data is not fully populated");
		curGame.state = "warn";
	}
	document.getElementById("team1").innerHTML = curGame.teams[0].name;
	document.getElementById("team2").innerHTML = curGame.teams[1].name;
	document.getElementById("score1").innerHTML = curGame.teams[0].score;
	document.getElementById("score2").innerHTML = curGame.teams[1].score;
	document.getElementById("title").innerHTML = curGame.roundName;
	document.getElementById("bestof").innerHTML = curGame.bestOf;
	updateGui();
}

function parseQuery(data, opts) {
	console.log(data);
	var nodes = data.data.tournament.events[eventIndex].sets.nodes;

	//Check if manual entry
	if (opts['manual']) {
		ident = curGame.id;
		//Iterate through the nodes to find the matching identifier
		for (var i = 0; i < nodes.length; i++) {
			if (nodes[i].identifier == ident.toUpperCase()) {
				console.log("Found current game");
				setGameData(nodes[i]);
				return;
            }
		}
		//Didn't find the node in this page. Get the next page
		if (data.data.tournament.events[eventIndex].sets.pageInfo.total > (numPages * (data.data.tournament.events[eventIndex].sets.pageInfo.page - 1)) + data.data.tournament.events[eventIndex].sets.nodes.length) {
			runQuery({ 'manual': ident, 'page': data.data.tournament.events[eventIndex].sets.pageInfo.page + 1 });
			return;
        }
		//alert("Could not find match with ID '" + ident + "'");
		console.error("Could not find match with ID '" + ident + "'");
		return;
	} else {
		//Iterate through the nodes to find the match that's currently streaming
		if (nodes) {
			for (var i = 0; i < nodes.length; i++) {
				if (nodes[i].stream && nodes[i].stream.enabled) {
					if (nodes[i].startedAt && !nodes[i].completedAt) {
						console.log("Found current game");
						setGameData(nodes[i]);
						return;
					}
				}
			}
		}
		//Didn't find the node in this page. Get the next page
		if (data.data.tournament.events[eventIndex].sets.pageInfo.total > (numPages * (data.data.tournament.events[eventIndex].sets.pageInfo.page - 1)) + data.data.tournament.events[eventIndex].sets.nodes.length) {
			runQuery({ 'manual': false, 'page': data.data.tournament.events[eventIndex].sets.pageInfo.page + 1 });
			return;
		}
		//alert("No currently streaming match");
		console.warn("No currently streaming match");
		swalInformNoMatch();
		curGame.state = "down";
		return;
	}
}

//Generic functions

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

//https://stackoverflow.com/a/37217166
const fillTemplate = function (templateString, templateVars) {
	return new Function("return `" + templateString + "`;").call(templateVars);
}