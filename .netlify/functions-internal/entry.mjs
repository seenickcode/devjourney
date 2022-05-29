import * as adapter from '@astrojs/netlify/netlify-functions.js';
import serializeJavaScript from 'serialize-javascript';

/**
 * Copyright (C) 2017-present by Andrea Giammarchi - @WebReflection
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const {replace} = '';
const ca = /[&<>'"]/g;

const esca = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
};
const pe = m => esca[m];

/**
 * Safely escape HTML entities such as `&`, `<`, `>`, `"`, and `'`.
 * @param {string} es the input to safely escape
 * @returns {string} the escaped input, and it **throws** an error if
 *  the input type is unexpected, except for boolean and numbers,
 *  converted as string.
 */
const escape = es => replace.call(es, ca, pe);

const escapeHTML = escape;
class HTMLString extends String {
}
const markHTMLString = (value) => {
  if (value instanceof HTMLString) {
    return value;
  }
  if (typeof value === "string") {
    return new HTMLString(value);
  }
  return value;
};

function serializeListValue(value) {
  const hash = {};
  push(value);
  return Object.keys(hash).join(" ");
  function push(item) {
    if (item && typeof item.forEach === "function")
      item.forEach(push);
    else if (item === Object(item))
      Object.keys(item).forEach((name) => {
        if (item[name])
          push(name);
      });
    else {
      item = item == null ? "" : String(item).trim();
      if (item) {
        item.split(/\s+/).forEach((name) => {
          hash[name] = true;
        });
      }
    }
  }
}
function hydrationSpecifier(hydrate) {
  return `astro/client/${hydrate}.js`;
}

function serializeProps(value) {
  return serializeJavaScript(value);
}
const HydrationDirectives = ["load", "idle", "media", "visible", "only"];
function extractDirectives(inputProps) {
  let extracted = {
    hydration: null,
    props: {}
  };
  for (const [key, value] of Object.entries(inputProps)) {
    if (key.startsWith("client:")) {
      if (!extracted.hydration) {
        extracted.hydration = {
          directive: "",
          value: "",
          componentUrl: "",
          componentExport: { value: "" }
        };
      }
      switch (key) {
        case "client:component-path": {
          extracted.hydration.componentUrl = value;
          break;
        }
        case "client:component-export": {
          extracted.hydration.componentExport.value = value;
          break;
        }
        case "client:component-hydration": {
          break;
        }
        default: {
          extracted.hydration.directive = key.split(":")[1];
          extracted.hydration.value = value;
          if (HydrationDirectives.indexOf(extracted.hydration.directive) < 0) {
            throw new Error(`Error: invalid hydration directive "${key}". Supported hydration methods: ${HydrationDirectives.map((d) => `"client:${d}"`).join(", ")}`);
          }
          if (extracted.hydration.directive === "media" && typeof extracted.hydration.value !== "string") {
            throw new Error('Error: Media query must be provided for "client:media", similar to client:media="(max-width: 600px)"');
          }
          break;
        }
      }
    } else if (key === "class:list") {
      extracted.props[key.slice(0, -5)] = serializeListValue(value);
    } else {
      extracted.props[key] = value;
    }
  }
  return extracted;
}
async function generateHydrateScript(scriptOptions, metadata) {
  const { renderer, result, astroId, props } = scriptOptions;
  const { hydrate, componentUrl, componentExport } = metadata;
  if (!componentExport) {
    throw new Error(`Unable to resolve a componentExport for "${metadata.displayName}"! Please open an issue.`);
  }
  const hydrationSource = renderer.clientEntrypoint ? `const [{ ${componentExport.value}: Component }, { default: hydrate }] = await Promise.all([import("${await result.resolve(componentUrl)}"), import("${await result.resolve(renderer.clientEntrypoint)}")]);
  return (el, children) => hydrate(el)(Component, ${serializeProps(props)}, children, ${JSON.stringify({ client: hydrate })});
` : `await import("${await result.resolve(componentUrl)}");
  return () => {};
`;
  const hydrationScript = {
    props: { type: "module", "data-astro-component-hydration": true },
    children: `import setup from '${await result.resolve(hydrationSpecifier(hydrate))}';
${`import '${await result.resolve("astro:scripts/before-hydration.js")}';`}
setup("${astroId}", {name:"${metadata.displayName}",${metadata.hydrateArgs ? `value: ${JSON.stringify(metadata.hydrateArgs)}` : ""}}, async () => {
  ${hydrationSource}
});
`
  };
  return hydrationScript;
}

/**
 * shortdash - https://github.com/bibig/node-shorthash
 *
 * @license
 *
 * (The MIT License)
 *
 * Copyright (c) 2013 Bibig <bibig@me.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
const dictionary = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY";
const binary = dictionary.length;
function bitwise(str) {
  let hash = 0;
  if (str.length === 0)
    return hash;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash = hash & hash;
  }
  return hash;
}
function shorthash(text) {
  let num;
  let result = "";
  let integer = bitwise(text);
  const sign = integer < 0 ? "Z" : "";
  integer = Math.abs(integer);
  while (integer >= binary) {
    num = integer % binary;
    integer = Math.floor(integer / binary);
    result = dictionary[num] + result;
  }
  if (integer > 0) {
    result = dictionary[integer] + result;
  }
  return sign + result;
}

class Metadata {
  constructor(filePathname, opts) {
    this.modules = opts.modules;
    this.hoisted = opts.hoisted;
    this.hydratedComponents = opts.hydratedComponents;
    this.clientOnlyComponents = opts.clientOnlyComponents;
    this.hydrationDirectives = opts.hydrationDirectives;
    this.mockURL = new URL(filePathname, "http://example.com");
    this.metadataCache = /* @__PURE__ */ new Map();
  }
  resolvePath(specifier) {
    return specifier.startsWith(".") ? new URL(specifier, this.mockURL).pathname : specifier;
  }
  getPath(Component) {
    const metadata = this.getComponentMetadata(Component);
    return (metadata == null ? void 0 : metadata.componentUrl) || null;
  }
  getExport(Component) {
    const metadata = this.getComponentMetadata(Component);
    return (metadata == null ? void 0 : metadata.componentExport) || null;
  }
  *hydratedComponentPaths() {
    const found = /* @__PURE__ */ new Set();
    for (const metadata of this.deepMetadata()) {
      for (const component of metadata.hydratedComponents) {
        const path = metadata.getPath(component);
        if (path && !found.has(path)) {
          found.add(path);
          yield path;
        }
      }
    }
  }
  *clientOnlyComponentPaths() {
    const found = /* @__PURE__ */ new Set();
    for (const metadata of this.deepMetadata()) {
      for (const component of metadata.clientOnlyComponents) {
        const path = metadata.resolvePath(component);
        if (path && !found.has(path)) {
          found.add(path);
          yield path;
        }
      }
    }
  }
  *hydrationDirectiveSpecifiers() {
    const found = /* @__PURE__ */ new Set();
    for (const metadata of this.deepMetadata()) {
      for (const directive of metadata.hydrationDirectives) {
        if (!found.has(directive)) {
          found.add(directive);
          yield hydrationSpecifier(directive);
        }
      }
    }
  }
  *hoistedScriptPaths() {
    for (const metadata of this.deepMetadata()) {
      let i = 0, pathname = metadata.mockURL.pathname;
      while (i < metadata.hoisted.length) {
        yield `${pathname}?astro&type=script&index=${i}`;
        i++;
      }
    }
  }
  *deepMetadata() {
    yield this;
    const seen = /* @__PURE__ */ new Set();
    for (const { module: mod } of this.modules) {
      if (typeof mod.$$metadata !== "undefined") {
        const md = mod.$$metadata;
        for (const childMetdata of md.deepMetadata()) {
          if (!seen.has(childMetdata)) {
            seen.add(childMetdata);
            yield childMetdata;
          }
        }
      }
    }
  }
  getComponentMetadata(Component) {
    if (this.metadataCache.has(Component)) {
      return this.metadataCache.get(Component);
    }
    const metadata = this.findComponentMetadata(Component);
    this.metadataCache.set(Component, metadata);
    return metadata;
  }
  findComponentMetadata(Component) {
    const isCustomElement = typeof Component === "string";
    for (const { module, specifier } of this.modules) {
      const id = this.resolvePath(specifier);
      for (const [key, value] of Object.entries(module)) {
        if (isCustomElement) {
          if (key === "tagName" && Component === value) {
            return {
              componentExport: key,
              componentUrl: id
            };
          }
        } else if (Component === value) {
          return {
            componentExport: key,
            componentUrl: id
          };
        }
      }
    }
    return null;
  }
}
function createMetadata(filePathname, options) {
  return new Metadata(filePathname, options);
}

var __getOwnPropSymbols$1 = Object.getOwnPropertySymbols;
var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
var __propIsEnum$1 = Object.prototype.propertyIsEnumerable;
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp$1.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols$1)
    for (var prop of __getOwnPropSymbols$1(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum$1.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
const voidElementNames = /^(area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/i;
const htmlBooleanAttributes = /^(allowfullscreen|async|autofocus|autoplay|controls|default|defer|disabled|disablepictureinpicture|disableremoteplayback|formnovalidate|hidden|loop|nomodule|novalidate|open|playsinline|readonly|required|reversed|scoped|seamless|itemscope)$/i;
const htmlEnumAttributes = /^(contenteditable|draggable|spellcheck|value)$/i;
const svgEnumAttributes = /^(autoReverse|externalResourcesRequired|focusable|preserveAlpha)$/i;
async function _render(child) {
  child = await child;
  if (child instanceof HTMLString) {
    return child;
  } else if (Array.isArray(child)) {
    return markHTMLString((await Promise.all(child.map((value) => _render(value)))).join(""));
  } else if (typeof child === "function") {
    return _render(child());
  } else if (typeof child === "string") {
    return markHTMLString(escapeHTML(child));
  } else if (!child && child !== 0) ; else if (child instanceof AstroComponent || Object.prototype.toString.call(child) === "[object AstroComponent]") {
    return markHTMLString(await renderAstroComponent(child));
  } else {
    return child;
  }
}
class AstroComponent {
  constructor(htmlParts, expressions) {
    this.htmlParts = htmlParts;
    this.expressions = expressions;
  }
  get [Symbol.toStringTag]() {
    return "AstroComponent";
  }
  *[Symbol.iterator]() {
    const { htmlParts, expressions } = this;
    for (let i = 0; i < htmlParts.length; i++) {
      const html = htmlParts[i];
      const expression = expressions[i];
      yield markHTMLString(html);
      yield _render(expression);
    }
  }
}
function isAstroComponent(obj) {
  return typeof obj === "object" && Object.prototype.toString.call(obj) === "[object AstroComponent]";
}
async function render(htmlParts, ...expressions) {
  return new AstroComponent(htmlParts, expressions);
}
function createComponent(cb) {
  cb.isAstroComponentFactory = true;
  return cb;
}
async function renderSlot(_result, slotted, fallback) {
  if (slotted) {
    return await _render(slotted);
  }
  return fallback;
}
const Fragment = Symbol("Astro.Fragment");
function guessRenderers(componentUrl) {
  const extname = componentUrl == null ? void 0 : componentUrl.split(".").pop();
  switch (extname) {
    case "svelte":
      return ["@astrojs/svelte"];
    case "vue":
      return ["@astrojs/vue"];
    case "jsx":
    case "tsx":
      return ["@astrojs/react", "@astrojs/preact"];
    default:
      return ["@astrojs/react", "@astrojs/preact", "@astrojs/vue", "@astrojs/svelte"];
  }
}
function formatList(values) {
  if (values.length === 1) {
    return values[0];
  }
  return `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}
async function renderComponent(result, displayName, Component, _props, slots = {}) {
  var _a;
  Component = await Component;
  if (Component === Fragment) {
    const children2 = await renderSlot(result, slots == null ? void 0 : slots.default);
    if (children2 == null) {
      return children2;
    }
    return markHTMLString(children2);
  }
  if (Component && Component.isAstroComponentFactory) {
    const output = await renderToString(result, Component, _props, slots);
    return markHTMLString(output);
  }
  if (Component === null && !_props["client:only"]) {
    throw new Error(`Unable to render ${displayName} because it is ${Component}!
Did you forget to import the component or is it possible there is a typo?`);
  }
  const { renderers } = result._metadata;
  const metadata = { displayName };
  const { hydration, props } = extractDirectives(_props);
  let html = "";
  if (hydration) {
    metadata.hydrate = hydration.directive;
    metadata.hydrateArgs = hydration.value;
    metadata.componentExport = hydration.componentExport;
    metadata.componentUrl = hydration.componentUrl;
  }
  const probableRendererNames = guessRenderers(metadata.componentUrl);
  if (Array.isArray(renderers) && renderers.length === 0 && typeof Component !== "string" && !componentIsHTMLElement(Component)) {
    const message = `Unable to render ${metadata.displayName}!

There are no \`integrations\` set in your \`astro.config.mjs\` file.
Did you mean to add ${formatList(probableRendererNames.map((r) => "`" + r + "`"))}?`;
    throw new Error(message);
  }
  const children = await renderSlot(result, slots == null ? void 0 : slots.default);
  let renderer;
  if (metadata.hydrate !== "only") {
    let error;
    for (const r of renderers) {
      try {
        if (await r.ssr.check(Component, props, children)) {
          renderer = r;
          break;
        }
      } catch (e) {
        error ?? (error = e);
      }
    }
    if (error) {
      throw error;
    }
    if (!renderer && typeof HTMLElement === "function" && componentIsHTMLElement(Component)) {
      const output = renderHTMLElement(result, Component, _props, slots);
      return output;
    }
  } else {
    if (metadata.hydrateArgs) {
      const rendererName = metadata.hydrateArgs;
      renderer = renderers.filter(({ name }) => name === `@astrojs/${rendererName}` || name === rendererName)[0];
    }
    if (!renderer && renderers.length === 1) {
      renderer = renderers[0];
    }
    if (!renderer) {
      const extname = (_a = metadata.componentUrl) == null ? void 0 : _a.split(".").pop();
      renderer = renderers.filter(({ name }) => name === `@astrojs/${extname}` || name === extname)[0];
    }
  }
  if (!renderer) {
    if (metadata.hydrate === "only") {
      throw new Error(`Unable to render ${metadata.displayName}!

Using the \`client:only\` hydration strategy, Astro needs a hint to use the correct renderer.
Did you mean to pass <${metadata.displayName} client:only="${probableRendererNames.map((r) => r.replace("@astrojs/", "")).join("|")}" />
`);
    } else if (typeof Component !== "string") {
      const matchingRenderers = renderers.filter((r) => probableRendererNames.includes(r.name));
      const plural = renderers.length > 1;
      if (matchingRenderers.length === 0) {
        throw new Error(`Unable to render ${metadata.displayName}!

There ${plural ? "are" : "is"} ${renderers.length} renderer${plural ? "s" : ""} configured in your \`astro.config.mjs\` file,
but ${plural ? "none were" : "it was not"} able to server-side render ${metadata.displayName}.

Did you mean to enable ${formatList(probableRendererNames.map((r) => "`" + r + "`"))}?`);
      } else if (matchingRenderers.length === 1) {
        renderer = matchingRenderers[0];
        ({ html } = await renderer.ssr.renderToStaticMarkup(Component, props, children, metadata));
      } else {
        throw new Error(`Unable to render ${metadata.displayName}!

This component likely uses ${formatList(probableRendererNames)},
but Astro encountered an error during server-side rendering.

Please ensure that ${metadata.displayName}:
1. Does not unconditionally access browser-specific globals like \`window\` or \`document\`.
   If this is unavoidable, use the \`client:only\` hydration directive.
2. Does not conditionally return \`null\` or \`undefined\` when rendered on the server.

If you're still stuck, please open an issue on GitHub or join us at https://astro.build/chat.`);
      }
    }
  } else {
    if (metadata.hydrate === "only") {
      html = await renderSlot(result, slots == null ? void 0 : slots.fallback);
    } else {
      ({ html } = await renderer.ssr.renderToStaticMarkup(Component, props, children, metadata));
    }
  }
  if (!html && typeof Component === "string") {
    html = await renderAstroComponent(await render`<${Component}${spreadAttributes(props)}${markHTMLString((children == null || children == "") && voidElementNames.test(Component) ? `/>` : `>${children == null ? "" : children}</${Component}>`)}`);
  }
  if (!hydration) {
    return markHTMLString(html.replace(/\<\/?astro-fragment\>/g, ""));
  }
  const astroId = shorthash(`<!--${metadata.componentExport.value}:${metadata.componentUrl}-->
${html}
${serializeProps(props)}`);
  result.scripts.add(await generateHydrateScript({ renderer, result, astroId, props }, metadata));
  const needsAstroTemplate = children && !/<\/?astro-fragment\>/.test(html);
  const template = needsAstroTemplate ? `<template data-astro-template>${children}</template>` : "";
  return markHTMLString(`<astro-root uid="${astroId}"${needsAstroTemplate ? " tmpl" : ""}>${html ?? ""}${template}</astro-root>`);
}
function createDeprecatedFetchContentFn() {
  return () => {
    throw new Error("Deprecated: Astro.fetchContent() has been replaced with Astro.glob().");
  };
}
function createAstroGlobFn() {
  const globHandler = (importMetaGlobResult, globValue) => {
    let allEntries = [...Object.values(importMetaGlobResult)];
    if (allEntries.length === 0) {
      throw new Error(`Astro.glob(${JSON.stringify(globValue())}) - no matches found.`);
    }
    return Promise.all(allEntries.map((fn) => fn()));
  };
  return globHandler;
}
function createAstro(filePathname, _site, projectRootStr) {
  const site = new URL(_site);
  const url = new URL(filePathname, site);
  const projectRoot = new URL(projectRootStr);
  return {
    site,
    fetchContent: createDeprecatedFetchContentFn(),
    glob: createAstroGlobFn(),
    resolve(...segments) {
      let resolved = segments.reduce((u, segment) => new URL(segment, u), url).pathname;
      if (resolved.startsWith(projectRoot.pathname)) {
        resolved = "/" + resolved.slice(projectRoot.pathname.length);
      }
      return resolved;
    }
  };
}
const toAttributeString = (value, shouldEscape = true) => shouldEscape ? String(value).replace(/&/g, "&#38;").replace(/"/g, "&#34;") : value;
const STATIC_DIRECTIVES = /* @__PURE__ */ new Set(["set:html", "set:text"]);
function addAttribute(value, key, shouldEscape = true) {
  if (value == null) {
    return "";
  }
  if (value === false) {
    if (htmlEnumAttributes.test(key) || svgEnumAttributes.test(key)) {
      return markHTMLString(` ${key}="false"`);
    }
    return "";
  }
  if (STATIC_DIRECTIVES.has(key)) {
    console.warn(`[astro] The "${key}" directive cannot be applied dynamically at runtime. It will not be rendered as an attribute.

Make sure to use the static attribute syntax (\`${key}={value}\`) instead of the dynamic spread syntax (\`{...{ "${key}": value }}\`).`);
    return "";
  }
  if (key === "class:list") {
    return markHTMLString(` ${key.slice(0, -5)}="${toAttributeString(serializeListValue(value))}"`);
  }
  if (value === true && (key.startsWith("data-") || htmlBooleanAttributes.test(key))) {
    return markHTMLString(` ${key}`);
  } else {
    return markHTMLString(` ${key}="${toAttributeString(value, shouldEscape)}"`);
  }
}
function spreadAttributes(values, shouldEscape = true) {
  let output = "";
  for (const [key, value] of Object.entries(values)) {
    output += addAttribute(value, key, shouldEscape);
  }
  return markHTMLString(output);
}
function defineStyleVars(selector, vars) {
  let output = "\n";
  for (const [key, value] of Object.entries(vars)) {
    output += `  --${key}: ${value};
`;
  }
  return markHTMLString(`${selector} {${output}}`);
}
function defineScriptVars(vars) {
  let output = "";
  for (const [key, value] of Object.entries(vars)) {
    output += `let ${key} = ${JSON.stringify(value)};
`;
  }
  return markHTMLString(output);
}
async function replaceHeadInjection(result, html) {
  let template = html;
  if (template.indexOf("<!--astro:head-->") > -1) {
    template = template.replace("<!--astro:head-->", await renderHead(result));
  }
  return template;
}
async function renderToString(result, componentFactory, props, children) {
  const Component = await componentFactory(result, props, children);
  if (!isAstroComponent(Component)) {
    const response = Component;
    throw response;
  }
  let template = await renderAstroComponent(Component);
  return replaceHeadInjection(result, template);
}
const uniqueElements = (item, index, all) => {
  const props = JSON.stringify(item.props);
  const children = item.children;
  return index === all.findIndex((i) => JSON.stringify(i.props) === props && i.children == children);
};
async function renderHead(result) {
  const styles = Array.from(result.styles).filter(uniqueElements).map((style) => renderElement("style", style));
  let needsHydrationStyles = false;
  const scripts = Array.from(result.scripts).filter(uniqueElements).map((script, i) => {
    if ("data-astro-component-hydration" in script.props) {
      needsHydrationStyles = true;
    }
    return renderElement("script", script);
  });
  if (needsHydrationStyles) {
    styles.push(renderElement("style", {
      props: {},
      children: "astro-root, astro-fragment { display: contents; }"
    }));
  }
  const links = Array.from(result.links).filter(uniqueElements).map((link) => renderElement("link", link, false));
  return markHTMLString(links.join("\n") + styles.join("\n") + scripts.join("\n") + "\n<!--astro:head:injected-->");
}
async function renderAstroComponent(component) {
  let template = [];
  for await (const value of component) {
    if (value || value === 0) {
      template.push(value);
    }
  }
  return markHTMLString(await _render(template));
}
function componentIsHTMLElement(Component) {
  return typeof HTMLElement !== "undefined" && HTMLElement.isPrototypeOf(Component);
}
async function renderHTMLElement(result, constructor, props, slots) {
  const name = getHTMLElementName(constructor);
  let attrHTML = "";
  for (const attr in props) {
    attrHTML += ` ${attr}="${toAttributeString(await props[attr])}"`;
  }
  return markHTMLString(`<${name}${attrHTML}>${await renderSlot(result, slots == null ? void 0 : slots.default)}</${name}>`);
}
function getHTMLElementName(constructor) {
  const definedName = customElements.getName(constructor);
  if (definedName)
    return definedName;
  const assignedName = constructor.name.replace(/^HTML|Element$/g, "").replace(/[A-Z]/g, "-$&").toLowerCase().replace(/^-/, "html-");
  return assignedName;
}
function renderElement(name, { props: _props, children = "" }, shouldEscape = true) {
  const _a = _props, { lang: _, "data-astro-id": astroId, "define:vars": defineVars } = _a, props = __objRest(_a, ["lang", "data-astro-id", "define:vars"]);
  if (defineVars) {
    if (name === "style") {
      if (props["is:global"]) {
        children = defineStyleVars(`:root`, defineVars) + "\n" + children;
      } else {
        children = defineStyleVars(`.astro-${astroId}`, defineVars) + "\n" + children;
      }
      delete props["is:global"];
      delete props["is:scoped"];
    }
    if (name === "script") {
      delete props.hoist;
      children = defineScriptVars(defineVars) + "\n" + children;
    }
  }
  return `<${name}${spreadAttributes(props, shouldEscape)}>${children}</${name}>`;
}

var app = ":root {\n  --font-fallback: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial,\n    sans-serif, Apple Color Emoji, Segoe UI Emoji;\n  --font-body: \"IBM Plex Sans\", var(--font-fallback);\n  --font-mono: \"IBM Plex Mono\", Consolas, \"Andale Mono WT\", \"Andale Mono\",\n    \"Lucida Console\", \"Lucida Sans Typewriter\", \"DejaVu Sans Mono\",\n    \"Bitstream Vera Sans Mono\", \"Liberation Mono\", \"Nimbus Mono L\", Monaco,\n    \"Courier New\", Courier, monospace;\n  --font-serif: \"Abril Fatface\", cursive, var(--font-fallback);\n}\n\n* {\n  box-sizing: border-box;\n  margin: 0;\n}\n\nbody {\n  /* ensures a footer that sticks to bottom of screen */\n  min-height: 100vh;\n  display: flex;\n  flex-direction: column;\n\n  font-family: var(--font-body);\n  font-size: 1rem;\n  line-height: 1.625;\n\n  background: var(--theme-bg);\n  color: var(--theme-text);\n}\n\n:is(h1, h2, h3, h4, h5, h6) {\n  font-family: var(--font-serif);\n  margin-top: 1.2rem;\n  margin-bottom: 1.2rem;\n  font-weight: 400;\n  line-height: 1.3;\n  color: var(--theme-text-light);\n}\n\nh1 {\n  font-size: 2.5rem;\n}\n\nh2 {\n  margin-top: 2rem;\n  font-size: 2rem;\n}\n\nh3 {\n  margin-top: 1.5rem;\n  font-size: 1.7rem;\n}\n\nh4 {\n  margin-top: 1.2rem;\n  font-size: 1.4rem;\n}\n\nh5 {\n  margin-top: 1.2rem;\n  font-size: 1.2rem;\n}\n\np {\n  color: var(--theme-text-light);\n  margin-top: 1rem;\n  margin-bottom: 1rem;\n}\n\nsmall,\n.text_small {\n  font-size: 0.833rem;\n}\n\na {\n  color: var(--theme-accent);\n  font-weight: 400;\n  text-underline-offset: 0.08em;\n  text-decoration: none;\n  align-items: center;\n  gap: 0.5rem;\n}\n\na:hover,\na:focus {\n  text-decoration: underline;\n}\n\na:focus {\n  /* outline: 2px solid currentColor;\n  outline-offset: 0.25em; */\n}\n\nstrong {\n  font-weight: 600;\n  color: inherit;\n}\n\n/* :root {  \n}\n\n:root {\n  --user-font-scale: 1rem - 16px;\n  --max-width: calc(100% - 2rem);\n}\n\n@media (min-width: 50em) {\n  :root {\n    --max-width: 40em;\n  }\n}\n\n.wrapper {\n  margin-left: auto;\n  margin-right: auto;\n  max-width: 65em;\n  padding-left: 2rem;\n  padding-right: 2rem;\n  width: 100%;\n}\n\nnav ul {\n  list-style: none;\n  padding: 0;\n}\n\n:is(h1, h2) {\n  max-width: 40ch;\n}\n\n:is(h2, h3):not(:first-child) {\n  margin-top: 3rem;\n}\n\n.flex {\n  display: flex;\n  align-items: center;\n}\n\nimg.cover {\n  width: 100%;\n  max-height: 50vh;\n  object-fit: cover;\n}\n\nblockquote {\n  font-size: 1.5rem;\n  --padding-block: 1rem;\n  --padding-inline: 1.25rem;\n  --color: var(--theme-divider);\n\n  display: flex;\n  flex-direction: column;\n\n  padding: var(--padding-block) var(--padding-inline);\n  margin-left: calc(var(--padding-inline) * -1);\n  margin-right: calc(var(--padding-inline) * -1);\n\n  background: transparent;\n  border-left: calc(var(--padding-inline) / 2) solid var(--color);\n  border-radius: 0;\n}\n\nblockquote .source {\n  font-weight: 500;\n  color: var(--color);\n  font-size: 1rem;\n} */\n";

var $$module1$4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  'default': app
}, Symbol.toStringTag, { value: 'Module' }));

var layout = "main {\n  padding-left: 1rem;\n  padding-right: 1rem;\n  display: flex;\n  flex-direction: column;\n}\n\nsection {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  max-width: 1024px;\n}\n\n@media (max-width: 400px) {\n  section {\n    max-width: 100%;\n  }\n}\n\n.centered-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n";

var $$module2$3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  'default': layout
}, Symbol.toStringTag, { value: 'Module' }));

var colors = ":root {\n  --color-white: #fff;\n  --color-black: #000014;\n\n  --color-gray-50: #f9fafb;\n  --color-gray-100: #f3f4f6;\n  --color-gray-200: #e5e7eb;\n  --color-gray-300: #d1d5db;\n  --color-gray-400: #9ca3af;\n  --color-gray-500: #6b7280;\n  --color-gray-600: #4b5563;\n  --color-gray-700: #374151;\n  --color-gray-800: #1f2937;\n  --color-gray-900: #111827;\n\n  --color-blue: #3894ff;\n  --color-blue-rgb: 56, 148, 255;\n  --color-green: #17c083;\n  --color-green-rgb: 23, 192, 131;\n  --color-orange: #ff5d01;\n  --color-orange-rgb: 255, 93, 1;\n  --color-purple: #882de7;\n  --color-purple-rgb: 136, 45, 231;\n  --color-red: #ff1639;\n  --color-red-rgb: 255, 22, 57;\n  --color-yellow: #ffbe2d;\n  --color-yellow-rgb: 255, 190, 45;\n\n  --color-brand-light-blue: #51c5f8;\n  --color-brand-light-blue-rgb: 81, 197, 248;\n  --color-brand-purple: #5c4ee5;\n  --color-brand-purple-rgb: 92, 78, 229;\n}\n\n:root {\n  color-scheme: light;\n  --theme-accent: var(--color-brand-light-blue);\n  --theme-accent-rgb: var(--color-brand-light-blue-rgb);\n  --theme-accent-opacity: 0.1;\n  --theme-divider: var(--color-gray-100);\n  --theme-text: var(--color-gray-800);\n  --theme-text-light: var(--color-gray-600);\n  --theme-text-lighter: var(--color-gray-400);\n  /* --theme-text-lighter: var(--color-gray-400); */\n  --theme-bg: var(--color-white);\n  --theme-bg-offset: var(--color-gray-100);\n  --theme-bg-accent: rgba(var(--theme-accent-rgb), var(--theme-accent-opacity));\n  --theme-code-inline-bg: var(--color-gray-100);\n  --theme-code-text: var(--color-gray-100);\n  --theme-code-bg: var(--color-gray-700);\n}\n\n:root.theme-dark {\n  color-scheme: dark;\n  --theme-accent-opacity: 0.3;\n  --theme-divider: var(--color-gray-900);\n  --theme-text: var(--color-gray-200);\n  --theme-text-light: var(--color-gray-400);\n  --theme-text-lighter: var(--color-gray-600);\n  --theme-bg: var(--color-black);\n  --theme-bg-offset: var(--color-gray-900);\n  --theme-code-inline-bg: var(--color-gray-800);\n  --theme-code-text: var(--color-gray-200);\n  --theme-code-bg: var(--color-gray-900);\n}\n\n::selection {\n  color: var(--theme-accent);\n  background-color: rgba(var(--theme-accent-rgb), var(--theme-accent-opacity));\n}\n";

var $$module3$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  'default': colors
}, Symbol.toStringTag, { value: 'Module' }));

