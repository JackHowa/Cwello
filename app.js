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
	mongoose = require('mongoose');

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

//Set up default mongoose connection
const mongoDB = 'mongodb://localhost/my_database';

mongoose.connect(mongoDB);

// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;

//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

let Schema = mongoose.Schema;

// define properties casted to SchemaTypes
// may want to use ObjectId instead 
// this is the model schema
let cardSchema = new Schema({
	trelloCardId: String,
	cwCardId: String,
	status: String
});

// // convert schema definition into a Model that's accessible 
let Card = mongoose.model('CardList', cardSchema);

// createWebhook();
// async function createWebhook() {
// 	try {
// 		// use board id to listen
// 		// http://53f47b43.ngrok.io
// 		const boardWebhook = await axios.post("https://api.trello.com/1/webhooks/", {
// 			description: 'Listen for board changes',
// 			callbackURL: 'https://c70f1dd7.ngrok.io/board-change',
// 			idModel: trelloServiceBoard,
// 			key: trelloKey,
// 			token: trelloToken,
// 			active: true
// 		});
// 		console.log("Board web hook " + boardWebhook);
// 	} catch (err) {
// 		console.log('Something went wrong when creating webhook');
// 		console.error(err);
// 	}
// }

// clearDb();
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

			// will be renaming these params on the other side to directly match in db
			const [statusChanged] = await Promise.all([cwTicketStatusChanged(tickets[i].id, tickets[i].status.name)]);
			// if the status for that cw id has changed 
			if (statusChanged === true) {
				// then move the card in trello 
				// update status in the db 

				// need to find the db for matching trello id and db's status 
				// need to hardcode the change of a cw board ticket 

				// hardcoding moving the change back to open 
				// moveTrelloCard(trelloCardId, targetTrelloListId);
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


async function parseCWBoard() {
	const cwPromise = axios.get(olderCwServiceBoard);
	const [cwBoard] = await Promise.all([cwPromise]);

	return cwBoard.data;
}

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
async function moveTrelloCard(trelloCardId = '5af9bdb92aa3910bd7a42d38', targetTrelloListId = openTrelloListId) {
	try {
		let trelloCardPromise = axios.put('https://api.trello.com/1/cards/' + trelloCardId, {
			idList: targetTrelloListId,
			key: trelloKey,
			token: trelloToken
		});
		const [trelloCard] = await Promise.all([trelloCardPromise]);
		console.log(trelloCard.data);
	} catch (err) {
		console.log(err)
	}
}


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

app.get('/board-change', (req, res) => {
	res.status(200).send('board change');
	console.log("board get");
});