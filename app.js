const net = require("net");
const fs = require("fs");

let clients = [];
let clientIdCounter = 1;
const adminPassword = "supersecretpw";

const server = net.createServer((socket) => {
  const clientId = `Client${clientIdCounter++}`;
  clients.push({ socket, clientId, username: clientId });

  console.log(`${clientId} connected`);
  fs.appendFileSync("chat.log", `${clientId} connected\n`);

  socket.write(`Welcome ${clientId}! Type '/help' for commands.\n`);

  clients.forEach((client) => {
    if (client.socket !== socket) {
      client.socket.write(`${clientId} has joined the chat.\n`);
    }
  });

  socket.on("data", (data) => {
    const message = data.toString().trim();

    if (message.length === 0) {
      return; 
    }

    console.log(`${clientId}: ${message}`);
    fs.appendFileSync("chat.log", `${clientId}: ${message}\n`);

    if (message.startsWith("/")) {
      handleCommand(socket, message);
    } else {
      const sender = clients.find((client) => client.socket === socket);
      const username = sender.username;

      clients.forEach((client) => {
        if (client.socket !== socket) {
          client.socket.write(`${username}: ${message}\n`);
        }
      });
    }
  });

  socket.on("end", () => {
    const client = clients.find((client) => client.socket === socket);

    if (client) {
      console.log(`${client.username} disconnected`);
      fs.appendFileSync("chat.log", `${client.username} disconnected\n`);

      clients.forEach((remainingClient) => {
        if (remainingClient.socket !== socket) {
          remainingClient.socket.write(`${client.username} has left the chat.\n`);
        }
      });

      clients = clients.filter((client) => client.socket !== socket);
    }
  });

  socket.on("error", (err) => {
    console.error("Error with client:", err.message);
  });

  function handleCommand(socket, message) {
    const args = message.split(" ");
    const command = args[0].toLowerCase();

    switch (command) {
      case "/w":
        handleWhisper(socket, args);
        break;
      case "/username":
        handleUsernameChange(socket, args);
        break;
      case "/leave":
        leaveServer(socket); 
        break;
      case "/kick":
        handleKick(socket, args);
        break;
      case "/clientlist":
        handleClientList(socket);
        break;
      case "/help":
        handleHelp(socket);
        break;
      default:
        socket.write("Unknown command. Use '/help' for available commands.\n");
    }
  }

  function leaveServer(socket) {
    const client = clients.find((client) => client.socket === socket);

    if (!client) {
      socket.write("Error: You are not connected to the chat.\n");
      return;
    }

    console.log(`${client.username} has left the chat.`);
    fs.appendFileSync("chat.log", `${client.username} has left the chat.\n`);

    clients.forEach((remainingClient) => {
      if (remainingClient.socket !== socket) {
        remainingClient.socket.write(`${client.username} has left the chat.\n`);
      }
    });

    clients = clients.filter((client) => client.socket !== socket);

    socket.end(() => {
      console.log(`${client.username} has been disconnected from the server.`);
    });
  }

  function handleWhisper(socket, args) {
    if (args.length < 3) {
      socket.write("Error: Invalid syntax. Use '/w <username> <message>'.\n");
      return;
    }

    const targetUsername = args[1].toLowerCase(); 
    const message = args.slice(2).join(" ");

    const targetClient = clients.find(
      (client) => client.username.toLowerCase() === targetUsername
    );

    if (!targetClient) {
      socket.write(`Error: User ${args[1]} not found.\n`);
      return;
    }

    const senderUsername = clients.find(
      (client) => client.socket === socket
    ).username;

    if (targetClient.socket === socket) {
      socket.write("Error: You cannot whisper to yourself.\n");
      return;
    }

    targetClient.socket.write(`${senderUsername} whispers: ${message}\n`);
  }

  function handleUsernameChange(socket, args) {
    if (args.length !== 2) {
      socket.write("Error: Invalid syntax. Use '/username <newUsername>'.\n");
      return;
    }

    const newUsername = args[1];
    const client = clients.find((client) => client.socket === socket);

    if (newUsername === client.username) {
      socket.write("Error: Your username is already the same.\n");
      return;
    }

    if (clients.some((client) => client.username === newUsername)) {
      socket.write(`Error: Username ${newUsername} is already in use.\n`);
      return;
    }

    const oldUsername = client.username;
    client.username = newUsername;

    clients.forEach((client) => {
      if (client.socket !== socket) {
        client.socket.write(
          `${oldUsername} changed their username to ${newUsername}.\n`
        );
      }
    });

    socket.write(`Your username has been updated to ${newUsername}.\n`);
  }

  function handleKick(socket, args) {
    if (args.length !== 3) {
      socket.write(
        "Error: Invalid syntax. Use '/kick <username> <adminPassword>'.\n"
      );
      return;
    }

    const targetUsername = args[1];
    const password = args[2];

    if (password !== adminPassword) {
      socket.write("Error: Incorrect admin password.\n");
      return;
    }

    if (
      clients.find((client) => client.socket === socket).username ===
      targetUsername
    ) {
      socket.write("Error: You cannot kick yourself.\n");
      return;
    }

    const targetClient = clients.find(
      (client) => client.username === targetUsername
    );

    if (!targetClient) {
      socket.write(`Error: User ${targetUsername} not found.\n`);
      return;
    }

    targetClient.socket.write("You have been kicked from the chat.\n");
    targetClient.socket.end();

    clients = clients.filter((client) => client.socket !== targetClient.socket);

    clients.forEach((client) => {
      if (client.socket !== socket) {
        client.socket.write(
          `${targetUsername} has been kicked from the chat.\n`
        );
      }
    });
  }

  function handleClientList(socket) {
    const clientList = clients.map((client) => client.username).join(", ");
    socket.write(`Connected clients: ${clientList}\n`);
  }

  function handleHelp(socket) {
    const helpMessage = `
      Available commands:
      /w <username> <message>  - Whisper message to a specific user
      /username <newUsername>  - Change your username
      /kick <username> <adminPassword>  - Kick a user (admin only)
      /clientlist              - List all connected clients
      /help                    - Show this help message
    `;
    socket.write(helpMessage);
  }
});

server.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
