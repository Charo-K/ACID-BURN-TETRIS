const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 9877;
const root = __dirname;
const mime = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'
};
http.createServer((req,res)=>{
  let u = req.url.split('?')[0];
  if(u==='/') u='/index.html';
  const fp = path.join(root, u);
  fs.readFile(fp,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'});
    res.end(data);
  });
}).listen(port, ()=>console.log('Serving on '+port));
