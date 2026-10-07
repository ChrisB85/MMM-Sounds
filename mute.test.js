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
  assert.ok(!sent.some(([n]) => n === "PLAY_SOUND"), "no sound in state " + state);
}

// --- 3. back to idle, sounds play again ---
mod.notificationReceived("VOICE_ASSISTANT_STATE", "idle");
mod.notificationReceived("PLAY_SOUND", "cuckoo-clock.wav");
assert.deepStrictEqual(sent, [["PLAY_SOUND", "cuckoo-clock.wav"]], "sound returns after the conversation");

// --- 4. a sound already playing when the conversation starts is stopped ---
// The greeting can start a moment before the wake word; left playing, the
// satellite's microphone hears it as part of the user's request.
sent.length = 0;
mod.notificationReceived("VOICE_ASSISTANT_STATE", "wake");
assert.deepStrictEqual(sent, [["STOP_SOUND", null]], "conversation start stops the playing sound");
sent.length = 0;
mod.notificationReceived("VOICE_ASSISTANT_STATE", "listening");
mod.notificationReceived("VOICE_ASSISTANT_STATE", "speaking");
assert.strictEqual(sent.length, 0, "only the idle -> busy edge stops sounds");
mod.notificationReceived("VOICE_ASSISTANT_STATE", "idle");
mod.notificationReceived("VOICE_ASSISTANT_STATE", "wake");
assert.deepStrictEqual(sent, [["STOP_SOUND", null]], "the next conversation stops sounds again");

console.log("mute.test.js OK");