var code = "a > code {\n  position: relative;\n  color: var(--theme-accent);\n  background: transparent;\n  text-underline-offset: var(--padding-block);\n}\n\na > code::before {\n  content: \"\";\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  display: block;\n  background: var(--theme-accent);\n  opacity: var(--theme-accent-opacity);\n  border-radius: var(--border-radius);\n}\n\ncode {\n  --border-radius: 3px;\n  --padding-block: 0.2rem;\n  --padding-inline: 0.33rem;\n\n  font-family: var(--font-mono);\n  font-size: 0.85em;\n  color: inherit;\n  background-color: var(--theme-code-inline-bg);\n  padding: var(--padding-block) var(--padding-inline);\n  margin: calc(var(--padding-block) * -1) -0.125em;\n  border-radius: var(--border-radius);\n  word-break: break-word;\n}\n\npre.astro-code > code {\n  all: unset;\n}\n\npre {\n  position: relative;\n  --padding-block: 1rem;\n  --padding-inline: 2rem;\n  padding: var(--padding-block) var(--padding-inline);\n  padding-right: calc(var(--padding-inline) * 2);\n\n  overflow-y: hidden;\n  overflow-x: auto;\n}\n\n@media (min-width: 37.75em) {\n  pre {\n    --padding-inline: 1.25rem;\n    border-radius: 8px;\n  }\n}\n";

var $$module4$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  'default': code
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$l = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/layouts/components/HeadMeta.astro", { modules: [{ module: $$module1$4, specifier: "../../styles/app.css", assert: {} }, { module: $$module2$3, specifier: "../../styles/layout.css", assert: {} }, { module: $$module3$1, specifier: "../../styles/colors.css", assert: {} }, { module: $$module4$1, specifier: "../../styles/code.css", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$l = createAstro("/@fs/Users/seenickcode/code/devjourney/src/layouts/components/HeadMeta.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$HeadMeta = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$l, $$props, $$slots);
  Astro2.self = $$HeadMeta;
  const { title, description } = Astro2.props;
  return render`<!-- Global Metadata --><meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<link rel="icon" type="image/x-icon" href="/favicon.ico">

<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title" content="devjourney.io - ${title}">
<meta name="description"${addAttribute(description, "content")}>

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<!-- <meta property="og:url" content="" /> -->
<meta property="og:title"${addAttribute(title, "content")}>
<meta property="og:description"${addAttribute(description, "content")}>
<meta property="og:image" content="https://astro.build/social.png?v=1">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<!-- <meta property="twitter:url" content="" /> -->
<meta property="twitter:title"${addAttribute(title, "content")}>
<meta property="twitter:description"${addAttribute(description, "content")}>
<meta property="twitter:image" content="https://astro.build/social.png?v=1">

<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=IBM+Plex+Sans&display=swap" rel="stylesheet"><!-- Global Metadata -->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<link rel="icon" type="image/x-icon" href="/favicon.ico">

<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title"${addAttribute(title, "content")}>
<meta name="description"${addAttribute(description, "content")}>

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<!-- <meta property="og:url" content="" /> -->
<meta property="og:title"${addAttribute(title, "content")}>
<meta property="og:description"${addAttribute(description, "content")}>
<meta property="og:image" content="https://astro.build/social.png?v=1">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<!-- <meta property="twitter:url" content="" /> -->
<meta property="twitter:title"${addAttribute(title, "content")}>
<meta property="twitter:description"${addAttribute(description, "content")}>
<meta property="twitter:image" content="https://astro.build/social.png?v=1">

<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=IBM+Plex+Sans&display=swap" rel="stylesheet">

<!-- Styles -->
<link rel="stylesheet" href="https://cdn.plyr.io/3.7.2/plyr.css">`;
});

const $$file$e = "/Users/seenickcode/code/devjourney/src/layouts/components/HeadMeta.astro";
const $$url$e = undefined;

var $$module1$3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$l,
  'default': $$HeadMeta,
  file: $$file$e,
  url: $$url$e
}, Symbol.toStringTag, { value: 'Module' }));

var SiteHeader_astro_astro_type_style_index_0_lang = '';

var Logo_astro_astro_type_style_index_0_lang = '';

const $$metadata$k = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/layouts/components/Logo.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$k = createAstro("/@fs/Users/seenickcode/code/devjourney/src/layouts/components/Logo.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$Logo = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$k, $$props, $$slots);
  Astro2.self = $$Logo;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`<div class="container astro-KNFGTP4T">
	<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" class="astro-KNFGTP4T">
		<rect width="50" height="50" fill="transparent" class="astro-KNFGTP4T"></rect>
		<path d="M18.8477 18.9058H23.2602L15.7302 26.8847H10.8516L18.8477 18.9058Z" fill="#51C5F8" class="astro-KNFGTP4T"></path>
		<path d="M33.8194 2.94775H37.9547L25.6198 15.7465H21.0479L33.8194 2.94775Z" fill="#51C5F8" class="astro-KNFGTP4T"></path>
		<path d="M13.2276 16.605H18.0241L7.74474 26.9038H2.94824L13.2276 16.605Z" fill="#51C5F8" class="astro-KNFGTP4T"></path>
		<path d="M22.7588 42.1467V47.029L32.8575 36.5855V31.7031L22.7588 42.1467Z" fill="#51C5F8" class="astro-KNFGTP4T"></path>
		<path d="M43.6387 5.79733L47.0304 2.94775V14.3461L43.6387 17.7654V5.79733Z" fill="#51C5F8" class="astro-KNFGTP4T"></path>
		<path d="M34.7353 2.94775L31.3438 6.36728H43.6379L47.0295 2.94775H34.7353Z" fill="#51C5F8" class="astro-KNFGTP4T"></path>
		<path d="M22.7295 26.8982L26.0404 23.4849H14.2653L10.8447 26.899L22.7295 26.8982Z" fill="#00589C" class="astro-KNFGTP4T"></path>
		<path d="M47.0298 9.78711V14.623L22.8369 39.1852L22.8644 34.2749L47.0298 9.78711Z" fill="#51C5F8" class="astro-KNFGTP4T"></path>
		<path d="M15.7744 26.899L18.5443 23.5366L22.9911 23.847L15.7744 26.899Z" fill="url(#paint0_linear_924_130)" class="astro-KNFGTP4T"></path>
		<path d="M14.2726 23.4644H18.958L15.7741 26.8989H10.8369L14.2726 23.4644Z" fill="#27B7F4" class="astro-KNFGTP4T"></path>
		<defs class="astro-KNFGTP4T">
			<linearGradient id="paint0_linear_924_130" x1="15.1138" y1="26.8473" x2="22.1023" y2="26.5229" gradientUnits="userSpaceOnUse" class="astro-KNFGTP4T">
				<stop stop-color="#00213A" class="astro-KNFGTP4T"></stop>
				<stop offset="0.468709" stop-color="#00589C" class="astro-KNFGTP4T"></stop>
			</linearGradient>
		</defs>
	</svg>
	<div class="astro-KNFGTP4T">devjourney.io</div>
</div>

`;
});

const $$file$d = "/Users/seenickcode/code/devjourney/src/layouts/components/Logo.astro";
const $$url$d = undefined;

var $$module1$2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$k,
  'default': $$Logo,
  file: $$file$d,
  url: $$url$d
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$j = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/layouts/components/SiteHeader.astro", { modules: [{ module: $$module1$2, specifier: "./Logo.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$j = createAstro("/@fs/Users/seenickcode/code/devjourney/src/layouts/components/SiteHeader.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$SiteHeader = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$j, $$props, $$slots);
  Astro2.self = $$SiteHeader;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`<header class="astro-KWIZ7ZV7">
	<div class="logo astro-KWIZ7ZV7"><a href="/" class="astro-KWIZ7ZV7">${renderComponent($$result, "Logo", $$Logo, { "class": "astro-KWIZ7ZV7" })}</a></div>
</header>



<!-- split 50 50 alternative -->
<!-- <header>
	<div class="flex-item-left"><a href="/"><Logo /></a></div>
  <div class="flex-item-right"></div>
</header>

<style>
	header {
		padding: 1rem;
		display: flex;
		flex-wrap: wrap;
	}
	.flex-item-left {
		flex: 50%;
		display: flex;
		flex-direction: row;
		justify-content: start;
	}
	.flex-item-right {
		flex: 50%;
		display: flex;
		flex-direction: row;
		justify-content: end;
	}
	@media (max-width: 480px) {
		.flex-item-right, .flex-item-left {
			flex: 100%;
			justify-content: center;
		}
	}
</style> -->
`;
});

const $$file$c = "/Users/seenickcode/code/devjourney/src/layouts/components/SiteHeader.astro";
const $$url$c = undefined;

var $$module2$2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$j,
  'default': $$SiteHeader,
  file: $$file$c,
  url: $$url$c
}, Symbol.toStringTag, { value: 'Module' }));

var SiteFooter_astro_astro_type_style_index_0_lang = '';

const $$metadata$i = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/layouts/components/SiteFooter.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$i = createAstro("/@fs/Users/seenickcode/code/devjourney/src/layouts/components/SiteFooter.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$SiteFooter = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$i, $$props, $$slots);
  Astro2.self = $$SiteFooter;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`<footer class="astro-DLDM4W6B">
	<div class="astro-DLDM4W6B">contact <a href="mailto:hello@devjourney.io" class="astro-DLDM4W6B">hello@devjourney.io</a></div>
</footer>

`;
});

const $$file$b = "/Users/seenickcode/code/devjourney/src/layouts/components/SiteFooter.astro";
const $$url$b = undefined;

var $$module3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$i,
  'default': $$SiteFooter,
  file: $$file$b,
  url: $$url$b
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$h = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/layouts/Main.astro", { modules: [{ module: $$module1$3, specifier: "./components/HeadMeta.astro", assert: {} }, { module: $$module2$2, specifier: "./components/SiteHeader.astro", assert: {} }, { module: $$module3, specifier: "./components/SiteFooter.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$h = createAstro("/@fs/Users/seenickcode/code/devjourney/src/layouts/Main.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$Main = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$h, $$props, $$slots);
  Astro2.self = $$Main;
  const { title, description } = Astro2.props;
  return render`<html lang="en">
	<head>
		${renderComponent($$result, "HeadMeta", $$HeadMeta, { "title": title, "description": description })}
	<!--astro:head--></head>
	<body>
		${renderComponent($$result, "SiteHeader", $$SiteHeader, {})}	
		<main>
			${renderSlot($$result, $$slots["default"])}
		</main>
		${renderComponent($$result, "SiteFooter", $$SiteFooter, {})}
	</body></html>`;
});

const $$file$a = "/Users/seenickcode/code/devjourney/src/layouts/Main.astro";
const $$url$a = undefined;

var $$module1$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$h,
  'default': $$Main,
  file: $$file$a,
  url: $$url$a
}, Symbol.toStringTag, { value: 'Module' }));

var PageHeader_astro_astro_type_style_index_0_lang = '';

const $$metadata$g = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/components/PageHeader.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$g = createAstro("/@fs/Users/seenickcode/code/devjourney/src/components/PageHeader.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$PageHeader = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$g, $$props, $$slots);
  Astro2.self = $$PageHeader;
  const { line1, line2 } = Astro2.props;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`<div class="container astro-W23XOAIO">
	<div class="hero-line1 astro-W23XOAIO">${line1}</div>
	${line2 && render`<div class="hero-line2 astro-W23XOAIO">${line2}</div>`}
</div>

`;
});

const $$file$9 = "/Users/seenickcode/code/devjourney/src/components/PageHeader.astro";
const $$url$9 = undefined;

var $$module2$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$g,
  'default': $$PageHeader,
  file: $$file$9,
  url: $$url$9
}, Symbol.toStringTag, { value: 'Module' }));

var PathList_astro_astro_type_style_index_0_lang = '';

var StepListItem_astro_astro_type_style_index_0_lang = '';

const $$metadata$f = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/components/steps/StepListItem.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$f = createAstro("/@fs/Users/seenickcode/code/devjourney/src/components/steps/StepListItem.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$StepListItem = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$f, $$props, $$slots);
  Astro2.self = $$StepListItem;
  const { url, title, subtitle, footnote } = Astro2.props;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`<article class="astro-Y2KCLXE2">
	<!-- <p class="publish-date">{post.frontmatter.publishDate}</p> -->
	<a${addAttribute(url, "href")} class="astro-Y2KCLXE2"><p class="title astro-Y2KCLXE2">${title}</p></a>
	<p class="subtitle astro-Y2KCLXE2">${subtitle}</p>
	<p class="footnote astro-Y2KCLXE2">${footnote}</p>
</article>


`;
});

const $$file$8 = "/Users/seenickcode/code/devjourney/src/components/steps/StepListItem.astro";
const $$url$8 = undefined;

var $$module1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$f,
  'default': $$StepListItem,
  file: $$file$8,
  url: $$url$8
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$e = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/components/PathList.astro", { modules: [{ module: $$module1, specifier: "../components/steps/StepListItem.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$e = createAstro("/@fs/Users/seenickcode/code/devjourney/src/components/PathList.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$PathList = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$e, $$props, $$slots);
  Astro2.self = $$PathList;
  const { listItems, posts } = Astro2.props;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`<div class="container astro-QCMNUVXM">
	${listItems.map((r) => render`${renderComponent($$result, "StepListItem", $$StepListItem, { "url": r.url, "title": r.title, "subtitle": r.subtitle, "footnote": r.footnote, "class": "astro-QCMNUVXM" })}`)}
	${posts.map((p) => render`${renderComponent($$result, "StepListItem", $$StepListItem, { "url": p.url, "title": p.frontmatter.title, "subtitle": p.frontmatter.description, "footnote": p.frontmatter.duration, "class": "astro-QCMNUVXM" })}`)}
</div>

`;
});

const $$file$7 = "/Users/seenickcode/code/devjourney/src/components/PathList.astro";
const $$url$7 = undefined;

var $$module2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$e,
  'default': $$PathList,
  file: $$file$7,
  url: $$url$7
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$d = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/components/Player.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [{ type: "inline", value: `
	import Plyr from 'plyr';
	import Hls from 'hls.js';

	const video = document.querySelector('video');
	const source = document.querySelector('video > source').getAttribute('src');
	const defaultOptions = {};

	if (!Hls.isSupported()) {
		video.src = source;
		var player = new Plyr(video, defaultOptions);
	} else {
		
		// For more Hls.js options, see https://github.com/dailymotion/hls.js
		const hls = new Hls();
		hls.loadSource(source);

		// From the m3u8 playlist, hls parses the manifest and returns
		// all available video qualities. This is important, in this approach,
		// we will have one source on the Plyr player.
		hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {

			// Transform available levels into an array of integers (height values).
			const availableQualities = hls.levels.map((l) => l.height)
			availableQualities.unshift(0) // prepend 0 to quality array

			// Add new qualities to option
			defaultOptions.quality = {
				default: 0, // Default - AUTO
				options: availableQualities,
				forced: true,        
				onChange: (e) => updateQuality(e),
			}
			
			// Add Auto Label 
			defaultOptions.i18n = {
				qualityLabel: {
					0: 'Auto',
				},
			}

			hls.on(Hls.Events.LEVEL_SWITCHED, function (event, data) {
				var span = document.querySelector(".plyr__menu__container [data-plyr='quality'][value='0'] span")
				if (hls.autoLevelEnabled) {
					span.innerHTML = \`AUTO (\${hls.levels[data.level].height}p)\`
				} else {
					span.innerHTML = \`AUTO\`
				}
			});

			// Initialize new Plyr player with quality options
			var player = new Plyr(video, defaultOptions);
		});

		hls.attachMedia(video);
    window.hls = hls;		 
  }

	function updateQuality(newQuality) {
		if (newQuality === 0) {
			window.hls.currentLevel = -1; //Enable AUTO quality if option.value = 0
		} else {
			window.hls.levels.forEach((level, levelIndex) => {
				if (level.height === newQuality) {
					console.log("Found quality match with " + newQuality);
					window.hls.currentLevel = levelIndex;
				}
			});
		}
	}
` }] });
const $$Astro$d = createAstro("/@fs/Users/seenickcode/code/devjourney/src/components/Player.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$Player = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$d, $$props, $$slots);
  Astro2.self = $$Player;
  const { src } = Astro2.props;
  return render`<video id="video" controls playsinline crossorigin>
	<source${addAttribute(src, "src")}>
</video>
`;
});

const $$file$6 = "/Users/seenickcode/code/devjourney/src/components/Player.astro";
const $$url$6 = undefined;

var $$module4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$d,
  'default': $$Player,
  file: $$file$6,
  url: $$url$6
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$c = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/pages/index.astro", { modules: [{ module: $$module1$1, specifier: "../layouts/Main.astro", assert: {} }, { module: $$module2$1, specifier: "../components/PageHeader.astro", assert: {} }, { module: $$module2, specifier: "../components/PathList.astro", assert: {} }, { module: $$module4, specifier: "../components/Player.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$c = createAstro("/@fs/Users/seenickcode/code/devjourney/src/pages/index.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$Index$5 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$c, $$props, $$slots);
  Astro2.self = $$Index$5;
  let title = "Home";
  let line1 = "A series of learning paths for growing software engineers.";
  let line2 = "Hand-crafted with love by vetted subject matter experts.";
  let description = [line1, line2].join(" ");
  const listItems = [
    { url: "/noskills", title: "I'm new to software development", subtitle: "Tutorials for newcomers.", footnote: "2 tutorials" },
    { url: "/webdev", title: "Web Development", subtitle: "Get a jumpstart by learning very basic web development skills.", footnote: "1 path, 2 total tutorials" },
    { url: "/basicflutter", title: "Basic Flutter", subtitle: "For folks wanting to jump into multi-platform mobile dev.", footnote: "2 tutorials" },
    { url: "/advancedflutter", title: "Advanced Flutter", subtitle: "A course for developers with basic Flutter skills.", footnote: "advancedflutter.com" }
  ];
  const posts = [];
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`${renderComponent($$result, "Layout", $$Main, { "title": title, "description": description, "class": "astro-KMBL3A3H" }, { "default": () => render`<div class="centered-container astro-KMBL3A3H">
		<section class="astro-KMBL3A3H">
			${renderComponent($$result, "PageHeader", $$PageHeader, { "line1": line1, "line2": line2, "class": "astro-KMBL3A3H" })}
			<!-- <Player client:load /> -->
			${renderComponent($$result, "Player", $$Player, { "src": "https://fluttercrashcourse.global.ssl.fastly.net/videos/285626443/playlist.m3u8", "class": "astro-KMBL3A3H" })}
			${renderComponent($$result, "PathList", $$PathList, { "listItems": listItems, "posts": posts, "class": "astro-KMBL3A3H" })}
		</section>		
	</div>` })}

`;
});

const $$file$5 = "/Users/seenickcode/code/devjourney/src/pages/index.astro";
const $$url$5 = "";

var _page0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$c,
  'default': $$Index$5,
  file: $$file$5,
  url: $$url$5
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$b = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/pages/advancedflutter/index.astro", { modules: [{ module: $$module1$1, specifier: "../../layouts/Main.astro", assert: {} }, { module: $$module2, specifier: "../../components/PathList.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$b = createAstro("/@fs/Users/seenickcode/code/devjourney/src/pages/advancedflutter/index.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$Index$4 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$b, $$props, $$slots);
  Astro2.self = $$Index$4;
  const listItems = [];
  const posts = await Astro2.glob({ "./01-hello.md": () => import('./chunks/chunk.6b474c6a.mjs'),}, () => `./*.md`);
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`${renderComponent($$result, "Layout", $$Main, { "class": "astro-CD7NI7L4" }, { "default": () => render`<div class="centered-container astro-CD7NI7L4">
		<section class="astro-CD7NI7L4">
			${renderComponent($$result, "PathList", $$PathList, { "listItems": listItems, "posts": posts, "class": "astro-CD7NI7L4" })}
		</section>		
	</div>` })}

`;
});

const $$file$4 = "/Users/seenickcode/code/devjourney/src/pages/advancedflutter/index.astro";
const $$url$4 = "/advancedflutter";

var _page1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$b,
  'default': $$Index$4,
  file: $$file$4,
  url: $$url$4
}, Symbol.toStringTag, { value: 'Module' }));

const metadata$6 = { "headers": [], "source": "\nWelcome to the basic flutter tutorial.\n\nDo variables work {frontmatter.value \\* 2}? Yes! Check it out...\n\n```javascript\n// Example JavaScript\n\nconst x = 7;\nfunction returnSeven() {\n  return x;\n}\n```\n", "html": '<p>Welcome to the basic flutter tutorial.</p>\n<p>Do variables work {frontmatter.value * 2}? Yes! Check it out\u2026</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// Example JavaScript</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">const</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">x</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">7</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">function</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">returnSeven</span><span style="color: #C9D1D9">() {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> x;</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>' };
const frontmatter$6 = { "title": "Welcome to basic flutter!", "publishDate": "26 May 2021", "name": "Nick Manning", "value": 128, "description": "Flutter basic setup.", "duration": "1 min read", "astro": { "headers": [], "source": "\nWelcome to the basic flutter tutorial.\n\nDo variables work {frontmatter.value \\* 2}? Yes! Check it out...\n\n```javascript\n// Example JavaScript\n\nconst x = 7;\nfunction returnSeven() {\n  return x;\n}\n```\n", "html": '<p>Welcome to the basic flutter tutorial.</p>\n<p>Do variables work {frontmatter.value * 2}? Yes! Check it out\u2026</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// Example JavaScript</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">const</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">x</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">7</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">function</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">returnSeven</span><span style="color: #C9D1D9">() {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> x;</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>' } };
const $$metadata$a = createMetadata("/src/pages/advancedflutter/01-hello.md", { modules: [{ module: $$module1$1, specifier: "../../layouts/Main.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$a = createAstro("/src/pages/advancedflutter/01-hello.md", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$01Hello$4 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$a, $$props, $$slots);
  Astro2.self = $$01Hello$4;
  const $$content = { "title": "Welcome to basic flutter!", "publishDate": "26 May 2021", "name": "Nick Manning", "value": 128, "description": "Flutter basic setup.", "duration": "1 min read", "astro": { "headers": [], "source": "\nWelcome to the basic flutter tutorial.\n\nDo variables work {frontmatter.value \\* 2}? Yes! Check it out...\n\n```javascript\n// Example JavaScript\n\nconst x = 7;\nfunction returnSeven() {\n  return x;\n}\n```\n", "html": '<p>Welcome to the basic flutter tutorial.</p>\n<p>Do variables work {frontmatter.value * 2}? Yes! Check it out\u2026</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// Example JavaScript</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">const</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">x</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">7</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">function</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">returnSeven</span><span style="color: #C9D1D9">() {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> x;</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>' } };
  return render`${renderComponent($$result, "Layout", $$Main, { "content": $$content }, { "default": () => render`<p>Welcome to the basic flutter tutorial.</p><p>Do variables work ${frontmatter$6.value * 2}? Yes! Check it out…</p><pre class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// Example JavaScript</span></span>
<span class="line"></span>
<span class="line"><span style="color: #FF7B72">const</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">x</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">7</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">function</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">returnSeven</span><span style="color: #C9D1D9">() {</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> x;</span></span>
<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>` })}`;
});

var _page2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  metadata: metadata$6,
  frontmatter: frontmatter$6,
  $$metadata: $$metadata$a,
  'default': $$01Hello$4
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$9 = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/pages/basicflutter/index.astro", { modules: [{ module: $$module1$1, specifier: "../../layouts/Main.astro", assert: {} }, { module: $$module2, specifier: "../../components/PathList.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$9 = createAstro("/@fs/Users/seenickcode/code/devjourney/src/pages/basicflutter/index.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$Index$3 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$9, $$props, $$slots);
  Astro2.self = $$Index$3;
  const listItems = [];
  const posts = await Astro2.glob({ "./01-hello.md": () => import('./chunks/chunk.bbee4636.mjs'), "./02-scoped-model.md": () => import('./chunks/chunk.cc6f92e5.mjs'),}, () => `./*.md`);
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`${renderComponent($$result, "Layout", $$Main, { "class": "astro-CD7NI7L4" }, { "default": () => render`<div class="centered-container astro-CD7NI7L4">
		<section class="astro-CD7NI7L4">
			${renderComponent($$result, "PathList", $$PathList, { "listItems": listItems, "posts": posts, "class": "astro-CD7NI7L4" })}
		</section>		
	</div>` })}

`;
});

const $$file$3 = "/Users/seenickcode/code/devjourney/src/pages/basicflutter/index.astro";
const $$url$3 = "/basicflutter";

var _page3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$9,
  'default': $$Index$3,
  file: $$file$3,
  url: $$url$3
}, Symbol.toStringTag, { value: 'Module' }));

