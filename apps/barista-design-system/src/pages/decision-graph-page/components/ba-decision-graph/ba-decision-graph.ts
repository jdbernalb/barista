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
  decisionGraphSteps: BaUxdNode[] = [];

  /** Contains the start node the user has picked */
  selectedStartNode: BaUxdNode;

  /** @internal Whether the Undo button in template is displayed */
  _started: boolean = false;

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
        this.decisionGraphSteps.push(dataNode);
      }
    });
    this._numberOfStartNodes = this.decisionGraphSteps.length;
  }

  // TODO: Get event target from click event
  // TODO: When Not So Sure is clicked the3n go back to first node that isn't startnode
  /**
   * Pushes the next node into the decisionGraphSteps array
   * @param nextNodeId Next node id to be displayed
   * @param _edgeText Buttontext to to be displayed
   */
  setNextNode(nextNodeId: number, _edgeText: string): void {
    const currNode = this.decisionGraphSteps[
      this.decisionGraphSteps.length - 1
    ];
    this.setSelectedStateOfEdge(currNode, true);
    const nextNode = this.decisionGraphData.find(node => {
      return node.id === nextNodeId;
    });
    // TODO: better check and error handling
    this.decisionGraphSteps.push(nextNode!);
    if (!this._started) {
      this._started = true;
    }
  }

  /** Resets the decisionGraphSteps array to only contain startNodes */
  resetProgress(): void {
    this.decisionGraphSteps.forEach(node => {
      this.setSelectedStateOfEdge(node, undefined);
    });
    this.decisionGraphSteps.length = this._numberOfStartNodes;
    this._started = false;
  }

  /** Removes the last step in the decisionGraphSteps array */
  undoLastStep(): void {
    this.decisionGraphSteps.splice(this.decisionGraphSteps.length - 1, 1);
    if (this.decisionGraphSteps.length <= this._numberOfStartNodes) {
      this._started = false;
    }
    this.setSelectedStateOfEdge(
      this.decisionGraphSteps[this.decisionGraphSteps.length - 1],
      undefined,
    );
  }

  /** Sets a nodes path.selected state */
  setSelectedStateOfEdge(node: BaUxdNode, state?: boolean): BaUxdNode {
    node.path.forEach(edge => {
      switch (state) {
        case true:
          edge.selected = true;
          break;
        case false:
          edge.selected = false;
          break;
        case undefined:
          edge.selected = undefined;
      }
    });
    return node;
  }

  setSelectedNode(selectedStartNode: BaUxdNode): void {
    this.selectedStartNode = selectedStartNode;
  }
}
