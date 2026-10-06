import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { TelemetryPacket, ClientMessage } from "../../shared/types";

const PORT = 8080;
const RECORDINGS_DIR = path.join(__dirname, "..", "recordings");
if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR);

const clients = new Set<WebSocket>();
let recordStream: fs.WriteStream | null = null;

function broadcast(packet: TelemetryPacket) {
  const json = JSON.stringify(packet);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(json);
  }
  if (recordStream) recordStream.write(json + "\n");
}

function startRecording() {
  if (recordStream) return;
  const filename = `session-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
  recordStream = fs.createWriteStream(path.join(RECORDINGS_DIR, filename));
  console.log(`Recording started: ${filename}`);
}

function stopRecording() {
  recordStream?.end();
  recordStream = null;
  console.log("Recording stopped");
}

// --- Serial: Brain connection ---
// TODO: update to the Brain's actual device path once plugged in.
// macOS/Linux: run `ls /dev/tty.*` or `ls /dev/ttyACM*` while connected.
// Windows: check Device Manager for the COM port number (e.g. "COM3").
const port = new SerialPort({ path: "/dev/ttyACM0", baudRate: 115200 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

parser.on("data", (line: string) => {
  try {
    const packet: TelemetryPacket = JSON.parse(line);
    broadcast(packet);
  } catch {
    // Not a JSON telemetry line -- e.g. a stray printf from elsewhere
    // in the PROS program. Log it for visibility during bring-up.
    console.log("[non-telemetry line]", line);
  }
});

port.on("error", (err) => console.error("Serial error:", err.message));

// --- HTTP: list-recordings endpoint ---
const httpServer = createServer((req, res) => {
  if (req.url === "/recordings") {
    const files = fs.readdirSync(RECORDINGS_DIR);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(files));
    return;
  }
  res.writeHead(404);
  res.end();
});

// --- WebSocket: live clients ---
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`Client connected (${clients.size} total)`);

  ws.on("message", (raw) => {
    const msg: ClientMessage = JSON.parse(raw.toString());
    if (msg.type === "startRecording") startRecording();
    if (msg.type === "stopRecording") stopRecording();
    if (msg.type === "config") {
      port.write(JSON.stringify(msg) + "\n"); // push config edits back to the Brain
    }
  });

  ws.on("close", () => clients.delete(ws));
});

httpServer.listen(PORT, () => {
  console.log(`Backend running: ws://localhost:${PORT}/ws`);
});