const metadata$5 = { "headers": [{ "depth": 2, "slug": "how-does-it-work-exactly", "text": "How Does it Work, Exactly?" }, { "depth": 2, "slug": "terms-well-be-throwing-around", "text": "Terms We\u2019ll Be Throwing Around" }, { "depth": 2, "slug": "lets-dive-in", "text": "Let\u2019s Dive In" }, { "depth": 2, "slug": "our-code-just-a-quick-note-on-how-were-organizing-our-apps-code", "text": "Our Code Just a quick note on how we\u2019re organizing our app\u2019s code:" }, { "depth": 2, "slug": "step-1-flutter-create-lets-make-sure-flutter-is-up-to-date-and-generate-a-new-project", "text": "Step 1: Flutter Create Let\u2019s make sure Flutter is up to date and generate a new project:" }, { "depth": 2, "slug": "the-shell-of-our-app", "text": "The Shell of Our App" }, { "depth": 2, "slug": "defining-our-models-a-simple-model-defining-a-member-called-count-with-a-default-value-of-1", "text": "Defining Our Models A simple model defining a member called count with a default value of 1." }, { "depth": 2, "slug": "our-single-screen", "text": "Our Single Screen" }, { "depth": 2, "slug": "our-child-widgets", "text": "Our Child Widgets" }, { "depth": 2, "slug": "summary", "text": "Summary" }], "source": "\nWhat [`scoped_model`](https://pub.dartlang.org/packages/scoped_model) does is it makes working with state in your app much easier.\n\nNote: you can check out the video for this post [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/scoped-model-hello-world) and the longer, pro video [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model).\n\nWhile it's all well and good to exclusively use `StatefulWidget`, most of the time your app is going to have multiple widgets that need to use the same shared state. The issue with this is that when those widgets exist in various places in our app, passing around state becomes pretty cumbersome. In other words, `scoped_model` makes it easy for various widgets to access the same shared state. There are also some nice additional benefits you get as well:\n\n- It allows us to conveniently consolidate app-wide state variables and business logic.\n- We can avoid reading up on overly complex architecture patterns.\n- Very minimal boilerplate code is required, compared to similar libraries.\n\n## How Does it Work, Exactly?\n\n`scoped_model` consists of three concepts.\n\nFirst, it offers a `Model` class. We add whatever state variables we want as well as business logic as well.\n\nNext, for each screen that needs to access this state, we wrap everything with a single `ScopedModel` widget, referring to the instance of our model class we created.\n\nFinally, for any child-widgets that need to access our state (even if they're in separate files), we simply wrap them in a `ScopedModelDescendant` widget. Whatever is wrapped there can automagically react to our state updates.\n\nWhat I love about this solution is there's no complex architecture or large amount of boilerplate code we have to maintain to achieve this. Now let's implement something simple so that makes more sense.\n\n## Terms We'll Be Throwing Around\n\n- **State**: data. In our case, state changes over time as users interact with the UI. One or more \"stateful\" widgets may re-render as state changes.\n- **Model**: a class that represents a \"thing\" in our app. Examples: User, Podcast, Episode, etc\n- **Scoped Model**: a class that holds state variables and contains business logic\n- **Business Logic**: code that affects data in our app, typically grouped by conern. Examples: the Business Logic that determines how we work with fetching and managing Podcasts in our app.\n- **Render**: the act of drawing something on the screen, i.e. a Button, Image, etc.\n\n## Let's Dive In\n\nLet's create a simple app to demonstrate `scoped_model`. If you don't want to follow along, you can find the code [here](https://github.com/seenickcode/scoped_model_hello_world). Our app will be a pretty contrived example in order to keep things simple. It will:\n\n- Show a screen with three simple text labels.\n- When the plus button at the bottom is tapped, our state is updated.\n- Because our labels are wired up to a Scoped Model, they'll get those updates automagically.\n\n## Our Code Just a quick note on how we're organizing our app's code:\n\n- `main.dart`: loads our `App` widget.\n- `app.dart`: a `StatelessWidget`, rendering a `MaterialApp`.\n- `/models/counter.dart`: a simple model that represents a Counter.\n- `/scoped_models/scoped_counters.dart`: our scoped model that contains state variables and state specific business logic.\n- `/screens/home/home.dart`: our main screen.\n- `/screens/home/widgets/widget1.dart`: a simple stateless widget that shows some hardcoded text with the latest state value appended to it.\n- `/screens/home/widgets/widget2.dart`: same as above, just different text and wiring up to another state variable. \\* `/screens/home/widgets/widget3.dart`: same as above, just different text and wiring up to another state variable. #\n\n## Step 1: Flutter Create Let's make sure Flutter is up to date and generate a new project:\n\n```shell\nflutter upgrade\nflutter create scoped_model_hello_world\n```\n\nNow, open your project in the IDE of your choice (I personally use [VSCode](https://code.visualstudio.com/)) and replace `main.dart` with the following:\n\n## The Shell of Our App\n\n````dart\n// main.dart\nimport 'package:flutter/material.dart';\nimport 'app.dart';\n\nvoid main() => runApp(App());\n```\n\n```dart\n// app.dart\nimport 'package:flutter/material.dart';\nimport 'screens/home/home.dart';\n\nclass App extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      home: MyHomePage(),\n    );\n  }\n}\n````\n\n## Defining Our Models A simple model defining a member called `count` with a default value of `1`.\n\n```dart\n// /models/counter.dart\nclass Counter {\n  int count = 1;\n}\n```\n\nThis is our (scoped) model. I called it a (scoped) model, even though as you'll see below there's an actual `ScopedModel` widget, because we should separate our traditional models in `/models` with scoped models, which define state variables and the business logic that relates to it. Note that our plain old `Counter` model above may later have its own business logic but our scoped model, `ScopedCounter`, exclusively includes state variables and business logic related to that state. We instantiate three `Counter` objects. When the `increment` method is triggered, we update each of those with a different value. After we update our state, we \"notify\" any widgets that rely on it via the `notifyListeners()` as seen below. This will trigger any widgets that rely on this state to automatically update, exactly how your standard `StatefulWidget` works:\n\n```dart\n// /scoped_models/scoped_counters.dart\nimport 'package:scoped_model/scoped_model.dart';\nimport '../models/counter.dart';\n\nclass ScopedCounter extends Model {\n  Counter counter1 = Counter();\n  Counter counter2 = Counter();\n  Counter counter3 = Counter();\n\n  increment() {\n    counter1.count += 1;\n    counter2.count += 5;\n    counter3.count += 10;\n\n    notifyListeners();\n  }\n}\n```\n\n## Our Single Screen\n\nThis screen was mainly taken from the standard project created by the `flutter create` command, just to ensure it's familiar to everyone. Here we render our three widgets on the screen along with a button that triggers an update to our state. The important widget to notice is is the `ScopedModel` widget below, of type `ScopedCounter` (the class we created above). We wrap our screen with this `ScopedModel` widget, which will provide the functionality we need in each widget below. In other words, from the documentation: \"If you need to pass a Model deep down your Widget hierarchy, you can wrap your Model in a ScopedModel Widget. This will make the Model available to all descendant Widgets.\"\n\n```dart\n// /screens/home/home.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\nimport 'widget1.dart';\nimport 'widget2.dart';\nimport 'widget3.dart';\n\nclass MyHomePage extends StatelessWidget {\n  final ScopedCounter scopedCounter = ScopedCounter();\n\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModel<scopedcounter>(\n      model: scopedCounter,\n      child: Scaffold(\n        appBar: AppBar(\n          title: Text('Hello World with Scoped Model'),\n        ),\n        body: Center(\n          child: Column(\n            mainAxisAlignment: MainAxisAlignment.center,\n            children: <widget>[\n              Widget1(),\n              Widget2(),\n              Widget3(),\n            ],\n          ),\n        ),\n        floatingActionButton: FloatingActionButton(\n          onPressed: () => scopedCounter.increment(),\n          tooltip: 'Increment',\n          child: Icon(Icons.add),\n        ),\n      ),\n    );\n  }\n}</widget></scopedcounter> `\n```\n\n## Our Child Widgets\n\nHere, we have three simple widgets, each relying on its own instance of `Counter`. Each has a hardcoded string it renders with the latest counter value appended. It's a really contrived example but it's just mean to show how different widgets use the centralized state in our scoped model in its own way. Note that each of these are nice, clean `StatelessWidget`s, not `StatefulWidget`s. This is pretty nice, as the code can stay pretty simple, without much of any business logic.\n\n```dart\n// /screens/home/widgets/widget1.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\n\nclass Widget1 extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModelDescendant<scopedcounter>(\n        builder: (context, child, model) =>\n            Text('Widget1 counter is ${model.counter1.count}'));\n  }\n}</scopedcounter> `\n```\n\n```dart\n// /screens/home/widgets/widget2.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\n\nclass Widget2 extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModelDescendant<scopedcounter>(\n        builder: (context, child, model) =>\n            Text('Widget2 counter is ${model.counter2.count}'));\n  }\n}</scopedcounter> `\n```\n\n```dart\n// /screens/home/widgets/widget3.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\n\nclass Widget3 extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModelDescendant<scopedcounter>(\n        builder: (context, child, model) =>\n            Text('Widget3 counter is ${model.counter3.count}'));\n  }\n}</scopedcounter> `\n```\n\n## Summary\n\nThat's it. If you want to check out the free 10 minute video for this post, where I go into explaining things a bit more in detail, you can check it out <a href=\"\">here</a>. The code for this post can be found [here](https://github.com/seenickcode/scoped_model_hello_world). If you want to check out a more realistic example of `scoped_model`, sign up for the Pro subscription [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model).\n\nHappy Fluttering, Nick\n", "html": '<p>What <a href="https://pub.dartlang.org/packages/scoped_model"><code is:raw>scoped_model</code></a> does is it makes working with state in your app much easier.</p>\n<p>Note: you can check out the video for this post <a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/scoped-model-hello-world">here</a> and the longer, pro video <a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model">here</a>.</p>\n<p>While it\u2019s all well and good to exclusively use <code is:raw>StatefulWidget</code>, most of the time your app is going to have multiple widgets that need to use the same shared state. The issue with this is that when those widgets exist in various places in our app, passing around state becomes pretty cumbersome. In other words, <code is:raw>scoped_model</code> makes it easy for various widgets to access the same shared state. There are also some nice additional benefits you get as well:</p>\n<ul>\n<li>It allows us to conveniently consolidate app-wide state variables and business logic.</li>\n<li>We can avoid reading up on overly complex architecture patterns.</li>\n<li>Very minimal boilerplate code is required, compared to similar libraries.</li>\n</ul>\n<h2 id="how-does-it-work-exactly">How Does it Work, Exactly?</h2>\n<p><code is:raw>scoped_model</code> consists of three concepts.</p>\n<p>First, it offers a <code is:raw>Model</code> class. We add whatever state variables we want as well as business logic as well.</p>\n<p>Next, for each screen that needs to access this state, we wrap everything with a single <code is:raw>ScopedModel</code> widget, referring to the instance of our model class we created.</p>\n<p>Finally, for any child-widgets that need to access our state (even if they\u2019re in separate files), we simply wrap them in a <code is:raw>ScopedModelDescendant</code> widget. Whatever is wrapped there can automagically react to our state updates.</p>\n<p>What I love about this solution is there\u2019s no complex architecture or large amount of boilerplate code we have to maintain to achieve this. Now let\u2019s implement something simple so that makes more sense.</p>\n<h2 id="terms-well-be-throwing-around">Terms We\u2019ll Be Throwing Around</h2>\n<ul>\n<li><strong>State</strong>: data. In our case, state changes over time as users interact with the UI. One or more \u201Cstateful\u201D widgets may re-render as state changes.</li>\n<li><strong>Model</strong>: a class that represents a \u201Cthing\u201D in our app. Examples: User, Podcast, Episode, etc</li>\n<li><strong>Scoped Model</strong>: a class that holds state variables and contains business logic</li>\n<li><strong>Business Logic</strong>: code that affects data in our app, typically grouped by conern. Examples: the Business Logic that determines how we work with fetching and managing Podcasts in our app.</li>\n<li><strong>Render</strong>: the act of drawing something on the screen, i.e. a Button, Image, etc.</li>\n</ul>\n<h2 id="lets-dive-in">Let\u2019s Dive In</h2>\n<p>Let\u2019s create a simple app to demonstrate <code is:raw>scoped_model</code>. If you don\u2019t want to follow along, you can find the code <a href="https://github.com/seenickcode/scoped_model_hello_world">here</a>. Our app will be a pretty contrived example in order to keep things simple. It will:</p>\n<ul>\n<li>Show a screen with three simple text labels.</li>\n<li>When the plus button at the bottom is tapped, our state is updated.</li>\n<li>Because our labels are wired up to a Scoped Model, they\u2019ll get those updates automagically.</li>\n</ul>\n<h2 id="our-code-just-a-quick-note-on-how-were-organizing-our-apps-code">Our Code Just a quick note on how we\u2019re organizing our app\u2019s code:</h2>\n<ul>\n<li><code is:raw>main.dart</code>: loads our <code is:raw>App</code> widget.</li>\n<li><code is:raw>app.dart</code>: a <code is:raw>StatelessWidget</code>, rendering a <code is:raw>MaterialApp</code>.</li>\n<li><code is:raw>/models/counter.dart</code>: a simple model that represents a Counter.</li>\n<li><code is:raw>/scoped_models/scoped_counters.dart</code>: our scoped model that contains state variables and state specific business logic.</li>\n<li><code is:raw>/screens/home/home.dart</code>: our main screen.</li>\n<li><code is:raw>/screens/home/widgets/widget1.dart</code>: a simple stateless widget that shows some hardcoded text with the latest state value appended to it.</li>\n<li><code is:raw>/screens/home/widgets/widget2.dart</code>: same as above, just different text and wiring up to another state variable. * <code is:raw>/screens/home/widgets/widget3.dart</code>: same as above, just different text and wiring up to another state variable. #</li>\n</ul>\n<h2 id="step-1-flutter-create-lets-make-sure-flutter-is-up-to-date-and-generate-a-new-project">Step 1: Flutter Create Let\u2019s make sure Flutter is up to date and generate a new project:</h2>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #C9D1D9">flutter upgrade</span></span>\n<span class="line"><span style="color: #C9D1D9">flutter create scoped_model_hello_world</span></span></code></pre>\n<p>Now, open your project in the IDE of your choice (I personally use <a href="https://code.visualstudio.com/">VSCode</a>) and replace <code is:raw>main.dart</code> with the following:</p>\n<h2 id="the-shell-of-our-app">The Shell of Our App</h2>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// main.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;app.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">void</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">main</span><span style="color: #C9D1D9">() </span><span style="color: #FF7B72">=&gt;</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">runApp</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">App</span><span style="color: #C9D1D9">());</span></span>\n<span class="line"><span style="color: #C9D1D9">```</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">```dart</span></span>\n<span class="line"><span style="color: #8B949E">// app.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;screens/home/home.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">App</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MaterialApp</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">      home</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MyHomePage</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">    );</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>\n<h2 id="defining-our-models-a-simple-model-defining-a-member-called-count-with-a-default-value-of-1">Defining Our Models A simple model defining a member called <code is:raw>count</code> with a default value of <code is:raw>1</code>.</h2>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /models/counter.dart</span></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">int</span><span style="color: #C9D1D9"> count </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">1</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>\n<p>This is our (scoped) model. I called it a (scoped) model, even though as you\u2019ll see below there\u2019s an actual <code is:raw>ScopedModel</code> widget, because we should separate our traditional models in <code is:raw>/models</code> with scoped models, which define state variables and the business logic that relates to it. Note that our plain old <code is:raw>Counter</code> model above may later have its own business logic but our scoped model, <code is:raw>ScopedCounter</code>, exclusively includes state variables and business logic related to that state. We instantiate three <code is:raw>Counter</code> objects. When the <code is:raw>increment</code> method is triggered, we update each of those with a different value. After we update our state, we \u201Cnotify\u201D any widgets that rely on it via the <code is:raw>notifyListeners()</code> as seen below. This will trigger any widgets that rely on this state to automatically update, exactly how your standard <code is:raw>StatefulWidget</code> works:</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /scoped_models/scoped_counters.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../models/counter.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Model</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter1 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter2 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter3 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #D2A8FF">increment</span><span style="color: #C9D1D9">() {</span></span>\n<span class="line"><span style="color: #C9D1D9">    counter1.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">1</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #C9D1D9">    counter2.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">5</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #C9D1D9">    counter3.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">10</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #D2A8FF">notifyListeners</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>\n<h2 id="our-single-screen">Our Single Screen</h2>\n<p>This screen was mainly taken from the standard project created by the <code is:raw>flutter create</code> command, just to ensure it\u2019s familiar to everyone. Here we render our three widgets on the screen along with a button that triggers an update to our state. The important widget to notice is is the <code is:raw>ScopedModel</code> widget below, of type <code is:raw>ScopedCounter</code> (the class we created above). We wrap our screen with this <code is:raw>ScopedModel</code> widget, which will provide the functionality we need in each widget below. In other words, from the documentation: \u201CIf you need to pass a Model deep down your Widget hierarchy, you can wrap your Model in a ScopedModel Widget. This will make the Model available to all descendant Widgets.\u201D</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/home.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget1.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget2.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget3.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MyHomePage</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">final</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9"> scopedCounter </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModel</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">      model</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> scopedCounter,</span></span>\n<span class="line"><span style="color: #C9D1D9">      child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Scaffold</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">        appBar</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">AppBar</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">          title</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Hello World with Scoped Model&#39;</span><span style="color: #C9D1D9">),</span></span>\n<span class="line"><span style="color: #C9D1D9">        ),</span></span>\n<span class="line"><span style="color: #C9D1D9">        body</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Center</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">          child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Column</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">            mainAxisAlignment</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MainAxisAlignment</span><span style="color: #C9D1D9">.center,</span></span>\n<span class="line"><span style="color: #C9D1D9">            children</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">&lt;</span><span style="color: #C9D1D9">widget</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9">[</span></span>\n<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget1</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget2</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget3</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">            ],</span></span>\n<span class="line"><span style="color: #C9D1D9">          ),</span></span>\n<span class="line"><span style="color: #C9D1D9">        ),</span></span>\n<span class="line"><span style="color: #C9D1D9">        floatingActionButton</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">FloatingActionButton</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">          onPressed</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> () </span><span style="color: #FF7B72">=&gt;</span><span style="color: #C9D1D9"> scopedCounter.</span><span style="color: #D2A8FF">increment</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">          tooltip</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;Increment&#39;</span><span style="color: #C9D1D9">,</span></span>\n<span class="line"><span style="color: #C9D1D9">          child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Icon</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">Icons</span><span style="color: #C9D1D9">.add),</span></span>\n<span class="line"><span style="color: #C9D1D9">        ),</span></span>\n<span class="line"><span style="color: #C9D1D9">      ),</span></span>\n<span class="line"><span style="color: #C9D1D9">    );</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">widget</span><span style="color: #FF7B72">&gt;&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<h2 id="our-child-widgets">Our Child Widgets</h2>\n<p>Here, we have three simple widgets, each relying on its own instance of <code is:raw>Counter</code>. Each has a hardcoded string it renders with the latest counter value appended. It\u2019s a really contrived example but it\u2019s just mean to show how different widgets use the centralized state in our scoped model in its own way. Note that each of these are nice, clean <code is:raw>StatelessWidget</code>s, not <code is:raw>StatefulWidget</code>s. This is pretty nice, as the code can stay pretty simple, without much of any business logic.</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget1.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget1</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>\n<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget1 counter is ${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter1</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget2.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget2</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>\n<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget2 counter is ${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter2</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget3.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget3</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>\n<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget3 counter is ${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter3</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<h2 id="summary">Summary</h2>\nThat\u2019s it. If you want to check out the free 10 minute video for this post, where I go into explaining things a bit more in detail, you can check it out \n<a href="">\nhere\n</a>\n. The code for this post can be found \n<a href="https://github.com/seenickcode/scoped_model_hello_world">here</a>\n. If you want to check out a more realistic example of \n<code is:raw>scoped_model</code>\n, sign up for the Pro subscription \n<a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model">here</a>\n.\n<p>Happy Fluttering, Nick</p>' };
const frontmatter$5 = { "title": "scoped_model", "publishDate": "21 May 2021", "name": "Nick Manning", "value": 128, "description": "scoped_model", "duration": "10 min read", "astro": { "headers": [{ "depth": 2, "slug": "how-does-it-work-exactly", "text": "How Does it Work, Exactly?" }, { "depth": 2, "slug": "terms-well-be-throwing-around", "text": "Terms We\u2019ll Be Throwing Around" }, { "depth": 2, "slug": "lets-dive-in", "text": "Let\u2019s Dive In" }, { "depth": 2, "slug": "our-code-just-a-quick-note-on-how-were-organizing-our-apps-code", "text": "Our Code Just a quick note on how we\u2019re organizing our app\u2019s code:" }, { "depth": 2, "slug": "step-1-flutter-create-lets-make-sure-flutter-is-up-to-date-and-generate-a-new-project", "text": "Step 1: Flutter Create Let\u2019s make sure Flutter is up to date and generate a new project:" }, { "depth": 2, "slug": "the-shell-of-our-app", "text": "The Shell of Our App" }, { "depth": 2, "slug": "defining-our-models-a-simple-model-defining-a-member-called-count-with-a-default-value-of-1", "text": "Defining Our Models A simple model defining a member called count with a default value of 1." }, { "depth": 2, "slug": "our-single-screen", "text": "Our Single Screen" }, { "depth": 2, "slug": "our-child-widgets", "text": "Our Child Widgets" }, { "depth": 2, "slug": "summary", "text": "Summary" }], "source": "\nWhat [`scoped_model`](https://pub.dartlang.org/packages/scoped_model) does is it makes working with state in your app much easier.\n\nNote: you can check out the video for this post [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/scoped-model-hello-world) and the longer, pro video [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model).\n\nWhile it's all well and good to exclusively use `StatefulWidget`, most of the time your app is going to have multiple widgets that need to use the same shared state. The issue with this is that when those widgets exist in various places in our app, passing around state becomes pretty cumbersome. In other words, `scoped_model` makes it easy for various widgets to access the same shared state. There are also some nice additional benefits you get as well:\n\n- It allows us to conveniently consolidate app-wide state variables and business logic.\n- We can avoid reading up on overly complex architecture patterns.\n- Very minimal boilerplate code is required, compared to similar libraries.\n\n## How Does it Work, Exactly?\n\n`scoped_model` consists of three concepts.\n\nFirst, it offers a `Model` class. We add whatever state variables we want as well as business logic as well.\n\nNext, for each screen that needs to access this state, we wrap everything with a single `ScopedModel` widget, referring to the instance of our model class we created.\n\nFinally, for any child-widgets that need to access our state (even if they're in separate files), we simply wrap them in a `ScopedModelDescendant` widget. Whatever is wrapped there can automagically react to our state updates.\n\nWhat I love about this solution is there's no complex architecture or large amount of boilerplate code we have to maintain to achieve this. Now let's implement something simple so that makes more sense.\n\n## Terms We'll Be Throwing Around\n\n- **State**: data. In our case, state changes over time as users interact with the UI. One or more \"stateful\" widgets may re-render as state changes.\n- **Model**: a class that represents a \"thing\" in our app. Examples: User, Podcast, Episode, etc\n- **Scoped Model**: a class that holds state variables and contains business logic\n- **Business Logic**: code that affects data in our app, typically grouped by conern. Examples: the Business Logic that determines how we work with fetching and managing Podcasts in our app.\n- **Render**: the act of drawing something on the screen, i.e. a Button, Image, etc.\n\n## Let's Dive In\n\nLet's create a simple app to demonstrate `scoped_model`. If you don't want to follow along, you can find the code [here](https://github.com/seenickcode/scoped_model_hello_world). Our app will be a pretty contrived example in order to keep things simple. It will:\n\n- Show a screen with three simple text labels.\n- When the plus button at the bottom is tapped, our state is updated.\n- Because our labels are wired up to a Scoped Model, they'll get those updates automagically.\n\n## Our Code Just a quick note on how we're organizing our app's code:\n\n- `main.dart`: loads our `App` widget.\n- `app.dart`: a `StatelessWidget`, rendering a `MaterialApp`.\n- `/models/counter.dart`: a simple model that represents a Counter.\n- `/scoped_models/scoped_counters.dart`: our scoped model that contains state variables and state specific business logic.\n- `/screens/home/home.dart`: our main screen.\n- `/screens/home/widgets/widget1.dart`: a simple stateless widget that shows some hardcoded text with the latest state value appended to it.\n- `/screens/home/widgets/widget2.dart`: same as above, just different text and wiring up to another state variable. \\* `/screens/home/widgets/widget3.dart`: same as above, just different text and wiring up to another state variable. #\n\n## Step 1: Flutter Create Let's make sure Flutter is up to date and generate a new project:\n\n```shell\nflutter upgrade\nflutter create scoped_model_hello_world\n```\n\nNow, open your project in the IDE of your choice (I personally use [VSCode](https://code.visualstudio.com/)) and replace `main.dart` with the following:\n\n## The Shell of Our App\n\n````dart\n// main.dart\nimport 'package:flutter/material.dart';\nimport 'app.dart';\n\nvoid main() => runApp(App());\n```\n\n```dart\n// app.dart\nimport 'package:flutter/material.dart';\nimport 'screens/home/home.dart';\n\nclass App extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      home: MyHomePage(),\n    );\n  }\n}\n````\n\n## Defining Our Models A simple model defining a member called `count` with a default value of `1`.\n\n```dart\n// /models/counter.dart\nclass Counter {\n  int count = 1;\n}\n```\n\nThis is our (scoped) model. I called it a (scoped) model, even though as you'll see below there's an actual `ScopedModel` widget, because we should separate our traditional models in `/models` with scoped models, which define state variables and the business logic that relates to it. Note that our plain old `Counter` model above may later have its own business logic but our scoped model, `ScopedCounter`, exclusively includes state variables and business logic related to that state. We instantiate three `Counter` objects. When the `increment` method is triggered, we update each of those with a different value. After we update our state, we \"notify\" any widgets that rely on it via the `notifyListeners()` as seen below. This will trigger any widgets that rely on this state to automatically update, exactly how your standard `StatefulWidget` works:\n\n```dart\n// /scoped_models/scoped_counters.dart\nimport 'package:scoped_model/scoped_model.dart';\nimport '../models/counter.dart';\n\nclass ScopedCounter extends Model {\n  Counter counter1 = Counter();\n  Counter counter2 = Counter();\n  Counter counter3 = Counter();\n\n  increment() {\n    counter1.count += 1;\n    counter2.count += 5;\n    counter3.count += 10;\n\n    notifyListeners();\n  }\n}\n```\n\n## Our Single Screen\n\nThis screen was mainly taken from the standard project created by the `flutter create` command, just to ensure it's familiar to everyone. Here we render our three widgets on the screen along with a button that triggers an update to our state. The important widget to notice is is the `ScopedModel` widget below, of type `ScopedCounter` (the class we created above). We wrap our screen with this `ScopedModel` widget, which will provide the functionality we need in each widget below. In other words, from the documentation: \"If you need to pass a Model deep down your Widget hierarchy, you can wrap your Model in a ScopedModel Widget. This will make the Model available to all descendant Widgets.\"\n\n```dart\n// /screens/home/home.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\nimport 'widget1.dart';\nimport 'widget2.dart';\nimport 'widget3.dart';\n\nclass MyHomePage extends StatelessWidget {\n  final ScopedCounter scopedCounter = ScopedCounter();\n\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModel<scopedcounter>(\n      model: scopedCounter,\n      child: Scaffold(\n        appBar: AppBar(\n          title: Text('Hello World with Scoped Model'),\n        ),\n        body: Center(\n          child: Column(\n            mainAxisAlignment: MainAxisAlignment.center,\n            children: <widget>[\n              Widget1(),\n              Widget2(),\n              Widget3(),\n            ],\n          ),\n        ),\n        floatingActionButton: FloatingActionButton(\n          onPressed: () => scopedCounter.increment(),\n          tooltip: 'Increment',\n          child: Icon(Icons.add),\n        ),\n      ),\n    );\n  }\n}</widget></scopedcounter> `\n```\n\n## Our Child Widgets\n\nHere, we have three simple widgets, each relying on its own instance of `Counter`. Each has a hardcoded string it renders with the latest counter value appended. It's a really contrived example but it's just mean to show how different widgets use the centralized state in our scoped model in its own way. Note that each of these are nice, clean `StatelessWidget`s, not `StatefulWidget`s. This is pretty nice, as the code can stay pretty simple, without much of any business logic.\n\n```dart\n// /screens/home/widgets/widget1.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\n\nclass Widget1 extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModelDescendant<scopedcounter>(\n        builder: (context, child, model) =>\n            Text('Widget1 counter is ${model.counter1.count}'));\n  }\n}</scopedcounter> `\n```\n\n```dart\n// /screens/home/widgets/widget2.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\n\nclass Widget2 extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModelDescendant<scopedcounter>(\n        builder: (context, child, model) =>\n            Text('Widget2 counter is ${model.counter2.count}'));\n  }\n}</scopedcounter> `\n```\n\n```dart\n// /screens/home/widgets/widget3.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\n\nclass Widget3 extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModelDescendant<scopedcounter>(\n        builder: (context, child, model) =>\n            Text('Widget3 counter is ${model.counter3.count}'));\n  }\n}</scopedcounter> `\n```\n\n## Summary\n\nThat's it. If you want to check out the free 10 minute video for this post, where I go into explaining things a bit more in detail, you can check it out <a href=\"\">here</a>. The code for this post can be found [here](https://github.com/seenickcode/scoped_model_hello_world). If you want to check out a more realistic example of `scoped_model`, sign up for the Pro subscription [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model).\n\nHappy Fluttering, Nick\n", "html": '<p>What <a href="https://pub.dartlang.org/packages/scoped_model"><code is:raw>scoped_model</code></a> does is it makes working with state in your app much easier.</p>\n<p>Note: you can check out the video for this post <a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/scoped-model-hello-world">here</a> and the longer, pro video <a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model">here</a>.</p>\n<p>While it\u2019s all well and good to exclusively use <code is:raw>StatefulWidget</code>, most of the time your app is going to have multiple widgets that need to use the same shared state. The issue with this is that when those widgets exist in various places in our app, passing around state becomes pretty cumbersome. In other words, <code is:raw>scoped_model</code> makes it easy for various widgets to access the same shared state. There are also some nice additional benefits you get as well:</p>\n<ul>\n<li>It allows us to conveniently consolidate app-wide state variables and business logic.</li>\n<li>We can avoid reading up on overly complex architecture patterns.</li>\n<li>Very minimal boilerplate code is required, compared to similar libraries.</li>\n</ul>\n<h2 id="how-does-it-work-exactly">How Does it Work, Exactly?</h2>\n<p><code is:raw>scoped_model</code> consists of three concepts.</p>\n<p>First, it offers a <code is:raw>Model</code> class. We add whatever state variables we want as well as business logic as well.</p>\n<p>Next, for each screen that needs to access this state, we wrap everything with a single <code is:raw>ScopedModel</code> widget, referring to the instance of our model class we created.</p>\n<p>Finally, for any child-widgets that need to access our state (even if they\u2019re in separate files), we simply wrap them in a <code is:raw>ScopedModelDescendant</code> widget. Whatever is wrapped there can automagically react to our state updates.</p>\n<p>What I love about this solution is there\u2019s no complex architecture or large amount of boilerplate code we have to maintain to achieve this. Now let\u2019s implement something simple so that makes more sense.</p>\n<h2 id="terms-well-be-throwing-around">Terms We\u2019ll Be Throwing Around</h2>\n<ul>\n<li><strong>State</strong>: data. In our case, state changes over time as users interact with the UI. One or more \u201Cstateful\u201D widgets may re-render as state changes.</li>\n<li><strong>Model</strong>: a class that represents a \u201Cthing\u201D in our app. Examples: User, Podcast, Episode, etc</li>\n<li><strong>Scoped Model</strong>: a class that holds state variables and contains business logic</li>\n<li><strong>Business Logic</strong>: code that affects data in our app, typically grouped by conern. Examples: the Business Logic that determines how we work with fetching and managing Podcasts in our app.</li>\n<li><strong>Render</strong>: the act of drawing something on the screen, i.e. a Button, Image, etc.</li>\n</ul>\n<h2 id="lets-dive-in">Let\u2019s Dive In</h2>\n<p>Let\u2019s create a simple app to demonstrate <code is:raw>scoped_model</code>. If you don\u2019t want to follow along, you can find the code <a href="https://github.com/seenickcode/scoped_model_hello_world">here</a>. Our app will be a pretty contrived example in order to keep things simple. It will:</p>\n<ul>\n<li>Show a screen with three simple text labels.</li>\n<li>When the plus button at the bottom is tapped, our state is updated.</li>\n<li>Because our labels are wired up to a Scoped Model, they\u2019ll get those updates automagically.</li>\n</ul>\n<h2 id="our-code-just-a-quick-note-on-how-were-organizing-our-apps-code">Our Code Just a quick note on how we\u2019re organizing our app\u2019s code:</h2>\n<ul>\n<li><code is:raw>main.dart</code>: loads our <code is:raw>App</code> widget.</li>\n<li><code is:raw>app.dart</code>: a <code is:raw>StatelessWidget</code>, rendering a <code is:raw>MaterialApp</code>.</li>\n<li><code is:raw>/models/counter.dart</code>: a simple model that represents a Counter.</li>\n<li><code is:raw>/scoped_models/scoped_counters.dart</code>: our scoped model that contains state variables and state specific business logic.</li>\n<li><code is:raw>/screens/home/home.dart</code>: our main screen.</li>\n<li><code is:raw>/screens/home/widgets/widget1.dart</code>: a simple stateless widget that shows some hardcoded text with the latest state value appended to it.</li>\n<li><code is:raw>/screens/home/widgets/widget2.dart</code>: same as above, just different text and wiring up to another state variable. * <code is:raw>/screens/home/widgets/widget3.dart</code>: same as above, just different text and wiring up to another state variable. #</li>\n</ul>\n<h2 id="step-1-flutter-create-lets-make-sure-flutter-is-up-to-date-and-generate-a-new-project">Step 1: Flutter Create Let\u2019s make sure Flutter is up to date and generate a new project:</h2>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #C9D1D9">flutter upgrade</span></span>\n<span class="line"><span style="color: #C9D1D9">flutter create scoped_model_hello_world</span></span></code></pre>\n<p>Now, open your project in the IDE of your choice (I personally use <a href="https://code.visualstudio.com/">VSCode</a>) and replace <code is:raw>main.dart</code> with the following:</p>\n<h2 id="the-shell-of-our-app">The Shell of Our App</h2>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// main.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;app.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">void</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">main</span><span style="color: #C9D1D9">() </span><span style="color: #FF7B72">=&gt;</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">runApp</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">App</span><span style="color: #C9D1D9">());</span></span>\n<span class="line"><span style="color: #C9D1D9">```</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">```dart</span></span>\n<span class="line"><span style="color: #8B949E">// app.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;screens/home/home.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">App</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MaterialApp</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">      home</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MyHomePage</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">    );</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>\n<h2 id="defining-our-models-a-simple-model-defining-a-member-called-count-with-a-default-value-of-1">Defining Our Models A simple model defining a member called <code is:raw>count</code> with a default value of <code is:raw>1</code>.</h2>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /models/counter.dart</span></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">int</span><span style="color: #C9D1D9"> count </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">1</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>\n<p>This is our (scoped) model. I called it a (scoped) model, even though as you\u2019ll see below there\u2019s an actual <code is:raw>ScopedModel</code> widget, because we should separate our traditional models in <code is:raw>/models</code> with scoped models, which define state variables and the business logic that relates to it. Note that our plain old <code is:raw>Counter</code> model above may later have its own business logic but our scoped model, <code is:raw>ScopedCounter</code>, exclusively includes state variables and business logic related to that state. We instantiate three <code is:raw>Counter</code> objects. When the <code is:raw>increment</code> method is triggered, we update each of those with a different value. After we update our state, we \u201Cnotify\u201D any widgets that rely on it via the <code is:raw>notifyListeners()</code> as seen below. This will trigger any widgets that rely on this state to automatically update, exactly how your standard <code is:raw>StatefulWidget</code> works:</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /scoped_models/scoped_counters.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../models/counter.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Model</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter1 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter2 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter3 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #D2A8FF">increment</span><span style="color: #C9D1D9">() {</span></span>\n<span class="line"><span style="color: #C9D1D9">    counter1.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">1</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #C9D1D9">    counter2.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">5</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #C9D1D9">    counter3.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">10</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #D2A8FF">notifyListeners</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>\n<h2 id="our-single-screen">Our Single Screen</h2>\n<p>This screen was mainly taken from the standard project created by the <code is:raw>flutter create</code> command, just to ensure it\u2019s familiar to everyone. Here we render our three widgets on the screen along with a button that triggers an update to our state. The important widget to notice is is the <code is:raw>ScopedModel</code> widget below, of type <code is:raw>ScopedCounter</code> (the class we created above). We wrap our screen with this <code is:raw>ScopedModel</code> widget, which will provide the functionality we need in each widget below. In other words, from the documentation: \u201CIf you need to pass a Model deep down your Widget hierarchy, you can wrap your Model in a ScopedModel Widget. This will make the Model available to all descendant Widgets.\u201D</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/home.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget1.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget2.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget3.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MyHomePage</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">final</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9"> scopedCounter </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModel</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">      model</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> scopedCounter,</span></span>\n<span class="line"><span style="color: #C9D1D9">      child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Scaffold</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">        appBar</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">AppBar</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">          title</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Hello World with Scoped Model&#39;</span><span style="color: #C9D1D9">),</span></span>\n<span class="line"><span style="color: #C9D1D9">        ),</span></span>\n<span class="line"><span style="color: #C9D1D9">        body</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Center</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">          child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Column</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">            mainAxisAlignment</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MainAxisAlignment</span><span style="color: #C9D1D9">.center,</span></span>\n<span class="line"><span style="color: #C9D1D9">            children</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">&lt;</span><span style="color: #C9D1D9">widget</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9">[</span></span>\n<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget1</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget2</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget3</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">            ],</span></span>\n<span class="line"><span style="color: #C9D1D9">          ),</span></span>\n<span class="line"><span style="color: #C9D1D9">        ),</span></span>\n<span class="line"><span style="color: #C9D1D9">        floatingActionButton</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">FloatingActionButton</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">          onPressed</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> () </span><span style="color: #FF7B72">=&gt;</span><span style="color: #C9D1D9"> scopedCounter.</span><span style="color: #D2A8FF">increment</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">          tooltip</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;Increment&#39;</span><span style="color: #C9D1D9">,</span></span>\n<span class="line"><span style="color: #C9D1D9">          child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Icon</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">Icons</span><span style="color: #C9D1D9">.add),</span></span>\n<span class="line"><span style="color: #C9D1D9">        ),</span></span>\n<span class="line"><span style="color: #C9D1D9">      ),</span></span>\n<span class="line"><span style="color: #C9D1D9">    );</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">widget</span><span style="color: #FF7B72">&gt;&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<h2 id="our-child-widgets">Our Child Widgets</h2>\n<p>Here, we have three simple widgets, each relying on its own instance of <code is:raw>Counter</code>. Each has a hardcoded string it renders with the latest counter value appended. It\u2019s a really contrived example but it\u2019s just mean to show how different widgets use the centralized state in our scoped model in its own way. Note that each of these are nice, clean <code is:raw>StatelessWidget</code>s, not <code is:raw>StatefulWidget</code>s. This is pretty nice, as the code can stay pretty simple, without much of any business logic.</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget1.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget1</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>\n<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget1 counter is ${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter1</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget2.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget2</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>\n<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget2 counter is ${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter2</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget3.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget3</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>\n<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget3 counter is ${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter3</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<h2 id="summary">Summary</h2>\nThat\u2019s it. If you want to check out the free 10 minute video for this post, where I go into explaining things a bit more in detail, you can check it out \n<a href="">\nhere\n</a>\n. The code for this post can be found \n<a href="https://github.com/seenickcode/scoped_model_hello_world">here</a>\n. If you want to check out a more realistic example of \n<code is:raw>scoped_model</code>\n, sign up for the Pro subscription \n<a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model">here</a>\n.\n<p>Happy Fluttering, Nick</p>' } };
const $$metadata$8 = createMetadata("/src/pages/basicflutter/02-scoped-model.md", { modules: [{ module: $$module1$1, specifier: "../../layouts/Main.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$8 = createAstro("/src/pages/basicflutter/02-scoped-model.md", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$02ScopedModel = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$8, $$props, $$slots);
  Astro2.self = $$02ScopedModel;
  const $$content = { "title": "scoped_model", "publishDate": "21 May 2021", "name": "Nick Manning", "value": 128, "description": "scoped_model", "duration": "10 min read", "astro": { "headers": [{ "depth": 2, "slug": "how-does-it-work-exactly", "text": "How Does it Work, Exactly?" }, { "depth": 2, "slug": "terms-well-be-throwing-around", "text": "Terms We\u2019ll Be Throwing Around" }, { "depth": 2, "slug": "lets-dive-in", "text": "Let\u2019s Dive In" }, { "depth": 2, "slug": "our-code-just-a-quick-note-on-how-were-organizing-our-apps-code", "text": "Our Code Just a quick note on how we\u2019re organizing our app\u2019s code:" }, { "depth": 2, "slug": "step-1-flutter-create-lets-make-sure-flutter-is-up-to-date-and-generate-a-new-project", "text": "Step 1: Flutter Create Let\u2019s make sure Flutter is up to date and generate a new project:" }, { "depth": 2, "slug": "the-shell-of-our-app", "text": "The Shell of Our App" }, { "depth": 2, "slug": "defining-our-models-a-simple-model-defining-a-member-called-count-with-a-default-value-of-1", "text": "Defining Our Models A simple model defining a member called count with a default value of 1." }, { "depth": 2, "slug": "our-single-screen", "text": "Our Single Screen" }, { "depth": 2, "slug": "our-child-widgets", "text": "Our Child Widgets" }, { "depth": 2, "slug": "summary", "text": "Summary" }], "source": "\nWhat [`scoped_model`](https://pub.dartlang.org/packages/scoped_model) does is it makes working with state in your app much easier.\n\nNote: you can check out the video for this post [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/scoped-model-hello-world) and the longer, pro video [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model).\n\nWhile it's all well and good to exclusively use `StatefulWidget`, most of the time your app is going to have multiple widgets that need to use the same shared state. The issue with this is that when those widgets exist in various places in our app, passing around state becomes pretty cumbersome. In other words, `scoped_model` makes it easy for various widgets to access the same shared state. There are also some nice additional benefits you get as well:\n\n- It allows us to conveniently consolidate app-wide state variables and business logic.\n- We can avoid reading up on overly complex architecture patterns.\n- Very minimal boilerplate code is required, compared to similar libraries.\n\n## How Does it Work, Exactly?\n\n`scoped_model` consists of three concepts.\n\nFirst, it offers a `Model` class. We add whatever state variables we want as well as business logic as well.\n\nNext, for each screen that needs to access this state, we wrap everything with a single `ScopedModel` widget, referring to the instance of our model class we created.\n\nFinally, for any child-widgets that need to access our state (even if they're in separate files), we simply wrap them in a `ScopedModelDescendant` widget. Whatever is wrapped there can automagically react to our state updates.\n\nWhat I love about this solution is there's no complex architecture or large amount of boilerplate code we have to maintain to achieve this. Now let's implement something simple so that makes more sense.\n\n## Terms We'll Be Throwing Around\n\n- **State**: data. In our case, state changes over time as users interact with the UI. One or more \"stateful\" widgets may re-render as state changes.\n- **Model**: a class that represents a \"thing\" in our app. Examples: User, Podcast, Episode, etc\n- **Scoped Model**: a class that holds state variables and contains business logic\n- **Business Logic**: code that affects data in our app, typically grouped by conern. Examples: the Business Logic that determines how we work with fetching and managing Podcasts in our app.\n- **Render**: the act of drawing something on the screen, i.e. a Button, Image, etc.\n\n## Let's Dive In\n\nLet's create a simple app to demonstrate `scoped_model`. If you don't want to follow along, you can find the code [here](https://github.com/seenickcode/scoped_model_hello_world). Our app will be a pretty contrived example in order to keep things simple. It will:\n\n- Show a screen with three simple text labels.\n- When the plus button at the bottom is tapped, our state is updated.\n- Because our labels are wired up to a Scoped Model, they'll get those updates automagically.\n\n## Our Code Just a quick note on how we're organizing our app's code:\n\n- `main.dart`: loads our `App` widget.\n- `app.dart`: a `StatelessWidget`, rendering a `MaterialApp`.\n- `/models/counter.dart`: a simple model that represents a Counter.\n- `/scoped_models/scoped_counters.dart`: our scoped model that contains state variables and state specific business logic.\n- `/screens/home/home.dart`: our main screen.\n- `/screens/home/widgets/widget1.dart`: a simple stateless widget that shows some hardcoded text with the latest state value appended to it.\n- `/screens/home/widgets/widget2.dart`: same as above, just different text and wiring up to another state variable. \\* `/screens/home/widgets/widget3.dart`: same as above, just different text and wiring up to another state variable. #\n\n## Step 1: Flutter Create Let's make sure Flutter is up to date and generate a new project:\n\n```shell\nflutter upgrade\nflutter create scoped_model_hello_world\n```\n\nNow, open your project in the IDE of your choice (I personally use [VSCode](https://code.visualstudio.com/)) and replace `main.dart` with the following:\n\n## The Shell of Our App\n\n````dart\n// main.dart\nimport 'package:flutter/material.dart';\nimport 'app.dart';\n\nvoid main() => runApp(App());\n```\n\n```dart\n// app.dart\nimport 'package:flutter/material.dart';\nimport 'screens/home/home.dart';\n\nclass App extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      home: MyHomePage(),\n    );\n  }\n}\n````\n\n## Defining Our Models A simple model defining a member called `count` with a default value of `1`.\n\n```dart\n// /models/counter.dart\nclass Counter {\n  int count = 1;\n}\n```\n\nThis is our (scoped) model. I called it a (scoped) model, even though as you'll see below there's an actual `ScopedModel` widget, because we should separate our traditional models in `/models` with scoped models, which define state variables and the business logic that relates to it. Note that our plain old `Counter` model above may later have its own business logic but our scoped model, `ScopedCounter`, exclusively includes state variables and business logic related to that state. We instantiate three `Counter` objects. When the `increment` method is triggered, we update each of those with a different value. After we update our state, we \"notify\" any widgets that rely on it via the `notifyListeners()` as seen below. This will trigger any widgets that rely on this state to automatically update, exactly how your standard `StatefulWidget` works:\n\n```dart\n// /scoped_models/scoped_counters.dart\nimport 'package:scoped_model/scoped_model.dart';\nimport '../models/counter.dart';\n\nclass ScopedCounter extends Model {\n  Counter counter1 = Counter();\n  Counter counter2 = Counter();\n  Counter counter3 = Counter();\n\n  increment() {\n    counter1.count += 1;\n    counter2.count += 5;\n    counter3.count += 10;\n\n    notifyListeners();\n  }\n}\n```\n\n## Our Single Screen\n\nThis screen was mainly taken from the standard project created by the `flutter create` command, just to ensure it's familiar to everyone. Here we render our three widgets on the screen along with a button that triggers an update to our state. The important widget to notice is is the `ScopedModel` widget below, of type `ScopedCounter` (the class we created above). We wrap our screen with this `ScopedModel` widget, which will provide the functionality we need in each widget below. In other words, from the documentation: \"If you need to pass a Model deep down your Widget hierarchy, you can wrap your Model in a ScopedModel Widget. This will make the Model available to all descendant Widgets.\"\n\n```dart\n// /screens/home/home.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\nimport 'widget1.dart';\nimport 'widget2.dart';\nimport 'widget3.dart';\n\nclass MyHomePage extends StatelessWidget {\n  final ScopedCounter scopedCounter = ScopedCounter();\n\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModel<scopedcounter>(\n      model: scopedCounter,\n      child: Scaffold(\n        appBar: AppBar(\n          title: Text('Hello World with Scoped Model'),\n        ),\n        body: Center(\n          child: Column(\n            mainAxisAlignment: MainAxisAlignment.center,\n            children: <widget>[\n              Widget1(),\n              Widget2(),\n              Widget3(),\n            ],\n          ),\n        ),\n        floatingActionButton: FloatingActionButton(\n          onPressed: () => scopedCounter.increment(),\n          tooltip: 'Increment',\n          child: Icon(Icons.add),\n        ),\n      ),\n    );\n  }\n}</widget></scopedcounter> `\n```\n\n## Our Child Widgets\n\nHere, we have three simple widgets, each relying on its own instance of `Counter`. Each has a hardcoded string it renders with the latest counter value appended. It's a really contrived example but it's just mean to show how different widgets use the centralized state in our scoped model in its own way. Note that each of these are nice, clean `StatelessWidget`s, not `StatefulWidget`s. This is pretty nice, as the code can stay pretty simple, without much of any business logic.\n\n```dart\n// /screens/home/widgets/widget1.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\n\nclass Widget1 extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModelDescendant<scopedcounter>(\n        builder: (context, child, model) =>\n            Text('Widget1 counter is ${model.counter1.count}'));\n  }\n}</scopedcounter> `\n```\n\n```dart\n// /screens/home/widgets/widget2.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\n\nclass Widget2 extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModelDescendant<scopedcounter>(\n        builder: (context, child, model) =>\n            Text('Widget2 counter is ${model.counter2.count}'));\n  }\n}</scopedcounter> `\n```\n\n```dart\n// /screens/home/widgets/widget3.dart\nimport 'package:flutter/material.dart';\nimport 'package:scoped_model/scoped_model.dart';\nimport '../../scoped_models/scoped_counters.dart';\n\nclass Widget3 extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return ScopedModelDescendant<scopedcounter>(\n        builder: (context, child, model) =>\n            Text('Widget3 counter is ${model.counter3.count}'));\n  }\n}</scopedcounter> `\n```\n\n## Summary\n\nThat's it. If you want to check out the free 10 minute video for this post, where I go into explaining things a bit more in detail, you can check it out <a href=\"\">here</a>. The code for this post can be found [here](https://github.com/seenickcode/scoped_model_hello_world). If you want to check out a more realistic example of `scoped_model`, sign up for the Pro subscription [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model).\n\nHappy Fluttering, Nick\n", "html": '<p>What <a href="https://pub.dartlang.org/packages/scoped_model"><code is:raw>scoped_model</code></a> does is it makes working with state in your app much easier.</p>\n<p>Note: you can check out the video for this post <a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/scoped-model-hello-world">here</a> and the longer, pro video <a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model">here</a>.</p>\n<p>While it\u2019s all well and good to exclusively use <code is:raw>StatefulWidget</code>, most of the time your app is going to have multiple widgets that need to use the same shared state. The issue with this is that when those widgets exist in various places in our app, passing around state becomes pretty cumbersome. In other words, <code is:raw>scoped_model</code> makes it easy for various widgets to access the same shared state. There are also some nice additional benefits you get as well:</p>\n<ul>\n<li>It allows us to conveniently consolidate app-wide state variables and business logic.</li>\n<li>We can avoid reading up on overly complex architecture patterns.</li>\n<li>Very minimal boilerplate code is required, compared to similar libraries.</li>\n</ul>\n<h2 id="how-does-it-work-exactly">How Does it Work, Exactly?</h2>\n<p><code is:raw>scoped_model</code> consists of three concepts.</p>\n<p>First, it offers a <code is:raw>Model</code> class. We add whatever state variables we want as well as business logic as well.</p>\n<p>Next, for each screen that needs to access this state, we wrap everything with a single <code is:raw>ScopedModel</code> widget, referring to the instance of our model class we created.</p>\n<p>Finally, for any child-widgets that need to access our state (even if they\u2019re in separate files), we simply wrap them in a <code is:raw>ScopedModelDescendant</code> widget. Whatever is wrapped there can automagically react to our state updates.</p>\n<p>What I love about this solution is there\u2019s no complex architecture or large amount of boilerplate code we have to maintain to achieve this. Now let\u2019s implement something simple so that makes more sense.</p>\n<h2 id="terms-well-be-throwing-around">Terms We\u2019ll Be Throwing Around</h2>\n<ul>\n<li><strong>State</strong>: data. In our case, state changes over time as users interact with the UI. One or more \u201Cstateful\u201D widgets may re-render as state changes.</li>\n<li><strong>Model</strong>: a class that represents a \u201Cthing\u201D in our app. Examples: User, Podcast, Episode, etc</li>\n<li><strong>Scoped Model</strong>: a class that holds state variables and contains business logic</li>\n<li><strong>Business Logic</strong>: code that affects data in our app, typically grouped by conern. Examples: the Business Logic that determines how we work with fetching and managing Podcasts in our app.</li>\n<li><strong>Render</strong>: the act of drawing something on the screen, i.e. a Button, Image, etc.</li>\n</ul>\n<h2 id="lets-dive-in">Let\u2019s Dive In</h2>\n<p>Let\u2019s create a simple app to demonstrate <code is:raw>scoped_model</code>. If you don\u2019t want to follow along, you can find the code <a href="https://github.com/seenickcode/scoped_model_hello_world">here</a>. Our app will be a pretty contrived example in order to keep things simple. It will:</p>\n<ul>\n<li>Show a screen with three simple text labels.</li>\n<li>When the plus button at the bottom is tapped, our state is updated.</li>\n<li>Because our labels are wired up to a Scoped Model, they\u2019ll get those updates automagically.</li>\n</ul>\n<h2 id="our-code-just-a-quick-note-on-how-were-organizing-our-apps-code">Our Code Just a quick note on how we\u2019re organizing our app\u2019s code:</h2>\n<ul>\n<li><code is:raw>main.dart</code>: loads our <code is:raw>App</code> widget.</li>\n<li><code is:raw>app.dart</code>: a <code is:raw>StatelessWidget</code>, rendering a <code is:raw>MaterialApp</code>.</li>\n<li><code is:raw>/models/counter.dart</code>: a simple model that represents a Counter.</li>\n<li><code is:raw>/scoped_models/scoped_counters.dart</code>: our scoped model that contains state variables and state specific business logic.</li>\n<li><code is:raw>/screens/home/home.dart</code>: our main screen.</li>\n<li><code is:raw>/screens/home/widgets/widget1.dart</code>: a simple stateless widget that shows some hardcoded text with the latest state value appended to it.</li>\n<li><code is:raw>/screens/home/widgets/widget2.dart</code>: same as above, just different text and wiring up to another state variable. * <code is:raw>/screens/home/widgets/widget3.dart</code>: same as above, just different text and wiring up to another state variable. #</li>\n</ul>\n<h2 id="step-1-flutter-create-lets-make-sure-flutter-is-up-to-date-and-generate-a-new-project">Step 1: Flutter Create Let\u2019s make sure Flutter is up to date and generate a new project:</h2>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #C9D1D9">flutter upgrade</span></span>\n<span class="line"><span style="color: #C9D1D9">flutter create scoped_model_hello_world</span></span></code></pre>\n<p>Now, open your project in the IDE of your choice (I personally use <a href="https://code.visualstudio.com/">VSCode</a>) and replace <code is:raw>main.dart</code> with the following:</p>\n<h2 id="the-shell-of-our-app">The Shell of Our App</h2>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// main.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;app.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">void</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">main</span><span style="color: #C9D1D9">() </span><span style="color: #FF7B72">=&gt;</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">runApp</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">App</span><span style="color: #C9D1D9">());</span></span>\n<span class="line"><span style="color: #C9D1D9">```</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">```dart</span></span>\n<span class="line"><span style="color: #8B949E">// app.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;screens/home/home.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">App</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MaterialApp</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">      home</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MyHomePage</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">    );</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>\n<h2 id="defining-our-models-a-simple-model-defining-a-member-called-count-with-a-default-value-of-1">Defining Our Models A simple model defining a member called <code is:raw>count</code> with a default value of <code is:raw>1</code>.</h2>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /models/counter.dart</span></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">int</span><span style="color: #C9D1D9"> count </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">1</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>\n<p>This is our (scoped) model. I called it a (scoped) model, even though as you\u2019ll see below there\u2019s an actual <code is:raw>ScopedModel</code> widget, because we should separate our traditional models in <code is:raw>/models</code> with scoped models, which define state variables and the business logic that relates to it. Note that our plain old <code is:raw>Counter</code> model above may later have its own business logic but our scoped model, <code is:raw>ScopedCounter</code>, exclusively includes state variables and business logic related to that state. We instantiate three <code is:raw>Counter</code> objects. When the <code is:raw>increment</code> method is triggered, we update each of those with a different value. After we update our state, we \u201Cnotify\u201D any widgets that rely on it via the <code is:raw>notifyListeners()</code> as seen below. This will trigger any widgets that rely on this state to automatically update, exactly how your standard <code is:raw>StatefulWidget</code> works:</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /scoped_models/scoped_counters.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../models/counter.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Model</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter1 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter2 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter3 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #D2A8FF">increment</span><span style="color: #C9D1D9">() {</span></span>\n<span class="line"><span style="color: #C9D1D9">    counter1.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">1</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #C9D1D9">    counter2.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">5</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #C9D1D9">    counter3.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">10</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #D2A8FF">notifyListeners</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>\n<h2 id="our-single-screen">Our Single Screen</h2>\n<p>This screen was mainly taken from the standard project created by the <code is:raw>flutter create</code> command, just to ensure it\u2019s familiar to everyone. Here we render our three widgets on the screen along with a button that triggers an update to our state. The important widget to notice is is the <code is:raw>ScopedModel</code> widget below, of type <code is:raw>ScopedCounter</code> (the class we created above). We wrap our screen with this <code is:raw>ScopedModel</code> widget, which will provide the functionality we need in each widget below. In other words, from the documentation: \u201CIf you need to pass a Model deep down your Widget hierarchy, you can wrap your Model in a ScopedModel Widget. This will make the Model available to all descendant Widgets.\u201D</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/home.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget1.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget2.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget3.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MyHomePage</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">final</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9"> scopedCounter </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9">();</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModel</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">      model</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> scopedCounter,</span></span>\n<span class="line"><span style="color: #C9D1D9">      child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Scaffold</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">        appBar</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">AppBar</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">          title</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Hello World with Scoped Model&#39;</span><span style="color: #C9D1D9">),</span></span>\n<span class="line"><span style="color: #C9D1D9">        ),</span></span>\n<span class="line"><span style="color: #C9D1D9">        body</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Center</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">          child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Column</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">            mainAxisAlignment</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MainAxisAlignment</span><span style="color: #C9D1D9">.center,</span></span>\n<span class="line"><span style="color: #C9D1D9">            children</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">&lt;</span><span style="color: #C9D1D9">widget</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9">[</span></span>\n<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget1</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget2</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget3</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">            ],</span></span>\n<span class="line"><span style="color: #C9D1D9">          ),</span></span>\n<span class="line"><span style="color: #C9D1D9">        ),</span></span>\n<span class="line"><span style="color: #C9D1D9">        floatingActionButton</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">FloatingActionButton</span><span style="color: #C9D1D9">(</span></span>\n<span class="line"><span style="color: #C9D1D9">          onPressed</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> () </span><span style="color: #FF7B72">=&gt;</span><span style="color: #C9D1D9"> scopedCounter.</span><span style="color: #D2A8FF">increment</span><span style="color: #C9D1D9">(),</span></span>\n<span class="line"><span style="color: #C9D1D9">          tooltip</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;Increment&#39;</span><span style="color: #C9D1D9">,</span></span>\n<span class="line"><span style="color: #C9D1D9">          child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Icon</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">Icons</span><span style="color: #C9D1D9">.add),</span></span>\n<span class="line"><span style="color: #C9D1D9">        ),</span></span>\n<span class="line"><span style="color: #C9D1D9">      ),</span></span>\n<span class="line"><span style="color: #C9D1D9">    );</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">widget</span><span style="color: #FF7B72">&gt;&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<h2 id="our-child-widgets">Our Child Widgets</h2>\n<p>Here, we have three simple widgets, each relying on its own instance of <code is:raw>Counter</code>. Each has a hardcoded string it renders with the latest counter value appended. It\u2019s a really contrived example but it\u2019s just mean to show how different widgets use the centralized state in our scoped model in its own way. Note that each of these are nice, clean <code is:raw>StatelessWidget</code>s, not <code is:raw>StatefulWidget</code>s. This is pretty nice, as the code can stay pretty simple, without much of any business logic.</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget1.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget1</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>\n<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget1 counter is ${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter1</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget2.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget2</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>\n<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget2 counter is ${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter2</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget3.dart</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget3</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>\n<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>\n<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>\n<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget3 counter is ${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter3</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>\n<span class="line"><span style="color: #C9D1D9">  }</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> `</span></span></code></pre>\n<h2 id="summary">Summary</h2>\nThat\u2019s it. If you want to check out the free 10 minute video for this post, where I go into explaining things a bit more in detail, you can check it out \n<a href="">\nhere\n</a>\n. The code for this post can be found \n<a href="https://github.com/seenickcode/scoped_model_hello_world">here</a>\n. If you want to check out a more realistic example of \n<code is:raw>scoped_model</code>\n, sign up for the Pro subscription \n<a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model">here</a>\n.\n<p>Happy Fluttering, Nick</p>' } };
  return render`${renderComponent($$result, "Layout", $$Main, { "content": $$content }, { "default": () => render`<p>What <a href="https://pub.dartlang.org/packages/scoped_model"><code>scoped_model</code></a> does is it makes working with state in your app much easier.</p><p>Note: you can check out the video for this post <a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/scoped-model-hello-world">here</a> and the longer, pro video <a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model">here</a>.</p><p>While it’s all well and good to exclusively use <code>StatefulWidget</code>, most of the time your app is going to have multiple widgets that need to use the same shared state. The issue with this is that when those widgets exist in various places in our app, passing around state becomes pretty cumbersome. In other words, <code>scoped_model</code> makes it easy for various widgets to access the same shared state. There are also some nice additional benefits you get as well:</p><ul>
<li>It allows us to conveniently consolidate app-wide state variables and business logic.</li>
<li>We can avoid reading up on overly complex architecture patterns.</li>
<li>Very minimal boilerplate code is required, compared to similar libraries.</li>
</ul><h2 id="how-does-it-work-exactly">How Does it Work, Exactly?</h2><p><code>scoped_model</code> consists of three concepts.</p><p>First, it offers a <code>Model</code> class. We add whatever state variables we want as well as business logic as well.</p><p>Next, for each screen that needs to access this state, we wrap everything with a single <code>ScopedModel</code> widget, referring to the instance of our model class we created.</p><p>Finally, for any child-widgets that need to access our state (even if they’re in separate files), we simply wrap them in a <code>ScopedModelDescendant</code> widget. Whatever is wrapped there can automagically react to our state updates.</p><p>What I love about this solution is there’s no complex architecture or large amount of boilerplate code we have to maintain to achieve this. Now let’s implement something simple so that makes more sense.</p><h2 id="terms-well-be-throwing-around">Terms We’ll Be Throwing Around</h2><ul>
<li><strong>State</strong>: data. In our case, state changes over time as users interact with the UI. One or more “stateful” widgets may re-render as state changes.</li>
<li><strong>Model</strong>: a class that represents a “thing” in our app. Examples: User, Podcast, Episode, etc</li>
<li><strong>Scoped Model</strong>: a class that holds state variables and contains business logic</li>
<li><strong>Business Logic</strong>: code that affects data in our app, typically grouped by conern. Examples: the Business Logic that determines how we work with fetching and managing Podcasts in our app.</li>
<li><strong>Render</strong>: the act of drawing something on the screen, i.e. a Button, Image, etc.</li>
</ul><h2 id="lets-dive-in">Let’s Dive In</h2><p>Let’s create a simple app to demonstrate <code>scoped_model</code>. If you don’t want to follow along, you can find the code <a href="https://github.com/seenickcode/scoped_model_hello_world">here</a>. Our app will be a pretty contrived example in order to keep things simple. It will:</p><ul>
<li>Show a screen with three simple text labels.</li>
<li>When the plus button at the bottom is tapped, our state is updated.</li>
<li>Because our labels are wired up to a Scoped Model, they’ll get those updates automagically.</li>
</ul><h2 id="our-code-just-a-quick-note-on-how-were-organizing-our-apps-code">Our Code Just a quick note on how we’re organizing our app’s code:</h2><ul>
<li><code>main.dart</code>: loads our <code>App</code> widget.</li>
<li><code>app.dart</code>: a <code>StatelessWidget</code>, rendering a <code>MaterialApp</code>.</li>
<li><code>/models/counter.dart</code>: a simple model that represents a Counter.</li>
<li><code>/scoped_models/scoped_counters.dart</code>: our scoped model that contains state variables and state specific business logic.</li>
<li><code>/screens/home/home.dart</code>: our main screen.</li>
<li><code>/screens/home/widgets/widget1.dart</code>: a simple stateless widget that shows some hardcoded text with the latest state value appended to it.</li>
<li><code>/screens/home/widgets/widget2.dart</code>: same as above, just different text and wiring up to another state variable. * <code>/screens/home/widgets/widget3.dart</code>: same as above, just different text and wiring up to another state variable. #</li>
</ul><h2 id="step-1-flutter-create-lets-make-sure-flutter-is-up-to-date-and-generate-a-new-project">Step 1: Flutter Create Let’s make sure Flutter is up to date and generate a new project:</h2><pre class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #C9D1D9">flutter upgrade</span></span>
<span class="line"><span style="color: #C9D1D9">flutter create scoped_model_hello_world</span></span></code></pre><p>Now, open your project in the IDE of your choice (I personally use <a href="https://code.visualstudio.com/">VSCode</a>) and replace <code>main.dart</code> with the following:</p><h2 id="the-shell-of-our-app">The Shell of Our App</h2><pre class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// main.dart</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;app.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"></span>
<span class="line"><span style="color: #FF7B72">void</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">main</span><span style="color: #C9D1D9">() </span><span style="color: #FF7B72">=&gt;</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">runApp</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">App</span><span style="color: #C9D1D9">());</span></span>
<span class="line"><span style="color: #C9D1D9">\`\`\`</span></span>
<span class="line"></span>
<span class="line"><span style="color: #C9D1D9">\`\`\`dart</span></span>
<span class="line"><span style="color: #8B949E">// app.dart</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;screens/home/home.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"></span>
<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">App</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>
<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MaterialApp</span><span style="color: #C9D1D9">(</span></span>
<span class="line"><span style="color: #C9D1D9">      home</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MyHomePage</span><span style="color: #C9D1D9">(),</span></span>
<span class="line"><span style="color: #C9D1D9">    );</span></span>
<span class="line"><span style="color: #C9D1D9">  }</span></span>
<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre><h2 id="defining-our-models-a-simple-model-defining-a-member-called-count-with-a-default-value-of-1">Defining Our Models A simple model defining a member called <code>count</code> with a default value of <code>1</code>.</h2><pre class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /models/counter.dart</span></span>
<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> {</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">int</span><span style="color: #C9D1D9"> count </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">1</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre><p>This is our (scoped) model. I called it a (scoped) model, even though as you’ll see below there’s an actual <code>ScopedModel</code> widget, because we should separate our traditional models in <code>/models</code> with scoped models, which define state variables and the business logic that relates to it. Note that our plain old <code>Counter</code> model above may later have its own business logic but our scoped model, <code>ScopedCounter</code>, exclusively includes state variables and business logic related to that state. We instantiate three <code>Counter</code> objects. When the <code>increment</code> method is triggered, we update each of those with a different value. After we update our state, we “notify” any widgets that rely on it via the <code>notifyListeners()</code> as seen below. This will trigger any widgets that rely on this state to automatically update, exactly how your standard <code>StatefulWidget</code> works:</p><pre class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /scoped_models/scoped_counters.dart</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../models/counter.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"></span>
<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Model</span><span style="color: #C9D1D9"> {</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter1 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter2 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9"> counter3 </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Counter</span><span style="color: #C9D1D9">();</span></span>
<span class="line"></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #D2A8FF">increment</span><span style="color: #C9D1D9">() {</span></span>
<span class="line"><span style="color: #C9D1D9">    counter1.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">1</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #C9D1D9">    counter2.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">5</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #C9D1D9">    counter3.count </span><span style="color: #FF7B72">+=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">10</span><span style="color: #C9D1D9">;</span></span>
<span class="line"></span>
<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #D2A8FF">notifyListeners</span><span style="color: #C9D1D9">();</span></span>
<span class="line"><span style="color: #C9D1D9">  }</span></span>
<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre><h2 id="our-single-screen">Our Single Screen</h2><p>This screen was mainly taken from the standard project created by the <code>flutter create</code> command, just to ensure it’s familiar to everyone. Here we render our three widgets on the screen along with a button that triggers an update to our state. The important widget to notice is is the <code>ScopedModel</code> widget below, of type <code>ScopedCounter</code> (the class we created above). We wrap our screen with this <code>ScopedModel</code> widget, which will provide the functionality we need in each widget below. In other words, from the documentation: “If you need to pass a Model deep down your Widget hierarchy, you can wrap your Model in a ScopedModel Widget. This will make the Model available to all descendant Widgets.”</p><pre class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/home.dart</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget1.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget2.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;widget3.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"></span>
<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MyHomePage</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">final</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9"> scopedCounter </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedCounter</span><span style="color: #C9D1D9">();</span></span>
<span class="line"></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>
<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModel</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>
<span class="line"><span style="color: #C9D1D9">      model</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> scopedCounter,</span></span>
<span class="line"><span style="color: #C9D1D9">      child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Scaffold</span><span style="color: #C9D1D9">(</span></span>
<span class="line"><span style="color: #C9D1D9">        appBar</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">AppBar</span><span style="color: #C9D1D9">(</span></span>
<span class="line"><span style="color: #C9D1D9">          title</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Hello World with Scoped Model&#39;</span><span style="color: #C9D1D9">),</span></span>
<span class="line"><span style="color: #C9D1D9">        ),</span></span>
<span class="line"><span style="color: #C9D1D9">        body</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Center</span><span style="color: #C9D1D9">(</span></span>
<span class="line"><span style="color: #C9D1D9">          child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Column</span><span style="color: #C9D1D9">(</span></span>
<span class="line"><span style="color: #C9D1D9">            mainAxisAlignment</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">MainAxisAlignment</span><span style="color: #C9D1D9">.center,</span></span>
<span class="line"><span style="color: #C9D1D9">            children</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">&lt;</span><span style="color: #C9D1D9">widget</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9">[</span></span>
<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget1</span><span style="color: #C9D1D9">(),</span></span>
<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget2</span><span style="color: #C9D1D9">(),</span></span>
<span class="line"><span style="color: #C9D1D9">              </span><span style="color: #79C0FF">Widget3</span><span style="color: #C9D1D9">(),</span></span>
<span class="line"><span style="color: #C9D1D9">            ],</span></span>
<span class="line"><span style="color: #C9D1D9">          ),</span></span>
<span class="line"><span style="color: #C9D1D9">        ),</span></span>
<span class="line"><span style="color: #C9D1D9">        floatingActionButton</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">FloatingActionButton</span><span style="color: #C9D1D9">(</span></span>
<span class="line"><span style="color: #C9D1D9">          onPressed</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> () </span><span style="color: #FF7B72">=&gt;</span><span style="color: #C9D1D9"> scopedCounter.</span><span style="color: #D2A8FF">increment</span><span style="color: #C9D1D9">(),</span></span>
<span class="line"><span style="color: #C9D1D9">          tooltip</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;Increment&#39;</span><span style="color: #C9D1D9">,</span></span>
<span class="line"><span style="color: #C9D1D9">          child</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Icon</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">Icons</span><span style="color: #C9D1D9">.add),</span></span>
<span class="line"><span style="color: #C9D1D9">        ),</span></span>
<span class="line"><span style="color: #C9D1D9">      ),</span></span>
<span class="line"><span style="color: #C9D1D9">    );</span></span>
<span class="line"><span style="color: #C9D1D9">  }</span></span>
<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">widget</span><span style="color: #FF7B72">&gt;&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> \`</span></span></code></pre><h2 id="our-child-widgets">Our Child Widgets</h2><p>Here, we have three simple widgets, each relying on its own instance of <code>Counter</code>. Each has a hardcoded string it renders with the latest counter value appended. It’s a really contrived example but it’s just mean to show how different widgets use the centralized state in our scoped model in its own way. Note that each of these are nice, clean <code>StatelessWidget</code>s, not <code>StatefulWidget</code>s. This is pretty nice, as the code can stay pretty simple, without much of any business logic.</p><pre class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget1.dart</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"></span>
<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget1</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>
<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>
<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>
<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget1 counter is \${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter1</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>
<span class="line"><span style="color: #C9D1D9">  }</span></span>
<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> \`</span></span></code></pre><pre class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget2.dart</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"></span>
<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget2</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>
<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>
<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>
<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget2 counter is \${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter2</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>
<span class="line"><span style="color: #C9D1D9">  }</span></span>
<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> \`</span></span></code></pre><pre class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// /screens/home/widgets/widget3.dart</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:flutter/material.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;package:scoped_model/scoped_model.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">import</span><span style="color: #C9D1D9"> </span><span style="color: #A5D6FF">&#39;../../scoped_models/scoped_counters.dart&#39;</span><span style="color: #C9D1D9">;</span></span>
<span class="line"></span>
<span class="line"><span style="color: #FF7B72">class</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">Widget3</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">extends</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">StatelessWidget</span><span style="color: #C9D1D9"> {</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">@override</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #79C0FF">Widget</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">build</span><span style="color: #C9D1D9">(</span><span style="color: #79C0FF">BuildContext</span><span style="color: #C9D1D9"> context) {</span></span>
<span class="line"><span style="color: #C9D1D9">    </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">ScopedModelDescendant</span><span style="color: #C9D1D9">&lt;scopedcounter&gt;(</span></span>
<span class="line"><span style="color: #C9D1D9">        builder</span><span style="color: #FF7B72">:</span><span style="color: #C9D1D9"> (context, child, model) </span><span style="color: #FF7B72">=&gt;</span></span>
<span class="line"><span style="color: #C9D1D9">            </span><span style="color: #79C0FF">Text</span><span style="color: #C9D1D9">(</span><span style="color: #A5D6FF">&#39;Widget3 counter is \${</span><span style="color: #79C0FF">model</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">counter3</span><span style="color: #A5D6FF">.</span><span style="color: #79C0FF">count</span><span style="color: #A5D6FF">}&#39;</span><span style="color: #C9D1D9">));</span></span>
<span class="line"><span style="color: #C9D1D9">  }</span></span>
<span class="line"><span style="color: #C9D1D9">}</span><span style="color: #FF7B72">&lt;/</span><span style="color: #C9D1D9">scopedcounter</span><span style="color: #FF7B72">&gt;</span><span style="color: #C9D1D9"> \`</span></span></code></pre><h2 id="summary">Summary</h2>
That’s it. If you want to check out the free 10 minute video for this post, where I go into explaining things a bit more in detail, you can check it out 
<a href="">
here
</a>
. The code for this post can be found 
<a href="https://github.com/seenickcode/scoped_model_hello_world">here</a>
. If you want to check out a more realistic example of 
<code>scoped_model</code>
, sign up for the Pro subscription 
<a href="https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model">here</a>
.
<p>Happy Fluttering, Nick</p>` })}`;
});

var _page4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  metadata: metadata$5,
  frontmatter: frontmatter$5,
  $$metadata: $$metadata$8,
  'default': $$02ScopedModel
}, Symbol.toStringTag, { value: 'Module' }));

const metadata$4 = { "headers": [], "source": "\nWelcome to the basic flutter tutorial.\n\nDo variables work {frontmatter.value \\* 2}? Yes! Check it out...\n\n```javascript\n// Example JavaScript\n\nconst x = 7;\nfunction returnSeven() {\n  return x;\n}\n```\n", "html": '<p>Welcome to the basic flutter tutorial.</p>\n<p>Do variables work {frontmatter.value * 2}? Yes! Check it out\u2026</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// Example JavaScript</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">const</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">x</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">7</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">function</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">returnSeven</span><span style="color: #C9D1D9">() {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> x;</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>' };
const frontmatter$4 = { "title": "Welcome to basic flutter!", "publishDate": "26 May 2021", "name": "Nick Manning", "value": 128, "description": "Flutter basic setup.", "duration": "1 min read", "astro": { "headers": [], "source": "\nWelcome to the basic flutter tutorial.\n\nDo variables work {frontmatter.value \\* 2}? Yes! Check it out...\n\n```javascript\n// Example JavaScript\n\nconst x = 7;\nfunction returnSeven() {\n  return x;\n}\n```\n", "html": '<p>Welcome to the basic flutter tutorial.</p>\n<p>Do variables work {frontmatter.value * 2}? Yes! Check it out\u2026</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// Example JavaScript</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">const</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">x</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">7</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">function</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">returnSeven</span><span style="color: #C9D1D9">() {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> x;</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>' } };
const $$metadata$7 = createMetadata("/src/pages/basicflutter/01-hello.md", { modules: [{ module: $$module1$1, specifier: "../../layouts/Main.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$7 = createAstro("/src/pages/basicflutter/01-hello.md", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$01Hello$3 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$7, $$props, $$slots);
  Astro2.self = $$01Hello$3;
  const $$content = { "title": "Welcome to basic flutter!", "publishDate": "26 May 2021", "name": "Nick Manning", "value": 128, "description": "Flutter basic setup.", "duration": "1 min read", "astro": { "headers": [], "source": "\nWelcome to the basic flutter tutorial.\n\nDo variables work {frontmatter.value \\* 2}? Yes! Check it out...\n\n```javascript\n// Example JavaScript\n\nconst x = 7;\nfunction returnSeven() {\n  return x;\n}\n```\n", "html": '<p>Welcome to the basic flutter tutorial.</p>\n<p>Do variables work {frontmatter.value * 2}? Yes! Check it out\u2026</p>\n<pre is:raw class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// Example JavaScript</span></span>\n<span class="line"></span>\n<span class="line"><span style="color: #FF7B72">const</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">x</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">7</span><span style="color: #C9D1D9">;</span></span>\n<span class="line"><span style="color: #FF7B72">function</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">returnSeven</span><span style="color: #C9D1D9">() {</span></span>\n<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> x;</span></span>\n<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>' } };
  return render`${renderComponent($$result, "Layout", $$Main, { "content": $$content }, { "default": () => render`<p>Welcome to the basic flutter tutorial.</p><p>Do variables work ${frontmatter$4.value * 2}? Yes! Check it out…</p><pre class="astro-code" style="background-color: #0d1117; overflow-x: auto;"><code><span class="line"><span style="color: #8B949E">// Example JavaScript</span></span>
<span class="line"></span>
<span class="line"><span style="color: #FF7B72">const</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">x</span><span style="color: #C9D1D9"> </span><span style="color: #FF7B72">=</span><span style="color: #C9D1D9"> </span><span style="color: #79C0FF">7</span><span style="color: #C9D1D9">;</span></span>
<span class="line"><span style="color: #FF7B72">function</span><span style="color: #C9D1D9"> </span><span style="color: #D2A8FF">returnSeven</span><span style="color: #C9D1D9">() {</span></span>
<span class="line"><span style="color: #C9D1D9">  </span><span style="color: #FF7B72">return</span><span style="color: #C9D1D9"> x;</span></span>
<span class="line"><span style="color: #C9D1D9">}</span></span></code></pre>` })}`;
});

var _page5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  metadata: metadata$4,
  frontmatter: frontmatter$4,
  $$metadata: $$metadata$7,
  'default': $$01Hello$3
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$6 = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/pages/noskills/index.astro", { modules: [{ module: $$module1$1, specifier: "../../layouts/Main.astro", assert: {} }, { module: $$module2, specifier: "../../components/PathList.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$6 = createAstro("/@fs/Users/seenickcode/code/devjourney/src/pages/noskills/index.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$Index$2 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$Index$2;
  const listItems = [];
  const posts = await Astro2.glob({ "./01-hello.md": () => import('./chunks/chunk.55e8b787.mjs'), "./02-hello-next.md": () => import('./chunks/chunk.bc4ccbf7.mjs'),}, () => `./*.md`);
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`${renderComponent($$result, "Layout", $$Main, { "class": "astro-CD7NI7L4" }, { "default": () => render`<div class="centered-container astro-CD7NI7L4">
		<section class="astro-CD7NI7L4">
			${renderComponent($$result, "PathList", $$PathList, { "listItems": listItems, "posts": posts, "class": "astro-CD7NI7L4" })}
		</section>		
	</div>` })}

`;
});

const $$file$2 = "/Users/seenickcode/code/devjourney/src/pages/noskills/index.astro";
const $$url$2 = "/noskills";

var _page6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$6,
  'default': $$Index$2,
  file: $$file$2,
  url: $$url$2
}, Symbol.toStringTag, { value: 'Module' }));

