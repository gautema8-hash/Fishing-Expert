const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml' };
http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = '.' + (urlPath === '/' ? '/index.html' : urlPath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(8080, () => console.log('Server running at http://localhost:8080'));
