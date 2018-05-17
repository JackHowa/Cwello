// key values hidden using .env file -- do not commit
// via https://github.com/motdotla/dotenv
require('dotenv').config();

const axios = require('axios');
const ConnectWise = require('connectwise-rest');

let companyName = 'realnets';

let cw = new ConnectWise({
  companyId: companyName,
  companyUrl: 'na.myconnectwise.net',
  publicKey: process.env.CW_PUBLIC_KEY,
  privateKey: process.env.CW_PRIVATE_KEY,
  entryPoint: 'v4_6_release',
  debug: true,
});

// getBoards();

// output:
//   [ [ 'name: Digital Marketing Projects', 'id: 348' ],
//   [ 'name: IT Reoccurring ', 'id: 349' ],
//    [ 'name: Dev Tickets', 'id: 25' ] ]

async function getBoards() {
  let boardsPromise = cw.ServiceDeskAPI.Boards.getBoards();
  const [boards] = await Promise.all([boardsPromise]);
  console.log(Object.keys(boards).map(key => {
    return [`name: ${boards[key].name}`, `id: ${boards[key].id}`];
  }));
}

// to ensure unhandled promises return informative errors
process.on('unhandledRejection', error => {
  console.log('unhandledRejection', error);
});


// [ [ 'name: Triage', 'id: 519' ],
//   [ 'name: In Progress', 'id: 520' ] ]

// findBoard('25');

async function findBoard(boardId) {
  let boardPromise = cw.ServiceDeskAPI.Statuses.getStatusesByBoardId(boardId);
  const [boardStatuses] = await Promise.all([boardPromise]);
  console.log(boardStatuses.map(boardStatus => [`name: ${boardStatus.name}`, `id: ${boardStatus.id}`]));
}