const metadata$3 = { "headers": [], "source": "\nThis is yet another a tutorial.\n", "html": "<p>This is yet another a tutorial.</p>" };
const frontmatter$3 = { "title": "Let's get started!", "publishDate": "24 May 2021", "name": "Nick Manning", "value": 128, "description": "Getting started.", "duration": "quick read", "astro": { "headers": [], "source": "\nThis is yet another a tutorial.\n", "html": "<p>This is yet another a tutorial.</p>" } };
const $$metadata$5 = createMetadata("/src/pages/noskills/02-hello-next.md", { modules: [{ module: $$module1$1, specifier: "../../layouts/Main.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$5 = createAstro("/src/pages/noskills/02-hello-next.md", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$02HelloNext = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$02HelloNext;
  const $$content = { "title": "Let's get started!", "publishDate": "24 May 2021", "name": "Nick Manning", "value": 128, "description": "Getting started.", "duration": "quick read", "astro": { "headers": [], "source": "\nThis is yet another a tutorial.\n", "html": "<p>This is yet another a tutorial.</p>" } };
  return render`${renderComponent($$result, "Layout", $$Main, { "content": $$content }, { "default": () => render`<p>This is yet another a tutorial.</p>` })}`;
});

var _page7 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  metadata: metadata$3,
  frontmatter: frontmatter$3,
  $$metadata: $$metadata$5,
  'default': $$02HelloNext
}, Symbol.toStringTag, { value: 'Module' }));

