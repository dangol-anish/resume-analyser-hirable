const http = require("http");

const server = http.createServer((req, res) => {
  res.statusCode = 300;

  res.setHeader("Content-Type", "text/plain");
  res.end("Hello world");
});

server.listen(5000, () => {
  console.log("Server running");
});
