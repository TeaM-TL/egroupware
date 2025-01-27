/**
 * EGroupware eTemplate2 - Select WebComponent
 *
 * @license http://opensource.org/licenses/gpl-license.php GPL - GNU General Public License
 * @package api
 * @link https://www.egroupware.org
 * @author Nathan Gray
 */


import {css, html, PropertyValues, TemplateResult} from "@lion/core";
import {Et2StaticSelectMixin, StaticOptions} from "./StaticOptions";
import {Et2widgetWithSelectMixin} from "./Et2WidgetWithSelectMixin";
import {SelectOption} from "./FindSelectOptions";
import {SlMenuItem, SlSelect} from "@shoelace-style/shoelace";
import shoelace from "../Styles/shoelace";
import {Et2WithSearchMixin} from "./SearchMixin";
import {Et2Tag} from "./Tag/Et2Tag";
import {LionValidationFeedback} from "@lion/form-core";
import {RowLimitedMixin} from "../Layout/RowLimitedMixin";

// export Et2WidgetWithSelect which is used as type in other modules
export class Et2WidgetWithSelect extends RowLimitedMixin(Et2widgetWithSelectMixin(SlSelect))
{
};

/**
 * Select widget
 *
 * At its most basic, you can select one option from a list provided.  The list can be passed from the server in
 * the sel_options array or options can be added as children in the template.  Some extending classes provide specific
 * options, such as Et2SelectPercent or Et2SelectCountry.  All provided options will be mixed together and used.
 *
 * To allow selecting more than one option, use the attribute multiple="true".   This will take & return an array
 * as value instead of just a string.
 *
 * SearchMixin adds additional abilities to ALL select boxes
 * @see Et2WithSearchMixin
 *
 * Override for extending widgets:
 * # Custom display of selected value
 * 	When selecting a single value (!multiple) you can override doLabelChange() to customise the displayed label
 * 	@see Et2SelectCategory, which adds in the category icon
 *
 * # Custom option rows
 *  Options can have 'class' and 'icon' properties that will be used for the option
 * 	The easiest way for further customisation to use CSS in an external file (like etemplate2.css) and ::part().
 * 	@see Et2SelectCountry which displays flags via CSS instead of using SelectOption.icon
 *
 * # Custom tags
 * 	When multiple is set, instead of a single value each selected value is shown in a tag.  While it's possible to
 * 	use CSS to some degree, we can also use a custom tag class that extends Et2Tag.
 * 	1.  Create the extending class
 * 	2.  Make sure it's loaded (add to etemplate2.ts)
 * 	3.  In your extending Et2Select, override get tagTag() to return the custom tag name
 *
 */
// @ts-ignore SlSelect styles is a single CSSResult, not an array, so TS complains
export class Et2Select extends Et2WithSearchMixin(Et2WidgetWithSelect)
{
	static get styles()
	{
		return [
			// Parent (SlSelect) returns a single cssResult, not an array
			shoelace,
			super.styles,
			css`
			:host {
				display: block;
				flex: 1 0 auto;
				--icon-width: 20px;
			}
			
			
			::slotted(img), img {
				vertical-align: middle;
			}
			
			/* Get rid of padding before/after options */
			sl-menu::part(base) {
				padding: 0px;
			}
			/* No horizontal scrollbar, even if options are long */
			.dropdown__panel {
				overflow-x: clip;
			}
			/* Ellipsis when too small */
			.select__label {
				display: block;
    			text-overflow: ellipsis;
    			/* This is usually not used due to flex, but is the basis for ellipsis calculation */
    			width: 10ex;
			}

			/** multiple=true uses tags for each value **/
			/* styling for icon inside tag (not option) */
			.tag_image {
				margin-right: var(--sl-spacing-x-small);
			}
			/* Maximum height + scrollbar on tags (+ other styling) */
			.select__tags {
				margin-left: 0px;
				max-height: initial;
				overflow-y: auto;
				gap: 0.1rem 0.5rem;
			}
			:host([rows]) .select__tags {
				max-height: calc(var(--rows, 5) * 1.35rem);
			}
			/* Keep overflow tag right-aligned.  It's the only sl-tag. */
			 .select__tags sl-tag {
				margin-left: auto;
			}	
			select:hover {
				box-shadow: 1px 1px 1px rgb(0 0 0 / 60%);
			}`
		];
	}

