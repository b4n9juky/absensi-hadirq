const https = require('https');
const data = JSON.stringify({email:"admin@school.com", password:"adminPassword123"});
const opts = {
  hostname: "berkahutama.web.id",
  port: 443,
  path: "/api/auth/sign-in/email",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
    "Origin": "https://berkahutama.web.id",
    "Referer": "https://berkahutama.web.id/login"
  }
};
const req = https.request(opts, res => {
  let body = "";
  res.on("data", c => body += c);
  res.on("end", () => console.log(res.statusCode, body.slice(0,300)));
});
req.write(data);
req.end();
