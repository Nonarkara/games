import { AnalyticsService } from './analytics.js';
import { StorageService } from './storage.js';

const esc = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export class AccountService {
  static state = { loading: true, authenticated: false, google_available: false, user: null, syncing: false };
  static _onChange = null;
  static _timer = null;
  static _syncing = false;

  static async init(onChange) {
    this._onChange = onChange;
    window.addEventListener('ngs:data-changed', () => this.scheduleSync());
    window.addEventListener('ngs:analytics-changed', () => this.scheduleSync());
    await this.refresh();
    const result = new URL(location.href).searchParams.get('auth');
    if (result) history.replaceState({}, '', `${location.pathname}${location.hash || ''}`);
    if (this.state.authenticated) await this.syncNow();
  }

  static notify() { if (this._onChange) this._onChange(this.state); }

  static async refresh() {
    try {
      const response = await fetch('/api/auth/status', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('status');
      this.state = { ...this.state, loading: false, ...(await response.json()) };
    } catch {
      this.state = { ...this.state, loading: false, authenticated: false, user: null };
    }
    this.notify();
    return this.state;
  }

  static scheduleSync() {
    if (!this.state.authenticated || this._syncing) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.syncNow(), 1200);
  }

  static async syncNow(retry = true) {
    if (!this.state.authenticated || this._syncing) return false;
    this._syncing = true;
    this.state.syncing = true;
    this.notify();
    try {
      const remoteResponse = await fetch('/api/sync', { credentials: 'same-origin' });
      if (!remoteResponse.ok) throw new Error('read');
      const remote = await remoteResponse.json();
      const snapshot = StorageService.mergeSyncSnapshot(remote.snapshot);
      const events = AnalyticsService.mergeLog(remote.events);
      const writeResponse = await fetch('/api/sync', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ snapshot, events: events.slice(-100), base_revision: remote.revision })
      });
      if (writeResponse.status === 409 && retry) {
        const conflict = await writeResponse.json();
        StorageService.mergeSyncSnapshot(conflict.snapshot);
        AnalyticsService.mergeLog(conflict.events);
        this._syncing = false;
        return this.syncNow(false);
      }
      if (!writeResponse.ok) throw new Error('write');
      return true;
    } catch {
      return false;
    } finally {
      this._syncing = false;
      this.state.syncing = false;
      this.notify();
    }
  }

  static async logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    await this.refresh();
    document.querySelector('#account-overlay')?.remove();
  }

  static async deleteCloudData() {
    if (!window.confirm('Delete your synced NGS progress and account link? Progress already in this browser will stay here.')) return;
    const response = await fetch('/api/account', { method: 'DELETE', credentials: 'same-origin' }).catch(() => null);
    if (!response?.ok) return;
    await this.refresh();
    document.querySelector('#account-overlay')?.remove();
  }

  static openPanel() {
    document.querySelector('#account-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'account-overlay';
    overlay.className = 'account-overlay';
    const user = this.state.user;
    overlay.innerHTML = `
      <section class="account-panel" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <header><p>PLAYER MEMORY</p><button type="button" data-account-close aria-label="Close account panel">CLOSE</button></header>
        <h2 id="account-title">${user ? `SAVED AS ${esc(user.name).toUpperCase()}` : 'PLAY FREE. SAVE WHEN READY.'}</h2>
        <p class="account-lead">${user
          ? `Progress is linked to ${esc(user.email)} and syncs across signed-in devices.`
          : 'Guest scores and play history stay in this browser. They disappear if you clear this site’s data or use private browsing.'}</p>
        <div class="account-data">
          <b>${user ? 'WHAT SYNCS' : 'WHAT STAYS LOCAL'}</b>
          <p>High scores, favourites, play count, and practice history. Custom game code and display settings never leave this device.</p>
        </div>
        ${user ? `
          <button class="account-primary" type="button" data-account-sync>${this.state.syncing ? 'SYNCING…' : 'SYNC NOW'}</button>
          <button class="account-secondary" type="button" data-account-logout>SIGN OUT</button>
          <button class="account-delete" type="button" data-account-delete>DELETE CLOUD SAVE</button>`
          : this.state.google_available ? `
          <a class="account-primary" href="/api/auth/google/start">CONTINUE WITH GOOGLE</a>
          <p class="account-fine">Optional. NGS stores your Google account ID, verified email, display name, and game progress. It never stores your Google password or access token.</p>`
          : `
          <button class="account-primary" type="button" disabled>GOOGLE SIGN-IN · SETUP PENDING</button>
          <p class="account-fine">Guest play is unaffected. The server is ready; an administrator still needs to add the Google client credentials.</p>`}
      </section>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.onclick = event => { if (event.target === overlay || event.target.closest('[data-account-close]')) close(); };
    overlay.querySelector('[data-account-sync]')?.addEventListener('click', async () => { await this.syncNow(); close(); this.openPanel(); });
    overlay.querySelector('[data-account-logout]')?.addEventListener('click', () => this.logout());
    overlay.querySelector('[data-account-delete]')?.addEventListener('click', () => this.deleteCloudData());
    overlay.querySelector('[data-account-close]')?.focus();
  }
}
