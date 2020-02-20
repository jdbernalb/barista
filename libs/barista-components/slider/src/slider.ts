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
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { clamp } from 'lodash';

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
export class DtSlider implements OnInit {
  private _offset: number;
  private _offsetPercent: number;
  private _nativeElement: Element;
  private _clientRect: ClientRect;

  @ViewChild('trackWrapper', { static: false })
  private _trackWrapper: ElementRef;

  constructor(
    elementRef: ElementRef,
    private changeDetectorRef: ChangeDetectorRef,
  ) {
    this._nativeElement = elementRef.nativeElement;

    this._nativeElement.addEventListener('mousedown', this._cursorDown);
  }

  private _cursorDown = (event: MouseEvent) => {
    this._clientRect = this._trackWrapper.nativeElement.getBoundingClientRect();
    this._moveThumbBasedOnCoordinate(event.clientX);

    document.addEventListener('mousemove', this._mousemoveHandle);

    document.addEventListener('mouseup', this._mouseUpHandle);
  };

  private _mousemoveHandle = (event: MouseEvent) => {
    this._moveThumbBasedOnCoordinate(event.clientX);
  };

  _moveThumbBasedOnCoordinate(clientX: number): void {
    this._offset = clamp(
      (clientX - this._clientRect.x) / this._clientRect.width,
      0,
      1,
    );
    this._offsetPercent = this._offset * 100;
    this.changeDetectorRef.markForCheck();
  }

  ngOnInit(): void {
    this._offset = 0;
    this._offsetPercent = 0;
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

  private _mouseUpHandle = (event: MouseEvent) => {
    document.removeEventListener('mousemove', this._mousemoveHandle);
    document.removeEventListener('mousemove', this._mouseUpHandle);
  };
}
