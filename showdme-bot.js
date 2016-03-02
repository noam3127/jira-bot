'use strict';
const request = require('request');
const _ = require('lodash');
const async = require('async');
const cheerio = require('cheerio');

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
        var $ = cheerio.load(body);
        try {
          var branch = $('br').get(2).next.data;
          branch = branch.replace('Branch:', '').replace(/(?:\n)\s*/g, '');
          responses.push({env: envs[index], branch: branch});
        } catch(e) {
          console.log(e)
        }
        cb();
      });
    }, () => {
      if (!responses.length) {
        return respond(req, res, {text: 'Sorry, there was a problem'});
      }
      var attachments = responses.map(response => {
        return {title: response.env, text: response.branch};
      });
      attachments[0].pretext = `${req.body.user_name} posted:`;
      var body = { attachments: attachments };
      respond(req, res, body);
    });
  }
};
