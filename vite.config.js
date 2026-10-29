import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyfqkS8hRiRPEv1IfvngVyS92uo2FhDlnBGFmyAHTgTNUuTpefMk9pct03D6O9aAypN7A/exec';

function sheetsProxyPlugin() {
  return {
    name: 'sheets-proxy',
    configureServer(server) {
      server.middlewares.use('/api/sheets', async (req, res, next) => {
        try {
          const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
          const targetUrl = `${GAS_URL}?${queryString}`;
          
          let response;
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            await new Promise(r => req.on('end', r));
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
          
          const text = await response.text();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(text);
        } catch (err) {
          console.error('[Sheets Proxy Error]:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), sheetsProxyPlugin()],
  server: {
    port: 5174,
    host: true,
    allowedHosts: true
  },
  preview: {
    port: 5174,
    host: true,
    allowedHosts: true
  }
});