const metadata$2 = { "headers": [], "source": "\nThis is a tutorial on why to learn programming.\n", "html": "<p>This is a tutorial on why to learn programming.</p>" };
const frontmatter$2 = { "title": "Hello, aspiring developer!", "publishDate": "25 May 2021", "name": "Nick Manning", "value": 128, "description": "Welcome!", "duration": "quick read", "astro": { "headers": [], "source": "\nThis is a tutorial on why to learn programming.\n", "html": "<p>This is a tutorial on why to learn programming.</p>" } };
const $$metadata$4 = createMetadata("/src/pages/noskills/01-hello.md", { modules: [{ module: $$module1$1, specifier: "/src/layouts/Main.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$4 = createAstro("/src/pages/noskills/01-hello.md", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$01Hello$2 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$01Hello$2;
  const $$content = { "title": "Hello, aspiring developer!", "publishDate": "25 May 2021", "name": "Nick Manning", "value": 128, "description": "Welcome!", "duration": "quick read", "astro": { "headers": [], "source": "\nThis is a tutorial on why to learn programming.\n", "html": "<p>This is a tutorial on why to learn programming.</p>" } };
  return render`${renderComponent($$result, "Layout", $$Main, { "content": $$content }, { "default": () => render`<p>This is a tutorial on why to learn programming.</p>` })}`;
});

var _page8 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  metadata: metadata$2,
  frontmatter: frontmatter$2,
  $$metadata: $$metadata$4,
  'default': $$01Hello$2
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$3 = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/pages/webdev/index.astro", { modules: [{ module: $$module1$1, specifier: "../../layouts/Main.astro", assert: {} }, { module: $$module2, specifier: "../../components/PathList.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$3 = createAstro("/@fs/Users/seenickcode/code/devjourney/src/pages/webdev/index.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$Index$1 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$Index$1;
  const listItems = [];
  const posts = await Astro2.glob({ "./01-hello.md": () => import('./chunks/chunk.a34cab35.mjs'),}, () => `./*.md`);
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`${renderComponent($$result, "Layout", $$Main, { "class": "astro-CD7NI7L4" }, { "default": () => render`<div class="centered-container astro-CD7NI7L4">
		<section class="astro-CD7NI7L4">
			${renderComponent($$result, "PathList", $$PathList, { "listItems": listItems, "posts": posts, "class": "astro-CD7NI7L4" })}
		</section>		
	</div>` })}

`;
});

const $$file$1 = "/Users/seenickcode/code/devjourney/src/pages/webdev/index.astro";
const $$url$1 = "/webdev";

var _page9 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$3,
  'default': $$Index$1,
  file: $$file$1,
  url: $$url$1
}, Symbol.toStringTag, { value: 'Module' }));

