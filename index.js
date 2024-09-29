const http = require('http');
const server = require('./server');

const server = new server();
const port = process.env.PORT || 3000;

const httpServer = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const dnsQuery = Buffer.from(body, 'base64');
      const response = server.handleQuery(dnsQuery);
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(Buffer.from(response).toString('base64'));
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

httpServer.listen(port, () => {
  console.log(`DNS server (HTTP) listening on port ${port}`);
});
