define([], function () {
    /**
     * GeneralService to handle shared utility functions
     * 
     * @returns GeneralService
     */
    const GeneralService = function () {
        const self = this;

        /**
         * Formats a duration in seconds to HH:MM:SS format
         * @param {number} seconds - The duration in seconds
         * @returns {string} The formatted time string
         */
        this.formatDuration = (seconds) => {
            let sec = Math.floor(seconds);
			if (sec < 0) {
				return sec;
			} else if (sec >= 0 && sec < 60) {
				return "00:" + ((sec > 9) ? sec : "0" + sec);
			} else if (sec >= 60 && sec < 60 * 60) { // greater than a minute and less than an hour
				let minutes = Math.floor(sec / 60);
				sec = sec % 60;
				return ((minutes > 9) ? minutes : "0" + minutes) + ":" + ((sec > 9) ? sec : "0" + sec);
			} else if (sec >= 60 * 60 && sec < 24 * 60 * 60) { // greater than an hour and less than a day
				let hours = Math.floor(sec / 3600);
				let minutes = Math.floor((sec % 3600) / 60);
				sec = sec % 60;
				return ((hours > 9) ? hours : "0" + hours) + ":" + ((minutes > 9) ? minutes : "0" + minutes) + ":" + ((sec > 9) ? sec : "0" + sec);
			}
			// Otherwise.. this is just too long
			return "00:00:00";
        };

        return this;
    };

    return new GeneralService();
});
