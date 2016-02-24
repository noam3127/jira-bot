'use strict';
const request = require('request');
const _ = require('lodash');

module.exports = {
  sendTicket: (req, res, next) => {
    let ticket = req.ticket;
    let response = {
      attachments: [{
        title: `${ticket.key}: ${ticket.fields.summary}`,
        title_link: `${process.env.JIRA_URL}/${ticket.key}`,
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
  },

  getCommits: (req, res, next) => {
    let ticket = req.ticket;
    let commitsUrl = `https://monimus.atlassian.net/rest/dev-status/1.0/issue/detail?issueId=${ticket.id}&applicationType=github&dataType=repository&_=1456273044002`;
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
      let body = JSON.parse(_body);
      if (!body.detail.length || !body.detail[0].repositories || !body.detail[0].repositories.length) {
        return res.json({text: `No commits found for ${ticket.key}`});
      }

      let commits = _.flatten(body.detail[0].repositories.map(repo => repo.commits));//.map(repo => repo.commits);
      let response = {};
      response.attachments = commits.map(commit => {
        return {
          text: `<${commit.url}|${commit.displayId}> ${commit.message} - ${commit.author.name}`
        };
      });

      response.attachments[0].pretext = `${ticket.key}: ${ticket.fields.summary}`;

      if (!req.body.response_url) {
        res.set('Content-Type', 'application/json');
        return res.status(200).json(response);
      }

      let responseParams = {
        uri: req.body.response_url,
        'Content-type': 'application/json',
        body: JSON.stringify(response)
      };

      request.post(responseParams);
    });
  }
};
