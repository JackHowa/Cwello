// key values hidden using .env file -- do not commit
// via https://github.com/motdotla/dotenv
require('dotenv').config();

// secret auth values
const trelloKey = process.env.TRELLO_API_KEY;
const trelloToken = process.env.TRELLO_API_TOKEN;
const connectWiseApiKey = process.env.CW_API_KEY;

// http client
const axios = require('axios');

// trello info 
const inProgressTrelloListId = '5af5c45c81c07bd0e39b2ad4';
const openTrelloListId = '5af5b98846ccb9a5c0cfd3ba';

// url: https://trello.com/b/l8Qe2St0/cwello-test
const trelloServiceBoard = '5af5a9c2c93fd3f22b4c71fe';

// cw info 
// longer time frame filter
// const cwServiceBoard = 'https://realnets+' + connectWiseApiKey = '@api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets?conditions=board/name="Dev Tickets" AND lastUpdated > [2018-04-20T00:00:00Z]';
const cwServiceBoard = 'https://realnets+' + connectWiseApiKey + '@api-na.myconnectwise.net/v4_6_release/apis/3.0/service/tickets?conditions=board/name="Dev Tickets" AND lastUpdated > [2018-05-10T00:00:00Z]';

// mongo db stuff 
const mongoose = require('mongoose');
let Schema = mongoose.Schema;

// define properties casted to SchemaTypes
// may want to use ObjectId instead 
let cardSchema = new Schema({
	trelloCardId: String,
	cwCardId: String,
	status: String 
});

// // convert schema definition into a Model that's accessible 
let Card = mongoose.model('CardList', cardSchema);

// this is basically the runner thus far
parseCWBoard();

// axios is nice because it returns json just as you'd expect 
function parseCWBoard() {
	axios.get(cwServiceBoard).then(results => {
		// look in return value of data 
		let tickets = results.data;

		// suppose I could map this with only values I need
		// last value wasn't reading huh with <=
		for (let i = 0; i < tickets.length; i++) {
			// need to check that an id for cw and trello doesn't exist already 
			// if it does exist already, should I update it if the status has changed? 

			createTrelloCard(tickets[i].id, tickets[i].status.name, tickets[i].summary);
		}
	}).catch(error => console.log(error));
}

function createTrelloCard(cwCardId, status, summary) {
	// needs to go in to axios as a string not Number 
	let stringCardId = cwCardId.toString();

	// determine which list the card will go in 
	let boardId = status === 'Triage' ? openTrelloListId : inProgressTrelloListId;

	axios.post('https://api.trello.com/1/cards', {
		name: summary,
		idList: boardId,
		keepFromSource: 'all',
		key: trelloKey,
		token: trelloToken
	  })
	  .then(response => {
		// this is the corresponding trello id card
		// will need to update the db entry based on this new field 
		createCard(response.data.id, cwCardId, status);
	  })
	  .catch(error => {
		console.log(error);
	  });
}

// make the instance for mongo db based on the model
function createCard(trelloCardId, cwCardId, status) {
	let card = new Card({
		cwCardId: cwCardId,
		trelloCardId: trelloCardId,
		status: status
	});
	console.log(card);
}


// will need to utilize express later for listening for web hooks or starting
// const express = require('express');
// const app = express();

// express ability to listen for webhook changes stub
// // hello world 
// app.get('/', (req, res) => res.send('Hello World!'));

// // listening on port 3000 
// app.listen(3000, () => console.log('Example app listening on port 3000!'));