const http = require('http');
const data = JSON.stringify({email:"guru.fisika@school.com", password:"guruPassword123"});
const req = http.request({
  hostname: "127.0.0.1",
  port: 3006,
  path: "/api/auth/sign-in/email",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
}, res => {
  let body = "";
  res.on("data", c => body += c);
  res.on("end", () => console.log(res.statusCode, body.slice(0,300)));
});
req.write(data);
req.end();
