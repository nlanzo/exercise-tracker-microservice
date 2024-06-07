const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()


mongoose.connect(process.env.MONGO_URI);
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

// Define the schema and create a model for a user
let User = mongoose.model('User', new mongoose.Schema({
  username: String
}));

// Define the schema for an exercise
let exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date
});

// Create a model for an exercise
let Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post('/api/users', async (req, res) => {
  // Create a new user
  const username = req.body.username;
  try {
    const userExistsQuery = await User.findOne({ 'username': username });
    if (userExistsQuery !== null) {
      res.json({ error: 'Username already exists' });
    } else {
      const newUser = new User({ username: username });
      try {
        newUser.save();
        res.json({ username: newUser.username, _id: newUser._id });
      } catch (err) {
        res.json({ error: err });
      }}
  } catch (err) {
  res.json({ error: err });
  }
});


app.get('/api/users', async (req, res) => {
  // Get an array of all users
  const userArray = await User.find().select('username _id');
  res.json(userArray);
  });



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


app.post('/api/users/:_id/exercises', async (req, res) => {
  // Create a new exercise
  const userId = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = req.body.date;
  if (date === '' || date === undefined || date === null || date === 'Invalid Date') {
    date = new Date();
  } else {
    date = new Date(date + 'T00:00:00-06:00');
  }
  const newExercise = new Exercise({
    userId: userId,
    description: description,
    duration: duration,
    date: date
  });
  try {
    newExercise.save();
    const user = await User.findById(userId);
    res.json({
      username: user.username,
      description: description,
      duration: parseInt(duration),
      date: date.toDateString(),
      _id: user._id,
    });
  } catch (err) {
    res.json({ error: err });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  // Get the exercise log of a user
  const userId = req.params._id;
  const user = await User.findById(userId);
  const username = user.username;
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);
  const limit = parseInt(req.query.limit);
  let query = { userId: userId };
  if (from.toString() !== 'Invalid Date') {
    query.date = { $gte: from };
  }
  if (to.toString() !== 'Invalid Date') {
    if (query.date === undefined) {
      query.date = { $lte: to };
    } else {
      query.date.$lte = to;
    }
  }
  let exerciseArray = await Exercise.find(query).limit(limit);
  exerciseArray = exerciseArray.map(exercise => {
    return {
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    };
  });
  res.json({
    _id: userId,
    username: username,
    count: exerciseArray.length,
    log: exerciseArray
  });
});
