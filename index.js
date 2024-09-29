const express = require('express');
const dns = require('dns');
const app = express();
const port = 3000;

// Middleware to parse JSON data from POST requests
app.use(express.json());
app.use(express.static('public')); // Serve static HTML files

// Supported DNS record types
const supportedTypes = ['A', 'AAAA', 'CNAME', 'MX', 'PTR'];

// Custom DNS Resolver pointing to local DNS server
const resolver = new dns.Resolver({
  resolvers: ['127.0.0.1'] // Use your local DNS server
});

// API endpoint to handle DNS queries
app.post('/dns-lookup', (req, res) => {
  const { hostname, type } = req.body;

  // Check if hostname and type are provided
  if (!hostname || !type) {
    return res.status(400).json({ error: 'Hostname and record type are required' });
  }

  // Check if the provided record type is supported
  if (!supportedTypes.includes(type.toUpperCase())) {
    return res.status(400).json({ error: `Record type must be one of: ${supportedTypes.join(', ')}` });
  }

  // Perform DNS lookup using the custom resolver
  resolver.resolve(hostname, type.toUpperCase(), (err, records) => {
    if (err) {
      // Handle specific error cases
      if (err.code === 'ENODATA') {
        return res.status(404).json({ error: `No ${type} records found for ${hostname}.` });
      }
      if (err.code === 'ENOTFOUND') {
        return res.status(404).json({ error: `Hostname ${hostname} not found.` });
      }
      return res.status(500).json({ error: `DNS lookup failed: ${err.message}` });
    }
    
    // Return records if found
    res.json({ records });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`DNS server running at http://localhost:${port}`);
});
