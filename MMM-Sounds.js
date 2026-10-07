Module.register('MMM-Sounds', {

    /**
     * Default Config
     */
    defaults: {
        debug:          false,
        startupSound:   null,
        defaultDelay:   10,
        quietTimeStart: null,
        quietTimeEnd:   null
    },

    /**
     * Module Start
     */
    start: function() {
        // Set from MMM-VoiceEye; the mirror keeps quiet while the voice assistant talks.
        this.voiceBusy = false;
        this.sendSocketNotification('CONFIG', this.config);
        Log.info('Starting module: ' + this.name);
    },

    /**
     * Notification Received from other modules
     *
     * @param {String} notification
     * @param {*}      payload
     */
    notificationReceived: function(notification, payload) {
        if (notification === 'VOICE_ASSISTANT_STATE') {
            const busy = payload !== 'idle';
            // A sound started just before the wake word (a face greeting) would
            // otherwise reach the satellite's microphone - stop it on the way in.
            if (busy && !this.voiceBusy) {
                this.sendSocketNotification('STOP_SOUND', null);
            }
            this.voiceBusy = busy;
        } else if (notification === 'PLAY_SOUND') {
            // Every mirror sound ends up here, TTS included, so one check covers
            // all sources - checked at play time, after any TTS download delay.
            if (this.voiceBusy) {
                Log.info(this.name + ': voice assistant busy, skipping ' + JSON.stringify(payload));
                return;
            }
            this.sendSocketNotification(notification, payload);
        }
    },

    /**
     * SOUND_STARTED / SOUND_FINISHED from the helper, payload is the file name.
     * MMM-VoiceEye lights up on them while the mirror speaks.
     */
    socketNotificationReceived: function(notification, payload) {
        this.sendNotification(notification, payload);
    }
});
