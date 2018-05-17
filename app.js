'use strict';

// key values hidden using .env file -- do not commit
// via https://github.com/motdotla/dotenv
require('dotenv').config();

const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const trelloKey = process.env.TRELLO_API_KEY;
const trelloToken = process.env.TRELLO_API_TOKEN;
const connectWiseApiKey = process.env.CW_API_KEY;
const axios = require('axios');
const Card = require('./models/Card');
const ConnectWiseRise = require('connectwise-rest');

let cw = new ConnectWiseRise({
    companyId: 'realnets',
    companyUrl: 'na.myconnectwise.net',
    publicKey: process.env.CW_PUBLIC_KEY,
    privateKey: process.env.CW_PRIVATE_KEY,
    entryPoint: 'v4_6_release',
    debug: true,
  });

// currently no way of adding to this list programmatically
// hardcoded
let statusLists = [
    { name: 'Triage', idList: '5afa40c2e53e1adfa38698ed', cwStatusId: '519' },
    { name: 'Queued', idList: '5afa40c52f74e21b2f89353f', cwStatusId: '542' },
    { name: 'In Progress', idList: '5afa40c983304f3465ade176', cwStatusId: '520' },
    { name: 'On Hold', idList: '5afa40cdc8ad4c1755fd5e96', cwStatusId: '584' },
    { name: 'Internal Review', idList: '5afa40d124a895225d845db3', cwStatusId: '585' },
    { name: 'Client Review', idList: '5afa40d5d8f556a7a53d7f21', cwStatusId: '543' },
    { name: 'No Longer Needed', idList: '5afa40d8dc9fb52f4897e852', cwStatusId: '544' },
    { name: 'Resolved', idList: '5afa40da3be986feaace8858', cwStatusId: '521' }];

let companyName = 'realnets';

// url: https://trello.com/b/l8Qe2St0/cwello-10
const trelloServiceBoard = '5af5a9c2c93fd3f22b4c71fe';

const apiLink = 'https://lit-escarpment-80672.herokuapp.com';

// findCWStatuses();
// function findCWStatuses() {
// 	// get boards
// 	// via https://github.com/covenanttechnologysolutions/connectwise-rest
// 	cw.ServiceDeskAPI.Boards.getBoards().then(res => console.log(res));
// 	// cw.ServiceDeskAPI.Boards.getStatuses([

// 	// ]).then(res => console.log(res));
// }

// maybe this move is being double called,
// once for the forced move, once when it realized it was moved
function matchIdStatusithIdList(status) {
  let targetListObject = statusLists.find(listObject => listObject.name === status);
  return targetListObject.cwStatusId;
}

// don't think this needs to be async but not sure
function updateSampleTicket(cwTicketId, statusId) {
  // don't think this update is working
  // id of the status to change to, find with boards.getBoards and status.getStatuses

  cw.ServiceDeskAPI.Tickets.updateTicket(cwTicketId, [{
    op: 'replace',
    path: 'status',
    value: { id: statusId },
  }]).then(res => console.log(res)) /* this success is running */
    .catch(err => console.log(err));
}

function matchListNameithIdList(status) {
  let targetListObject = statusLists.find(listObject => listObject.name === status);
  return targetListObject.idList;
}

// read the payload from the webhook
app.use(bodyParser.json());

// cw info
let cwTicketRange = 'lastUpdated > [2018-05-10T00:00:00Z]';
let cwBoard = 'board/name="Dev Tickets"';
let cwInfo = 'api-na.myconnectwise.net/v4_6_release/apis/3.0';
let cwQuery = `service/tickets?conditions=${cwBoard} AND ${cwTicketRange}`;

const cwServiceBoard = `https://${companyName}+${connectWiseApiKey}@${cwInfo}/${cwQuery}`;

async function runner() {
  // cosmetic change on the front-end of clearing the board
  await archiveListsTickets(statusLists);
  await clearDb();
  await run();
  await createWebhook();

  while (true) {
    await sleep(5000);
    await run();
  }
}

// this doesn't have to be async
// it's just a cosmetic change to go along with the db change
function archiveListsTickets(statusLists) {
  for (let statusList of statusLists) {
    axios.post(`https://api.trello.com/1/lists/${statusList.idList}/archiveAllCards`, {
        key: trelloKey,
        token: trelloToken,
      });
  }
}

// sleep time expects milliseconds
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// ****run the runner here****
runner();

