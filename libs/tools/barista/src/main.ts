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

import { isPublicBuild } from '@dynatrace/tools/shared';
import { environment } from '@environments/barista-environment';
import { green } from 'chalk';
import { existsSync, mkdirSync, promises as fs } from 'fs';
import { EOL } from 'os';
import { dirname, join } from 'path';
import { componentsBuilder } from './builder/components';
import { homepageBuilder } from './builder/homepage';
import { iconsBuilder } from './builder/icons';
import { strapiBuilder } from './builder/strapi';
import { overviewBuilder } from './generators/category-navigation';
import {
  exampleInlineSourcesTransformerFactory,
  internalContentTransformerFactory,
  internalLinksTransformerFactory,
} from './transform';
import { BaPageBuilder, BaPageBuildResult, BaPageTransformer } from './types';

// Add your page-builder to this map to register it.
const BUILDERS = new Map<string, BaPageBuilder>([
  ['components-builder', componentsBuilder],
  ['strapi-builder', strapiBuilder],
  ['homepage-builder', homepageBuilder],
  ['icons-builder', iconsBuilder],
]);

/**
 * Creates the internalLinksTransformer via a factory because we need to read
 * some arguments from the process environment.
 * Transformers should be pure for testing.
 */
function createInternalLinksTransformer(): BaPageTransformer {
  const internalLinkArg = environment.internalLinks;
  const internalLinkParts = internalLinkArg ? internalLinkArg.split(',') : [];
  const isPublic = isPublicBuild();
  return internalLinksTransformerFactory(isPublic, internalLinkParts);
}

/**
 * Creates the internalContentTransformer via a factory because we need to read
 * one argument from the process environment.
 */
function createInternalContentTransformer(): BaPageTransformer {
  const isPublic = isPublicBuild();
  return internalContentTransformerFactory(isPublic);
}

/**
 * Creates the exampleInlineSourcesTransformer by loading the example
 * metadata-json and calling the factory with it.
 */
async function createExampleInlineSourcesTransformer(): Promise<
  BaPageTransformer
> {
  if (!existsSync(environment.examplesMetadataDir)) {
    throw new Error(
      `"${environment.examplesMetadataFileName}" not found. Make sure to run "examples-tools" first.`,
    );
  }
  const examplesMetadata = await fs.readFile(
    join(environment.examplesMetadataDir, environment.examplesMetadataFileName),
    {
      encoding: 'utf8',
    },
  );

  return exampleInlineSourcesTransformerFactory(JSON.parse(examplesMetadata));
}

/** Builds pages using all registered builders. */
async function buildPages(): Promise<number> {
  const globalTransformers = [
    await createExampleInlineSourcesTransformer(),
    createInternalLinksTransformer(),
    createInternalContentTransformer(),
  ];

  const builders = Array.from(BUILDERS.values());
  // Run each builder and collect all build results
  const results = await builders.reduce<Promise<BaPageBuildResult[]>>(
    async (aggregatedResults, currentBuilder) => [
      ...(await aggregatedResults),
      ...(await currentBuilder(globalTransformers)),
    ],
    Promise.resolve([]),
  );

  // Make sure dist dir is created
  mkdirSync(environment.distDir, { recursive: true });

  const files = overviewBuilder(results);

  const routes = files
    .map(({ relativeOutFile }) => {
      const path = relativeOutFile
        .replace(/^\//, '') // replace the leading slash
        .replace(/\..+$/, ''); // replace the file ending

      if (path === 'index') {
        return '/';
      }

      return `/${path}`;
    })
    .join(EOL);

  const routesFile = join(environment.distDir, 'routes.txt');

  const writeFileStack: Promise<void>[] = [
    fs.writeFile(routesFile, routes, 'utf-8'),
  ];

  // Write all files to the file system.
  for (let i = 0, max = files.length; i < max; i++) {
    const file = files[i];
    const outFile = join(environment.distDir, file.relativeOutFile);
    // Create directory if it does not exits
    mkdirSync(dirname(outFile), { recursive: true });

    const content = JSON.stringify(file.pageContent, null, 2);
    writeFileStack.push(
      fs.writeFile(outFile, content, { flag: 'w', encoding: 'utf8' }),
    );
  }

  await Promise.all(writeFileStack);
  return files.length;
}

buildPages()
  .then(pages => {
    console.log(`${pages} pages created.`);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
