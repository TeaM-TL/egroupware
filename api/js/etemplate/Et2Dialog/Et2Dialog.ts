/**
 * EGroupware eTemplate2 - Box widget
 *
 * @license http://opensource.org/licenses/gpl-license.php GPL - GNU General Public License
 * @package etemplate
 * @subpackage api
 * @link https://www.egroupware.org
 * @author Nathan Gray
 */


import {Et2Widget} from "../Et2Widget/Et2Widget";
import {et2_dialog} from "../et2_widget_dialog";
import {et2_button} from "../et2_widget_button";
import {LionDialog} from "@lion/dialog";
import {et2_createWidget, et2_widget} from "../et2_core_widget";
import {html, LitElement, ScopedElementsMixin, SlotMixin} from "@lion/core";
import {Et2DialogOverlay} from "./Et2DialogOverlay";
import {Et2DialogContent} from "./Et2DialogContent";

export interface DialogButton
{
	id : string,
	button_id? : number,
	text : string,
	image? : string,
	default? : boolean
}

/**
 * Et2Dialog widget
 *
 * You can use the static methods to get a dialog.
 *
 * Because of how LionDialog does its layout and rendering, it's easiest to separate the dialog popup from
 * the dialog content.  This allows us to easily preserve the WebComponent styling.
 */
export class Et2Dialog extends Et2Widget(ScopedElementsMixin(SlotMixin(LionDialog)))
{
	/**
	 * Dialogs don't always get added to an etemplate, so we keep our own egw
	 *
	 * @type {IegwAppLocal}
	 * @protected
	 */
	protected __egw : IegwAppLocal

	/**
	 * Types
	 * @constant
	 */
	public static PLAIN_MESSAGE : number = 0;
	public static INFORMATION_MESSAGE : number = 1;
	public static QUESTION_MESSAGE : number = 2;
	public static WARNING_MESSAGE : number = 3;
	public static ERROR_MESSAGE : number = 4;

	/* Pre-defined Button combos */
	public static BUTTONS_OK : number = 0;
	public static BUTTONS_OK_CANCEL : number = 1;
	public static BUTTONS_YES_NO : number = 2;
	public static BUTTONS_YES_NO_CANCEL : number = 3;

	/* Button constants */
	public static CANCEL_BUTTON : number = 0;
	public static OK_BUTTON : number = 1;
	public static YES_BUTTON : number = 2;
	public static NO_BUTTON : number = 3;

	get properties()
	{
		return {
			...super.properties(),
			callback: Function,
			modal: Boolean,
			buttons: Number,

			// We just pass these on to Et2DialogContent
			title: String,
			message: String,
			dialog_type: Number,
			icon: String,
			value: Object,

		}
	}

	get slots()
	{
		return {
			...super.slots
		}
	}

	// Still not sure what this does, but it's important.
	// Seems to be related to the constructor, and what's available during the "creation"
	static get scopedElements()
	{
		return {
			...super.scopedElements,
			'et2-dialog-overlay-frame': Et2DialogOverlay,
			'et2-dialog-content': Et2DialogContent
		};
	}

	private readonly _buttons : DialogButton[][] = [
		/*
		Pre-defined Button combos
		*/
		//BUTTONS_OK: 0,
		[{"button_id": Et2Dialog.OK_BUTTON, "text": 'ok', id: 'dialog[ok]', image: 'check', "default": true}],
		//BUTTONS_OK_CANCEL: 1,
		[
			{"button_id": Et2Dialog.OK_BUTTON, "text": 'ok', id: 'dialog[ok]', image: 'check', "default": true},
			{"button_id": Et2Dialog.CANCEL_BUTTON, "text": 'cancel', id: 'dialog[cancel]', image: 'cancel'}
		],
		//BUTTONS_YES_NO: 2,
		[
			{"button_id": Et2Dialog.YES_BUTTON, "text": 'yes', id: 'dialog[yes]', image: 'check', "default": true},
			{"button_id": Et2Dialog.NO_BUTTON, "text": 'no', id: 'dialog[no]', image: 'cancelled'}
		],
		//BUTTONS_YES_NO_CANCEL: 3,
		[
			{"button_id": Et2Dialog.YES_BUTTON, "text": 'yes', id: 'dialog[yes]', image: 'check', "default": true},
			{"button_id": Et2Dialog.NO_BUTTON, "text": 'no', id: 'dialog[no]', image: 'cancelled'},
			{"button_id": Et2Dialog.CANCEL_BUTTON, "text": 'cancel', id: 'dialog[cancel]', image: 'cancel'}
		]
	];

