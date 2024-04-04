define([
  'jquery',
  'underscore',
  'lib/components/base/modal'
], function ($, _, Modal) {

  var CustomWidget = function () {

    /*------------------------------------
      WIDGET INFORMATION
    ------------------------------------*/

    var version = 'v6.63'
    console.log(`version: ${version}`)
    var self = this

    /**
     * TEST 
     * https://connectors4.black.digitum.com.mx/amocrm/widget/install
     * Callpicker
     * Lab VoIP
     * CP.CU.22224021.0e
     * 326adfb76fee972d9fe3d6def2b50f4a
     */

    /*------------------------------------
    WIDGET GENERAL CONSTANTS
    ------------------------------------*/

    self.CP_WIDGET_HOST = 'https://connectors4.black.digitum.com.mx/amocrm/widget'
    self.CP_WIDGET_TYPE = 'click_to_call'
    self.MODAL_HTML = '<span class="modal-body__close"><span class="icon icon-modal-close"></span></span>'

    self.WIDGET_CP = {
      API_HOST: "https://black.digitum.com.mx/eduardo/callpicker_api/develop",
      API_SCOPE: "calls",
      CODES: {
        SUCCESS: 200,
      },
      CONNECTORS_PROPS: {
        KOMMO_CODE: 'kommo_code',
        KOMMO_CONFIGURATION: 'kommo_configuration'
      },
      CONFIGURATIONS_CODES: {
        PAYLOAD: 'payload',
        DESTINATIONS: 'destinations',
        EXTENSION: 'Extension',
        TRUNKS: 'telephone_numbers'
      }
    }

    self.CP_WIDGET_PARAMS = {
      "ctc_trunk": "null",
      "ctc_ttl": "1",
      "ctc_period": "1",
      "ctc_random": "0"
    }

    /*------------------------------------
      WIDGET DICTIONARIES
    ------------------------------------*/

    self.WIDGET_FIELDS = {
      CP_CLIENT_ID: 'cp_client_id',
      CP_CLIENT_SECRET: 'cp_client_secret',
      CP_USERS_EXTENSIONS: 'cp_kommousers_extensions',
      CP_WIDGET_SETTINGS: 'cp_widget_settings',
      CP_CTC_TRUNK: 'ctc_trunk',
      CP_CTC_TTL: 'ctc_ttl',
      CP_CTC_PERIOD: 'ctc_period',
      CP_CTC_RANDOM: 'ctc_random'
    }

    self.WIDGET_I18N = {
      SETTINGS: 'settings',
      CP_CODES: 'callpickerCodes',
      CP_MESSAGES: 'callpickerMessages',
    }

    self.WIDGET_TWIGS = {
      CP_WIDGET_RESPONSES: 'cp_widget_responses',
      CP_WIDGET_SETTINGS: 'cp_widget_settings'
    }

    self.WIDGET_CP_ENDPOINTS = {
      INSTALL: self.CP_WIDGET_HOST + '/install',
      CONFIGURATION: self.CP_WIDGET_HOST + '/configuration',
      CLICK_TO_CALL: self.CP_WIDGET_HOST + '/click_to_call',
    }

    self.WIDGET_STATUS = {
      INSTALL: 'install',
      INSTALLED: 'installed',
    }

    self.WIDGET_DOM_IDs = {
      RESPONSES_MESSAGE: '#cpResponsesMessage'
    }

    self.WIDGET_DOM_CLASSES = {
      RESPONSES_MESSAGE: 'cp-responses-message'
    }

    /*------------------------------------
      START: WIDGET GENERAL METHODS
    ------------------------------------*/

    /**
     * getTemplate: Allow to render a twig template
     * 
     * @param template - Template Name
     * @param callback - Function before render
     */
    self.getTemplate = function (template, callback) {
      template = template || '';

      return this.render({
        href: '/templates/' + template + '.twig',
        base_path: this.params.path, // the widget will return to the object /widgets/#WIDGET_NAME#
        load: callback // call a callback function
      }, {}); // parameters for the template
    }

    /**
     * getCallpickerCode
     *  
     * Get error message based on a code
     * 
     */
    self.getCallpickerCode = function (code) {
      const cpCodes = self.i18n(self.WIDGET_I18N.CP_CODES)
      return cpCodes[code] ?? cpCodes['cp_unexpected_error']
    }

    /**
     * getCallpickerMessages
     *  
     * Get message based on a message code
     * 
     */
    self.getCallpickerMessages = function (messageCode) {
      const cpMessages = self.i18n(self.WIDGET_I18N.CP_MESSAGES)
      return cpMessages[messageCode]
    }


    /**
     * getCTCValues
     * 
     * Get Click-To-Call params values
     * 
     * params:
     *  - Preferred trunk
     *  - TTL
     *  - Period
     *  - Random Caller ID
     * 
     */
    self.getCTCValues = function () {
      const ctcValues = $('input[name="' +
        self.WIDGET_FIELDS.CP_WIDGET_SETTINGS + '"]')
        .val()

      if (ctcValues !== '') {
        return JSON.parse(ctcValues)
      } else {
        return self.CP_WIDGET_PARAMS
      }
    }

    /**
     * Modal Warning Builder
     * 
     * Template for Warning Modal
     * 
     * @param {*} message : Modal message
     * @returns 
     */
    self.modalWarningBuilder = function (message) {
      return `
          <div>
            <div style="font-size: 20px;font-weight: bold;">
              <h1>⚠️ ¡Atención!</h1>
            </div>
            <div style="padding: 10px 10px 0 10px;">
              <p>${message}</p>
            </div>
          </div>
      `
    }

    /**
     * Modal Error Builder
     * 
     * Template for Warning Modal
     * 
     * @param {*} message 
     * @returns 
     */
    self.modalErrorBuilder = function (message) {
      return `
          <div>
            <div style="font-size: 20px;font-weight: bold;">
              <h1>❌ ¡Error!</h1>
            </div>
            <div style="padding: 10px 10px 0 10px;">
              <p>${message}</p>
            </div>
          </div>
      `
    }

    /**
     * searchUserCallpickerExtension
     * 
     * Find the configured extension of the Kommo user
     * 
     * @param {*} userID Kommo user ID
     * @returns 
     */
    self.searchUserCallpickerExtension = function (
      userID
    ) {
      const extensions = JSON.parse(self.params.cp_kommousers_extensions)
      const userExtension = extensions[userID]

      if (userExtension === "") {
        return false
      } else {
        return userExtension
      }
    }


    /**
     * lockCallpickerKeyFields: Lock Callpicker Valid Keys
     * 
     * For a better interface visualization, the callpicker
     * keys fields are locked.
     * 
     * Should be executed once the authorization 
     * has been validated.
     */
    self.lockCallpickerKeyFields = function () {

      const readonlyCSS = {
        'background-color': '#f0f0f0',
        'color': '#666666',
        'border': '1px solid #cccccc',
        'cursor': 'not-allowed'
      }

      const successSpan = $('<span> ✅</span>')

      const clientIDInput = $('input[name="' +
        self.WIDGET_FIELDS.CP_CLIENT_ID + '"]')

      const secretIDInput = $('input[name="' +
        self.WIDGET_FIELDS.CP_CLIENT_SECRET + '"]')

      clientIDInput.after(successSpan.clone())
      secretIDInput.after(successSpan.clone())
      clientIDInput.prop('readonly', true)
      secretIDInput.prop('readonly', true)
      clientIDInput.css(readonlyCSS)
      secretIDInput.css(readonlyCSS)


    }


    /**
     * setTitleUserExtensions: Change title format for
     * user extensions input/s
     */
    self.setSettingsFormats = function () {


      var titleWidgetSettingsHTML = `
          <hr/>
          <strong style="
              font-size: 1.6rem;
              font-weight: bold;
          ">⚙️ Configuraciones Click-To-Call</strong>
          <div>
            <span class="cp-ctc-settings-error hidden" style="color: red">Necesitas </span>
          </div>
        `

      const usersExtensionsContainer = $('input[name^="' +
        self.WIDGET_FIELDS.CP_USERS_EXTENSIONS + '["]')
        .closest('.widget_settings_block__item_field')


      const titleContainer = usersExtensionsContainer
        .find('.widget_settings_block__title_field')
        .first()

      const settingsCodes = self.i18n(self.WIDGET_I18N.SETTINGS)

      const splitTitleSubtitle = settingsCodes[self.WIDGET_FIELDS.CP_USERS_EXTENSIONS]
        .split(":")

      var titleUserExtensionsHTML = `
          <label for="nombre" class="cp-ctc-input-label" style="margin-top: 15px;">
              <span class="cp-ctc-input-title">${splitTitleSubtitle[0]}</span>
              <span class="cp-ctc-input-subtitle">
                  ${splitTitleSubtitle[1]}
              </span>
          </label>
        `

      usersExtensionsContainer.css('margin-top', '15px')
      usersExtensionsContainer.before(titleWidgetSettingsHTML)
      titleContainer.html(titleUserExtensionsHTML)
    }

    /*------------------------------------
      WIDGET MODALS/NOTIFICATIONS
    ------------------------------------*/

    /**
     * showWarningModal
     * 
     * Shows a message alert, when an extension ID does not match
     * with the availables
     */
    self.showWarningModal = function (messageCode) {

      const message = self.getCallpickerMessages(messageCode)
      const modalData = self.modalWarningBuilder(message)

      self.renderBasicModal(modalData)
    }

    /**
     * showErrorClickToCall
     * 
     * Shows a message alert, when an extension ID does not match
     * with the availables
     */
    self.showErrorModal = function (messageCode) {

      const message = self.getCallpickerMessages(messageCode)
      const modalData = self.modalErrorBuilder(message)

      self.renderBasicModal(modalData)
    }

    /**
     * outgoingCallNotification
     * 
     * Show toast of outgoing notification
     * @param {*} number 
     */
    self.outgoingCallNotification = function (number) {

      const title = self.getCallpickerMessages('ctc_notification_header')
      const body = self.getCallpickerMessages('ctc_notification_body')

      var notification = {
        text: {
          header: title,
          text: `${body} ${number}`
        },
        type: "call"
      };
      APP.notifications.show_notification(notification);
    }

    /*------------------------------------
      WIDGET HANDLERS
    ------------------------------------*/

    /**
     * showResponsesSpinner: Handler for show/hide repsonses spinner 
     */
    self.showResponsesSpinner = function () {
      $(this.WIDGET_DOM_IDs.RESPONSES_MESSAGE).addClass('cp-spinner');
    }

    /**
     * hideResponsesSpinner: Handler for show/hide repsonses spinner 
     */
    self.hideResponsesSpinner = function () {
      $(this.WIDGET_DOM_IDs.RESPONSES_MESSAGE).removeClass('cp-spinner');
    }

    /**
     * handlerToggleExtensionsCallpicker: Hide User Extensions,
     * when widget has not been installed,
     * some configurations are hidden,
     * until the user authenticates
     * 
     * @param show - Boolean for show or hide 
     */
    self.handlerToggleExtensionsCallpicker = function (show) {

      if (show) {
        $('input[name^="' +
          self.WIDGET_FIELDS.CP_USERS_EXTENSIONS +
          '"]')
          .closest('.widget_settings_block__item_field')
          .show()
      } else {
        $('input[name^="' +
          self.WIDGET_FIELDS.CP_USERS_EXTENSIONS +
          '"]')
          .closest('.widget_settings_block__item_field')
          .hide()
      }
    }

    /*------------------------------------
      WIDGET RENDERS
    ------------------------------------*/

    /**
     * Callpicker Widget Responses Container
     */
    self.renderWidgetResponses = function () {
      self.getTemplate(
        self.WIDGET_TWIGS.CP_WIDGET_RESPONSES,
        function (template) {
          const container = $('input[name="' +
            self.WIDGET_FIELDS.CP_CLIENT_SECRET + '"]')
            .closest('.widget_settings_block__item_field')

          container.append(
            template.render()
          )
        }
      )
    }

    /**
     * Render Kommo Modal
     */
    self.renderBasicModal = function (modalData) {
      new Modal({
        class_name: 'modal-window',
        init: function ($modal_body) {
          var $this = $(this);
          $modal_body
            .trigger('modal:loaded') // launches a modal window
            .html(modalData)
            .trigger('modal:centrify')  // configures the modal window
            .append(self.MODAL_HTML);
        },
        destroy: function () {
        }
      });
    }

    /**
     * Callpicker Render Click-To-Call Settings
     */
    self.renderWidgetSettings = function (configuration) {
 
      // Get available trunks from configuration response
      const trunksOptions = configuration[
        self.WIDGET_CP.CONFIGURATIONS_CODES.PAYLOAD][
        self.WIDGET_CP.CONFIGURATIONS_CODES.TRUNKS
      ]

      // Get available extensions from configuration response
      const extensionsOptions = configuration[
        self.WIDGET_CP.CONFIGURATIONS_CODES.PAYLOAD][
        self.WIDGET_CP.CONFIGURATIONS_CODES.DESTINATIONS][
        self.WIDGET_CP.CONFIGURATIONS_CODES.EXTENSION
      ]

      // Render Click-to-call Settings Template
      self.getTemplate(
        self.WIDGET_TWIGS.CP_WIDGET_SETTINGS,
        function (template) {
          const container = $('input[name="' +
            self.WIDGET_FIELDS.CP_WIDGET_SETTINGS + '"]')
            .closest('.widget_settings_block__item_field')


          const ctcValues = self.getCTCValues()

          container.show()
          container.append(
            template.render({
              trunksOptions: trunksOptions,
              extensionsOptions: extensionsOptions,
              selectedTrunk: ctcValues[self.WIDGET_FIELDS.CP_CTC_TRUNK],
              ttlValue: ctcValues[self.WIDGET_FIELDS.CP_CTC_TTL],
              periodValue: ctcValues[self.WIDGET_FIELDS.CP_CTC_PERIOD],
              randomValue: ctcValues[self.WIDGET_FIELDS.CP_CTC_RANDOM]
            })
          )

          // Listener event-click for toggle (view) available extensions
          $(".cp-ext-tab-toggle").click(function () {
            $(".cp-ext-tab-content").toggleClass("cp-ext-show");
          })

          // Listener event-click for toggle (view) special configurations
          $(".cp-ctc-tab-toggle").click(function () {
            $(".cp-ctc-tab-content").toggleClass("cp-ctc-show");
          })

          // Event listener for inputs
          $('.cp-ctc-tab-content input').on('input', function () {

            // input props
            const inputName = $(this).attr('name');
            let inputValue = $(this).val();

            // ctc actual values
            let ctcValues = self.getCTCValues()

            if (inputValue <= 0) {
              if (inputName === self.WIDGET_FIELDS.CP_CTC_RANDOM) {
                inputValue = 0
              } else {
                inputValue = 1
              }
            }

            if (inputName == self.WIDGET_FIELDS.CP_CTC_TTL && inputValue > 5) {
              inputValue = 5
            }

            if (inputName == self.WIDGET_FIELDS.CP_CTC_PERIOD && inputValue > 10) {
              inputValue = 10
            }

            if (inputName == self.WIDGET_FIELDS.CP_CTC_RANDOM && inputValue > 2) {
              inputValue = 2
            }

            $(this).val(inputValue)
            ctcValues[inputName] = inputValue.toString()

            $('input[name="' +
              self.WIDGET_FIELDS.CP_WIDGET_SETTINGS + '"]')
              .val(JSON.stringify(ctcValues))
            $('input[name="' +
              self.WIDGET_FIELDS.CP_WIDGET_SETTINGS + '"]')
              .trigger('change')

            $(this).blur()

          })

          $('input[name="ctc_trunk"]').change(function () {
            // Obtener el valor del radio button seleccionado
            const inputName = $(this).attr('name');
            const selectedTrunk = $(this).val();

            const ctcValues = self.getCTCValues()

            ctcValues[inputName] = selectedTrunk

            $('input[name="' +
              self.WIDGET_FIELDS.CP_WIDGET_SETTINGS + '"]')
              .trigger('change')
            $('input[name="' +
              self.WIDGET_FIELDS.CP_WIDGET_SETTINGS + '"]')
              .val(JSON.stringify(ctcValues))
          });

          $('input[name^="' +
            self.WIDGET_FIELDS.CP_USERS_EXTENSIONS + '["]')
            .on('focusout', function () {
              const valorIngresado = $(this).val().trim()

              const resultFound = extensionsOptions.some(function (ext) {
                return ext.id === valorIngresado
              })

              if (!resultFound) {

                self.showWarningModal('extensions_id_not_match')

              } else {
                $(this).removeClass('cp-ctc-ext-warn');
                $(this).next('.cp-ctc-ext-warn-msg').remove();
              }
            })
        }
      )
    }

    /*------------------------------------
      WIDGET PROMISES / SERVICES
    ------------------------------------*/

    /**
     * Widget Installation Service
     * 
     * Call the Callpicker service 
     * of installing and authorizing the widget. 
     * 
     * @returns Promise
     */
    self.installationService = function () {
      return new Promise(function (resolve, reject) {
        try {
          self.crm_post(
            self.WIDGET_CP_ENDPOINTS.INSTALL,
            {
              cp_client_id: $('input[name="' +
                self.WIDGET_FIELDS.CP_CLIENT_ID +
                '"]')
                .val(),
              cp_client_secret: $('input[name="' +
                self.WIDGET_FIELDS.CP_CLIENT_SECRET +
                '"]')
                .val(),
              kommo_app_id: self.params.oauth_client_uuid,
              kommo_app_secret: $('.js-secret').text().trim(),
              kommo_auth_code: $('[title^="def50200"]').text().trim(),
              kommo_subdomain: self.system().subdomain,
              kommo_redirect_uri: self.WIDGET_CP_ENDPOINTS.INSTALL,
              cp_api_host: self.WIDGET_CP.API_HOST,
              cp_api_scope: self.WIDGET_CP.API_SCOPE,
              kommo_widget_type: self.CP_WIDGET_TYPE
            },
            function (response) {

              const kommoCode = response[
                self.WIDGET_CP.CONNECTORS_PROPS.KOMMO_CODE
              ]

              const configurationResult = response[
                self.WIDGET_CP.CONNECTORS_PROPS.KOMMO_CONFIGURATION
              ]

              const message = self.getCallpickerMessages(
                kommoCode
              )

              if (response.code == self.WIDGET_CP.CODES.SUCCESS) {
                resolve(
                  {
                    success: true,
                    message: message,
                    configuration: configurationResult
                  }
                )
              } else {
                resolve(
                  {
                    success: false,
                    message: message
                  }
                )
              }
            },
            'json'
          )
        } catch (error) {

          const message = self.getCallpickerCode(
            'cp_unexpected_error'
          )

          console.error('Callpicker VOIP: ', error)

          resolve(
            {
              success: false,
              message: message
            }
          )
        }
      });
    }

    /**
     * Widget Configuration Service 
     * 
     * Call the Callpicker service 
     * of getting the widget configuration
     * 
     * @returns Promise
     */
    self.configurationService = function () {
      return new Promise(function (resolve, reject) {
        self.crm_post(
          self.WIDGET_CP_ENDPOINTS.CONFIGURATION,
          {
            cp_client_id: $('input[name="' +
              self.WIDGET_FIELDS.CP_CLIENT_ID +
              '"]')
              .val(),
            kommo_app_id: self.params.oauth_client_uuid,
            cp_api_host: self.WIDGET_CP.API_HOST,
            kommo_widget_type: self.CP_WIDGET_TYPE
          },
          function (response) {

            configurationResult = response[
              self.WIDGET_CP.CONNECTORS_PROPS.KOMMO_CONFIGURATION
            ]

            if (response.code == self.WIDGET_CP.CODES.SUCCESS) {
              resolve({
                success: true,
                configuration: configurationResult
              })
            } else {

              const kommoCode = response[
                self.WIDGET_CP.CONNECTORS_PROPS.KOMMO_CODE
              ]

              const message = self.getCallpickerCode(
                kommoCode
              )

              self.showErrorModal(message)
              console.error(response)

              resolve({
                success: false
              })
            }
          },
          'json',
          function (error) {
            console.error('Callpicker VOIP: ', error)

            resolve(false)
          }
        )
      });
    }

    /**
     * Click to Call Service
     * 
     * Call the Callpicker Service
     * to do a click-to-call 
     * 
     * @param {*} cpExtensionID 
     * @param {*} phoneToDial 
     * @returns 
     */
    self.clickToCallService = function (
      cpExtensionID,
      phoneToDial
    ) {
      return new Promise(function (resolve, reject) {

        let ctcParams = {}

        try {
          ctcParams = JSON.parse(self.params.cp_widget_settings)
        } catch {
          ctcParams = self.params.cp_widget_settings
        }

        const payload = {
          cp_client_id: self.params.cp_client_id,
          cp_extension_id: cpExtensionID,
          phone_to_dial: phoneToDial,
          cp_api_host: self.WIDGET_CP.API_HOST,
          ttl: ctcParams.ctc_ttl,
          random_caller_id: ctcParams.ctc_random,
          period: ctcParams.ctc_period
        }


        if (ctcParams.ctc_trunk !== 'null') {
          payload.preferred_trunk = ctcParams.ctc_trunk
        }

        self.crm_post(
          self.WIDGET_CP_ENDPOINTS.CLICK_TO_CALL,
          payload,
          function (response) {

            if (response.code
              ==
              self.WIDGET_CP.CODES.SUCCESS) {
              resolve(true)
            } else {

              console.error(response)

              resolve(false)
            }
          },
          'json',
          function (error) {
            console.error('Callpicker VOIP: ', error)

            resolve(false)
          }
        )
      })
    }


    /*------------------------------------
      WIDGET ASYNC METHODS 
    ------------------------------------*/

    /**
    * Callpicker Authorization
    * 
    * Validate if callpicker keys are correct for 
    * integration
    * 
    * If success,
    * displays click-to-call configurations
    * 
    * If fails, 
    * it displays an error message 
    * 
    */
    self.widgetAuthorization = async function () {

      try {

        // Clean Error Message
        $(this.WIDGET_DOM_IDs.RESPONSES_MESSAGE).empty();

        // Loading Spinner
        self.showResponsesSpinner()

        // Execute Service 
        const resultInstallation = await self.installationService()

        if (resultInstallation.success) {

          // Show Success Installation Message
          self.lockCallpickerKeyFields()

          $(self.WIDGET_DOM_IDs.RESPONSES_MESSAGE)
            .text(resultInstallation.message)
          self.setSettingsFormats()
          self.handlerToggleExtensionsCallpicker(true)

          // Render Configuration Widget with Callpicker-Configuration Data
          self.renderWidgetSettings(resultInstallation.configuration)

          // Validate JSON from click-to-call
          // self.setClickToCallValues()

          // self.showWarningExtensionsRecommendation()
          self.showWarningModal('extensions_ids_recommendation')

        } else {
          // Error Logic
          $(self.WIDGET_DOM_IDs.RESPONSES_MESSAGE).text(resultInstallation.message)
        }

        // Remove Spinner
        self.hideResponsesSpinner()

        return resultInstallation.success

      } catch (error) {
        console.error('CP-Widget Error: ', error)
      }
    }

    /**
    * Callpicker Configuration
    * 
    * Get click-to-call widget configuration
    * 
    * If success,
    * displays click-to-call configurations
    * 
    * If fails, 
    * it displays an error message 
    * 
    */
    self.widgetConfiguration = async function () {

      try {
        // Clean Error Message
        $(this.WIDGET_DOM_IDs.RESPONSES_MESSAGE).empty();

        // Loading Spinner
        self.showResponsesSpinner()

        // Lock keys
        self.lockCallpickerKeyFields()


        // Execute Configuration Service
        //      Get Click-To-Call Configuration
        const resultConfiguration = await self.configurationService()

        if (resultConfiguration.success) {
          self.setSettingsFormats()
          self.handlerToggleExtensionsCallpicker(true)

          // Render Configuration Widget with Callpicker-Configuration Data
          self.renderWidgetSettings(resultConfiguration.configuration)

        } else {
          self.handlerToggleExtensionsCallpicker(false)
        }

        // Remove Spinner
        self.hideResponsesSpinner()

        return resultConfiguration.success

      } catch (error) {
        console.error('CP-Widget Error: ', error)
      }
    }

    /**
     * widgetClickToCall
     */

    /*------------------------------------
      WIDGET CALLBACKS 
    ------------------------------------*/

    this.callbacks = {
      render: function () {
        return true
      },
      init: function () {

        self.add_action('phone', async function (data) {

          const kommoUserID = self.system().amouser_id

          const extensionResult = self.searchUserCallpickerExtension(kommoUserID)

          if (extensionResult === false) {
            // self.showWarningExtensionsNotFound()
            self.showWarningModal('ctc_empty_extension')
            return
          }

          self.outgoingCallNotification(data.value)
          result = await self.clickToCallService(extensionResult, data.value)

          if (!result) {
            self.showErrorModal('ctc_unexpected_error')
          }
        })

        return true
      },
      bind_actions: function () {
        return true
      },
      settings: async function ($modal_body) {
        self.handlerToggleExtensionsCallpicker(false)
        self.renderWidgetResponses()

        if (self.params.status == self.WIDGET_STATUS.INSTALL) {
          $('input[name="' +
            self.WIDGET_FIELDS.CP_WIDGET_SETTINGS + '"]')
            .val(JSON.stringify(self.getCTCValues()))
        }

        if (self.params.status == self.WIDGET_STATUS.INSTALLED) {
          await self.widgetConfiguration()
        }

        return true
      },
      onSave: async function () {
        if (self.params.status === self.WIDGET_STATUS.INSTALL) {


          const resultAuthorization = await self.widgetAuthorization()

          return resultAuthorization
        }

        if (self.params.status === self.WIDGET_STATUS.INSTALLED) {
          return true
        }

        return false

      },
      destroy: function () {
      }
    }
    return this
  }
  return CustomWidget
})