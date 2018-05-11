require('dotenv').config();

const express = require('express');
const app = express();
const request = require("request");

const axios = require('axios');

// Node wrapper for Trello's HTTP API 
const Trello = require('node-trello');

const trelloKey = process.env.TRELLO_API_KEY;
const trelloToken = process.env.TRELLO_API_TOKEN;

// utilize node-trello for easy calls 
const t = new Trello(trelloKey, trelloToken);

// this is the test cwello board 
// url: https://trello.com/b/l8Qe2St0/cwello-test
const trelloServiceBoard = '5af5a9c2c93fd3f22b4c71fe';

const connectWiseApiKey = process.env.CW_API_KEY;

// const cwServiceBoard = 'https://realnets+' + connectWiseApiKey = '@api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets?conditions=board/name="Dev Tickets" AND lastUpdated > [2018-04-20T00:00:00Z]';

const cwServiceBoard = 'https://realnets+' + connectWiseApiKey + '@api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets?conditions=board/name="Dev Tickets" AND lastUpdated > [2018-05-10T00:00:00Z]';

// db stuff 
const mongoose = require('mongoose');
let Schema = mongoose.Schema;

// define properties casted to SchemaTypes
// may want to use ObjectId instead 
let cardSchema = new Schema({
	trelloCardId: String,
	cwCardId: String
});

// // convert schema definition into a Model that's accessible 
let Card = mongoose.model('CardList', cardSchema);

// // test out making a card for connectwise 
// // createCard();

// // hello world 
// app.get('/', (req, res) => res.send('Hello World!'));

// // listening on port 3000 
// app.listen(3000, () => console.log('Example app listening on port 3000!'));

// // get cwello board all cards
// app.get('/trello-board', (req, res) => {
// 	let cardsBoardURL = '/1/boards/' + trelloServiceBoard + '/cards';
// 	t.get(cardsBoardURL, (err, data) => {
// 		if (err) throw err;
// 		res.send(data);
// 	});
// });

// // getTrelloList(trelloServiceBoard);

// // get trello board list ids 
// function getTrelloList(boardId) {
// 	let listsBoardURL = '/1/boards/' + trelloServiceBoard + '/lists';
// 	t.get(listsBoardURL, (err, data) => {
// 		if (err) throw err;
// 		console.log(data);
// 	});
// }

// first test card 
const sampleCardId = '5af5bbc56d8843ac294db4e2';

// in progress 
const targetTrelloListId = '5af5c45c81c07bd0e39b2ad4';

// open 
const openTrelloListId = '5af5b98846ccb9a5c0cfd3ba';

// mvoe hardcoded sample card to target list
// moveTrelloCard(sampleCardId, targetTrelloListId);

// move a card to a new list 
function moveTrelloCard(trelloCardId, targetTrelloListId) {
	let options = { method: 'PUT',
	url: 'https://api.trello.com/1/cards/' + trelloCardId,
	qs: { idList: targetTrelloListId,
		key: trelloKey,
		token: trelloToken 
	} };
  
  request(options, function (error, response, body) {
	if (error) throw new Error(error);
  
	console.log(body);
  });
}

// get connectwise tickets 
// app.get('/cw-board', (req, res) => {
// 	let options = { method: 'GET', url: cwServiceBoard };
// 	var allCards;
// 	request(options, (error, response, body) => {
// 		if (error) throw new Error(error);
// 		console.log(JSON.parse(body));
// 	})
// });

parseCWBoard();

// axios is nice because it returns json just as you'd expect 
function parseCWBoard() {
	axios.get(cwServiceBoard).then(results => {
		// look in return value of data 
		let tickets = results.data;

		// suppose I could map this with only values I need
		// last value wasn't reading huh with <=
		for (let i = 0; i < tickets.length; i++) {
			// createCard(1, tickets[i].id);
			// for (key in tickets[i]) {
			// 	console.log(key);
			// 	console.log(tickets[i][key]);
			// }
			
			createTrelloCard(tickets[i].id, tickets[i].status.name, tickets[i].summary);
		}
	}).catch(error => console.log(error));
}

// hard coded making a consolidated card 
// need to get both of these in to one function 
function createCard(trelloCardId = '1', cwCardId = '34') {
	let card = new Card({
		cwCardId: cwCardId,
		trelloCardId, trelloCardId
	});
	console.log(card);
}

function createTrelloCard(cwCardId, status, summary) {
	// needs to go in to axios as a string not Number 

	let stringCardId = cwCardId.toString();
	axios.post('https://api.trello.com/1/cards', {
		name: summary,
		idList: openTrelloListId,
		keepFromSource: 'all',
		key: trelloKey,
		token: trelloToken
	  })
	  .then(function (response) {
		console.log(response);
	  })
	  .catch(function (error) {
		console.log(error);
	  });
}
