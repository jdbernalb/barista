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
import { BaUxdNode } from '@dynatrace/shared/barista-definitions';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'ba-decision-graph-node',
  templateUrl: './ba-decision-graph-node.html',
  styleUrls: ['./ba-decision-graph-node.scss'],
})
export class BaDecisionGraphNode implements OnInit {
  @Input('node')
  node: BaUxdNode;

  @Output('selectedNode')
  nodeEvent: EventEmitter<BaUxdNode> = new EventEmitter();

  constructor(private _sanitizer: DomSanitizer) {}

  ngOnInit(): void {}

  // TODO: Error handling when undefined
  /**
   * Converts a string to SafeHtml using the DomSanitizer
   * @param nodeText string to be converted to SafeHtml
   */
  getSanitizedNodeText(nodeText: string): SafeHtml | undefined {
    return this._sanitizer.bypassSecurityTrustHtml(nodeText);
  }

  startNode(node: BaUxdNode): void {
    this.nodeEvent.emit(node);
  }
}
