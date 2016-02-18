'use strict';
const request = require('request');
const async = require('async');

module.exports = {
  lookupTicket: (req, res, next) => {
    let smdRegex = /SMD-[0-9]*/ig;
    let baseUrl = 'https://monimus.atlassian.net';
    let match, matches = [], results = [];
    let loginData = `${process.env.JIRA_USERNAME}:${process.env.JIRA_PASSWORD}`;
    var encodedLogin = new Buffer(loginData).toString('base64');
    //'https://monimus.atlassian.net/rest/api/2/issue';

    while (match = smdRegex.exec(req.body.text)) {
      matches.push(match[0]);
    }

    let params = {
      method: 'GET',
      headers: {
        Authorization: `Basic ${encodedLogin}`,
        'Content-Type': 'application/json'
      }
    };

    return async.each(matches, function(match, cb) {
      params.uri = `${baseUrl}/rest/api/2/issue/${match}`;
      request.get(params, (err, data, response) => {
        if (err) return cb(err);
        if (data.statusCode === 200) {
          let body = JSON.parse(response);
          let fields = body.fields;
          results.push({key: body.key.slice(4), summary: fields.summary});
          cb();
        }
      });
    }, (err) => {
      if (err) return next(err);
      let text;
      text = results.map((obj => `${obj.key}: ${obj.summary}`)).join('\n');
      console.log(text);
      return res.json({text: text});
    });
  }
};
