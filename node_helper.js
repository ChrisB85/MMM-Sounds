'use strict';

const fs         = require('fs');
const path       = require('path');
const NodeHelper = require('node_helper');
const Player     = require('node-aplay');
const moment     = require('moment');

module.exports = NodeHelper.create({
    isLoaded: false,
    // aplay processes still running, so STOP_SOUND can cut them off.
    players:  new Set(),
    config:   null,

    /**
     * @param {String} notification
     * @param {*}      payload
     */
    socketNotificationReceived: function (notification, payload) {
        if (notification === 'CONFIG') {
            if (!this.isLoaded) {
                this.config   = payload;
                this.isLoaded = true;

                if (this.config.startupSound) {
                    this.playFile(this.config.startupSound);
                }
            }
        } else if (notification === 'STOP_SOUND') {
            this.log('Voice assistant woke, stopping ' + this.players.size + ' sound(s)');
            this.players.forEach(player => player.process.kill('SIGTERM'));
        } else if (notification === 'PLAY_SOUND') {
            if (typeof payload === 'string') {
                this.playFile(payload);
            } else if (typeof payload === 'object') {
                if (typeof payload.sound === 'undefined' || !payload.sound) {
                    this.log('Could not play sound, notification payload `sound` was not supplied');
                } else {
                    this.playFile(payload.sound, payload.delay);
                }
            }
        }
    },

    /**
     * @param {String}  filename
     * @param {Number} [delay]  in ms
     */
    playFile: function (filename, delay) {
        // Only play if outside of quiet hours
        let play = true;

        if (this.config.quietTimeStart && this.config.quietTimeEnd) {
            this.log('Quiet Time Start is: ' + this.config.quietTimeStart, true);
            this.log('Quiet Time End is: ' + this.config.quietTimeEnd, true);

            let start_moment = moment(this.config.quietTimeStart, 'HH:mm');
            let end_moment   = moment(this.config.quietTimeEnd, 'HH:mm');

            this.log('Start Moment: ' + start_moment.format('YYYY-MM-DD HH:mm'));
            this.log('End Moment: ' + end_moment.format('YYYY-MM-DD HH:mm'));

            let time = moment();

            if (start_moment.isBefore(end_moment)) {
                if (moment().isBetween(start_moment, end_moment)) {
                    play = false;
                }
            } else {
                let day_start = moment('00:00:00', 'HH:mm:ss');
                let day_end = moment('23:59:59', 'HH:mm:ss');
                if (time.isBetween(day_start, end_moment) || time.isBetween(start_moment, day_end)) {
                    play = false;
                }
            }
        }

        if (play) {
            delay = delay || this.config.defaultDelay;

            let soundfile = __dirname + '/sounds/' + filename;

            // Make sure file exists before playing
            try {
                fs.accessSync(soundfile, fs.F_OK);
            } catch (e) {
                // Custom sequence doesn't exist
                this.log('Sound does not exist: ' + soundfile);
                return;
            }

            this.log('Playing ' + path.normalize(__dirname + '/sounds/' + filename) + ' with ' + delay + 'ms delay', true);

            try {
            setTimeout(() => {
                    const player = new Player(path.normalize(__dirname + '/sounds/' + filename));
                    player.play();
                    this.sendSocketNotification('SOUND_STARTED', filename);
                    // 'exit', not node-aplay's 'complete': a killed aplay emits no
                    // 'complete' and listeners would wait for it forever.
                    this.players.add(player);
                    player.process.on('exit', () => {
                        this.players.delete(player);
                        this.sendSocketNotification('SOUND_FINISHED', filename);
                    });
                }, delay);
                this.log('Sound played successfully');
            } catch (e) {
                this.log('Error playing sound: ' + e);
            }
        } else {
            this.log('Not playing sound as quiet hours are in effect');
        }
    },

    /**
     * Outputs log messages
     *
     * @param {String}  message
     * @param {Boolean} [debug_only]
     */
    log: function (message, debug_only) {
        if (!debug_only || (debug_only && typeof this.config.debug !== 'undefined' && this.config.debug)) {
            console.log('[' + moment().format('YYYY-MM-DD HH:mm:ss') + '] [MMM-Sounds] ' + message);
        }
    }
});