	constructor()
	{
		super();

		this.modal = true;
		this.__value = {};

		this._onClose = this._onClose.bind(this);
		this._onClick = this._onClick.bind(this);
	}

	connectedCallback()
	{
		super.connectedCallback();

		// Need to wait for Overlay
		this.updateComplete
			.then(async() =>
			{
				if(this._overlayContentNode)
				{
					await this._overlayContentNode.getUpdateComplete();
					// This calls _onClose() when the dialog is closed
					this._overlayContentNode.addEventListener(
						'close-overlay',
						this._onClose,
					);
					this._overlayContentNode.addEventListener(
						'click',
						this._onClick
					)
				}
			});
	}

	_onClose(ev : PointerEvent)
	{
		this._overlayCtrl.teardown();
		this.remove();
	}

	_onClick(ev : MouseEvent)
	{
		// @ts-ignore
		const button_id = parseInt(ev.target?.getAttribute("button_id")) || ev.target?.getAttribute("id") || null;

		// Handle anything bound via et2 onclick property
		let et2_widget_result = super._handleClick(ev);

		if(!et2_widget_result)
		{
			ev.preventDefault();
			ev.stopPropagation();
			return false;
		}

		// Callback expects (button_id, value)
		let callback_result = this.callback ? this.callback(button_id, this.value) : true;

		if(callback_result === false)
		{
			ev.preventDefault();
			ev.stopPropagation();
			return false;
		}
		this.close();
	}

	/**
	 * Returns the values of any widgets in the dialog.  This does not include
	 * the buttons, which are only supplied for the callback.
	 */
	get value() : Object
	{
		let value = this.__value;
		if(this.template)
		{
			value = this.template.getValues(this.template.widgetContainer);
		}
		return value;
	}

	set value(new_value)
	{
		this.__value = new_value;
	}

	render()
	{
		return this._overlayTemplate();
	}

	/**
	 * Defining this overlay as a templates from OverlayMixin
	 * this is our source to give as .contentNode to OverlayController.
	 * @protected
	 */
	protected _overlayTemplate()
	{
		return html`
            <div id="overlay-content-node-wrapper">
                <et2-dialog-overlay-frame class="dialog__overlay-frame"
                                          .egw=${this.egw()}
                                          .buttons=${this._getButtons()}>
                    <span slot="heading">${this.title}</span>
                    ${this._contentTemplate()}

                </et2-dialog-overlay-frame>
            </div>
		`;
	}

	/**
	 * @override Configures OverlayMixin
	 */
	get _overlayContentNode()
	{
		if(this._cachedOverlayContentNode)
		{
			return this._cachedOverlayContentNode;
		}
		this._cachedOverlayContentNode = /** @type {HTMLElement} */ (
			/** @type {ShadowRoot} */ (this.shadowRoot).querySelector('.dialog__overlay-frame')
		);
		return this._cachedOverlayContentNode;
	}

	_contentTemplate()
	{

		return html`
            <et2-dialog-content slot="content" ?icon=${this.icon}
                                .value=${this.value}>
                ${this.message}
            </et2-dialog-content>
		`;

	}

	_getButtons()
	{
		if(Number.isInteger(this.buttons))
		{
			return this._buttons[this.buttons];
		}
		else if(Array.isArray(this.buttons))
		{
			return this.buttons;
		}
		else
		{
			// TODO: Find buttons in template
		}
	}

	/**
	 * @override Configures OverlayMixin
	 * @desc overrides default configuration options for this component
	 * @returns {Object}
	 */
	_defineOverlayConfig()
	{
		let not_modal = {
			hasBackdrop: false,
			preventsScroll: false,
			trapsKeyboardFocus: false,
		}
		return {
			...super._defineOverlayConfig(),
			hidesOnEscape: true,
			...(this.modal ? {} : not_modal)
		}


	}

