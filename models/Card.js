const mongoose = require('mongoose');

const mongoDB = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0-8kzdx.mongodb.net/test?retryWrites=false`;
// Set up default mongoose connection
// const mongoDB = "mongodb://localhost/my_database";

mongoose.connect(mongoDB);

// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;

// Get the default connection
let db = mongoose.connection;

// Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

let Schema = mongoose.Schema;

// define properties casted to SchemaTypes
// may want to use ObjectId instead
// this is the model schema
let cardSchema = new Schema({
    trelloCardId: String,
    cwCardId: String,
    status: String,
  });

// convert schema definition into a Model that"s accessible
let Card = mongoose.model('Card', cardSchema);

// mongoose.set("debug", true);

module.exports = Card;
