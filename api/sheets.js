// Vercel Serverless Function to proxy Google Sheets API requests
export default async function handler(req, res) {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxoAGWLdT8BZZ3KWvwOg_-hryxz5Q1r2jdwALYuZUXTmKAjaUtKZkl6nQAaCZFy471L/exec';
  const queryString = req.url && req.url.includes('?') ? req.url.split('?')[1] : '';
  const targetUrl = `${GAS_URL}?${queryString}`;

  try {
    let response;
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });
    } else {
      response = await fetch(targetUrl, {
        method: 'GET'
      });
    }

    const data = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.status(200).send(data);
  } catch (err) {
    console.error('[Vercel Sheets Proxy Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
