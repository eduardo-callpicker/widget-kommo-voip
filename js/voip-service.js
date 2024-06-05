define([
    'https://connectors6.black.digitum.com.mx/static/amo/sip.min.js'
], function (SIP) {
	const VoipService = function () {
        const self = this

		this.context = null

		this.wssServer = 'webrtcdev.callpicker.com'
		this.serverPath = '/ws'
		this.webSocketPort = 443
		this.profileName = 'Jafet Osorio'
		this.sipUserName = ''
		this.sipPassword = ''
		this.transportReconnectionAttempts = 99
		this.registerExpires = 300
		this.userAgent = null
		this.registererOptions = { 
			expires: this.registerExpires
		}

		/**
		 * This is the main function, create a User SIP Agent
		 */
		this.createUserAgent = function(extensionSipData) {
			console.log(extensionSipData)
			const options = {
				uri: SIP.UserAgent.makeURI("sip:"+ extensionSipData.username + "@" + self.wssServer),
				transportOptions: {
					server: "wss://" + self.wssServer + ":"+ self.webSocketPort +""+ self.serverPath,
					traceSip: false,
				},
				displayName: self.profileName,
				authorizationUsername: extensionSipData.username,
				authorizationPassword: extensionSipData.password,
				contactParams: { "transport" : "wss" },
				autoStart: false,
				autoStop: true,
				register: false,
				noAnswerTimeout: 120,
				delegate: {
					onInvite: function (sip){
						self.receiveCall(sip);
					}
				}
			}
		
			self.userAgent = new SIP.UserAgent(options)
		
			self.userAgent.isRegistered = function(){
				return (self.userAgent && self.userAgent.registerer && self.userAgent.registerer.state == SIP.RegistererState.Registered)
			}
		
			self.userAgent.sessions = self.userAgent._sessions
			self.userAgent.registrationCompleted = false
			self.userAgent.registering = false
			self.userAgent.transport.ReconnectionAttempts = self.transportReconnectionAttempts;
			self.userAgent.transport.attemptingReconnection = false
		
			self.userAgent.transport.onConnect = function() {
				self.onTransportConnected()
			}
		
			self.userAgent.registerer = new SIP.Registerer(self.userAgent, self.registererOptions);
			console.log("Creating Registerer... Done")
		
			self.userAgent.registerer.stateChange.addListener(function(newState){
				console.log("User Agent Registration State:", newState)
			})
		
			console.log("User Agent Connecting to WebSocket...")
			self.userAgent.start()
		}

		/**
		 * This method will be ejecuted when the transport with weboscket is connected to ensure the proper register
		 */
		this.onTransportConnected = function() {
			// TODO: remove this
			console.log("Connected to Web Socket!")
		
			// Reset the ReconnectionAttempts
			self.userAgent.transport.ReconnectionAttempts = self.transportReconnectionAttempts
			// Auto start register
			if(self.userAgent.transport.attemptingReconnection == false && self.userAgent.registering == false){
				window.setTimeout(function (){
					self.register()
				}, 500)
			}
		}

		/**
		 * Register the UserAgent on the webRTC server
		 */
		this.register = function() {
			if (self.userAgent == null || self.userAgent.registering == true || self.userAgent.isRegistered()) return
		
			const registererRegisterOptions = {
				requestDelegate: {
					onReject: function(sip){
						self.onRegisterFailed(sip.message.reasonPhrase, sip.message.statusCode)
					}
				}
			}
		
			console.log("Sending Registration...")
			self.userAgent.registering = true
			self.userAgent.registerer.register(registererRegisterOptions)
		}

		/**
		 * Draws a log on console when UserAgent register was failed
		 * 
		 * @param {*} response 
		 * @param {*} statusCode 
		 */
		this.onRegisterFailed = function(response, statusCode) {
			this.context.showWarningModal('voip_register_failed')
			console.log("Registration Failed: " + response, statusCode)
		}

		/**
		 * This is the method responsible manage SIP INVITE event
		 * 
		 * @param {*} session 
		 */
		this.receiveCall = function(session) {
			let callerID = session.remoteIdentity.displayName;
			const did = session.remoteIdentity.uri.user;
			if (typeof callerID === 'undefined') callerID = did;

			console.log("New Incoming Call!", callerID +" <"+ did +">");

			const notification = {
				text: {
					header: "Incoming call",
					text: "from: " + callerID
				},
				type: "call"
			};
			APP.notifications.add_call(notification);
			self.answerCall(session);
		}

		this.answerCall = function(session) {
			session.accept()
		}

		this.ignoreCall = function(session) {
			session.reject()
		}

		return this
	}
	return new VoipService()
})