	static get properties()
	{
		return {
			...super.properties,
			/**
			 * Toggle between single and multiple selection
			 */
			multiple: {
				type: Boolean,
				reflect: true,
			}
		}
	}

	/**
	 * List of properties that get translated
	 *
	 * @returns object
	 */
	static get translate()
	{
		return {
			...super.translate,
			emptyLabel: true
		}
	}

	get slots()
	{
		return {
			...super.slots,
			input: () =>
			{
				return document.createElement("select");
			}
		}
	}

	constructor(...args : any[])
	{
		super();
		// We want this on more often than off
		this.hoist = true;
		
		this._triggerChange = this._triggerChange.bind(this);
		this._doResize = this._doResize.bind(this);
		this._handleMouseWheel = this._handleMouseWheel.bind(this);
	}

	connectedCallback()
	{
		super.connectedCallback();

		this.addEventListener("mousewheel", this._handleMouseWheel);

		this.updateComplete.then(() =>
		{
			this.addEventListener("sl-change", this._triggerChange);
			this.addEventListener("sl-after-show", this._doResize)
		});
	}

	disconnectedCallback()
	{
		super.disconnectedCallback();

		this.removeEventListener("mousewheel", this._handleMouseWheel);
		this.removeEventListener("sl-clear", this._triggerChange)
		this.removeEventListener("sl-change", this._triggerChange);
		this.removeEventListener("sl-after-show", this._doResize);
	}

	firstUpdated(changedProperties?)
	{
		super.firstUpdated(changedProperties);
	}

	_triggerChange(e)
	{
		if(super._triggerChange(e))
		{
			this.dispatchEvent(new Event("change"));
		}
	}

	/**
	 * Change the menu sizing to allow the menu to be wider than the field width, but no smaller
	 *
	 * @param e
	 * @private
	 */
	private _doResize(e)
	{
		this.menu.style.minWidth = this.menu.style.width;
		this.menu.style.width = "";
	}

	/**
	 * Stop scroll from bubbling so the sidemenu doesn't scroll too
	 *
	 * @param {MouseEvent} e
	 */
	private _handleMouseWheel(e : MouseEvent)
	{
		e.stopPropagation();
	}

	/**
	 * Get the node where we're putting the selection options
	 *
	 * @returns {HTMLElement}
	 */
	get _optionTargetNode() : HTMLElement
	{
		return <HTMLElement><unknown>this;
	}

	/**
	 * Handle the case where there is no value set, or the value provided is not an option.
	 * If this happens, we choose the first option or empty label.
	 *
	 * Careful when this is called.  We change the value here, so an infinite loop is possible if the widget has
	 * onchange.
	 *
	 * @private
	 */
	private fix_bad_value()
	{
		if(this.multiple || (!this.emptyLabel && (!Array.isArray(this.select_options) || this.select_options.length == 0)))
		{
			// Nothing to do here
			return;
		}
		// See if parent (search / free entry) is OK with it
		if(super.fix_bad_value())
		{
			return;
		}
		// If somebody gave '' as a select_option, let it be
		if(this.value === '' && this.select_options.filter((option) => this.value === option.value).length == 1)
		{
			return;
		}
		// If no value is set, choose the first option
		// Only do this on once during initial setup, or it can be impossible to clear the value
		const valueArray = Array.isArray(this.value) ? this.value : (!this.value ? [] : this.value.toString().split(','));

		// value not in options --> use emptyLabel, if exists, or first option otherwise
		if(this.select_options.filter((option) => valueArray.find(val => val == option.value)).length === 0)
		{
			let oldValue = this.value;
			this.value = this.emptyLabel ? "" : "" + this.select_options[0]?.value;
			// ""+ to cast value of 0 to "0", to not replace with ""
			this.requestUpdate("value", oldValue);
		}
	}