const metadata$1 = { "headers": [], "source": "\nThis is a tutorial on why to learn webdev.\n", "html": "<p>This is a tutorial on why to learn webdev.</p>" };
const frontmatter$1 = { "title": "Hello, aspiring web developer!", "publishDate": "25 May 2021", "name": "Nick Manning", "value": 128, "description": "Welcome to the webdev journey!", "duration": "quick read", "astro": { "headers": [], "source": "\nThis is a tutorial on why to learn webdev.\n", "html": "<p>This is a tutorial on why to learn webdev.</p>" } };
const $$metadata$2 = createMetadata("/src/pages/webdev/01-hello.md", { modules: [{ module: $$module1$1, specifier: "../../layouts/Main.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$2 = createAstro("/src/pages/webdev/01-hello.md", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$01Hello$1 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$01Hello$1;
  const $$content = { "title": "Hello, aspiring web developer!", "publishDate": "25 May 2021", "name": "Nick Manning", "value": 128, "description": "Welcome to the webdev journey!", "duration": "quick read", "astro": { "headers": [], "source": "\nThis is a tutorial on why to learn webdev.\n", "html": "<p>This is a tutorial on why to learn webdev.</p>" } };
  return render`${renderComponent($$result, "Layout", $$Main, { "content": $$content }, { "default": () => render`<p>This is a tutorial on why to learn webdev.</p>` })}`;
});

var _page10 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  metadata: metadata$1,
  frontmatter: frontmatter$1,
  $$metadata: $$metadata$2,
  'default': $$01Hello$1
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$1 = createMetadata("/@fs/Users/seenickcode/code/devjourney/src/pages/webdev/css/index.astro", { modules: [{ module: $$module1$1, specifier: "../../../layouts/Main.astro", assert: {} }, { module: $$module2, specifier: "../../../components/PathList.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$1 = createAstro("/@fs/Users/seenickcode/code/devjourney/src/pages/webdev/css/index.astro", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Index;
  const listItems = [];
  const posts = await Astro2.glob({ "./01-hello.md": () => import('./chunks/chunk.ef78715a.mjs'),}, () => `./*.md`);
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return render`${renderComponent($$result, "Layout", $$Main, { "class": "astro-H4PYPBGE" }, { "default": () => render`<div class="centered-container astro-H4PYPBGE">
		<section class="astro-H4PYPBGE">
			${renderComponent($$result, "PathList", $$PathList, { "listItems": listItems, "posts": posts, "class": "astro-H4PYPBGE" })}
		</section>		
	</div>` })}

`;
});

const $$file = "/Users/seenickcode/code/devjourney/src/pages/webdev/css/index.astro";
const $$url = "/webdev/css";

var _page11 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$1,
  'default': $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const metadata = { "headers": [], "source": "\nThis is a tutorial on why to learn CSS.\n", "html": "<p>This is a tutorial on why to learn CSS.</p>" };
const frontmatter = { "title": "Hello, aspiring CSS developer!", "publishDate": "25 May 2021", "name": "Nick Manning", "value": 128, "description": "Welcome to the CSS journey!", "duration": "quick read", "astro": { "headers": [], "source": "\nThis is a tutorial on why to learn CSS.\n", "html": "<p>This is a tutorial on why to learn CSS.</p>" } };
const $$metadata = createMetadata("/src/pages/webdev/css/01-hello.md", { modules: [{ module: $$module1$1, specifier: "../../../layouts/Main.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro = createAstro("/src/pages/webdev/css/01-hello.md", "https://astro.build", "file:///Users/seenickcode/code/devjourney/");
const $$01Hello = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$01Hello;
  const $$content = { "title": "Hello, aspiring CSS developer!", "publishDate": "25 May 2021", "name": "Nick Manning", "value": 128, "description": "Welcome to the CSS journey!", "duration": "quick read", "astro": { "headers": [], "source": "\nThis is a tutorial on why to learn CSS.\n", "html": "<p>This is a tutorial on why to learn CSS.</p>" } };
  return render`${renderComponent($$result, "Layout", $$Main, { "content": $$content }, { "default": () => render`<p>This is a tutorial on why to learn CSS.</p>` })}`;
});

var _page12 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  metadata: metadata,
  frontmatter: frontmatter,
  $$metadata: $$metadata,
  'default': $$01Hello
}, Symbol.toStringTag, { value: 'Module' }));

const pageMap = new Map([['src/pages/index.astro', _page0],['src/pages/advancedflutter/index.astro', _page1],['src/pages/advancedflutter/01-hello.md', _page2],['src/pages/basicflutter/index.astro', _page3],['src/pages/basicflutter/02-scoped-model.md', _page4],['src/pages/basicflutter/01-hello.md', _page5],['src/pages/noskills/index.astro', _page6],['src/pages/noskills/02-hello-next.md', _page7],['src/pages/noskills/01-hello.md', _page8],['src/pages/webdev/index.astro', _page9],['src/pages/webdev/01-hello.md', _page10],['src/pages/webdev/css/index.astro', _page11],['src/pages/webdev/css/01-hello.md', _page12],]);
const renderers = [];

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

/**
 * @param typeMap [Object] Map of MIME type -> Array[extensions]
 * @param ...
 */
function Mime$1() {
  this._types = Object.create(null);
  this._extensions = Object.create(null);

  for (let i = 0; i < arguments.length; i++) {
    this.define(arguments[i]);
  }

  this.define = this.define.bind(this);
  this.getType = this.getType.bind(this);
  this.getExtension = this.getExtension.bind(this);
}

/**
 * Define mimetype -> extension mappings.  Each key is a mime-type that maps
 * to an array of extensions associated with the type.  The first extension is
 * used as the default extension for the type.
 *
 * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
 *
 * If a type declares an extension that has already been defined, an error will
 * be thrown.  To suppress this error and force the extension to be associated
 * with the new type, pass `force`=true.  Alternatively, you may prefix the
 * extension with "*" to map the type to extension, without mapping the
 * extension to the type.
 *
 * e.g. mime.define({'audio/wav', ['wav']}, {'audio/x-wav', ['*wav']});
 *
 *
 * @param map (Object) type definitions
 * @param force (Boolean) if true, force overriding of existing definitions
 */
Mime$1.prototype.define = function(typeMap, force) {
  for (let type in typeMap) {
    let extensions = typeMap[type].map(function(t) {
      return t.toLowerCase();
    });
    type = type.toLowerCase();

    for (let i = 0; i < extensions.length; i++) {
      const ext = extensions[i];

      // '*' prefix = not the preferred type for this extension.  So fixup the
      // extension, and skip it.
      if (ext[0] === '*') {
        continue;
      }

      if (!force && (ext in this._types)) {
        throw new Error(
          'Attempt to change mapping for "' + ext +
          '" extension from "' + this._types[ext] + '" to "' + type +
          '". Pass `force=true` to allow this, otherwise remove "' + ext +
          '" from the list of extensions for "' + type + '".'
        );
      }

      this._types[ext] = type;
    }

    // Use first extension as default
    if (force || !this._extensions[type]) {
      const ext = extensions[0];
      this._extensions[type] = (ext[0] !== '*') ? ext : ext.substr(1);
    }
  }
};

/**
 * Lookup a mime type based on extension
 */
Mime$1.prototype.getType = function(path) {
  path = String(path);
  let last = path.replace(/^.*[/\\]/, '').toLowerCase();
  let ext = last.replace(/^.*\./, '').toLowerCase();

  let hasPath = last.length < path.length;
  let hasDot = ext.length < last.length - 1;

  return (hasDot || !hasPath) && this._types[ext] || null;
};

/**
 * Return file extension associated with a mime type
 */
Mime$1.prototype.getExtension = function(type) {
  type = /^\s*([^;\s]*)/.test(type) && RegExp.$1;
  return type && this._extensions[type.toLowerCase()] || null;
};

var Mime_1 = Mime$1;

var standard = {"application/andrew-inset":["ez"],"application/applixware":["aw"],"application/atom+xml":["atom"],"application/atomcat+xml":["atomcat"],"application/atomdeleted+xml":["atomdeleted"],"application/atomsvc+xml":["atomsvc"],"application/atsc-dwd+xml":["dwd"],"application/atsc-held+xml":["held"],"application/atsc-rsat+xml":["rsat"],"application/bdoc":["bdoc"],"application/calendar+xml":["xcs"],"application/ccxml+xml":["ccxml"],"application/cdfx+xml":["cdfx"],"application/cdmi-capability":["cdmia"],"application/cdmi-container":["cdmic"],"application/cdmi-domain":["cdmid"],"application/cdmi-object":["cdmio"],"application/cdmi-queue":["cdmiq"],"application/cu-seeme":["cu"],"application/dash+xml":["mpd"],"application/davmount+xml":["davmount"],"application/docbook+xml":["dbk"],"application/dssc+der":["dssc"],"application/dssc+xml":["xdssc"],"application/ecmascript":["es","ecma"],"application/emma+xml":["emma"],"application/emotionml+xml":["emotionml"],"application/epub+zip":["epub"],"application/exi":["exi"],"application/express":["exp"],"application/fdt+xml":["fdt"],"application/font-tdpfr":["pfr"],"application/geo+json":["geojson"],"application/gml+xml":["gml"],"application/gpx+xml":["gpx"],"application/gxf":["gxf"],"application/gzip":["gz"],"application/hjson":["hjson"],"application/hyperstudio":["stk"],"application/inkml+xml":["ink","inkml"],"application/ipfix":["ipfix"],"application/its+xml":["its"],"application/java-archive":["jar","war","ear"],"application/java-serialized-object":["ser"],"application/java-vm":["class"],"application/javascript":["js","mjs"],"application/json":["json","map"],"application/json5":["json5"],"application/jsonml+json":["jsonml"],"application/ld+json":["jsonld"],"application/lgr+xml":["lgr"],"application/lost+xml":["lostxml"],"application/mac-binhex40":["hqx"],"application/mac-compactpro":["cpt"],"application/mads+xml":["mads"],"application/manifest+json":["webmanifest"],"application/marc":["mrc"],"application/marcxml+xml":["mrcx"],"application/mathematica":["ma","nb","mb"],"application/mathml+xml":["mathml"],"application/mbox":["mbox"],"application/mediaservercontrol+xml":["mscml"],"application/metalink+xml":["metalink"],"application/metalink4+xml":["meta4"],"application/mets+xml":["mets"],"application/mmt-aei+xml":["maei"],"application/mmt-usd+xml":["musd"],"application/mods+xml":["mods"],"application/mp21":["m21","mp21"],"application/mp4":["mp4s","m4p"],"application/msword":["doc","dot"],"application/mxf":["mxf"],"application/n-quads":["nq"],"application/n-triples":["nt"],"application/node":["cjs"],"application/octet-stream":["bin","dms","lrf","mar","so","dist","distz","pkg","bpk","dump","elc","deploy","exe","dll","deb","dmg","iso","img","msi","msp","msm","buffer"],"application/oda":["oda"],"application/oebps-package+xml":["opf"],"application/ogg":["ogx"],"application/omdoc+xml":["omdoc"],"application/onenote":["onetoc","onetoc2","onetmp","onepkg"],"application/oxps":["oxps"],"application/p2p-overlay+xml":["relo"],"application/patch-ops-error+xml":["xer"],"application/pdf":["pdf"],"application/pgp-encrypted":["pgp"],"application/pgp-signature":["asc","sig"],"application/pics-rules":["prf"],"application/pkcs10":["p10"],"application/pkcs7-mime":["p7m","p7c"],"application/pkcs7-signature":["p7s"],"application/pkcs8":["p8"],"application/pkix-attr-cert":["ac"],"application/pkix-cert":["cer"],"application/pkix-crl":["crl"],"application/pkix-pkipath":["pkipath"],"application/pkixcmp":["pki"],"application/pls+xml":["pls"],"application/postscript":["ai","eps","ps"],"application/provenance+xml":["provx"],"application/pskc+xml":["pskcxml"],"application/raml+yaml":["raml"],"application/rdf+xml":["rdf","owl"],"application/reginfo+xml":["rif"],"application/relax-ng-compact-syntax":["rnc"],"application/resource-lists+xml":["rl"],"application/resource-lists-diff+xml":["rld"],"application/rls-services+xml":["rs"],"application/route-apd+xml":["rapd"],"application/route-s-tsid+xml":["sls"],"application/route-usd+xml":["rusd"],"application/rpki-ghostbusters":["gbr"],"application/rpki-manifest":["mft"],"application/rpki-roa":["roa"],"application/rsd+xml":["rsd"],"application/rss+xml":["rss"],"application/rtf":["rtf"],"application/sbml+xml":["sbml"],"application/scvp-cv-request":["scq"],"application/scvp-cv-response":["scs"],"application/scvp-vp-request":["spq"],"application/scvp-vp-response":["spp"],"application/sdp":["sdp"],"application/senml+xml":["senmlx"],"application/sensml+xml":["sensmlx"],"application/set-payment-initiation":["setpay"],"application/set-registration-initiation":["setreg"],"application/shf+xml":["shf"],"application/sieve":["siv","sieve"],"application/smil+xml":["smi","smil"],"application/sparql-query":["rq"],"application/sparql-results+xml":["srx"],"application/srgs":["gram"],"application/srgs+xml":["grxml"],"application/sru+xml":["sru"],"application/ssdl+xml":["ssdl"],"application/ssml+xml":["ssml"],"application/swid+xml":["swidtag"],"application/tei+xml":["tei","teicorpus"],"application/thraud+xml":["tfi"],"application/timestamped-data":["tsd"],"application/toml":["toml"],"application/trig":["trig"],"application/ttml+xml":["ttml"],"application/ubjson":["ubj"],"application/urc-ressheet+xml":["rsheet"],"application/urc-targetdesc+xml":["td"],"application/voicexml+xml":["vxml"],"application/wasm":["wasm"],"application/widget":["wgt"],"application/winhlp":["hlp"],"application/wsdl+xml":["wsdl"],"application/wspolicy+xml":["wspolicy"],"application/xaml+xml":["xaml"],"application/xcap-att+xml":["xav"],"application/xcap-caps+xml":["xca"],"application/xcap-diff+xml":["xdf"],"application/xcap-el+xml":["xel"],"application/xcap-ns+xml":["xns"],"application/xenc+xml":["xenc"],"application/xhtml+xml":["xhtml","xht"],"application/xliff+xml":["xlf"],"application/xml":["xml","xsl","xsd","rng"],"application/xml-dtd":["dtd"],"application/xop+xml":["xop"],"application/xproc+xml":["xpl"],"application/xslt+xml":["*xsl","xslt"],"application/xspf+xml":["xspf"],"application/xv+xml":["mxml","xhvml","xvml","xvm"],"application/yang":["yang"],"application/yin+xml":["yin"],"application/zip":["zip"],"audio/3gpp":["*3gpp"],"audio/adpcm":["adp"],"audio/amr":["amr"],"audio/basic":["au","snd"],"audio/midi":["mid","midi","kar","rmi"],"audio/mobile-xmf":["mxmf"],"audio/mp3":["*mp3"],"audio/mp4":["m4a","mp4a"],"audio/mpeg":["mpga","mp2","mp2a","mp3","m2a","m3a"],"audio/ogg":["oga","ogg","spx","opus"],"audio/s3m":["s3m"],"audio/silk":["sil"],"audio/wav":["wav"],"audio/wave":["*wav"],"audio/webm":["weba"],"audio/xm":["xm"],"font/collection":["ttc"],"font/otf":["otf"],"font/ttf":["ttf"],"font/woff":["woff"],"font/woff2":["woff2"],"image/aces":["exr"],"image/apng":["apng"],"image/avif":["avif"],"image/bmp":["bmp"],"image/cgm":["cgm"],"image/dicom-rle":["drle"],"image/emf":["emf"],"image/fits":["fits"],"image/g3fax":["g3"],"image/gif":["gif"],"image/heic":["heic"],"image/heic-sequence":["heics"],"image/heif":["heif"],"image/heif-sequence":["heifs"],"image/hej2k":["hej2"],"image/hsj2":["hsj2"],"image/ief":["ief"],"image/jls":["jls"],"image/jp2":["jp2","jpg2"],"image/jpeg":["jpeg","jpg","jpe"],"image/jph":["jph"],"image/jphc":["jhc"],"image/jpm":["jpm"],"image/jpx":["jpx","jpf"],"image/jxr":["jxr"],"image/jxra":["jxra"],"image/jxrs":["jxrs"],"image/jxs":["jxs"],"image/jxsc":["jxsc"],"image/jxsi":["jxsi"],"image/jxss":["jxss"],"image/ktx":["ktx"],"image/ktx2":["ktx2"],"image/png":["png"],"image/sgi":["sgi"],"image/svg+xml":["svg","svgz"],"image/t38":["t38"],"image/tiff":["tif","tiff"],"image/tiff-fx":["tfx"],"image/webp":["webp"],"image/wmf":["wmf"],"message/disposition-notification":["disposition-notification"],"message/global":["u8msg"],"message/global-delivery-status":["u8dsn"],"message/global-disposition-notification":["u8mdn"],"message/global-headers":["u8hdr"],"message/rfc822":["eml","mime"],"model/3mf":["3mf"],"model/gltf+json":["gltf"],"model/gltf-binary":["glb"],"model/iges":["igs","iges"],"model/mesh":["msh","mesh","silo"],"model/mtl":["mtl"],"model/obj":["obj"],"model/step+xml":["stpx"],"model/step+zip":["stpz"],"model/step-xml+zip":["stpxz"],"model/stl":["stl"],"model/vrml":["wrl","vrml"],"model/x3d+binary":["*x3db","x3dbz"],"model/x3d+fastinfoset":["x3db"],"model/x3d+vrml":["*x3dv","x3dvz"],"model/x3d+xml":["x3d","x3dz"],"model/x3d-vrml":["x3dv"],"text/cache-manifest":["appcache","manifest"],"text/calendar":["ics","ifb"],"text/coffeescript":["coffee","litcoffee"],"text/css":["css"],"text/csv":["csv"],"text/html":["html","htm","shtml"],"text/jade":["jade"],"text/jsx":["jsx"],"text/less":["less"],"text/markdown":["markdown","md"],"text/mathml":["mml"],"text/mdx":["mdx"],"text/n3":["n3"],"text/plain":["txt","text","conf","def","list","log","in","ini"],"text/richtext":["rtx"],"text/rtf":["*rtf"],"text/sgml":["sgml","sgm"],"text/shex":["shex"],"text/slim":["slim","slm"],"text/spdx":["spdx"],"text/stylus":["stylus","styl"],"text/tab-separated-values":["tsv"],"text/troff":["t","tr","roff","man","me","ms"],"text/turtle":["ttl"],"text/uri-list":["uri","uris","urls"],"text/vcard":["vcard"],"text/vtt":["vtt"],"text/xml":["*xml"],"text/yaml":["yaml","yml"],"video/3gpp":["3gp","3gpp"],"video/3gpp2":["3g2"],"video/h261":["h261"],"video/h263":["h263"],"video/h264":["h264"],"video/iso.segment":["m4s"],"video/jpeg":["jpgv"],"video/jpm":["*jpm","jpgm"],"video/mj2":["mj2","mjp2"],"video/mp2t":["ts"],"video/mp4":["mp4","mp4v","mpg4"],"video/mpeg":["mpeg","mpg","mpe","m1v","m2v"],"video/ogg":["ogv"],"video/quicktime":["qt","mov"],"video/webm":["webm"]};

var other = {"application/prs.cww":["cww"],"application/vnd.1000minds.decision-model+xml":["1km"],"application/vnd.3gpp.pic-bw-large":["plb"],"application/vnd.3gpp.pic-bw-small":["psb"],"application/vnd.3gpp.pic-bw-var":["pvb"],"application/vnd.3gpp2.tcap":["tcap"],"application/vnd.3m.post-it-notes":["pwn"],"application/vnd.accpac.simply.aso":["aso"],"application/vnd.accpac.simply.imp":["imp"],"application/vnd.acucobol":["acu"],"application/vnd.acucorp":["atc","acutc"],"application/vnd.adobe.air-application-installer-package+zip":["air"],"application/vnd.adobe.formscentral.fcdt":["fcdt"],"application/vnd.adobe.fxp":["fxp","fxpl"],"application/vnd.adobe.xdp+xml":["xdp"],"application/vnd.adobe.xfdf":["xfdf"],"application/vnd.ahead.space":["ahead"],"application/vnd.airzip.filesecure.azf":["azf"],"application/vnd.airzip.filesecure.azs":["azs"],"application/vnd.amazon.ebook":["azw"],"application/vnd.americandynamics.acc":["acc"],"application/vnd.amiga.ami":["ami"],"application/vnd.android.package-archive":["apk"],"application/vnd.anser-web-certificate-issue-initiation":["cii"],"application/vnd.anser-web-funds-transfer-initiation":["fti"],"application/vnd.antix.game-component":["atx"],"application/vnd.apple.installer+xml":["mpkg"],"application/vnd.apple.keynote":["key"],"application/vnd.apple.mpegurl":["m3u8"],"application/vnd.apple.numbers":["numbers"],"application/vnd.apple.pages":["pages"],"application/vnd.apple.pkpass":["pkpass"],"application/vnd.aristanetworks.swi":["swi"],"application/vnd.astraea-software.iota":["iota"],"application/vnd.audiograph":["aep"],"application/vnd.balsamiq.bmml+xml":["bmml"],"application/vnd.blueice.multipass":["mpm"],"application/vnd.bmi":["bmi"],"application/vnd.businessobjects":["rep"],"application/vnd.chemdraw+xml":["cdxml"],"application/vnd.chipnuts.karaoke-mmd":["mmd"],"application/vnd.cinderella":["cdy"],"application/vnd.citationstyles.style+xml":["csl"],"application/vnd.claymore":["cla"],"application/vnd.cloanto.rp9":["rp9"],"application/vnd.clonk.c4group":["c4g","c4d","c4f","c4p","c4u"],"application/vnd.cluetrust.cartomobile-config":["c11amc"],"application/vnd.cluetrust.cartomobile-config-pkg":["c11amz"],"application/vnd.commonspace":["csp"],"application/vnd.contact.cmsg":["cdbcmsg"],"application/vnd.cosmocaller":["cmc"],"application/vnd.crick.clicker":["clkx"],"application/vnd.crick.clicker.keyboard":["clkk"],"application/vnd.crick.clicker.palette":["clkp"],"application/vnd.crick.clicker.template":["clkt"],"application/vnd.crick.clicker.wordbank":["clkw"],"application/vnd.criticaltools.wbs+xml":["wbs"],"application/vnd.ctc-posml":["pml"],"application/vnd.cups-ppd":["ppd"],"application/vnd.curl.car":["car"],"application/vnd.curl.pcurl":["pcurl"],"application/vnd.dart":["dart"],"application/vnd.data-vision.rdz":["rdz"],"application/vnd.dbf":["dbf"],"application/vnd.dece.data":["uvf","uvvf","uvd","uvvd"],"application/vnd.dece.ttml+xml":["uvt","uvvt"],"application/vnd.dece.unspecified":["uvx","uvvx"],"application/vnd.dece.zip":["uvz","uvvz"],"application/vnd.denovo.fcselayout-link":["fe_launch"],"application/vnd.dna":["dna"],"application/vnd.dolby.mlp":["mlp"],"application/vnd.dpgraph":["dpg"],"application/vnd.dreamfactory":["dfac"],"application/vnd.ds-keypoint":["kpxx"],"application/vnd.dvb.ait":["ait"],"application/vnd.dvb.service":["svc"],"application/vnd.dynageo":["geo"],"application/vnd.ecowin.chart":["mag"],"application/vnd.enliven":["nml"],"application/vnd.epson.esf":["esf"],"application/vnd.epson.msf":["msf"],"application/vnd.epson.quickanime":["qam"],"application/vnd.epson.salt":["slt"],"application/vnd.epson.ssf":["ssf"],"application/vnd.eszigno3+xml":["es3","et3"],"application/vnd.ezpix-album":["ez2"],"application/vnd.ezpix-package":["ez3"],"application/vnd.fdf":["fdf"],"application/vnd.fdsn.mseed":["mseed"],"application/vnd.fdsn.seed":["seed","dataless"],"application/vnd.flographit":["gph"],"application/vnd.fluxtime.clip":["ftc"],"application/vnd.framemaker":["fm","frame","maker","book"],"application/vnd.frogans.fnc":["fnc"],"application/vnd.frogans.ltf":["ltf"],"application/vnd.fsc.weblaunch":["fsc"],"application/vnd.fujitsu.oasys":["oas"],"application/vnd.fujitsu.oasys2":["oa2"],"application/vnd.fujitsu.oasys3":["oa3"],"application/vnd.fujitsu.oasysgp":["fg5"],"application/vnd.fujitsu.oasysprs":["bh2"],"application/vnd.fujixerox.ddd":["ddd"],"application/vnd.fujixerox.docuworks":["xdw"],"application/vnd.fujixerox.docuworks.binder":["xbd"],"application/vnd.fuzzysheet":["fzs"],"application/vnd.genomatix.tuxedo":["txd"],"application/vnd.geogebra.file":["ggb"],"application/vnd.geogebra.tool":["ggt"],"application/vnd.geometry-explorer":["gex","gre"],"application/vnd.geonext":["gxt"],"application/vnd.geoplan":["g2w"],"application/vnd.geospace":["g3w"],"application/vnd.gmx":["gmx"],"application/vnd.google-apps.document":["gdoc"],"application/vnd.google-apps.presentation":["gslides"],"application/vnd.google-apps.spreadsheet":["gsheet"],"application/vnd.google-earth.kml+xml":["kml"],"application/vnd.google-earth.kmz":["kmz"],"application/vnd.grafeq":["gqf","gqs"],"application/vnd.groove-account":["gac"],"application/vnd.groove-help":["ghf"],"application/vnd.groove-identity-message":["gim"],"application/vnd.groove-injector":["grv"],"application/vnd.groove-tool-message":["gtm"],"application/vnd.groove-tool-template":["tpl"],"application/vnd.groove-vcard":["vcg"],"application/vnd.hal+xml":["hal"],"application/vnd.handheld-entertainment+xml":["zmm"],"application/vnd.hbci":["hbci"],"application/vnd.hhe.lesson-player":["les"],"application/vnd.hp-hpgl":["hpgl"],"application/vnd.hp-hpid":["hpid"],"application/vnd.hp-hps":["hps"],"application/vnd.hp-jlyt":["jlt"],"application/vnd.hp-pcl":["pcl"],"application/vnd.hp-pclxl":["pclxl"],"application/vnd.hydrostatix.sof-data":["sfd-hdstx"],"application/vnd.ibm.minipay":["mpy"],"application/vnd.ibm.modcap":["afp","listafp","list3820"],"application/vnd.ibm.rights-management":["irm"],"application/vnd.ibm.secure-container":["sc"],"application/vnd.iccprofile":["icc","icm"],"application/vnd.igloader":["igl"],"application/vnd.immervision-ivp":["ivp"],"application/vnd.immervision-ivu":["ivu"],"application/vnd.insors.igm":["igm"],"application/vnd.intercon.formnet":["xpw","xpx"],"application/vnd.intergeo":["i2g"],"application/vnd.intu.qbo":["qbo"],"application/vnd.intu.qfx":["qfx"],"application/vnd.ipunplugged.rcprofile":["rcprofile"],"application/vnd.irepository.package+xml":["irp"],"application/vnd.is-xpr":["xpr"],"application/vnd.isac.fcs":["fcs"],"application/vnd.jam":["jam"],"application/vnd.jcp.javame.midlet-rms":["rms"],"application/vnd.jisp":["jisp"],"application/vnd.joost.joda-archive":["joda"],"application/vnd.kahootz":["ktz","ktr"],"application/vnd.kde.karbon":["karbon"],"application/vnd.kde.kchart":["chrt"],"application/vnd.kde.kformula":["kfo"],"application/vnd.kde.kivio":["flw"],"application/vnd.kde.kontour":["kon"],"application/vnd.kde.kpresenter":["kpr","kpt"],"application/vnd.kde.kspread":["ksp"],"application/vnd.kde.kword":["kwd","kwt"],"application/vnd.kenameaapp":["htke"],"application/vnd.kidspiration":["kia"],"application/vnd.kinar":["kne","knp"],"application/vnd.koan":["skp","skd","skt","skm"],"application/vnd.kodak-descriptor":["sse"],"application/vnd.las.las+xml":["lasxml"],"application/vnd.llamagraphics.life-balance.desktop":["lbd"],"application/vnd.llamagraphics.life-balance.exchange+xml":["lbe"],"application/vnd.lotus-1-2-3":["123"],"application/vnd.lotus-approach":["apr"],"application/vnd.lotus-freelance":["pre"],"application/vnd.lotus-notes":["nsf"],"application/vnd.lotus-organizer":["org"],"application/vnd.lotus-screencam":["scm"],"application/vnd.lotus-wordpro":["lwp"],"application/vnd.macports.portpkg":["portpkg"],"application/vnd.mapbox-vector-tile":["mvt"],"application/vnd.mcd":["mcd"],"application/vnd.medcalcdata":["mc1"],"application/vnd.mediastation.cdkey":["cdkey"],"application/vnd.mfer":["mwf"],"application/vnd.mfmp":["mfm"],"application/vnd.micrografx.flo":["flo"],"application/vnd.micrografx.igx":["igx"],"application/vnd.mif":["mif"],"application/vnd.mobius.daf":["daf"],"application/vnd.mobius.dis":["dis"],"application/vnd.mobius.mbk":["mbk"],"application/vnd.mobius.mqy":["mqy"],"application/vnd.mobius.msl":["msl"],"application/vnd.mobius.plc":["plc"],"application/vnd.mobius.txf":["txf"],"application/vnd.mophun.application":["mpn"],"application/vnd.mophun.certificate":["mpc"],"application/vnd.mozilla.xul+xml":["xul"],"application/vnd.ms-artgalry":["cil"],"application/vnd.ms-cab-compressed":["cab"],"application/vnd.ms-excel":["xls","xlm","xla","xlc","xlt","xlw"],"application/vnd.ms-excel.addin.macroenabled.12":["xlam"],"application/vnd.ms-excel.sheet.binary.macroenabled.12":["xlsb"],"application/vnd.ms-excel.sheet.macroenabled.12":["xlsm"],"application/vnd.ms-excel.template.macroenabled.12":["xltm"],"application/vnd.ms-fontobject":["eot"],"application/vnd.ms-htmlhelp":["chm"],"application/vnd.ms-ims":["ims"],"application/vnd.ms-lrm":["lrm"],"application/vnd.ms-officetheme":["thmx"],"application/vnd.ms-outlook":["msg"],"application/vnd.ms-pki.seccat":["cat"],"application/vnd.ms-pki.stl":["*stl"],"application/vnd.ms-powerpoint":["ppt","pps","pot"],"application/vnd.ms-powerpoint.addin.macroenabled.12":["ppam"],"application/vnd.ms-powerpoint.presentation.macroenabled.12":["pptm"],"application/vnd.ms-powerpoint.slide.macroenabled.12":["sldm"],"application/vnd.ms-powerpoint.slideshow.macroenabled.12":["ppsm"],"application/vnd.ms-powerpoint.template.macroenabled.12":["potm"],"application/vnd.ms-project":["mpp","mpt"],"application/vnd.ms-word.document.macroenabled.12":["docm"],"application/vnd.ms-word.template.macroenabled.12":["dotm"],"application/vnd.ms-works":["wps","wks","wcm","wdb"],"application/vnd.ms-wpl":["wpl"],"application/vnd.ms-xpsdocument":["xps"],"application/vnd.mseq":["mseq"],"application/vnd.musician":["mus"],"application/vnd.muvee.style":["msty"],"application/vnd.mynfc":["taglet"],"application/vnd.neurolanguage.nlu":["nlu"],"application/vnd.nitf":["ntf","nitf"],"application/vnd.noblenet-directory":["nnd"],"application/vnd.noblenet-sealer":["nns"],"application/vnd.noblenet-web":["nnw"],"application/vnd.nokia.n-gage.ac+xml":["*ac"],"application/vnd.nokia.n-gage.data":["ngdat"],"application/vnd.nokia.n-gage.symbian.install":["n-gage"],"application/vnd.nokia.radio-preset":["rpst"],"application/vnd.nokia.radio-presets":["rpss"],"application/vnd.novadigm.edm":["edm"],"application/vnd.novadigm.edx":["edx"],"application/vnd.novadigm.ext":["ext"],"application/vnd.oasis.opendocument.chart":["odc"],"application/vnd.oasis.opendocument.chart-template":["otc"],"application/vnd.oasis.opendocument.database":["odb"],"application/vnd.oasis.opendocument.formula":["odf"],"application/vnd.oasis.opendocument.formula-template":["odft"],"application/vnd.oasis.opendocument.graphics":["odg"],"application/vnd.oasis.opendocument.graphics-template":["otg"],"application/vnd.oasis.opendocument.image":["odi"],"application/vnd.oasis.opendocument.image-template":["oti"],"application/vnd.oasis.opendocument.presentation":["odp"],"application/vnd.oasis.opendocument.presentation-template":["otp"],"application/vnd.oasis.opendocument.spreadsheet":["ods"],"application/vnd.oasis.opendocument.spreadsheet-template":["ots"],"application/vnd.oasis.opendocument.text":["odt"],"application/vnd.oasis.opendocument.text-master":["odm"],"application/vnd.oasis.opendocument.text-template":["ott"],"application/vnd.oasis.opendocument.text-web":["oth"],"application/vnd.olpc-sugar":["xo"],"application/vnd.oma.dd2+xml":["dd2"],"application/vnd.openblox.game+xml":["obgx"],"application/vnd.openofficeorg.extension":["oxt"],"application/vnd.openstreetmap.data+xml":["osm"],"application/vnd.openxmlformats-officedocument.presentationml.presentation":["pptx"],"application/vnd.openxmlformats-officedocument.presentationml.slide":["sldx"],"application/vnd.openxmlformats-officedocument.presentationml.slideshow":["ppsx"],"application/vnd.openxmlformats-officedocument.presentationml.template":["potx"],"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":["xlsx"],"application/vnd.openxmlformats-officedocument.spreadsheetml.template":["xltx"],"application/vnd.openxmlformats-officedocument.wordprocessingml.document":["docx"],"application/vnd.openxmlformats-officedocument.wordprocessingml.template":["dotx"],"application/vnd.osgeo.mapguide.package":["mgp"],"application/vnd.osgi.dp":["dp"],"application/vnd.osgi.subsystem":["esa"],"application/vnd.palm":["pdb","pqa","oprc"],"application/vnd.pawaafile":["paw"],"application/vnd.pg.format":["str"],"application/vnd.pg.osasli":["ei6"],"application/vnd.picsel":["efif"],"application/vnd.pmi.widget":["wg"],"application/vnd.pocketlearn":["plf"],"application/vnd.powerbuilder6":["pbd"],"application/vnd.previewsystems.box":["box"],"application/vnd.proteus.magazine":["mgz"],"application/vnd.publishare-delta-tree":["qps"],"application/vnd.pvi.ptid1":["ptid"],"application/vnd.quark.quarkxpress":["qxd","qxt","qwd","qwt","qxl","qxb"],"application/vnd.rar":["rar"],"application/vnd.realvnc.bed":["bed"],"application/vnd.recordare.musicxml":["mxl"],"application/vnd.recordare.musicxml+xml":["musicxml"],"application/vnd.rig.cryptonote":["cryptonote"],"application/vnd.rim.cod":["cod"],"application/vnd.rn-realmedia":["rm"],"application/vnd.rn-realmedia-vbr":["rmvb"],"application/vnd.route66.link66+xml":["link66"],"application/vnd.sailingtracker.track":["st"],"application/vnd.seemail":["see"],"application/vnd.sema":["sema"],"application/vnd.semd":["semd"],"application/vnd.semf":["semf"],"application/vnd.shana.informed.formdata":["ifm"],"application/vnd.shana.informed.formtemplate":["itp"],"application/vnd.shana.informed.interchange":["iif"],"application/vnd.shana.informed.package":["ipk"],"application/vnd.simtech-mindmapper":["twd","twds"],"application/vnd.smaf":["mmf"],"application/vnd.smart.teacher":["teacher"],"application/vnd.software602.filler.form+xml":["fo"],"application/vnd.solent.sdkm+xml":["sdkm","sdkd"],"application/vnd.spotfire.dxp":["dxp"],"application/vnd.spotfire.sfs":["sfs"],"application/vnd.stardivision.calc":["sdc"],"application/vnd.stardivision.draw":["sda"],"application/vnd.stardivision.impress":["sdd"],"application/vnd.stardivision.math":["smf"],"application/vnd.stardivision.writer":["sdw","vor"],"application/vnd.stardivision.writer-global":["sgl"],"application/vnd.stepmania.package":["smzip"],"application/vnd.stepmania.stepchart":["sm"],"application/vnd.sun.wadl+xml":["wadl"],"application/vnd.sun.xml.calc":["sxc"],"application/vnd.sun.xml.calc.template":["stc"],"application/vnd.sun.xml.draw":["sxd"],"application/vnd.sun.xml.draw.template":["std"],"application/vnd.sun.xml.impress":["sxi"],"application/vnd.sun.xml.impress.template":["sti"],"application/vnd.sun.xml.math":["sxm"],"application/vnd.sun.xml.writer":["sxw"],"application/vnd.sun.xml.writer.global":["sxg"],"application/vnd.sun.xml.writer.template":["stw"],"application/vnd.sus-calendar":["sus","susp"],"application/vnd.svd":["svd"],"application/vnd.symbian.install":["sis","sisx"],"application/vnd.syncml+xml":["xsm"],"application/vnd.syncml.dm+wbxml":["bdm"],"application/vnd.syncml.dm+xml":["xdm"],"application/vnd.syncml.dmddf+xml":["ddf"],"application/vnd.tao.intent-module-archive":["tao"],"application/vnd.tcpdump.pcap":["pcap","cap","dmp"],"application/vnd.tmobile-livetv":["tmo"],"application/vnd.trid.tpt":["tpt"],"application/vnd.triscape.mxs":["mxs"],"application/vnd.trueapp":["tra"],"application/vnd.ufdl":["ufd","ufdl"],"application/vnd.uiq.theme":["utz"],"application/vnd.umajin":["umj"],"application/vnd.unity":["unityweb"],"application/vnd.uoml+xml":["uoml"],"application/vnd.vcx":["vcx"],"application/vnd.visio":["vsd","vst","vss","vsw"],"application/vnd.visionary":["vis"],"application/vnd.vsf":["vsf"],"application/vnd.wap.wbxml":["wbxml"],"application/vnd.wap.wmlc":["wmlc"],"application/vnd.wap.wmlscriptc":["wmlsc"],"application/vnd.webturbo":["wtb"],"application/vnd.wolfram.player":["nbp"],"application/vnd.wordperfect":["wpd"],"application/vnd.wqd":["wqd"],"application/vnd.wt.stf":["stf"],"application/vnd.xara":["xar"],"application/vnd.xfdl":["xfdl"],"application/vnd.yamaha.hv-dic":["hvd"],"application/vnd.yamaha.hv-script":["hvs"],"application/vnd.yamaha.hv-voice":["hvp"],"application/vnd.yamaha.openscoreformat":["osf"],"application/vnd.yamaha.openscoreformat.osfpvg+xml":["osfpvg"],"application/vnd.yamaha.smaf-audio":["saf"],"application/vnd.yamaha.smaf-phrase":["spf"],"application/vnd.yellowriver-custom-menu":["cmp"],"application/vnd.zul":["zir","zirz"],"application/vnd.zzazz.deck+xml":["zaz"],"application/x-7z-compressed":["7z"],"application/x-abiword":["abw"],"application/x-ace-compressed":["ace"],"application/x-apple-diskimage":["*dmg"],"application/x-arj":["arj"],"application/x-authorware-bin":["aab","x32","u32","vox"],"application/x-authorware-map":["aam"],"application/x-authorware-seg":["aas"],"application/x-bcpio":["bcpio"],"application/x-bdoc":["*bdoc"],"application/x-bittorrent":["torrent"],"application/x-blorb":["blb","blorb"],"application/x-bzip":["bz"],"application/x-bzip2":["bz2","boz"],"application/x-cbr":["cbr","cba","cbt","cbz","cb7"],"application/x-cdlink":["vcd"],"application/x-cfs-compressed":["cfs"],"application/x-chat":["chat"],"application/x-chess-pgn":["pgn"],"application/x-chrome-extension":["crx"],"application/x-cocoa":["cco"],"application/x-conference":["nsc"],"application/x-cpio":["cpio"],"application/x-csh":["csh"],"application/x-debian-package":["*deb","udeb"],"application/x-dgc-compressed":["dgc"],"application/x-director":["dir","dcr","dxr","cst","cct","cxt","w3d","fgd","swa"],"application/x-doom":["wad"],"application/x-dtbncx+xml":["ncx"],"application/x-dtbook+xml":["dtb"],"application/x-dtbresource+xml":["res"],"application/x-dvi":["dvi"],"application/x-envoy":["evy"],"application/x-eva":["eva"],"application/x-font-bdf":["bdf"],"application/x-font-ghostscript":["gsf"],"application/x-font-linux-psf":["psf"],"application/x-font-pcf":["pcf"],"application/x-font-snf":["snf"],"application/x-font-type1":["pfa","pfb","pfm","afm"],"application/x-freearc":["arc"],"application/x-futuresplash":["spl"],"application/x-gca-compressed":["gca"],"application/x-glulx":["ulx"],"application/x-gnumeric":["gnumeric"],"application/x-gramps-xml":["gramps"],"application/x-gtar":["gtar"],"application/x-hdf":["hdf"],"application/x-httpd-php":["php"],"application/x-install-instructions":["install"],"application/x-iso9660-image":["*iso"],"application/x-iwork-keynote-sffkey":["*key"],"application/x-iwork-numbers-sffnumbers":["*numbers"],"application/x-iwork-pages-sffpages":["*pages"],"application/x-java-archive-diff":["jardiff"],"application/x-java-jnlp-file":["jnlp"],"application/x-keepass2":["kdbx"],"application/x-latex":["latex"],"application/x-lua-bytecode":["luac"],"application/x-lzh-compressed":["lzh","lha"],"application/x-makeself":["run"],"application/x-mie":["mie"],"application/x-mobipocket-ebook":["prc","mobi"],"application/x-ms-application":["application"],"application/x-ms-shortcut":["lnk"],"application/x-ms-wmd":["wmd"],"application/x-ms-wmz":["wmz"],"application/x-ms-xbap":["xbap"],"application/x-msaccess":["mdb"],"application/x-msbinder":["obd"],"application/x-mscardfile":["crd"],"application/x-msclip":["clp"],"application/x-msdos-program":["*exe"],"application/x-msdownload":["*exe","*dll","com","bat","*msi"],"application/x-msmediaview":["mvb","m13","m14"],"application/x-msmetafile":["*wmf","*wmz","*emf","emz"],"application/x-msmoney":["mny"],"application/x-mspublisher":["pub"],"application/x-msschedule":["scd"],"application/x-msterminal":["trm"],"application/x-mswrite":["wri"],"application/x-netcdf":["nc","cdf"],"application/x-ns-proxy-autoconfig":["pac"],"application/x-nzb":["nzb"],"application/x-perl":["pl","pm"],"application/x-pilot":["*prc","*pdb"],"application/x-pkcs12":["p12","pfx"],"application/x-pkcs7-certificates":["p7b","spc"],"application/x-pkcs7-certreqresp":["p7r"],"application/x-rar-compressed":["*rar"],"application/x-redhat-package-manager":["rpm"],"application/x-research-info-systems":["ris"],"application/x-sea":["sea"],"application/x-sh":["sh"],"application/x-shar":["shar"],"application/x-shockwave-flash":["swf"],"application/x-silverlight-app":["xap"],"application/x-sql":["sql"],"application/x-stuffit":["sit"],"application/x-stuffitx":["sitx"],"application/x-subrip":["srt"],"application/x-sv4cpio":["sv4cpio"],"application/x-sv4crc":["sv4crc"],"application/x-t3vm-image":["t3"],"application/x-tads":["gam"],"application/x-tar":["tar"],"application/x-tcl":["tcl","tk"],"application/x-tex":["tex"],"application/x-tex-tfm":["tfm"],"application/x-texinfo":["texinfo","texi"],"application/x-tgif":["*obj"],"application/x-ustar":["ustar"],"application/x-virtualbox-hdd":["hdd"],"application/x-virtualbox-ova":["ova"],"application/x-virtualbox-ovf":["ovf"],"application/x-virtualbox-vbox":["vbox"],"application/x-virtualbox-vbox-extpack":["vbox-extpack"],"application/x-virtualbox-vdi":["vdi"],"application/x-virtualbox-vhd":["vhd"],"application/x-virtualbox-vmdk":["vmdk"],"application/x-wais-source":["src"],"application/x-web-app-manifest+json":["webapp"],"application/x-x509-ca-cert":["der","crt","pem"],"application/x-xfig":["fig"],"application/x-xliff+xml":["*xlf"],"application/x-xpinstall":["xpi"],"application/x-xz":["xz"],"application/x-zmachine":["z1","z2","z3","z4","z5","z6","z7","z8"],"audio/vnd.dece.audio":["uva","uvva"],"audio/vnd.digital-winds":["eol"],"audio/vnd.dra":["dra"],"audio/vnd.dts":["dts"],"audio/vnd.dts.hd":["dtshd"],"audio/vnd.lucent.voice":["lvp"],"audio/vnd.ms-playready.media.pya":["pya"],"audio/vnd.nuera.ecelp4800":["ecelp4800"],"audio/vnd.nuera.ecelp7470":["ecelp7470"],"audio/vnd.nuera.ecelp9600":["ecelp9600"],"audio/vnd.rip":["rip"],"audio/x-aac":["aac"],"audio/x-aiff":["aif","aiff","aifc"],"audio/x-caf":["caf"],"audio/x-flac":["flac"],"audio/x-m4a":["*m4a"],"audio/x-matroska":["mka"],"audio/x-mpegurl":["m3u"],"audio/x-ms-wax":["wax"],"audio/x-ms-wma":["wma"],"audio/x-pn-realaudio":["ram","ra"],"audio/x-pn-realaudio-plugin":["rmp"],"audio/x-realaudio":["*ra"],"audio/x-wav":["*wav"],"chemical/x-cdx":["cdx"],"chemical/x-cif":["cif"],"chemical/x-cmdf":["cmdf"],"chemical/x-cml":["cml"],"chemical/x-csml":["csml"],"chemical/x-xyz":["xyz"],"image/prs.btif":["btif"],"image/prs.pti":["pti"],"image/vnd.adobe.photoshop":["psd"],"image/vnd.airzip.accelerator.azv":["azv"],"image/vnd.dece.graphic":["uvi","uvvi","uvg","uvvg"],"image/vnd.djvu":["djvu","djv"],"image/vnd.dvb.subtitle":["*sub"],"image/vnd.dwg":["dwg"],"image/vnd.dxf":["dxf"],"image/vnd.fastbidsheet":["fbs"],"image/vnd.fpx":["fpx"],"image/vnd.fst":["fst"],"image/vnd.fujixerox.edmics-mmr":["mmr"],"image/vnd.fujixerox.edmics-rlc":["rlc"],"image/vnd.microsoft.icon":["ico"],"image/vnd.ms-dds":["dds"],"image/vnd.ms-modi":["mdi"],"image/vnd.ms-photo":["wdp"],"image/vnd.net-fpx":["npx"],"image/vnd.pco.b16":["b16"],"image/vnd.tencent.tap":["tap"],"image/vnd.valve.source.texture":["vtf"],"image/vnd.wap.wbmp":["wbmp"],"image/vnd.xiff":["xif"],"image/vnd.zbrush.pcx":["pcx"],"image/x-3ds":["3ds"],"image/x-cmu-raster":["ras"],"image/x-cmx":["cmx"],"image/x-freehand":["fh","fhc","fh4","fh5","fh7"],"image/x-icon":["*ico"],"image/x-jng":["jng"],"image/x-mrsid-image":["sid"],"image/x-ms-bmp":["*bmp"],"image/x-pcx":["*pcx"],"image/x-pict":["pic","pct"],"image/x-portable-anymap":["pnm"],"image/x-portable-bitmap":["pbm"],"image/x-portable-graymap":["pgm"],"image/x-portable-pixmap":["ppm"],"image/x-rgb":["rgb"],"image/x-tga":["tga"],"image/x-xbitmap":["xbm"],"image/x-xpixmap":["xpm"],"image/x-xwindowdump":["xwd"],"message/vnd.wfa.wsc":["wsc"],"model/vnd.collada+xml":["dae"],"model/vnd.dwf":["dwf"],"model/vnd.gdl":["gdl"],"model/vnd.gtw":["gtw"],"model/vnd.mts":["mts"],"model/vnd.opengex":["ogex"],"model/vnd.parasolid.transmit.binary":["x_b"],"model/vnd.parasolid.transmit.text":["x_t"],"model/vnd.sap.vds":["vds"],"model/vnd.usdz+zip":["usdz"],"model/vnd.valve.source.compiled-map":["bsp"],"model/vnd.vtu":["vtu"],"text/prs.lines.tag":["dsc"],"text/vnd.curl":["curl"],"text/vnd.curl.dcurl":["dcurl"],"text/vnd.curl.mcurl":["mcurl"],"text/vnd.curl.scurl":["scurl"],"text/vnd.dvb.subtitle":["sub"],"text/vnd.fly":["fly"],"text/vnd.fmi.flexstor":["flx"],"text/vnd.graphviz":["gv"],"text/vnd.in3d.3dml":["3dml"],"text/vnd.in3d.spot":["spot"],"text/vnd.sun.j2me.app-descriptor":["jad"],"text/vnd.wap.wml":["wml"],"text/vnd.wap.wmlscript":["wmls"],"text/x-asm":["s","asm"],"text/x-c":["c","cc","cxx","cpp","h","hh","dic"],"text/x-component":["htc"],"text/x-fortran":["f","for","f77","f90"],"text/x-handlebars-template":["hbs"],"text/x-java-source":["java"],"text/x-lua":["lua"],"text/x-markdown":["mkd"],"text/x-nfo":["nfo"],"text/x-opml":["opml"],"text/x-org":["*org"],"text/x-pascal":["p","pas"],"text/x-processing":["pde"],"text/x-sass":["sass"],"text/x-scss":["scss"],"text/x-setext":["etx"],"text/x-sfv":["sfv"],"text/x-suse-ymp":["ymp"],"text/x-uuencode":["uu"],"text/x-vcalendar":["vcs"],"text/x-vcard":["vcf"],"video/vnd.dece.hd":["uvh","uvvh"],"video/vnd.dece.mobile":["uvm","uvvm"],"video/vnd.dece.pd":["uvp","uvvp"],"video/vnd.dece.sd":["uvs","uvvs"],"video/vnd.dece.video":["uvv","uvvv"],"video/vnd.dvb.file":["dvb"],"video/vnd.fvt":["fvt"],"video/vnd.mpegurl":["mxu","m4u"],"video/vnd.ms-playready.media.pyv":["pyv"],"video/vnd.uvvu.mp4":["uvu","uvvu"],"video/vnd.vivo":["viv"],"video/x-f4v":["f4v"],"video/x-fli":["fli"],"video/x-flv":["flv"],"video/x-m4v":["m4v"],"video/x-matroska":["mkv","mk3d","mks"],"video/x-mng":["mng"],"video/x-ms-asf":["asf","asx"],"video/x-ms-vob":["vob"],"video/x-ms-wm":["wm"],"video/x-ms-wmv":["wmv"],"video/x-ms-wmx":["wmx"],"video/x-ms-wvx":["wvx"],"video/x-msvideo":["avi"],"video/x-sgi-movie":["movie"],"video/x-smv":["smv"],"x-conference/x-cooltalk":["ice"]};

let Mime = Mime_1;
new Mime(standard, other);

if (typeof process !== 'undefined') {
	(process.env);
	process.stdout && process.stdout.isTTY;
}

var util$1 = {};

var types = {};

/* eslint complexity: [2, 18], max-statements: [2, 33] */
var shams$1 = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

var hasSymbols$2 = shams$1;

var shams = function hasToStringTagShams() {
	return hasSymbols$2() && !!Symbol.toStringTag;
};

var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = shams$1;

var hasSymbols$1 = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr$3 = Object.prototype.toString;
var funcType = '[object Function]';

var implementation$1 = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr$3.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

var implementation = implementation$1;

var functionBind = Function.prototype.bind || implementation;

var bind$1 = functionBind;

var src = bind$1.call(Function.call, Object.prototype.hasOwnProperty);

var undefined$1;

var $SyntaxError = SyntaxError;
var $Function = Function;
var $TypeError = TypeError;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD$1 = Object.getOwnPropertyDescriptor;
if ($gOPD$1) {
	try {
		$gOPD$1({}, '');
	} catch (e) {
		$gOPD$1 = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD$1
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD$1(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = hasSymbols$1();

var getProto$1 = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' ? undefined$1 : getProto$1(Uint8Array);

var INTRINSICS = {
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined$1 : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined$1 : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols ? getProto$1([][Symbol.iterator]()) : undefined$1,
	'%AsyncFromSyncIteratorPrototype%': undefined$1,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined$1 : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined$1 : BigInt,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined$1 : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined$1 : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined$1 : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined$1 : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined$1 : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined$1 : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined$1 : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols ? getProto$1(getProto$1([][Symbol.iterator]())) : undefined$1,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined$1,
	'%Map%': typeof Map === 'undefined' ? undefined$1 : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined$1 : getProto$1(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined$1 : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined$1 : Proxy,
	'%RangeError%': RangeError,
	'%ReferenceError%': ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined$1 : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined$1 : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined$1 : getProto$1(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined$1 : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols ? getProto$1(''[Symbol.iterator]()) : undefined$1,
	'%Symbol%': hasSymbols ? Symbol : undefined$1,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined$1 : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined$1 : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined$1 : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined$1 : Uint32Array,
	'%URIError%': URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined$1 : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined$1 : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined$1 : WeakSet
};

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen) {
			value = getProto$1(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = functionBind;
var hasOwn = src;
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

var getIntrinsic = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined$1;
			}
			if ($gOPD$1 && (i + 1) >= parts.length) {
				var desc = $gOPD$1(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};

var callBind$1 = {exports: {}};

(function (module) {

var bind = functionBind;
var GetIntrinsic = getIntrinsic;

var $apply = GetIntrinsic('%Function.prototype.apply%');
var $call = GetIntrinsic('%Function.prototype.call%');
var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);
var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
var $max = GetIntrinsic('%Math.max%');

if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = null;
	}
}

module.exports = function callBind(originalFunction) {
	var func = $reflectApply(bind, $call, arguments);
	if ($gOPD && $defineProperty) {
		var desc = $gOPD(func, 'length');
		if (desc.configurable) {
			// original length, plus the receiver, minus any additional arguments (after the receiver)
			$defineProperty(
				func,
				'length',
				{ value: 1 + $max(0, originalFunction.length - (arguments.length - 1)) }
			);
		}
	}
	return func;
};

var applyBind = function applyBind() {
	return $reflectApply(bind, $apply, arguments);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}
}(callBind$1));

var GetIntrinsic$1 = getIntrinsic;

var callBind = callBind$1.exports;

var $indexOf$1 = callBind(GetIntrinsic$1('String.prototype.indexOf'));

var callBound$3 = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic$1(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf$1(name, '.prototype.') > -1) {
		return callBind(intrinsic);
	}
	return intrinsic;
};

var hasToStringTag$4 = shams();
var callBound$2 = callBound$3;

var $toString$2 = callBound$2('Object.prototype.toString');

var isStandardArguments = function isArguments(value) {
	if (hasToStringTag$4 && value && typeof value === 'object' && Symbol.toStringTag in value) {
		return false;
	}
	return $toString$2(value) === '[object Arguments]';
};

var isLegacyArguments = function isArguments(value) {
	if (isStandardArguments(value)) {
		return true;
	}
	return value !== null &&
		typeof value === 'object' &&
		typeof value.length === 'number' &&
		value.length >= 0 &&
		$toString$2(value) !== '[object Array]' &&
		$toString$2(value.callee) === '[object Function]';
};

var supportsStandardArguments = (function () {
	return isStandardArguments(arguments);
}());

isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

var isArguments = supportsStandardArguments ? isStandardArguments : isLegacyArguments;

var toStr$2 = Object.prototype.toString;
var fnToStr$1 = Function.prototype.toString;
var isFnRegex = /^\s*(?:function)?\*/;
var hasToStringTag$3 = shams();
var getProto = Object.getPrototypeOf;
var getGeneratorFunc = function () { // eslint-disable-line consistent-return
	if (!hasToStringTag$3) {
		return false;
	}
	try {
		return Function('return function*() {}')();
	} catch (e) {
	}
};
var GeneratorFunction;

var isGeneratorFunction = function isGeneratorFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
	}
	if (isFnRegex.test(fnToStr$1.call(fn))) {
		return true;
	}
	if (!hasToStringTag$3) {
		var str = toStr$2.call(fn);
		return str === '[object GeneratorFunction]';
	}
	if (!getProto) {
		return false;
	}
	if (typeof GeneratorFunction === 'undefined') {
		var generatorFunc = getGeneratorFunc();
		GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
	}
	return getProto(fn) === GeneratorFunction;
};

var fnToStr = Function.prototype.toString;
var reflectApply = typeof Reflect === 'object' && Reflect !== null && Reflect.apply;
var badArrayLike;
var isCallableMarker;
if (typeof reflectApply === 'function' && typeof Object.defineProperty === 'function') {
	try {
		badArrayLike = Object.defineProperty({}, 'length', {
			get: function () {
				throw isCallableMarker;
			}
		});
		isCallableMarker = {};
		// eslint-disable-next-line no-throw-literal
		reflectApply(function () { throw 42; }, null, badArrayLike);
	} catch (_) {
		if (_ !== isCallableMarker) {
			reflectApply = null;
		}
	}
} else {
	reflectApply = null;
}

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr$1 = Object.prototype.toString;
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var hasToStringTag$2 = typeof Symbol === 'function' && !!Symbol.toStringTag; // better: use `has-tostringtag`
/* globals document: false */
var documentDotAll = typeof document === 'object' && typeof document.all === 'undefined' && document.all !== undefined ? document.all : {};

var isCallable$1 = reflectApply
	? function isCallable(value) {
		if (value === documentDotAll) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		if (typeof value === 'function' && !value.prototype) { return true; }
		try {
			reflectApply(value, null, badArrayLike);
		} catch (e) {
			if (e !== isCallableMarker) { return false; }
		}
		return !isES6ClassFn(value);
	}
	: function isCallable(value) {
		if (value === documentDotAll) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		if (typeof value === 'function' && !value.prototype) { return true; }
		if (hasToStringTag$2) { return tryFunctionObject(value); }
		if (isES6ClassFn(value)) { return false; }
		var strClass = toStr$1.call(value);
		return strClass === fnClass || strClass === genClass;
	};

var isCallable = isCallable$1;

var toStr = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
                iterator(array[i], i, array);
            } else {
                iterator.call(receiver, array[i], i, array);
            }
        }
    }
};

