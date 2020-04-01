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

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { BaUxdNode, BaUxdEdge } from '@dynatrace/shared/barista-definitions';
import { BaPageService } from 'apps/barista-design-system/src/shared/services/page.service';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'ba-decision-graph-node',
  templateUrl: './ba-decision-graph-node.html',
  styleUrls: ['./ba-decision-graph-node.scss'],
})
export class BaDecisionGraphNode implements OnInit {
  @Input()
  node: BaUxdNode | undefined;

  @Output('startOver')
  startOver = new EventEmitter<void>();

  /** Data needed to render the navigation. */
  private _decisionGraphData$ = this._pageService._getPage('uxdg-data');

  /** Array of all nodes and edges */
  decisionGraphData: BaUxdNode[] = [];

  /** Array of all nodes and edges which should be displayed */
  decisionGraphSteps: BaUxdNode[] = [];

  /** Contains the task node */
  selectedTaskNode: BaUxdNode | undefined;

  /** @internal Whether the Undo button in template is displayed */
  _started: boolean = false;

  ns: number[] = [];

  constructor(
    private _pageService: BaPageService<any>,
    private _sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this._decisionGraphData$.subscribe(data => {
      this.decisionGraphData = data;
    });
    this.decisionGraphSteps.push(this.node!);
  }

  // TODO: Get event target from click event
  // TODO: When STARTNODE is clicked then go back to first node of clicked STARTNODE that isn't startnode
  /**
   * Pushes the next node into the decisionGraphSteps array
   * @param nextNodeId Next node id to be displayed
   */
  setNextNode(selectedEdge: BaUxdEdge): void {
    this.decisionGraphSteps[this.decisionGraphSteps.length - 1].path.map(
      edge => {
        if (edge.text === selectedEdge.text) {
          edge.selected = true;
        } else {
          edge.selected = false;
        }
      },
    );
    const nextNode = this.decisionGraphData.find(node => {
      return node.id === selectedEdge.uxd_node;
    });

    // TODO: better check and error handling
    this.decisionGraphSteps.push(nextNode!);
    if (!this._started) {
      this._started = true;
    }
  }

  setSelectedTaskNode(selectedTaskNode: BaUxdNode): void {
    this.selectedTaskNode = selectedTaskNode;
  }

  /** Resets the decisionGraphSteps array to only contain startNodes */
  resetProgress(): void {
    this.decisionGraphSteps.forEach(node => {
      this.setSelectedStateOfEdge(node, undefined);
    });
    this.decisionGraphSteps.length = 0;
    this.node = undefined;
    this._started = false;
    this.startOver.emit();
  }

  /** Removes the last step in the decisionGraphSteps array */
  undoLastStep(): void {
    this.decisionGraphSteps[
      this.decisionGraphSteps.length - 2
    ] = this.setSelectedStateOfEdge(
      this.decisionGraphSteps[this.decisionGraphSteps.length - 2],
      undefined,
    );
    this.decisionGraphSteps.splice(this.decisionGraphSteps.length - 1, 1);
    if (this.decisionGraphSteps.length === 0) this.startOver.emit();
  }

  /** Sets a nodes path.selected state */
  setSelectedStateOfEdge(node: BaUxdNode, state?: boolean): BaUxdNode {
    node.path.map(edge => {
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

  // TODO: Error handling when undefined
  /**
   * Converts a string to SafeHtml using the DomSanitizer
   * @param nodeText string to be converted to SafeHtml
   */
  getSanitizedNodeText(nodeText: string): SafeHtml | undefined {
    return this._sanitizer.bypassSecurityTrustHtml(nodeText);
  }

  // setSelectedNode(selectedStartNode: BaUxdNode): void {
  //   this.selectedStartNode = selectedStartNode;
  // }
}
