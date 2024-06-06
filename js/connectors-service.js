define([], function () {
	/**
	 * Service responsible to connect with Connectors 
	 * 
	 * @class
	 */
	const ConnectorsService = function () {
        const self = this
		/**
         * It expects to be Widget context, it must be initialized with the service
         * @type {CustomWidget|null}
         */
		this.context = null

		/**
		 * The Connectors integration base URL
		 * @type {string}
		 */
		this.host = 'https://connectors6.black.digitum.com.mx/amocrm/widget'

		/**
		 * The endpoint to get SIP credentials for a Callpicker extension
		 * @type {string}
		 */
		this.getExtensionSipCredentialsEndpoint = `${this.host}/get_extension_sip_credentials`

		/**
		 * Get the SIP credentials for an Callpicker extension
		  * @param {Object} payload - The payload object containing necessary credentials.
		  * @param {string} payload.cp_extension_id - The Callpicker extension ID.
		  * @param {string} payload.cp_client_id - The Callpicker client ID.
		  * @param {string} payload.cp_client_secret - The Callpicker client secret.
		  * @returns {Promise<Object>} A promise that resolves with the SIP credentials.
		 */
		this.getExtensionSipCredentials = (payload) => {
			return new Promise((resolve, reject) => {
				self.context.crm_post(
					self.getExtensionSipCredentialsEndpoint,
					payload,
					response => {
						if (response.code && response.code == 200 && response.data) {
							resolve({
								username: response.data.user,
								password: response.data.pass
							})
						} else {
							reject(response)
						}
					},
					'json'
				)
			})
		}

		return this
	}
	return new ConnectorsService()
})