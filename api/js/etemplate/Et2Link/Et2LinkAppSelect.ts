import {SelectOption} from "../Et2Select/FindSelectOptions";
import {css, html, SlotMixin, TemplateResult} from "@lion/core";
import {Et2Select} from "../Et2Select/Et2Select";


export class Et2LinkAppSelect extends SlotMixin(Et2Select)
{
	static get styles()
	{
		return [
			...super.styles,
			css`
			:host {
				--icon-width: 20px;
				display: inline-block;
			}
			:host([app_icons]) {
				max-width: 75px;
			}
			.select__menu {
				overflow-x: hidden;
			}
			::part(control) {
				border: none;
				box-shadow: initial;
			}
			et2-image {
				width: var(--icon-width);
			}
			::slotted(img), img {
				vertical-align: middle;
			}
			`
		]
	}

	static get properties()
	{
		return {
			...super.properties,

			/**
			 * Limit to just this one application, and hide the selection
			 */
			"only_app": {type: String},
			/**
			 * Limit to these applications (comma seperated).
			 */
			"application_list": {type: String},
			/**
			 * Show application icons instead of application names
			 */
			"app_icons": {type: Boolean, reflect: true}
		}
	};

	get slots()
	{
		return {
			...super.slots,
			"": () =>
			{

				const icon = document.createElement("et2-image");
				icon.setAttribute("slot", "prefix");
				icon.setAttribute("src", "api/navbar");
				icon.style.width = "var(--icon-width)";
				return icon;
			}
		}
	}

	protected __app_icons : boolean;
	protected __application_list : string[];

	/**
	 * Constructor
	 *
	 */
	constructor()
	{
		super();
		this.app_icons = true;
		this.application_list = [];

		// Select options are based off abilities registered with link system
		this._reset_select_options();
	}

	connectedCallback()
	{
		super.connectedCallback();

		if(this.select_options != null)
		{
			// Preset to last application
			if(!this.value)
			{
				this.value = <string>this.egw().preference('link_app', this.egw().app_name());
			}
		}
		// Set icon
		this.querySelector("[slot='prefix']").setAttribute("src", this.value + "/navbar");

		// Register to
		this.addEventListener("sl-change", () =>
		{
			// Set icon
			this.querySelector("[slot='prefix']").setAttribute("src", this.value + "/navbar");

			// update preference
			let appname = "";
			if(typeof this.value != 'undefined' && this.parentNode && this.parentNode.to_app)
			{
				appname = this.parentNode.to_app;
			}
			this.egw().set_preference(appname || this.egw().app_name(), 'link_app', this.value);
			this.dispatchEvent(new Event("change"));
		});
	}

	/**
	 * Called before update() to compute values needed during the update
	 *
	 * @param changedProperties
	 */
	willUpdate(changedProperties)
	{
		super.willUpdate(changedProperties);

		if(changedProperties.has("only_app") || changedProperties.has("application_list"))
		{
			this._reset_select_options();
		}
	}

	/**
	 * Limited select options here
	 * This method will check properties and set select options appropriately
	 */
	private _reset_select_options()
	{
		let select_options = [];

		// Limit to one app
		if(this.only_app)
		{
			select_options[this.only_app] = this.egw().lang(this.only_app);
		}
		else if(this.application_list.length > 0)
		{
			select_options = this.application_list;
		}
		else
		{
			//@ts-ignore link_app_list gives {app:name} instead of an array, but parent will fix it
			select_options = this.egw().link_app_list('query');
			if(typeof select_options['addressbook-email'] !== 'undefined')
			{
				delete select_options['addressbook-email'];
			}
		}
		this.select_options = select_options;
	}


	_optionTemplate(option : SelectOption) : TemplateResult
	{
		return html`
            <sl-menu-item value="${option.value}" title="${option.title}">
                ${this.app_icons ? "" : option.label}
                ${this._iconTemplate(option.value)}
            </sl-menu-item>`;
	}

	_iconTemplate(appname)
	{
		let url = this.egw().image('navbar', appname);
		return html`
            <et2-image style="width: var(--icon-width)" slot="prefix" src="${url}"></et2-image>`;
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-link-apps", Et2LinkAppSelect);