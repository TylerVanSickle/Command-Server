const net = require("net");
const readline = require("readline");

const socket = net.createConnection({ port: 3000 }, () => {
  console.log("Connected to server");
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on("line", (input) => {
  socket.write(input + "\n");
});

socket.on("data", (data) => {
  console.log(data.toString().trim());
});

socket.on("error", (err) => {
  console.error("Error:", err.message);
});

socket.on("end", () => {
  console.log("Disconnected from server");
});
