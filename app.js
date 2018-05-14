"use strict";

// key values hidden using .env file -- do not commit
// via https://github.com/motdotla/dotenv
require('dotenv').config();

let express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	trelloKey = process.env.TRELLO_API_KEY,
	trelloToken = process.env.TRELLO_API_TOKEN,
	connectWiseApiKey = process.env.CW_API_KEY,
	axios = require('axios'),
	Card = require('./models/Card');

// read the payload from the webhook
app.use(bodyParser.json());

// trello info 
const inProgressTrelloListId = '5af5c45c81c07bd0e39b2ad4';
const openTrelloListId = '5af5b98846ccb9a5c0cfd3ba';

// url: https://trello.com/b/l8Qe2St0/cwello-test
const trelloServiceBoard = '5af5a9c2c93fd3f22b4c71fe';

// cw info 
// longer time frame filter
const olderCwServiceBoard = 'https://realnets+' + connectWiseApiKey + '@api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets?conditions=board/name="Dev Tickets" AND lastUpdated > [2018-04-20T00:00:00Z]';

const cwServiceBoard = 'https://realnets+' + connectWiseApiKey + '@api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets?conditions=board/name="Dev Tickets" AND lastUpdated > [2018-05-10T00:00:00Z]';

// this should be run on startup or upon a new ngrok server 
// new ngrok will create a different callback url 

// createWebhook();
async function createWebhook() {
	try {
		// use board id to listen
		// http://53f47b43.ngrok.io
		const boardWebhook = await axios.post("https://api.trello.com/1/webhooks/", {
			description: 'Listen for board changes',
			callbackURL: 'http://023a39e9.ngrok.io/board-change',
			idModel: trelloServiceBoard,
			key: trelloKey,
			token: trelloToken,
			active: true
		});
		console.log("Board web hook " + boardWebhook);
	} catch (err) {
		console.log('Something went wrong when creating webhook');
		console.error(err);
	}
}

// call clear db to empty mongodb db 
// clearDb();

// this is the basic runner 
// while loop 
// sleep for a bit u
// until true 
run();

async function run() {
	const tickets = await parseCWBoard();
	// console.log(tickets);
	// if cw id does not exist in the db  
	//    if the status for that cw id has changed 
	//       then move the card in trello and update status in the db 
	//    else 
	//       then don't do anything 
	// else 
	//    then create that new trello card from cw 

	for (let i = 0; i < tickets.length; i++) {
		const [ticketExists] = await Promise.all([cwTicketAlreadyExists(tickets[i].id)]);

		// just use a default here 
		// moveTrelloCard();

		// if cw id does exist in the db  
		if (ticketExists === true) {
			// don't make a new ticket
			console.log('ticket already exists');

			// need to hardcode the change of a cw board ticket 
			// will be renaming these params on the other side to directly match in db
			const [statusChanged] = await Promise.all([cwTicketStatusChanged(tickets[i].id, tickets[i].status.name)]);

			// if the status for that cw id has changed 
			if (statusChanged === true) {
				// need to find the db for matching trello id and db's status 
				// update status in the db 
				const [changedTicket] = await Promise.all([updateCardInDb(tickets[i].id, tickets[i].status.name)]);
				console.log(changedTicket.trelloCardId);

				// then move the card in trello
				// hardcoding moving the change back to open 
				moveTrelloCard(changedTicket.trelloCardId, tickets[i].status.name);
			}
		} else {
			// then create that new trello card from cw 
			const newTrelloCard = await createNewTrelloCard(tickets[i].id, tickets[i].status.name, tickets[i].summary);

			// save to db 
			createCard(newTrelloCard.id, tickets[i].id, tickets[i].status.name);
			console.log("done making one card");
		}
	}
	console.log("done making tickets");
}

// take in the range of the cw board 
// need to create the auth token for this to work in the cw board url
async function parseCWBoard() {
	console.log(olderCwServiceBoard);
	const cwPromise = axios.get(cwServiceBoard);
	const [cwBoard] = await Promise.all([cwPromise]);

	return cwBoard.data;
}

