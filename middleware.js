'use strict';
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
    next();
  },

};