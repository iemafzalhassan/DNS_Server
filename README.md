# DNS Server

This is a simple DNS server implementation in Node.js.

## Features

- Handles basic DNS queries
- Supports A and AAAA record types
- Customizable DNS records
- HTTP interface for Vercel deployment

## Installation

1. Clone the repository: ``` git clone https://github.com/iemafzalhassan/DNS_Server.git ```

2. Install dependencies: ``` npm install ```

3. Run the server: ``` npm start ```

## Usage

The DNS server will listen on port 3000 by default (or the port specified by the `PORT` environment variable). 

To use this DNS server, you'll need to send POST requests with the DNS query encoded in base64 format in the request body. The server will respond with the DNS response, also encoded in base64.

Example usage with curl: ` curl -X POST -d "$(echo -n 'your_dns_query_here' | base64)" http://localhost:3000 `

Replace 'your_dns_query_here' with the actual DNS query packet.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)