async function createWebhook() {
  try {
    await axios.post('https://api.trello.com/1/webhooks/', {
        description: 'Listen for board changes',
        callbackURL: `${apiLink}/board-change`,
        idModel: trelloServiceBoard,
        key: trelloKey,
        token: trelloToken,
        active: true,
      });

    // console.log("Board web hook " + boardWebhook);
  } catch (err) {
    // console.log('Something went wrong when creating webhook');
    // console.error(err);
  }
}

// if cw id does not exist in the db
//    if the status for that cw id has changed
//       then move the card in trello and update status in the db
//    else
//       then don't do anything
// else
//    then create that new trello card from cw
async function run() {
  const tickets = await parseCWBoard();

  for (let i = 0; i < tickets.length; i++) {
    const [ticketExists] = await Promise.all([cwTicketAlreadyExists(tickets[i].id)]);

    // this ticket is coming from connectwise
    // changedTicked below is from the db
    const ticket = tickets[i];

    // example: "in progress"
    const newTicketStatus = ticket.status.name;

    // if cw id does exist in the db
    if (ticketExists === true) {
      // don't make a new ticket
      console.log('ticket already exists');

      // will be renaming these params on the other side to directly match in db
      // ticket.id is the cw ticket id
      const statusChangePromise = cwTicketStatusChanged(ticket.id, newTicketStatus);

      const [statusChanged] = await Promise.all([statusChangePromise]);

      // if the status for that cw id has changed
      if (statusChanged === true) {
        // need to find the db for matching trello id and db's status
        // update status in the db

        const [changedTicket] = await Promise.all([updateCardInDb(ticket.id, newTicketStatus)]);

        // console.log(changedTicket.trelloCardId);
        console.log('status change');

        // then move the card in trello
        // hardcoding moving the change back to open
        await moveTrelloCard(changedTicket.trelloCardId, newTicketStatus);
      }
    } else {

      console.log(ticket.company);
      console.log(ticket);

      // then create that new trello card from cw
      // make the raw information needed for a new trello card
      const trelloCardRawInfo = [ticket.id, newTicketStatus, ticket.summary, ticket.company.name];

      // ... will spread the array to pass in the info flat
      const newTrelloCard = await createNewTrelloCard(...trelloCardRawInfo);

      // save to db
      createCard(newTrelloCard.id, ticket.id, newTicketStatus);

      // console.log("done making one card");
    }
  }

  // console.log("done making tickets");
}

// to see all the tickets
// parseCWBoard();

// take in the range of the cw board
// need to create the auth token for this to work in the cw board url
async function parseCWBoard() {
  const cwPromise = axios.get(cwServiceBoard);
  const [cwBoard] = await Promise.all([cwPromise]);
  console.log(cwBoard.data);
  return cwBoard.data;
}

// check for whether cw card exists already
// will return a true/false for a count
async function cwTicketAlreadyExists(cwCardId) {
  try {
    // need to find if there's more than 1 match
    // if there's more than one match that's a problem in the future
    const cardMatchCount = await Card.count({
        cwCardId,
      }).exec();

    // console.log("amount of matches found: " + cardMatchCount);
    return cardMatchCount > 0;
  } catch (err) {
    // console.log('Something went wrong when trying to find the matching cw card id')
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
        status,
      }).exec();

    // console.log("amount of matches found: " + cardMatchCount);

    // we can safely assume that cwCardId is a match already
    // status has changed
    // so if status has changed
    // it will be no match zero
    return cardMatchCount === 0;
  } catch (err) {
    console.log('Something went wrong when trying to find the matching cw card id and its status');
  }
}

// this is if the card in the cw isn't represented in trello yet
async function createNewTrelloCard(cwCardId, status, summary, companyName) {
  // needs to be string for post
  let stringCardId = cwCardId.toString();

  // determine which list the card will go in
  // will need to make a better dictionary key check with matching
  let idList = matchListNameithIdList(status);

  // entrypoints via cw https://developer.connectwise.com/Manage/Hosted_APIs/URL_Entry_Points
  // this is where we get the service ticket url entry
  // sorry cw has some gross urls
  const connectWiseURL = 'na.myconnectwise.net';
  const cwOptionsEntryOptions = 'v4_6_release/services/system_io/router/openrecord.rails';
  const urlEntryServiceConfigs = `locale=en_US&recordType=ServiceFv&recid=${cwCardId}&companyName=${companyName}`;

  let cwEntryPoint = `https://${connectWiseURL}/${cwOptionsEntryOptions}?${urlEntryServiceConfigs}`;

  let trelloCardPromise = axios.post('https://api.trello.com/1/cards', {
      name: `${stringCardId}: ${summary} (${companyName})`,
      desc: `Access Ticket: ${cwEntryPoint}`,
      idList: idList,
      keepFromSource: 'all',
      key: trelloKey,
      token: trelloToken,
    });

  const [trelloCard] = await Promise.all([trelloCardPromise]);
  return trelloCard.data;
}

