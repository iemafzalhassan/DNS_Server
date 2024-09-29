const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dgram = require('node:dgram');
const dnspacket = require('dns-packet');

// Initialize Express app
const app = express();
const port = 4000; // Use a port like 4000 to avoid conflicts with other servers

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

// DNS UDP Client setup
const client = dgram.createSocket('udp4');

// Route to serve the DNS lookup API
app.post('/dns-lookup', (req, res) => {
  const { hostname, type } = req.body;

  // Validate the record type
  const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'PTR', 'NS', 'TXT', 'SOA'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid DNS record type specified' });
  }

  // Construct DNS query packet
  const queryId = Math.floor(Math.random() * 65535); // Generate a random query ID
  const queryPacket = dnspacket.encode({
    type: 'query',
    id: queryId,
    flags: dnspacket.RECURSION_DESIRED,
    questions: [{
      type: type,
      name: hostname
    }]
  });

  // Send DNS query to the local DNS server (running in server.js)
  client.send(queryPacket, 53, '127.0.0.1', (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to send DNS query' });
    }
  });

  // Handle DNS server response
  const handleResponse = (msg) => {
    const responsePacket = dnspacket.decode(msg);

    if (responsePacket.id !== queryId) {
      // Ignore responses that don't match the current query ID
      return;
    }

    // Remove the listener after handling the response
    client.off('message', handleResponse);

    if (responsePacket.answers.length > 0) {
      // Format response data
      const records = responsePacket.answers.map(answer => ({
        type: answer.type,
        data: answer.data
      }));
      return res.json({ records }); // Send JSON response
    } else {
      return res.status(404).json({ error: 'No DNS records found' }); // Send error response
    }
  };

  // Add the listener for the response
  client.on('message', handleResponse);
});

// Start the Express server
app.listen(port, () => {
  console.log(`Express server running on http://localhost:${port}`);
});
