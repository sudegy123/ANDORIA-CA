/**
 * ANDORIA CRM — ROUTER
 * crm-router.js
 *
 * Lightweight hash router for the CRM shell: #/dashboard, #/requests,
 * #/requests/:id. Unlike the wizard's Router (which animates numbered
 * step panels), this maps a URL fragment to a page-render function, so
 * every screen is bookmarkable/shareable and survives a refresh — useful
 * for an internal tool staff will link to directly.
 */

'use strict';

const CRMRouter = (() => {

  const _routes = []; // { pattern, keys, handler }
  let _notFound = null;

  /**
   * Register a route.
   * @param {string} path - e.g. '/requests/:id'
   * @param {Function} handler - called with a params object
   */
  function register(path, handler) {
    const keys = [];
    const pattern = new RegExp('^' + path.replace(/:[^/]+/g, (segment) => {
      keys.push(segment.slice(1));
      return '([^/]+)';
    }) + '$');
    _routes.push({ pattern, keys, handler });
  }

  function notFound(handler) {
    _notFound = handler;
  }

  function _currentPath() {
    const hash = window.location.hash.replace(/^#/, '');
    return hash || '/dashboard';
  }

  /** Parses a trailing '?a=1&b=2' off a path into a plain object — '' if absent. */
  function _parseQuery(queryString) {
    const query = {};
    if (!queryString) return query;
    queryString.split('&').forEach((pair) => {
      if (!pair) return;
      const [key, value = ''] = pair.split('=');
      query[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    });
    return query;
  }

  function _resolve() {
    const full = _currentPath();
    const [path, queryString] = full.split('?');
    const query = _parseQuery(queryString);
    for (const route of _routes) {
      const match = path.match(route.pattern);
      if (match) {
        const params = {};
        route.keys.forEach((key, i) => { params[key] = decodeURIComponent(match[i + 1]); });
        route.handler(params, query);
        _highlightNav(path);
        return;
      }
    }
    if (_notFound) _notFound();
  }

  /** Mark the sidebar link matching the route's top-level segment as active. */
  function _highlightNav(path) {
    const base = '/' + path.split('/')[1];
    document.querySelectorAll('[data-nav-link]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-nav-link') === base);
    });
  }

  /** @param {string} path - e.g. '/requests/SOL-000001' */
  function navigate(path) {
    window.location.hash = path;
  }

  function start() {
    window.addEventListener('hashchange', _resolve);
    _resolve();
  }

  /** Re-render whatever route is currently active (e.g. after a data change or language switch). */
  function refresh() {
    _resolve();
  }

  return { register, notFound, navigate, start, refresh };

})();

if (typeof window !== 'undefined') window.CRMRouter = CRMRouter;
if (typeof module !== 'undefined') module.exports = CRMRouter;
