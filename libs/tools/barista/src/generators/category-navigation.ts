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

import { join, dirname } from 'path';
import {
  promises as fs,
  readFileSync,
  readdirSync,
  lstatSync,
  existsSync,
} from 'fs';

import {
  BaCategoryNavigation,
  BaCategoryNavigationSectionItem,
  BaSinglePageMeta,
  BaNav,
  BaNavItem,
  BaPageLayoutType,
} from '@dynatrace/shared/barista-definitions';
import { environment } from '@environments/barista-environment';
import { BaPageBuildResult } from '../types';

// for now we manually select highlighted items, later this data can maybe be fetched from google analytics
const highlightedItems = [
  'Table',
  'Chart',
  'Button',
  'Filter field',
  'Card',
  'Icon',
  'Changelog',
  'Get started',
  'Colors',
  'Icons',
  'Common UI styles',
  'Theming',
];

const navigationOrder = [
  'Brand',
  'Resources',
  'Guidelines',
  'Components',
  'Patterns',
];

const overviewDescriptions = new Map<string, string>([
  [
    'components',
    'Read all about development with/of our Angular components in how to get started. If you run into any troubles or want to contribute, please visit our GitHub page.',
  ],
  [
    'patterns',
    'Patterns are specific procedures, flows and behaviors in our platform. They help to establish a consistent handling of functions and assure expected behavior for users throughout the product.',
  ],
  [
    'guidelines',
    'Guidelines are streamlining processes, setting routines and provide guidance on how to tackle projects. You can find basic information, general rules, principles and methods here on how we want to work at Dynatrace.',
  ],
]);

/** add the sidenav to each page */
function addSidenavToPages(
  files: BaPageBuildResult[],
  sidenavContent: BaCategoryNavigation,
  path: string,
): BaPageBuildResult[] {

  const transformedPages: BaPageBuildResult[] = []

  for (const file of files) {
    const content = file.pageContent as any;
    const filePath = file.relativeOutFile;

    let currentSidenav = sidenavContent;
    const fileTitle = content.title;

    // highlight active item
    for (const section of currentSidenav.sections) {
      for (const item of section.items) {
        item.active = Boolean(item.title == fileTitle);
      }
    }

    // add sidenav to the json file
    content.sidenav = currentSidenav;
    console.log(fileTitle, content.sidenav)

    // transformedPages.push(file);


    //   fs.writeFile(join(path, file), JSON.stringify(content, null, 2), {
    //     flag: 'w', // "w" -> Create file if it does not exist
    //     encoding: 'utf8',
    //   });

    //   // if there are subpages, add a sidenav to each of them
    //   const pathToSubfolder = join(path, file.replace(/\.[^/.]+$/, ''));
    //   if (
    //     existsSync(pathToSubfolder) &&
    //     lstatSync(pathToSubfolder).isDirectory()
    //   ) {
    //     const subPages = readdirSync(pathToSubfolder);
    //     for (const subPage of subPages) {
    //       const subPagePath = join(pathToSubfolder, subPage);
    //       const subPageContent = JSON.parse(
    //         readFileSync(subPagePath).toString(),
    //       );
    //       subPageContent.sidenav = currentSidenav;
    //       fs.writeFile(subPagePath, JSON.stringify(subPageContent, null, 2), {
    //         flag: 'w', // "w" -> Create file if it does not exist
    //         encoding: 'utf8',
    //       });
    //     }
    //   }
  }

  return transformedPages
}

function orderSectionItems(
  categoryNav: BaCategoryNavigation,
): BaCategoryNavigation {
  // sort all items by order, if an item doesn't have an order it should come
  // last. If more than one item doesn't have an order they are sorted alphabetically.
  for (const section of categoryNav.sections) {
    const sectionItems = section.items;
    sectionItems.sort(function(
      a: BaCategoryNavigationSectionItem,
      b: BaCategoryNavigationSectionItem,
    ): number {
      if (a.order && b.order) {
        return a.order - b.order;
      }

      if (b.order) {
        return 1;
      }

      if (a.order) {
        return -1;
      }

      return a.title.localeCompare(b.title);
    });
    section.items = sectionItems;
  }
  return categoryNav;
}

