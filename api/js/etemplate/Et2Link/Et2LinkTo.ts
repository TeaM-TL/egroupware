/**
 * EGroupware eTemplate2 - JS Link list object
 *
 * @license http://opensource.org/licenses/gpl-license.php GPL - GNU General Public License
 * @package etemplate
 * @subpackage api
 * @link https://www.egroupware.org
 * @author Nathan Gray
 * @copyright 2022 Nathan Gray
 */


import {Et2InputWidget} from "../Et2InputWidget/Et2InputWidget";
import {FormControlMixin, ValidateMixin} from "@lion/form-core";
import {css, html, LitElement, ScopedElementsMixin} from "@lion/core";
import {et2_createWidget, et2_widget} from "../et2_core_widget";
import {et2_file} from "../et2_widget_file";
import {et2_tabbox} from "../et2_widget_tabs";
import {Et2Button} from "../Et2Button/Et2Button";
import {Et2LinkEntry} from "./Et2LinkEntry";
import {egw} from "../../jsapi/egw_global";
import {et2_vfsSelect} from "../et2_widget_vfs";
import {LinkInfo} from "./Et2Link";
import {Et2LinkList} from "./Et2LinkList";
import {et2_DOMWidget} from "../et2_core_DOMWidget";
import {ValidationType} from "@lion/form-core/types/validate/ValidateMixinTypes";
import {ManualMessage} from "../Validators/ManualMessage";

/**
 * Choose an existing entry, VFS file or local file, and link it to the current entry.
 *
 * If there is no "current entry", link information will be stored for submission instead
 * of being directly linked.
 */
export class Et2LinkTo extends Et2InputWidget(ScopedElementsMixin(FormControlMixin(ValidateMixin(LitElement))))
{
	static get properties()
	{
		return {
			...super.properties,
			/**
			 * Hide buttons to attach files
			 */
			noFiles: {type: Boolean},
			/**
			 * Limit to just this application - hides app selection
			 */
			onlyApp: {type: String},
			/**
			 * Limit to the listed applications (comma seperated)
			 */
			applicationList: {type: String},

			value: {type: Object}
		}
	}

	static get styles()
	{
		return [
			...super.styles,
			css`
			:host(.can_link) #link_button {
				display: initial;
			}
			#link_button {
				display: none;
			}
			et2-link-entry {
				flex: 1 1 auto;
			}
			.input-group__container {
				flex: 1 1 auto;
			}
			.input-group {
				display: flex;
				width: 100%;
			}
			::slotted(.et2_file) {
				width: 30px;
			}
			`
		];
	}

	// Still not sure what this does, but it's important.
	// Seems to be related to rendering and what's available "inside"
	static get scopedElements()
	{
		return {
			// @ts-ignore
			...super.scopedElements,
			'et2-button': Et2Button,
			'et2-link-entry': Et2LinkEntry
		};
	}

	constructor()
	{
		super();
		this.noFiles = false;

		this.handleFilesUploaded = this.handleFilesUploaded.bind(this);
		this.handleEntrySelected = this.handleEntrySelected.bind(this);
		this.handleEntryCleared = this.handleEntryCleared.bind(this);
		this.handleLinkButtonClick = this.handleLinkButtonClick.bind(this);
	}

	firstUpdated()
	{
		// Add file buttons in
		// TODO: Replace when they're webcomponents
		this._fileButtons();
	}

	/**
	 * @return {TemplateResult}
	 * @protected
	 */
	_inputGroupInputTemplate()
	{
		return html`
            <et2-link-entry .onlyApp="${this.onlyApp}"
                            .applicationList="${this.applicationList}"
                            @sl-select=${this.handleEntrySelected}
                            @sl-clear="${this.handleEntryCleared}">
            </et2-link-entry>
            <et2-button id="link_button" label="Link" class="link" .noSubmit=${true}
                        @click=${this.handleLinkButtonClick}>
            </et2-button>
		`;
	}

