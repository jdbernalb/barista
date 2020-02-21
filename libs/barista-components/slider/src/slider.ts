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
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  AfterViewInit,
  Input,
  ViewChild,
  ViewEncapsulation,
  Output,
  EventEmitter,
} from '@angular/core';
import { clamp, sortedIndexBy } from 'lodash';
import { SliderValuePair } from './slider-value-pair';

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
export class DtSlider implements OnInit, AfterViewInit {
  private _offset: number;
  private _offsetPercent: number;
  private _clientRect: ClientRect;
  private _valueMapping: Array<SliderValuePair>;

  //@Input() value: number = 50;
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() step: number = 5;
  @Input() value: number = 50;

  @Output() change = new EventEmitter<number>();

  @ViewChild('sliderInput', { static: false })
  private _sliderInput: ElementRef;

  @ViewChild('trackWrapper', { static: false })
  private _trackWrapper: ElementRef;

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  private _cursorDown = (event: MouseEvent) => {
    this._clientRect = this._trackWrapper.nativeElement.getBoundingClientRect();
    this._generateStepping();

    this._snapBasedOnCoordinate(event.clientX);

    document.addEventListener('mousemove', this._mouseMoveHandle);
    document.addEventListener('mouseup', this._mouseUpHandle);
  };

  private _mouseMoveHandle = (event: MouseEvent) => {
    this._snapBasedOnCoordinate(event.clientX);
  };

  private _getSnapIndex = (coordinate: number): number => {
    const distanceFromStart = coordinate - this._clientRect.left;

    let valueIndexToSnap: number = sortedIndexBy(
      this._valueMapping,
      <SliderValuePair>{ pointOnSlider: distanceFromStart },
      (item: SliderValuePair): number => {
        return item.pointOnSlider;
      },
    );

    valueIndexToSnap = clamp(
      valueIndexToSnap,
      0,
      this._valueMapping.length - 1,
    );

    if (valueIndexToSnap > 0) {
      const distanceFromNext = Math.abs(
        distanceFromStart - this._valueMapping[valueIndexToSnap].pointOnSlider,
      );
      const distanceFromPrev = Math.abs(
        distanceFromStart -
          this._valueMapping[valueIndexToSnap - 1].pointOnSlider,
      );
      if (distanceFromNext > distanceFromPrev) {
        valueIndexToSnap -= 1;
      }
    }

    return valueIndexToSnap;
  };

  private _mouseUpHandle = () => {
    document.removeEventListener('mousemove', this._mouseMoveHandle);
    document.removeEventListener('mousemove', this._mouseUpHandle);
    console.log(this.value);
  };

  _inputChangeHandler = (): void => {
    this._setValueForSlider(this.value);
  };

  _snapBasedOnCoordinate(coordinate: number): void {
    const valueIndexToSnap: number = this._getSnapIndex(coordinate);
    const valuePair: SliderValuePair = this._valueMapping[valueIndexToSnap];
    this.value = valuePair.actualValue;
    window.requestAnimationFrame(() => {
      this._moveThumbToValuePair(valuePair);
    });
  }

  _moveThumbToValuePair(valuePair: SliderValuePair): void {
    this._offset = valuePair.pointOnSlider / this._clientRect.width;
    this._offsetPercent = this._offset * 100;
    this.changeDetectorRef.markForCheck();
  }

  ngOnInit(): void {
    this._offset = 0;
    this._offsetPercent = 0;
  }

  ngAfterViewInit(): void {
    this._clientRect = this._trackWrapper.nativeElement.getBoundingClientRect();
    this._trackWrapper.nativeElement.addEventListener(
      'mousedown',
      this._cursorDown,
    );
    this._generateStepping();
    this._setValueForSlider(this.value);

    this._sliderInput.nativeElement.addEventListener(
      'change',
      this._inputChangeHandler,
    );
  }

  _setValueForSlider(value: number): void {
    const valuePairToSnap:
      | SliderValuePair
      | undefined = this._valueMapping.find(
      (valuePair: SliderValuePair): boolean => valuePair.actualValue == value,
    );

    if (valuePairToSnap) {
      this._moveThumbToValuePair(valuePairToSnap);
    }
  }

  _thumbWrapStyles(): { [key: string]: string } {
    return {
      transform: `translateX(-${100 - this._offsetPercent}%)`,
    };
  }

  _sliderFillStyles(): { [key: string]: string } {
    return {
      transform: `scale3d(${this._offset}, 1, 1)`,
    };
  }

  _sliderBackgroundStyles(): { [key: string]: string } {
    return {
      transform: `scale3d(${1 - this._offset}, 1, 1)`,
    };
  }

  _generateStepping(): void {
    const width = this._clientRect.right - this._clientRect.left;
    const stepNumber = (this.max - this.min) / this.step;
    const stepSize = width / stepNumber;

    this._valueMapping = new Array<SliderValuePair>();

    for (let i = 0; i <= stepNumber; i++) {
      this._valueMapping.push(<SliderValuePair>{
        actualValue: i * this.step,
        pointOnSlider: i * stepSize,
      });
    }
  }
}