	/**
	 * @deprecated use this.multiple = multi
	 *
	 * @param multi
	 */
	set_multiple(multi)
	{
		this.multiple = multi;
	}

	set_value(val : string | string[] | number | number[])
	{
		if(typeof val === 'string' && val.indexOf(',') !== -1)
		{
			val = val.split(',');
		}
		if(typeof val === 'number')
		{
			val = val.toString();
		}
		if(Array.isArray(val))
		{
			val = val.map(v => typeof v === 'number' ? v.toString() : v || '');
		}
		this.value = val || '';
	}

	transformAttributes(attrs)
	{
		super.transformAttributes(attrs);

		// Deal with initial value of multiple set as CSV
		if(this.multiple && typeof this.value == "string")
		{
			this.value = this.value.length ? this.value.split(",") : [];
		}
	}

	/**
	 * Load extra stuff from the template node.
	 * Overridden from parent to force value to be "good", since this is the earliest place we have both value and
	 * select options when loading from a template.
	 *
	 * @param {Element} _node
	 */
	loadFromXML(_node : Element)
	{
		super.loadFromXML(_node);
		this.fix_bad_value();
	}

	/** @param {import('@lion/core').PropertyValues } changedProperties */
	willUpdate(changedProperties : PropertyValues)
	{
		super.willUpdate(changedProperties);

		if(changedProperties.has('select_options') || changedProperties.has("value") || changedProperties.has('emptyLabel'))
		{
			this.fix_bad_value();
		}
		if(changedProperties.has("select_options") && changedProperties.has("value"))
		{
			// Re-set value, the option for it may have just shown up
			this.updateComplete.then(() => this.syncItemsFromValue())
		}
	}

	/**
	 * Override this method from SlSelect to stick our own tags in there
	 */
	syncItemsFromValue()
	{
		if(typeof super.syncItemsFromValue === "function")
		{
			super.syncItemsFromValue();
		}

		// Only applies to multiple
		if(typeof this.displayTags !== "object" || !this.multiple)
		{
			return;
		}

		let overflow = null;
		if(this.maxTagsVisible > 0 && this.displayTags.length > this.maxTagsVisible)
		{
			overflow = this.displayTags.pop();
		}
		const checkedItems = Object.values(this._menuItems).filter(item => this.value.includes(item.value));
		this.displayTags = checkedItems.map(item => this._createTagNode(item));

		// Re-slice & add overflow tag
		if(overflow)
		{
			this.displayTags = this.displayTags.slice(0, this.maxTagsVisible);
			this.displayTags.push(overflow);
		}
	}

	_emptyLabelTemplate() : TemplateResult
	{
		if(!this.emptyLabel || this.multiple)
		{
			return html``;
		}
		return html`
            <sl-menu-item value="">${this.emptyLabel}</sl-menu-item>`;
	}

	/**
	 * Tag used for rendering options
	 * Used for finding & filtering options, they're created by the mixed-in class
	 * @returns {string}
	 */
	public get optionTag()
	{
		return "sl-menu-item";
	}


	_optionTemplate(option : SelectOption) : TemplateResult
	{
		let icon = option.icon ? html`
            <et2-image slot="prefix" part="icon" style="width: var(--icon-width)"
                       src="${option.icon}"></et2-image>` : "";

		// Tag used must match this.optionTag, but you can't use the variable directly.
		// Pass option along so SearchMixin can grab it if needed
		return html`
            <sl-menu-item value="${option.value}" title="${!option.title || this.noLang ? option.title : this.egw().lang(option.title)}" class="${option.class}" .option=${option}>
                ${icon}
                ${this.noLang ? option.label : this.egw().lang(option.label)}
            </sl-menu-item>`;
	}

	/**
	 * Tag used for rendering tags when multiple=true
	 * Used for creating, finding & filtering options.
	 * @see createTagNode()
	 * @returns {string}
	 */
	public get tagTag()
	{
		return "et2-tag";
	}

