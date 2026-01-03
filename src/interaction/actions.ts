/* eslint-disable import/order */
/**
 * Action handling for Calendar Card Pro
 *
 * This module contains functions for processing and executing
 * user actions (tap, hold, etc.)
 */

import * as Types from '../config/types';
import * as Logger from '../utils/logger';

//-----------------------------------------------------------------------------
// PUBLIC API
//-----------------------------------------------------------------------------

/**
 * Extract primary entity ID from configured entities
 *
 * @param entities - Entity configuration array
 * @returns The primary entity ID or undefined if not available
 */
export function getPrimaryEntityId(
  entities: Array<string | Types.EntityConfig>,
): string | undefined {
  if (!entities || !entities.length) return undefined;

  const firstEntity = entities[0];
  return typeof firstEntity === 'string' ? firstEntity : firstEntity.entity;
}

/**
 * Handle an action based on its configuration
 *
 * @param actionConfig - Action configuration object
 * @param hass - Home Assistant interface
 * @param element - Element that triggered the action
 * @param entityId - Optional entity ID for the action
 * @param toggleCallback - Optional callback for toggle action
 */
export function handleAction(
  actionConfig: Types.ActionConfig,
  hass: Types.Hass | null,
  element: Element,
  entityId?: string,
  toggleCallback?: () => void,
): void {
  if (!actionConfig || !hass) return;

  const ctx: Types.ActionContext = {
    element,
    hass,
    entityId,
    toggleCallback,
  };

  // Execute different types of actions based on the configuration
  switch (actionConfig.action) {
    case 'more-info':
      fireMoreInfo(entityId, ctx);
      break;

    case 'navigate':
      if (actionConfig.navigation_path) {
        navigate(actionConfig.navigation_path, ctx);
      }
      break;

    case 'url':
      if (actionConfig.url_path) {
        openUrl(actionConfig.url_path, ctx);
      }
      break;

    case 'toggle':
      if (toggleCallback) {
        toggleCallback();
      }
      break;

    case 'expand': // Add this case to handle the expand action
      if (toggleCallback) {
        toggleCallback();
      }
      break;

    case 'call-service': {
      if (!actionConfig.service) return;

      const [domain, service] = actionConfig.service.split('.', 2);
      if (!domain || !service) return;

      hass.callService(domain, service, actionConfig.service_data || {});
      break;
    }

    case 'fire-dom-event': {
      fireDomEvent(element, ctx);
      break;
    }

    case 'none':
    default:
      // Do nothing for 'none' action
      break;
  }
}

export function handleEventAction(
  actionConfig: Types.ActionConfig,
  hass: Types.Hass | null,
  element: Element,
  eventData: Types.CalendarEventData,
  entityId?: string,
  toggleCallback?: () => void,
): void {
  if (!actionConfig || !hass) return;

  const ctx: Types.ActionContext = {
    element,
    hass,
    entityId,
    toggleCallback,
  };

  switch (actionConfig.action) {
    case 'show-event-details':
      showEventDetails(eventData, ctx);
      break;
    default:
      handleAction(actionConfig, hass, element, entityId, toggleCallback);
      break;
  }
}

//-----------------------------------------------------------------------------
// PRIVATE ACTION HANDLERS
//-----------------------------------------------------------------------------

/**
 * Fire more-info event for an entity
 *
 * @param entityId - Entity ID to show more info for
 * @param ctx - Action context
 */
function fireMoreInfo(entityId: string | undefined, ctx: Types.ActionContext): void {
  if (!entityId) return;

  // Create and dispatch a Home Assistant more-info event
  const event = new CustomEvent('hass-more-info', {
    bubbles: true,
    composed: true,
    detail: { entityId },
  });

  ctx.element.dispatchEvent(event);
  Logger.debug(`Fired more-info event for ${entityId}`);
}

/**
 * Navigate to a path in Home Assistant
 *
 * @param path - Navigation path
 * @param ctx - Action context
 */
function navigate(path: string, ctx: Types.ActionContext): void {
  // Create and dispatch a location-changed event
  const event = new CustomEvent('location-changed', {
    bubbles: true,
    composed: true,
    detail: { replace: false },
  });

  // Use window.history for navigation
  if (window.history) {
    window.history.pushState(null, '', path);
  }

  // Dispatch the event to notify HA of the navigation
  ctx.element.dispatchEvent(event);
  Logger.debug(`Navigated to ${path}`);
}

/**
 * Open a URL in a new tab or the current window
 *
 * @param path - URL to open
 * @param ctx - Action context
 */
function openUrl(path: string, _ctx: Types.ActionContext): void {
  window.open(path, '_blank');
  Logger.debug(`Opened URL ${path}`);
}

/**
 * Fire a DOM event for custom handlers
 *
 * @param element - Element to fire the event from
 * @param ctx - Action context
 */
function fireDomEvent(element: Element, _ctx: Types.ActionContext): void {
  const event = new Event('calendar-card-action', {
    bubbles: true,
    composed: true,
  });

  element.dispatchEvent(event);
  Logger.debug('Fired DOM event calendar-card-action');
}

// Adapted directly from Home Assistant's show-dialog-calendar-event-detail.ts
/**
 * Open a dialog to show calendar event details
 * @param eventData - The calendar event data to display
 * @param ctx - Action context
 */
function showEventDetails(eventData: Types.CalendarEventData, ctx: Types.ActionContext): void {
  const event = new Event('show-dialog', {
    bubbles: true,
    composed: true,
  });
  // // check for permissions to update or delete the event
  // const canEdit = EventUtils.entitySupportsFeature(eventData._entityId ?? '', ctx.hass, Constants.CalendarEntityFeature.UPDATE_EVENT);
  // const canDelete = EventUtils.entitySupportsFeature(eventData._entityId ?? '', ctx.hass, Constants.CalendarEntityFeature.DELETE_EVENT);

  // // // get the event data in the expected format
  // const dialogParams = {
  //   calendarId: eventData._entityId ?? '',
  //   canEdit,
  //   canDelete,
  //   updated: () => {
  //     ctx.element.updateEvents(true);
  //   },
  //   entry: {
  //     dtstart: eventData.start.dateTime ?? eventData.start.date ?? '',
  //     dtend: eventData.end.dateTime ?? eventData.end.date ?? '',
  //     summary: eventData.summary ?? '',
  //     description: eventData.description ?? '',
  //     location: eventData.location ?? '',
  //     recurrence_id: eventData.recurrence_id ?? undefined,
  //     rrule: eventData.rrule ?? undefined,
  //     uid: eventData.uid ?? undefined,
  //   }
  // };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event as any).detail = {
    dialogTag: 'calendar-card-pro-dev-event-detail-dialog',
    dialogImport: async () => {
      return;
    },
    dialogParams: {
      event: eventData,
      hass: ctx.hass!,
      card: ctx.element,
      updated: () => {
        if (
          ctx.element &&
          'updateEvents' in ctx.element &&
          typeof ctx.element['updateEvents'] === 'function'
        ) {
          ctx.element['updateEvents'](true);
        }
      },
    },
  };
  ctx.element.dispatchEvent(event);
  Logger.debug('Dispatched show-calendar-event-details event', event);
}
