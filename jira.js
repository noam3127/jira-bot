'use strict';
let request = require('request');

module.exports = {
  findTicketMatches: (req, res, next) => {
    let ticketRegex = /(SMD|DES|SRF)-[0-9]+/ig;
    let match, matches = [];

    while (match = ticketRegex.exec(req.body.text)) {
      matches.push(match[0]);
    }

    if (!matches.length) {
      return res.json({text: 'Missing the ticket name!'});
    }
    req.matches = matches;
    next();
  },

  fetchTicket: (req, res, next) => {
    let match = req.matches[0];
    var encodedLogin = new Buffer(req.app.settings.loginCredentials).toString('base64');
    let params = {
      method: 'GET',
      uri: `${process.env.JIRA_API_URL}/${match}`,
      headers: {
        Authorization: `Basic ${encodedLogin}`,
        'Content-Type': 'application/json'
      }
    };

    request.get(params, (err, data, body) => {
      if (err) return next(err);
      if (data.statusCode === 404) {
        return res.json({text: 'Issue does not exist'});
      }
      if (data.statusCode !== 200) {
        return res.status(data.statusCode);
      }

      req.ticket = JSON.parse(body);
      next();
    });
  }

};