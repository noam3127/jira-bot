'use strict';
const request = require('request');
const _ = require('lodash');

function respond(req, res, body) {
  if (req.body.response_url) {
    let options = {
      uri: req.body.response_url,
      'Content-type': 'application/json',
      body: JSON.stringify(body)
    };
    return request.post(options);
  }

  res.set('Content-Type', 'application/json');
  return res.json(body);
}

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

    if (req.body.response_url) {
      res.json({text: `Searching for ${matches[0].toUpperCase()}`});
    }
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
        return respond(req, res, {text: 'Issue does not exist'});
      }
      if (data.statusCode !== 200) {
        return respond(req, res, {text: 'A problem occurred when searching for that ticket.'});
      }
      try {
        req.ticket = JSON.parse(body);
      } catch(e) {
        next(e);
      }
      next();
    });
  },

  sendTicket: (req, res, next) => {
    let ticket = req.ticket;
    let responseBody = {
      attachments: [{
        title: `${ticket.key}: ${ticket.fields.summary}`,
        title_link: `${process.env.JIRA_URL}/browse/${ticket.key}`,
        text: ticket.fields.description,
        fields: [
          {
            title: 'Assigned To',
            value: (ticket.fields.assignee && ticket.fields.assignee.displayName) || 'unassigned',
            short: true
          },
          {
            title: 'Status',
            value: ticket.fields.status.name,
            short: true
          }
        ]
      }]
    };
    if (/show/i.test(req.body.text)) {
      responseBody.response_type = 'in_channel';
      responseBody.attachments[0].pretext = `${req.body.user_name} posted:`
      responseBody.color = '#3aa3e3';
    } else {
      responseBody.response_type = 'ephemeral';
    }

    return respond(req, res, responseBody);
  },

  getCommits: (req, res, next) => {
    let ticket = req.ticket;
    let commitsUrl = `${process.env.JIRA_URL}/rest/dev-status/1.0/issue/detail?issueId=${ticket.id}&applicationType=github&dataType=repository&_=1456273044002`;
    var encodedLogin = new Buffer(req.app.settings.loginCredentials).toString('base64');
    let params = {
      method: 'GET',
      uri: commitsUrl,
      headers: {
        Authorization: `Basic ${encodedLogin}`,
        'Content-Type': 'application/json'
      }
    };

    request(params, (err, data, _body) => {
      try {
        var body = JSON.parse(_body);
      } catch(e){
        return next(e);
      }
      if (!body.detail.length || !body.detail[0].repositories || !body.detail[0].repositories.length) {
        return respond(req, res, {text: `No commits found for ${ticket.key}`})
      }

      let commits = _.flatten(body.detail[0].repositories.map(repo => repo.commits));
      let responseBody = {};
      responseBody.attachments = commits.map(commit => {
        return {
          text: `<${commit.url}|${commit.displayId}> ${commit.message} - ${commit.author.name}`
        };
      });

      responseBody.attachments[0].pretext = `${ticket.key}: ${ticket.fields.summary}`;
      return respond(req, res, responseBody);
    });
  }
};
