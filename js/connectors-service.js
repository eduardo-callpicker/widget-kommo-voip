define(['jquery'], function ($) {
	/**
	 * Service responsible to connect with Connectors 
	 * 
	 * @returns ConnectorsService
	 */
	const ConnectorsService = function () {
        const self = this
		this.CONTEXT = null
		this.HOST = 'https://connectors6.black.digitum.com.mx/amocrm/widget'
		this.GET_EXTENSION_SIP_CREDENTIALS_ENDPOINT = `${this.HOST}/get_extension_sip_credentials`

		this.getExtensionSipCredentials = (payload) => {
			return new Promise((resolve, reject) => {
				self.CONTEXT.crm_post(
					self.GET_EXTENSION_SIP_CREDENTIALS_ENDPOINT,
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