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

import { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import { promises as fs } from 'fs';
import { join } from 'path';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, map, mapTo, switchMap, tap } from 'rxjs/operators';
import { NxJson, PackageJson, tryJsonParse } from '../util/json-utils';
import { ElementsOptions } from './schema';

/**
 * Custom builder for the web-components package builder.
 * This builder will schedule and run all projects that are tagged
 * with a given tag in the nx.json. It is primarily used to run and package
 * the web-components part of the library.
 */
export function elementsBuilder(
  options: ElementsOptions,
  context: BuilderContext,
): Observable<BuilderOutput> {
  const project = context.target !== undefined ? context.target!.project : '';
  context.logger.info(`Packaging ${project}...`);

  // Get all builds that are tagged with elements
  context.logger.info('Reading nx.json file...');
  return from(
    tryJsonParse<NxJson>(join(context.workspaceRoot, 'nx.json')),
  ).pipe(
    // Find the projects that need to be built as part of the elements build.
    map((nxJson: NxJson) =>
      filterTaggedProjects(
        nxJson,
        options.buildTag || 'scope:elements',
        context.target.project,
      ),
    ),
    // Create and schedule all other builds.
    switchMap((targetProjects: string[]) => {
      const targets = createProjectBuildStreams(context, targetProjects);
      return forkJoin(...targets);
    }),
    switchMap(() =>
      // Copy the root package json and sync dependency versions.
      copyRootPackageJson(
        context,
        options.releasePackageJson,
        options.outputPath,
      ),
    ),
    tap(() => context.logger.info('Build successful.')),
    // When the builds have finished, create the root package json
    // and return the results.
    mapTo({
      success: true,
    }),
    catchError(error => {
      return of({
        success: false,
        error: (error as Error).message,
      });
    }),
  );
}

/** Filter incoming projects based on the tag defined in the options. */
function filterTaggedProjects(
  nxJson: NxJson,
  buildTag: string,
  selfProject: string,
): string[] {
  return (
    Object.entries(nxJson.projects)
      // filter out the starter project (self)
      .filter(([project]) => project !== selfProject)
      // filter in all projects that include the selected tag
      .filter(([_project, { tags }]) => tags && tags.includes(buildTag))
      .map(([project]) => project)
  );
}

/** Create a builder stream array for all targets. */
function createProjectBuildStreams(
  context: BuilderContext,
  targetProjects: string[],
): Observable<BuilderOutput>[] {
  return targetProjects.map((targetProject: string) => {
    return from(
      context.scheduleTarget({
        target: 'build',
        project: targetProject,
      }),
    ).pipe(
      tap(() => context.logger.info(`Building ${targetProject}...`)),
      switchMap(build => build.result),
      tap(result => {
        // Throw and break the whole pipe if an error occurs.
        if (result.error) {
          throw new Error(result.error);
        }
        context.logger.info(`Successfully built ${targetProject}`);
      }),
    );
  });
}

/**
 * Syncs versions from the source to the target package.json
 * @param sourcePackageJson - Package.json that contains all currently used
 * dependencies, devDependecies and peerDependencies that are used in the
 * project.
 * @param targetPackageJson - Package.json that is meant for shipping.
 * It contains the dependency/devDependency key but no version. It will receive
 * the version from the SourePackageJson
 * @param key - Which dependencies from the targetPackageJson should be
 * iterated.
 * @returns The modified targetPackageJson with all versions filled.
 */
function syncDependencyVersions(
  sourcePackageJson: PackageJson,
  targetPackageJson: PackageJson,
  key: 'dependencies' | 'devDependencies' | 'peerDependencies',
): PackageJson {
  // Sync dependency versions, that are referenced in the release package.json
  for (const dependencyKey of Object.keys(targetPackageJson[key])) {
    const dependencyVersion =
      sourcePackageJson.dependencies[dependencyKey] ||
      sourcePackageJson.devDependencies[dependencyKey];
    targetPackageJson[key][dependencyKey] = dependencyVersion;
  }
  return targetPackageJson;
}

/**
 * Syncs the projects package.json and the release package.json and writes the
 * result to the output.
 * Syncs the following things.
 * * dependency versions given in the releasePackageJson from project to release.
 * * package version from project to release.
 * * author, repository other relevant meta information from project to release.
 */
function copyRootPackageJson(
  context: BuilderContext,
  releasePackageJsonPath: string,
  outputPath: string,
): Observable<void> {
  context.logger.info(`Reading root package.json and release package.json`);
  return forkJoin(
    tryJsonParse<PackageJson>(join(context.workspaceRoot, 'package.json')),
    tryJsonParse<PackageJson>(
      join(context.workspaceRoot, releasePackageJsonPath),
    ),
  ).pipe(
    map(([projectPackageJson, releasePackageJson]) => {
      context.logger.info(`Syncing dependencies and metadata`);
      // Sync the main package version over
      releasePackageJson.version = projectPackageJson.version;
      // Sync licence and author over
      releasePackageJson.license = projectPackageJson.license;
      releasePackageJson.author = projectPackageJson.author;

      // Sync the dependencyVersions
      return syncDependencyVersions(
        projectPackageJson,
        releasePackageJson,
        'dependencies',
      );
    }),
    tap(() =>
      context.logger.info(
        `Writing package.json to ${join(outputPath, 'package.json')}`,
      ),
    ),
    switchMap((releasePackageJson: PackageJson) =>
      fs.writeFile(
        join(context.workspaceRoot, outputPath, 'package.json'),
        JSON.stringify(releasePackageJson, null, 2),
      ),
    ),
    tap(() => context.logger.info(`Finished writing root package.json`)),
  );
}
