"use strict";

/* Checks that no sound reaches the helper while a voice assistant conversation
 * is running. The module only needs the Module and Log globals.
 */

const assert = require("assert");

let mod;
global.Module = { register: (n, o) => { mod = o; } };
global.Log = { info() {} };
require("./MMM-Sounds.js");

const sent = [];
mod.sendSocketNotification = (n, p) => sent.push([n, p]);
mod.config = Object.assign({}, mod.defaults);
mod.start();
sent.length = 0; // drop CONFIG

// --- 1. outside a conversation sounds play ---
mod.notificationReceived("PLAY_SOUND", "tts/greeting.wav");
assert.deepStrictEqual(sent, [["PLAY_SOUND", "tts/greeting.wav"]], "sound plays outside a conversation");

// --- 2. during a conversation every state but idle mutes ---
for (const state of ["wake", "listening", "thinking", "speaking"]) {
  sent.length = 0;
  mod.notificationReceived("VOICE_ASSISTANT_STATE", state);
  mod.notificationReceived("PLAY_SOUND", "tts/greeting.wav");
  assert.strictEqual(sent.length, 0, "no sound in state " + state);
}

// --- 3. back to idle, sounds play again ---
mod.notificationReceived("VOICE_ASSISTANT_STATE", "idle");
mod.notificationReceived("PLAY_SOUND", "cuckoo-clock.wav");
assert.deepStrictEqual(sent, [["PLAY_SOUND", "cuckoo-clock.wav"]], "sound returns after the conversation");

console.log("mute.test.js OK");
