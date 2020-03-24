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
import { BaPageService } from 'apps/barista-design-system/src/shared/services/page.service';
import { BaUxdNode } from '@dynatrace/shared/barista-definitions';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'ba-decision-graph',
  templateUrl: './ba-decision-graph.html',
  styleUrls: ['./ba-decision-graph.scss'],
})
export class BaDecisionGraphComponent implements OnInit {
  /** @internal Data needed to render the navigation. */
  _decisionGraphData$ = this._pageService._getPage('uxdg-data');

  decisionGraphData: BaUxdNode[] = [];
  decisionGraphSteps: BaUxdNode[] = [];

  _undoStep: boolean = false;
  prevNodeId: number;

  //TODO: add correct Type (add to pageservice)
  constructor(
    private _pageService: BaPageService<any>,
    private _sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this._decisionGraphData$.subscribe(data => {
      this.decisionGraphData = data;
      this.getStartNodes();
    });
  }

  getSanitizedNodeText(nodeId: number): SafeHtml {
    this.decisionGraphSteps.find(data => {
      console.log(data);
    });
    return this._sanitizer.bypassSecurityTrustHtml(
      this.decisionGraphData[nodeId].text,
    );
  }

  getStartNodes(): void {
    this.decisionGraphData.forEach(dataNode => {
      if (dataNode.start) {
        this.decisionGraphSteps.push(dataNode);
      }
      console.log(this.decisionGraphSteps);
    });
  }

  setNextNode(nextNodeId: number, prevNodeId: number): void {
    const nextNode = this.decisionGraphData.find(node => {
      return node.id === nextNodeId;
    });
    // TODO: better check and error handling
    this.decisionGraphSteps.push(nextNode!);
    if (!this._undoStep) {
      this._undoStep = true;
    }
    this.prevNodeId = prevNodeId;
  }

  undoLastStep(): void {
    this.decisionGraphSteps.splice(this.decisionGraphSteps.length - 1, 1);
    if (this.decisionGraphSteps.length <= 1) {
      this._undoStep = false;
    }
  }
}