	// TODO: Replace when they're webcomponents
	_fileButtons()
	{
		if(this.noFiles)
		{
			return "";
		}

		// File upload
		//@ts-ignore IDE doesn't know about Et2WidgetClass
		let self : Et2WidgetClass | et2_widget = this;
		let file_attrs = {
			multiple: true,
			id: this.id + '_file',
			label: '',
			// Make the whole template a drop target
			drop_target: this.getInstanceManager().DOMContainer.getAttribute("id"),
			readonly: this.readonly,

			// Change to this tab when they drop
			onStart: function(event, file_count)
			{
				// Find the tab widget, if there is one
				let tabs = self;
				do
				{
					tabs = tabs.getParent();
				}
				while(tabs != self.getRoot() && tabs.getType() != 'tabbox');
				if(tabs != self.getRoot())
				{
					(<et2_tabbox><unknown>tabs).activateTab(self);
				}
				return true;
			},
			onFinish: function(event, file_count)
			{
				// Auto-link uploaded files
				self.handleFilesUploaded(event);
			}
		};

		this.file_upload = <et2_file>et2_createWidget("file", file_attrs, this);
		this.file_upload.set_readonly(this.readonly);
		this.file_upload.getDOMNode().slot = "before";

		this.append(this.file_upload.getDOMNode());

		// Filemanager select
		var select_attrs : any = {
			button_label: egw.lang('Link'),
			button_caption: '',
			button_icon: 'link',
			readonly: this.readonly,
			dialog_title: egw.lang('Link'),
			extra_buttons: [{text: egw.lang("copy"), id: "copy", image: "copy"},
				{text: egw.lang("move"), id: "move", image: "move"}],
			onchange: function()
			{
				var values = true;
				// If entry not yet saved, store for linking on server
				if(!self.value.to_id || typeof self.value.to_id == 'object')
				{
					values = self.value.to_id || {};
					var files = this.getValue();
					if(typeof files !== 'undefined')
					{
						for(var i = 0; i < files.length; i++)
						{
							values['link:' + files[i]] = {
								app: 'link',
								id: files[i],
								type: 'unknown',
								icon: 'link',
								remark: '',
								title: files[i]
							};
						}
					}
				}
				self._link_result(values);
			}
		};
		// only set server-side callback, if we have a real application-id (not null or array)
		// otherwise it only gives an error on server-side
		if(self.value && self.value.to_id && typeof self.value.to_id != 'object')
		{
			select_attrs.method = 'EGroupware\\Api\\Etemplate\\Widget\\Link::ajax_link_existing';
			select_attrs.method_id = self.value.to_app + ':' + self.value.to_id;
		}
		this.vfs_select = <et2_vfsSelect>et2_createWidget("vfs-select", select_attrs, this);
		this.vfs_select.set_readonly(this.readonly);
		this.vfs_select.getDOMNode().slot = "before";

		this.append(this.vfs_select.getDOMNode())
	}

	/**
	 * Create links
	 *
	 * Using current value for one end of the link, create links to the provided files or entries
	 *
	 * @param _links
	 */
	createLink(_links : LinkInfo[])
	{
		let links : LinkInfo[];
		if(typeof _links == 'undefined')
		{
			links = [];
		}
		else
		{
			links = _links;
		}

		// If no link array was passed in, don't make the ajax call
		if(links.length > 0)
		{
			egw.request("EGroupware\\Api\\Etemplate\\Widget\\Link::ajax_link",
				[this.value.to_app, this.value.to_id, links]).then((result) => this._link_result(result))

		}
	}

