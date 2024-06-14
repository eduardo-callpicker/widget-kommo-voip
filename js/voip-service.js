define([
	'underscore',
    'https://connectors6.black.digitum.com.mx/static/amo/sip.min.js',
	'./notification-service.js',
	'./general-service.js',
	'./localstorage-service.js'
], function (_, SIP, NotificationService, GeneralService, LocalStorageService) {
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
		  * Determines if the platform has Mic 
		  * @type {boolean}
		  */
		this.hasAudioDevice = false;

		/**
		  * Determines if the platform has audio output device
		  * @type {boolean}
		  */
		this.hasSpeakerDevice = false; // Safari and Firefox don't have these

		/**
		 * The audio input devices list
		 * @type {Array}
		 */
		this.audioinputDevices = [];

		/**
		 * The audio output devices list
		 * @type {Array}
		 */
		this.speakerDevices = [];

		/**
		  * Key for active audio input on the local storage
		  * @type {string}
		  */
		this.activeAudioInputKey = 'active-audio-input'

		/**
		  * Key for active audio output on the local storage
		  * @type {string}
		  */
		this.activeSpeakerKey = 'active-speaker'

		/**
		  * Initialice all params tha we need
		  * @returns {Promise}
		  */
		this.init = (context) => {
			self.context = context
			NotificationService.init(context)

			return new Promise((resolve, reject) => {
				navigator.mediaDevices.getUserMedia({ audio: true })
				.then(stream => {
					self.detectDevices()
					window.setInterval(() => {
						self.detectDevices()
					}, 10000)
					resolve()
				})
				.catch((e) => {
					if (e.name === 'NotAllowedError') {
						reject('Audio permission denied by the user:' + e)
					} else {
						reject('Error accessing audio stream:' + e)
					}
				}) 
			})
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
			self.sipSession.data.buddyType = '' //TODO: Maybe be contact o lead
			self.sipSession.data.buddyId = null //TODO: find budfy

			// Session Delegates
			self.sipSession.delegate = {
				onBye: (sip) => {
					self.onSessionRecievedBye(sip)
				},
				onSessionDescriptionHandler: function(sdh, provisional){
					self.onSessionDescriptionHandlerCreated(sdh, provisional);
				}
			}

			// incomingInviteRequestDelegate
			self.sipSession.incomingInviteRequest.delegate = {
				onCancel: (sip) => {
					self.onInviteCancel(sip)
				}
			}

			NotificationService.addIncomingCallAudioTag()
			NotificationService.showIncomingCallModal(callerID)
			.then(() => {
				self.answerCall()
				NotificationService.updateVoipCallMenu({
					callType: self.sipSession.data.calldirection,
					callerId: callerID
				})
			})
			.catch((e) => {
				console.error(e)
				self.rejectCall(session)
				// Reset de VOIP call menu to prevent unspected changes
				NotificationService.resetVoipCallMenu()
			})
		}
		
		/**
		  * Accept the SIP invite and call the actions to update the UI
		  */
		this.answerCall = () => {
			// Start SIP handling
			const spdOptions = {
				sessionDescriptionHandlerOptions: {
					constraints: {
						audio: { deviceId : "default" },
						video: false
					}
				}
			}
		
			// Configure Audio
			const currentAudioDevice = self.getActiveAudioInput();
			if (currentAudioDevice != "default") {
				let confirmedAudioDevice = false;
				for (let i = 0; i < self.audioinputDevices.length; ++i) {
					if(currentAudioDevice == self.audioinputDevices[i].deviceId) {
						confirmedAudioDevice = true;
						break;
					}
				}
				if (confirmedAudioDevice) {
					spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = { exact: currentAudioDevice }
				}
				else {
					console.warn("The audio device you used before is no longer available, default settings applied.");
				}
			}

			self.sipSession.data.audioSourceDevice = self.getActiveAudioInput()
			self.sipSession.data.audioOutputDevice = self.getActiveSpeaker()

			self.sipSession.accept(spdOptions)
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
		  * Call the function responsible to add stream audio when the session description handlres was created
		  * @param {*} sdh 
		  * @param {*} provisional 
		  */
		this.onSessionDescriptionHandlerCreated = (sdh, provisional) => {
			if (sdh) {
				if(sdh.peerConnection){
					sdh.peerConnection.ontrack = (event) => {
						self.onTrackAddedEvent();
					}
				}
				else{
					console.warn("onSessionDescriptionHandler fired without a peerConnection");
				}
			}
			else{
				console.warn("onSessionDescriptionHandler fired without a sessionDescriptionHandler");
			}
		}

		/**
		  * Adds the audio track to an audio tag on the DOM to reproduce it on the active speaker
		  * the audio is taked from the stream media (the call) 
		  */
		this.onTrackAddedEvent = () => {		
			const pc = self.sipSession.sessionDescriptionHandler.peerConnection;
			const remoteAudioStream = new MediaStream()
		
			pc.getTransceivers().forEach((transceiver) => {
				// Add Media
				const receiver = transceiver.receiver
				if(receiver.track){
					if(receiver.track.kind == "audio") {
						console.log("Adding Remote Audio Track")
						remoteAudioStream.addTrack(receiver.track)
					}
				}
			});
		
			// Attach Audio
			if(remoteAudioStream.getAudioTracks().length >= 1){
				const remoteAudio = $("#remoteAudio").get(0)
				remoteAudio.srcObject = remoteAudioStream
				remoteAudio.onloadedmetadata = (e) => {
					const activeAudioOuput = self.getActiveSpeaker()
					if (typeof remoteAudio.sinkId !== 'undefined') {
						remoteAudio.setSinkId(activeAudioOuput).then(function(){
							console.log("sinkId applied: "+ activeAudioOuput)
						}).catch(function(e){
							console.warn("Error using setSinkId: ", e)
						})
					}
					remoteAudio.play()
				}
			}
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
		
		/**
		  * Detect the platform devices (audio-input and audio-output)
		  * Addicionaly update the audio devices select on the voip call menu 
		  */
		this.detectDevices = () => {
			navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
				// deviceInfos will not have a populated lable unless to accept the permission
				// during getUserMedia. This normally happens at startup/setup
				// so from then on these devices will be with lables.
				self.hasAudioDevice = false;
				self.hasSpeakerDevice = false; // Safari and Firefox don't have these
				let audioinputDevices = [];
				let speakerDevices = [];
				for (let i = 0; i < deviceInfos.length; ++i) {
					if (deviceInfos[i].kind === "audioinput") {
						self.hasAudioDevice = true;
						audioinputDevices.push(deviceInfos[i]);
					} 
					else if (deviceInfos[i].kind === "audiooutput") {
						self.hasSpeakerDevice = true;
						speakerDevices.push(deviceInfos[i]);
					}
				}

				// Only update the audio input divices list when changes were detected
				if (!_.isEqual(audioinputDevices, self.audioinputDevices)) {
					let audioinputOptions = []
					for (let i = 0; i < audioinputDevices.length; ++i) {
						const deviceInfo = audioinputDevices[i]
						const devideId = deviceInfo.deviceId
						let displayName = (deviceInfo.label) ? deviceInfo.label : "Microphone"
						if(displayName.indexOf("(") > 0) {
							displayName = displayName.substring(0,displayName.indexOf("("))
						}
						const disabled = (self.sipSession && self.sipSession.data.audioSourceDevice == devideId)
						audioinputOptions.push({value: "input-"+ devideId, text: displayName, disabled : disabled })
					}

					NotificationService.updateVoipCallMenu({
						audioinputOptions: audioinputOptions
					})
					NotificationService.addVoipCallMenuListeners({
						audioInput: self.setActiveAudioInput
					})
				} 

				// Only update speaker divices list when changes were detected
				if (!_.isEqual(speakerDevices, self.speakerDevices)) {
					let speakerOptions = []
					for (let i = 0; i < speakerDevices.length; ++i) {
						const deviceInfo = speakerDevices[i]
						const devideId = deviceInfo.deviceId
						let displayName = (deviceInfo.label) ? deviceInfo.label : "Speaker"
						if(displayName.indexOf("(") > 0) {
							displayName = displayName.substring(0,displayName.indexOf("("))
						}
						const disabled = (self.sipSession && self.sipSession.data.audioOutputDevice == devideId)
						speakerOptions.push({value: "output-"+ devideId, text: displayName, disabled : disabled })
					}

					NotificationService.updateVoipCallMenu({
						speakerOptions: speakerOptions
					})
					NotificationService.addVoipCallMenuListeners({
						speaker: self.setActiveSpeaker
					})
				} 

				self.audioinputDevices = [...audioinputDevices];
				self.speakerDevices = [...speakerDevices];
			}).catch((e) => {
				console.error("Error enumerating devices", e);
			});
		}

		/**
		  * Save the active input audio divice ID on the local storage 
		  * @param {string} audioInputID 
		 */
		this.setActiveAudioInput = (audioInputID) => {
			LocalStorageService.set(self.activeAudioInputKey, audioInputID)	
		}

		/**
		  * Save the active speaker divice ID on the local storage
		  * @param {string} speakerID 
		  */
		this.setActiveSpeaker = (speakerID) => {
			LocalStorageService.set(self.activeSpeakerKey, speakerID)
		}

		/**
		  * Get the audio input device id setted as active 
		  * @returns {string} The device ID
		  */
		this.getActiveAudioInput = () => {
			const activeAudioInput = LocalStorageService.get(self.activeAudioInputKey)

			if (activeAudioInput === null) {
				return 'default'
			}

			return activeAudioInput.replace("input-", "")
		}

		/**
		  * Get the audio output device id setted as active
		  * @returns {string}  The device ID
		  */
		this.getActiveSpeaker = () => {
			const  activeSpeaker = LocalStorageService.get(self.activeSpeakerKey)

			if (activeSpeaker === null) {
				return 'default'
			}

			return activeSpeaker.replace("output-", "")
		}

		return this
	}
	return new VoipService()
})