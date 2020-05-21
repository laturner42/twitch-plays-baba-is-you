const tmi = require('tmi.js');
const robot = require("robotjs");
require('dotenv').config();

let acceptingCommands = true;
let requestTimestamp = null;
let restartsRequested = new Set();

// Define configuration options
const opts = {
  identity: {
    username: process.env.USERNAME,
    password: process.env.OAUTH_TOKEN,
  },
  channels: [process.env.CHANNEL]
};
// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

const commands = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  z: 'z',
  whoops: 'z',
  undo: 'z',
  oof: 'z',
  back: 'z',
  'uh oh': 'z',
  enter: 'space',
  random: 'random',
};

const clearRestart = () => {
  restartsRequested = new Set();
  acceptingCommands = true;
  requestTimestamp = null;
}

const restartCommands = [
  'rip',
  'big oof',
  'restart',
  'f',
];

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) return; // Ignore messages from the bot

  if (!acceptingCommands) return;

  // Remove whitespace from chat message
  const commandTotal = msg.trim().toLowerCase();
  let commandName = '';
  let numTimes = 0;

  if (commandTotal === '!commands') {
    return client.say(target, 'https://docs.google.com/document/d/1u53Ne0-U0yrxvMzSz-CMdrVhOooTyG0Wyps8LyXsd10/edit?usp=sharing');
  }

  Object.keys(commands).forEach((command) => {
    if (commandTotal.startsWith(command)) {
      commandName = command;
      numTimes = 1;
      const remaining = commandTotal.replace(command, '');
      if (!remaining.length) return;
      try {
        numTimes = parseInt(remaining);
        if (numTimes >= 25) {
          numTimes = -1;
          client.say(target, 'Movement has to be less than 25 spaces!');
        }
      } catch (e) {
        numTimes = -1;
      }
    }
  });

  if (commandTotal === 'p' || commandTotal === 'pause') {
    client.say(target, 'Pausing is disabled.');
  } else if (restartCommands.includes(commandTotal)) {
    if (requestTimestamp && (new Date() - requestTimestamp >= 300000)) {
      requestTimestamp = null;
      restartsRequested.clear();
    }
    restartsRequested.add(context.username); 
    if (!requestTimestamp) {
      client.say(target, 'A restart has been requested! 3 requests are required to go through. The request lasts for five minutes.');
      requestTimestamp = new Date();
    } else {
      const numRequests = restartsRequested.size;
      if (numRequests >= 3 && acceptingCommands) {
        client.say(target, 'Restarting the level!');
        acceptingCommands = false;
        robot.keyToggle('r', 'down');
        setTimeout(() => {
          robot.keyToggle('r', 'up');
          clearRestart();
        }, 1000);
      } else {
        client.say(target, `We have ${numRequests} request${numRequests > 1 ? 's' : ''} to restart.`);
      }
    }
  } else if (commands[commandName]) {
    if (acceptingCommands && numTimes > 0) {
      doCommandNumTimes(commands[commandName], numTimes, 1);
    }
  }
}

function doCommandNumTimes(inputCommand, numTimes, timesDone) {
  let command = inputCommand;
  if (command === 'random') {
    command = ['left', 'right', 'up', 'down'][Math.floor(Math.random() * 4)];
  }
  robot.keyToggle(command, 'down');
  setTimeout(() => {
    robot.keyToggle(command, 'up');
    if (timesDone < numTimes) {
      doCommandNumTimes(inputCommand, numTimes, timesDone + 1);
    }
  }, 100);
}

// Function called when the "dice" command is issued
function rollDice () {
  const sides = 6;
  return Math.floor(Math.random() * sides) + 1;
}
// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}