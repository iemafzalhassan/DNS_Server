const dgram = require('node:dgram');
const dnspacket = require('dns-packet');
const winston = require('winston');
const express = require('express');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'dns-server.log' })
  ]
});

// Initialize database
const db = {};
initDatabase();

// Function to initialize the database
function initDatabase() {
  db['www.google.com'] = { type: 'A', data: '8.8.8.8' };
  db['www.facebook.com'] = { type: 'CNAME', data: 'hashnode.network' };
  db['example.com'] = { type: 'MX', data: 'mail.example.com' };
  db['ipv6.example.com'] = { type: 'AAAA', data: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' };
  db['8.8.8.8.in-addr.arpa'] = { type: 'PTR', data: 'www.google.com' };
}

// Function to add a record dynamically
function addRecord(name, type, data) {
  if (!isValidRecordType(type)) {
    logger.error(`Invalid record type: ${type}`);
    return;
  }

  if (!isValidRecordData(type, data)) {
    logger.error(`Invalid record data for type ${type}: ${data}`);
    return;
  }

  db[name] = { type, data };
  logger.info(`Record added: ${name} -> ${type}: ${data}`);
}

// Function to validate record type
function isValidRecordType(type) {
  const validTypes = ['A', 'CNAME', 'MX', 'AAAA', 'PTR'];
  return validTypes.includes(type);
}

// Function to validate record data
function isValidRecordData(type, data) {
  switch (type) {
    case 'A':
      return isValidIPv4Address(data);
    case 'CNAME':
      return isValidDomainName(data);
    case 'MX':
      return isValidDomainName(data);
    case 'AAAA':
      return isValidIPv6Address(data);
    case 'PTR':
      return isValidDomainName(data);
    default:
      return false;
  }
}

// Function to validate IPv4 address
function isValidIPv4Address(ip) {
  const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

// Function to validate IPv6 address
function isValidIPv6Address(ip) {
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
}

// Function to validate domain name
function isValidDomainName(domain) {
  const domainRegex = /^[a-zA-Z0-9.-]+$/;
  return domainRegex.test(domain);
}

// Create DNS server (UDP)
const dnsServer = dgram.createSocket('udp4');

// Listening for incoming messages (UDP DNS queries)
dnsServer.on('message', (msg, rinfo) => {
  try {
    handleIncomingMessage(msg, rinfo);
  } catch (error) {
    logger.error('Error handling incoming message:', { error: error.message });
  }
});

// Function to handle incoming DNS messages
function handleIncomingMessage(msg, rinfo) {
  let incomingReq;
  try {
    incomingReq = dnspacket.decode(msg); // Decode the DNS query
  } catch (error) {
    logger.error('Failed to decode DNS packet:', { error: error.message });
    return;
  }

  logger.info('Received DNS request', { questions: incomingReq.questions });

  // Handle multiple questions
  const answers = incomingReq.questions.map(question => {
    const record = db[question.name]; // Look for the record in the db
    if (record) {
      return {
        type: record.type,
        class: 'IN',
        name: question.name,
        data: record.data,
        ttl: 300 // TTL value in seconds
      };
    } else {
      logger.info(`No record found for: ${question.name}`);
      return null;
    }
  }).filter(answer => answer);

  if (answers.length > 0) {
    // Prepare the DNS response packet
    const response = dnspacket.encode({
      type: 'response',
      id: incomingReq.id,
      flags: dnspacket.AUTHORITATIVE_ANSWER,
      questions: incomingReq.questions,
      answers: answers
    });

    // Send the DNS response back to the client
    dnsServer.send(response, rinfo.port, rinfo.address, err => {
      if (err) {
        logger.error('Error sending DNS response:', { error: err.message });
      } else {
        logger.info(`Sent DNS response to ${rinfo.address}:${rinfo.port}`);
      }
    });
  } else {
    // Send NXDOMAIN response if no record found
    const nxdomainResponse = dnspacket.encode({
      type: 'response',
      id: incomingReq.id,
      flags: dnspacket.RECURSION_DESIRED | dnspacket.RECURSION_AVAILABLE | dnspacket.RESPONSE_CODE_NXDOMAIN,
      questions: incomingReq.questions
    });
    dnsServer.send(nxdomainResponse, rinfo.port, rinfo.address, err => {
      if (err) {
        logger.error('Error sending NXDOMAIN response:', { error: err.message });
      } else {
        logger.info(`Sent NXDOMAIN for ${incomingReq.questions.map(q => q.name).join(', ')}`);
      }
    });
  }
}

// Bind the UDP DNS server to port 53
dnsServer.bind(53, () => logger.info('DNS Server is running on port 53 (UDP)'));

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down DNS server...');
  dnsServer.close(() => {
    logger.info('DNS server shut down.');
    process.exit(0);
  });
});

// Example usage of addRecord
addRecord('www.example.com', 'A', '93.184.216.34');

// Setting up HTTP server using Express
const app = express();
app.use(express.json());

// HTTP route to fetch DNS records
app.post('/dns-lookup', (req, res) => {
  const { hostname, type } = req.body;
  const record = db[hostname];

  if (record && record.type === type) {
    res.json({ records: [{ type: record.type, data: record.data }] });
  } else {
    res.status(404).json({ error: 'DNS record not found' });
  }
});

// Start the HTTP server on port 3000
app.listen(3000, () => {
  logger.info('HTTP server is running on port 3000');
});