	/**
	 * Customise how tags are rendered.  This overrides what SlSelect
	 * does in syncItemsFromValue().
	 * This is a copy+paste from SlSelect.syncItemsFromValue().
	 *
	 * @param item
	 * @protected
	 */
	protected _createTagNode(item)
	{
		const tag = <Et2Tag>document.createElement(this.tagTag);
		tag.value = item.value;
		tag.textContent = item.getTextLabel().trim();
		tag.class = item.classList.value + " search_tag";
		if(this.size)
		{
			tag.size = this.size;
		}
		if(this.readonly)
		{
			tag.removable = false;
			tag.readonly = true;
		}
		else
		{
			tag.addEventListener("dblclick", this._handleDoubleClick);
			tag.addEventListener("click", this.handleTagInteraction);
			tag.addEventListener("keydown", this.handleTagInteraction);
			tag.addEventListener("sl-remove", (event) =>
			{
				event.stopPropagation();
				if(!this.disabled)
				{
					item.checked = false;
					this.syncValueFromItems();
				}
			});
		}
		let image = this._createImage(item);
		if(image)
		{
			tag.prepend(image);
		}
		return tag;
	}

	protected _createImage(item)
	{
		let image = item.querySelector("et2-image");
		if(image)
		{
			image = image.clone();
			image.slot = "prefix";
			image.class = "tag_image";
			return image;
		}
		return "";
	}

	public get _menuItems() : HTMLElement[]
	{
		return [...this.querySelectorAll<SlMenuItem>(this.optionTag)];
	}


	/**
	 * Override parent to always call validate(), as our simple implementation needs to validate on clear as well.
	 *
	 * @param {string | false} err
	 */
	set_validation_error(err : string | false)
	{
		super.set_validation_error(err);
		if(err == false)
		{
			this.validate();
		}
	}
}

customElements.define("et2-select", Et2Select);
if(typeof customElements.get("lion-validation-feedback") === "undefined")
{
	customElements.define("lion-validation-feedback", LionValidationFeedback);
}
/**
 * Use a single StaticOptions, since it should have no state
 * @type {StaticOptions}
 */
const so = new StaticOptions();