	/**
	 * Sent some links, server has a result
	 *
	 * @param {Object} success
	 */
	_link_result(success)
	{
		if(success)
		{
			// Show some kind of success...

			// Reset
			this.resetAfterLink();

			// Server says it's OK, but didn't store - we'll send this again on submit
			// This happens if you link to something before it's saved to the DB
			if(typeof success == "object")
			{
				// Save as appropriate in value
				if(typeof this.value != "object")
				{
					this.value = {};
				}
				this.value.to_id = success;

				for(let link in success)
				{
					// Icon should be in registry
					if(typeof success[link].icon == 'undefined')
					{
						success[link].icon = egw.link_get_registry(success[link].app, 'icon');
						// No icon, try by mime type - different place for un-saved entries
						if(success[link].icon == false && success[link].id.type)
						{
							// Triggers icon by mime type, not thumbnail or app
							success[link].type = success[link].id.type;
							success[link].icon = true;
						}
					}
					// Special handling for file - if not existing, we can't ask for title
					if(success[link].app == 'file' && typeof success[link].title == 'undefined')
					{
						success[link].title = success[link].id.name || '';
					}
				}
			}

			// Look for a link-list so we can refresh it
			let list_widget = (<Et2LinkList><unknown>(<et2_DOMWidget>this.getParent()).getDOMNode().querySelector('et2-link-list'));
			// If there's an array of data (entry is not yet saved), updating the list with only server info will
			// not work, so add them in explicitly.
			if(list_widget && success)
			{
				// Update link list, passing data if server provided it
				list_widget.get_links(typeof success == "object" ? Object.values(success) : []);
			}
		}
		else
		{
			this.validators.push(new ManualMessage(success));
		}
		this.dispatchEvent(new CustomEvent('link.et2_link_to', {bubbles: true, detail: success}));
	}

	/**
	 * A link was attempted.  Reset internal values to get ready for the next one.
	 */
	resetAfterLink()
	{
		// Hide link button again
		this.classList.remove("can_link");
		this.link_button.image = "";

		// Clear internal
		delete this.value.app;
		delete this.value.id;

		// Clear file upload
		for(var file in this.file_upload.options.value)
		{
			delete this.file_upload.options.value[file];
		}
		this.file_upload.progress.empty();

		// Clear link entry
		this.select.value = {app: this.select.app, id: ""};
	}

	/**
	 * Files have been uploaded (successfully), ready to link
	 *
	 * @param event
	 * @protected
	 */
	handleFilesUploaded(event)
	{
		this.classList.add("can_link");

		let links = [];

		// Get files from file upload widget
		let files = this.file_upload.get_value();
		for(let file in files)
		{
			links.push({
				app: 'file',
				id: file,
				name: files[file].name,
				type: files[file].type,

				// Not sure what this is...
				/*
					remark: jQuery("li[file='" + files[file].name.replace(/'/g, '&quot') + "'] > input", self.file_upload.progress)
						.filter(function ()
						{
							return jQuery(this).attr("placeholder") != jQuery(this).val();
						}).val()
				 */
			});
		}
		this.createLink(links);
	}

	/**
	 * An entry has been selected, ready to link
	 *
	 */
	handleEntrySelected(event)
	{
		// Could be the app, could be they selected an entry
		if(event.target == this.select._searchNode)
		{
			this.classList.add("can_link");
		}
	}

	/**
	 * An entry was selected, but instead of clicking "Link", the user cleared the selection
	 */
	handleEntryCleared(event)
	{
		this.classList.remove("can_link");
	}

	handleLinkButtonClick(event : MouseEvent)
	{
		this.link_button.image = "loading";
		let link_info : LinkInfo[] = [];
		if(this.select.value)
		{
			let selected = this.select.value;
			// Extra complicated because LinkEntry doesn't always return a LinkInfo
			if(this.onlyApp)
			{
				selected = <LinkInfo>{app: this.onlyApp, id: selected};
			}
			link_info.push(<LinkInfo>selected);
		}
		this.createLink(link_info)
	}

	get link_button() : Et2Button
	{
		return this.shadowRoot.querySelector("#link_button");
	}

	get select() : Et2LinkEntry
	{
		return this.shadowRoot.querySelector("et2-link-entry");
	}

	/**
	 * Types of validation supported by this FormControl (for instance 'error'|'warning'|'info')
	 *
	 * @type {ValidationType[]}
	 */
	static get validationTypes() : ValidationType[]
	{
		return ['error', 'success'];
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-link-to", Et2LinkTo);