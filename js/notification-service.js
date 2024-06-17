define([
    'jquery',
    'lib/components/base/modal',
    './general-service.js',
    './localstorage-service.js'
], function ($, Modal, GeneralService, LocalStorageService) {
	/**
	 * Service to handle modal creations
	 * 
	 * @class
	 */
	const NotificationService = function () {
        const self = this

        /**
          * It expects to be Widget context, it must be initialized with the service
          * @type {CustomWidget|null}
          */
        this.context = null

        /**
          * The incoming call modal that show on each call invite
          * @type {Modal}
          */
        this.incomingCallModal = {}

        /**
          * The ringtone source for the incoming calls
          * @type {string} 
          */
        this.incomingCallAudioFileURL = 'https://notificationsounds.com/storage/sounds/file-sounds-1212-call-me.mp3'

        /**
          * The audio ringer, this the object that plays and pauses the ringtone
          * @type {Audio}
          */
        this.rinnger = null

        /**
          * Init all required data 
          * @param {*} context 
          */
        this.init = (context) => {
            self.context = context
        }

        /**
          * Get a twig template to render
          * @param template - Template Name
          * @param callback - Function before render
          */
        self.getTemplate = (template, callback) => {
            template = template || '';
    
            return self.context.render({
                href: '/templates/' + template + '.twig',
                base_path: self.context.params.path, // the widget will return to the object /widgets/#WIDGET_NAME#
                load: callback // call a callback function
            }, {}); // parameters for the template
        }

        /**
          * Show a modal to handle answering or rejecting a call.
          * @param {string} callerID - The name or telephone number to show.
          * @returns {Promise<boolean>} A promise that resolves to true for answer or false for reject.
          */
        this.showIncomingCallModal = (callerID) => {
            let ringingTime = null

            return new Promise((resolve, reject) => {
                self.incomingCallModal = new Modal({
                    class_name: 'incoming-call-modal',
                    closeOnClickOutside: false,
                    init: ($modal_body) => {
                        const modalContent = `
                            <div class="modal-content" style="text-align: center">
                                <h2>${self.context.getCallpickerCode('voip_inbound_call_label')}</h2>
                                <p>${callerID}</p>
                                <p class="ringing-time">00:00</p>
                                
                                <button class="btn btn-reject" style="background: #fe2a1d; color:#fff; padding: 0.5rem 1rem; font-weight:600; border-radius: 5px; margin-right 1rem; margin-top: 1rem; display: inline-flex; align-items: center; margin-right: 1rem;">
                                    <svg height="20" fill="#ffffff" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 348.077 348.077" xml:space="preserve" stroke="#ffffff" transform="rotate(135)" style="margin-right: 8px"><g stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M340.273,275.083l-53.755-53.761c-10.707-10.664-28.438-10.34-39.518,0.744l-27.082,27.076 c-1.711-0.943-3.482-1.928-5.344-2.973c-17.102-9.476-40.509-22.464-65.14-47.113c-24.704-24.701-37.704-48.144-47.209-65.257 c-1.003-1.813-1.964-3.561-2.913-5.221l18.176-18.149l8.936-8.947c11.097-11.1,11.403-28.826,0.721-39.521L73.39,8.194 C62.708-2.486,44.969-2.162,33.872,8.938l-15.15,15.237l0.414,0.411c-5.08,6.482-9.325,13.958-12.484,22.02 C3.74,54.28,1.927,61.603,1.098,68.941C-6,127.785,20.89,181.564,93.866,254.541c100.875,100.868,182.167,93.248,185.674,92.876 c7.638-0.913,14.958-2.738,22.397-5.627c7.992-3.122,15.463-7.361,21.941-12.43l0.331,0.294l15.348-15.029 C350.631,303.527,350.95,285.795,340.273,275.083z"></path> </g> </g> </g> </g></svg>
                                    ${self.context.getCallpickerCode('voip_reject_call_label')}
                                </button>
                                <button class="btn btn-accept" style="background: #31c858; color:#fff; padding: 0.5rem 1rem; font-weight:600; border-radius: 5px; margin-right 1rem; margin-top: 1rem; display: inline-flex; align-items: center">
                                    <svg height="20" fill="#ffffff" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 348.077 348.077" xml:space="preserve" stroke="#ffffff" style="margin-right: 8px"><g stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M340.273,275.083l-53.755-53.761c-10.707-10.664-28.438-10.34-39.518,0.744l-27.082,27.076 c-1.711-0.943-3.482-1.928-5.344-2.973c-17.102-9.476-40.509-22.464-65.14-47.113c-24.704-24.701-37.704-48.144-47.209-65.257 c-1.003-1.813-1.964-3.561-2.913-5.221l18.176-18.149l8.936-8.947c11.097-11.1,11.403-28.826,0.721-39.521L73.39,8.194 C62.708-2.486,44.969-2.162,33.872,8.938l-15.15,15.237l0.414,0.411c-5.08,6.482-9.325,13.958-12.484,22.02 C3.74,54.28,1.927,61.603,1.098,68.941C-6,127.785,20.89,181.564,93.866,254.541c100.875,100.868,182.167,93.248,185.674,92.876 c7.638-0.913,14.958-2.738,22.397-5.627c7.992-3.122,15.463-7.361,21.941-12.43l0.331,0.294l15.348-15.029 C350.631,303.527,350.95,285.795,340.273,275.083z"></path> </g> </g> </g> </g></svg>
                                    ${self.context.getCallpickerCode('voip_accept_call_label')}
                                </button>
                            </div>
                        `
                        $modal_body
                            .trigger('modal:loaded') 
                            .html(modalContent)
                            .trigger('modal:centrify');

                        // Bind actions to the buttons
                        $modal_body.find('.btn-accept').on('click', () => {
                            self.incomingCallModal.destroy()
                            resolve()
                        });

                        $modal_body.find('.btn-reject').on('click', () => {
                            self.incomingCallModal.destroy()
                            reject()
                        });

                        // Updatae ringing time
                        const startTime = new Date()
                        ringingTime = window.setInterval(() => {
                            const now = new Date()
                            const duration = (now - startTime) / 1000 // duration in seconds

                            const timeStr = GeneralService.formatDuration(duration)
                            $modal_body.find('.ringing-time').html(timeStr)
                        })

                        // Play incoming call ringtone 
                        self.playIncomingCallAudio()

                        // Define the notification title and options
                        const title = self.context.getCallpickerCode('voip_inbound_call_label')
                        const options = {
                            body: self.context.getCallpickerCode('voip_inbound_call_description') + callerID,
                            icon: self.context.params.path + '/files/phone.jpg'
                        };

                        // Request permission and show the browser notification
                        if (Notification.permission === 'granted') {
                            self.showBrowserNotification(title, options);
                        } else {
                            Notification.requestPermission().then(permission => {
                                if (permission === 'granted') {
                                    self.showBrowserNotification(title, options);
                                }
                            });
                        }

                    },
                    destroy: () => {
                        window.clearInterval(ringingTime)
                        self.stopIncomingCallAudio()
                    }
                });
            });
        }

        /**
          * Render the HTML for VOIP call menu
          * The VOIP call menu is where the call details will be put 
          */
        this.initVoipCallMenu = () => {
            return new Promise((resolve, reject) => {
                self.getTemplate('cp_widget_voip_call_menu', template => {
                    const container = $('body')
                    container.append(template.render({
                        doNotDisturbEnabled: LocalStorageService.get('do-not-disturb') === 'enabled'
                    }))
    
                    $('.voip__call-menu .voip__call-settings-btn').on('click', () => {
                        $('.voip__call-menu .voip__call-settings-options').toggle()
                    })
                    self.addVoipCallMenuListeners({doNotDisturb: true})
                    resolve(true)
                })
            })
        }

        /**
          * Updates the VoIP Call menu with the given data
          * @param {Object} data 
          * @param {string|null} data.callType Spects to be the call direction (inbound or outbund)
          * @param {string|null} data.callerId Spects to be the caller ID to show on the menu
          * @param {string|null} data.talkTime Spects to be a formmated time like 00:00
         */
        this.updateVoipCallMenu = data => {
            const updateSelect = (select, options, type = 'input') => {
                select.empty()
                $.each(options, (index, option) => {
                    const newOption = new Option(option.text, option.value)
                    if (option.disabled) {
                        newOption.disabled = true
                    }
                    select.append(newOption)
                });

                let active = null
                if (type == 'output') {
                    active = LocalStorageService.get('active-speaker')
                } else {
                    active = LocalStorageService.get('active-audio-input')
                }
                if (active !== null) {
                    select.val(active)
                } else {
                    select.val(type + '-default')
                }
            }
            
            if (data.hasOwnProperty('callType')) {
                if (data.callType == 'inbound') {
                    $('.voip__call-menu .voip__call-status .voip__call-type').html(
                        self.context.getCallpickerCode('voip_inbound_call_label')
                    )
                }
            }

            if (data.hasOwnProperty('callerId')) {
                $('.voip__call-menu .voip__call-status .voip__call-caller-id').html(data.callerId)
            }

            if (data.hasOwnProperty('talkTime')) {
                $('.voip__call-menu .voip__call-options .voip__talk-time').html(data.talkTime)
            }

            if (data.hasOwnProperty('audioinputOptions')) {
                const select = $('.voip__call-menu .voip__call-settings-options .voip__mic-setting')
                updateSelect(select, data.audioinputOptions)
            }

            if (data.hasOwnProperty('speakerOptions')) {
                const select = $('.voip__call-menu .voip__call-settings-options .voip__speaker-setting')
                updateSelect(select, data.speakerOptions, 'output');
            }
        }

        /**
          * Shows the VoIP call menu in the UI
          */
        this.showVoipCallMenu = () => {
            $('.voip__call-menu').show()
            $('.voip__call-menu .voip__call-options').show()
            $('.voip__call-menu .voip__call-settings-options').hide()
            $('.voip__call-menu .voip__call-settings').hide()
        }

        /**
          * Hides de VoIP call menu from the UI
          */
        this.hideVoipCallMenu = () => {
            $('.voip__call-menu').hide()
            $('.voip__call-menu .voip__call-options').hide()
            $('.voip__call-menu .voip__call-settings-options').hide()
            $('.voip__call-menu .voip__call-settings').show()
        }

        /**
          * Shows or hide the VoIP call menu in the UI
          */
        this.toggleVoipCallMenu = () => {
            $('.voip__call-menu').toggle()
        }

        /**
          *  Binds the callback listener to the action buttons in the VoIP call menu
          * @param {object} callbacks The callbacks for every action button
          * @param {callback} callbacks.mute The callback for mute action button
          * @param {callback} callbacks.hangup The callback for hang-up action button
          * TODO: Update this docs
          */
        this.addVoipCallMenuListeners = (callbacks) => {
            if (callbacks.hasOwnProperty('mute')) {
                const callback = () => {
                    $('.voip__call-menu .voip__call-options .voip__call-mute-btn').hide()
                    $('.voip__call-menu .voip__call-options .voip__call-unmute-btn').show()
                    callbacks.mute()
                }
                $(document).off('click', '.voip__call-menu .voip__call-options .voip__call-mute-btn', callback)
                $(document).on('click', '.voip__call-menu .voip__call-options .voip__call-mute-btn', callback)
            } 

            if (callbacks.hasOwnProperty('unMute')) {
                const callback = () => {
                    $('.voip__call-menu .voip__call-options .voip__call-unmute-btn').hide()
                    $('.voip__call-menu .voip__call-options .voip__call-mute-btn').show()
                    callbacks.unMute()
                }
                $(document).off('click', '.voip__call-menu .voip__call-options .voip__call-unmute-btn', callback)
                $(document).on('click', '.voip__call-menu .voip__call-options .voip__call-unmute-btn', callback)
            } 

            if (callbacks.hasOwnProperty('hangup')) {
                $(document).off('click', '.voip__call-menu .voip__call-options .voip__hangup-phone-btn', callbacks.hangup)
                $(document).on('click', '.voip__call-menu .voip__call-options .voip__hangup-phone-btn', callbacks.hangup)
            } 

            if (callbacks.hasOwnProperty('audioInput')) {
                const callback = (e) => {
                    const deviceId = $(e.target).val()
                    callbacks.audioInput(deviceId)
                }
                $(document).off('change', '.voip__call-menu .voip__call-settings-options .voip__mic-setting', callback)
                $(document).on('change', '.voip__call-menu .voip__call-settings-options .voip__mic-setting', callback)
            } 

            if (callbacks.hasOwnProperty('speaker')) {
                const callback = (e) => {
                    const deviceId = $(e.target).val()
                    callbacks.speaker(deviceId)
                }
                $(document).off('change', '.voip__call-menu .voip__call-settings-options .voip__speaker-setting', callback)
                $(document).on('change', '.voip__call-menu .voip__call-settings-options .voip__speaker-setting', callback)
            } 

            if (callbacks.hasOwnProperty('doNotDisturb')) {
                const callback = (e) => {
                    const state = $(e.target).is(':checked') ? 'enabled' : 'disabled'
                    LocalStorageService.set('do-not-disturb', state)
                }
                $(document).off('change', '.voip__call-menu #voip__do-not-disturb', callback)
                $(document).on('change', '.voip__call-menu #voip__do-not-disturb', callback)
            }
        }   

        /**
          * Clears the VoIP call menu UI 
          */
        this.resetVoipCallMenu = () => {
            $('.voip__call-menu .voip__call-status .voip__call-caller-id').html('')
            $('.voip__call-menu .voip__call-options .voip__talk-time').html('00:00')
            $('.voip__call-menu .voip__call-status .voip__call-type').html('')
            $('.voip__call-menu .voip__call-options').hide()
            $('.voip__call-menu .voip__call-remote-audio').html('')
        }

        /**
          * Plays an audio for an incomming call
          */
        this.playIncomingCallAudio = () => {
            const rinnger = new Audio(self.incomingCallAudioFileURL);
            rinnger.preload = "auto";
            rinnger.loop = true;
            rinnger.play().then(() => {
                console.log('Ringing')
            }).catch((e) => {
                console.warn("Unable to play ringtone", e);
            }); 

            self.rinnger = rinnger
        }

        /**
          * Pauses and clears the incoming audio call
          */
        this.stopIncomingCallAudio = () => {
           self.rinnger.pause();
           self.rinnger.removeAttribute('src');
           self.rinnger.load();

           self.rinnger = null
        }

        /**
          * Launch a borwser notification (desktop)
          * @param {string} title 
          * @param {object} options 
          * @param {string} options.description 
          * @param {string} options.icon
          * @returns 
          */
        this.showBrowserNotification = (title, options) => {
            if (Notification.permission !== 'granted') {
                return
            } 

            const notification = new Notification(title, options)

            notification.onclick = () => {
                window.focus()
                notification.close()
            };
        }

        /**
          * Add and audio tag on the DOM to handle the remoteAudio  
          */
        this.addIncomingCallAudioTag = () => {
            html = '<audio id="remoteAudio"></audio>'
            $('.voip__call-menu .voip__call-remote-audio').html(html)
        }

		return this
	}
	return new NotificationService()
})