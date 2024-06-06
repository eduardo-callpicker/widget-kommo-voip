define([
    'https://connectors6.black.digitum.com.mx/static/amo/sip.min.js'
], function (SIP) {
	/**
     * Service for handling VOIP functions, using SIP.js as core library.
     * @see {@link https://sipjs.com/guides/|SIP.js Documentation}
     * @class
     */
	const VoipService = function () {
        const self = this

		/**
         * It expects to be Widget context, it must be initialized with the service
         * @type {CustomWidget|null}
         */
		this.context = null

		/**
		 * WebSocket URL, used to stabilish connection with the VOIP core
		 * @type {string}
		 */
		this.wssServer = 'webrtcdev.callpicker.com'

		/**
         * The path to the WebSocket server.
         * @type {string}
         */
        this.serverPath = '/ws';

        /**
         * The port for the WebSocket connection.
         * @type {number}
         */
        this.webSocketPort = 443;

        /**
         * The profile name for the user.
         * @type {string}
         */
        this.profileName = '';

        /**
         * The SIP username for authentication.
         * @type {string}
         */
        this.sipUserName = '';

        /**
         * The SIP password for authentication.
         * @type {string}
         */
        this.sipPassword = '';

        /**
         * The number of reconnection attempts for the transport layer.
         * @type {number}
         */
        this.transportReconnectionAttempts = 99;

        /**
         * The expiration time for SIP registration in seconds.
         * @type {number}
         */
        this.registerExpires = 300;

        /**
         * The user agent instance for handling SIP communications.
         * @type {SIP.UA|null}
         */
        this.userAgent = null;

        /**
         * Options for SIP registerer, including the expiration time.
         * @type {Object}
         * @property {number} expires - The expiration time for SIP registration in seconds.
         */
        this.registererOptions = { 
            expires: this.registerExpires
        };

		/**
		 * Initializes the SIP user agent.
		 * The SIP user agent is responsible to handling SIP communications
		 */
		this.createUserAgent = function() {
			const options = {
				uri: SIP.UserAgent.makeURI("sip:"+ self.sipUserName + "@" + self.wssServer),
				transportOptions: {
					server: "wss://" + self.wssServer + ":"+ self.webSocketPort +""+ self.serverPath,
					traceSip: false,
				},
				displayName: self.profileName,
				authorizationUsername: self.sipUserName,
				authorizationPassword: self.sipPassword,
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