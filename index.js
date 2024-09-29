const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the 'Public' directory
app.use(express.static(path.join(__dirname, 'Public')));

// Handle API routes (if any)
app.post('/dns-lookup', (req, res) => {
  // Your DNS lookup logic here
});

// For any other routes, serve the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});