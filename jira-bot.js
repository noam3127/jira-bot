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
    let commitsUrl = 'https://monimus.atlassian.net/rest/dev-status/1.0/issue/summary?issueId=20802&_=1456263267288';
    request(commitsUrl, (err, data, body) => {
      console.log(data, body);
      return res.json({data: body});
    });
  }
};
