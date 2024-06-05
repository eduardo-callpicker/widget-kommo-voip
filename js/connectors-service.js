define(['jquery'], function ($) {
	/**
	 * Service responsible to connect with Connectors 
	 * 
	 * @returns ConnectorsService
	 */
	const ConnectorsService = function () {
        const self = this
		this.context = null
		this.host = 'https://connectors6.black.digitum.com.mx/amocrm/widget'
		this.getExtensionSipCredentialsEndpoint = `${this.host}/get_extension_sip_credentials`

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