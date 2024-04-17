import "/node_modules/vite/dist/client/env.mjs";

class HMRContext {
    constructor(hmrClient, ownerPath) {
        this.hmrClient = hmrClient;
        this.ownerPath = ownerPath;
        if (!hmrClient.dataMap.has(ownerPath)) {
            hmrClient.dataMap.set(ownerPath, {});
        }
        // when a file is hot updated, a new context is created
        // clear its stale callbacks
        const mod = hmrClient.hotModulesMap.get(ownerPath);
        if (mod) {
            mod.callbacks = [];
        }
        // clear stale custom event listeners
        const staleListeners = hmrClient.ctxToListenersMap.get(ownerPath);
        if (staleListeners) {
            for (const [event, staleFns] of staleListeners) {
                const listeners = hmrClient.customListenersMap.get(event);
                if (listeners) {
                    hmrClient.customListenersMap.set(event, listeners.filter((l) => !staleFns.includes(l)));
                }
            }
        }
        this.newListeners = new Map();
        hmrClient.ctxToListenersMap.set(ownerPath, this.newListeners);
    }
    get data() {
        return this.hmrClient.dataMap.get(this.ownerPath);
    }
    accept(deps, callback) {
        if (typeof deps === 'function' || !deps) {
            // self-accept: hot.accept(() => {})
            this.acceptDeps([this.ownerPath], ([mod]) => deps === null || deps === void 0 ? void 0 : deps(mod));
        }
        else if (typeof deps === 'string') {
            // explicit deps
            this.acceptDeps([deps], ([mod]) => callback === null || callback === void 0 ? void 0 : callback(mod));
        }
        else if (Array.isArray(deps)) {
            this.acceptDeps(deps, callback);
        }
        else {
            throw new Error(`invalid hot.accept() usage.`);
        }
    }
    // export names (first arg) are irrelevant on the client side, they're
    // extracted in the server for propagation
    acceptExports(_, callback) {
        this.acceptDeps([this.ownerPath], ([mod]) => callback === null || callback === void 0 ? void 0 : callback(mod));
    }
    dispose(cb) {
        this.hmrClient.disposeMap.set(this.ownerPath, cb);
    }
    prune(cb) {
        this.hmrClient.pruneMap.set(this.ownerPath, cb);
    }
    // Kept for backward compatibility (#11036)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    decline() { }
    invalidate(message) {
        this.hmrClient.notifyListeners('vite:invalidate', {
            path: this.ownerPath,
            message,
        });
        this.send('vite:invalidate', { path: this.ownerPath, message });
        this.hmrClient.logger.debug(`[vite] invalidate ${this.ownerPath}${message ? `: ${message}` : ''}`);
    }
    on(event, cb) {
        const addToMap = (map) => {
            const existing = map.get(event) || [];
            existing.push(cb);
            map.set(event, existing);
        };
        addToMap(this.hmrClient.customListenersMap);
        addToMap(this.newListeners);
    }
    off(event, cb) {
        const removeFromMap = (map) => {
            const existing = map.get(event);
            if (existing === undefined) {
                return;
            }
            const pruned = existing.filter((l) => l !== cb);
            if (pruned.length === 0) {
                map.delete(event);
                return;
            }
            map.set(event, pruned);
        };
        removeFromMap(this.hmrClient.customListenersMap);
        removeFromMap(this.newListeners);
    }
    send(event, data) {
        this.hmrClient.messenger.send(JSON.stringify({ type: 'custom', event, data }));
    }
    acceptDeps(deps, callback = () => { }) {
        const mod = this.hmrClient.hotModulesMap.get(this.ownerPath) || {
            id: this.ownerPath,
            callbacks: [],
        };
        mod.callbacks.push({
            deps,
            fn: callback,
        });
        this.hmrClient.hotModulesMap.set(this.ownerPath, mod);
    }
}
class HMRMessenger {
    constructor(connection) {
        this.connection = connection;
        this.queue = [];
    }
    send(message) {
        this.queue.push(message);
        this.flush();
    }
    flush() {
        if (this.connection.isReady()) {
            this.queue.forEach((msg) => this.connection.send(msg));
            this.queue = [];
        }
    }
}
class HMRClient {
    constructor(logger, connection, 
    // This allows implementing reloading via different methods depending on the environment
    importUpdatedModule) {
        this.logger = logger;
        this.importUpdatedModule = importUpdatedModule;
        this.hotModulesMap = new Map();
        this.disposeMap = new Map();
        this.pruneMap = new Map();
        this.dataMap = new Map();
        this.customListenersMap = new Map();
        this.ctxToListenersMap = new Map();
        this.updateQueue = [];
        this.pendingUpdateQueue = false;
        this.messenger = new HMRMessenger(connection);
    }
    async notifyListeners(event, data) {
        const cbs = this.customListenersMap.get(event);
        if (cbs) {
            await Promise.allSettled(cbs.map((cb) => cb(data)));
        }
    }
    clear() {
        this.hotModulesMap.clear();
        this.disposeMap.clear();
        this.pruneMap.clear();
        this.dataMap.clear();
        this.customListenersMap.clear();
        this.ctxToListenersMap.clear();
    }
    // After an HMR update, some modules are no longer imported on the page
    // but they may have left behind side effects that need to be cleaned up
    // (.e.g style injections)
    async prunePaths(paths) {
        await Promise.all(paths.map((path) => {
            const disposer = this.disposeMap.get(path);
            if (disposer)
                return disposer(this.dataMap.get(path));
        }));
        paths.forEach((path) => {
            const fn = this.pruneMap.get(path);
            if (fn) {
                fn(this.dataMap.get(path));
            }
        });
    }
    warnFailedUpdate(err, path) {
        if (!err.message.includes('fetch')) {
            this.logger.error(err);
        }
        this.logger.error(`[hmr] Failed to reload ${path}. ` +
            `This could be due to syntax errors or importing non-existent ` +
            `modules. (see errors above)`);
    }
    /**
     * buffer multiple hot updates triggered by the same src change
     * so that they are invoked in the same order they were sent.
     * (otherwise the order may be inconsistent because of the http request round trip)
     */
    async queueUpdate(payload) {
        this.updateQueue.push(this.fetchUpdate(payload));
        if (!this.pendingUpdateQueue) {
            this.pendingUpdateQueue = true;
            await Promise.resolve();
            this.pendingUpdateQueue = false;
            const loading = [...this.updateQueue];
            this.updateQueue = [];
            (await Promise.all(loading)).forEach((fn) => fn && fn());
        }
    }
    async fetchUpdate(update) {
        const { path, acceptedPath } = update;
        const mod = this.hotModulesMap.get(path);
        if (!mod) {
            // In a code-splitting project,
            // it is common that the hot-updating module is not loaded yet.
            // https://github.com/vitejs/vite/issues/721
            return;
        }
        let fetchedModule;
        const isSelfUpdate = path === acceptedPath;
        // determine the qualified callbacks before we re-import the modules
        const qualifiedCallbacks = mod.callbacks.filter(({ deps }) => deps.includes(acceptedPath));
        if (isSelfUpdate || qualifiedCallbacks.length > 0) {
            const disposer = this.disposeMap.get(acceptedPath);
            if (disposer)
                await disposer(this.dataMap.get(acceptedPath));
            try {
                fetchedModule = await this.importUpdatedModule(update);
            }
            catch (e) {
                this.warnFailedUpdate(e, acceptedPath);
            }
        }
        return () => {
            for (const { deps, fn } of qualifiedCallbacks) {
                fn(deps.map((dep) => (dep === acceptedPath ? fetchedModule : undefined)));
            }
            const loggedPath = isSelfUpdate ? path : `${acceptedPath} via ${path}`;
            this.logger.debug(`[vite] hot updated: ${loggedPath}`);
        };
    }
}