	/**
	 * Inject application specific egw object with loaded translations into the dialog
	 *
	 * @param {string|egw} _egw_or_appname egw object with already loaded translations or application name to load translations for
	 */
	_setApiInstance(_egw_or_appname ? : string | IegwAppLocal)
	{
		if(typeof _egw_or_appname == 'undefined')
		{
			// @ts-ignore
			_egw_or_appname = egw_appName;
		}
		// if egw object is passed in because called from et2, just use it
		if(typeof _egw_or_appname != 'string')
		{
			this.__egw = _egw_or_appname;
		}
		// otherwise use given appname to create app-specific egw instance and load default translations
		else
		{
			this.__egw = egw(_egw_or_appname);
			this.egw().langRequireApp(this.egw().window, _egw_or_appname);
		}
	}

	egw() : IegwAppLocal
	{
		if(this.__egw)
		{
			return this.__egw;
		}
		else
		{
			return super.egw();
		}
	}

	/**
	 * Show a confirmation dialog
	 *
	 * @param {function} _callback Function called when the user clicks a button.  The context will be the et2_dialog widget, and the button constant is passed in.
	 * @param {string} _message Message to be place in the dialog.
	 * @param {string} _title Text in the top bar of the dialog.
	 * @param _value passed unchanged to callback as 2. parameter
	 * @param {integer|array} _buttons One of the BUTTONS_ constants defining the set of buttons at the bottom of the box
	 * @param {integer} _type One of the message constants.  This defines the style of the message.
	 * @param {string} _icon URL of an icon to display.  If not provided, a type-specific icon will be used.
	 * @param {string|egw} _egw_or_appname egw object with already laoded translations or application name to load translations for
	 */
	static show_dialog(_callback? : Function, _message? : string, _title? : string, _value? : object, _buttons?, _type? : number, _icon? : string, _egw_or_appname? : string | IegwAppLocal)
	{
		// Just pass them along, widget handles defaults & missing
		let dialog = <Et2Dialog><unknown>document.createElement('et2-dialog');
		dialog._setApiInstance(_egw_or_appname);
		dialog.transformAttributes({
			callback: _callback || function() {},
			message: _message,
			title: _title || dialog.egw().lang('Confirmation required'),
			buttons: typeof _buttons != 'undefined' ? _buttons : Et2Dialog.BUTTONS_YES_NO,
			dialog_type: typeof _type != 'undefined' ? _type : Et2Dialog.QUESTION_MESSAGE,
			icon: _icon,
			value: _value,
			width: 'auto',
			modal: false
		});
		// Let other things run, then open
		dialog.getUpdateComplete().then(() =>
		{
			window.setTimeout(dialog.open, 0);
		});
		document.body.appendChild(<LitElement><unknown>dialog);
		return dialog;
	};

	/**
	 * Show an alert message with OK button
	 *
	 * @param {string} _message Message to be place in the dialog.
	 * @param {string} _title Text in the top bar of the dialog.
	 * @param {integer} _type One of the message constants.  This defines the style of the message.
	 */
	static alert(_message? : string, _title? : string, _type?)
	{
		let parent = et2_dialog._create_parent(et2_dialog._create_parent().egw());
		et2_createWidget("dialog", {
			callback: function()
			{
			},
			message: _message,
			title: _title,
			buttons: et2_dialog.BUTTONS_OK,
			dialog_type: _type || et2_dialog.INFORMATION_MESSAGE
		}, parent);
	}

	/**
	 * Show a prompt dialog
	 *
	 * @param {function} _callback Function called when the user clicks a button.  The context will be the et2_dialog widget, and the button constant is passed in.
	 * @param {string} _message Message to be place in the dialog.
	 * @param {string} _title Text in the top bar of the dialog.
	 * @param {string} _value for prompt, passed to callback as 2. parameter
	 * @param {integer|array} _buttons One of the BUTTONS_ constants defining the set of buttons at the bottom of the box
	 * @param {string|egw} _egw_or_appname egw object with already laoded translations or application name to load translations for
	 */
	static show_prompt(_callback, _message, _title?, _value?, _buttons?, _egw_or_appname?)
	{
		var callback = _callback;
		// Just pass them along, widget handles defaults & missing
		return et2_createWidget("dialog", {
			callback: function(_button_id, _value)
			{
				if(typeof callback == "function")
				{
					callback.call(this, _button_id, _value.value);
				}
			},
			title: _title || egw.lang('Input required'),
			buttons: _buttons || et2_dialog.BUTTONS_OK_CANCEL,
			value: {
				content: {
					value: _value,
					message: _message
				}
			},
			template: egw.webserverUrl + '/api/templates/default/prompt.xet',
			class: "et2_prompt"
		}, et2_dialog._create_parent(_egw_or_appname));
	}