// check for whether cw card exists already 
// will return a true/false for a count 
async function cwTicketAlreadyExists(cwCardId) {
	try {
		// need to find if there's more than 1 match 
		// if there's more than one match that's a problem in the future
		const cardMatchCount = await Card.count({
			cwCardId
		}).exec();
		console.log("amount of matches found: " + cardMatchCount);
		return cardMatchCount > 0;
	} catch (err) {
		console.log('Something went wrong when trying to find the matching cw card id')
	}
}

// will return a true false
// this is an additional check for whether the cw id AND its status have changed
async function cwTicketStatusChanged(cwCardId, status) {
	try {
		// need to find if there's more than 1 match 
		// if there's more than one match that's a problem in the future
		// using es6 object matching {cwCardId: cwCardId, status: status} is equivalent
		const cardMatchCount = await Card.count({
			cwCardId,
			status
		}).exec();
		console.log("amount of matches found: " + cardMatchCount);

		// we can safely assume that cwCardId is a match already 
		// status has changed 
		// so if status has changed 
		// it will be no match zero 
		return cardMatchCount === 0;
	} catch (err) {
		console.log('Something went wrong when trying to find the matching cw card id and its status')
	}
}

// this is if the card in the cw isn't represented in trello yet
async function createNewTrelloCard(cwCardId, status, summary) {
	// needs to be string for post
	let stringCardId = cwCardId.toString();

	// determine which list the card will go in 
	// will need to make a better dictionary key check with matching
	let boardId = status === 'Triage' ? openTrelloListId : inProgressTrelloListId;

	let trelloCardPromise = axios.post('https://api.trello.com/1/cards', {
		name: summary,
		idList: boardId,
		keepFromSource: 'all',
		key: trelloKey,
		token: trelloToken
	});

	const [trelloCard] = await Promise.all([trelloCardPromise]);
	return trelloCard.data;
}

// make the instance for mongo db based on the model
function createCard(trelloCardId, cwCardId, status) {
	let stringTrelloCardId = trelloCardId.toString(),
		stringCwCardId = cwCardId.toString();

	let card = new Card({
		cwCardId: stringCwCardId,
		trelloCardId: stringTrelloCardId,
		status: status
	});
	card.save(function (err, card) {
		if (err) return console.error(err);
		console.log(card);
	});
}

// update trello card list based on change
async function moveTrelloCard(trelloCardId = '5af9fc0efc1caef03cd37aa4', status) {
	let targetList = status === 'Triage' ? openTrelloListId : inProgressTrelloListId;

	try {
		let trelloCardPromise = axios.put('https://api.trello.com/1/cards/' + trelloCardId, {
			idList: targetList,
			key: trelloKey,
			token: trelloToken
		});
		const [trelloCard] = await Promise.all([trelloCardPromise]);
		console.log(trelloCard.data);
		console.log('Moved ticket');
	} catch (err) {
		console.log(err)
	}
}

function updateCardInDb(cwCardId, status) {
	let stringCwCardId = cwCardId.toString();

	let query = { cwCardId: stringCwCardId };
	let update = { status: status };
	return Card.findOneAndUpdate(query, update, updateAndFindCallback);
}

function updateAndFindCallback(err, documents) {
	if (err) {
		console.log("Error: " + err);
	} else {
		// console.log(documents);
		return documents;
	}
}

// to ensure unhandled promises return informative errors
process.on('unhandledRejection', error => {
	console.log('unhandledRejection', error);
});

// quick sanity check
function findALlDb() {
	console.log("checking all entries");
	Card.find({}, (err, cards) => {
		if (err) {
			console.log(err);
		} else {
			// check on the last one just to make sure
			console.log(cards.length);
		}
	})


}

// empty out database in mongo db 
function clearDb() {
	console.log("clearing all entries");
	Card.remove({}, (err, cards) => {
		if (err) {
			console.log(err)
		} else {
			console.log("deleting all");
		}
	})
}

// express ability to listen for webhook changes stub
// listening on port 3000 
app.listen(3000, () => console.log('Example app listening on port 3000!'));

// web hooks for listening for board change
// this is where ngrok is being forwarded to
app.post('/board-change', (req, res) => {
	res.status(200).send('board change');
	console.log('board change post');
	console.log(req.body.action);
});

// this is to ensure that the webhook can be created
// trello looks for a good callback url
app.get('/board-change', (req, res) => {
	res.status(200).send('board change');
	console.log("board get");
});