var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        if (receiver == null) {
            iterator(string.charAt(i), i, string);
        } else {
            iterator.call(receiver, string.charAt(i), i, string);
        }
    }
};

var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
                iterator(object[k], k, object);
            } else {
                iterator.call(receiver, object[k], k, object);
            }
        }
    }
};

var forEach$2 = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
        throw new TypeError('iterator must be a function');
    }

    var receiver;
    if (arguments.length >= 3) {
        receiver = thisArg;
    }

    if (toStr.call(list) === '[object Array]') {
        forEachArray(list, iterator, receiver);
    } else if (typeof list === 'string') {
        forEachString(list, iterator, receiver);
    } else {
        forEachObject(list, iterator, receiver);
    }
};

var forEach_1 = forEach$2;

var possibleNames = [
	'BigInt64Array',
	'BigUint64Array',
	'Float32Array',
	'Float64Array',
	'Int16Array',
	'Int32Array',
	'Int8Array',
	'Uint16Array',
	'Uint32Array',
	'Uint8Array',
	'Uint8ClampedArray'
];

var g$2 = typeof globalThis === 'undefined' ? commonjsGlobal : globalThis;

var availableTypedArrays$2 = function availableTypedArrays() {
	var out = [];
	for (var i = 0; i < possibleNames.length; i++) {
		if (typeof g$2[possibleNames[i]] === 'function') {
			out[out.length] = possibleNames[i];
		}
	}
	return out;
};

var GetIntrinsic = getIntrinsic;

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);
if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

var getOwnPropertyDescriptor = $gOPD;

var forEach$1 = forEach_1;
var availableTypedArrays$1 = availableTypedArrays$2;
var callBound$1 = callBound$3;

var $toString$1 = callBound$1('Object.prototype.toString');
var hasToStringTag$1 = shams();

var g$1 = typeof globalThis === 'undefined' ? commonjsGlobal : globalThis;
var typedArrays$1 = availableTypedArrays$1();

var $indexOf = callBound$1('Array.prototype.indexOf', true) || function indexOf(array, value) {
	for (var i = 0; i < array.length; i += 1) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
};
var $slice$1 = callBound$1('String.prototype.slice');
var toStrTags$1 = {};
var gOPD$1 = getOwnPropertyDescriptor;
var getPrototypeOf$1 = Object.getPrototypeOf; // require('getprototypeof');
if (hasToStringTag$1 && gOPD$1 && getPrototypeOf$1) {
	forEach$1(typedArrays$1, function (typedArray) {
		var arr = new g$1[typedArray]();
		if (Symbol.toStringTag in arr) {
			var proto = getPrototypeOf$1(arr);
			var descriptor = gOPD$1(proto, Symbol.toStringTag);
			if (!descriptor) {
				var superProto = getPrototypeOf$1(proto);
				descriptor = gOPD$1(superProto, Symbol.toStringTag);
			}
			toStrTags$1[typedArray] = descriptor.get;
		}
	});
}

var tryTypedArrays$1 = function tryAllTypedArrays(value) {
	var anyTrue = false;
	forEach$1(toStrTags$1, function (getter, typedArray) {
		if (!anyTrue) {
			try {
				anyTrue = getter.call(value) === typedArray;
			} catch (e) { /**/ }
		}
	});
	return anyTrue;
};

var isTypedArray$1 = function isTypedArray(value) {
	if (!value || typeof value !== 'object') { return false; }
	if (!hasToStringTag$1 || !(Symbol.toStringTag in value)) {
		var tag = $slice$1($toString$1(value), 8, -1);
		return $indexOf(typedArrays$1, tag) > -1;
	}
	if (!gOPD$1) { return false; }
	return tryTypedArrays$1(value);
};

var forEach = forEach_1;
var availableTypedArrays = availableTypedArrays$2;
var callBound = callBound$3;

var $toString = callBound('Object.prototype.toString');
var hasToStringTag = shams();

var g = typeof globalThis === 'undefined' ? commonjsGlobal : globalThis;
var typedArrays = availableTypedArrays();

var $slice = callBound('String.prototype.slice');
var toStrTags = {};
var gOPD = getOwnPropertyDescriptor;
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		if (typeof g[typedArray] === 'function') {
			var arr = new g[typedArray]();
			if (Symbol.toStringTag in arr) {
				var proto = getPrototypeOf(arr);
				var descriptor = gOPD(proto, Symbol.toStringTag);
				if (!descriptor) {
					var superProto = getPrototypeOf(proto);
					descriptor = gOPD(superProto, Symbol.toStringTag);
				}
				toStrTags[typedArray] = descriptor.get;
			}
		}
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var foundName = false;
	forEach(toStrTags, function (getter, typedArray) {
		if (!foundName) {
			try {
				var name = getter.call(value);
				if (name === typedArray) {
					foundName = name;
				}
			} catch (e) {}
		}
	});
	return foundName;
};

var isTypedArray = isTypedArray$1;

var whichTypedArray = function whichTypedArray(value) {
	if (!isTypedArray(value)) { return false; }
	if (!hasToStringTag || !(Symbol.toStringTag in value)) { return $slice($toString(value), 8, -1); }
	return tryTypedArrays(value);
};

(function (exports) {

var isArgumentsObject = isArguments;
var isGeneratorFunction$1 = isGeneratorFunction;
var whichTypedArray$1 = whichTypedArray;
var isTypedArray = isTypedArray$1;

function uncurryThis(f) {
  return f.call.bind(f);
}

var BigIntSupported = typeof BigInt !== 'undefined';
var SymbolSupported = typeof Symbol !== 'undefined';

var ObjectToString = uncurryThis(Object.prototype.toString);

var numberValue = uncurryThis(Number.prototype.valueOf);
var stringValue = uncurryThis(String.prototype.valueOf);
var booleanValue = uncurryThis(Boolean.prototype.valueOf);

if (BigIntSupported) {
  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
}

if (SymbolSupported) {
  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
}

function checkBoxedPrimitive(value, prototypeValueOf) {
  if (typeof value !== 'object') {
    return false;
  }
  try {
    prototypeValueOf(value);
    return true;
  } catch(e) {
    return false;
  }
}

exports.isArgumentsObject = isArgumentsObject;
exports.isGeneratorFunction = isGeneratorFunction$1;
exports.isTypedArray = isTypedArray;

// Taken from here and modified for better browser support
// https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
function isPromise(input) {
	return (
		(
			typeof Promise !== 'undefined' &&
			input instanceof Promise
		) ||
		(
			input !== null &&
			typeof input === 'object' &&
			typeof input.then === 'function' &&
			typeof input.catch === 'function'
		)
	);
}
exports.isPromise = isPromise;

function isArrayBufferView(value) {
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    return ArrayBuffer.isView(value);
  }

  return (
    isTypedArray(value) ||
    isDataView(value)
  );
}
exports.isArrayBufferView = isArrayBufferView;


function isUint8Array(value) {
  return whichTypedArray$1(value) === 'Uint8Array';
}
exports.isUint8Array = isUint8Array;

function isUint8ClampedArray(value) {
  return whichTypedArray$1(value) === 'Uint8ClampedArray';
}
exports.isUint8ClampedArray = isUint8ClampedArray;

function isUint16Array(value) {
  return whichTypedArray$1(value) === 'Uint16Array';
}
exports.isUint16Array = isUint16Array;

function isUint32Array(value) {
  return whichTypedArray$1(value) === 'Uint32Array';
}
exports.isUint32Array = isUint32Array;

function isInt8Array(value) {
  return whichTypedArray$1(value) === 'Int8Array';
}
exports.isInt8Array = isInt8Array;

function isInt16Array(value) {
  return whichTypedArray$1(value) === 'Int16Array';
}
exports.isInt16Array = isInt16Array;

function isInt32Array(value) {
  return whichTypedArray$1(value) === 'Int32Array';
}
exports.isInt32Array = isInt32Array;

function isFloat32Array(value) {
  return whichTypedArray$1(value) === 'Float32Array';
}
exports.isFloat32Array = isFloat32Array;

function isFloat64Array(value) {
  return whichTypedArray$1(value) === 'Float64Array';
}
exports.isFloat64Array = isFloat64Array;

function isBigInt64Array(value) {
  return whichTypedArray$1(value) === 'BigInt64Array';
}
exports.isBigInt64Array = isBigInt64Array;

function isBigUint64Array(value) {
  return whichTypedArray$1(value) === 'BigUint64Array';
}
exports.isBigUint64Array = isBigUint64Array;

function isMapToString(value) {
  return ObjectToString(value) === '[object Map]';
}
isMapToString.working = (
  typeof Map !== 'undefined' &&
  isMapToString(new Map())
);

function isMap(value) {
  if (typeof Map === 'undefined') {
    return false;
  }

  return isMapToString.working
    ? isMapToString(value)
    : value instanceof Map;
}
exports.isMap = isMap;

function isSetToString(value) {
  return ObjectToString(value) === '[object Set]';
}
isSetToString.working = (
  typeof Set !== 'undefined' &&
  isSetToString(new Set())
);
function isSet(value) {
  if (typeof Set === 'undefined') {
    return false;
  }

  return isSetToString.working
    ? isSetToString(value)
    : value instanceof Set;
}
exports.isSet = isSet;

function isWeakMapToString(value) {
  return ObjectToString(value) === '[object WeakMap]';
}
isWeakMapToString.working = (
  typeof WeakMap !== 'undefined' &&
  isWeakMapToString(new WeakMap())
);
function isWeakMap(value) {
  if (typeof WeakMap === 'undefined') {
    return false;
  }

  return isWeakMapToString.working
    ? isWeakMapToString(value)
    : value instanceof WeakMap;
}
exports.isWeakMap = isWeakMap;

function isWeakSetToString(value) {
  return ObjectToString(value) === '[object WeakSet]';
}
isWeakSetToString.working = (
  typeof WeakSet !== 'undefined' &&
  isWeakSetToString(new WeakSet())
);
function isWeakSet(value) {
  return isWeakSetToString(value);
}
exports.isWeakSet = isWeakSet;

function isArrayBufferToString(value) {
  return ObjectToString(value) === '[object ArrayBuffer]';
}
isArrayBufferToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  isArrayBufferToString(new ArrayBuffer())
);
function isArrayBuffer(value) {
  if (typeof ArrayBuffer === 'undefined') {
    return false;
  }

  return isArrayBufferToString.working
    ? isArrayBufferToString(value)
    : value instanceof ArrayBuffer;
}
exports.isArrayBuffer = isArrayBuffer;

function isDataViewToString(value) {
  return ObjectToString(value) === '[object DataView]';
}
isDataViewToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  typeof DataView !== 'undefined' &&
  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
);
function isDataView(value) {
  if (typeof DataView === 'undefined') {
    return false;
  }

  return isDataViewToString.working
    ? isDataViewToString(value)
    : value instanceof DataView;
}
exports.isDataView = isDataView;

// Store a copy of SharedArrayBuffer in case it's deleted elsewhere
var SharedArrayBufferCopy = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
function isSharedArrayBufferToString(value) {
  return ObjectToString(value) === '[object SharedArrayBuffer]';
}
function isSharedArrayBuffer(value) {
  if (typeof SharedArrayBufferCopy === 'undefined') {
    return false;
  }

  if (typeof isSharedArrayBufferToString.working === 'undefined') {
    isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
  }

  return isSharedArrayBufferToString.working
    ? isSharedArrayBufferToString(value)
    : value instanceof SharedArrayBufferCopy;
}
exports.isSharedArrayBuffer = isSharedArrayBuffer;

function isAsyncFunction(value) {
  return ObjectToString(value) === '[object AsyncFunction]';
}
exports.isAsyncFunction = isAsyncFunction;

function isMapIterator(value) {
  return ObjectToString(value) === '[object Map Iterator]';
}
exports.isMapIterator = isMapIterator;

function isSetIterator(value) {
  return ObjectToString(value) === '[object Set Iterator]';
}
exports.isSetIterator = isSetIterator;

function isGeneratorObject(value) {
  return ObjectToString(value) === '[object Generator]';
}
exports.isGeneratorObject = isGeneratorObject;

function isWebAssemblyCompiledModule(value) {
  return ObjectToString(value) === '[object WebAssembly.Module]';
}
exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

function isNumberObject(value) {
  return checkBoxedPrimitive(value, numberValue);
}
exports.isNumberObject = isNumberObject;

function isStringObject(value) {
  return checkBoxedPrimitive(value, stringValue);
}
exports.isStringObject = isStringObject;

function isBooleanObject(value) {
  return checkBoxedPrimitive(value, booleanValue);
}
exports.isBooleanObject = isBooleanObject;

function isBigIntObject(value) {
  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
}
exports.isBigIntObject = isBigIntObject;

function isSymbolObject(value) {
  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
}
exports.isSymbolObject = isSymbolObject;

function isBoxedPrimitive(value) {
  return (
    isNumberObject(value) ||
    isStringObject(value) ||
    isBooleanObject(value) ||
    isBigIntObject(value) ||
    isSymbolObject(value)
  );
}
exports.isBoxedPrimitive = isBoxedPrimitive;

function isAnyArrayBuffer(value) {
  return typeof Uint8Array !== 'undefined' && (
    isArrayBuffer(value) ||
    isSharedArrayBuffer(value)
  );
}
exports.isAnyArrayBuffer = isAnyArrayBuffer;

['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
  Object.defineProperty(exports, method, {
    enumerable: false,
    value: function() {
      throw new Error(method + ' is not supported in userland');
    }
  });
});
}(types));

var isBuffer = function isBuffer(arg) {
  return arg instanceof Buffer;
};

var inherits = {exports: {}};

var inherits_browser = {exports: {}};

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  inherits_browser.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
} else {
  // old school shim for old browsers
  inherits_browser.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function () {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    }
  };
}

try {
  var util = require('util');
  /* istanbul ignore next */
  if (typeof util.inherits !== 'function') throw '';
  inherits.exports = util.inherits;
} catch (e) {
  /* istanbul ignore next */
  inherits.exports = inherits_browser.exports;
}

