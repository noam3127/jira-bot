'use strict';
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var jira = require('./jira-bot');
var showdme = require('./showdme-bot');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('loginCredentials', `${process.env.JIRA_USERNAME}:${process.env.JIRA_PASSWORD}`);

app.use('/', (req, res, next) => {
  // if (process.env.SLACK_TOKEN !== req.body.token) {
  //   return res.status(403).json({text: 'Invalid token'});
  // }
  next();
});

app.post('/jira',
  jira.findTicketMatches,
  jira.fetchTicket,
  jira.sendTicket
);

app.post('/commits',
  jira.findTicketMatches,
  jira.fetchTicket,
  jira.getCommits
);

app.post('/envs', showdme.getBuildInfo);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


//if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
//}

// production error handler
// no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//   res.status(err.status || 500);
//   res.render('error', {
//     message: err.message,
//     error: {}
//   });
// });

app.listen(process.env.PORT || 5000);
module.exports = app;
