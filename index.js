require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const req = require('express/lib/request')

// Connect to MongoDB database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.once('open', () => console.log('Connected to MongoDB'));

// Create exercise tracker schema
const exerciseTrackerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    required: true
  },
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  log: [{
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    }
  }]
});

// Define model
const ExerciseTracker = mongoose.model('ExerciseTracker', exerciseTrackerSchema);

// Middleware
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  try {
    let user = await ExerciseTracker.findOne({
      username: username
    });
    if (user) {
      return res.json({
        username: user.username,
        _id: user._id
      });
    }

    user = new ExerciseTracker({
      username: username,
      count: 0,
      _id: new mongoose.Types.ObjectId()
    });

    await user.save();
    
    return res.json({
      username: user.username,
      _id: user._id
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const {description, duration, date} = req.body;
  const userId = req.params._id;
  try{
    let user = await ExerciseTracker.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const newExercise = {
      description: description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    };

    user.log.push(newExercise);
    user.count += 1;

    await user.save();

    return res.json({
      username: user.username,
      description: description,
      duration: parseInt(duration),
      date: date ? (new Date(date)).toDateString() : (new Date()).toDateString(),
      _id: user._id.toHexString()
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await ExerciseTracker.find({}, 'username _id');
    return res.json(users.map(user => ({
        username: user.username,
        _id: user._id
      })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Internal Service Error'
    });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  console.log(req.query);
  const {from, to, limit} = req.query;
  try{
    let user = await ExerciseTracker.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    let log = user.log;

    if (from || to) {
      let fromDate = from ? new Date(from) : new Date(0);
      let toDate = to ? new Date(to) : new Date(0);

      log = log.filter(entry => {
        return entry.date >= fromDate && entry.date <= toDate;
      });
    }

    if (limit) {
      log = log.slice(0, parseInt(limit));
    }

    return res.json({
      username: user.username,
      count: user.count,
      _id: user._id.toHexString(),
      log: log.map(entry => ({
        description: entry.description,
        duration: entry.duration,
        date: entry.date.toDateString()
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Internal Service Error'
    });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
