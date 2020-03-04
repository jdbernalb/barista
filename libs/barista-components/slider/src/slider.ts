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
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation,
  OnDestroy,
} from '@angular/core';
import { clamp, roundToDecimal } from '@dynatrace/barista-components/core';
import { DtInput } from '@dynatrace/barista-components/input';
import {
  fromEvent,
  animationFrameScheduler,
  Subject,
  merge,
  BehaviorSubject,
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
  providers: [],
  host: {
    class: 'dt-slider',
  },
  encapsulation: ViewEncapsulation.Emulated,
  exportAs: 'dtSlider',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtSlider implements OnInit, AfterViewInit, OnDestroy {
  private _roundShift: number = 0;

  /** @internal Unique id for this input. */
  _labelUid = `dt-slider-label-${uniqueId++}`;

  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() step: number = 5;
  @Input() disabled: boolean = false;

  @Input()
  get value(): number {
    return this._value$.value;
  }
  set value(value: number) {
    this._value$.next(value);
  }
  private _value$ = new BehaviorSubject<number>(50);

  private _clientRect$ = new Subject<ClientRect>();

  private _resizeObserver$ = new Subject();
  private _observer: ResizeObserver;

  private inputFieldValue$ = new Subject<string>();

  sliderInputValue: string;

  inputValueChanged(inputValue: string): void {
    this.inputFieldValue$.next(inputValue);
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

  constructor(
    private _zone: NgZone, // private changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // deal with rounding problems.
    let countingStep = this.step;

    while (countingStep % 1 !== 0) {
      countingStep *= 10;
      this._roundShift++;
    }

    this._observer = new ResizeObserver(() => {
      this._resizeObserver$.next();
    });

    this._observer.observe(this._trackWrapper.nativeElement);

    this._resizeObserver$
      .pipe(
        debounceTime(50),
        takeUntil(this._destroy$),
      )
      .subscribe(() => {
        this._clientRect$.next(
          this._trackWrapper.nativeElement.getBoundingClientRect(),
        );
      });

    this._resizeObserver$.next(); // run at least once TODO: find a better way of doing this.
  }

  ngAfterViewInit(): void {
    this._zone.runOutsideAngular(() => {
      this._captureMouseEvents();
    });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
    this._observer.unobserve(this._trackWrapper.nativeElement);
  }

  private _captureMouseEvents(): void {
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

    const keyDown$ = fromEvent<KeyboardEvent>(
      this._trackWrapper.nativeElement,
      'keydown',
    ).pipe(
      filter(keyboardEvent => KEY_CODES_ARRAY.includes(keyboardEvent.keyCode)),
      map(keyboardEvent => {
        keyboardEvent.stopPropagation(); // global angular keydown would trigger CD.
        return keyboardEvent.keyCode;
      }),
    );

    // triggered by drag and click
    const mouseValue$ = merge(drag$, click$).pipe(
      withLatestFrom(this._clientRect$),
      map(([coordinate, { left, width }]) =>
        getSliderValueForCoordinate({
          coordinate,
          offset: left,
          width,
          min: this.min,
          max: this.max,
          step: this.step,
          roundShift: this._roundShift,
        }),
      ),
      distinctUntilChanged(),
    );

    //const inputchange$ = fromEvent<>(this._sliderInput._onInput);
    this.inputFieldValue$.subscribe(value => {
      console.log(value);
    });

    const keyBoardValue$ = keyDown$.pipe(
      map(keyCode => getKeyCodeValue(this.max, this.step, keyCode)),
      withLatestFrom(this._value$),
      map(([valueAddition, value]) =>
        clamp(value + valueAddition, this.min, this.max),
      ),
      distinctUntilChanged(),
    );

    merge(mouseValue$, keyBoardValue$)
      .pipe(
        tap(value => {
          this._value$.next(value);
          //this._sliderInput.value = value.toString();
          this._trackWrapper.nativeElement.setAttribute(
            'aria-valuenow',
            value.toString(),
          );
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
  return roundToDecimal(
    roundToSnap(
      clamp(
        config.min + (distanceFromStart / sliderWidth) * valueRange,
        config.min,
        config.max,
      ),
      config.step,
      config.min,
      config.max,
    ),
    config.roundShift,
  );
}

function roundToSnap(
  inputValue: number,
  step: number,
  min: number,
  max: number,
): number {
  return clamp(Math.round(inputValue / step) * step, min, max);
}

// function getSliderPositionBasedOnCoordinate(config: {
//   coordinate: number;
//   min: number;
//   max: number;
//   offset: number;
//   width: number;
//   step: number;
//   roundShift: number;
// }): number  {
//   const value = getSliderValueForCoordinate(config);

//   // this is just for checking
//   console.log(getSliderPositionBasedOnValue({value, ...config}));

//   const roundedValue = roundToDecimal(
//     roundToSnap(value, config.step, config.min, config.max),
//     config.roundShift,
//   );
//   return (roundedValue - config.min) / (config.max - config.min);
// }

function getSliderPositionBasedOnValue(config: {
  value: number;
  min: number;
  max: number;
  offset: number;
  width: number;
  step: number;
  roundShift: number;
}): number {
  const roundedValue = roundToDecimal(
    roundToSnap(config.value, config.step, config.min, config.max),
    config.roundShift,
  );
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
