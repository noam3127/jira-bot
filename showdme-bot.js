'use strict';
const request = require('request');
const _ = require('lodash');
const async = require('async');

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
  getBuildInfo: (req, res, next) => {
    if (req.body.response_url) {
      res.json({text: 'loading...'});
    }
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    var responses = [];
    var envs = ['showdmestag', 'showdmedev', 'showdmetest', 'showdmeqa'];
    var urls = envs.map(env => `https://demo.${env}.net/buildInfo.html`);

    async.forEachOf(urls, (url, index, cb) => {
      request(url, (err, data, body) => {
        if (err || !body || data.statusCode !== 200) return cb(); // don't pass error into callback, just ignore
        var branch = body.split('<br>')[3];
        branch = branch.replace('Branch:', '').replace(/(?:\n)\s*/g, '');
        responses.push({env: envs[index], branch: branch});
        cb();
      });
    }, () => {
      if (!responses.length) {
        return respond(req, res, {text: 'Sorry, there was a problem'});
      }
      var text = responses.reduce((acc, elem) => `${acc}${elem.env}: ${elem.branch}\n`, '');
      var body = {
        attachments: [{ text: text }]
      };

      if (req.body.text && /show/.test(req.body.text)) {
        body.response_type = 'in_channel';
        body.attachments[0].pretext = `${req.body.user_name} posted:`;
      }

      respond(req, res, body);
    });
  }
};
