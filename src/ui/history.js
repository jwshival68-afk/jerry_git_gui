import { state } from '../state.js';
import { commitLog } from '../api.js';
import { el } from './dom.js';

export async function refreshHistory() {
  const commits = await commitLog(state.repoPath, 100);
  const graph = document.querySelector('#commit-graph');
  graph.innerHTML = '';
  commits.forEach((c, i) => {
    const row = el('div', `commit-row${i === 0 ? ' head' : ''}`);
    const body = el('div', 'commit-body');
    body.appendChild(el('div', 'commit-message', c.message));
    const meta = el('div', 'commit-meta');
    meta.appendChild(el('span', 'commit-hash', c.short_hash));
    meta.appendChild(el('span', null, c.author));
    meta.appendChild(el('span', null, c.date));
    if (c.refs) {
      const refsWrap = el('span', 'commit-refs');
      c.refs.split(',').map((r) => r.trim()).filter(Boolean).forEach((r) => {
        refsWrap.appendChild(el('span', 'ref-badge', r));
      });
      meta.appendChild(refsWrap);
    }
    body.appendChild(meta);
    row.appendChild(body);
    graph.appendChild(row);
  });
  if (commits.length === 0) {
    graph.appendChild(el('div', 'empty-hint', 'No commits yet'));
  }
}
