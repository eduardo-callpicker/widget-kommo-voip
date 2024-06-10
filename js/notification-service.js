define(['jquery', 'lib/components/base/modal'], function ($, Modal) {
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
          * Init all required data 
          * @param {*} context 
          */
        this.init = (context) => {
            self.context = context
            self.initVoipCallMenu()
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
            return new Promise((resolve, reject) => {
                const modal = new Modal({
                    class_name: 'incoming-call-modal',
                    init: function ($modal_body) {
                        const $this = $(this)
                        const modalContent = `
                            <div class="modal-content">
                                <h2>${self.context.getCallpickerCode('voip_inbound_call_label')}</h2>
                                <p>${callerID}</p>
                                <button class="btn btn-accept">Accept</button>
                                <button class="btn btn-reject">Reject</button>
                            </div>
                        `
                        $modal_body
                            .trigger('modal:loaded') 
                            .html(modalContent)
                            .trigger('modal:centrify')
                            .append('<span class="modal-body__close"><span class="icon icon-modal-close"></span></span>');

                        // Bind actions to the buttons
                        $modal_body.find('.btn-accept').on('click', function () {
                            modal.destroy()
                            resolve(true)
                        });

                        $modal_body.find('.btn-reject').on('click', function () {
                            modal.destroy()
                            resolve(false)
                        });
                    },
                    destroy: function () {
                        // Cleanup if necessary
                    }
                });
            });
        }

        /**
          * Render the HTML for VOIP call menu
          * The VOIP call menu is where the call details will be put 
          */
        this.initVoipCallMenu = () => {
            self.getTemplate('cp_widget_voip_call_menu', template => {
                const container = $('#page_holder')

                container.append(template.render())
            })
        }

        this.updateVoipCallMenu = data => {
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
        }

        this.showVoipCallMenu = () => {
            $('.voip__call-menu').show()
        }

        this.hideVoipCallMenu = () => {
            $('.voip__call-menu').hide()
        }

        this.toggleVoipCallMenu = () => {
            $('.voip__call-menu').toggle()
        }

        this.addVoipCallMenuListeners = (callbacks) => {
            if (callbacks.hasOwnProperty('mute')) {
                $(document).off('click', '.voip__call-menu .voip__call-options .voip__call-mute-btn', callbacks.mute)
                $(document).on('click', '.voip__call-menu .voip__call-options .voip__call-mute-btn', callbacks.mute)
            } 

            if (callbacks.hasOwnProperty('hangup')) {
                $(document).off('click', '.voip__call-menu .voip__call-options .voip__hangup-phone-btn', callbacks.hangup)
                $(document).on('click', '.voip__call-menu .voip__call-options .voip__hangup-phone-btn', callbacks.hangup)
            } 
        }   

        this.resetVoipCallMenu = () => {
            $('.voip__call-menu .voip__call-status .voip__call-caller-id').html('')
            $('.voip__call-menu .voip__call-options .voip__talk-time').html('00:00')
            $('.voip__call-menu .voip__call-status .voip__call-type').html('')
        }

		return this
	}
	return new NotificationService()
})