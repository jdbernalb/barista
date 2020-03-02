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
  combineLatest,
  merge,
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  switchMap,
  takeUntil,
  observeOn,
} from 'rxjs/operators';

let uniqueId = 0;

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
  @Input() value: number = 50;
  @Input() disabled: boolean = false;

  @Output() change = new EventEmitter<number>();

  /** @internal Holds the track wrapper */
  @ViewChild('trackWrapper', { static: true })
  _trackWrapper: ElementRef<HTMLDivElement>;

  /** @internal Holds the thumb wrapper */
  @ViewChild('thumb', { static: true })
  _thumb: ElementRef<HTMLDivElement>;

  /** @internal Holds the slider fill */
  @ViewChild('sliderFill', { static: true })
  _sliderFill: ElementRef<HTMLDivElement>;

  /** @internal Holds the slider background */
  @ViewChild('sliderBackground', { static: true })
  _sliderBackground: ElementRef<HTMLDivElement>;

  /** @internal Holds the slider background */
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
  }

  ngAfterViewInit(): void {
    this._zone.runOutsideAngular(() => {
      this._captureMouseEvents();
    });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private _captureMouseEvents(): void {
    const touchstart$ = fromEvent(
      this._trackWrapper.nativeElement,
      'touchstart',
    );
    const mousedown$ = fromEvent(this._trackWrapper.nativeElement, 'mousedown');
    const start$ = merge(mousedown$, touchstart$);

    const getEnd = () =>
      merge(fromEvent(window, 'mouseup'), fromEvent(window, 'touchend'));

    const getMove = () =>
      merge(
        fromEvent<MouseEvent>(window, 'mousemove').pipe(
          map(mouseEvent => mouseEvent.clientX),
        ),
        fromEvent<TouchEvent>(window, 'touchmove').pipe(
          map(touchEvent => touchEvent.changedTouches[0].clientX),
        ),
      );

    //const click$ = fromEvent(this._trackWrapper.nativeElement, 'click');

    const config$ = start$.pipe(
      switchMap(() =>
        getMove().pipe(
          distinctUntilChanged(),
          observeOn(animationFrameScheduler),
          takeUntil(getEnd()),
        ),
      ),
      map(coordinate => {
        console.log(coordinate);
        const clientRect = this._trackWrapper.nativeElement.getBoundingClientRect();
        const { left: offset, width } = clientRect;
        return {
          coordinate,
          offset,
          width,
          min: this.min,
          max: this.max,
          step: this.step,
          roundShift: this._roundShift,
        };
      }),
    );

    const value$ = config$.pipe(
      map(config => getSliderValueForCoordinate(config)),
      distinctUntilChanged(),
    );

    value$.pipe(takeUntil(this._destroy$)).subscribe(value => {
      this.value = value;
      this._sliderInput.value = `${value}`;
    });

    combineLatest(value$, config$)
      .pipe(
        map(([value, config]) =>
          getSliderPositionBasedOnValue({ value, ...config }),
        ),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe(offset => {
        this._thumb.nativeElement.style.transform = `translateX(-${100 -
          offset * 100}%)`;
        this._sliderFill.nativeElement.style.transform = `scale3d(${offset}, 1, 1)`;
        this._sliderBackground.nativeElement.style.transform = `scale3d(${1 -
          offset}, 1, 1)`;
      });
  }

  _inputChangeHandler(): void {
    this.value = +this.value;
    // this._moveSliderBasedOnValue();
  }

  // private _keyDown = (event: KeyboardEvent): void => {
  //   switch (event.keyCode) {
  //     case LEFT_ARROW:
  //     case DOWN_ARROW:
  //       this.value -= this.step;
  //       break;
  //     case RIGHT_ARROW:
  //     case UP_ARROW:
  //       this.value += this.step;
  //       break;
  //     case HOME:
  //       this.value = this.min;
  //       break;
  //     case END:
  //       this.value = this.max;
  //       break;
  //     case PAGE_UP:
  //       this.value += this.step * 10;
  //       break;
  //     case PAGE_DOWN:
  //       this.value -= this.step * 10;
  //       break;
  //   }
  //   this._moveSliderBasedOnValue();
  // };
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
