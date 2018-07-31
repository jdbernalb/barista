import { Injectable, Injector, InjectionToken } from '@angular/core';
import { DtToastContainer } from './toast-container';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, PortalInjector } from '@angular/cdk/portal';
import { DtToastRef } from './toast-ref';
import { DT_TOAST_BOTTOM_SPACING, DT_TOAST_DEFAULT_CONFIG, DT_TOAST_PERCEIVE_TIME, DT_TOAST_CHAR_READ_TIME, DT_TOAST_MIN_DURATION, DT_TOAST_CHAR_LIMIT } from './toast-config';
import { DtLogger, DtLoggerFactory } from '@dynatrace/angular-components/core';

const LOG: DtLogger = DtLoggerFactory.create('DtToast');

/** Token for passing the message to the toast */
export const DT_TOAST_MESSAGE = new InjectionToken<string>('DtToastMessage');

@Injectable({providedIn: 'root'})
export class DtToast {

  private _openedToastRef: DtToastRef | null = null;

  constructor(private _overlay: Overlay, private _injector: Injector) {}

  /** Creates a new toast and dismisses the current one if one exists */
  create(message: string): DtToastRef | null {
    if (message === '') {
      LOG.warn('Message must not be null');
      return null;
    }
    const msg = this._fitMessage(message);
    const overlayRef = this._createOverlay();
    const injector = new PortalInjector(this._injector, new WeakMap<InjectionToken<string>, string>([
      [DT_TOAST_MESSAGE, msg],
    ]));
    const containerPortal = new ComponentPortal(DtToastContainer, null, injector);
    const containerRef = overlayRef.attach(containerPortal);
    const container = containerRef.instance;

    const duration = this._calculateToastDuration(msg);
    const toastRef = new DtToastRef(container, duration, overlayRef);

    this._animateDtToastContainer(toastRef);
    this._openedToastRef = toastRef;
    return this._openedToastRef;
  }

  /** Dismiss the  */
  dismiss(): void {
    if (this._openedToastRef) {
      this._openedToastRef.dismiss();
    }
  }

  /** Creates a new overlay */
  private _createOverlay(): OverlayRef {

    const positionStrategy = this._overlay
      .position()
      .global()
      .centerHorizontally()
      .bottom(`${DT_TOAST_BOTTOM_SPACING}px`);

    return this._overlay.create({ ...DT_TOAST_DEFAULT_CONFIG, positionStrategy });
  }

  /** Calculates the duration the toast is shown based on the message length */
  private _calculateToastDuration(message: string): number {
    return Math.max(DT_TOAST_PERCEIVE_TIME + DT_TOAST_CHAR_READ_TIME * message.length, DT_TOAST_MIN_DURATION);
  }

  /** Animates the toast components and handles multiple toasts at the same time  */
  private _animateDtToastContainer(toastRef: DtToastRef): void {
    /** clean up reference when no new toast was created in the meantime */
    toastRef.afterDismissed().subscribe(() => {
      if (this._openedToastRef === toastRef) {
        this._openedToastRef = null;
      }
    });

    /** check if there is already one toast open */
    if (this._openedToastRef) {
      /** wait until the open toast is dismissed - then open the new one */
      this._openedToastRef.afterDismissed().subscribe(() => {
        toastRef.containerInstance.enter();
      });
      /** dismiss the current open toast */
      this._openedToastRef.dismiss();
    } else {
      toastRef.containerInstance.enter();
    }

    toastRef.afterOpened().subscribe(() => { toastRef._dismissAfterTimeout(); });
  }

  private _fitMessage(message: string): string {
    if (message.length > DT_TOAST_CHAR_LIMIT) {
      LOG.warn(`Maximum lenght for toast message exceeded for message: "${message}".
        A maximum length of ${DT_TOAST_CHAR_LIMIT} character is allowed`);
      return message.slice(0, DT_TOAST_CHAR_LIMIT);
    }
    return message;
  }
}