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

import { Component, OnInit } from '@angular/core';
import { BaUxdNode } from '@dynatrace/shared/barista-definitions';
import { BaPageService } from 'apps/barista-design-system/src/shared/services/page.service';

@Component({
  selector: 'ba-decision-graph',
  templateUrl: './ba-decision-graph.html',
  styleUrls: ['./ba-decision-graph.scss'],
})
export class BaDecisionGraph implements OnInit {
  /** Data needed to render the navigation. */
  private _decisionGraphData$ = this._pageService._getPage('uxdg-data');

  /** Amount of start nodes */
  private _numberOfStartNodes: number;

  /** Array of all nodes and edges */
  decisionGraphData: BaUxdNode[] = [];

  /** Array of all nodes and edges which should be displayed */
  decisionGraphStartNodes: BaUxdNode[] = [];

  /** Contains the start node the user has picked */
  selectedStartNode: BaUxdNode;

  //TODO: add correct Type (add to pageservice)
  constructor(private _pageService: BaPageService<any>) {}

  ngOnInit(): void {
    this._decisionGraphData$.subscribe(data => {
      this.decisionGraphData = data;
      this.getStartNodes();
    });
  }

  /** Gets all starting nodes from decisionGraphData */
  getStartNodes(): void {
    this.decisionGraphData.forEach(dataNode => {
      if (dataNode.start) {
        this.decisionGraphStartNodes.push(dataNode);
      }
    });
    this._numberOfStartNodes = this.decisionGraphStartNodes.length;
  }

  setSelectedStartNode(selectedStartNode: BaUxdNode): void {
    let index;
    selectedStartNode.path.forEach(edge => {
      index = edge.uxd_node;
    });
    this.selectedStartNode = this.decisionGraphData[index];
  }
}
