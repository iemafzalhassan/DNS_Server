const server = require('./server');

const server = new server();

module.exports = (req, res) => {
  if (req.method === 'POST') {
    try {
      const dnsQuery = Buffer.from(req.body, 'base64');
      const response = server.handleQuery(dnsQuery);
      res.status(200).send(Buffer.from(response).toString('base64'));
    } catch (error) {
      console.error('Error processing DNS query:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
};