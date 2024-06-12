define([
    'https://connectors6.black.digitum.com.mx/static/amo/sip.min.js',
	'./notification-service.js',
	'./general-service.js'
], function (SIP, NotificationService, GeneralService) {
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
		  * The session data on a sip call
		  * @type {Object} 
		  */
		this.sipSession = null

		/**
		  *  Initialice all params tha we need
		  */
		this.init = (context) => {
			self.context = context
			NotificationService.init(context)
		}

		/**
		  * Initializes the SIP user agent.
		  * The SIP user agent is responsible to handling SIP communications
		  */
		this.createUserAgent = () => {
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
		this.onTransportConnected = () => {
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
		this.register = () => {
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
		  * @param {string} response 
		  * @param {string} statusCode 
		 */
		this.onRegisterFailed = (response, statusCode) => {
			this.context.showWarningModal('voip_register_failed')
			console.log("Registration Failed: " + response, statusCode)
		}

		/**
		  * This is the method responsible to manage SIP INVITE event 
		  * @param {*} session 
		  */
		this.receiveCall = session => {
			let callerID = session.remoteIdentity.displayName
			const did = session.remoteIdentity.uri.user
			if (typeof callerID === 'undefined') callerID = did

			console.log("New Incoming Call!", callerID +" <"+ did +">")

			self.sipSession = session
			self.sipSession.data = {}
			self.sipSession.data.src = did
			self.sipSession.data.calldirection = "inbound"
			self.sipSession.data.buddyType = '' // Maybe be contact o lead
			self.sipSession.data.buddyId = null //find budfy

			// Session Delegates
			self.sipSession.delegate = {
				onBye: (sip) => {
					self.onSessionRecievedBye(sip)
				},
			}

			// incomingInviteRequestDelegate
			self.sipSession.incomingInviteRequest.delegate = {
				onCancel: (sip) => {
					self.onInviteCancel(sip)
				}
			}

			NotificationService.showIncomingCallModal(callerID)
			.then(() => {
				self.answerCall()
				NotificationService.updateVoipCallMenu({
					callType: self.sipSession.data.calldirection,
					callerId: callerID
				})
			})
			.catch(() => {
				self.rejectCall(session)
				// Reset de VOIP call menu to prevent unspected changes
				NotificationService.resetVoipCallMenu()
			})
		}
		
		/**
		  * Accept the SIP invite and call the actions to update the UI
		  */
		this.answerCall = () => {
			self.sipSession.accept()
			const startTime = new Date()

			self.sipSession.data.callstart = startTime
			self.sipSession.data.callTimer = window.setInterval(() => {
				const now = new Date()
				const duration = (now - startTime) / 1000 // duration in seconds

				const timeStr = GeneralService.formatDuration(duration)
				NotificationService.updateVoipCallMenu({
					talkTime: timeStr
				})
			}, 1000);
			NotificationService.addVoipCallMenuListeners({
				mute: self.muteSipSession,
				hangup: self.endSipSession
			})
			NotificationService.showVoipCallMenu()
		}

		/**
		  * Handle the actions when a SIP invite is rejected 
		  */
		this.rejectCall = (session) => {
			if(session.state == SIP.SessionState.Established) {
				session.bye().catch((e) => {
					console.warn("Problem in RejectCall, could not bye call", e)
				})
			}
			else {
				session.reject({ 
					statusCode: 486, 
					reasonPhrase: "Busy Here" 
				}).catch((e) => {
					console.warn("Problem in RejectCall, could not reject call", e)
				})
			}

			self.teardownSipSession()
		}

		/**
		  * Actions that need to be executed when the call is ended by the remote peer
		  */
		this.onSessionRecievedBye = () => {
			NotificationService.hideVoipCallMenu()
			NotificationService.resetVoipCallMenu()
			self.teardownSipSession()
		}

		/**
		  * Actions that neet to be excecuted when the invite is caceled the remote peer
		  */
		this.onInviteCancel = () => {
			self.sipSession.dispose().catch((e) => {
				console.log("Failed to dispose", es);
			})

			NotificationService.incomingCallModal.destroy()
			NotificationService.resetVoipCallMenu()
		} 

		/**
		  * Method responsible to finish the call when the user hang-up 
		  */
		this.endSipSession = () => {
			self.sipSession.bye().catch((e) => {
				console.warn("Failed to bye the session!", e);
			});

			NotificationService.hideVoipCallMenu()
			NotificationService.resetVoipCallMenu()
			self.teardownSipSession()
		}

		/**
		  * Clear all data related to a SIP sesion 
		  */
		this.teardownSipSession = () => {
			window.clearInterval(self.sipSession.data.callTimer)
			self.sipSession = null
		}

		/**
		  * Method responsible to mute the call 
		  */
		this.muteSipSession = () => {
			console.log('Mute')
		}

		return this
	}
	return new VoipService()
})