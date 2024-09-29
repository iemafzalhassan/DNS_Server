// Get the form elements
const dnsForm = document.getElementById('dnsForm');
const hostnameInput = document.getElementById('hostname');
const recordTypeSelect = document.getElementById('recordType');
const clearButton = document.getElementById('clearButton');
const loadingDiv = document.getElementById('loading');
const responseDiv = document.getElementById('response');
const historyDiv = document.getElementById('history');

// Add event listener to the form
dnsForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get the hostname and record type
  const hostname = hostnameInput.value;
  const recordType = recordTypeSelect.value;

  // Remove the 'www.' from the hostname if it exists
  const cleanedHostname = hostname.replace(/^www\./, '');

  // Perform the DNS lookup
  try {
    const res = await fetch('/dns-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostname: cleanedHostname, type: recordType })
    });

    const data = await res.json();

    // Handle error responses
    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    // Display the DNS record
    const records = data.records.map(record => `<li>${record.type}: ${record.data}</li>`).join('');
    responseDiv.innerHTML = `<h2>DNS Records:</h2><ul>${records}</ul>`;
    saveQuery(hostname, recordType); // Save to history
  } catch (error) {
    responseDiv.innerHTML = `<p style="color:red;">${error.message}</p>`;
  } finally {
    loadingDiv.style.display = 'none'; // Hide loading indicator
  }
});

// Function to save query to history
function saveQuery(hostname, recordType) {
  const query = `${recordType} record for ${hostname}`;
  const historyItem = document.createElement('div');
  historyItem.innerHTML = `<h3>${query}</h3>`;
  historyDiv.appendChild(historyItem);
}

// Add event listener to the clear button
clearButton.addEventListener('click', () => {
  // Clear the response and history
  responseDiv.innerHTML = '';
  historyDiv.innerHTML = '';
});