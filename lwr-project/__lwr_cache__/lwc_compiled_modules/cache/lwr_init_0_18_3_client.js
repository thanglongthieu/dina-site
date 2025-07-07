// eslint-disable-next-line lwr/only-allowed-type-imports

// eslint-disable-next-line lwr/only-allowed-type-imports

import { BOOTSTRAP_END, INIT, INIT_MODULE } from 'lwr/metrics';
import { logOperationStart, logOperationEnd } from 'lwr/profiler';

// TODO: This is a temporal workaround until https://github.com/salesforce/lwc/pull/2083 is sorted - tmp
// eslint-disable-next-line lwr/only-allowed-imports
import { createElement, hydrateComponent } from 'lwc';

// <hydrateComponentProxy> - This code is removed in core
// Note: a build step uses these comments to strip the code for core.
// eslint-disable-next-line lwr/only-allowed-imports

function hydrateComponentProxy(customElement, Ctor, props) {
  hydrateComponent(customElement, Ctor, props);
}
// </hydrateComponentProxy>

const shouldYield = (() => {
  const globalThisLWR = globalThis;
  const {
    SSREnabled
  } = globalThisLWR.LWR && globalThisLWR.LWR.env || {};

  // eslint-disable-next-line lwr/no-unguarded-apis
  if (!globalThis.performance || !SSREnabled) {
    return () => false;
  }

  // Break up hydration tasks into timed batches.
  // Borrowed from https://tinyurl.com/5b4fw7eb
  const TASK_BATCH_DURATION = 50;
  // eslint-disable-next-line lwr/no-unguarded-apis
  let timeOfLastYield = globalThis.performance.now();
  return () => {
    // eslint-disable-next-line lwr/no-unguarded-apis
    const now = globalThis.performance.now();
    if (now - timeOfLastYield > TASK_BATCH_DURATION) {
      timeOfLastYield = now;
      return true;
    }
    return false;
  };
})();
function initializeWebComponent(elementName, Ctor) {
  return createElement(elementName, {
    is: Ctor
  });
}

/**
 * Convert a module specifier into a valid CustomElement registry name:
 *      - remove any version linking
 *      - change / to -
 *      - convert uppercase letters into "-${lowercase}"
 * eg: "c/app" => "c-app"
 * eg: "my/helloWorld" => "my-hello-world"
 * eg: "lwr/example/v/1.0.0" => "lwr-example"
 * @param specifier The bare specifier to convert
 */
export function toKebabCase(specifier) {
  return specifier.replace(/\/v\/[a-zA-Z0-9-_.]+$/, '').replace('/', '-').replace(/([A-Z])/g, c => `-${c.toLowerCase()}`);
}

/**
 * This method maps between attribute names
 * and the corresponding props name.
 */
const CAMEL_REGEX = /-([a-z])/g;
export function getPropFromAttrName(propName) {
  return propName.replace(CAMEL_REGEX, g => g[1].toUpperCase());
}

/**
 * Import any requested static application dependencies, define the root
 * application component(s) into the CustomElement registry, and inject them.
 * @param rootModules - An array of arrays, each one holding a pair of
 *                      bare specifier and corresponding LightningElement constructor
 * @example - [['x/appRoot', appCtor], ['x/nav', navCtor]]
 */
export function init(rootModules, serverData = {}) {
  // eslint-disable-next-line lwr/no-unguarded-apis
  if (typeof globalThis.customElements === 'undefined' || typeof globalThis.document === 'undefined') {
    logOperationStart({
      id: BOOTSTRAP_END
    });
    return;
  }
  logOperationStart({
    id: INIT
  });
  (async () => {
    let index = 0;
    // eslint-disable-next-line lwr/no-unguarded-apis
    const document = globalThis.document;
    for (const [specifier, ctor] of rootModules) {
      if (shouldYield()) {
        // Yield to the main thread during long hydration tasks
        // eslint-disable-next-line no-await-in-loop
        await yieldToMainThread();
      }
      const specifierIndex = ++index;
      const elementName = toKebabCase(specifier);

      // initialize and inject the root module into the LWR Root or DOM if it is missing
      // eslint-disable-next-line lwr/no-unguarded-apis
      if (!document.body.querySelector(elementName)) {
        logOperationStart({
          id: INIT_MODULE,
          specifier,
          specifierIndex
        });

        // this is for SPA like routes (one component at the root level) utilizing the lwr-root directive
        const component = initializeWebComponent(elementName, ctor);
        // eslint-disable-next-line lwr/no-unguarded-apis
        const container = document.querySelector('[lwr-root]');
        // eslint-disable-next-line lwr/no-unguarded-apis
        container ? container.appendChild(component) : document.body.appendChild(component);
        logOperationEnd({
          id: INIT_MODULE,
          specifier,
          specifierIndex,
          metadata: {
            renderMode: 'spa'
          }
        });
        continue;
      }

      // the page has been rendered or SSR'd, and each component needs to initialized(or hydrated)
      // eslint-disable-next-line lwr/no-unguarded-apis
      const elements = document.querySelectorAll(elementName);
      for (const element of elements) {
        logOperationStart({
          id: INIT_MODULE,
          specifier,
          specifierIndex
        });
        const propsId = element.dataset.lwrPropsId;

        // hydrate SSR'd components
        if (propsId) {
          hydrateComponentProxy(element, ctor, serverData[propsId] || {});
          logOperationEnd({
            id: INIT_MODULE,
            specifier,
            specifierIndex,
            metadata: {
              renderMode: 'ssr'
            }
          });
          continue;
        }

        // Note: due to the bug described at the top of this file, each CSR'd custom element
        // must be replaced with the new synthetic constructor. Attributes and children are
        // copied over to the new component.
        const component = initializeWebComponent(elementName, ctor);

        // copy the attributes
        for (const {
          name,
          value
        } of element.attributes) {
          component.setAttribute(name, value);
          const prop = getPropFromAttrName(name);
          if (prop in component) {
            // set attributes as properties for reactivity
            component[prop] = value;
          }
        }

        // save the children
        while (element.childNodes.length > 0) {
          component.appendChild(element.childNodes[0]);
        }

        // swap the element out with the initialized component
        const parent = element.parentElement;
        if (parent) {
          parent.replaceChild(component, element);
        }
        logOperationEnd({
          id: INIT_MODULE,
          specifier,
          specifierIndex,
          metadata: {
            renderMode: 'csr'
          }
        });
      }
    }
  })();
  logOperationEnd({
    id: INIT
  });
  logOperationStart({
    id: BOOTSTRAP_END
  });
}

// Allows the browser to yield to the main thread during long-running tasks, improving responsiveness.
async function yieldToMainThread() {
  const scheduler = globalThis.scheduler;
  // eslint-disable-next-line lwr/no-unguarded-apis
  return scheduler?.yield ? scheduler.yield() : new Promise(resolve => setTimeout(resolve, 0));
}