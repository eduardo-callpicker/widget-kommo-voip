define([], function () {
	/**
	 * Service to handle local storage data 
	 * 
	 * @returns LocalStorageService
	 */
	const LocalStorageService = function () {
        const self = this

		/**
         * Validates if a key exist on localStorage
         * 
         * @param {*} key 
         * @returns boolean
         */
        this.exists = (key) => {
            return localStorage.getItem(key) !== null;
        }
        
        /**
         * Saves an element on localStorage
         * 
         * @param {*} key 
         * @param {*} value 
         */
        this.set = (key, value) => {
            localStorage.setItem(key, JSON.stringify(value));
        }
        
        /**
         * Gets an element from local storage
         * 
         * @param {*} key 
         * @returns JSON|null
         */
        this.get = (key) => {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        }
        
        /**
         * 
         * @param {*} key 
         * @param {*} value 
         */
        this.update = (key, value) => {
            if (!self.exists(key)) {
                console.error(`Key "${key}" does not exist in localStorage.`);
                return
            } 
            self.set(key, value);
        }
        
        /**
         * Removes and element from localStorage
         * 
         * @param {*} key 
         */
        this.remove = (key) => {
            localStorage.removeItem(key);
        }

		return this
	}
	return new LocalStorageService()
})