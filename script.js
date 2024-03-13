define([
    'jquery',
    'underscore',
], function ($, _) {

    var CustomWidget = function () {

        /**
         * TO-DO:
         * - Change CP_KOMMO_HOST to official
         * - Change CP_API_HOST to official 
         *  
         * */
        var version = 'v5.50'
        var self = this

        console.log('Callpicker VoIP Lab ' + version)

        // # TEST
        // CP.CU.22224021.0e
        // 326adfb76fee972d9fe3d6def2b50f4a
        // https://connectors4.black.digitum.com.mx/amocrm/widget/install
        self.CP_KOMMO_HOST = 'https://connectors4.black.digitum.com.mx/amocrm/widget'
        self.CP_KOMMO_ENDPOINTS = {
            INSTALL: `${self.CP_KOMMO_HOST}/install`,
            DESTINATIONS: `${self.CP_KOMMO_HOST}/destinations`,
            CLICK_TO_CALL: `${self.CP_KOMMO_HOST}/click_to_call`,
            UNINSTALL: `${self.CP_KOMMO_HOST}/uninstall`
        }

        self.CALLPICKER_DICTIONARY = {
            CP_API_HOST: `https://black.digitum.com.mx/eduardo/callpicker_api/develop/`,
            CP_API_SCOPE: "calls",
            INTEGRATION_STATUS: {
                INSTALL: 'install',
                INSTALLED: 'installed',
            },
            CP_FIELDS: {
                CLIENT_ID: 'cp_client_id',
                CLIENT_SECRET: 'cp_client_secret',
                ADVANCED_SETTINGS_FIELDS: {
                    USERS_EXTENSIONS: 'users_extensions'
                }
            },
            CP_CODES: {
                SUCCESSFUL: 200
            },
            CP_CLASSNAMES: {
                SUCCESS: 'success',
                ERROR: 'error'
            },
            CP_TWIG: {
                SPINNER: 'spinner'
            },
            CP_CONNECTORS_PROPS: {
                KOMMO_CODE: 'kommo_code'
            },
            CP_MESSAGES: {
                EXTENSIONS_INSTRUCTIONS: 'extensions_instructions'
            }
        }

        self.getCallpickerCode = function (code) {
            const callpickerCodes = self.i18n('callpickerCodes')
            return callpickerCodes[code] ?? callpickerCodes['unexpected_error']
        }

        self.getCallpickerMessage = function (message) {
            const callpickerCodes = self.i18n('callpickerCodes')
            return callpickerCodes[message] ?? '-'
        }

        self.getTemplate = function (template, callback) {
            // params = (typeof params == 'object') ? params : {};
            template = template || '';

            return this.render({
                href: '/templates/' + template + '.twig',
                base_path: this.params.path, // the widget will return to the object /widgets/#WIDGET_NAME#
                load: callback // call a callback function
            }, {}); // parameters for the template
        }

        self.lockCallpickerKeyFields = function () {
            const successSpan = $('<span> ✅</span>')

            const clientIDInput = $('input[name="' +
                self.CALLPICKER_DICTIONARY.CP_FIELDS.CLIENT_ID + '"]')

            const secretIDInput = $('input[name="' +
                self.CALLPICKER_DICTIONARY.CP_FIELDS.CLIENT_SECRET + '"]')



            clientIDInput.after(successSpan.clone())
            secretIDInput.after(successSpan.clone())
            clientIDInput.prop('readonly', true)
            secretIDInput.prop('readonly', true)
        }

        self.showCallpickerConfigurations = function (show) {
            if (show) {
                $('input[name^="' +
                    self.CALLPICKER_DICTIONARY.CP_FIELDS.ADVANCED_SETTINGS_FIELDS.USERS_EXTENSIONS +
                    '"]')
                    .closest('.widget_settings_block__item_field')
                    .show()

            } else {
                $('input[name^="' +
                    self.CALLPICKER_DICTIONARY.CP_FIELDS.ADVANCED_SETTINGS_FIELDS.USERS_EXTENSIONS +
                    '"]')
                    .closest('.widget_settings_block__item_field')
                    .hide()
            }
        }

        self.installWidgetService = function (
            cpClientID,
            cpClientSecret,
            appID,
            appSecretKey,
            appAuthCode,
            appSubdomain
        ) {
            return new Promise(function (resolve, reject) {
                // Let's make a request to a remote server
                self.crm_post(
                    /* Send the request to your voip service
                    * to perform dialing the number
                    * The method crm_post (url, data, callback, type, error)
                    */
                    self.CP_KOMMO_ENDPOINTS.INSTALL,
                    {
                        cp_client_id: cpClientID,
                        cp_client_secret: cpClientSecret,
                        kommo_app_id: appID,
                        kommo_app_secret: appSecretKey,
                        kommo_auth_code: appAuthCode,
                        kommo_subdomain: appSubdomain,
                        kommo_redirect_uri: self.CP_KOMMO_ENDPOINTS.INSTALL,
                        cp_api_host: self.CALLPICKER_DICTIONARY.CP_API_HOST,
                        cp_api_scope: self.CALLPICKER_DICTIONARY.CP_API_SCOPE
                    },
                    function (response) {

                        kommoCode = response[
                            self.
                                CALLPICKER_DICTIONARY.
                                CP_CONNECTORS_PROPS.
                                KOMMO_CODE
                        ]

                        const message = self.getCallpickerCode(
                            kommoCode
                        )

                        if (response.code
                            ==
                            self.CALLPICKER_DICTIONARY.CP_CODES.SUCCESSFUL) {
                            resolve(
                                {
                                    passed: true,
                                    message: message
                                }
                            )
                        } else {
                            resolve(
                                {
                                    passed: false,
                                    className: kommoCode,
                                    message: message
                                }
                            )
                        }
                    },
                    'json',
                    function (err) {
                        console.log('err', err)
                        resolve(false)
                    }
                )
            });
        }

        self.uninstallWidgetService = function (
            cpClientID,
            appID,
            appSubdomain
        ) {
            return new Promise(function (resolve, reject) {
                // Let's make a request to a remote server
                self.crm_post(
                    /* Send the request to your voip service
                    * to perform dialing the number
                    * The method crm_post (url, data, callback, type, error)
                    */
                    self.CP_KOMMO_ENDPOINTS.UNINSTALL,
                    {
                        cp_client_id: cpClientID,
                        kommo_app_id: appID,
                        kommo_subdomain: appSubdomain
                    },
                    function (response) {

                        if (response.code
                            ==
                            self.CALLPICKER_DICTIONARY.CP_CODES.SUCCESSFUL) {
                            resolve(true)
                        } else {
                            resolve(false)
                        }
                    },
                    'text',
                    function (err) {
                        console.log('err', err)
                        resolve(false)
                    }
                )
            });
        }

        self.clickToCall = function (
            cpClientID,
            cpExtensionID,
            phoneToDial
        ) {
            return new Promise(function (resolve, reject) {
                self.crm_post(
                    self.CP_KOMMO_ENDPOINTS.CLICK_TO_CALL,
                    {
                        cp_client_id: cpClientID,
                        cp_extension_id: cpExtensionID,
                        phone_to_dial: phoneToDial,
                        cp_api_host: self.CALLPICKER_DICTIONARY.CP_API_HOST,
                    },
                    function (response) {

                        console.log('cpClickToCallResponse', response)

                        if (response.code
                            ==
                            self.CALLPICKER_DICTIONARY.CP_CODES.SUCCESSFUL) {
                            resolve(true)
                        } else {
                            resolve(false)
                        }
                    },
                    'json',
                    function (err) {
                        console.log('err', err)
                        resolve(false)
                    }
                )
            })
        }

        self.searchUserCallpickerExtension = function (
            userID
        ) {
            const extensions = JSON.parse(self.params.users_extensions)
            const userExtension = extensions[userID]

            if (userExtension === "") {
                return false
            } else {
                return userExtension
            }
        }

        this.callbacks = {
            render: function () {
                console.log(version, 'method: render')
                return true
            },
            init: function () {
                console.log(version, 'method: init')
                console.log('init: system()', self.system())
                console.log('init: get_settings()', self.get_settings())
                console.log('init: params', self.params)
                console.log('init: APP', APP)
                // console.log('init: langs', self.langs)
                // console.log('init: i18n', self.i18n('callpickerCodes'))

                // ######################## TEMP CODE

                self.add_action('phone', async function (data) {
                    // console.log('Llamada Callpicker vía API', data)

                    // console.log('phone: system()', self.system())
                    // console.log('phone: get_settings()', self.get_settings())
                    // console.log('phone: params', self.params)
                    // console.log('phone: APP', APP)

                    // const kommoUserID = self.system().amouser_id

                    // const extensionResult = self.searchUserCallpickerExtension(kommoUserID)

                    // if (extensionResult === false) {
                    //     alert('La extensión no es válida, revisa la configuración de la integración')
                    //     return
                    // }

                    // const phoneToDial = data.value
                    // const cpClientID = self.params.cp_client_id

                    // await self.clickToCall(cpClientID, extensionResult, phoneToDial)

                })

                return true
            },
            bind_actions: function () {
                console.log(version, 'method: bind_actions')
                return true
            },
            settings: function () {

                self.appID = self.params.oauth_client_uuid
                self.appSubdomain = self.system().subdomain

                switch (self.params.status) {
                    case self.CALLPICKER_DICTIONARY.INTEGRATION_STATUS.INSTALL:
                        self.showCallpickerConfigurations(false)
                        self.appAuthCode = $('[title^="def50200"]').text().trim()
                        self.appSecretKey = $('.js-secret').text().trim()
                        break;
                    case self.CALLPICKER_DICTIONARY.INTEGRATION_STATUS.INSTALLED:
                        self.lockCallpickerKeyFields()
                        self.showCallpickerConfigurations(true)
                    default:
                        break;
                }

                return true
            },
            advancedSettings: function () {
                return true
            },
            onSave: async function () {

                console.log('onSave method')

                if (self.params.status
                    ===
                    self.CALLPICKER_DICTIONARY.INTEGRATION_STATUS.INSTALL) {

                    self.cpClientID = $('input[name="' +
                        self.CALLPICKER_DICTIONARY.CP_FIELDS.CLIENT_ID +
                        '"]')
                        .val()

                    self.cpClientSecret = $('input[name="' +
                        self.CALLPICKER_DICTIONARY.CP_FIELDS.CLIENT_SECRET +
                        '"]')
                        .val()

                    self.getTemplate(
                        'cp_response_message',
                        function (template) {
                            const container = $('input[name="callpicker_block"]')
                                .closest('.widget_settings_block__item_field')


                            container.show()
                            container.children(':not(.widget_settings_block__input_field)').remove()
                            container.append(
                                template.render(
                                    {
                                        message: null,
                                        className: self.
                                            CALLPICKER_DICTIONARY.
                                            CP_TWIG.
                                            SPINNER
                                    }
                                )
                            )

                        }
                    )

                    const resultService = await self.installWidgetService(
                        self.cpClientID,
                        self.cpClientSecret,
                        self.appID,
                        self.appSecretKey,
                        self.appAuthCode,
                        self.appSubdomain
                    )

                    if (resultService.passed) {

                        self.lockCallpickerKeyFields()

                        self.getTemplate(
                            'cp_response_message',
                            function (template) {
                                const container = $('input[name="callpicker_block"]')
                                    .closest('.widget_settings_block__item_field')

                                container.show()
                                container.children(':not(.widget_settings_block__input_field)').remove()

                                container.append(
                                    template.render(
                                        {
                                            message: resultService.message
                                        }
                                    )
                                )

                            }
                        )

                        self.showCallpickerConfigurations(true)

                    } else {

                        self.getTemplate(
                            'cp_response_message',
                            function (template) {
                                const container = $('input[name="callpicker_block"]')
                                    .closest('.widget_settings_block__item_field')

                                container.show()
                                container.children(':not(.widget_settings_block__input_field)').remove()

                                container.append(
                                    template.render(
                                        {
                                            message: resultService.message,
                                            className: resultService.className
                                        }
                                    )
                                )

                            }
                        )
                    }

                    return resultService.passed
                } else {
                    return true
                }
            },
            destroy: async function () {
                console.log('method: destroy')

                self.cpClientID = $('input[name="' +
                    self.CALLPICKER_DICTIONARY.CP_FIELDS.CLIENT_ID +
                    '"]')
                    .val()

                if (self.params.status
                    ===
                    self.CALLPICKER_DICTIONARY.INTEGRATION_STATUS.INSTALLED) {

                    await self.uninstallWidgetService(
                        self.cpClientID,
                        self.appID,
                        self.appSubdomain
                    )
                }
            }
        }
        return this
    }
    return CustomWidget
})