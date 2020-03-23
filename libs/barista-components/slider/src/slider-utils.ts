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

import { roundToDecimal, clamp } from '@dynatrace/barista-components/core';
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

export function getSliderValueForCoordinate(config: {
  coordinate: number;
  width: number;
  offset: number;
  max: number;
  min: number;
  step: number;
  roundShift: number;
}): number {
  const valueRange = config.max - config.min;
  const distanceFromStart = config.coordinate - config.offset;
  const calculatedValue =
    config.min + (distanceFromStart / config.width) * valueRange;
  const snapped = roundToSnap(
    calculatedValue,
    config.step,
    config.min,
    config.max,
  );
  return roundToDecimal(snapped, config.roundShift);
}

export function roundToSnap(
  inputValue: number,
  step: number,
  min: number,
  max: number,
): number {
  return clamp(Math.round(inputValue / step) * step, min, max);
}

export function getSliderPositionBasedOnValue(config: {
  value: number;
  min: number;
  max: number;
}): number {
  return (config.value - config.min) / (config.max - config.min);
}

export function getKeyCodeValue(
  max: number,
  step: number,
  keyCode: number,
): number {
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
