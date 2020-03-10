/**
 * @license
 * Copyright 2020 Dynatrace LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  Output,
  ViewChild,
  ViewEncapsulation,
  OnDestroy,
} from '@angular/core';
import {
  clamp,
  roundToDecimal,
  isDefined,
} from '@dynatrace/barista-components/core';
import { DtInput } from '@dynatrace/barista-components/input';
import {
  fromEvent,
  animationFrameScheduler,
  Subject,
  merge,
  BehaviorSubject,
  of,
  Observable,
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  switchMap,
  takeUntil,
  observeOn,
  share,
  withLatestFrom,
  tap,
  debounceTime,
  filter,
} from 'rxjs/operators';
import {
  LEFT_ARROW,
  DOWN_ARROW,
  RIGHT_ARROW,
  UP_ARROW,
  HOME,
  END,
  PAGE_UP,
  PAGE_DOWN,
} from '@angular/cdk/keycodes';

let uniqueId = 0;

const KEY_CODES_ARRAY: Array<number> = [
  LEFT_ARROW,
  DOWN_ARROW,
  RIGHT_ARROW,
  UP_ARROW,
  HOME,
  END,
  PAGE_UP,
  PAGE_DOWN,
];

@Component({
  selector: 'dt-slider',
  templateUrl: 'slider.html',
  styleUrls: ['slider.scss'],
  host: {
    class: 'dt-slider',
  },
  encapsulation: ViewEncapsulation.Emulated,
  exportAs: 'dtSlider',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtSlider implements AfterViewInit, OnDestroy {
  private _roundShift: number = 0;

  /** @internal Unique id for this input. */
  _labelUid = `dt-slider-label-${uniqueId++}`;

  private _value$ = new BehaviorSubject<number>(30);
  private _clientRect$: Observable<ClientRect>;
  private _resizeObserver$ = new Subject();
  private _observer: ResizeObserver;
  private inputFieldValue$ = new Subject<number>();

  @Input() min: number = 0;
  @Input() max: number = 100;

  @Input()
  get step(): number {
    return this._step;
  }
  set step(value: number) {
    if (isDefined(value)) {
      this._step = value;
    }

    this._roundShift = 0;
    // deal with rounding problems.
    let countingStep = this._step;

    while (countingStep % 1 !== 0) {
      countingStep *= 10;
      this._roundShift++;
    }
  }
  private _step: number = 5;

  @Input() disabled: boolean = false;

  @Input()
  get value(): number {
    return this._value$.value;
  }
  set value(value: number) {
    this._value$.next(value);
  }

  inputValueChanged(event: Event): void {
    /**
     * Convert input string value to number and call
     * roundToSnap takes care of snapping the values to the steps
     */
    const rounded = roundToSnap(
      +(event.currentTarget as HTMLInputElement).value,
      this.step,
      this.min,
      this.max,
    );
    this.inputFieldValue$.next(rounded);
  }

  @Output() change = new EventEmitter<number>();

  /** @internal Holds the track wrapper */
  @ViewChild('trackWrapper', { static: true })
  _trackWrapper: ElementRef<HTMLDivElement>;

  /** @internal Holds the thumb */
  @ViewChild('thumb', { static: true })
  _thumb: ElementRef<HTMLDivElement>;

  /** @internal Holds the slider fill */
  @ViewChild('sliderFill', { static: true })
  _sliderFill: ElementRef<HTMLDivElement>;

  /** @internal Holds the slider background */
  @ViewChild('sliderBackground', { static: true })
  _sliderBackground: ElementRef<HTMLDivElement>;

  /** @internal Holds the slider input field */
  @ViewChild(DtInput, { static: true })
  _sliderInput: DtInput;

  private _destroy$ = new Subject<void>();

  constructor(private _zone: NgZone) {}

  ngAfterViewInit(): void {
    this._observer = new ResizeObserver(() => {
      this._resizeObserver$.next();
    });

    this._observer.observe(this._trackWrapper.nativeElement);

    this._clientRect$ = merge(
      this._resizeObserver$.pipe(debounceTime(50)),
      of(null),
    ).pipe(
      map(() => this._trackWrapper.nativeElement.getBoundingClientRect()),
      takeUntil(this._destroy$),
    );

    this._zone.runOutsideAngular(() => {
      this._captureEvents();
    });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
    this._observer.unobserve(this._trackWrapper.nativeElement);
  }

  private _updateInput(value: number): void {
    this._sliderInput.value = value.toString();
  }

  private _captureEvents(): void {
    const start$ = merge(
      fromEvent(this._trackWrapper.nativeElement, 'mousedown'),
      fromEvent(this._trackWrapper.nativeElement, 'touchstart'),
    );

    const move$ = merge(
      fromEvent<MouseEvent>(window, 'mousemove').pipe(
        map(mouseEvent => mouseEvent.clientX),
      ),
      fromEvent<TouchEvent>(window, 'touchmove').pipe(
        map(touchEvent => touchEvent.changedTouches[0].clientX),
      ),
    );

    const moveEnd$ = merge(
      fromEvent(window, 'mouseup'),
      fromEvent(window, 'touchend'),
    );

    const drag$ = start$.pipe(
      switchMap(() =>
        move$.pipe(
          distinctUntilChanged(),
          observeOn(animationFrameScheduler),
          takeUntil(moveEnd$),
        ),
      ),
      share(),
    );

    const click$ = fromEvent<MouseEvent>(
      this._trackWrapper.nativeElement,
      'click',
    ).pipe(map(mouseEvent => mouseEvent.clientX));

    // stream from keyboard events
    fromEvent<KeyboardEvent>(this._trackWrapper.nativeElement, 'keydown')
      .pipe(
        filter(keyboardEvent =>
          KEY_CODES_ARRAY.includes(keyboardEvent.keyCode),
        ),
        withLatestFrom(this._value$),
        map(([keyboardEvent, value]) => {
          keyboardEvent.stopPropagation(); // global angular keydown would trigger CD.
          const valueAddition = getKeyCodeValue(
            this.max,
            this.step,
            keyboardEvent.keyCode,
          );
          const newValue = clamp(value + valueAddition, this.min, this.max);
          this._value$.next(newValue);
          return newValue;
        }),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe();

    // triggered by drag and click
    merge(drag$, click$)
      .pipe(
        withLatestFrom(this._clientRect$),
        map(([coordinate, { left, width }]) => {
          const newValue = getSliderValueForCoordinate({
            coordinate,
            offset: left,
            width,
            min: this.min,
            max: this.max,
            step: this.step,
            roundShift: this._roundShift,
          });
          this._value$.next(newValue);
          return newValue;
        }),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe();

    this.inputFieldValue$
      .pipe(
        map(value => {
          this._value$.next(roundToSnap(value, this.step, this.min, this.max));
        }),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe();

    this._value$
      .pipe(
        tap(value => {
          this._trackWrapper.nativeElement.setAttribute(
            'aria-valuenow',
            value.toString(),
          );
          this._updateInput(value);
        }),
        withLatestFrom(this._clientRect$),
        map(([value, { left, width }]) =>
          getSliderPositionBasedOnValue({
            value,
            offset: left,
            width,
            min: this.min,
            max: this.max,
            step: this.step,
            roundShift: this._roundShift,
          }),
        ),
        takeUntil(this._destroy$),
      )
      .subscribe(offsetX => {
        this._thumb.nativeElement.style.transform = `translateX(-${100 -
          offsetX * 100}%)`;
        this._sliderFill.nativeElement.style.transform = `scale3d(${offsetX}, 1, 1)`;
        this._sliderBackground.nativeElement.style.transform = `scale3d(${1 -
          offsetX}, 1, 1)`;
      });
  }
}

@Directive({
  selector: `dt-slider-label, [dt-slider-label], [dtSliderLabel]`,
  exportAs: 'dtSliderLabel',
})
export class DtSliderLabel {}

@Directive({
  selector: `dt-slider-unit, [dt-slider-unit], [dtSliderUnit]`,
  exportAs: 'dtSliderUnit',
  host: {
    class: 'dt-slider-unit',
  },
})
export class DtSliderUnit {}

function getSliderValueForCoordinate(config: {
  coordinate: number;
  width: number;
  offset: number;
  max: number;
  min: number;
  step: number;
  roundShift: number;
}): number {
  const valueRange = config.max - config.min;
  const sliderWidth = config.width;
  const distanceFromStart = config.coordinate - config.offset;

  const clamped = clamp(
    config.min + (distanceFromStart / sliderWidth) * valueRange,
    config.min,
    config.max,
  );
  const snapped = roundToSnap(clamped, config.step, config.min, config.max);
  return roundToDecimal(snapped, config.roundShift);
}

function roundToSnap(
  inputValue: number,
  step: number,
  min: number,
  max: number,
): number {
  return clamp(Math.round(inputValue / step) * step, min, max);
}

function getSliderPositionBasedOnValue(config: {
  value: number;
  min: number;
  max: number;
  offset: number;
  width: number;
  step: number;
  roundShift: number;
}): number {
  const snappedValue = roundToSnap(
    config.value,
    config.step,
    config.min,
    config.max,
  );
  const roundedValue = roundToDecimal(snappedValue, config.roundShift);
  return (roundedValue - config.min) / (config.max - config.min);
}

function getKeyCodeValue(max: number, step: number, keyCode: number): number {
  switch (keyCode) {
    case LEFT_ARROW:
    case DOWN_ARROW:
      return -step;
    case RIGHT_ARROW:
    case UP_ARROW:
      return step;
    case HOME:
      return -max;
    case END:
      return max;
    case PAGE_UP:
      return step * 10;
    case PAGE_DOWN:
      return -step * 10;
    default:
      return 0;
  }
}