	/**
	 * Method to build a confirmation dialog only with
	 * YES OR NO buttons and submit content back to server
	 *
	 * @param {widget} _senders widget that has been clicked
	 * @param {String} _dialogMsg message shows in dialog box
	 * @param {String} _titleMsg message shows as a title of the dialog box
	 * @param {Bool} _postSubmit true: use postSubmit instead of submit
	 *
	 * @description submit the form contents including the button that has been pressed
	 */
	static confirm(_senders, _dialogMsg, _titleMsg, _postSubmit)
	{
		var senders = _senders;
		var buttonId = _senders.id;
		var dialogMsg = (typeof _dialogMsg != "undefined") ? _dialogMsg : '';
		var titleMsg = (typeof _titleMsg != "undefined") ? _titleMsg : '';
		var egw = _senders instanceof et2_widget ? _senders.egw() : et2_dialog._create_parent().egw();
		var callbackDialog = function(button_id)
		{
			if(button_id == et2_dialog.YES_BUTTON)
			{
				if(_postSubmit)
				{
					senders.getRoot().getInstanceManager().postSubmit(buttonId);
				}
				else if(senders.instanceOf(et2_button) && senders.getType() !== "buttononly")
				{
					senders.clicked = true;
					senders.getInstanceManager().submit(senders, false, senders.options.novalidate);
					senders.clicked = false;
				}
				else
				{
					senders.getRoot().getInstanceManager().submit(buttonId);
				}
			}
		};
		et2_dialog.show_dialog(callbackDialog, egw.lang(dialogMsg), egw.lang(titleMsg), {},
			et2_dialog.BUTTONS_YES_NO, et2_dialog.WARNING_MESSAGE, undefined, egw);
	};


