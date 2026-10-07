"use strict";

/* Checks that STOP_SOUND kills every aplay the helper started and leaves
 * finished ones alone. node_helper and node-aplay are stubbed.
 */

const assert = require("assert");
const Module = require("module");
const { EventEmitter } = require("events");

const players = [];
class FakePlayer {
  constructor(file) { this.file = file; players.push(this); }
  play() {
    this.process = new EventEmitter();
    this.process.kill = () => { this.killed = true; this.process.emit("exit", null, "SIGTERM"); };
  }
}
const stubs = { node_helper: { create: (o) => o }, "node-aplay": FakePlayer };
const load = Module._load;
Module._load = function (req, ...rest) {
  return req in stubs ? stubs[req] : load.call(this, req, ...rest);
};
const helper = require("./node_helper.js");
Module._load = load;

const sent = [];
helper.sendSocketNotification = (n, p) => sent.push([n, p]);
helper.log = () => {};
helper.config = { defaultDelay: 0 };
const fs = require("fs");
fs.accessSync = () => {};

const realSetTimeout = global.setTimeout;
global.setTimeout = (fn) => fn();

// two sounds start, the first one ends on its own
helper.playFile("tts/greeting.wav");
helper.playFile("cuckoo-clock.wav");
players[0].process.emit("exit", 0, null);

helper.socketNotificationReceived("STOP_SOUND", null);
assert.strictEqual(players[0].killed, undefined, "a finished sound is not killed again");
assert.strictEqual(players[1].killed, true, "a playing sound is killed");

// nothing playing: STOP_SOUND is a no-op
helper.socketNotificationReceived("STOP_SOUND", null);

global.setTimeout = realSetTimeout;
console.log("stop.test.js OK");
