const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
let html = fs.readFileSync(path.join(rootDir, 'fullbody_articulation_test.html'), 'utf8');

// Inject window.onerror and fetch logger
html = html.replace('<script>', `<script>
window.onerror = function(msg, url, line, col, err) {
  fetch('/log', { method: 'POST', body: JSON.stringify({ type: 'error', msg, line, col, stack: String(err && err.stack) }) });
};
console.log = function(...args) {
  fetch('/log', { method: 'POST', body: JSON.stringify({ type: 'log', args }) });
};
`);

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (req.url.startsWith('/fullbody-seg/')) {
    const fPath = path.join(rootDir, req.url.slice(1));
    if (fs.existsSync(fPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(fs.readFileSync(fPath));
    } else {
      console.log('404 for:', req.url);
      res.writeHead(404); res.end('not found');
    }
  } else if (req.url === '/log' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      console.log('BROWSER LOG:', body);
      res.writeHead(200); res.end('ok');
    });
  }
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-sandbox', 'http://127.0.0.1:' + port + '/']);
  setTimeout(() => {
    proc.kill();
    server.close();
    process.exit(0);
  }, 4000);
});
