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

// ➜ npx ts-node --project tools/tsconfig.tools.json tools/scripts/affected-args

import axios, { AxiosError } from 'axios';
import { grey } from 'chalk';
import { appendFileSync } from 'fs';
import { from, iif, Observable, of, throwError, timer } from 'rxjs';
import {
  concatMap,
  map,
  retryWhen,
  switchMap,
  catchError,
} from 'rxjs/operators';

const {
  // CIRCLE_BRANCH,
  BASH_ENV,
  CIRCLE_PROJECT_USERNAME = 'dynatrace-oss',
  CIRCLE_PROJECT_REPONAME = 'barista',
  CIRCLE_PULL_REQUEST = 'https://github.com/dynatrace-oss/barista/pull/720',
} = process.env;

// const MASTER_SHA_FILE = `./.config/last-${CIRCLE_BRANCH}-sha.txt`;

async function main(): Promise<string> {
  if (CIRCLE_PULL_REQUEST) {
    console.log(
      `Fetching Base Commit from GitHub for the pull request: ${CIRCLE_PULL_REQUEST}`,
    );
    // Get the last number of the pull request number with grep
    const prNumber = getPRNumberFromUrl(CIRCLE_PULL_REQUEST);

    return (
      getBaseSHAForPullRequest(prNumber)
        // TODO: think about not fallbacking to origin/master better
        // would be affected all if no has can be found≥
        .pipe(catchError(() => of('origin/master')))
        .toPromise()
    );
  }

  return 'origin/master';
}

main()
  .then(base => {
    // Store the affected args in the $BASH_ENV variable that
    // is set through circle ci.
    storeAffectedArgs(base);
  })
  .catch();

/** Store the affected args in the bash environment */
export function storeAffectedArgs(base: string): void {
  if (BASH_ENV) {
    appendFileSync(BASH_ENV, `\nexport AFFECTED_ARGS="--base=${base}"\n`);
    console.log(`Successfully added the --base=${base}`);
  }
}
// # if we have a pull request then fetch the base sha to run against
// if [[ $CIRCLE_PULL_REQUEST ]];
// then
//   printf "Fetching Base Commit from GitHub for the pull request: %s" "$CIRCLE_PULL_REQUEST"

//   # Get the last number of the pull request number with grep
//   PR_NUMBER=$(echo "$CIRCLE_PULL_REQUEST" | grep -Eo '[0-9]+$')
//   PR_URL="${BASE_URL}/pulls/${PR_NUMBER}"
//   CIRCLE_PR_BASE_SHA=$(curl -s "${PR_URL}" | jq -r '.base.sha')

//   # Add the affected args to the bash environment file
//   printf "export AFFECTED_ARGS=\"--base=%s\"\n" "$CIRCLE_PR_BASE_SHA" >> $BASH_ENV

//   # Regex checks for master, 4.x or 4.15.x branch
// elif [[ "$CIRCLE_BRANCH" =~ ^([0-9]{1,}\.x|[0-9]{1,}\.[0-9]{1,}\.x|master)$ ]];
// then

//   echo "Fetching Base Commit from Deploy Cache"

//   if [[ ! -f "$MASTER_SHA_FILE" ]];
//   then

//     # If config dir does not exist create it
//     if [[ ! -d ./.config ]];
//     then
//       mkdir ./.config
//     fi

//     echo "Write SHA to $MASTER_SHA_FILE"
//     git rev-parse HEAD~1 > "$MASTER_SHA_FILE"
//   fi

//   # Add the affected args to the bash environment file
//   printf "export AFFECTED_ARGS=\"--base=%s\"\n" "$(cat "$MASTER_SHA_FILE")" >> $BASH_ENV
// else
//   echo "Compare any other commit against orign/master"
//   # Add the affected args to the bash environment file
//   printf "export AFFECTED_ARGS=\"--base=origin/master\"\n" >> $BASH_ENV
// fi

// source $BASH_ENV
// echo "Affected ARGS: $AFFECTED_ARGS"

/** Retrieves the PR number from the $CIRCLE_PULL_REQUEST url */
export function getPRNumberFromUrl(pullRequestUrl: string): number {
  // matches the last numbers of the url
  const match = pullRequestUrl.match(/([0-9]+)$/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  throw Error(
    `Could not find Pull Request number in the provided URL: ${pullRequestUrl}`,
  );
}

/** Returns the SHA for the base branch for the specified pull request number  */
export function getBaseSHAForPullRequest(prNumber: number): Observable<string> {
  const baseUrl = `https://api.github.com/repos/${CIRCLE_PROJECT_USERNAME}/${CIRCLE_PROJECT_REPONAME}`;

  return of(`${baseUrl}/pulls/${prNumber}`).pipe(
    switchMap((url: string) => from(axios.get<any>(url))),
    retryBackOff({
      initialInterval: 500,
      maxRetries: 3,
      shouldRetry: (error: AxiosError) => {
        if (error.response?.status && error.response.status >= 400) {
          console.log(
            `The requested URL is not available retry: ${grey(
              error.config.url!,
            )}`,
          );
          return true;
        }
        return false;
      },
    }),
    map(({ data }) => data.base.sha),
  );
}

/**
 * Custom Rxjs Operator that retries an Observable with the `retryWhen`
 * operator using an exponential back off with an optional early exit condition.
 * Can configure the max retries and the max interval
 */
export function retryBackOff(config: {
  /** Initial interval in milliseconds */
  initialInterval: number;
  /** Max retries */
  maxRetries?: number;
  /** max interval in milliseconds that can be reached */
  maxInterval?: number;
  shouldRetry?: (error: any) => boolean;
}): <T>(source: Observable<T>) => Observable<T> {
  const maxRetries = config.maxRetries || Infinity;
  const maxInterval = config.maxInterval || Infinity;
  const shouldRetry = (error: any) =>
    config.shouldRetry ? config.shouldRetry(error) : true;

  return <T>(source: Observable<T>) =>
    source.pipe(
      retryWhen<T>(errors =>
        errors.pipe(
          concatMap((error, i) =>
            iif(
              () => i < maxRetries && shouldRetry(error),
              timer(
                getDelay(
                  exponentialBackOffDelay(i, config.initialInterval),
                  maxInterval,
                ),
              ),
              throwError(error),
            ),
          ),
        ),
      ),
    );
}

/** Calculates the actual delay which can be limited by maxInterval */
export function getDelay(backOffDelay: number, maxInterval: number): number {
  return Math.min(backOffDelay, maxInterval);
}

/** Exponential back-off delay */
export function exponentialBackOffDelay(
  iteration: number,
  initialInterval: number,
): number {
  return Math.pow(2, iteration) * initialInterval;
}
