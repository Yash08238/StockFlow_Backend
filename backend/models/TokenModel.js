const mongoose = require('mongoose');

// Define the schema for the Token model
const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // TTL index to automatically delete documents after 5 minutes (300 seconds)
  }
});

// Create the Token model
const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
