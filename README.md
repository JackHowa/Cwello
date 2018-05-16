# Cwello -- A Trello And ConnectWise Integration 

The goal of this project is to make a command line tool that syncs between Trello and Connectwise. There will be a database with the Trello card id, ConnectWise (CW) ticket id, and the last known status. The last known status will be compared against the two places -- CW and Trello -- to check whether there's been a change. 

## Motivation 

ConnectWise is a time-logging and invoicing system that has a ton of features. So much so, that it's sometimes cumbersome to use. Trello, on the other hand, is minimal and liked by some devs. We wanted to make a Trello board that populates its status list (e.g., "in progress") with tickets of that status. The goal is to use ConnectWise for what it's good at -- taking in tickets and invoicing. And Trello, for working.

## Build Status 

![Heroku](http://heroku-badge.herokuapp.com/?app=lit-escarpment-80672&style=flat&svg=1)

## Code Style 

Following AirBnb styleguide, using ESLint.

## Getting Started 

This is an Express app, a web framework for Node.js, that uses MongoDB as a database. Mongoose is used to handle the data. It's a MongoDB object modeling tool.

### Setup

Therefore, you need to install [Node](https://nodejs.org/en/download/). In order to install dependencies, run `npm install`. 

Next, MongoDB needs to be setup. It can be downloaded via Homebrew: `brew update && brew install mongodb`. If you don't have Homebrew, it can be installed on a Mac via: 

`/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`

To start up MongoDB via Homebrew: `mongod --dbpath /usr/local/var/mongodb`. 

The app can then be ran via `npm start` on a different terminal window.

Please look at code snippets and progress on -- meta alert -- Trello: [Trello join page](https://trello.com/invite/b/S4Vj9EhG/be3f9aea6c3ce25b1255117d375d8b5c/cwello).

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