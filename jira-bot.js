'use strict';
const request = require('request');
//const async = require('async');

module.exports = {
  lookupTicket: (req, res, next) => {
    let smdRegex = /(SMD|DES)-[0-9]*/ig;
    let baseUrl = 'https://monimus.atlassian.net';
    let match, matches = [];
    let loginData = `${process.env.JIRA_USERNAME}:${process.env.JIRA_PASSWORD}`;
    var encodedLogin = new Buffer(loginData).toString('base64');

    while (match = smdRegex.exec(req.body.text)) {
      matches.push(match[0]);
    }

    if (!matches.length) {
      return res.json({text: 'Must include the ticket name.'});
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
        title: `${result.key}: ${result.fields.summary}`,
        title_link: `${process.env.JIRA_URL}/${result.key}`,
        attachments: {
          text: result.fields.description,
          fields: [
            {
              title: 'Assigned To',
              value: result.fields.assignee.displayName,
              short: true
            },
            {
              title: 'Status',
              value: result.fields.status.name,
              short: true
            }
          ]
        }
      };
      return res.json(response);
    });
  }
};