export class Et2SelectApp extends Et2StaticSelectMixin(Et2Select)
{
	constructor()
	{
		super();

		this.static_options = so.app(this, {other: this.other || []});
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-app", Et2SelectApp);

export class Et2SelectTab extends Et2SelectApp
{
	constructor()
	{
		super();

		this.allowFreeEntries = true;
	}

	set value(new_value)
	{
		if(!new_value)
		{
			super.value = new_value;
			return;
		}
		const values = Array.isArray(new_value) ? new_value : [new_value];
		const options = this.select_options;
		values.forEach(value =>
		{
			if(!options.filter(option => option.value == value).length)
			{
				const matches = value.match(/^([a-z0-9]+)\-/i);
				let option : SelectOption = {value: value, label: value};
				if(matches)
				{
					option = options.filter(option => option.value == matches[1])[0] || {
						value: value,
						label: this.egw().lang(matches[1])
					};
					option.value = value;
					option.label += ' ' + this.egw().lang('Tab');
				}
				try {
					const app = opener?.framework.getApplicationByName(value);
					if (app && app.displayName)
					{
						option.label = app.displayName;
					}
				}
				catch (e) {
					// ignore security exception, if opener is not accessible
				}
				this.select_options.concat(option);
			}
		})
		super.value = new_value;
	}

	get value()
	{
		return super.value;
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-tab", Et2SelectTab);

export class Et2SelectBitwise extends Et2StaticSelectMixin(Et2Select)
{
	set value(new_value)
	{
		let oldValue = this._value;
		let expanded_value = [];
		let options = this.select_options;
		for(let index in options)
		{
			let right = parseInt(options[index].value);
			if(!!(new_value & right))
			{
				expanded_value.push(right);
			}
		}
		super.value = expanded_value;

		this.requestUpdate("value", oldValue);
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-bitwise", Et2SelectBitwise);

export class Et2SelectBool extends Et2StaticSelectMixin(Et2Select)
{
	constructor()
	{
		super();

		this.static_options = so.bool(this);
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-bool", Et2SelectBool);


export class Et2SelectDay extends Et2StaticSelectMixin(Et2Select)
{
	constructor()
	{
		super();

		this.static_options = so.day(this, {other: this.other || []});
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-day", Et2SelectDay);

export class Et2SelectDayOfWeek extends Et2StaticSelectMixin(Et2Select)
{
	constructor()
	{
		super();

		this.static_options = so.dow(this, {other: this.other || []});
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-dow", Et2SelectDayOfWeek);

export class Et2SelectHour extends Et2StaticSelectMixin(Et2Select)
{
	constructor()
	{
		super();

		this.static_options = so.hour(this, {other: this.other || []});
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-hour", Et2SelectHour);

export class Et2SelectMonth extends Et2StaticSelectMixin(Et2Select)
{
	constructor()
	{
		super();

		this.static_options = so.month(this);
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-month", Et2SelectMonth);

export class Et2SelectNumber extends Et2StaticSelectMixin(Et2Select)
{
	static get properties()
	{
		return {
			...super.properties,
			/**
			 * Step between numbers
			 */
			interval: {type: Number},
			min: {type: Number},
			max: {type: Number},

			/**
			 * Add one or more leading zeros
			 * Set to how many zeros you want (000)
			 */
			leading_zero: {type: String},
			/**
			 * Appended after every number
			 */
			suffix: {type: String}
		}
	}

	constructor()
	{
		super();
		this.min = 1;
		this.max = 10;
		this.interval = 1;
		this.leading_zero = "";
		this.suffix = "";
	}

	updated(changedProperties : PropertyValues)
	{
		super.updated(changedProperties);

		if(changedProperties.has('min') || changedProperties.has('max') || changedProperties.has('interval') || changedProperties.has('suffix'))
		{
			this.static_options = so.number(this);
			this.requestUpdate("select_options");
		}
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-number", Et2SelectNumber);

export class Et2SelectPercent extends Et2SelectNumber
{
	constructor()
	{
		super();
		this.min = 0;
		this.max = 100;
		this.interval = 10;
		this.suffix = "%%";
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-percent", Et2SelectPercent);

export class Et2SelectPriority extends Et2StaticSelectMixin(Et2Select)
{
	constructor()
	{
		super();

		this.static_options = so.priority(this);
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-priority", Et2SelectPriority);

export class Et2SelectState extends Et2StaticSelectMixin(Et2Select)
{
	/**
	 * Two-letter ISO country code
	 */
	protected __country_code;

	static get properties()
	{
		return {
			...super.properties,
			country_code: String,
		}
	}

	constructor()
	{
		super();

		this.country_code = 'DE';
	}

	get country_code()
	{
		return this.__country_code;
	}

	set country_code(code : string)
	{
		this.__country_code = code;
		this.static_options = so.state(this, {country_code: this.__country_code});
		this.requestUpdate("select_options");
	}

	set_country_code(code)
	{
		this.country_code = code;
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-state", Et2SelectState);

export class Et2SelectTimezone extends Et2StaticSelectMixin(Et2Select)
{
	constructor()
	{
		super();

		this.select_options = so.timezone(this, {other: this.other || []});
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-timezone", Et2SelectTimezone);

export class Et2SelectYear extends Et2SelectNumber
{
	constructor()
	{
		super();
		this.min = -3;
		this.max = 2;
	}

	updated(changedProperties : PropertyValues)
	{
		super.updated(changedProperties);

		if(changedProperties.has('min') || changedProperties.has('max') || changedProperties.has('interval') || changedProperties.has('suffix'))
		{
			this.select_options = so.year(this);
		}
	}
}

// @ts-ignore TypeScript is not recognizing that this widget is a LitElement
customElements.define("et2-select-year", Et2SelectYear);