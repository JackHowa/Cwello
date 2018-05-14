# Cwello -- A Trello And ConnectWise Integration 

The goal of this project is to make a command line tool that syncs between Trello and Connectwise. There will be a database with the Trello card id, ConnectWise (CW) ticket id, and the last known status. The last known status will be compared against the two places -- CW and Trello -- to check whether there's been a change. 

## Getting Started 

This is an Express app, a web framework for Node.js, that uses MongoDB as a database. Mongoose is used to handle the data. It's a MongoDB object modeling tool.

### Setup

Therefore, you need to install [Node](https://nodejs.org/en/download/). In order to install dependencies, run `npm install`. 

Next, MongoDB needs to be setup. It can be downloaded via Homebrew: `brew update && brew install mongodb`. If you don't have Homebrew, it can be installed on a Mac via: `/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`. 

To start up MongoDB via Homebrew: `mongod --dbpath /usr/local/var/mongodb`. 

The app can then be ran via `npm start` on a different terminal window.

Please look at code snippets and progress on -- meta alert -- Trello: [Trello join page](https://trello.com/invite/b/S4Vj9EhG/be3f9aea6c3ce25b1255117d375d8b5c/cwello).

### Todo 
* auth with trello 
* dotenv explainer 
* ngrok explainer

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
* [MongoDB](https://www.mongodb.com/) - NoSQL database
* [Mongoose](http://mongoosejs.com/) - MongoDB object modeling for Node.js
* [Ngrok](https://ngrok.com/) - A public url for webhooks 
* [Body-Parser](https://github.com/expressjs/body-parser) - Node.js body parsing middleware