	/**
	 * Show a dialog for a long-running, multi-part task
	 *
	 * Given a server url and a list of parameters, this will open a dialog with
	 * a progress bar, asynchronously call the url with each parameter, and update
	 * the progress bar.
	 * Any output from the server will be displayed in a box.
	 *
	 * When all tasks are done, the callback will be called with boolean true.  It will
	 * also be called if the user clicks a button (OK or CANCEL), so be sure to
	 * check to avoid executing more than intended.
	 *
	 * @param {function} _callback Function called when the user clicks a button,
	 *	or when the list is done processing.  The context will be the et2_dialog
	 *	widget, and the button constant is passed in.
	 * @param {string} _message Message to be place in the dialog.  Usually just
	 *	text, but DOM nodes will work too.
	 * @param {string} _title Text in the top bar of the dialog.
	 * @param {string} _menuaction the menuaction function which should be called and
	 * 	which handles the actual request. If the menuaction is a full featured
	 * 	url, this one will be used instead.
	 * @param {Array[]} _list - List of parameters, one for each call to the
	 *	address.  Multiple parameters are allowed, in an array.
	 * @param {string|egw} _egw_or_appname egw object with already laoded translations or application name to load translations for
	 *
	 * @return {et2_dialog}
	 */
	static long_task(_callback, _message, _title, _menuaction, _list, _egw_or_appname)
	{
		let parent = et2_dialog._create_parent(_egw_or_appname);
		let egw = parent.egw();

		// Special action for cancel
		let buttons = [
			{"button_id": et2_dialog.OK_BUTTON, "text": egw.lang('ok'), "default": true, "disabled": true},
			{
				"button_id": et2_dialog.CANCEL_BUTTON, "text": egw.lang('cancel'), click: function()
				{
					// Cancel run
					cancel = true;
					jQuery("button[button_id=" + et2_dialog.CANCEL_BUTTON + "]", dialog.div.parent()).button("disable");
					update.call(_list.length, '');
				}
			}
		];
		let dialog = et2_createWidget("dialog", {
			template: egw.webserverUrl + '/api/templates/default/long_task.xet',
			value: {
				content: {
					message: _message
				}
			},
			callback: function(_button_id, _value)
			{
				if(_button_id == et2_dialog.CANCEL_BUTTON)
				{
					cancel = true;
				}
				if(typeof _callback == "function")
				{
					_callback.call(this, _button_id, _value.value);
				}
			},
			title: _title || egw.lang('please wait...'),
			buttons: buttons
		}, parent);

		// OK starts disabled
		jQuery("button[button_id=" + et2_dialog.OK_BUTTON + "]", dialog.div.parent()).button("disable");

		let log = null;
		let progressbar = null;
		let cancel = false;
		let totals = {
			success: 0,
			skipped: 0,
			failed: 0,
			widget: null
		};

		// Updates progressbar & log, calls next step
		let update = function(response)
		{
			// context is index
			let index = this || 0;

			progressbar.set_value(100 * (index / _list.length));
			progressbar.set_label(index + ' / ' + _list.length);

			// Display response information
			switch(response.type)
			{
				case 'error':
					jQuery("<div class='message error'></div>")
						.text(response.data)
						.appendTo(log);

					totals.failed++;

					// Ask to retry / ignore / abort
					et2_createWidget("dialog", {
						callback: function(button)
						{
							switch(button)
							{
								case 'dialog[cancel]':
									cancel = true;
									return update.call(index, '');
								case 'dialog[skip]':
									// Continue with next index
									totals.skipped++;
									return update.call(index, '');
								default:
									// Try again with previous index
									return update.call(index - 1, '');
							}

						},
						message: response.data,
						title: '',
						buttons: [
							// These ones will use the callback, just like normal
							{text: egw.lang("Abort"), id: 'dialog[cancel]'},
							{text: egw.lang("Retry"), id: 'dialog[retry]'},
							{text: egw.lang("Skip"), id: 'dialog[skip]', class: "ui-priority-primary", default: true}
						],
						dialog_type: et2_dialog.ERROR_MESSAGE
					}, parent);
					// Early exit
					return;
				default:
					if(response && typeof response === "string")
					{
						totals.success++;
						jQuery("<div class='message'></div>")
							.text(response)
							.appendTo(log);
					}
					else
					{
						jQuery("<div class='message error'></div>")
							.text(JSON.stringify(response))
							.appendTo(log);
					}
			}
			// Scroll to bottom
			let height = log[0].scrollHeight;
			log.scrollTop(height);

			// Update totals
			totals.widget.set_value(egw.lang(
				"Total: %1 Successful: %2 Failed: %3 Skipped: %4",
				_list.length, <string><unknown>totals.success, <string><unknown>totals.failed, <string><unknown>totals.skipped
			));

			// Fire next step
			if(!cancel && index < _list.length)
			{
				var parameters = _list[index];
				if(typeof parameters != 'object')
				{
					parameters = [parameters];
				}

				// Async request, we'll take the next step in the callback
				// We can't pass index = 0, it looks like false and causes issues
				egw.json(_menuaction, parameters, update, index + 1, true, index + 1).sendRequest();
			}
			else
			{
				// All done
				if(!cancel)
				{
					progressbar.set_value(100);
				}
				jQuery("button[button_id=" + et2_dialog.CANCEL_BUTTON + "]", dialog.div.parent()).button("disable");
				jQuery("button[button_id=" + et2_dialog.OK_BUTTON + "]", dialog.div.parent()).button("enable");
				if(!cancel && typeof _callback == "function")
				{
					_callback.call(dialog, true, response);
				}
			}
		};

		jQuery(dialog.template.DOMContainer).on('load', function()
		{
			// Get access to template widgets
			log = jQuery(dialog.template.widgetContainer.getWidgetById('log').getDOMNode());
			progressbar = dialog.template.widgetContainer.getWidgetById('progressbar');
			progressbar.set_label('0 / ' + _list.length);
			totals.widget = dialog.template.widgetContainer.getWidgetById('totals');

			// Start
			window.setTimeout(function()
			{
				update.call(0, '');
			}, 0);
		});

		return dialog;
	}
}

customElements.define("et2-dialog", Et2Dialog);
// make et2_dialog publicly available as we need to call it from templates
//if(typeof window.et2_dialog === 'undefined')
{
	window['et2_dialog'] = Et2Dialog;
}
