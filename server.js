class server {
  constructor() {
    this.records = {
      'example.com': {
        A: '93.184.216.34',
        AAAA: '2606:2800:220:1:248:1893:25c8:1946'
      }
    };
  }

  handleQuery(query) {
    const domain = this.extractDomain(query);
    const type = this.extractQueryType(query);
    
    if (this.records[domain] && this.records[domain][type]) {
      return this.createResponse(query, this.records[domain][type], type);
    } else {
      return this.createErrorResponse(query);
    }
  }

  extractDomain(query) {
    // Simple domain extraction logic (this should be more robust in a real implementation)
    const domainPart = query.slice(12);
    let domain = '';
    let length = domainPart[0];
    let offset = 1;
    while (length !== 0) {
      domain += domainPart.slice(offset, offset + length).toString() + '.';
      offset += length;
      length = domainPart[offset];
      offset += 1;
    }
    return domain.slice(0, -1);
  }

  extractQueryType(query) {
    // Simple query type extraction (assuming the type is always at a fixed position)
    const typeCode = query.readUInt16BE(query.length - 4);
    return typeCode === 1 ? 'A' : typeCode === 28 ? 'AAAA' : 'UNKNOWN';
  }

  createResponse(query, ip, type) {
    // This is a simplified response creation and should be more robust in a real implementation
    const response = Buffer.from(query);
    response[2] |= 0x80; // Set QR bit to 1 (response)
    response[7] = 0x01; // Set ANCOUNT to 1

    if (type === 'A') {
      const ipParts = ip.split('.').map(part => parseInt(part));
      response.writeUInt16BE(0xc00c, response.length); // Pointer to domain name
      response.writeUInt16BE(0x0001, response.length); // Type A
      response.writeUInt16BE(0x0001, response.length); // Class IN
      response.writeUInt32BE(300, response.length); // TTL (5 minutes)
      response.writeUInt16BE(4, response.length); // RDLENGTH
      response.writeUInt8(ipParts[0], response.length);
      response.writeUInt8(ipParts[1], response.length);
      response.writeUInt8(ipParts[2], response.length);
      response.writeUInt8(ipParts[3], response.length);
    } else if (type === 'AAAA') {
      const ipParts = ip.split(':').map(part => parseInt(part, 16));
      response.writeUInt16BE(0xc00c, response.length); // Pointer to domain name
      response.writeUInt16BE(0x001c, response.length); // Type AAAA
      response.writeUInt16BE(0x0001, response.length); // Class IN
      response.writeUInt32BE(300, response.length); // TTL (5 minutes)
      response.writeUInt16BE(16, response.length); // RDLENGTH
      for (let part of ipParts) {
        response.writeUInt16BE(part, response.length);
      }
    }

    return response;
  }

  createErrorResponse(query) {
    const response = Buffer.from(query);
    response[2] |= 0x80; // Set QR bit to 1 (response)
    response[3] |= 0x03; // Set RCODE to 3 (Name Error)
    return response;
  }
}

module.exports = server;