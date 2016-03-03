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
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    var responses = [];
    var envs = ['showdmestag', 'showdmedev', 'showdmetest', 'showdmeqa'];
    var urls = envs.map(env => `https://demo.${env}.net/buildInfo.html`);
    async.forEachOf(urls, function(url, index, cb) {
      request(url, (err, data, body) => {
        if (err) return console.log(err); // don't call callback, just ignore
        if (!body) return;
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
      var attachments = [{
        pretext: `${req.body.user_name} posted:`,
        text: text
      }];

      var body = { attachments: attachments };

      if (req.body.text && /show/.test(req.body.text)) {
        body.response_type = 'in_channel';
      }

      respond(req, res, body);
    });
  }
};
