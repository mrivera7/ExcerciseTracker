const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const autoIncrement = require('mongoose-auto-increment');

const cors = require('cors')

const mongoose = require('mongoose')
const connection = mongoose.createConnection(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' );

autoIncrement.initialize(connection);

const Schema = mongoose.Schema;

const ExerciseLogSchema = new Schema({
  userId: {
    type: Number,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  log: [{
    date: Date,
    description: String,
    duration: Number,
  }],
});

ExerciseLogSchema.plugin(autoIncrement.plugin, {
  model:'ExerciseLog',
  field: 'userId',
});
var ExerciseLog = connection.model('ExerciseLog', ExerciseLogSchema);

function done (error, data) {
  if (error) { 
    console.log(error); 
  } else { 
    console.log(data); 
  }
}

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
  // console.log(req.body.username);
  let newUser = new ExerciseLog({username: req.body.username});
  newUser.save((err, data) => {
    if (err.code === 11000) {
      res.send('username already taken');
    } else if (err.code !== 11000) {
      res.send('An unknown error has occured. Please refresh and try again.');
    } else {
      res.json({userId: data.userId, username: data.username});
    }
  });
});

app.post('/api/exercise/add', (req, res) => {
  let newLog = ExerciseLog.findOneAndUpdate({ userId: req.body.userId }, 
                                            { log: [{ date: req.body.date,  
                                                      description: req.body.description,
                                                      duration: req.body.duration}] },
                                            { new: true }, (err, data) => {
    if (err) {
      res.send(err.reason.reason.message);
    } else {
      res.json(data);
    }
  });
});

app.get('/api/exercise/log?', (req, res) => {
  let { userId, from, to, limit } = req.query;
  let log = ExerciseLog.find({ userId: userId });
      
  if (from && to) log = log.where('log.date').gte(new Date(from)).lte(new Date(to));
  else if (from) log = log.where('log.date').gte(new Date(from));
  else if (to) log = log.where('log.date').lte(new Date(to));
  
  if (limit) log = log.limit(Number(limit));
  
      log = log.exec((err, data) => {
    if(err) {
      res.send('Unexpected error. Please refresh and try again.');
    } else {
      res.json(data);
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
