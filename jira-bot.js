'use strict';
const request = require('request');
const _ = require('lodash');
//const async = require('async');

module.exports = {
  lookupTicket: (req, res, next) => {
    let match = req.matches[0];
    console.log(req.app.loginCredentials);
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

      let responseParams = {
        uri: req.body.response_url,
        'Content-type': 'application/json',
        body: JSON.stringify(response)
      };
      request.post(responseParams, (err, data, body) => {
        console.log(err, body);
      });
    });
  },

  getCommitsForTicket: (req, res, next) => {

  }
};
