import net from "node:net";
import { mkdir, writeFile } from "node:fs/promises";

// DEV only: принимает письма в память, никогда не пересылает их и не сохраняет содержимое.
const port = Number(process.env.DEV_SMTP_PORT ?? 2525);
const directory = ".cache/backend-stage12";
await mkdir(directory, { recursive: true });
const stats = { messages: 0, recipients: 0, startedAt: new Date().toISOString() };
const save = () => writeFile(`${directory}/smtp.json`, JSON.stringify(stats, null, 2));
await save();
net.createServer(socket => {
  let buffer = "", data = false, recipients = 0;
  socket.write("220 Figurzilla DEV sink\r\n");
  socket.on("data", chunk => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf("\r\n")) >= 0) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (data) {
        if (line === ".") {
          data = false; stats.messages++; stats.recipients += recipients; recipients = 0;
          void save(); socket.write("250 captured locally\r\n");
        }
      } else if (/^EHLO/i.test(line)) socket.write("250-DEV\r\n250 SIZE 20971520\r\n");
      else if (/^HELO/i.test(line)) socket.write("250 DEV\r\n");
      else if (/^RCPT TO:/i.test(line)) { recipients++; socket.write("250 OK\r\n"); }
      else if (/^DATA$/i.test(line)) { data = true; socket.write("354 end with dot\r\n"); }
      else if (/^QUIT$/i.test(line)) socket.end("221 bye\r\n");
      else { if (/^RSET$/i.test(line)) recipients = 0; socket.write("250 OK\r\n"); }
    }
  });
  socket.on("error", () => {});
}).listen(port, "0.0.0.0", () => console.log(`DEV SMTP sink listening on ${port}; forwarding disabled`));