// make the instance for mongo db based on the model
function createCard(trelloCardId, cwCardId, status) {
  let stringTrelloCardId = trelloCardId.toString();
  let stringCwCardId = cwCardId.toString();

  let card = new Card({
      cwCardId: stringCwCardId,
      trelloCardId: stringTrelloCardId,
      status: status,
    });

  // card can be defined as the second param here
  card.save(function (err) {
      if (err) return console.error(err);

      // console.log(card);
    });
}

// update trello card list based on change
async function moveTrelloCard(trelloCardId, status) {
  let targetList = matchListNameithIdList(status);

  try {
    let trelloCardPromise = axios.put('https://api.trello.com/1/cards/' + trelloCardId, {
        idList: targetList,
        key: trelloKey,
        token: trelloToken,
      });
    await Promise.all([trelloCardPromise]);

    // console.log(trelloCard.data);
    console.log('Moved ticket');
  } catch (err) {
    // console.log(err)
  }
}

function updateCardInDb(cwCardId, status) {
  let stringCwCardId = cwCardId.toString();

  let query = { cwCardId: stringCwCardId };
  let update = { status: status };
  return Card.findOneAndUpdate(query, update, updateAndFindCallback);
}

// async function updateCardInDbFromTrello(trelloCardId, status) {
// 	const [changedTicket] = await Promise.all([updateTrelloId(trelloCardId, status)]);

// 	console.log(changedTicket);
// }

// function updateTrelloId(trelloCardId, status) {
// 	let stringTrelloCardId = trelloCardId.toString();

// 	let query = { trelloCardId: stringTrelloCardId };
// 	let update = { status: status };
// 	return Card.findOneAndUpdate(query, update, updateAndFindCallback);
// }

function updateAndFindCallback(err, documents) {
  if (err) {
    console.log('Error: ' + err);
  } else {
    // console.log(documents);
    return documents;
  }
}

// to ensure unhandled promises return informative errors
process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error);
  });

// empty out database in mongo db
async function clearDb() {
  //   console.log("clearing all entries");
  let query = Card.remove({});
  query.exec(); // returns promise
}

// via https://stackoverflow.com/questions/28706180/setting-the-port-for-node-js-server-on-heroku#comment68148657_28707129
// listens on whatever port heroku decides
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Example app listening on port ${port}`));

// web hooks for listening for board change
// this is where ngrok is being forwarded to
app.post('/board-change', async (req, res) => {
    console.log('board change');

    // this is a check for whether the action is update list
    if (typeof (req.body.action.data.listAfter) !== 'undefined') {

      // console.log(req.body.action.data.card.name);
      console.log('**********************update board**********');
      console.log(`data: ${req.body.action.data}`);
      console.log(`list after: ${req.body.action.data.listAfter}`);

      // req.body.action.id => trello id
      // could use the summary lol
      // req.body.action.data.listAfter => status like 'In Progress'
      // need to map

      // updates on cw side
      // which will then coerce the db
      // ******important*****
      // this is a hardcoded value relying on the ticket # starting with `1234: name name`
      let regexp = /^(\d*?):/;

      let cwId = req.body.action.data.card.name.match(regexp);

      // console.log(cwId[1]);

      // console.log(req.body.action.data.listAfter.name);
      let statusId = matchIdStatusithIdList(req.body.action.data.listAfter.name);

      // console.log(statusId);
      await updateSampleTicket(cwId[1], statusId);
      res.status(200).send('board change');
    } else {
      res.status(200).send('board change and not update');
    }
  });

// this is to ensure that the webhook can be created
// trello looks for a good callback url
app.get('/board-change', (req, res) => {
    res.status(200).send('board change');

    // console.log("board get");
  });

// this is to ensure that the webhook can be created
// trello looks for a good callback url
app.get('/', (req, res) => {
    res.status(200).send('hello');
  });
