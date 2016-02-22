'use strict';
const request = require('request');
const _ = require('lodash');
//const async = require('async');

module.exports = {
  lookupTicket: (req, res, next) => {
    let ticketRegex = /(SMD|DES)-[0-9]*/ig;
    let baseUrl = 'https://monimus.atlassian.net';
    let match, matches = [];
    let loginData = `${process.env.JIRA_USERNAME}:${process.env.JIRA_PASSWORD}`;
    var encodedLogin = new Buffer(loginData).toString('base64');

    while (match = ticketRegex.exec(req.body.text)) {
      matches.push(match[0]);
    }

    if (!matches.length) {
      return res.json({text: 'Missing the ticket name!'});
    }
    match = matches[0];
    let params = {
      method: 'GET',
      uri: `${process.env.JIRA_API_URL}/${match}`,
      headers: {
        Authorization: `Basic ${encodedLogin}`,
        'Content-Type': 'application/json'
      }
    };
    console.log(params);
    request.get(params, (err, data, body) => {
      if (err) return next(err);
      if (data.statusCode === 404) {
        return res.json({text: 'Issue does not exist'});
      }
      if (data.statusCode !== 200) {
        return res.status(data.statusCode);
      }

      let result = JSON.parse(body);
      let response = {
        attachments: [{
          title: `${result.key}: ${result.fields.summary}`,
          title_link: `${process.env.JIRA_URL}/${result.key}`,
          text: result.fields.description,
          fields: [
            {
              title: 'Assigned To',
              value: (result.fields.assignee && result.fields.assignee.displayName) || 'unassigned',
              short: true
            },
            {
              title: 'Status',
              value: result.fields.status.name,
              short: true
            }
          ],
          color: '#3aa3e3'
        }]
      };

      response.response_type = /show/i.test(req.body.text)
        ? 'in_channel'
        : 'ephemeral';

      if (!req.body.response_url) {
        res.set('Content-Type', 'application/json');
        return res.status(200).json(response);
      }

      res.sendStatus(200);

      let responseParams = {
        uri: req.body.response_url,
        'Content-type': 'application/json',
        body: JSON.stringify(response)
      };
      request.post(responseParams, (err, data, body) => {
        console.log(err, body);
      });
    });
  }
};