const hmrConfigName = "vite.config.js";
const base$1 = "/" || '/';
// Create an element with provided attributes and optional children
function h(e, attrs = {}, ...children) {
    const elem = document.createElement(e);
    for (const [k, v] of Object.entries(attrs)) {
        elem.setAttribute(k, v);
    }
    elem.append(...children);
    return elem;
}
// set :host styles to make playwright detect the element as visible
const templateStyle = /*css*/ `
:host {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99999;
  --monospace: 'SFMono-Regular', Consolas,
  'Liberation Mono', Menlo, Courier, monospace;
  --red: #ff5555;
  --yellow: #e2aa53;
  --purple: #cfa4ff;
  --cyan: #2dd9da;
  --dim: #c9c9c9;

  --window-background: #181818;
  --window-color: #d8d8d8;
}

.backdrop {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  margin: 0;
  background: rgba(0, 0, 0, 0.66);
}

.window {
  font-family: var(--monospace);
  line-height: 1.5;
  max-width: 80vw;
  color: var(--window-color);
  box-sizing: border-box;
  margin: 30px auto;
  padding: 2.5vh 4vw;
  position: relative;
  background: var(--window-background);
  border-radius: 6px 6px 8px 8px;
  box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);
  overflow: hidden;
  border-top: 8px solid var(--red);
  direction: ltr;
  text-align: left;
}

pre {
  font-family: var(--monospace);
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 1em;
  overflow-x: scroll;
  scrollbar-width: none;
}

pre::-webkit-scrollbar {
  display: none;
}

pre.frame::-webkit-scrollbar {
  display: block;
  height: 5px;
}

pre.frame::-webkit-scrollbar-thumb {
  background: #999;
  border-radius: 5px;
}

pre.frame {
  scrollbar-width: thin;
}

.message {
  line-height: 1.3;
  font-weight: 600;
  white-space: pre-wrap;
}

.message-body {
  color: var(--red);
}

.plugin {
  color: var(--purple);
}

.file {
  color: var(--cyan);
  margin-bottom: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.frame {
  color: var(--yellow);
}

.stack {
  font-size: 13px;
  color: var(--dim);
}

.tip {
  font-size: 13px;
  color: #999;
  border-top: 1px dotted #999;
  padding-top: 13px;
  line-height: 1.8;
}

code {
  font-size: 13px;
  font-family: var(--monospace);
  color: var(--yellow);
}

.file-link {
  text-decoration: underline;
  cursor: pointer;
}

kbd {
  line-height: 1.5;
  font-family: ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.75rem;
  font-weight: 700;
  background-color: rgb(38, 40, 44);
  color: rgb(166, 167, 171);
  padding: 0.15rem 0.3rem;
  border-radius: 0.25rem;
  border-width: 0.0625rem 0.0625rem 0.1875rem;
  border-style: solid;
  border-color: rgb(54, 57, 64);
  border-image: initial;
}
`;
// Error Template
let template;
const createTemplate = () => h('div', { class: 'backdrop', part: 'backdrop' }, h('div', { class: 'window', part: 'window' }, h('pre', { class: 'message', part: 'message' }, h('span', { class: 'plugin', part: 'plugin' }), h('span', { class: 'message-body', part: 'message-body' })), h('pre', { class: 'file', part: 'file' }), h('pre', { class: 'frame', part: 'frame' }), h('pre', { class: 'stack', part: 'stack' }), h('div', { class: 'tip', part: 'tip' }, 'Click outside, press ', h('kbd', {}, 'Esc'), ' key, or fix the code to dismiss.', h('br'), 'You can also disable this overlay by setting ', h('code', { part: 'config-option-name' }, 'server.hmr.overlay'), ' to ', h('code', { part: 'config-option-value' }, 'false'), ' in ', h('code', { part: 'config-file-name' }, hmrConfigName), '.')), h('style', {}, templateStyle));
const fileRE = /(?:[a-zA-Z]:\\|\/).*?:\d+:\d+/g;
const codeframeRE = /^(?:>?\s*\d+\s+\|.*|\s+\|\s*\^.*)\r?\n/gm;
// Allow `ErrorOverlay` to extend `HTMLElement` even in environments where
// `HTMLElement` was not originally defined.
const { HTMLElement = class {
} } = globalThis;
class ErrorOverlay extends HTMLElement {
    constructor(err, links = true) {
        var _a;
        super();
        this.root = this.attachShadow({ mode: 'open' });
        template !== null && template !== void 0 ? template : (template = createTemplate());
        this.root.appendChild(template);
        codeframeRE.lastIndex = 0;
        const hasFrame = err.frame && codeframeRE.test(err.frame);
        const message = hasFrame
            ? err.message.replace(codeframeRE, '')
            : err.message;
        if (err.plugin) {
            this.text('.plugin', `[plugin:${err.plugin}] `);
        }
        this.text('.message-body', message.trim());
        const [file] = (((_a = err.loc) === null || _a === void 0 ? void 0 : _a.file) || err.id || 'unknown file').split(`?`);
        if (err.loc) {
            this.text('.file', `${file}:${err.loc.line}:${err.loc.column}`, links);
        }
        else if (err.id) {
            this.text('.file', file);
        }
        if (hasFrame) {
            this.text('.frame', err.frame.trim());
        }
        this.text('.stack', err.stack, links);
        this.root.querySelector('.window').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        this.addEventListener('click', () => {
            this.close();
        });
        this.closeOnEsc = (e) => {
            if (e.key === 'Escape' || e.code === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.closeOnEsc);
    }
    text(selector, text, linkFiles = false) {
        const el = this.root.querySelector(selector);
        if (!linkFiles) {
            el.textContent = text;
        }
        else {
            let curIndex = 0;
            let match;
            fileRE.lastIndex = 0;
            while ((match = fileRE.exec(text))) {
                const { 0: file, index } = match;
                if (index != null) {
                    const frag = text.slice(curIndex, index);
                    el.appendChild(document.createTextNode(frag));
                    const link = document.createElement('a');
                    link.textContent = file;
                    link.className = 'file-link';
                    link.onclick = () => {
                        fetch(new URL(`${base$1}__open-in-editor?file=${encodeURIComponent(file)}`, import.meta.url));
                    };
                    el.appendChild(link);
                    curIndex += frag.length + file.length;
                }
            }
        }
    }
    close() {
        var _a;
        (_a = this.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this);
        document.removeEventListener('keydown', this.closeOnEsc);
    }
}
const overlayId = 'vite-error-overlay';
const { customElements } = globalThis; // Ensure `customElements` is defined before the next line.
if (customElements && !customElements.get(overlayId)) {
    customElements.define(overlayId, ErrorOverlay);
}

var _a;
console.debug('[vite] connecting...');
const importMetaUrl = new URL(import.meta.url);
// use server configuration, then fallback to inference
const serverHost = "localhost:undefined/";
const socketProtocol = null || (importMetaUrl.protocol === 'https:' ? 'wss' : 'ws');
const hmrPort = null;
const socketHost = `${null || importMetaUrl.hostname}:${hmrPort || importMetaUrl.port}${"/"}`;
const directSocketHost = "localhost:undefined/";
const base = "/" || '/';
let socket;
try {
    let fallback;
    // only use fallback when port is inferred to prevent confusion
    if (!hmrPort) {
        fallback = () => {
            // fallback to connecting directly to the hmr server
            // for servers which does not support proxying websocket
            socket = setupWebSocket(socketProtocol, directSocketHost, () => {
                const currentScriptHostURL = new URL(import.meta.url);
                const currentScriptHost = currentScriptHostURL.host +
                    currentScriptHostURL.pathname.replace(/@vite\/client$/, '');
                console.error('[vite] failed to connect to websocket.\n' +
                    'your current setup:\n' +
                    `  (browser) ${currentScriptHost} <--[HTTP]--> ${serverHost} (server)\n` +
                    `  (browser) ${socketHost} <--[WebSocket (failing)]--> ${directSocketHost} (server)\n` +
                    'Check out your Vite / network configuration and https://vitejs.dev/config/server-options.html#server-hmr .');
            });
            socket.addEventListener('open', () => {
                console.info('[vite] Direct websocket connection fallback. Check out https://vitejs.dev/config/server-options.html#server-hmr to remove the previous connection error.');
            }, { once: true });
        };
    }
    socket = setupWebSocket(socketProtocol, socketHost, fallback);
}
catch (error) {
    console.error(`[vite] failed to connect to websocket (${error}). `);
}
function setupWebSocket(protocol, hostAndPath, onCloseWithoutOpen) {
    const socket = new WebSocket(`${protocol}://${hostAndPath}`, 'vite-hmr');
    let isOpened = false;
    socket.addEventListener('open', () => {
        isOpened = true;
        notifyListeners('vite:ws:connect', { webSocket: socket });
    }, { once: true });
    // Listen for messages
    socket.addEventListener('message', async ({ data }) => {
        handleMessage(JSON.parse(data));
    });
    // ping server
    socket.addEventListener('close', async ({ wasClean }) => {
        if (wasClean)
            return;
        if (!isOpened && onCloseWithoutOpen) {
            onCloseWithoutOpen();
            return;
        }
        notifyListeners('vite:ws:disconnect', { webSocket: socket });
        if (hasDocument) {
            console.log(`[vite] server connection lost. polling for restart...`);
            await waitForSuccessfulPing(protocol, hostAndPath);
            location.reload();
        }
    });
    return socket;
}
function cleanUrl(pathname) {
    const url = new URL(pathname, 'http://vitejs.dev');
    url.searchParams.delete('direct');
    return url.pathname + url.search;
}
let isFirstUpdate = true;
const outdatedLinkTags = new WeakSet();
const debounceReload = (time) => {
    let timer;
    return () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        timer = setTimeout(() => {
            location.reload();
        }, time);
    };
};
const pageReload = debounceReload(50);
const hmrClient = new HMRClient(console, {
    isReady: () => socket && socket.readyState === 1,
    send: (message) => socket.send(message),
}, async function importUpdatedModule({ acceptedPath, timestamp, explicitImportRequired, isWithinCircularImport, }) {
    const [acceptedPathWithoutQuery, query] = acceptedPath.split(`?`);
    const importPromise = import(
    /* @vite-ignore */
    base +
        acceptedPathWithoutQuery.slice(1) +
        `?${explicitImportRequired ? 'import&' : ''}t=${timestamp}${query ? `&${query}` : ''}`);
    if (isWithinCircularImport) {
        importPromise.catch(() => {
            console.info(`[hmr] ${acceptedPath} failed to apply HMR as it's within a circular import. Reloading page to reset the execution order. ` +
                `To debug and break the circular import, you can run \`vite --debug hmr\` to log the circular dependency path if a file change triggered it.`);
            pageReload();
        });
    }
    return await importPromise;
});
async function handleMessage(payload) {
    switch (payload.type) {
        case 'connected':
            console.debug(`[vite] connected.`);
            hmrClient.messenger.flush();
            // proxy(nginx, docker) hmr ws maybe caused timeout,
            // so send ping package let ws keep alive.
            setInterval(() => {
                if (socket.readyState === socket.OPEN) {
                    socket.send('{"type":"ping"}');
                }
            }, 30000);
            break;
        case 'update':
            notifyListeners('vite:beforeUpdate', payload);
            if (hasDocument) {
                // if this is the first update and there's already an error overlay, it
                // means the page opened with existing server compile error and the whole
                // module script failed to load (since one of the nested imports is 500).
                // in this case a normal update won't work and a full reload is needed.
                if (isFirstUpdate && hasErrorOverlay()) {
                    window.location.reload();
                    return;
                }
                else {
                    if (enableOverlay) {
                        clearErrorOverlay();
                    }
                    isFirstUpdate = false;
                }
            }
            await Promise.all(payload.updates.map(async (update) => {
                if (update.type === 'js-update') {
                    return hmrClient.queueUpdate(update);
                }
                // css-update
                // this is only sent when a css file referenced with <link> is updated
                const { path, timestamp } = update;
                const searchUrl = cleanUrl(path);
                // can't use querySelector with `[href*=]` here since the link may be
                // using relative paths so we need to use link.href to grab the full
                // URL for the include check.
                const el = Array.from(document.querySelectorAll('link')).find((e) => !outdatedLinkTags.has(e) && cleanUrl(e.href).includes(searchUrl));
                if (!el) {
                    return;
                }
                const newPath = `${base}${searchUrl.slice(1)}${searchUrl.includes('?') ? '&' : '?'}t=${timestamp}`;
                // rather than swapping the href on the existing tag, we will
                // create a new link tag. Once the new stylesheet has loaded we
                // will remove the existing link tag. This removes a Flash Of
                // Unstyled Content that can occur when swapping out the tag href
                // directly, as the new stylesheet has not yet been loaded.
                return new Promise((resolve) => {
                    const newLinkTag = el.cloneNode();
                    newLinkTag.href = new URL(newPath, el.href).href;
                    const removeOldEl = () => {
                        el.remove();
                        console.debug(`[vite] css hot updated: ${searchUrl}`);
                        resolve();
                    };
                    newLinkTag.addEventListener('load', removeOldEl);
                    newLinkTag.addEventListener('error', removeOldEl);
                    outdatedLinkTags.add(el);
                    el.after(newLinkTag);
                });
            }));
            notifyListeners('vite:afterUpdate', payload);
            break;
        case 'custom': {
            notifyListeners(payload.event, payload.data);
            break;
        }
        case 'full-reload':
            notifyListeners('vite:beforeFullReload', payload);
            if (hasDocument) {
                if (payload.path && payload.path.endsWith('.html')) {
                    // if html file is edited, only reload the page if the browser is
                    // currently on that page.
                    const pagePath = decodeURI(location.pathname);
                    const payloadPath = base + payload.path.slice(1);
                    if (pagePath === payloadPath ||
                        payload.path === '/index.html' ||
                        (pagePath.endsWith('/') && pagePath + 'index.html' === payloadPath)) {
                        pageReload();
                    }
                    return;
                }
                else {
                    pageReload();
                }
            }
            break;
        case 'prune':
            notifyListeners('vite:beforePrune', payload);
            await hmrClient.prunePaths(payload.paths);
            break;
        case 'error': {
            notifyListeners('vite:error', payload);
            if (hasDocument) {
                const err = payload.err;
                if (enableOverlay) {
                    createErrorOverlay(err);
                }
                else {
                    console.error(`[vite] Internal Server Error\n${err.message}\n${err.stack}`);
                }
            }
            break;
        }
        default: {
            const check = payload;
            return check;
        }
    }
}
function notifyListeners(event, data) {
    hmrClient.notifyListeners(event, data);
}
const enableOverlay = true;
const hasDocument = 'document' in globalThis;
function createErrorOverlay(err) {
    clearErrorOverlay();
    document.body.appendChild(new ErrorOverlay(err));
}
function clearErrorOverlay() {
    document.querySelectorAll(overlayId).forEach((n) => n.close());
}
function hasErrorOverlay() {
    return document.querySelectorAll(overlayId).length;
}
async function waitForSuccessfulPing(socketProtocol, hostAndPath, ms = 1000) {
    const pingHostProtocol = socketProtocol === 'wss' ? 'https' : 'http';
    const ping = async () => {
        // A fetch on a websocket URL will return a successful promise with status 400,
        // but will reject a networking error.
        // When running on middleware mode, it returns status 426, and an cors error happens if mode is not no-cors
        try {
            await fetch(`${pingHostProtocol}://${hostAndPath}`, {
                mode: 'no-cors',
                headers: {
                    // Custom headers won't be included in a request with no-cors so (ab)use one of the
                    // safelisted headers to identify the ping request
                    Accept: 'text/x-vite-ping',
                },
            });
            return true;
        }
        catch { }
        return false;
    };
    if (await ping()) {
        return;
    }
    await wait(ms);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (document.visibilityState === 'visible') {
            if (await ping()) {
                break;
            }
            await wait(ms);
        }
        else {
            await waitForWindowShow();
        }
    }
}
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function waitForWindowShow() {
    return new Promise((resolve) => {
        const onChange = async () => {
            if (document.visibilityState === 'visible') {
                resolve();
                document.removeEventListener('visibilitychange', onChange);
            }
        };
        document.addEventListener('visibilitychange', onChange);
    });
}
const sheetsMap = new Map();
// collect existing style elements that may have been inserted during SSR
// to avoid FOUC or duplicate styles
if ('document' in globalThis) {
    document
        .querySelectorAll('style[data-vite-dev-id]')
        .forEach((el) => {
        sheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
    });
}
const cspNonce = 'document' in globalThis
    ? (_a = document.querySelector('meta[property=csp-nonce]')) === null || _a === void 0 ? void 0 : _a.nonce
    : undefined;
// all css imports should be inserted at the same position
// because after build it will be a single css file
let lastInsertedStyle;
function updateStyle(id, content) {
    let style = sheetsMap.get(id);
    if (!style) {
        style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.setAttribute('data-vite-dev-id', id);
        style.textContent = content;
        if (cspNonce) {
            style.setAttribute('nonce', cspNonce);
        }
        if (!lastInsertedStyle) {
            document.head.appendChild(style);
            // reset lastInsertedStyle after async
            // because dynamically imported css will be splitted into a different file
            setTimeout(() => {
                lastInsertedStyle = undefined;
            }, 0);
        }
        else {
            lastInsertedStyle.insertAdjacentElement('afterend', style);
        }
        lastInsertedStyle = style;
    }
    else {
        style.textContent = content;
    }
    sheetsMap.set(id, style);
}
function removeStyle(id) {
    const style = sheetsMap.get(id);
    if (style) {
        document.head.removeChild(style);
        sheetsMap.delete(id);
    }
}
function createHotContext(ownerPath) {
    return new HMRContext(hmrClient, ownerPath);
}
/**
 * urls here are dynamic import() urls that couldn't be statically analyzed
 */
