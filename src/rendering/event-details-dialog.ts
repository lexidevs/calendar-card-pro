import { mdiCalendarClock, mdiClose } from '@mdi/js';
import { CSSResultGroup, LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import * as Types from '../config/types';
import * as Logger from '../utils/logger';
import * as FormatUtils from '../utils/format';

@customElement('calendar-card-pro-dev-event-detail-dialog')
export class EventDetailDialog extends LitElement {
  @property({ attribute: false }) hass?: Types.Hass;
  @property({ attribute: false }) card?: HTMLElement & {
    config: Types.Config;
    effectiveLanguage: string;
  };
  @state() private _event!: Types.CalendarEventData;
  @state() private _updated!: () => void;

  public async showDialog(params: Types.CalendarEventDetailsDialogParams): Promise<void> {
    this.hass = params.hass;
    this.card = params.card as
      | (HTMLElement & { config: Types.Config; effectiveLanguage: string })
      | undefined;
    this._event = params.event;
    this._updated = params.updated;
    Logger.debug('Event detail dialog opened', this, params);
  }

  public closeDialog(): void {
    this._event = undefined!;
    this._updated = undefined!;
    this.card = undefined!;
    const ev = new Event('dialog-closed', { bubbles: true, composed: true });
    // TODO: fix type
    // @ts-expect-error haven't created a type for event w/ detail yet
    ev.detail = { dialog: this.localName };
    this.dispatchEvent(ev);
    Logger.debug('Event detail dialog closed');
  }

  protected render() {
    if (!this._event) {
      return html``;
    }
    const stateObj = this.hass?.states[this._event._entityId ?? ''];
    return html`
      <ha-dialog
        open
        @closed="${this.closeDialog}"
        scrimClickAction
        escapeKeyAction
        .heading=${html` <div class="header_title">
          <ha-icon-button
            .label=${this.hass?.localize('ui.common.close') ?? 'Close'}
            .path=${mdiClose}
            dialogAction="close"
            class="header_button"
          ></ha-icon-button>
          <span>${this._event.summary}</span>
        </div>`}
      >
        <div class="content">
          <div class="field">
            <ha-svg-icon .path=${mdiCalendarClock}></ha-svg-icon>
            ${this._renderValue()}
            </div>
          </div>

          <div class="attribute">
            <state-info .hass=${this.hass} .stateObj=${stateObj} in-dialog></state-info>
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private _renderValue() {
    // From the event data, format the date/time for display
    if (!this.card || !this.hass) {
      return '';
    }

    const eventTime = FormatUtils.formatEventTime(
      this._event,
      this.card?.config,
      this.card?.effectiveLanguage,
      this.hass,
    );
    const eventLocation = this._event.location
      ? FormatUtils.formatLocation(this._event.location, this.card?.config.remove_location_country)
      : '';

    return html` <div class="value">
      ${eventTime} <br />
      ${this._event.location ? html`${eventLocation} <br />` : ''}
      ${this._event.description
        ? html`<br />
            <div class="description">${this._event.description}</div>`
        : ''}
    </div>`;
  }

  // copied directly from frontend/src/panels/calendar/dialog-calendar-event-detail.ts
  static get styles(): CSSResultGroup {
    return [
      css`
        /* mwc-dialog (ha-dialog) styles */
        ha-dialog {
          --mdc-dialog-min-width: 400px;
          --mdc-dialog-max-width: 600px;
          --mdc-dialog-max-width: min(600px, 95vw);
          --justify-action-buttons: space-between;
          --dialog-container-padding: var(--safe-area-inset-top, 0) var(--safe-area-inset-right, 0)
            var(--safe-area-inset-bottom, 0) var(--safe-area-inset-left, 0);
          --dialog-surface-padding: 0px;
        }

        ha-dialog .form {
          color: var(--primary-text-color);
        }

        a {
          color: var(--primary-color);
        }

        /* make dialog fullscreen on small screens */
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: 100vw;
            --mdc-dialog-max-width: 100vw;
            --mdc-dialog-min-height: 100vh;
            --mdc-dialog-min-height: 100svh;
            --mdc-dialog-max-height: 100vh;
            --mdc-dialog-max-height: 100svh;
            --dialog-container-padding: 0px;
            --dialog-surface-padding: var(--safe-area-inset-top, 0) var(--safe-area-inset-right, 0)
              var(--safe-area-inset-bottom, 0) var(--safe-area-inset-left, 0);
            --vertical-align-dialog: flex-end;
            --ha-dialog-border-radius: var(--ha-border-radius-square);
          }
        }
        .error {
          color: var(--error-color);
        }
      `,
      css`
        state-info {
          margin-top: 24px;
        }
        ha-svg-icon {
          width: 40px;
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
          direction: var(--direction);
          vertical-align: top;
        }
        .field {
          display: flex;
        }
        .description {
          color: var(--secondary-text-color);
          max-width: 300px;
          overflow-wrap: break-word;
        }
      `,
    ];
  }
}
