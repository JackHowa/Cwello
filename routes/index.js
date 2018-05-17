const express = require('express');

const app = express();

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

module.exports = app;