function getOverviewSectionItem(
  filecontent: BaSinglePageMeta,
  section: string,
  filepath: string,
): BaCategoryNavigationSectionItem {
  let properties =
    filecontent.properties && filecontent.properties.length > 0
      ? [...filecontent.properties]
      : [];
  if (highlightedItems.includes(filecontent.title)) {
    properties.push('favorite');
  }

  return {
    title: filecontent.title,
    identifier:
      filecontent.title && filecontent.title.length > 1
        ? filecontent.title[0] + filecontent.title[1]
        : 'Id',
    description: filecontent.description || '',
    section: section,
    link: `/${filepath}`,
    badge: properties,
    order: filecontent.order,
  };
}

/**
 * Builds overview pages for sub directories like components.
 * @param files A list of all files
 */
export function overviewBuilder(
  generatedFiles: BaPageBuildResult[],
): BaPageBuildResult[] {
  const subDirectories = new Set(
    generatedFiles
      .map(({ relativeOutFile }) => dirname(relativeOutFile).split('/')[0])
      .filter(name => name !== '.' && name.length), // filter the current directory out.
  );

  // Array of pages that should be written to the file system
  const pages: BaPageBuildResult[] = [];

  let nav: BaNav = {
    navItems: [],
  };

  subDirectories.forEach(directory => {
    const path = join(environment.distDir, directory);
    let overviewPage: BaCategoryNavigation;
    const files = generatedFiles.filter(({ relativeOutFile }) =>
      relativeOutFile.startsWith(directory),
    );

    const capitalizedTitle =
      directory.charAt(0).toUpperCase() + directory.slice(1);

    nav.navItems.push({
      label: capitalizedTitle,
      url: `/${directory}/`,
      order: navigationOrder.indexOf(capitalizedTitle) + 1,
    });

    if (directory !== 'components') {
      const items = files.map(({ pageContent, relativeOutFile }) =>
        getOverviewSectionItem(pageContent, capitalizedTitle, relativeOutFile),
      );

      overviewPage = {
        title: capitalizedTitle,
        id: directory,
        layout: BaPageLayoutType.Overview,
        sections: [{ items }],
      };
    } else {
      overviewPage = {
        title: 'Components',
        id: 'components',
        layout: BaPageLayoutType.Overview,
        sections: [
          {
            title: 'Documentation',
            items: [],
          },
          {
            title: 'Components',
            items: [],
          },
          {
            title: 'Angular resources',
            items: [],
          },
        ],
      };

      for (const { relativeOutFile: filepath, pageContent: content } of files) {
        for (const section of overviewPage.sections) {
          if (
            content.navGroup === 'docs' &&
            section.title === 'Documentation'
          ) {
            section.items.push(
              getOverviewSectionItem(content, section.title, filepath),
            );
          } else if (
            content.navGroup === 'other' &&
            section.title === 'Angular resources'
          ) {
            section.items.push(
              getOverviewSectionItem(content, 'Angular resource', filepath),
            );
          } else if (section.title === 'Components' && !content.navGroup) {
            section.items.push(
              getOverviewSectionItem(content, 'Component', filepath),
            );
          }
        }
      }
    }

    overviewPage.description = overviewDescriptions.get(overviewPage.id);

    overviewPage = orderSectionItems(overviewPage!);

    // TODO: This is ugly refactor it!
    pages.push(...addSidenavToPages(files, overviewPage, path));

    pages.push({
      relativeOutFile: `${directory}.json`,
      pageContent: overviewPage as any,
    });
  });

  nav.navItems.sort(function(a: BaNavItem, b: BaNavItem): number {
    if (a.order && b.order) {
      return a.order - b.order;
    }

    if (b.order) {
      return 1;
    }

    return -1;
  });

  console.log(nav)

  pages.push({
    relativeOutFile: 'nav.json',
    pageContent: nav as any,
  });

  return pages;
}
