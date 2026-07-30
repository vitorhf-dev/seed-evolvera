const owners = new Set();

function renderLockState() {
  const body = document.body;
  if (!body) return;
  body.classList.toggle("js-scroll-locked", owners.size > 0);
  body.dataset.scrollLockOwners = String(owners.size);
}

export function acquireScrollLock(owner) {
  if (!owner) return;
  owners.add(owner);
  renderLockState();
}

export function releaseScrollLock(owner) {
  if (!owner) return;
  owners.delete(owner);
  renderLockState();
}

export function hasScrollLock(owner) {
  return owners.has(owner);
}
