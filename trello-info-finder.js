const axios = require('axios');

// key values hidden using .env file -- do not commit
// via https://github.com/motdotla/dotenv
require('dotenv').config();

const trelloKey = process.env.TRELLO_API_KEY;
const trelloToken = process.env.TRELLO_API_TOKEN;
const trelloUsername = process.env.TRELLO_USERNAME;

const baseTrelloURL = 'https://api.trello.com/1/';

// if boards have already been created
// find what boards you have access to
// https://trello.readme.io/v1.0/reference#membersidboards
// findYourBoards(trelloUsername);
async function findBoardIds(trelloUsername) {
  const boardPromise = axios.get(`${baseTrelloURL}/members/${trelloUsername}`, {
    params: {
      key: trelloKey,
      token: trelloToken,
    },
  });

  const [boards] = await Promise.all([boardPromise]);

  // [ '5a09b94e53f3249828d0758e',
  //   '5a01e3140334d870cb45b11a',
  //   '5a4fcff1194d61aa1ab14043' ]
  return boards.data.idBoards;
}

findBoardListIds('5a4fcff1194d61aa1ab14043');

// https://trello.readme.io/v1.0/reference#boardsboardidlists
async function findBoardListIds(boardId) {
  const boardListPromise = axios.get(`${baseTrelloURL}/boards/${boardId}/lists`, {
    params: {
      key: trelloKey,
      token: trelloToken,
    },
  });

  const [boardLists] = await Promise.all([boardListPromise]);

  // [ [ 'id: 5a4fcff1194d61aa1ab14044, name: To Do' ],
  //   [ 'id: 5a4fcff1194d61aa1ab14045, name: Doing' ],
  //   [ 'id: 5a4fcff1194d61aa1ab14046, name: Done' ] ]
  console.log(boardLists.data.map(boardList => [`id: ${boardList.id}, name: ${boardList.name}`]));
}
