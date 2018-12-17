import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { OriginalClassName } from '../../../core/decorators';
import { DtSelectionAreaChange, DtChart, DtSelectionArea } from '@dynatrace/angular-components';

@Component({
  template: `
  <dt-chart [options]="options" [series]="series" [dtChartSelectionArea]="area"></dt-chart>
  <dt-selection-area #area="dtSelectionArea" (changed)="handleChange($event)">
    {{left | date: 'MMM d, y - HH:mm':'GMT' }} - {{right | date: 'MMM d, y - HH:mm':'GMT'}}
    <dt-selection-area-actions>
      <button dt-button>Zoom in</button>
    </dt-selection-area-actions>
  </dt-selection-area>
  `,
  styles: [
    '.origin { width: 100%; height: 400px; border: 1px solid #e6e6e6; }',
  ],
})
@OriginalClassName('SelectionAreaChartExample')
export class SelectionAreaChartExample {
  @ViewChild(DtChart) chart: DtChart;
  @ViewChild(DtSelectionArea) selectionArea: DtSelectionArea;

  left: number;
  right: number;

  options: Highcharts.Options = {
    xAxis: {
      type: 'datetime',
      min: 1370302200000,
      startOnTick: true,
    },
    yAxis: [
      {
        title: null,
        labels: {
          format: '{value}',
        },
        tickInterval: 10,
      },
      {
        title: null,
        labels: {
          format: '{value}/min',
        },
        opposite: true,
        tickInterval: 50,
      },
    ],
    plotOptions: {
      column: {
        stacking: 'normal',
      },
      series: {
        marker: {
          enabled: false,
        },
      },
    },
    tooltip: {
      formatter(): string | boolean {
        return `${this.series.name}&nbsp${this.y}`;
      },
    },
  };

  series: Highcharts.IndividualSeriesOptions[] = [
    {
      name: 'Failure rate',
      type: 'line',
      data: generateData(40, 0, 20, 1370304000000, 900000),
    },
    {
      name: 'Requests',
      type: 'column',
      yAxis: 1,
      data: generateData(40, 0, 200, 1370304000000, 900000),
    },
    {
      name: 'Failed requests',
      type: 'column',
      yAxis: 1,
      data: generateData(40, 0, 15, 1370304000000, 900000),
    }];

  handleChange(ev: DtSelectionAreaChange): void {
    this.left = ev.left;
    this.right = ev.right;
  }

}

export function randomize(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

export function generateData(
  amount: number,
  min: number,
  max: number,
  timestampStart: number,
  timestampTick: number
): Array<[number, number]> {
  return Array.from(Array(amount).keys())
    .map((v) => [
      timestampStart + (timestampTick * v),
      randomize(min, max),
    ] as [number, number]);
}