function injectQuery(url, queryToInject) {
    // skip urls that won't be handled by vite
    if (url[0] !== '.' && url[0] !== '/') {
        return url;
    }
    // can't use pathname from URL since it may be relative like ../
    const pathname = url.replace(/[?#].*$/, '');
    const { search, hash } = new URL(url, 'http://vitejs.dev');
    return `${pathname}?${queryToInject}${search ? `&` + search.slice(1) : ''}${hash || ''}`;
}

export { ErrorOverlay, createHotContext, injectQuery, removeStyle, updateStyle };
                                   

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50Lm1qcyIsInNvdXJjZXMiOlsiaG1yLnRzIiwib3ZlcmxheS50cyIsImNsaWVudC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IFVwZGF0ZSB9IGZyb20gJ3R5cGVzL2htclBheWxvYWQnXG5pbXBvcnQgdHlwZSB7IE1vZHVsZU5hbWVzcGFjZSwgVml0ZUhvdENvbnRleHQgfSBmcm9tICd0eXBlcy9ob3QnXG5pbXBvcnQgdHlwZSB7IEluZmVyQ3VzdG9tRXZlbnRQYXlsb2FkIH0gZnJvbSAndHlwZXMvY3VzdG9tRXZlbnQnXG5cbnR5cGUgQ3VzdG9tTGlzdGVuZXJzTWFwID0gTWFwPHN0cmluZywgKChkYXRhOiBhbnkpID0+IHZvaWQpW10+XG5cbmludGVyZmFjZSBIb3RNb2R1bGUge1xuICBpZDogc3RyaW5nXG4gIGNhbGxiYWNrczogSG90Q2FsbGJhY2tbXVxufVxuXG5pbnRlcmZhY2UgSG90Q2FsbGJhY2sge1xuICAvLyB0aGUgZGVwZW5kZW5jaWVzIG11c3QgYmUgZmV0Y2hhYmxlIHBhdGhzXG4gIGRlcHM6IHN0cmluZ1tdXG4gIGZuOiAobW9kdWxlczogQXJyYXk8TW9kdWxlTmFtZXNwYWNlIHwgdW5kZWZpbmVkPikgPT4gdm9pZFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEhNUkxvZ2dlciB7XG4gIGVycm9yKG1zZzogc3RyaW5nIHwgRXJyb3IpOiB2b2lkXG4gIGRlYnVnKC4uLm1zZzogdW5rbm93bltdKTogdm9pZFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEhNUkNvbm5lY3Rpb24ge1xuICAvKipcbiAgICogQ2hlY2tlZCBiZWZvcmUgc2VuZGluZyBtZXNzYWdlcyB0byB0aGUgY2xpZW50LlxuICAgKi9cbiAgaXNSZWFkeSgpOiBib29sZWFuXG4gIC8qKlxuICAgKiBTZW5kIG1lc3NhZ2UgdG8gdGhlIGNsaWVudC5cbiAgICovXG4gIHNlbmQobWVzc2FnZXM6IHN0cmluZyk6IHZvaWRcbn1cblxuZXhwb3J0IGNsYXNzIEhNUkNvbnRleHQgaW1wbGVtZW50cyBWaXRlSG90Q29udGV4dCB7XG4gIHByaXZhdGUgbmV3TGlzdGVuZXJzOiBDdXN0b21MaXN0ZW5lcnNNYXBcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIGhtckNsaWVudDogSE1SQ2xpZW50LFxuICAgIHByaXZhdGUgb3duZXJQYXRoOiBzdHJpbmcsXG4gICkge1xuICAgIGlmICghaG1yQ2xpZW50LmRhdGFNYXAuaGFzKG93bmVyUGF0aCkpIHtcbiAgICAgIGhtckNsaWVudC5kYXRhTWFwLnNldChvd25lclBhdGgsIHt9KVxuICAgIH1cblxuICAgIC8vIHdoZW4gYSBmaWxlIGlzIGhvdCB1cGRhdGVkLCBhIG5ldyBjb250ZXh0IGlzIGNyZWF0ZWRcbiAgICAvLyBjbGVhciBpdHMgc3RhbGUgY2FsbGJhY2tzXG4gICAgY29uc3QgbW9kID0gaG1yQ2xpZW50LmhvdE1vZHVsZXNNYXAuZ2V0KG93bmVyUGF0aClcbiAgICBpZiAobW9kKSB7XG4gICAgICBtb2QuY2FsbGJhY2tzID0gW11cbiAgICB9XG5cbiAgICAvLyBjbGVhciBzdGFsZSBjdXN0b20gZXZlbnQgbGlzdGVuZXJzXG4gICAgY29uc3Qgc3RhbGVMaXN0ZW5lcnMgPSBobXJDbGllbnQuY3R4VG9MaXN0ZW5lcnNNYXAuZ2V0KG93bmVyUGF0aClcbiAgICBpZiAoc3RhbGVMaXN0ZW5lcnMpIHtcbiAgICAgIGZvciAoY29uc3QgW2V2ZW50LCBzdGFsZUZuc10gb2Ygc3RhbGVMaXN0ZW5lcnMpIHtcbiAgICAgICAgY29uc3QgbGlzdGVuZXJzID0gaG1yQ2xpZW50LmN1c3RvbUxpc3RlbmVyc01hcC5nZXQoZXZlbnQpXG4gICAgICAgIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAgICAgICBobXJDbGllbnQuY3VzdG9tTGlzdGVuZXJzTWFwLnNldChcbiAgICAgICAgICAgIGV2ZW50LFxuICAgICAgICAgICAgbGlzdGVuZXJzLmZpbHRlcigobCkgPT4gIXN0YWxlRm5zLmluY2x1ZGVzKGwpKSxcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLm5ld0xpc3RlbmVycyA9IG5ldyBNYXAoKVxuICAgIGhtckNsaWVudC5jdHhUb0xpc3RlbmVyc01hcC5zZXQob3duZXJQYXRoLCB0aGlzLm5ld0xpc3RlbmVycylcbiAgfVxuXG4gIGdldCBkYXRhKCk6IGFueSB7XG4gICAgcmV0dXJuIHRoaXMuaG1yQ2xpZW50LmRhdGFNYXAuZ2V0KHRoaXMub3duZXJQYXRoKVxuICB9XG5cbiAgYWNjZXB0KGRlcHM/OiBhbnksIGNhbGxiYWNrPzogYW55KTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiBkZXBzID09PSAnZnVuY3Rpb24nIHx8ICFkZXBzKSB7XG4gICAgICAvLyBzZWxmLWFjY2VwdDogaG90LmFjY2VwdCgoKSA9PiB7fSlcbiAgICAgIHRoaXMuYWNjZXB0RGVwcyhbdGhpcy5vd25lclBhdGhdLCAoW21vZF0pID0+IGRlcHM/Lihtb2QpKVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlcHMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBleHBsaWNpdCBkZXBzXG4gICAgICB0aGlzLmFjY2VwdERlcHMoW2RlcHNdLCAoW21vZF0pID0+IGNhbGxiYWNrPy4obW9kKSlcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZGVwcykpIHtcbiAgICAgIHRoaXMuYWNjZXB0RGVwcyhkZXBzLCBjYWxsYmFjaylcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIGhvdC5hY2NlcHQoKSB1c2FnZS5gKVxuICAgIH1cbiAgfVxuXG4gIC8vIGV4cG9ydCBuYW1lcyAoZmlyc3QgYXJnKSBhcmUgaXJyZWxldmFudCBvbiB0aGUgY2xpZW50IHNpZGUsIHRoZXkncmVcbiAgLy8gZXh0cmFjdGVkIGluIHRoZSBzZXJ2ZXIgZm9yIHByb3BhZ2F0aW9uXG4gIGFjY2VwdEV4cG9ydHMoXG4gICAgXzogc3RyaW5nIHwgcmVhZG9ubHkgc3RyaW5nW10sXG4gICAgY2FsbGJhY2s6IChkYXRhOiBhbnkpID0+IHZvaWQsXG4gICk6IHZvaWQge1xuICAgIHRoaXMuYWNjZXB0RGVwcyhbdGhpcy5vd25lclBhdGhdLCAoW21vZF0pID0+IGNhbGxiYWNrPy4obW9kKSlcbiAgfVxuXG4gIGRpc3Bvc2UoY2I6IChkYXRhOiBhbnkpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLmhtckNsaWVudC5kaXNwb3NlTWFwLnNldCh0aGlzLm93bmVyUGF0aCwgY2IpXG4gIH1cblxuICBwcnVuZShjYjogKGRhdGE6IGFueSkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuaG1yQ2xpZW50LnBydW5lTWFwLnNldCh0aGlzLm93bmVyUGF0aCwgY2IpXG4gIH1cblxuICAvLyBLZXB0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5ICgjMTEwMzYpXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktZnVuY3Rpb25cbiAgZGVjbGluZSgpOiB2b2lkIHt9XG5cbiAgaW52YWxpZGF0ZShtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmhtckNsaWVudC5ub3RpZnlMaXN0ZW5lcnMoJ3ZpdGU6aW52YWxpZGF0ZScsIHtcbiAgICAgIHBhdGg6IHRoaXMub3duZXJQYXRoLFxuICAgICAgbWVzc2FnZSxcbiAgICB9KVxuICAgIHRoaXMuc2VuZCgndml0ZTppbnZhbGlkYXRlJywgeyBwYXRoOiB0aGlzLm93bmVyUGF0aCwgbWVzc2FnZSB9KVxuICAgIHRoaXMuaG1yQ2xpZW50LmxvZ2dlci5kZWJ1ZyhcbiAgICAgIGBbdml0ZV0gaW52YWxpZGF0ZSAke3RoaXMub3duZXJQYXRofSR7bWVzc2FnZSA/IGA6ICR7bWVzc2FnZX1gIDogJyd9YCxcbiAgICApXG4gIH1cblxuICBvbjxUIGV4dGVuZHMgc3RyaW5nPihcbiAgICBldmVudDogVCxcbiAgICBjYjogKHBheWxvYWQ6IEluZmVyQ3VzdG9tRXZlbnRQYXlsb2FkPFQ+KSA9PiB2b2lkLFxuICApOiB2b2lkIHtcbiAgICBjb25zdCBhZGRUb01hcCA9IChtYXA6IE1hcDxzdHJpbmcsIGFueVtdPikgPT4ge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBtYXAuZ2V0KGV2ZW50KSB8fCBbXVxuICAgICAgZXhpc3RpbmcucHVzaChjYilcbiAgICAgIG1hcC5zZXQoZXZlbnQsIGV4aXN0aW5nKVxuICAgIH1cbiAgICBhZGRUb01hcCh0aGlzLmhtckNsaWVudC5jdXN0b21MaXN0ZW5lcnNNYXApXG4gICAgYWRkVG9NYXAodGhpcy5uZXdMaXN0ZW5lcnMpXG4gIH1cblxuICBvZmY8VCBleHRlbmRzIHN0cmluZz4oXG4gICAgZXZlbnQ6IFQsXG4gICAgY2I6IChwYXlsb2FkOiBJbmZlckN1c3RvbUV2ZW50UGF5bG9hZDxUPikgPT4gdm9pZCxcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcmVtb3ZlRnJvbU1hcCA9IChtYXA6IE1hcDxzdHJpbmcsIGFueVtdPikgPT4ge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBtYXAuZ2V0KGV2ZW50KVxuICAgICAgaWYgKGV4aXN0aW5nID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBjb25zdCBwcnVuZWQgPSBleGlzdGluZy5maWx0ZXIoKGwpID0+IGwgIT09IGNiKVxuICAgICAgaWYgKHBydW5lZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbWFwLmRlbGV0ZShldmVudClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBtYXAuc2V0KGV2ZW50LCBwcnVuZWQpXG4gICAgfVxuICAgIHJlbW92ZUZyb21NYXAodGhpcy5obXJDbGllbnQuY3VzdG9tTGlzdGVuZXJzTWFwKVxuICAgIHJlbW92ZUZyb21NYXAodGhpcy5uZXdMaXN0ZW5lcnMpXG4gIH1cblxuICBzZW5kPFQgZXh0ZW5kcyBzdHJpbmc+KGV2ZW50OiBULCBkYXRhPzogSW5mZXJDdXN0b21FdmVudFBheWxvYWQ8VD4pOiB2b2lkIHtcbiAgICB0aGlzLmhtckNsaWVudC5tZXNzZW5nZXIuc2VuZChcbiAgICAgIEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2N1c3RvbScsIGV2ZW50LCBkYXRhIH0pLFxuICAgIClcbiAgfVxuXG4gIHByaXZhdGUgYWNjZXB0RGVwcyhcbiAgICBkZXBzOiBzdHJpbmdbXSxcbiAgICBjYWxsYmFjazogSG90Q2FsbGJhY2tbJ2ZuJ10gPSAoKSA9PiB7fSxcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgbW9kOiBIb3RNb2R1bGUgPSB0aGlzLmhtckNsaWVudC5ob3RNb2R1bGVzTWFwLmdldCh0aGlzLm93bmVyUGF0aCkgfHwge1xuICAgICAgaWQ6IHRoaXMub3duZXJQYXRoLFxuICAgICAgY2FsbGJhY2tzOiBbXSxcbiAgICB9XG4gICAgbW9kLmNhbGxiYWNrcy5wdXNoKHtcbiAgICAgIGRlcHMsXG4gICAgICBmbjogY2FsbGJhY2ssXG4gICAgfSlcbiAgICB0aGlzLmhtckNsaWVudC5ob3RNb2R1bGVzTWFwLnNldCh0aGlzLm93bmVyUGF0aCwgbW9kKVxuICB9XG59XG5cbmNsYXNzIEhNUk1lc3NlbmdlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY29ubmVjdGlvbjogSE1SQ29ubmVjdGlvbikge31cblxuICBwcml2YXRlIHF1ZXVlOiBzdHJpbmdbXSA9IFtdXG5cbiAgcHVibGljIHNlbmQobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5xdWV1ZS5wdXNoKG1lc3NhZ2UpXG4gICAgdGhpcy5mbHVzaCgpXG4gIH1cblxuICBwdWJsaWMgZmx1c2goKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY29ubmVjdGlvbi5pc1JlYWR5KCkpIHtcbiAgICAgIHRoaXMucXVldWUuZm9yRWFjaCgobXNnKSA9PiB0aGlzLmNvbm5lY3Rpb24uc2VuZChtc2cpKVxuICAgICAgdGhpcy5xdWV1ZSA9IFtdXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBITVJDbGllbnQge1xuICBwdWJsaWMgaG90TW9kdWxlc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBIb3RNb2R1bGU+KClcbiAgcHVibGljIGRpc3Bvc2VNYXAgPSBuZXcgTWFwPHN0cmluZywgKGRhdGE6IGFueSkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4+KClcbiAgcHVibGljIHBydW5lTWFwID0gbmV3IE1hcDxzdHJpbmcsIChkYXRhOiBhbnkpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+PigpXG4gIHB1YmxpYyBkYXRhTWFwID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKVxuICBwdWJsaWMgY3VzdG9tTGlzdGVuZXJzTWFwOiBDdXN0b21MaXN0ZW5lcnNNYXAgPSBuZXcgTWFwKClcbiAgcHVibGljIGN0eFRvTGlzdGVuZXJzTWFwID0gbmV3IE1hcDxzdHJpbmcsIEN1c3RvbUxpc3RlbmVyc01hcD4oKVxuXG4gIHB1YmxpYyBtZXNzZW5nZXI6IEhNUk1lc3NlbmdlclxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBsb2dnZXI6IEhNUkxvZ2dlcixcbiAgICBjb25uZWN0aW9uOiBITVJDb25uZWN0aW9uLFxuICAgIC8vIFRoaXMgYWxsb3dzIGltcGxlbWVudGluZyByZWxvYWRpbmcgdmlhIGRpZmZlcmVudCBtZXRob2RzIGRlcGVuZGluZyBvbiB0aGUgZW52aXJvbm1lbnRcbiAgICBwcml2YXRlIGltcG9ydFVwZGF0ZWRNb2R1bGU6ICh1cGRhdGU6IFVwZGF0ZSkgPT4gUHJvbWlzZTxNb2R1bGVOYW1lc3BhY2U+LFxuICApIHtcbiAgICB0aGlzLm1lc3NlbmdlciA9IG5ldyBITVJNZXNzZW5nZXIoY29ubmVjdGlvbilcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBub3RpZnlMaXN0ZW5lcnM8VCBleHRlbmRzIHN0cmluZz4oXG4gICAgZXZlbnQ6IFQsXG4gICAgZGF0YTogSW5mZXJDdXN0b21FdmVudFBheWxvYWQ8VD4sXG4gICk6IFByb21pc2U8dm9pZD5cbiAgcHVibGljIGFzeW5jIG5vdGlmeUxpc3RlbmVycyhldmVudDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjYnMgPSB0aGlzLmN1c3RvbUxpc3RlbmVyc01hcC5nZXQoZXZlbnQpXG4gICAgaWYgKGNicykge1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKGNicy5tYXAoKGNiKSA9PiBjYihkYXRhKSkpXG4gICAgfVxuICB9XG5cbiAgcHVibGljIGNsZWFyKCk6IHZvaWQge1xuICAgIHRoaXMuaG90TW9kdWxlc01hcC5jbGVhcigpXG4gICAgdGhpcy5kaXNwb3NlTWFwLmNsZWFyKClcbiAgICB0aGlzLnBydW5lTWFwLmNsZWFyKClcbiAgICB0aGlzLmRhdGFNYXAuY2xlYXIoKVxuICAgIHRoaXMuY3VzdG9tTGlzdGVuZXJzTWFwLmNsZWFyKClcbiAgICB0aGlzLmN0eFRvTGlzdGVuZXJzTWFwLmNsZWFyKClcbiAgfVxuXG4gIC8vIEFmdGVyIGFuIEhNUiB1cGRhdGUsIHNvbWUgbW9kdWxlcyBhcmUgbm8gbG9uZ2VyIGltcG9ydGVkIG9uIHRoZSBwYWdlXG4gIC8vIGJ1dCB0aGV5IG1heSBoYXZlIGxlZnQgYmVoaW5kIHNpZGUgZWZmZWN0cyB0aGF0IG5lZWQgdG8gYmUgY2xlYW5lZCB1cFxuICAvLyAoLmUuZyBzdHlsZSBpbmplY3Rpb25zKVxuICBwdWJsaWMgYXN5bmMgcHJ1bmVQYXRocyhwYXRoczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIHBhdGhzLm1hcCgocGF0aCkgPT4ge1xuICAgICAgICBjb25zdCBkaXNwb3NlciA9IHRoaXMuZGlzcG9zZU1hcC5nZXQocGF0aClcbiAgICAgICAgaWYgKGRpc3Bvc2VyKSByZXR1cm4gZGlzcG9zZXIodGhpcy5kYXRhTWFwLmdldChwYXRoKSlcbiAgICAgIH0pLFxuICAgIClcbiAgICBwYXRocy5mb3JFYWNoKChwYXRoKSA9PiB7XG4gICAgICBjb25zdCBmbiA9IHRoaXMucHJ1bmVNYXAuZ2V0KHBhdGgpXG4gICAgICBpZiAoZm4pIHtcbiAgICAgICAgZm4odGhpcy5kYXRhTWFwLmdldChwYXRoKSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgcHJvdGVjdGVkIHdhcm5GYWlsZWRVcGRhdGUoZXJyOiBFcnJvciwgcGF0aDogc3RyaW5nIHwgc3RyaW5nW10pOiB2b2lkIHtcbiAgICBpZiAoIWVyci5tZXNzYWdlLmluY2x1ZGVzKCdmZXRjaCcpKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihlcnIpXG4gICAgfVxuICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgYFtobXJdIEZhaWxlZCB0byByZWxvYWQgJHtwYXRofS4gYCArXG4gICAgICAgIGBUaGlzIGNvdWxkIGJlIGR1ZSB0byBzeW50YXggZXJyb3JzIG9yIGltcG9ydGluZyBub24tZXhpc3RlbnQgYCArXG4gICAgICAgIGBtb2R1bGVzLiAoc2VlIGVycm9ycyBhYm92ZSlgLFxuICAgIClcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlUXVldWU6IFByb21pc2U8KCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkPltdID0gW11cbiAgcHJpdmF0ZSBwZW5kaW5nVXBkYXRlUXVldWUgPSBmYWxzZVxuXG4gIC8qKlxuICAgKiBidWZmZXIgbXVsdGlwbGUgaG90IHVwZGF0ZXMgdHJpZ2dlcmVkIGJ5IHRoZSBzYW1lIHNyYyBjaGFuZ2VcbiAgICogc28gdGhhdCB0aGV5IGFyZSBpbnZva2VkIGluIHRoZSBzYW1lIG9yZGVyIHRoZXkgd2VyZSBzZW50LlxuICAgKiAob3RoZXJ3aXNlIHRoZSBvcmRlciBtYXkgYmUgaW5jb25zaXN0ZW50IGJlY2F1c2Ugb2YgdGhlIGh0dHAgcmVxdWVzdCByb3VuZCB0cmlwKVxuICAgKi9cbiAgcHVibGljIGFzeW5jIHF1ZXVlVXBkYXRlKHBheWxvYWQ6IFVwZGF0ZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMudXBkYXRlUXVldWUucHVzaCh0aGlzLmZldGNoVXBkYXRlKHBheWxvYWQpKVxuICAgIGlmICghdGhpcy5wZW5kaW5nVXBkYXRlUXVldWUpIHtcbiAgICAgIHRoaXMucGVuZGluZ1VwZGF0ZVF1ZXVlID0gdHJ1ZVxuICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgIHRoaXMucGVuZGluZ1VwZGF0ZVF1ZXVlID0gZmFsc2VcbiAgICAgIGNvbnN0IGxvYWRpbmcgPSBbLi4udGhpcy51cGRhdGVRdWV1ZV1cbiAgICAgIHRoaXMudXBkYXRlUXVldWUgPSBbXVxuICAgICAgOyhhd2FpdCBQcm9taXNlLmFsbChsb2FkaW5nKSkuZm9yRWFjaCgoZm4pID0+IGZuICYmIGZuKCkpXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaFVwZGF0ZSh1cGRhdGU6IFVwZGF0ZSk6IFByb21pc2U8KCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgeyBwYXRoLCBhY2NlcHRlZFBhdGggfSA9IHVwZGF0ZVxuICAgIGNvbnN0IG1vZCA9IHRoaXMuaG90TW9kdWxlc01hcC5nZXQocGF0aClcbiAgICBpZiAoIW1vZCkge1xuICAgICAgLy8gSW4gYSBjb2RlLXNwbGl0dGluZyBwcm9qZWN0LFxuICAgICAgLy8gaXQgaXMgY29tbW9uIHRoYXQgdGhlIGhvdC11cGRhdGluZyBtb2R1bGUgaXMgbm90IGxvYWRlZCB5ZXQuXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vdml0ZWpzL3ZpdGUvaXNzdWVzLzcyMVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgbGV0IGZldGNoZWRNb2R1bGU6IE1vZHVsZU5hbWVzcGFjZSB8IHVuZGVmaW5lZFxuICAgIGNvbnN0IGlzU2VsZlVwZGF0ZSA9IHBhdGggPT09IGFjY2VwdGVkUGF0aFxuXG4gICAgLy8gZGV0ZXJtaW5lIHRoZSBxdWFsaWZpZWQgY2FsbGJhY2tzIGJlZm9yZSB3ZSByZS1pbXBvcnQgdGhlIG1vZHVsZXNcbiAgICBjb25zdCBxdWFsaWZpZWRDYWxsYmFja3MgPSBtb2QuY2FsbGJhY2tzLmZpbHRlcigoeyBkZXBzIH0pID0+XG4gICAgICBkZXBzLmluY2x1ZGVzKGFjY2VwdGVkUGF0aCksXG4gICAgKVxuXG4gICAgaWYgKGlzU2VsZlVwZGF0ZSB8fCBxdWFsaWZpZWRDYWxsYmFja3MubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZGlzcG9zZXIgPSB0aGlzLmRpc3Bvc2VNYXAuZ2V0KGFjY2VwdGVkUGF0aClcbiAgICAgIGlmIChkaXNwb3NlcikgYXdhaXQgZGlzcG9zZXIodGhpcy5kYXRhTWFwLmdldChhY2NlcHRlZFBhdGgpKVxuICAgICAgdHJ5IHtcbiAgICAgICAgZmV0Y2hlZE1vZHVsZSA9IGF3YWl0IHRoaXMuaW1wb3J0VXBkYXRlZE1vZHVsZSh1cGRhdGUpXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMud2FybkZhaWxlZFVwZGF0ZShlLCBhY2NlcHRlZFBhdGgpXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGZvciAoY29uc3QgeyBkZXBzLCBmbiB9IG9mIHF1YWxpZmllZENhbGxiYWNrcykge1xuICAgICAgICBmbihcbiAgICAgICAgICBkZXBzLm1hcCgoZGVwKSA9PiAoZGVwID09PSBhY2NlcHRlZFBhdGggPyBmZXRjaGVkTW9kdWxlIDogdW5kZWZpbmVkKSksXG4gICAgICAgIClcbiAgICAgIH1cbiAgICAgIGNvbnN0IGxvZ2dlZFBhdGggPSBpc1NlbGZVcGRhdGUgPyBwYXRoIDogYCR7YWNjZXB0ZWRQYXRofSB2aWEgJHtwYXRofWBcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBbdml0ZV0gaG90IHVwZGF0ZWQ6ICR7bG9nZ2VkUGF0aH1gKVxuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBFcnJvclBheWxvYWQgfSBmcm9tICd0eXBlcy9obXJQYXlsb2FkJ1xuXG4vLyBpbmplY3RlZCBieSB0aGUgaG1yIHBsdWdpbiB3aGVuIHNlcnZlZFxuZGVjbGFyZSBjb25zdCBfX0JBU0VfXzogc3RyaW5nXG5kZWNsYXJlIGNvbnN0IF9fSE1SX0NPTkZJR19OQU1FX186IHN0cmluZ1xuXG5jb25zdCBobXJDb25maWdOYW1lID0gX19ITVJfQ09ORklHX05BTUVfX1xuY29uc3QgYmFzZSA9IF9fQkFTRV9fIHx8ICcvJ1xuXG4vLyBDcmVhdGUgYW4gZWxlbWVudCB3aXRoIHByb3ZpZGVkIGF0dHJpYnV0ZXMgYW5kIG9wdGlvbmFsIGNoaWxkcmVuXG5mdW5jdGlvbiBoKFxuICBlOiBzdHJpbmcsXG4gIGF0dHJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge30sXG4gIC4uLmNoaWxkcmVuOiAoc3RyaW5nIHwgTm9kZSlbXVxuKSB7XG4gIGNvbnN0IGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGUpXG4gIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKGF0dHJzKSkge1xuICAgIGVsZW0uc2V0QXR0cmlidXRlKGssIHYpXG4gIH1cbiAgZWxlbS5hcHBlbmQoLi4uY2hpbGRyZW4pXG4gIHJldHVybiBlbGVtXG59XG5cbi8vIHNldCA6aG9zdCBzdHlsZXMgdG8gbWFrZSBwbGF5d3JpZ2h0IGRldGVjdCB0aGUgZWxlbWVudCBhcyB2aXNpYmxlXG5jb25zdCB0ZW1wbGF0ZVN0eWxlID0gLypjc3MqLyBgXG46aG9zdCB7XG4gIHBvc2l0aW9uOiBmaXhlZDtcbiAgdG9wOiAwO1xuICBsZWZ0OiAwO1xuICB3aWR0aDogMTAwJTtcbiAgaGVpZ2h0OiAxMDAlO1xuICB6LWluZGV4OiA5OTk5OTtcbiAgLS1tb25vc3BhY2U6ICdTRk1vbm8tUmVndWxhcicsIENvbnNvbGFzLFxuICAnTGliZXJhdGlvbiBNb25vJywgTWVubG8sIENvdXJpZXIsIG1vbm9zcGFjZTtcbiAgLS1yZWQ6ICNmZjU1NTU7XG4gIC0teWVsbG93OiAjZTJhYTUzO1xuICAtLXB1cnBsZTogI2NmYTRmZjtcbiAgLS1jeWFuOiAjMmRkOWRhO1xuICAtLWRpbTogI2M5YzljOTtcblxuICAtLXdpbmRvdy1iYWNrZ3JvdW5kOiAjMTgxODE4O1xuICAtLXdpbmRvdy1jb2xvcjogI2Q4ZDhkODtcbn1cblxuLmJhY2tkcm9wIHtcbiAgcG9zaXRpb246IGZpeGVkO1xuICB6LWluZGV4OiA5OTk5OTtcbiAgdG9wOiAwO1xuICBsZWZ0OiAwO1xuICB3aWR0aDogMTAwJTtcbiAgaGVpZ2h0OiAxMDAlO1xuICBvdmVyZmxvdy15OiBzY3JvbGw7XG4gIG1hcmdpbjogMDtcbiAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjY2KTtcbn1cblxuLndpbmRvdyB7XG4gIGZvbnQtZmFtaWx5OiB2YXIoLS1tb25vc3BhY2UpO1xuICBsaW5lLWhlaWdodDogMS41O1xuICBtYXgtd2lkdGg6IDgwdnc7XG4gIGNvbG9yOiB2YXIoLS13aW5kb3ctY29sb3IpO1xuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICBtYXJnaW46IDMwcHggYXV0bztcbiAgcGFkZGluZzogMi41dmggNHZ3O1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGJhY2tncm91bmQ6IHZhcigtLXdpbmRvdy1iYWNrZ3JvdW5kKTtcbiAgYm9yZGVyLXJhZGl1czogNnB4IDZweCA4cHggOHB4O1xuICBib3gtc2hhZG93OiAwIDE5cHggMzhweCByZ2JhKDAsMCwwLDAuMzApLCAwIDE1cHggMTJweCByZ2JhKDAsMCwwLDAuMjIpO1xuICBvdmVyZmxvdzogaGlkZGVuO1xuICBib3JkZXItdG9wOiA4cHggc29saWQgdmFyKC0tcmVkKTtcbiAgZGlyZWN0aW9uOiBsdHI7XG4gIHRleHQtYWxpZ246IGxlZnQ7XG59XG5cbnByZSB7XG4gIGZvbnQtZmFtaWx5OiB2YXIoLS1tb25vc3BhY2UpO1xuICBmb250LXNpemU6IDE2cHg7XG4gIG1hcmdpbi10b3A6IDA7XG4gIG1hcmdpbi1ib3R0b206IDFlbTtcbiAgb3ZlcmZsb3cteDogc2Nyb2xsO1xuICBzY3JvbGxiYXItd2lkdGg6IG5vbmU7XG59XG5cbnByZTo6LXdlYmtpdC1zY3JvbGxiYXIge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG5wcmUuZnJhbWU6Oi13ZWJraXQtc2Nyb2xsYmFyIHtcbiAgZGlzcGxheTogYmxvY2s7XG4gIGhlaWdodDogNXB4O1xufVxuXG5wcmUuZnJhbWU6Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iIHtcbiAgYmFja2dyb3VuZDogIzk5OTtcbiAgYm9yZGVyLXJhZGl1czogNXB4O1xufVxuXG5wcmUuZnJhbWUge1xuICBzY3JvbGxiYXItd2lkdGg6IHRoaW47XG59XG5cbi5tZXNzYWdlIHtcbiAgbGluZS1oZWlnaHQ6IDEuMztcbiAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgd2hpdGUtc3BhY2U6IHByZS13cmFwO1xufVxuXG4ubWVzc2FnZS1ib2R5IHtcbiAgY29sb3I6IHZhcigtLXJlZCk7XG59XG5cbi5wbHVnaW4ge1xuICBjb2xvcjogdmFyKC0tcHVycGxlKTtcbn1cblxuLmZpbGUge1xuICBjb2xvcjogdmFyKC0tY3lhbik7XG4gIG1hcmdpbi1ib3R0b206IDA7XG4gIHdoaXRlLXNwYWNlOiBwcmUtd3JhcDtcbiAgd29yZC1icmVhazogYnJlYWstYWxsO1xufVxuXG4uZnJhbWUge1xuICBjb2xvcjogdmFyKC0teWVsbG93KTtcbn1cblxuLnN0YWNrIHtcbiAgZm9udC1zaXplOiAxM3B4O1xuICBjb2xvcjogdmFyKC0tZGltKTtcbn1cblxuLnRpcCB7XG4gIGZvbnQtc2l6ZTogMTNweDtcbiAgY29sb3I6ICM5OTk7XG4gIGJvcmRlci10b3A6IDFweCBkb3R0ZWQgIzk5OTtcbiAgcGFkZGluZy10b3A6IDEzcHg7XG4gIGxpbmUtaGVpZ2h0OiAxLjg7XG59XG5cbmNvZGUge1xuICBmb250LXNpemU6IDEzcHg7XG4gIGZvbnQtZmFtaWx5OiB2YXIoLS1tb25vc3BhY2UpO1xuICBjb2xvcjogdmFyKC0teWVsbG93KTtcbn1cblxuLmZpbGUtbGluayB7XG4gIHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xuICBjdXJzb3I6IHBvaW50ZXI7XG59XG5cbmtiZCB7XG4gIGxpbmUtaGVpZ2h0OiAxLjU7XG4gIGZvbnQtZmFtaWx5OiB1aS1tb25vc3BhY2UsIE1lbmxvLCBNb25hY28sIENvbnNvbGFzLCBcIkxpYmVyYXRpb24gTW9ub1wiLCBcIkNvdXJpZXIgTmV3XCIsIG1vbm9zcGFjZTtcbiAgZm9udC1zaXplOiAwLjc1cmVtO1xuICBmb250LXdlaWdodDogNzAwO1xuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMzgsIDQwLCA0NCk7XG4gIGNvbG9yOiByZ2IoMTY2LCAxNjcsIDE3MSk7XG4gIHBhZGRpbmc6IDAuMTVyZW0gMC4zcmVtO1xuICBib3JkZXItcmFkaXVzOiAwLjI1cmVtO1xuICBib3JkZXItd2lkdGg6IDAuMDYyNXJlbSAwLjA2MjVyZW0gMC4xODc1cmVtO1xuICBib3JkZXItc3R5bGU6IHNvbGlkO1xuICBib3JkZXItY29sb3I6IHJnYig1NCwgNTcsIDY0KTtcbiAgYm9yZGVyLWltYWdlOiBpbml0aWFsO1xufVxuYFxuXG4vLyBFcnJvciBUZW1wbGF0ZVxubGV0IHRlbXBsYXRlOiBIVE1MRWxlbWVudFxuY29uc3QgY3JlYXRlVGVtcGxhdGUgPSAoKSA9PlxuICBoKFxuICAgICdkaXYnLFxuICAgIHsgY2xhc3M6ICdiYWNrZHJvcCcsIHBhcnQ6ICdiYWNrZHJvcCcgfSxcbiAgICBoKFxuICAgICAgJ2RpdicsXG4gICAgICB7IGNsYXNzOiAnd2luZG93JywgcGFydDogJ3dpbmRvdycgfSxcbiAgICAgIGgoXG4gICAgICAgICdwcmUnLFxuICAgICAgICB7IGNsYXNzOiAnbWVzc2FnZScsIHBhcnQ6ICdtZXNzYWdlJyB9LFxuICAgICAgICBoKCdzcGFuJywgeyBjbGFzczogJ3BsdWdpbicsIHBhcnQ6ICdwbHVnaW4nIH0pLFxuICAgICAgICBoKCdzcGFuJywgeyBjbGFzczogJ21lc3NhZ2UtYm9keScsIHBhcnQ6ICdtZXNzYWdlLWJvZHknIH0pLFxuICAgICAgKSxcbiAgICAgIGgoJ3ByZScsIHsgY2xhc3M6ICdmaWxlJywgcGFydDogJ2ZpbGUnIH0pLFxuICAgICAgaCgncHJlJywgeyBjbGFzczogJ2ZyYW1lJywgcGFydDogJ2ZyYW1lJyB9KSxcbiAgICAgIGgoJ3ByZScsIHsgY2xhc3M6ICdzdGFjaycsIHBhcnQ6ICdzdGFjaycgfSksXG4gICAgICBoKFxuICAgICAgICAnZGl2JyxcbiAgICAgICAgeyBjbGFzczogJ3RpcCcsIHBhcnQ6ICd0aXAnIH0sXG4gICAgICAgICdDbGljayBvdXRzaWRlLCBwcmVzcyAnLFxuICAgICAgICBoKCdrYmQnLCB7fSwgJ0VzYycpLFxuICAgICAgICAnIGtleSwgb3IgZml4IHRoZSBjb2RlIHRvIGRpc21pc3MuJyxcbiAgICAgICAgaCgnYnInKSxcbiAgICAgICAgJ1lvdSBjYW4gYWxzbyBkaXNhYmxlIHRoaXMgb3ZlcmxheSBieSBzZXR0aW5nICcsXG4gICAgICAgIGgoJ2NvZGUnLCB7IHBhcnQ6ICdjb25maWctb3B0aW9uLW5hbWUnIH0sICdzZXJ2ZXIuaG1yLm92ZXJsYXknKSxcbiAgICAgICAgJyB0byAnLFxuICAgICAgICBoKCdjb2RlJywgeyBwYXJ0OiAnY29uZmlnLW9wdGlvbi12YWx1ZScgfSwgJ2ZhbHNlJyksXG4gICAgICAgICcgaW4gJyxcbiAgICAgICAgaCgnY29kZScsIHsgcGFydDogJ2NvbmZpZy1maWxlLW5hbWUnIH0sIGhtckNvbmZpZ05hbWUpLFxuICAgICAgICAnLicsXG4gICAgICApLFxuICAgICksXG4gICAgaCgnc3R5bGUnLCB7fSwgdGVtcGxhdGVTdHlsZSksXG4gIClcblxuY29uc3QgZmlsZVJFID0gLyg/OlthLXpBLVpdOlxcXFx8XFwvKS4qPzpcXGQrOlxcZCsvZ1xuY29uc3QgY29kZWZyYW1lUkUgPSAvXig/Oj4/XFxzKlxcZCtcXHMrXFx8Lip8XFxzK1xcfFxccypcXF4uKilcXHI/XFxuL2dtXG5cbi8vIEFsbG93IGBFcnJvck92ZXJsYXlgIHRvIGV4dGVuZCBgSFRNTEVsZW1lbnRgIGV2ZW4gaW4gZW52aXJvbm1lbnRzIHdoZXJlXG4vLyBgSFRNTEVsZW1lbnRgIHdhcyBub3Qgb3JpZ2luYWxseSBkZWZpbmVkLlxuY29uc3QgeyBIVE1MRWxlbWVudCA9IGNsYXNzIHt9IGFzIHR5cGVvZiBnbG9iYWxUaGlzLkhUTUxFbGVtZW50IH0gPSBnbG9iYWxUaGlzXG5leHBvcnQgY2xhc3MgRXJyb3JPdmVybGF5IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICByb290OiBTaGFkb3dSb290XG4gIGNsb3NlT25Fc2M6IChlOiBLZXlib2FyZEV2ZW50KSA9PiB2b2lkXG5cbiAgY29uc3RydWN0b3IoZXJyOiBFcnJvclBheWxvYWRbJ2VyciddLCBsaW5rcyA9IHRydWUpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5yb290ID0gdGhpcy5hdHRhY2hTaGFkb3coeyBtb2RlOiAnb3BlbicgfSlcblxuICAgIHRlbXBsYXRlID8/PSBjcmVhdGVUZW1wbGF0ZSgpXG4gICAgdGhpcy5yb290LmFwcGVuZENoaWxkKHRlbXBsYXRlKVxuXG4gICAgY29kZWZyYW1lUkUubGFzdEluZGV4ID0gMFxuICAgIGNvbnN0IGhhc0ZyYW1lID0gZXJyLmZyYW1lICYmIGNvZGVmcmFtZVJFLnRlc3QoZXJyLmZyYW1lKVxuICAgIGNvbnN0IG1lc3NhZ2UgPSBoYXNGcmFtZVxuICAgICAgPyBlcnIubWVzc2FnZS5yZXBsYWNlKGNvZGVmcmFtZVJFLCAnJylcbiAgICAgIDogZXJyLm1lc3NhZ2VcbiAgICBpZiAoZXJyLnBsdWdpbikge1xuICAgICAgdGhpcy50ZXh0KCcucGx1Z2luJywgYFtwbHVnaW46JHtlcnIucGx1Z2lufV0gYClcbiAgICB9XG4gICAgdGhpcy50ZXh0KCcubWVzc2FnZS1ib2R5JywgbWVzc2FnZS50cmltKCkpXG5cbiAgICBjb25zdCBbZmlsZV0gPSAoZXJyLmxvYz8uZmlsZSB8fCBlcnIuaWQgfHwgJ3Vua25vd24gZmlsZScpLnNwbGl0KGA/YClcbiAgICBpZiAoZXJyLmxvYykge1xuICAgICAgdGhpcy50ZXh0KCcuZmlsZScsIGAke2ZpbGV9OiR7ZXJyLmxvYy5saW5lfToke2Vyci5sb2MuY29sdW1ufWAsIGxpbmtzKVxuICAgIH0gZWxzZSBpZiAoZXJyLmlkKSB7XG4gICAgICB0aGlzLnRleHQoJy5maWxlJywgZmlsZSlcbiAgICB9XG5cbiAgICBpZiAoaGFzRnJhbWUpIHtcbiAgICAgIHRoaXMudGV4dCgnLmZyYW1lJywgZXJyLmZyYW1lIS50cmltKCkpXG4gICAgfVxuICAgIHRoaXMudGV4dCgnLnN0YWNrJywgZXJyLnN0YWNrLCBsaW5rcylcblxuICAgIHRoaXMucm9vdC5xdWVyeVNlbGVjdG9yKCcud2luZG93JykhLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICB9KVxuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMuY2xvc2UoKVxuICAgIH0pXG5cbiAgICB0aGlzLmNsb3NlT25Fc2MgPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSAnRXNjYXBlJyB8fCBlLmNvZGUgPT09ICdFc2NhcGUnKSB7XG4gICAgICAgIHRoaXMuY2xvc2UoKVxuICAgICAgfVxuICAgIH1cblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLmNsb3NlT25Fc2MpXG4gIH1cblxuICB0ZXh0KHNlbGVjdG9yOiBzdHJpbmcsIHRleHQ6IHN0cmluZywgbGlua0ZpbGVzID0gZmFsc2UpOiB2b2lkIHtcbiAgICBjb25zdCBlbCA9IHRoaXMucm9vdC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSFcbiAgICBpZiAoIWxpbmtGaWxlcykge1xuICAgICAgZWwudGV4dENvbnRlbnQgPSB0ZXh0XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBjdXJJbmRleCA9IDBcbiAgICAgIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbFxuICAgICAgZmlsZVJFLmxhc3RJbmRleCA9IDBcbiAgICAgIHdoaWxlICgobWF0Y2ggPSBmaWxlUkUuZXhlYyh0ZXh0KSkpIHtcbiAgICAgICAgY29uc3QgeyAwOiBmaWxlLCBpbmRleCB9ID0gbWF0Y2hcbiAgICAgICAgaWYgKGluZGV4ICE9IG51bGwpIHtcbiAgICAgICAgICBjb25zdCBmcmFnID0gdGV4dC5zbGljZShjdXJJbmRleCwgaW5kZXgpXG4gICAgICAgICAgZWwuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZnJhZykpXG4gICAgICAgICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKVxuICAgICAgICAgIGxpbmsudGV4dENvbnRlbnQgPSBmaWxlXG4gICAgICAgICAgbGluay5jbGFzc05hbWUgPSAnZmlsZS1saW5rJ1xuICAgICAgICAgIGxpbmsub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIGZldGNoKFxuICAgICAgICAgICAgICBuZXcgVVJMKFxuICAgICAgICAgICAgICAgIGAke2Jhc2V9X19vcGVuLWluLWVkaXRvcj9maWxlPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGUpfWAsXG4gICAgICAgICAgICAgICAgaW1wb3J0Lm1ldGEudXJsLFxuICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbC5hcHBlbmRDaGlsZChsaW5rKVxuICAgICAgICAgIGN1ckluZGV4ICs9IGZyYWcubGVuZ3RoICsgZmlsZS5sZW5ndGhcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBjbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnBhcmVudE5vZGU/LnJlbW92ZUNoaWxkKHRoaXMpXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuY2xvc2VPbkVzYylcbiAgfVxufVxuXG5leHBvcnQgY29uc3Qgb3ZlcmxheUlkID0gJ3ZpdGUtZXJyb3Itb3ZlcmxheSdcbmNvbnN0IHsgY3VzdG9tRWxlbWVudHMgfSA9IGdsb2JhbFRoaXMgLy8gRW5zdXJlIGBjdXN0b21FbGVtZW50c2AgaXMgZGVmaW5lZCBiZWZvcmUgdGhlIG5leHQgbGluZS5cbmlmIChjdXN0b21FbGVtZW50cyAmJiAhY3VzdG9tRWxlbWVudHMuZ2V0KG92ZXJsYXlJZCkpIHtcbiAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKG92ZXJsYXlJZCwgRXJyb3JPdmVybGF5KVxufVxuIiwiaW1wb3J0IHR5cGUgeyBFcnJvclBheWxvYWQsIEhNUlBheWxvYWQgfSBmcm9tICd0eXBlcy9obXJQYXlsb2FkJ1xuaW1wb3J0IHR5cGUgeyBWaXRlSG90Q29udGV4dCB9IGZyb20gJ3R5cGVzL2hvdCdcbmltcG9ydCB0eXBlIHsgSW5mZXJDdXN0b21FdmVudFBheWxvYWQgfSBmcm9tICd0eXBlcy9jdXN0b21FdmVudCdcbmltcG9ydCB7IEhNUkNsaWVudCwgSE1SQ29udGV4dCB9IGZyb20gJy4uL3NoYXJlZC9obXInXG5pbXBvcnQgeyBFcnJvck92ZXJsYXksIG92ZXJsYXlJZCB9IGZyb20gJy4vb3ZlcmxheSdcbmltcG9ydCAnQHZpdGUvZW52J1xuXG4vLyBpbmplY3RlZCBieSB0aGUgaG1yIHBsdWdpbiB3aGVuIHNlcnZlZFxuZGVjbGFyZSBjb25zdCBfX0JBU0VfXzogc3RyaW5nXG5kZWNsYXJlIGNvbnN0IF9fU0VSVkVSX0hPU1RfXzogc3RyaW5nXG5kZWNsYXJlIGNvbnN0IF9fSE1SX1BST1RPQ09MX186IHN0cmluZyB8IG51bGxcbmRlY2xhcmUgY29uc3QgX19ITVJfSE9TVE5BTUVfXzogc3RyaW5nIHwgbnVsbFxuZGVjbGFyZSBjb25zdCBfX0hNUl9QT1JUX186IG51bWJlciB8IG51bGxcbmRlY2xhcmUgY29uc3QgX19ITVJfRElSRUNUX1RBUkdFVF9fOiBzdHJpbmdcbmRlY2xhcmUgY29uc3QgX19ITVJfQkFTRV9fOiBzdHJpbmdcbmRlY2xhcmUgY29uc3QgX19ITVJfVElNRU9VVF9fOiBudW1iZXJcbmRlY2xhcmUgY29uc3QgX19ITVJfRU5BQkxFX09WRVJMQVlfXzogYm9vbGVhblxuXG5jb25zb2xlLmRlYnVnKCdbdml0ZV0gY29ubmVjdGluZy4uLicpXG5cbmNvbnN0IGltcG9ydE1ldGFVcmwgPSBuZXcgVVJMKGltcG9ydC5tZXRhLnVybClcblxuLy8gdXNlIHNlcnZlciBjb25maWd1cmF0aW9uLCB0aGVuIGZhbGxiYWNrIHRvIGluZmVyZW5jZVxuY29uc3Qgc2VydmVySG9zdCA9IF9fU0VSVkVSX0hPU1RfX1xuY29uc3Qgc29ja2V0UHJvdG9jb2wgPVxuICBfX0hNUl9QUk9UT0NPTF9fIHx8IChpbXBvcnRNZXRhVXJsLnByb3RvY29sID09PSAnaHR0cHM6JyA/ICd3c3MnIDogJ3dzJylcbmNvbnN0IGhtclBvcnQgPSBfX0hNUl9QT1JUX19cbmNvbnN0IHNvY2tldEhvc3QgPSBgJHtfX0hNUl9IT1NUTkFNRV9fIHx8IGltcG9ydE1ldGFVcmwuaG9zdG5hbWV9OiR7XG4gIGhtclBvcnQgfHwgaW1wb3J0TWV0YVVybC5wb3J0XG59JHtfX0hNUl9CQVNFX199YFxuY29uc3QgZGlyZWN0U29ja2V0SG9zdCA9IF9fSE1SX0RJUkVDVF9UQVJHRVRfX1xuY29uc3QgYmFzZSA9IF9fQkFTRV9fIHx8ICcvJ1xuXG5sZXQgc29ja2V0OiBXZWJTb2NrZXRcbnRyeSB7XG4gIGxldCBmYWxsYmFjazogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkXG4gIC8vIG9ubHkgdXNlIGZhbGxiYWNrIHdoZW4gcG9ydCBpcyBpbmZlcnJlZCB0byBwcmV2ZW50IGNvbmZ1c2lvblxuICBpZiAoIWhtclBvcnQpIHtcbiAgICBmYWxsYmFjayA9ICgpID0+IHtcbiAgICAgIC8vIGZhbGxiYWNrIHRvIGNvbm5lY3RpbmcgZGlyZWN0bHkgdG8gdGhlIGhtciBzZXJ2ZXJcbiAgICAgIC8vIGZvciBzZXJ2ZXJzIHdoaWNoIGRvZXMgbm90IHN1cHBvcnQgcHJveHlpbmcgd2Vic29ja2V0XG4gICAgICBzb2NrZXQgPSBzZXR1cFdlYlNvY2tldChzb2NrZXRQcm90b2NvbCwgZGlyZWN0U29ja2V0SG9zdCwgKCkgPT4ge1xuICAgICAgICBjb25zdCBjdXJyZW50U2NyaXB0SG9zdFVSTCA9IG5ldyBVUkwoaW1wb3J0Lm1ldGEudXJsKVxuICAgICAgICBjb25zdCBjdXJyZW50U2NyaXB0SG9zdCA9XG4gICAgICAgICAgY3VycmVudFNjcmlwdEhvc3RVUkwuaG9zdCArXG4gICAgICAgICAgY3VycmVudFNjcmlwdEhvc3RVUkwucGF0aG5hbWUucmVwbGFjZSgvQHZpdGVcXC9jbGllbnQkLywgJycpXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgJ1t2aXRlXSBmYWlsZWQgdG8gY29ubmVjdCB0byB3ZWJzb2NrZXQuXFxuJyArXG4gICAgICAgICAgICAneW91ciBjdXJyZW50IHNldHVwOlxcbicgK1xuICAgICAgICAgICAgYCAgKGJyb3dzZXIpICR7Y3VycmVudFNjcmlwdEhvc3R9IDwtLVtIVFRQXS0tPiAke3NlcnZlckhvc3R9IChzZXJ2ZXIpXFxuYCArXG4gICAgICAgICAgICBgICAoYnJvd3NlcikgJHtzb2NrZXRIb3N0fSA8LS1bV2ViU29ja2V0IChmYWlsaW5nKV0tLT4gJHtkaXJlY3RTb2NrZXRIb3N0fSAoc2VydmVyKVxcbmAgK1xuICAgICAgICAgICAgJ0NoZWNrIG91dCB5b3VyIFZpdGUgLyBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gYW5kIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvc2VydmVyLW9wdGlvbnMuaHRtbCNzZXJ2ZXItaG1yIC4nLFxuICAgICAgICApXG4gICAgICB9KVxuICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgICdvcGVuJyxcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuaW5mbyhcbiAgICAgICAgICAgICdbdml0ZV0gRGlyZWN0IHdlYnNvY2tldCBjb25uZWN0aW9uIGZhbGxiYWNrLiBDaGVjayBvdXQgaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9zZXJ2ZXItb3B0aW9ucy5odG1sI3NlcnZlci1obXIgdG8gcmVtb3ZlIHRoZSBwcmV2aW91cyBjb25uZWN0aW9uIGVycm9yLicsXG4gICAgICAgICAgKVxuICAgICAgICB9LFxuICAgICAgICB7IG9uY2U6IHRydWUgfSxcbiAgICAgIClcbiAgICB9XG4gIH1cblxuICBzb2NrZXQgPSBzZXR1cFdlYlNvY2tldChzb2NrZXRQcm90b2NvbCwgc29ja2V0SG9zdCwgZmFsbGJhY2spXG59IGNhdGNoIChlcnJvcikge1xuICBjb25zb2xlLmVycm9yKGBbdml0ZV0gZmFpbGVkIHRvIGNvbm5lY3QgdG8gd2Vic29ja2V0ICgke2Vycm9yfSkuIGApXG59XG5cbmZ1bmN0aW9uIHNldHVwV2ViU29ja2V0KFxuICBwcm90b2NvbDogc3RyaW5nLFxuICBob3N0QW5kUGF0aDogc3RyaW5nLFxuICBvbkNsb3NlV2l0aG91dE9wZW4/OiAoKSA9PiB2b2lkLFxuKSB7XG4gIGNvbnN0IHNvY2tldCA9IG5ldyBXZWJTb2NrZXQoYCR7cHJvdG9jb2x9Oi8vJHtob3N0QW5kUGF0aH1gLCAndml0ZS1obXInKVxuICBsZXQgaXNPcGVuZWQgPSBmYWxzZVxuXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKFxuICAgICdvcGVuJyxcbiAgICAoKSA9PiB7XG4gICAgICBpc09wZW5lZCA9IHRydWVcbiAgICAgIG5vdGlmeUxpc3RlbmVycygndml0ZTp3czpjb25uZWN0JywgeyB3ZWJTb2NrZXQ6IHNvY2tldCB9KVxuICAgIH0sXG4gICAgeyBvbmNlOiB0cnVlIH0sXG4gIClcblxuICAvLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgYXN5bmMgKHsgZGF0YSB9KSA9PiB7XG4gICAgaGFuZGxlTWVzc2FnZShKU09OLnBhcnNlKGRhdGEpKVxuICB9KVxuXG4gIC8vIHBpbmcgc2VydmVyXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIGFzeW5jICh7IHdhc0NsZWFuIH0pID0+IHtcbiAgICBpZiAod2FzQ2xlYW4pIHJldHVyblxuXG4gICAgaWYgKCFpc09wZW5lZCAmJiBvbkNsb3NlV2l0aG91dE9wZW4pIHtcbiAgICAgIG9uQ2xvc2VXaXRob3V0T3BlbigpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBub3RpZnlMaXN0ZW5lcnMoJ3ZpdGU6d3M6ZGlzY29ubmVjdCcsIHsgd2ViU29ja2V0OiBzb2NrZXQgfSlcblxuICAgIGlmIChoYXNEb2N1bWVudCkge1xuICAgICAgY29uc29sZS5sb2coYFt2aXRlXSBzZXJ2ZXIgY29ubmVjdGlvbiBsb3N0LiBwb2xsaW5nIGZvciByZXN0YXJ0Li4uYClcbiAgICAgIGF3YWl0IHdhaXRGb3JTdWNjZXNzZnVsUGluZyhwcm90b2NvbCwgaG9zdEFuZFBhdGgpXG4gICAgICBsb2NhdGlvbi5yZWxvYWQoKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gc29ja2V0XG59XG5cbmZ1bmN0aW9uIGNsZWFuVXJsKHBhdGhuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHBhdGhuYW1lLCAnaHR0cDovL3ZpdGVqcy5kZXYnKVxuICB1cmwuc2VhcmNoUGFyYW1zLmRlbGV0ZSgnZGlyZWN0JylcbiAgcmV0dXJuIHVybC5wYXRobmFtZSArIHVybC5zZWFyY2hcbn1cblxubGV0IGlzRmlyc3RVcGRhdGUgPSB0cnVlXG5jb25zdCBvdXRkYXRlZExpbmtUYWdzID0gbmV3IFdlYWtTZXQ8SFRNTExpbmtFbGVtZW50PigpXG5cbmNvbnN0IGRlYm91bmNlUmVsb2FkID0gKHRpbWU6IG51bWJlcikgPT4ge1xuICBsZXQgdGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbFxuICByZXR1cm4gKCkgPT4ge1xuICAgIGlmICh0aW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKVxuICAgICAgdGltZXIgPSBudWxsXG4gICAgfVxuICAgIHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBsb2NhdGlvbi5yZWxvYWQoKVxuICAgIH0sIHRpbWUpXG4gIH1cbn1cbmNvbnN0IHBhZ2VSZWxvYWQgPSBkZWJvdW5jZVJlbG9hZCg1MClcblxuY29uc3QgaG1yQ2xpZW50ID0gbmV3IEhNUkNsaWVudChcbiAgY29uc29sZSxcbiAge1xuICAgIGlzUmVhZHk6ICgpID0+IHNvY2tldCAmJiBzb2NrZXQucmVhZHlTdGF0ZSA9PT0gMSxcbiAgICBzZW5kOiAobWVzc2FnZSkgPT4gc29ja2V0LnNlbmQobWVzc2FnZSksXG4gIH0sXG4gIGFzeW5jIGZ1bmN0aW9uIGltcG9ydFVwZGF0ZWRNb2R1bGUoe1xuICAgIGFjY2VwdGVkUGF0aCxcbiAgICB0aW1lc3RhbXAsXG4gICAgZXhwbGljaXRJbXBvcnRSZXF1aXJlZCxcbiAgICBpc1dpdGhpbkNpcmN1bGFySW1wb3J0LFxuICB9KSB7XG4gICAgY29uc3QgW2FjY2VwdGVkUGF0aFdpdGhvdXRRdWVyeSwgcXVlcnldID0gYWNjZXB0ZWRQYXRoLnNwbGl0KGA/YClcbiAgICBjb25zdCBpbXBvcnRQcm9taXNlID0gaW1wb3J0KFxuICAgICAgLyogQHZpdGUtaWdub3JlICovXG4gICAgICBiYXNlICtcbiAgICAgICAgYWNjZXB0ZWRQYXRoV2l0aG91dFF1ZXJ5LnNsaWNlKDEpICtcbiAgICAgICAgYD8ke2V4cGxpY2l0SW1wb3J0UmVxdWlyZWQgPyAnaW1wb3J0JicgOiAnJ310PSR7dGltZXN0YW1wfSR7XG4gICAgICAgICAgcXVlcnkgPyBgJiR7cXVlcnl9YCA6ICcnXG4gICAgICAgIH1gXG4gICAgKVxuICAgIGlmIChpc1dpdGhpbkNpcmN1bGFySW1wb3J0KSB7XG4gICAgICBpbXBvcnRQcm9taXNlLmNhdGNoKCgpID0+IHtcbiAgICAgICAgY29uc29sZS5pbmZvKFxuICAgICAgICAgIGBbaG1yXSAke2FjY2VwdGVkUGF0aH0gZmFpbGVkIHRvIGFwcGx5IEhNUiBhcyBpdCdzIHdpdGhpbiBhIGNpcmN1bGFyIGltcG9ydC4gUmVsb2FkaW5nIHBhZ2UgdG8gcmVzZXQgdGhlIGV4ZWN1dGlvbiBvcmRlci4gYCArXG4gICAgICAgICAgICBgVG8gZGVidWcgYW5kIGJyZWFrIHRoZSBjaXJjdWxhciBpbXBvcnQsIHlvdSBjYW4gcnVuIFxcYHZpdGUgLS1kZWJ1ZyBobXJcXGAgdG8gbG9nIHRoZSBjaXJjdWxhciBkZXBlbmRlbmN5IHBhdGggaWYgYSBmaWxlIGNoYW5nZSB0cmlnZ2VyZWQgaXQuYCxcbiAgICAgICAgKVxuICAgICAgICBwYWdlUmVsb2FkKClcbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiBhd2FpdCBpbXBvcnRQcm9taXNlXG4gIH0sXG4pXG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZU1lc3NhZ2UocGF5bG9hZDogSE1SUGF5bG9hZCkge1xuICBzd2l0Y2ggKHBheWxvYWQudHlwZSkge1xuICAgIGNhc2UgJ2Nvbm5lY3RlZCc6XG4gICAgICBjb25zb2xlLmRlYnVnKGBbdml0ZV0gY29ubmVjdGVkLmApXG4gICAgICBobXJDbGllbnQubWVzc2VuZ2VyLmZsdXNoKClcbiAgICAgIC8vIHByb3h5KG5naW54LCBkb2NrZXIpIGhtciB3cyBtYXliZSBjYXVzZWQgdGltZW91dCxcbiAgICAgIC8vIHNvIHNlbmQgcGluZyBwYWNrYWdlIGxldCB3cyBrZWVwIGFsaXZlLlxuICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICBpZiAoc29ja2V0LnJlYWR5U3RhdGUgPT09IHNvY2tldC5PUEVOKSB7XG4gICAgICAgICAgc29ja2V0LnNlbmQoJ3tcInR5cGVcIjpcInBpbmdcIn0nKVxuICAgICAgICB9XG4gICAgICB9LCBfX0hNUl9USU1FT1VUX18pXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICBub3RpZnlMaXN0ZW5lcnMoJ3ZpdGU6YmVmb3JlVXBkYXRlJywgcGF5bG9hZClcbiAgICAgIGlmIChoYXNEb2N1bWVudCkge1xuICAgICAgICAvLyBpZiB0aGlzIGlzIHRoZSBmaXJzdCB1cGRhdGUgYW5kIHRoZXJlJ3MgYWxyZWFkeSBhbiBlcnJvciBvdmVybGF5LCBpdFxuICAgICAgICAvLyBtZWFucyB0aGUgcGFnZSBvcGVuZWQgd2l0aCBleGlzdGluZyBzZXJ2ZXIgY29tcGlsZSBlcnJvciBhbmQgdGhlIHdob2xlXG4gICAgICAgIC8vIG1vZHVsZSBzY3JpcHQgZmFpbGVkIHRvIGxvYWQgKHNpbmNlIG9uZSBvZiB0aGUgbmVzdGVkIGltcG9ydHMgaXMgNTAwKS5cbiAgICAgICAgLy8gaW4gdGhpcyBjYXNlIGEgbm9ybWFsIHVwZGF0ZSB3b24ndCB3b3JrIGFuZCBhIGZ1bGwgcmVsb2FkIGlzIG5lZWRlZC5cbiAgICAgICAgaWYgKGlzRmlyc3RVcGRhdGUgJiYgaGFzRXJyb3JPdmVybGF5KCkpIHtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKClcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZW5hYmxlT3ZlcmxheSkge1xuICAgICAgICAgICAgY2xlYXJFcnJvck92ZXJsYXkoKVxuICAgICAgICAgIH1cbiAgICAgICAgICBpc0ZpcnN0VXBkYXRlID0gZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgIHBheWxvYWQudXBkYXRlcy5tYXAoYXN5bmMgKHVwZGF0ZSk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgIGlmICh1cGRhdGUudHlwZSA9PT0gJ2pzLXVwZGF0ZScpIHtcbiAgICAgICAgICAgIHJldHVybiBobXJDbGllbnQucXVldWVVcGRhdGUodXBkYXRlKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGNzcy11cGRhdGVcbiAgICAgICAgICAvLyB0aGlzIGlzIG9ubHkgc2VudCB3aGVuIGEgY3NzIGZpbGUgcmVmZXJlbmNlZCB3aXRoIDxsaW5rPiBpcyB1cGRhdGVkXG4gICAgICAgICAgY29uc3QgeyBwYXRoLCB0aW1lc3RhbXAgfSA9IHVwZGF0ZVxuICAgICAgICAgIGNvbnN0IHNlYXJjaFVybCA9IGNsZWFuVXJsKHBhdGgpXG4gICAgICAgICAgLy8gY2FuJ3QgdXNlIHF1ZXJ5U2VsZWN0b3Igd2l0aCBgW2hyZWYqPV1gIGhlcmUgc2luY2UgdGhlIGxpbmsgbWF5IGJlXG4gICAgICAgICAgLy8gdXNpbmcgcmVsYXRpdmUgcGF0aHMgc28gd2UgbmVlZCB0byB1c2UgbGluay5ocmVmIHRvIGdyYWIgdGhlIGZ1bGxcbiAgICAgICAgICAvLyBVUkwgZm9yIHRoZSBpbmNsdWRlIGNoZWNrLlxuICAgICAgICAgIGNvbnN0IGVsID0gQXJyYXkuZnJvbShcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTExpbmtFbGVtZW50PignbGluaycpLFxuICAgICAgICAgICkuZmluZChcbiAgICAgICAgICAgIChlKSA9PlxuICAgICAgICAgICAgICAhb3V0ZGF0ZWRMaW5rVGFncy5oYXMoZSkgJiYgY2xlYW5VcmwoZS5ocmVmKS5pbmNsdWRlcyhzZWFyY2hVcmwpLFxuICAgICAgICAgIClcblxuICAgICAgICAgIGlmICghZWwpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IG5ld1BhdGggPSBgJHtiYXNlfSR7c2VhcmNoVXJsLnNsaWNlKDEpfSR7XG4gICAgICAgICAgICBzZWFyY2hVcmwuaW5jbHVkZXMoJz8nKSA/ICcmJyA6ICc/J1xuICAgICAgICAgIH10PSR7dGltZXN0YW1wfWBcblxuICAgICAgICAgIC8vIHJhdGhlciB0aGFuIHN3YXBwaW5nIHRoZSBocmVmIG9uIHRoZSBleGlzdGluZyB0YWcsIHdlIHdpbGxcbiAgICAgICAgICAvLyBjcmVhdGUgYSBuZXcgbGluayB0YWcuIE9uY2UgdGhlIG5ldyBzdHlsZXNoZWV0IGhhcyBsb2FkZWQgd2VcbiAgICAgICAgICAvLyB3aWxsIHJlbW92ZSB0aGUgZXhpc3RpbmcgbGluayB0YWcuIFRoaXMgcmVtb3ZlcyBhIEZsYXNoIE9mXG4gICAgICAgICAgLy8gVW5zdHlsZWQgQ29udGVudCB0aGF0IGNhbiBvY2N1ciB3aGVuIHN3YXBwaW5nIG91dCB0aGUgdGFnIGhyZWZcbiAgICAgICAgICAvLyBkaXJlY3RseSwgYXMgdGhlIG5ldyBzdHlsZXNoZWV0IGhhcyBub3QgeWV0IGJlZW4gbG9hZGVkLlxuICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3TGlua1RhZyA9IGVsLmNsb25lTm9kZSgpIGFzIEhUTUxMaW5rRWxlbWVudFxuICAgICAgICAgICAgbmV3TGlua1RhZy5ocmVmID0gbmV3IFVSTChuZXdQYXRoLCBlbC5ocmVmKS5ocmVmXG4gICAgICAgICAgICBjb25zdCByZW1vdmVPbGRFbCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgZWwucmVtb3ZlKClcbiAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhgW3ZpdGVdIGNzcyBob3QgdXBkYXRlZDogJHtzZWFyY2hVcmx9YClcbiAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdMaW5rVGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCByZW1vdmVPbGRFbClcbiAgICAgICAgICAgIG5ld0xpbmtUYWcuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCByZW1vdmVPbGRFbClcbiAgICAgICAgICAgIG91dGRhdGVkTGlua1RhZ3MuYWRkKGVsKVxuICAgICAgICAgICAgZWwuYWZ0ZXIobmV3TGlua1RhZylcbiAgICAgICAgICB9KVxuICAgICAgICB9KSxcbiAgICAgIClcbiAgICAgIG5vdGlmeUxpc3RlbmVycygndml0ZTphZnRlclVwZGF0ZScsIHBheWxvYWQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2N1c3RvbSc6IHtcbiAgICAgIG5vdGlmeUxpc3RlbmVycyhwYXlsb2FkLmV2ZW50LCBwYXlsb2FkLmRhdGEpXG4gICAgICBicmVha1xuICAgIH1cbiAgICBjYXNlICdmdWxsLXJlbG9hZCc6XG4gICAgICBub3RpZnlMaXN0ZW5lcnMoJ3ZpdGU6YmVmb3JlRnVsbFJlbG9hZCcsIHBheWxvYWQpXG4gICAgICBpZiAoaGFzRG9jdW1lbnQpIHtcbiAgICAgICAgaWYgKHBheWxvYWQucGF0aCAmJiBwYXlsb2FkLnBhdGguZW5kc1dpdGgoJy5odG1sJykpIHtcbiAgICAgICAgICAvLyBpZiBodG1sIGZpbGUgaXMgZWRpdGVkLCBvbmx5IHJlbG9hZCB0aGUgcGFnZSBpZiB0aGUgYnJvd3NlciBpc1xuICAgICAgICAgIC8vIGN1cnJlbnRseSBvbiB0aGF0IHBhZ2UuXG4gICAgICAgICAgY29uc3QgcGFnZVBhdGggPSBkZWNvZGVVUkkobG9jYXRpb24ucGF0aG5hbWUpXG4gICAgICAgICAgY29uc3QgcGF5bG9hZFBhdGggPSBiYXNlICsgcGF5bG9hZC5wYXRoLnNsaWNlKDEpXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgcGFnZVBhdGggPT09IHBheWxvYWRQYXRoIHx8XG4gICAgICAgICAgICBwYXlsb2FkLnBhdGggPT09ICcvaW5kZXguaHRtbCcgfHxcbiAgICAgICAgICAgIChwYWdlUGF0aC5lbmRzV2l0aCgnLycpICYmIHBhZ2VQYXRoICsgJ2luZGV4Lmh0bWwnID09PSBwYXlsb2FkUGF0aClcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHBhZ2VSZWxvYWQoKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYWdlUmVsb2FkKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdwcnVuZSc6XG4gICAgICBub3RpZnlMaXN0ZW5lcnMoJ3ZpdGU6YmVmb3JlUHJ1bmUnLCBwYXlsb2FkKVxuICAgICAgYXdhaXQgaG1yQ2xpZW50LnBydW5lUGF0aHMocGF5bG9hZC5wYXRocylcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnZXJyb3InOiB7XG4gICAgICBub3RpZnlMaXN0ZW5lcnMoJ3ZpdGU6ZXJyb3InLCBwYXlsb2FkKVxuICAgICAgaWYgKGhhc0RvY3VtZW50KSB7XG4gICAgICAgIGNvbnN0IGVyciA9IHBheWxvYWQuZXJyXG4gICAgICAgIGlmIChlbmFibGVPdmVybGF5KSB7XG4gICAgICAgICAgY3JlYXRlRXJyb3JPdmVybGF5KGVycilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgYFt2aXRlXSBJbnRlcm5hbCBTZXJ2ZXIgRXJyb3JcXG4ke2Vyci5tZXNzYWdlfVxcbiR7ZXJyLnN0YWNrfWAsXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVha1xuICAgIH1cbiAgICBkZWZhdWx0OiB7XG4gICAgICBjb25zdCBjaGVjazogbmV2ZXIgPSBwYXlsb2FkXG4gICAgICByZXR1cm4gY2hlY2tcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm90aWZ5TGlzdGVuZXJzPFQgZXh0ZW5kcyBzdHJpbmc+KFxuICBldmVudDogVCxcbiAgZGF0YTogSW5mZXJDdXN0b21FdmVudFBheWxvYWQ8VD4sXG4pOiB2b2lkXG5mdW5jdGlvbiBub3RpZnlMaXN0ZW5lcnMoZXZlbnQ6IHN0cmluZywgZGF0YTogYW55KTogdm9pZCB7XG4gIGhtckNsaWVudC5ub3RpZnlMaXN0ZW5lcnMoZXZlbnQsIGRhdGEpXG59XG5cbmNvbnN0IGVuYWJsZU92ZXJsYXkgPSBfX0hNUl9FTkFCTEVfT1ZFUkxBWV9fXG5jb25zdCBoYXNEb2N1bWVudCA9ICdkb2N1bWVudCcgaW4gZ2xvYmFsVGhpc1xuXG5mdW5jdGlvbiBjcmVhdGVFcnJvck92ZXJsYXkoZXJyOiBFcnJvclBheWxvYWRbJ2VyciddKSB7XG4gIGNsZWFyRXJyb3JPdmVybGF5KClcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChuZXcgRXJyb3JPdmVybGF5KGVycikpXG59XG5cbmZ1bmN0aW9uIGNsZWFyRXJyb3JPdmVybGF5KCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEVycm9yT3ZlcmxheT4ob3ZlcmxheUlkKS5mb3JFYWNoKChuKSA9PiBuLmNsb3NlKCkpXG59XG5cbmZ1bmN0aW9uIGhhc0Vycm9yT3ZlcmxheSgpIHtcbiAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwob3ZlcmxheUlkKS5sZW5ndGhcbn1cblxuYXN5bmMgZnVuY3Rpb24gd2FpdEZvclN1Y2Nlc3NmdWxQaW5nKFxuICBzb2NrZXRQcm90b2NvbDogc3RyaW5nLFxuICBob3N0QW5kUGF0aDogc3RyaW5nLFxuICBtcyA9IDEwMDAsXG4pIHtcbiAgY29uc3QgcGluZ0hvc3RQcm90b2NvbCA9IHNvY2tldFByb3RvY29sID09PSAnd3NzJyA/ICdodHRwcycgOiAnaHR0cCdcblxuICBjb25zdCBwaW5nID0gYXN5bmMgKCkgPT4ge1xuICAgIC8vIEEgZmV0Y2ggb24gYSB3ZWJzb2NrZXQgVVJMIHdpbGwgcmV0dXJuIGEgc3VjY2Vzc2Z1bCBwcm9taXNlIHdpdGggc3RhdHVzIDQwMCxcbiAgICAvLyBidXQgd2lsbCByZWplY3QgYSBuZXR3b3JraW5nIGVycm9yLlxuICAgIC8vIFdoZW4gcnVubmluZyBvbiBtaWRkbGV3YXJlIG1vZGUsIGl0IHJldHVybnMgc3RhdHVzIDQyNiwgYW5kIGFuIGNvcnMgZXJyb3IgaGFwcGVucyBpZiBtb2RlIGlzIG5vdCBuby1jb3JzXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZldGNoKGAke3BpbmdIb3N0UHJvdG9jb2x9Oi8vJHtob3N0QW5kUGF0aH1gLCB7XG4gICAgICAgIG1vZGU6ICduby1jb3JzJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC8vIEN1c3RvbSBoZWFkZXJzIHdvbid0IGJlIGluY2x1ZGVkIGluIGEgcmVxdWVzdCB3aXRoIG5vLWNvcnMgc28gKGFiKXVzZSBvbmUgb2YgdGhlXG4gICAgICAgICAgLy8gc2FmZWxpc3RlZCBoZWFkZXJzIHRvIGlkZW50aWZ5IHRoZSBwaW5nIHJlcXVlc3RcbiAgICAgICAgICBBY2NlcHQ6ICd0ZXh0L3gtdml0ZS1waW5nJyxcbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0gY2F0Y2gge31cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmIChhd2FpdCBwaW5nKCkpIHtcbiAgICByZXR1cm5cbiAgfVxuICBhd2FpdCB3YWl0KG1zKVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zdGFudC1jb25kaXRpb25cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBpZiAoZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlID09PSAndmlzaWJsZScpIHtcbiAgICAgIGlmIChhd2FpdCBwaW5nKCkpIHtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHdhaXQobXMpXG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHdhaXRGb3JXaW5kb3dTaG93KClcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gd2FpdChtczogbnVtYmVyKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpXG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JXaW5kb3dTaG93KCkge1xuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCBvbkNoYW5nZSA9IGFzeW5jICgpID0+IHtcbiAgICAgIGlmIChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgPT09ICd2aXNpYmxlJykge1xuICAgICAgICByZXNvbHZlKClcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsIG9uQ2hhbmdlKVxuICAgICAgfVxuICAgIH1cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgb25DaGFuZ2UpXG4gIH0pXG59XG5cbmNvbnN0IHNoZWV0c01hcCA9IG5ldyBNYXA8c3RyaW5nLCBIVE1MU3R5bGVFbGVtZW50PigpXG5cbi8vIGNvbGxlY3QgZXhpc3Rpbmcgc3R5bGUgZWxlbWVudHMgdGhhdCBtYXkgaGF2ZSBiZWVuIGluc2VydGVkIGR1cmluZyBTU1Jcbi8vIHRvIGF2b2lkIEZPVUMgb3IgZHVwbGljYXRlIHN0eWxlc1xuaWYgKCdkb2N1bWVudCcgaW4gZ2xvYmFsVGhpcykge1xuICBkb2N1bWVudFxuICAgIC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxTdHlsZUVsZW1lbnQ+KCdzdHlsZVtkYXRhLXZpdGUtZGV2LWlkXScpXG4gICAgLmZvckVhY2goKGVsKSA9PiB7XG4gICAgICBzaGVldHNNYXAuc2V0KGVsLmdldEF0dHJpYnV0ZSgnZGF0YS12aXRlLWRldi1pZCcpISwgZWwpXG4gICAgfSlcbn1cblxuY29uc3QgY3NwTm9uY2UgPVxuICAnZG9jdW1lbnQnIGluIGdsb2JhbFRoaXNcbiAgICA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3I8SFRNTE1ldGFFbGVtZW50PignbWV0YVtwcm9wZXJ0eT1jc3Atbm9uY2VdJyk/Lm5vbmNlXG4gICAgOiB1bmRlZmluZWRcblxuLy8gYWxsIGNzcyBpbXBvcnRzIHNob3VsZCBiZSBpbnNlcnRlZCBhdCB0aGUgc2FtZSBwb3NpdGlvblxuLy8gYmVjYXVzZSBhZnRlciBidWlsZCBpdCB3aWxsIGJlIGEgc2luZ2xlIGNzcyBmaWxlXG5sZXQgbGFzdEluc2VydGVkU3R5bGU6IEhUTUxTdHlsZUVsZW1lbnQgfCB1bmRlZmluZWRcblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVN0eWxlKGlkOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IHZvaWQge1xuICBsZXQgc3R5bGUgPSBzaGVldHNNYXAuZ2V0KGlkKVxuICBpZiAoIXN0eWxlKSB7XG4gICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpXG4gICAgc3R5bGUuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3RleHQvY3NzJylcbiAgICBzdHlsZS5zZXRBdHRyaWJ1dGUoJ2RhdGEtdml0ZS1kZXYtaWQnLCBpZClcbiAgICBzdHlsZS50ZXh0Q29udGVudCA9IGNvbnRlbnRcbiAgICBpZiAoY3NwTm9uY2UpIHtcbiAgICAgIHN0eWxlLnNldEF0dHJpYnV0ZSgnbm9uY2UnLCBjc3BOb25jZSlcbiAgICB9XG5cbiAgICBpZiAoIWxhc3RJbnNlcnRlZFN0eWxlKSB7XG4gICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKVxuXG4gICAgICAvLyByZXNldCBsYXN0SW5zZXJ0ZWRTdHlsZSBhZnRlciBhc3luY1xuICAgICAgLy8gYmVjYXVzZSBkeW5hbWljYWxseSBpbXBvcnRlZCBjc3Mgd2lsbCBiZSBzcGxpdHRlZCBpbnRvIGEgZGlmZmVyZW50IGZpbGVcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBsYXN0SW5zZXJ0ZWRTdHlsZSA9IHVuZGVmaW5lZFxuICAgICAgfSwgMClcbiAgICB9IGVsc2Uge1xuICAgICAgbGFzdEluc2VydGVkU3R5bGUuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KCdhZnRlcmVuZCcsIHN0eWxlKVxuICAgIH1cbiAgICBsYXN0SW5zZXJ0ZWRTdHlsZSA9IHN0eWxlXG4gIH0gZWxzZSB7XG4gICAgc3R5bGUudGV4dENvbnRlbnQgPSBjb250ZW50XG4gIH1cbiAgc2hlZXRzTWFwLnNldChpZCwgc3R5bGUpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVTdHlsZShpZDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHN0eWxlID0gc2hlZXRzTWFwLmdldChpZClcbiAgaWYgKHN0eWxlKSB7XG4gICAgZG9jdW1lbnQuaGVhZC5yZW1vdmVDaGlsZChzdHlsZSlcbiAgICBzaGVldHNNYXAuZGVsZXRlKGlkKVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVIb3RDb250ZXh0KG93bmVyUGF0aDogc3RyaW5nKTogVml0ZUhvdENvbnRleHQge1xuICByZXR1cm4gbmV3IEhNUkNvbnRleHQoaG1yQ2xpZW50LCBvd25lclBhdGgpXG59XG5cbi8qKlxuICogdXJscyBoZXJlIGFyZSBkeW5hbWljIGltcG9ydCgpIHVybHMgdGhhdCBjb3VsZG4ndCBiZSBzdGF0aWNhbGx5IGFuYWx5emVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmplY3RRdWVyeSh1cmw6IHN0cmluZywgcXVlcnlUb0luamVjdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gc2tpcCB1cmxzIHRoYXQgd29uJ3QgYmUgaGFuZGxlZCBieSB2aXRlXG4gIGlmICh1cmxbMF0gIT09ICcuJyAmJiB1cmxbMF0gIT09ICcvJykge1xuICAgIHJldHVybiB1cmxcbiAgfVxuXG4gIC8vIGNhbid0IHVzZSBwYXRobmFtZSBmcm9tIFVSTCBzaW5jZSBpdCBtYXkgYmUgcmVsYXRpdmUgbGlrZSAuLi9cbiAgY29uc3QgcGF0aG5hbWUgPSB1cmwucmVwbGFjZSgvWz8jXS4qJC8sICcnKVxuICBjb25zdCB7IHNlYXJjaCwgaGFzaCB9ID0gbmV3IFVSTCh1cmwsICdodHRwOi8vdml0ZWpzLmRldicpXG5cbiAgcmV0dXJuIGAke3BhdGhuYW1lfT8ke3F1ZXJ5VG9JbmplY3R9JHtzZWFyY2ggPyBgJmAgKyBzZWFyY2guc2xpY2UoMSkgOiAnJ30ke1xuICAgIGhhc2ggfHwgJydcbiAgfWBcbn1cblxuZXhwb3J0IHsgRXJyb3JPdmVybGF5IH1cbiJdLCJuYW1lcyI6WyJiYXNlIl0sIm1hcHBpbmdzIjoiOztNQWlDYSxVQUFVLENBQUE7SUFHckIsV0FDVSxDQUFBLFNBQW9CLEVBQ3BCLFNBQWlCLEVBQUE7UUFEakIsSUFBUyxDQUFBLFNBQUEsR0FBVCxTQUFTLENBQVc7UUFDcEIsSUFBUyxDQUFBLFNBQUEsR0FBVCxTQUFTLENBQVE7UUFFekIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3JDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUNyQyxTQUFBOzs7UUFJRCxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUNsRCxRQUFBLElBQUksR0FBRyxFQUFFO0FBQ1AsWUFBQSxHQUFHLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtBQUNuQixTQUFBOztRQUdELE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FB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QUUsS0FBSyxDQUFDLENBQUE7QUFDM0QsU0FBQTtRQUNELGlCQUFpQixHQUFHLEtBQUssQ0FBQTtBQUMxQixLQUFBO0FBQU0sU0FBQTtBQUNMLFFBQUEsS0FBSyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUE7QUFDNUIsS0FBQTtBQUNELElBQUEsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDMUIsQ0FBQztBQUVLLFNBQVUsV0FBVyxDQUFDLEVBQVUsRUFBQTtJQUNwQyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBQy9CLElBQUEsSUFBSSxLQUFLLEVBQUU7QUFDVCxRQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ2hDLFFBQUEsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtBQUNyQixLQUFBO0FBQ0gsQ0FBQztBQUVLLFNBQVUsZ0JBQWdCLENBQUMsU0FBaUIsRUFBQTtBQUNoRCxJQUFBLE9BQU8sSUFBSSxVQUFVLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0FBQzdDLENBQUM7QUFFRDs7QUFFRztBQUNhLFNBQUEsV0FBVyxDQUFDLEdBQVcsRUFBRSxhQUFxQixFQUFBOztBQUU1RCxJQUFBLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQ3BDLFFBQUEsT0FBTyxHQUFHLENBQUE7QUFDWCxLQUFBOztJQUdELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0FBQzNDLElBQUEsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtJQUUxRCxPQUFPLENBQUEsRUFBRyxRQUFRLENBQUEsQ0FBQSxFQUFJLGFBQWEsQ0FBQSxFQUFHLE1BQU0sR0FBRyxDQUFHLENBQUEsQ0FBQSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBLEVBQ3ZFLElBQUksSUFBSSxFQUNWLENBQUEsQ0FBRSxDQUFBO0FBQ0o7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyXX0=