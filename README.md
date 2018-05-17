# Cwello -- A Trello And ConnectWise Integration 

The goal of this project is to make a command line tool that syncs between Trello and Connectwise. There will be a database with the Trello card id, ConnectWise (CW) ticket id, and the last known status. The last known status will be compared against the two places -- CW and Trello -- to check whether there's been a change. 

## Motivation 

ConnectWise is a time-logging and invoicing system that has a ton of features. So much so, that it's sometimes cumbersome to use. Trello, on the other hand, is minimal and liked by some devs. We wanted to make a Trello board that populates its status list (e.g., "in progress") with tickets of that status. The goal is to use ConnectWise for what it's good at -- taking in tickets and invoicing. And Trello, for working.

## Build Status 

![Heroku](http://heroku-badge.herokuapp.com/?app=lit-escarpment-80672&style=flat&svg=1)

## Code Style 

Following AirBnb styleguide, [using JSCS](https://www.jetbrains.com/help/phpstorm/jscs.html), on PhpStorm.

## Getting Started 

This is an Express app, a web framework for Node.js, that uses MongoDB as a database. Mongoose is used to handle the data. It's a MongoDB object modeling tool.

### Setup

Therefore, you need to install [Node](https://nodejs.org/en/download/). In order to install dependencies, run `npm install`. 

Next, MongoDB needs to be setup. It can be downloaded via Homebrew: `brew update && brew install mongodb`. If you don't have Homebrew, it can be installed on a Mac via: 

`/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`

To start up MongoDB via Homebrew: `mongod --dbpath /usr/local/var/mongodb`. 

The app can then be ran via `npm start` on a different terminal window.

### API Auth 

Before we start, I utilized a .env file for environment variables. This is not committed. It gets around worrying about accidentally committing a .json file with your keys in it. The module dotenv loads the variable. NOTE: Make sure your code to load these variables `require('dotenv').config();` comes before you try to access one `let trelloKey = process.env.TRELLO_API_KEY`. Here's more of an [explainer](https://medium.com/@thejasonfile/using-dotenv-package-to-create-environment-variables-33da4ac4ea8f).

First, you need to [authenticate](https://trello.readme.io/docs/api-introduction) with Trello. Go through with accepting the permissions on your board. In your .env file, you can set the resulting key and token as such: 

```
# trello account
TRELLO_API_KEY=cjkasd9f8jdsf
TRELLO_API_TOKEN=khaodf8huadsjkhf
```

Next, ConnectWise needs to also be authenticated. This can be done via the interface. Follow this [tutorial](https://support.prontomarketing.com/hc/en-us/articles/207946586-How-to-generate-ConnectWise-API-keys) to go through My Account of the CW board. Follow this [CW guide](https://developer.connectwise.com/Manage/Developer_Guide/Authentication) to make your header. 

```
# cw keys 
CW_PUBLIC_KEY=kadsfksadfj
CW_PRIVATE_KEY=34sdfkkndfk

# if you combine the two with a ':' you can make the total api key
CW_API_KEY=kadsfksadfj:34sdfkkndfk
``` 
### Manual Trello Setup 

One thing that can be improved here is a manual Trello setup based on ConnectWise boards. In the meantime, `cw-info-finder.js` can determine your account's CW boards and their ids. If you input in your .env file CW info, then you can `console.log()` your info after customizing the CW finder file. 

You can name your Trello board whatever you want. It doesn't necessarily have to be the same as its connected CW board. 

So you should be able to find your target board's name. If you're looking for the sales board, that will output an id. Importantly, that id can find available statuses and status ids. Believe it or not, the same status (e.g., "In Progress") will have a different ID on a different board ... within your same account. 

In the `app.js`, there's an array of objects with status name, idList, and statusId information. The status name should correlate with what's in CW. The other ids are labeled in the code. 

In trello, each column is called a "List". So the idList is based on the trello status id. That Trello information can be found after you've created the board and respective status lists. The `trello-info-finder.js` will allow you to input your username in order to `console.log()` the boards your account has access to. If you didn't create the board yourself, you may not have access to it if someone else made it or it's not your Trello team. 

Once you know your Trello board name on the back-end, you can find the trello board's id. That id can then be used in the file to find status's respective list id. That trello list id will go in the statusLists array. 

```
// currently no way of adding to this list programmatically
// name your status based on the target board in connectwise
// to see your available cw boards, configure cw-info-finder.js
// to see those cw boards status id, for cwStatusId
// idList is a trello id that comes from you manually creating the board in trello
// lists should be created based on target names in CW
// trello board information can be gleaned from trello-info-finder
let statusLists = [
    { name: 'Triage', idList: '5afa40c2e53e1adfa38698ed', cwStatusId: '519' },
    { name: 'Queued', idList: '5afa40c52f74e21b2f89353f', cwStatusId: '542' },
    { name: 'In Progress', idList: '5afa40c983304f3465ade176', cwStatusId: '520' },
    { name: 'On Hold', idList: '5afa40cdc8ad4c1755fd5e96', cwStatusId: '584' },
    { name: 'Internal Review', idList: '5afa40d124a895225d845db3', cwStatusId: '585' },
    { name: 'Client Review', idList: '5afa40d5d8f556a7a53d7f21', cwStatusId: '543' },
    { name: 'No Longer Needed', idList: '5afa40d8dc9fb52f4897e852', cwStatusId: '544' },
    { name: 'Resolved', idList: '5afa40da3be986feaace8858', cwStatusId: '521' }];

```

### Cloud Database Setup 

This is optional for deploying. It was super easy to use MongoDB's cloud platform. In the app's current v1 manifestation on Heroku, [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) is utilized for free and without a credit card attached anyway. That can be setup easily once you create the lowest capacity cluster. The cluster has a 'Connect' button that will walk you through making the connection. It's important that you create a user within that cluster. The password you use below will be for that database's user - not your global Mongo username:

```
const mongoose = require('mongoose');

const mongoDB = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0-8kzdx.mongodb.net/test?retryWrites=false`;

mongoose.connect(mongoDB);
``` 

### Webhook Testing Integration With ngrok

In order to test the Trello webhook created locally, ngrok can be used as a tunnel. It creates a public URL every time it's spun up. It can be downloaded for free [here](https://ngrok.com/). You can denote which port it connects to your local environment. Note: The new url you create that's returned in the command should be inserted into the code: 
```
const apiLink = 'https://lit-escarpment-80672.herokuapp.com';

// ... 

async function createWebhook() {
  try {
    const boardWebhook = await axios.post("https://api.trello.com/1/webhooks/", {
      description: 'Listen for board changes',
      callbackURL: `${apiLink}/board-change`,
      idModel: trelloServiceBoard,
      key: trelloKey,
      token: trelloToken,
      active: true
    });
    console.log("Board web hook " + boardWebhook);
  } catch (err) {
    // console.log('Something went wrong when creating webhook');
    console.error(err);
  }
}
```

You need to listen at whatever you decide the express server to listen at. 
```
$ ./ngrok http 3000
```
```
const port = 3000;

app.listen(port, () => console.log(`Example app listening on port ${port}`));
```

The port will soon be set by Heroku rather than manually with ngrok ... 

### Deploy To Heroku

Heroku can be pushed to for easy deployment once its CLI is installed. They have a [nice guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction) for Node.js. You can push to it once your credentials are established. Again, your new link will need to replace the api link variable used for creating the callback url in the webhook listener: 

```
const apiLink = 'https://lit-escarpment-80672.herokuapp.com';
```

Heroku development can also work in [development locally](https://devcenter.heroku.com/articles/getting-started-with-nodejs#run-the-app-locally). This was useful for me when I was transitioning the database from local to the cloud. NOTE: You'd need ngrok here still. 

To turn off: 
```
heroku ps:scale web=0
```
And back on: 
```
heroku ps:scale web=1
```

The number denotes how many dynos your app is running on. Heroku says, "Think of a dyno as a lightweight container that runs the command specified in the Procfile" -- or `npm start`, by default. 

To see heroku logs, `heroku logs --tail`. 

## Results 

* As an employee, I can see the latest ConnectWise tickets sorted by Triage or not
* As an employee, my trello board will reflect CW tickets based on whether they're Triage status or not
* As an admin, I can see in the background if my trello board has changed using a Trello webhook 
* As an admin, I can take in Trello boards, lists, and cards information 
* As an admin, I can take in ConnectWise tickets and its status info for a particular board over a period of time 

## Built With 

* [Axios](https://github.com/axios/axios) - an HTTP Client 
* [Node](https://nodejs.org/en/) - an open-source server environment  
* [Dotenv](https://github.com/motdotla/dotenv) - Module that loads .env files smoothly
* [Express](https://expressjs.com/) - web framework for Node.js
* [MongoDB Atlas](https://www.mongodb.com/) - NoSQL cloud database
* [Mongoose](http://mongoosejs.com/) - MongoDB object modeling for Node.js
* [Ngrok](https://ngrok.com/) - A public url for webhooks in development
* [Body-Parser](https://github.com/expressjs/body-parser) - Node.js body parsing middleware

## Acknowledgments

* Thanks to Jeremy for the idea (and name!) and initial research into APIs
* Thanks to Realnets for giving me the time to work on this project 
* Appreciate Wes Bos's [Async/Await talk](https://www.youtube.com/watch?v=9YkUCxvaLEk) that helped with Axios and event-handling