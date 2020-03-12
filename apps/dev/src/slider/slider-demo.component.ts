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

import { Component, OnInit, ViewChild } from '@angular/core';
import { DtSlider } from '@dynatrace/barista-components/slider';

@Component({
  selector: 'slider-dev-app-demo',
  templateUrl: 'slider-demo.component.html',
  styleUrls: ['slider-demo.component.scss'],
})
export class SliderDemo implements OnInit {
  outerValue = 20;

  @ViewChild(DtSlider, { static: true })
  private slider: DtSlider;

  ngOnInit(): void {
    setInterval(() => {
      this.outerValue = Math.random() * 12;
      this.slider.value = this.outerValue;
      console.log(this.outerValue);
    }, 10000);
  }
}