(function (exports) {
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
  function getOwnPropertyDescriptors(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};
    for (var i = 0; i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }
    return descriptors;
  };

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  if (typeof process !== 'undefined' && process.noDeprecation === true) {
    return fn;
  }

  // Allow for deprecating things in the process of starting up.
  if (typeof process === 'undefined') {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnvRegex = /^$/;

if (process.env.NODE_DEBUG) {
  var debugEnv = process.env.NODE_DEBUG;
  debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/,/g, '$|^')
    .toUpperCase();
  debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
}
exports.debuglog = function(set) {
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (debugEnvRegex.test(set)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var length = output.reduce(function(prev, cur) {
    if (cur.indexOf('\n') >= 0) ;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
exports.types = types;

function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;
exports.types.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;
exports.types.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;
exports.types.isNativeError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = inherits.exports;

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

exports.promisify = function promisify(original) {
  if (typeof original !== 'function')
    throw new TypeError('The "original" argument must be of type Function');

  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
    var fn = original[kCustomPromisifiedSymbol];
    if (typeof fn !== 'function') {
      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
    }
    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    });
    return fn;
  }

  function fn() {
    var promiseResolve, promiseReject;
    var promise = new Promise(function (resolve, reject) {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    args.push(function (err, value) {
      if (err) {
        promiseReject(err);
      } else {
        promiseResolve(value);
      }
    });

    try {
      original.apply(this, args);
    } catch (err) {
      promiseReject(err);
    }

    return promise;
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn, enumerable: false, writable: false, configurable: true
  });
  return Object.defineProperties(
    fn,
    getOwnPropertyDescriptors(original)
  );
};

exports.promisify.custom = kCustomPromisifiedSymbol;

function callbackifyOnRejected(reason, cb) {
  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
  // Because `null` is a special error value in callbacks which means "no error
  // occurred", we error-wrap so the callback consumer can distinguish between
  // "the promise rejected with null" or "the promise fulfilled with undefined".
  if (!reason) {
    var newReason = new Error('Promise was rejected with a falsy value');
    newReason.reason = reason;
    reason = newReason;
  }
  return cb(reason);
}

function callbackify(original) {
  if (typeof original !== 'function') {
    throw new TypeError('The "original" argument must be of type Function');
  }

  // We DO NOT return the promise as it gives the user a false sense that
  // the promise is actually somehow related to the callback's execution
  // and that the callback throwing will reject the promise.
  function callbackified() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    var maybeCb = args.pop();
    if (typeof maybeCb !== 'function') {
      throw new TypeError('The last argument must be of type Function');
    }
    var self = this;
    var cb = function() {
      return maybeCb.apply(self, arguments);
    };
    // In true node style we process the callback on `nextTick` with all the
    // implications (stack, `uncaughtException`, `async_hooks`)
    original.apply(this, args)
      .then(function(ret) { process.nextTick(cb.bind(null, null, ret)); },
            function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)); });
  }

  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
  Object.defineProperties(callbackified,
                          getOwnPropertyDescriptors(original));
  return callbackified;
}
exports.callbackify = callbackify;
}(util$1));

var eastasianwidth = {exports: {}};

(function (module) {
var eaw = {};

{
  module.exports = eaw;
}

eaw.eastAsianWidth = function(character) {
  var x = character.charCodeAt(0);
  var y = (character.length == 2) ? character.charCodeAt(1) : 0;
  var codePoint = x;
  if ((0xD800 <= x && x <= 0xDBFF) && (0xDC00 <= y && y <= 0xDFFF)) {
    x &= 0x3FF;
    y &= 0x3FF;
    codePoint = (x << 10) | y;
    codePoint += 0x10000;
  }

  if ((0x3000 == codePoint) ||
      (0xFF01 <= codePoint && codePoint <= 0xFF60) ||
      (0xFFE0 <= codePoint && codePoint <= 0xFFE6)) {
    return 'F';
  }
  if ((0x20A9 == codePoint) ||
      (0xFF61 <= codePoint && codePoint <= 0xFFBE) ||
      (0xFFC2 <= codePoint && codePoint <= 0xFFC7) ||
      (0xFFCA <= codePoint && codePoint <= 0xFFCF) ||
      (0xFFD2 <= codePoint && codePoint <= 0xFFD7) ||
      (0xFFDA <= codePoint && codePoint <= 0xFFDC) ||
      (0xFFE8 <= codePoint && codePoint <= 0xFFEE)) {
    return 'H';
  }
  if ((0x1100 <= codePoint && codePoint <= 0x115F) ||
      (0x11A3 <= codePoint && codePoint <= 0x11A7) ||
      (0x11FA <= codePoint && codePoint <= 0x11FF) ||
      (0x2329 <= codePoint && codePoint <= 0x232A) ||
      (0x2E80 <= codePoint && codePoint <= 0x2E99) ||
      (0x2E9B <= codePoint && codePoint <= 0x2EF3) ||
      (0x2F00 <= codePoint && codePoint <= 0x2FD5) ||
      (0x2FF0 <= codePoint && codePoint <= 0x2FFB) ||
      (0x3001 <= codePoint && codePoint <= 0x303E) ||
      (0x3041 <= codePoint && codePoint <= 0x3096) ||
      (0x3099 <= codePoint && codePoint <= 0x30FF) ||
      (0x3105 <= codePoint && codePoint <= 0x312D) ||
      (0x3131 <= codePoint && codePoint <= 0x318E) ||
      (0x3190 <= codePoint && codePoint <= 0x31BA) ||
      (0x31C0 <= codePoint && codePoint <= 0x31E3) ||
      (0x31F0 <= codePoint && codePoint <= 0x321E) ||
      (0x3220 <= codePoint && codePoint <= 0x3247) ||
      (0x3250 <= codePoint && codePoint <= 0x32FE) ||
      (0x3300 <= codePoint && codePoint <= 0x4DBF) ||
      (0x4E00 <= codePoint && codePoint <= 0xA48C) ||
      (0xA490 <= codePoint && codePoint <= 0xA4C6) ||
      (0xA960 <= codePoint && codePoint <= 0xA97C) ||
      (0xAC00 <= codePoint && codePoint <= 0xD7A3) ||
      (0xD7B0 <= codePoint && codePoint <= 0xD7C6) ||
      (0xD7CB <= codePoint && codePoint <= 0xD7FB) ||
      (0xF900 <= codePoint && codePoint <= 0xFAFF) ||
      (0xFE10 <= codePoint && codePoint <= 0xFE19) ||
      (0xFE30 <= codePoint && codePoint <= 0xFE52) ||
      (0xFE54 <= codePoint && codePoint <= 0xFE66) ||
      (0xFE68 <= codePoint && codePoint <= 0xFE6B) ||
      (0x1B000 <= codePoint && codePoint <= 0x1B001) ||
      (0x1F200 <= codePoint && codePoint <= 0x1F202) ||
      (0x1F210 <= codePoint && codePoint <= 0x1F23A) ||
      (0x1F240 <= codePoint && codePoint <= 0x1F248) ||
      (0x1F250 <= codePoint && codePoint <= 0x1F251) ||
      (0x20000 <= codePoint && codePoint <= 0x2F73F) ||
      (0x2B740 <= codePoint && codePoint <= 0x2FFFD) ||
      (0x30000 <= codePoint && codePoint <= 0x3FFFD)) {
    return 'W';
  }
  if ((0x0020 <= codePoint && codePoint <= 0x007E) ||
      (0x00A2 <= codePoint && codePoint <= 0x00A3) ||
      (0x00A5 <= codePoint && codePoint <= 0x00A6) ||
      (0x00AC == codePoint) ||
      (0x00AF == codePoint) ||
      (0x27E6 <= codePoint && codePoint <= 0x27ED) ||
      (0x2985 <= codePoint && codePoint <= 0x2986)) {
    return 'Na';
  }
  if ((0x00A1 == codePoint) ||
      (0x00A4 == codePoint) ||
      (0x00A7 <= codePoint && codePoint <= 0x00A8) ||
      (0x00AA == codePoint) ||
      (0x00AD <= codePoint && codePoint <= 0x00AE) ||
      (0x00B0 <= codePoint && codePoint <= 0x00B4) ||
      (0x00B6 <= codePoint && codePoint <= 0x00BA) ||
      (0x00BC <= codePoint && codePoint <= 0x00BF) ||
      (0x00C6 == codePoint) ||
      (0x00D0 == codePoint) ||
      (0x00D7 <= codePoint && codePoint <= 0x00D8) ||
      (0x00DE <= codePoint && codePoint <= 0x00E1) ||
      (0x00E6 == codePoint) ||
      (0x00E8 <= codePoint && codePoint <= 0x00EA) ||
      (0x00EC <= codePoint && codePoint <= 0x00ED) ||
      (0x00F0 == codePoint) ||
      (0x00F2 <= codePoint && codePoint <= 0x00F3) ||
      (0x00F7 <= codePoint && codePoint <= 0x00FA) ||
      (0x00FC == codePoint) ||
      (0x00FE == codePoint) ||
      (0x0101 == codePoint) ||
      (0x0111 == codePoint) ||
      (0x0113 == codePoint) ||
      (0x011B == codePoint) ||
      (0x0126 <= codePoint && codePoint <= 0x0127) ||
      (0x012B == codePoint) ||
      (0x0131 <= codePoint && codePoint <= 0x0133) ||
      (0x0138 == codePoint) ||
      (0x013F <= codePoint && codePoint <= 0x0142) ||
      (0x0144 == codePoint) ||
      (0x0148 <= codePoint && codePoint <= 0x014B) ||
      (0x014D == codePoint) ||
      (0x0152 <= codePoint && codePoint <= 0x0153) ||
      (0x0166 <= codePoint && codePoint <= 0x0167) ||
      (0x016B == codePoint) ||
      (0x01CE == codePoint) ||
      (0x01D0 == codePoint) ||
      (0x01D2 == codePoint) ||
      (0x01D4 == codePoint) ||
      (0x01D6 == codePoint) ||
      (0x01D8 == codePoint) ||
      (0x01DA == codePoint) ||
      (0x01DC == codePoint) ||
      (0x0251 == codePoint) ||
      (0x0261 == codePoint) ||
      (0x02C4 == codePoint) ||
      (0x02C7 == codePoint) ||
      (0x02C9 <= codePoint && codePoint <= 0x02CB) ||
      (0x02CD == codePoint) ||
      (0x02D0 == codePoint) ||
      (0x02D8 <= codePoint && codePoint <= 0x02DB) ||
      (0x02DD == codePoint) ||
      (0x02DF == codePoint) ||
      (0x0300 <= codePoint && codePoint <= 0x036F) ||
      (0x0391 <= codePoint && codePoint <= 0x03A1) ||
      (0x03A3 <= codePoint && codePoint <= 0x03A9) ||
      (0x03B1 <= codePoint && codePoint <= 0x03C1) ||
      (0x03C3 <= codePoint && codePoint <= 0x03C9) ||
      (0x0401 == codePoint) ||
      (0x0410 <= codePoint && codePoint <= 0x044F) ||
      (0x0451 == codePoint) ||
      (0x2010 == codePoint) ||
      (0x2013 <= codePoint && codePoint <= 0x2016) ||
      (0x2018 <= codePoint && codePoint <= 0x2019) ||
      (0x201C <= codePoint && codePoint <= 0x201D) ||
      (0x2020 <= codePoint && codePoint <= 0x2022) ||
      (0x2024 <= codePoint && codePoint <= 0x2027) ||
      (0x2030 == codePoint) ||
      (0x2032 <= codePoint && codePoint <= 0x2033) ||
      (0x2035 == codePoint) ||
      (0x203B == codePoint) ||
      (0x203E == codePoint) ||
      (0x2074 == codePoint) ||
      (0x207F == codePoint) ||
      (0x2081 <= codePoint && codePoint <= 0x2084) ||
      (0x20AC == codePoint) ||
      (0x2103 == codePoint) ||
      (0x2105 == codePoint) ||
      (0x2109 == codePoint) ||
      (0x2113 == codePoint) ||
      (0x2116 == codePoint) ||
      (0x2121 <= codePoint && codePoint <= 0x2122) ||
      (0x2126 == codePoint) ||
      (0x212B == codePoint) ||
      (0x2153 <= codePoint && codePoint <= 0x2154) ||
      (0x215B <= codePoint && codePoint <= 0x215E) ||
      (0x2160 <= codePoint && codePoint <= 0x216B) ||
      (0x2170 <= codePoint && codePoint <= 0x2179) ||
      (0x2189 == codePoint) ||
      (0x2190 <= codePoint && codePoint <= 0x2199) ||
      (0x21B8 <= codePoint && codePoint <= 0x21B9) ||
      (0x21D2 == codePoint) ||
      (0x21D4 == codePoint) ||
      (0x21E7 == codePoint) ||
      (0x2200 == codePoint) ||
      (0x2202 <= codePoint && codePoint <= 0x2203) ||
      (0x2207 <= codePoint && codePoint <= 0x2208) ||
      (0x220B == codePoint) ||
      (0x220F == codePoint) ||
      (0x2211 == codePoint) ||
      (0x2215 == codePoint) ||
      (0x221A == codePoint) ||
      (0x221D <= codePoint && codePoint <= 0x2220) ||
      (0x2223 == codePoint) ||
      (0x2225 == codePoint) ||
      (0x2227 <= codePoint && codePoint <= 0x222C) ||
      (0x222E == codePoint) ||
      (0x2234 <= codePoint && codePoint <= 0x2237) ||
      (0x223C <= codePoint && codePoint <= 0x223D) ||
      (0x2248 == codePoint) ||
      (0x224C == codePoint) ||
      (0x2252 == codePoint) ||
      (0x2260 <= codePoint && codePoint <= 0x2261) ||
      (0x2264 <= codePoint && codePoint <= 0x2267) ||
      (0x226A <= codePoint && codePoint <= 0x226B) ||
      (0x226E <= codePoint && codePoint <= 0x226F) ||
      (0x2282 <= codePoint && codePoint <= 0x2283) ||
      (0x2286 <= codePoint && codePoint <= 0x2287) ||
      (0x2295 == codePoint) ||
      (0x2299 == codePoint) ||
      (0x22A5 == codePoint) ||
      (0x22BF == codePoint) ||
      (0x2312 == codePoint) ||
      (0x2460 <= codePoint && codePoint <= 0x24E9) ||
      (0x24EB <= codePoint && codePoint <= 0x254B) ||
      (0x2550 <= codePoint && codePoint <= 0x2573) ||
      (0x2580 <= codePoint && codePoint <= 0x258F) ||
      (0x2592 <= codePoint && codePoint <= 0x2595) ||
      (0x25A0 <= codePoint && codePoint <= 0x25A1) ||
      (0x25A3 <= codePoint && codePoint <= 0x25A9) ||
      (0x25B2 <= codePoint && codePoint <= 0x25B3) ||
      (0x25B6 <= codePoint && codePoint <= 0x25B7) ||
      (0x25BC <= codePoint && codePoint <= 0x25BD) ||
      (0x25C0 <= codePoint && codePoint <= 0x25C1) ||
      (0x25C6 <= codePoint && codePoint <= 0x25C8) ||
      (0x25CB == codePoint) ||
      (0x25CE <= codePoint && codePoint <= 0x25D1) ||
      (0x25E2 <= codePoint && codePoint <= 0x25E5) ||
      (0x25EF == codePoint) ||
      (0x2605 <= codePoint && codePoint <= 0x2606) ||
      (0x2609 == codePoint) ||
      (0x260E <= codePoint && codePoint <= 0x260F) ||
      (0x2614 <= codePoint && codePoint <= 0x2615) ||
      (0x261C == codePoint) ||
      (0x261E == codePoint) ||
      (0x2640 == codePoint) ||
      (0x2642 == codePoint) ||
      (0x2660 <= codePoint && codePoint <= 0x2661) ||
      (0x2663 <= codePoint && codePoint <= 0x2665) ||
      (0x2667 <= codePoint && codePoint <= 0x266A) ||
      (0x266C <= codePoint && codePoint <= 0x266D) ||
      (0x266F == codePoint) ||
      (0x269E <= codePoint && codePoint <= 0x269F) ||
      (0x26BE <= codePoint && codePoint <= 0x26BF) ||
      (0x26C4 <= codePoint && codePoint <= 0x26CD) ||
      (0x26CF <= codePoint && codePoint <= 0x26E1) ||
      (0x26E3 == codePoint) ||
      (0x26E8 <= codePoint && codePoint <= 0x26FF) ||
      (0x273D == codePoint) ||
      (0x2757 == codePoint) ||
      (0x2776 <= codePoint && codePoint <= 0x277F) ||
      (0x2B55 <= codePoint && codePoint <= 0x2B59) ||
      (0x3248 <= codePoint && codePoint <= 0x324F) ||
      (0xE000 <= codePoint && codePoint <= 0xF8FF) ||
      (0xFE00 <= codePoint && codePoint <= 0xFE0F) ||
      (0xFFFD == codePoint) ||
      (0x1F100 <= codePoint && codePoint <= 0x1F10A) ||
      (0x1F110 <= codePoint && codePoint <= 0x1F12D) ||
      (0x1F130 <= codePoint && codePoint <= 0x1F169) ||
      (0x1F170 <= codePoint && codePoint <= 0x1F19A) ||
      (0xE0100 <= codePoint && codePoint <= 0xE01EF) ||
      (0xF0000 <= codePoint && codePoint <= 0xFFFFD) ||
      (0x100000 <= codePoint && codePoint <= 0x10FFFD)) {
    return 'A';
  }

  return 'N';
};

eaw.characterLength = function(character) {
  var code = this.eastAsianWidth(character);
  if (code == 'F' || code == 'W' || code == 'A') {
    return 2;
  } else {
    return 1;
  }
};

// Split a string considering surrogate-pairs.
function stringToArray(string) {
  return string.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
}

eaw.length = function(string) {
  var characters = stringToArray(string);
  var len = 0;
  for (var i = 0; i < characters.length; i++) {
    len = len + this.characterLength(characters[i]);
  }
  return len;
};

eaw.slice = function(text, start, end) {
  textLen = eaw.length(text);
  start = start ? start : 0;
  end = end ? end : 1;
  if (start < 0) {
      start = textLen + start;
  }
  if (end < 0) {
      end = textLen + end;
  }
  var result = '';
  var eawLen = 0;
  var chars = stringToArray(text);
  for (var i = 0; i < chars.length; i++) {
    var char = chars[i];
    var charLen = eaw.length(char);
    if (eawLen >= start - (charLen == 2 ? 1 : 0)) {
        if (eawLen + charLen <= end) {
            result += char;
        } else {
            break;
        }
    }
    eawLen += charLen;
  }
  return result;
};
}(eastasianwidth));

if (typeof process !== "undefined") {
  if (process.argv.includes("--verbose")) ; else if (process.argv.includes("--silent")) ; else ;
}

/**
 * Tokenize input string.
 */
function lexer(str) {
    var tokens = [];
    var i = 0;
    while (i < str.length) {
        var char = str[i];
        if (char === "*" || char === "+" || char === "?") {
            tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
            continue;
        }
        if (char === "\\") {
            tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
            continue;
        }
        if (char === "{") {
            tokens.push({ type: "OPEN", index: i, value: str[i++] });
            continue;
        }
        if (char === "}") {
            tokens.push({ type: "CLOSE", index: i, value: str[i++] });
            continue;
        }
        if (char === ":") {
            var name = "";
            var j = i + 1;
            while (j < str.length) {
                var code = str.charCodeAt(j);
                if (
                // `0-9`
                (code >= 48 && code <= 57) ||
                    // `A-Z`
                    (code >= 65 && code <= 90) ||
                    // `a-z`
                    (code >= 97 && code <= 122) ||
                    // `_`
                    code === 95) {
                    name += str[j++];
                    continue;
                }
                break;
            }
            if (!name)
                throw new TypeError("Missing parameter name at ".concat(i));
            tokens.push({ type: "NAME", index: i, value: name });
            i = j;
            continue;
        }
        if (char === "(") {
            var count = 1;
            var pattern = "";
            var j = i + 1;
            if (str[j] === "?") {
                throw new TypeError("Pattern cannot start with \"?\" at ".concat(j));
            }
            while (j < str.length) {
                if (str[j] === "\\") {
                    pattern += str[j++] + str[j++];
                    continue;
                }
                if (str[j] === ")") {
                    count--;
                    if (count === 0) {
                        j++;
                        break;
                    }
                }
                else if (str[j] === "(") {
                    count++;
                    if (str[j + 1] !== "?") {
                        throw new TypeError("Capturing groups are not allowed at ".concat(j));
                    }
                }
                pattern += str[j++];
            }
            if (count)
                throw new TypeError("Unbalanced pattern at ".concat(i));
            if (!pattern)
                throw new TypeError("Missing pattern at ".concat(i));
            tokens.push({ type: "PATTERN", index: i, value: pattern });
            i = j;
            continue;
        }
        tokens.push({ type: "CHAR", index: i, value: str[i++] });
    }
    tokens.push({ type: "END", index: i, value: "" });
    return tokens;
}
/**
 * Parse a string for the raw tokens.
 */
function parse(str, options) {
    if (options === void 0) { options = {}; }
    var tokens = lexer(str);
    var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
    var defaultPattern = "[^".concat(escapeString(options.delimiter || "/#?"), "]+?");
    var result = [];
    var key = 0;
    var i = 0;
    var path = "";
    var tryConsume = function (type) {
        if (i < tokens.length && tokens[i].type === type)
            return tokens[i++].value;
    };
    var mustConsume = function (type) {
        var value = tryConsume(type);
        if (value !== undefined)
            return value;
        var _a = tokens[i], nextType = _a.type, index = _a.index;
        throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
    };
    var consumeText = function () {
        var result = "";
        var value;
        while ((value = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) {
            result += value;
        }
        return result;
    };
    while (i < tokens.length) {
        var char = tryConsume("CHAR");
        var name = tryConsume("NAME");
        var pattern = tryConsume("PATTERN");
        if (name || pattern) {
            var prefix = char || "";
            if (prefixes.indexOf(prefix) === -1) {
                path += prefix;
                prefix = "";
            }
            if (path) {
                result.push(path);
                path = "";
            }
            result.push({
                name: name || key++,
                prefix: prefix,
                suffix: "",
                pattern: pattern || defaultPattern,
                modifier: tryConsume("MODIFIER") || "",
            });
            continue;
        }
        var value = char || tryConsume("ESCAPED_CHAR");
        if (value) {
            path += value;
            continue;
        }
        if (path) {
            result.push(path);
            path = "";
        }
        var open = tryConsume("OPEN");
        if (open) {
            var prefix = consumeText();
            var name_1 = tryConsume("NAME") || "";
            var pattern_1 = tryConsume("PATTERN") || "";
            var suffix = consumeText();
            mustConsume("CLOSE");
            result.push({
                name: name_1 || (pattern_1 ? key++ : ""),
                pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
                prefix: prefix,
                suffix: suffix,
                modifier: tryConsume("MODIFIER") || "",
            });
            continue;
        }
        mustConsume("END");
    }
    return result;
}
/**
 * Compile a string to a template function for the path.
 */
function compile(str, options) {
    return tokensToFunction(parse(str, options), options);
}
/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction(tokens, options) {
    if (options === void 0) { options = {}; }
    var reFlags = flags(options);
    var _a = options.encode, encode = _a === void 0 ? function (x) { return x; } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
    // Compile all the tokens into regexps.
    var matches = tokens.map(function (token) {
        if (typeof token === "object") {
            return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
        }
    });
    return function (data) {
        var path = "";
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (typeof token === "string") {
                path += token;
                continue;
            }
            var value = data ? data[token.name] : undefined;
            var optional = token.modifier === "?" || token.modifier === "*";
            var repeat = token.modifier === "*" || token.modifier === "+";
            if (Array.isArray(value)) {
                if (!repeat) {
                    throw new TypeError("Expected \"".concat(token.name, "\" to not repeat, but got an array"));
                }
                if (value.length === 0) {
                    if (optional)
                        continue;
                    throw new TypeError("Expected \"".concat(token.name, "\" to not be empty"));
                }
                for (var j = 0; j < value.length; j++) {
                    var segment = encode(value[j], token);
                    if (validate && !matches[i].test(segment)) {
                        throw new TypeError("Expected all \"".concat(token.name, "\" to match \"").concat(token.pattern, "\", but got \"").concat(segment, "\""));
                    }
                    path += token.prefix + segment + token.suffix;
                }
                continue;
            }
            if (typeof value === "string" || typeof value === "number") {
                var segment = encode(String(value), token);
                if (validate && !matches[i].test(segment)) {
                    throw new TypeError("Expected \"".concat(token.name, "\" to match \"").concat(token.pattern, "\", but got \"").concat(segment, "\""));
                }
                path += token.prefix + segment + token.suffix;
                continue;
            }
            if (optional)
                continue;
            var typeOfMessage = repeat ? "an array" : "a string";
            throw new TypeError("Expected \"".concat(token.name, "\" to be ").concat(typeOfMessage));
        }
        return path;
    };
}
/**
 * Escape a regular expression string.
 */
function escapeString(str) {
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
/**
 * Get the flags for a regexp from the options.
 */
function flags(options) {
    return options && options.sensitive ? "" : "i";
}

function getRouteGenerator(segments, addTrailingSlash) {
  const template = segments.map((segment) => {
    return segment[0].spread ? `/:${segment[0].content.slice(3)}(.*)?` : "/" + segment.map((part) => {
      if (part)
        return part.dynamic ? `:${part.content}` : part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
  }).join("");
  const trailing = addTrailingSlash !== "never" && segments.length ? "/" : "";
  const toPath = compile(template + trailing);
  return toPath;
}

function deserializeRouteData(rawRouteData) {
  return {
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments
  };
}

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push(__spreadProps(__spreadValues({}, serializedRoute), {
      routeData: deserializeRouteData(serializedRoute.routeData)
    }));
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  return __spreadProps(__spreadValues({}, serializedManifest), {
    assets,
    routes
  });
}

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) ; else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

const STYLE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".css",
  ".pcss",
  ".postcss",
  ".scss",
  ".sass",
  ".styl",
  ".stylus",
  ".less"
]);
new RegExp(`\\.(${Array.from(STYLE_EXTENSIONS).map((s) => s.slice(1)).join("|")})($|\\?)`);

const SCRIPT_EXTENSIONS = /* @__PURE__ */ new Set([".js", ".ts"]);
new RegExp(`\\.(${Array.from(SCRIPT_EXTENSIONS).map((s) => s.slice(1)).join("|")})($|\\?)`);

const _manifest = Object.assign(deserializeManifest({"routes":[{"file":"","links":["assets/asset.695db383.css"],"scripts":["entry.917c07f3.js"],"routeData":{"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.5ab5d3ae.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/advancedflutter\\/?$","segments":[[{"content":"advancedflutter","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/advancedflutter/index.astro","pathname":"/advancedflutter","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.2b312906.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/advancedflutter\\/01-hello\\/?$","segments":[[{"content":"advancedflutter","dynamic":false,"spread":false}],[{"content":"01-hello","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/advancedflutter/01-hello.md","pathname":"/advancedflutter/01-hello","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.5ab5d3ae.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/basicflutter\\/?$","segments":[[{"content":"basicflutter","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/basicflutter/index.astro","pathname":"/basicflutter","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.2b312906.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/basicflutter\\/02-scoped-model\\/?$","segments":[[{"content":"basicflutter","dynamic":false,"spread":false}],[{"content":"02-scoped-model","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/basicflutter/02-scoped-model.md","pathname":"/basicflutter/02-scoped-model","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.2b312906.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/basicflutter\\/01-hello\\/?$","segments":[[{"content":"basicflutter","dynamic":false,"spread":false}],[{"content":"01-hello","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/basicflutter/01-hello.md","pathname":"/basicflutter/01-hello","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.5ab5d3ae.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/noskills\\/?$","segments":[[{"content":"noskills","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/noskills/index.astro","pathname":"/noskills","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.2b312906.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/noskills\\/02-hello-next\\/?$","segments":[[{"content":"noskills","dynamic":false,"spread":false}],[{"content":"02-hello-next","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/noskills/02-hello-next.md","pathname":"/noskills/02-hello-next","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.2b312906.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/noskills\\/01-hello\\/?$","segments":[[{"content":"noskills","dynamic":false,"spread":false}],[{"content":"01-hello","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/noskills/01-hello.md","pathname":"/noskills/01-hello","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.5ab5d3ae.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/webdev\\/?$","segments":[[{"content":"webdev","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/webdev/index.astro","pathname":"/webdev","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.2b312906.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/webdev\\/01-hello\\/?$","segments":[[{"content":"webdev","dynamic":false,"spread":false}],[{"content":"01-hello","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/webdev/01-hello.md","pathname":"/webdev/01-hello","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.5ab5d3ae.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/webdev\\/css\\/?$","segments":[[{"content":"webdev","dynamic":false,"spread":false}],[{"content":"css","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/webdev/css/index.astro","pathname":"/webdev/css","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/asset.2b312906.css"],"scripts":[],"routeData":{"type":"page","pattern":"^\\/webdev\\/css\\/01-hello\\/?$","segments":[[{"content":"webdev","dynamic":false,"spread":false}],[{"content":"css","dynamic":false,"spread":false}],[{"content":"01-hello","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/webdev/css/01-hello.md","pathname":"/webdev/css/01-hello","_meta":{"trailingSlash":"ignore"}}}],"markdown":{"mode":"mdx","drafts":false,"syntaxHighlight":"shiki","shikiConfig":{"langs":[],"theme":"github-dark","wrap":false},"remarkPlugins":[],"rehypePlugins":[]},"pageMap":null,"renderers":[],"entryModules":{"/src/pages/index.astro/hoisted.js":"entry.917c07f3.js","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","/Users/seenickcode/code/devjourney/src/pages/advancedflutter/01-hello.md?mdImport":"chunks/chunk.6b474c6a.mjs","/Users/seenickcode/code/devjourney/src/pages/basicflutter/01-hello.md?mdImport":"chunks/chunk.bbee4636.mjs","/Users/seenickcode/code/devjourney/src/pages/basicflutter/02-scoped-model.md?mdImport":"chunks/chunk.cc6f92e5.mjs","/Users/seenickcode/code/devjourney/src/pages/noskills/01-hello.md?mdImport":"chunks/chunk.55e8b787.mjs","/Users/seenickcode/code/devjourney/src/pages/noskills/02-hello-next.md?mdImport":"chunks/chunk.bc4ccbf7.mjs","/Users/seenickcode/code/devjourney/src/pages/webdev/01-hello.md?mdImport":"chunks/chunk.a34cab35.mjs","/Users/seenickcode/code/devjourney/src/pages/webdev/css/01-hello.md?mdImport":"chunks/chunk.ef78715a.mjs","astro:scripts/before-hydration.js":"data:text/javascript;charset=utf-8,//[no before-hydration script]"},"assets":["/entry.917c07f3.js","/favicon.ico","/assets/asset.695db383.css","/assets/asset.5ab5d3ae.css","/assets/asset.2b312906.css"]}), {
	pageMap: pageMap,
	renderers: renderers
});
const _args = {};

const _exports = adapter.createExports(_manifest, _args);
const handler = _exports['handler'];

const _start = 'start';
if(_start in adapter) {
	adapter[_start](_manifest, _args);
}

export { _page2 as _, _page4 as a, _page5 as b, _page7 as c, _page8 as d, _page10 as e, _page12 as f, handler };
