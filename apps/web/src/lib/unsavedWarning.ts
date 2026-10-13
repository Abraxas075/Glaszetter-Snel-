interface State { dirty: boolean; message: string; busy: boolean; bypass: boolean; }

// Never add a history entry just because a form becomes dirty. Capture Back
// before the router handles it; restore the form's URL/state only if declined.
export function installUnsavedWarning(win: Window, doc: Document, state: () => State, allowLeave: () => void) {
  const formUrl = win.location.href;
  const formState = win.history.state;
  const needsWarning = () => { const value = state(); return value.dirty && !value.bypass; };
  const confirmLeave = () => { const value = state(); return !value.busy && win.confirm(value.message); };
  const unload = (event: BeforeUnloadEvent) => {
    if (needsWarning()) { event.preventDefault(); event.returnValue = ''; }
  };
  const click = (event: MouseEvent) => {
    if (!needsWarning() || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(target instanceof HTMLAnchorElement) || target.target === '_blank' || target.hasAttribute('download')) return;
    const url = new URL(target.href);
    if (!['http:', 'https:'].includes(url.protocol) || (url.origin === win.location.origin && url.pathname === win.location.pathname && url.search === win.location.search)) return;
    if (!confirmLeave()) { event.preventDefault(); event.stopImmediatePropagation(); }
    else allowLeave();
  };
  const back = (event: PopStateEvent) => {
    if (!needsWarning()) return;
    if (confirmLeave()) { allowLeave(); return; }
    event.stopImmediatePropagation();
    win.history.pushState(formState, '', formUrl);
  };
  win.addEventListener('beforeunload', unload);
  doc.addEventListener('click', click, true);
  win.addEventListener('popstate', back, true);
  return () => {
    win.removeEventListener('beforeunload', unload);
    doc.removeEventListener('click', click, true);
    win.removeEventListener('popstate', back, true);
  };
}
