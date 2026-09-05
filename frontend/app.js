const API = '/api';
const PAGE = document.body?.dataset?.page || 'play';
const LABELS = {
  R: '俥', N: '傌', B: '相', A: '仕', K: '帥', C: '炮', P: '兵',
  r: '車', n: '馬', b: '象', a: '士', k: '將', c: '砲', p: '卒',
};

let canvas, ctx;
let board = [];
let turn = 'red';
let selected = null;
let legalUci = [];
let highlights = [];
let lastMove = null;
let flipped = false;
let busy = false;
let mode = 'human_vs_human';
let humanColor = 'red';
let online = { active: false, roomId: null, token: null, color: null, ws: null };
let lastCouncil = null;
let verdictUci = null;

function parseBoardFromFen(fen) {
  const rows = (fen || '').split(' ')[0].split('/');
  const out = Array.from({ length: 10 }, () => Array(9).fill(null));
  rows.forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) c += Number(ch);
      else {
        out[r][c] = ch;
        c += 1;
      }
    }
  });
  return out;
}

function colorOf(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? 'red' : 'black';
}

function screenPoint(row, col) {
  return flipped ? { row: 9 - row, col: 8 - col } : { row, col };
}

function boardPoint(screenRow, screenCol) {
  return flipped ? { row: 9 - screenRow, col: 8 - screenCol } : { row: screenRow, col: screenCol };
}

function metrics() {
  const padX = 45;
  const padY = 45;
  return { padX, padY, cellX: (canvas.width - padX * 2) / 8, cellY: (canvas.height - padY * 2) / 9 };
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawBoard() {
  const { padX, padY, cellX, cellY } = metrics();
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#e6c38a');
  gradient.addColorStop(1, '#c9924f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#6c3c1f';
  ctx.lineWidth = 3;
  for (let row = 0; row < 10; row++) {
    const y = padY + row * cellY;
    line(padX, y, padX + 8 * cellX, y);
  }
  for (let col = 0; col < 9; col++) {
    const x = padX + col * cellX;
    if (col === 0 || col === 8) line(x, padY, x, padY + 9 * cellY);
    else {
      line(x, padY, x, padY + 4 * cellY);
      line(x, padY + 5 * cellY, x, padY + 9 * cellY);
    }
  }
  line(padX + 3 * cellX, padY, padX + 5 * cellX, padY + 2 * cellY);
  line(padX + 5 * cellX, padY, padX + 3 * cellX, padY + 2 * cellY);
  line(padX + 3 * cellX, padY + 7 * cellY, padX + 5 * cellX, padY + 9 * cellY);
  line(padX + 5 * cellX, padY + 7 * cellY, padX + 3 * cellX, padY + 9 * cellY);
  ctx.fillStyle = '#6c3c1f';
  ctx.font = 'bold 42px STKaiti, KaiTi, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(flipped ? '漢界' : '楚河', padX + cellX * 2, padY + cellY * 4.5);
  ctx.fillText(flipped ? '楚河' : '漢界', padX + cellX * 6, padY + cellY * 4.5);

  if (lastMove) {
    for (const [r, c] of [lastMove.from, lastMove.to]) {
      const p = screenPoint(r, c);
      ctx.fillStyle = 'rgba(255, 214, 90, .28)';
      ctx.beginPath();
      ctx.arc(padX + p.col * cellX, padY + p.row * cellY, Math.min(cellX, cellY) * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (selected) {
    const p = screenPoint(selected.row, selected.col);
    ctx.fillStyle = 'rgba(255, 238, 125, .4)';
    ctx.beginPath();
    ctx.arc(padX + p.col * cellX, padY + p.row * cellY, Math.min(cellX, cellY) * 0.43, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const h of highlights) {
    const p = screenPoint(h.row, h.col);
    const x = padX + p.col * cellX;
    const y = padY + p.row * cellY;
    if (h.capture) {
      ctx.strokeStyle = 'rgba(180, 45, 35, .85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, Math.min(cellX, cellY) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(45, 110, 70, .55)';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPieces() {
  const { padX, padY, cellX, cellY } = metrics();
  const radius = Math.min(cellX, cellY) * 0.39;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row]?.[col];
      if (!piece) continue;
      const p = screenPoint(row, col);
      const x = padX + p.col * cellX;
      const y = padY + p.row * cellY;
      ctx.shadowColor = 'rgba(0,0,0,.32)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#efd39a';
      ctx.strokeStyle = colorOf(piece) === 'red' ? '#9f372e' : '#292820';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = colorOf(piece) === 'red' ? '#a5352d' : '#282820';
      ctx.font = `bold ${Math.round(radius * 1.1)}px STKaiti, KaiTi, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LABELS[piece], x, y + 1);
    }
  }
}

function renderBoard() {
  if (!canvas) return;
  drawBoard();
  drawPieces();
}

function setStatus(state) {
  const topIsBlack = !flipped;
  const topColor = topIsBlack ? 'black' : 'red';
  const bottomColor = topIsBlack ? 'red' : 'black';
  const topEl = document.getElementById('top-state');
  const bottomEl = document.getElementById('bottom-state');
  const turnBadge = document.getElementById('turn-badge');
  const checkBadge = document.getElementById('check-badge');
  const resultBanner = document.getElementById('result-banner');
  if (turnBadge) turnBadge.textContent = state.is_game_over ? '对局结束' : `${state.turn === 'red' ? '红' : '黑'}方行棋`;
  if (topEl) topEl.textContent = state.is_game_over ? (state.result || '') : (state.turn === topColor ? '轮到你走' : '等待中');
  if (bottomEl) bottomEl.textContent = state.is_game_over ? (state.result || '') : (state.turn === bottomColor ? '轮到你走' : '等待中');
  if (checkBadge) checkBadge.hidden = !state.in_check || !!state.is_game_over;
  if (resultBanner) {
    if (state.result) {
      resultBanner.hidden = false;
      resultBanner.textContent = state.result;
    } else {
      resultBanner.hidden = true;
    }
  }
  const list = document.getElementById('move-list');
  const count = document.getElementById('move-count');
  if (count) count.textContent = `${state.move_count || 0} 着`;
  if (list) {
    const moves = state.moves || [];
    list.innerHTML = moves.length
      ? moves.map((m, i) => `<li>${i + 1}. ${m.color === 'red' ? '红' : '黑'} ${m.san || m.uci}</li>`).join('')
      : '<li class="placeholder">尚无着法</li>';
    list.scrollTop = list.scrollHeight;
  }
}

function applyState(state) {
  board = state.board || parseBoardFromFen(state.fen);
  turn = state.turn;
  legalUci = state.legal_uci || [];
  const moves = state.moves || [];
  lastMove = moves.length
    ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to }
    : null;
  selected = null;
  highlights = [];
  setStatus(state);
  renderBoard();
  return state;
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || '请求失败');
  return data;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function formatText(text) {
  if (!text) return '<p class="placeholder">暂无分析</p>';
  return String(text)
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => `<p>${escapeHtml(l)}</p>`)
    .join('');
}

function renderOpinion(op, title) {
  if (!op) return `<p class="placeholder">${escapeHtml(title)}暂无数据</p>`;
  const points = (op.reasoning_points || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('');
  const concerns = (op.concerns || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('');
  return `
    <div class="agent-card">
      <div class="agent-meta">
        <span>推荐 ${escapeHtml(op.recommended_move || '—')}</span>
        <span>置信 ${Math.round((op.confidence || 0) * 100)}%</span>
        <span>风险 ${Math.round((op.risk || 0) * 100)}%</span>
        <span>评估 ${op.evaluation ?? '—'}</span>
      </div>
      ${formatText(op.summary)}
      ${points ? `<p><strong>要点</strong></p><ul>${points}</ul>` : ''}
      ${concerns ? `<p><strong>顾虑</strong></p><ul>${concerns}</ul>` : ''}
    </div>`;
}

function renderDebate(council) {
  if (!council) return '<p class="placeholder">尚未分析</p>';
  const d = council.debate || {};
  const v = council.verdict || {};
  if (!d.triggered) {
    return `
      <p>未触发辩论（三位意见较一致）。</p>
      <div class="verdict-box">
        <p><strong>共识裁决</strong>：${escapeHtml(v.recommended_move || '—')}</p>
        ${formatText(v.summary || '')}
      </div>`;
  }
  const rounds = (d.rounds || []).map((r) => `
    <div class="debate-round">
      <div class="who">${escapeHtml(r.speaker)} · ${escapeHtml(r.role)}</div>
      ${formatText(r.text)}
    </div>`).join('');
  return `
    <p>已触发交叉质询与仲裁。</p>
    ${rounds}
    <div class="verdict-box">
      <p><strong>仲裁结果</strong>：${escapeHtml(v.recommended_move || '—')}
        （置信 ${Math.round((v.confidence || 0) * 100)}%）</p>
      ${formatText(v.summary || '')}
    </div>`;
}

function activateTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach((el) => {
    const on = el.id === `tab-${name}`;
    el.classList.toggle('active', on);
    el.hidden = !on;
  });
}

function updateDisagreement(council) {
  const fill = document.getElementById('dg-fill');
  const label = document.getElementById('dg-label');
  if (!council?.disagreement) {
    if (fill) fill.style.width = '0%';
    if (label) label.textContent = '待命';
    ['tactical', 'strategic', 'risk'].forEach((role) => {
      const moveEl = document.getElementById(`dg-move-${role}`);
      const stateEl = document.getElementById(`dg-state-${role}`);
      const card = document.querySelector(`.dg-card[data-role="${role}"]`);
      if (moveEl) moveEl.textContent = '—';
      if (stateEl) stateEl.textContent = '待命';
      card?.classList.remove('is-ready', 'is-agree', 'is-dissent', 'is-thinking');
    });
    return;
  }
  const dg = council.disagreement;
  const pct = Math.round((dg.disagreement_score || 0) * 100);
  if (fill) fill.style.width = `${pct}%`;
  const debateOn = !!(council.debate && council.debate.triggered);
  if (label) label.textContent = `${dg.badge || ''} · 争议 ${pct}%${debateOn ? ' · 已开辩论' : ''}`;

  const rm = dg.recommended_moves || {};
  const moves = {
    tactical: rm.tactical || council.agents?.tactical?.recommended_move || '—',
    strategic: rm.strategic || council.agents?.strategic?.recommended_move || '—',
    risk: rm.risk || council.agents?.risk?.recommended_move || '—',
  };
  const unique = new Set(Object.values(moves).filter((m) => m && m !== '—'));
  const dissent = unique.size > 1;
  const counts = {};
  Object.values(moves).forEach((m) => { counts[m] = (counts[m] || 0) + 1; });
  const majority = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

  Object.entries(moves).forEach(([role, move]) => {
    const card = document.querySelector(`.dg-card[data-role="${role}"]`);
    const moveEl = document.getElementById(`dg-move-${role}`);
    const stateEl = document.getElementById(`dg-state-${role}`);
    card?.classList.remove('is-thinking', 'is-ready', 'is-dissent', 'is-agree');
    if (moveEl) moveEl.textContent = move;
    if (dissent && move !== '—') {
      if (majority && move === majority && counts[majority] >= 2) {
        card?.classList.add('is-agree');
        if (stateEl) stateEl.textContent = '多数意见';
      } else {
        card?.classList.add('is-dissent');
        if (stateEl) stateEl.textContent = '唱反调';
      }
    } else {
      card?.classList.add('is-ready');
      if (stateEl) stateEl.textContent = move === '—' ? '无推荐' : '一致';
    }
  });
}

function applyCouncil(council) {
  lastCouncil = council;
  const ev = council?.eval || {};
  const red = ev.red_pct ?? 50;
  const black = ev.black_pct ?? 50;
  const redBar = document.getElementById('eval-red');
  const blackBar = document.getElementById('eval-black');
  if (redBar) redBar.style.height = `${red}%`;
  if (blackBar) blackBar.style.height = `${black}%`;
  const redProb = document.getElementById('red-prob');
  const blackProb = document.getElementById('black-prob');
  if (redProb) redProb.textContent = `红 ${red}%`;
  if (blackProb) blackProb.textContent = `黑 ${black}%`;
  const moveClass = document.getElementById('move-class');
  if (moveClass) moveClass.textContent = council?.move_class || ev.label || '已分析';
  const status = document.getElementById('council-status');
  if (status) status.textContent = council?.debate?.triggered ? '辩论中' : '已出牌';

  updateDisagreement(council);
  document.getElementById('tab-summary').innerHTML = renderOpinion(council?.agents?.coach, '教练');
  document.getElementById('tab-tactical').innerHTML = renderOpinion(council?.agents?.tactical, '攻杀');
  document.getElementById('tab-strategic').innerHTML = renderOpinion(council?.agents?.strategic, '局势');
  document.getElementById('tab-risk').innerHTML = renderOpinion(council?.agents?.risk, '风险');
  document.getElementById('tab-debate').innerHTML = renderDebate(council);

  verdictUci = council?.verdict?.uci || council?.agents?.coach?.uci || null;
  const playBtn = document.getElementById('btn-play-verdict');
  if (playBtn) playBtn.disabled = !verdictUci || online.active;

  const note = document.getElementById('council-note');
  if (note && council?.agents?.coach?.takeaway) {
    note.textContent = council.agents.coach.takeaway;
  }

  activateTab(council?.debate?.triggered ? 'debate' : 'summary');
}

async function runCouncilAnalyze({ silent = false } = {}) {
  const btn = document.getElementById('btn-analyze');
  const status = document.getElementById('council-status');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '分析中…';
  }
  if (status) status.textContent = '入座中…';
  ['tactical', 'strategic', 'risk'].forEach((role) => {
    document.querySelector(`.dg-card[data-role="${role}"]`)?.classList.add('is-thinking');
    const stateEl = document.getElementById(`dg-state-${role}`);
    if (stateEl) stateEl.textContent = '思考中';
  });
  try {
    const data = await api('/game/analyze-position', {
      method: 'POST',
      body: JSON.stringify({ with_analysis: true }),
    });
    applyCouncil(data.council || data.analysis?.council);
    return data;
  } catch (err) {
    if (!silent) alert(err.message);
    if (status) status.textContent = '分析失败';
    throw err;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '分析局面';
    }
  }
}

function wireCouncilUi() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  });
  document.querySelectorAll('.dg-card').forEach((card) => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      const tab = card.dataset.tab || role;
      activateTab(tab);
      const agent = lastCouncil?.agents?.[role];
      if (agent?.uci && !online.active && !busy) {
        // 二次点击同一推荐则走出
        if (card.dataset.armed === agent.uci) {
          playMove(agent.uci);
          card.dataset.armed = '';
        } else {
          card.dataset.armed = agent.uci || '';
          const stateEl = document.getElementById(`dg-state-${role}`);
          if (stateEl) stateEl.textContent = '再点走出';
        }
      }
    });
  });
  document.getElementById('btn-analyze')?.addEventListener('click', () => {
    runCouncilAnalyze().catch(() => {});
  });
  document.getElementById('btn-play-verdict')?.addEventListener('click', async () => {
    if (!verdictUci) return;
    await playMove(verdictUci);
  });
}

async function maybeAnalyzeAfterMove() {
  if (online.active) return;
  if (!document.getElementById('with-analysis')?.checked) return;
  try {
    await runCouncilAnalyze({ silent: true });
  } catch (_) {}
}

async function maybeAiReply(state) {
  if (mode !== 'human_vs_ai' || state.is_game_over || online.active) return;
  if (state.turn === humanColor) return;
  busy = true;
  try {
    const next = await api('/game/ai-step?depth=2', { method: 'POST' });
    applyState(next);
    await maybeAnalyzeAfterMove();
  } catch (err) {
    console.error(err);
  } finally {
    busy = false;
  }
}

async function newGame() {
  mode = document.getElementById('game-mode')?.value || 'human_vs_human';
  humanColor = document.getElementById('human-color')?.value || 'red';
  flipped = humanColor === 'black';
  const state = await api('/game/new', {
    method: 'POST',
    body: JSON.stringify({ mode, human_color: humanColor }),
  });
  applyState(state);
  await maybeAiReply(state);
}

async function playMove(uci) {
  if (busy) return;
  busy = true;
  try {
    if (online.active) {
      if (online.ws && online.ws.readyState === WebSocket.OPEN) {
        online.ws.send(JSON.stringify({ type: 'move', uci }));
      } else {
        const data = await api(`/rooms/${online.roomId}/move`, {
          method: 'POST',
          body: JSON.stringify({ token: online.token, uci }),
        });
        applyState(data.state);
      }
      return;
    }
    const state = await api('/game/move', { method: 'POST', body: JSON.stringify({ uci }) });
    applyState(state);
    await maybeAnalyzeAfterMove();
    await maybeAiReply(state);
  } catch (err) {
    alert(err.message);
  } finally {
    busy = false;
  }
}

function squareCode(row, col) {
  return `${String.fromCharCode(97 + col)}${9 - row}`;
}

function rebuildHighlights() {
  highlights = [];
  if (!selected) return;
  const from = squareCode(selected.row, selected.col);
  for (const uci of legalUci) {
    if (!uci.startsWith(from)) continue;
    const to = uci.slice(2);
    const col = to.charCodeAt(0) - 97;
    const row = 9 - Number(to.slice(1));
    highlights.push({ row, col, capture: !!board[row]?.[col] });
  }
}

async function onBoardClick(event) {
  if (!canvas || busy) return;
  const stateTurn = turn;
  const may = online.active ? online.color === stateTurn : (mode === 'human_vs_ai' ? stateTurn === humanColor : true);
  if (!may) return;

  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
  const y = ((event.clientY - rect.top) * canvas.height) / rect.height;
  const { padX, padY, cellX, cellY } = metrics();
  const screenCol = Math.round((x - padX) / cellX);
  const screenRow = Math.round((y - padY) / cellY);
  if (screenRow < 0 || screenRow > 9 || screenCol < 0 || screenCol > 8) return;
  const point = boardPoint(screenRow, screenCol);
  const piece = board[point.row][point.col];

  if (!selected) {
    if (piece && colorOf(piece) === stateTurn) {
      selected = point;
      rebuildHighlights();
      renderBoard();
    }
    return;
  }
  if (piece && colorOf(piece) === stateTurn) {
    selected = point;
    rebuildHighlights();
    renderBoard();
    return;
  }
  const uci = `${squareCode(selected.row, selected.col)}${squareCode(point.row, point.col)}`;
  selected = null;
  highlights = [];
  renderBoard();
  await playMove(uci);
}

async function bootPlay() {
  canvas = document.getElementById('xiangqi-board');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  wireCouncilUi();
  canvas.addEventListener('click', onBoardClick);
  document.getElementById('new-game')?.addEventListener('click', () => newGame().catch(e => alert(e.message)));
  document.getElementById('flip')?.addEventListener('click', () => {
    flipped = !flipped;
    selected = null;
    highlights = [];
    renderBoard();
  });
  document.getElementById('undo')?.addEventListener('click', async () => {
    if (online.active) return alert('联机中请双方协商后重置');
    try {
      applyState(await api('/game/undo', { method: 'POST' }));
      await maybeAnalyzeAfterMove();
    } catch (err) {
      alert(err.message);
    }
  });
  document.getElementById('ai-step')?.addEventListener('click', async () => {
    try {
      applyState(await api('/game/ai-step?depth=2', { method: 'POST' }));
      await maybeAnalyzeAfterMove();
    } catch (err) {
      alert(err.message);
    }
  });
  document.getElementById('hint')?.addEventListener('click', async () => {
    try {
      await runCouncilAnalyze();
      const move = lastCouncil?.verdict?.recommended_move || lastCouncil?.agents?.coach?.recommended_move;
      alert(move ? `理事会建议：${move}` : '暂无建议');
    } catch (err) {
      alert(err.message);
    }
  });
  document.getElementById('game-mode')?.addEventListener('change', () => {
    mode = document.getElementById('game-mode').value;
  });
  document.getElementById('human-color')?.addEventListener('change', () => {
    humanColor = document.getElementById('human-color').value;
  });
  const params = new URLSearchParams(location.search);
  if (params.get('puzzle') || params.get('continue') === '1') {
    applyState(await api('/game/state'));
    if (params.get('puzzle')) {
      const note = document.getElementById('council-note');
      if (note) note.textContent = '残局已加载：可点「分析局面」或直接走子。';
    }
  } else {
    await newGame();
  }
  // 开局自动给一版局面阅读
  runCouncilAnalyze({ silent: true }).catch(() => {});
}

async function bootLearn() {
  const box = document.getElementById('puzzle-list');
  if (!box) return;
  const data = await api('/puzzles');
  box.innerHTML = (data.items || []).map((p) => `
    <article class="panel feature-card">
      <h2>${p.title}</h2>
      <p>${p.goal}</p>
      <p class="muted">难度 ${'★'.repeat(p.difficulty)}${'☆'.repeat(3 - p.difficulty)} · ${p.side === 'red' ? '红先' : '黑先'}</p>
      <button class="accent" data-id="${p.id}" type="button">开始</button>
    </article>
  `).join('');
  box.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      await api(`/puzzles/${id}/load`, { method: 'POST' });
      location.href = 'index.html?puzzle=' + encodeURIComponent(id) + '&continue=1';
    });
  });
}

async function bootOnline() {
  const status = document.getElementById('online-status');
  const roomInput = document.getElementById('room-code');
  document.getElementById('btn-create')?.addEventListener('click', async () => {
    const name = document.getElementById('player-name')?.value || '玩家';
    const color = document.getElementById('seat-color')?.value || 'red';
    const data = await api('/rooms', { method: 'POST', body: JSON.stringify({ name, color }) });
    online = { active: true, roomId: data.room_id, token: data.token, color: data.color, ws: null };
    localStorage.setItem('xq_online', JSON.stringify(online));
    status.textContent = `已创建房间 ${data.room_id}，你执${data.color === 'red' ? '红' : '黑'}`;
    roomInput.value = data.room_id;
    connectWs();
  });
  document.getElementById('btn-join')?.addEventListener('click', async () => {
    const name = document.getElementById('player-name')?.value || '玩家';
    const code = (roomInput?.value || '').trim().toUpperCase();
    const data = await api(`/rooms/${code}/join`, { method: 'POST', body: JSON.stringify({ name }) });
    online = { active: true, roomId: data.room_id, token: data.token, color: data.color, ws: null };
    localStorage.setItem('xq_online', JSON.stringify(online));
    status.textContent = `已加入 ${data.room_id}，你执${data.color === 'red' ? '红' : '黑'}`;
    connectWs();
  });
  document.getElementById('btn-goto-play')?.addEventListener('click', () => {
    location.href = 'index.html?online=1';
  });
  document.getElementById('btn-copy')?.addEventListener('click', async () => {
    if (!online.roomId) return;
    const url = `${location.origin}/index.html?room=${online.roomId}`;
    await navigator.clipboard.writeText(url);
    status.textContent = '房间链接已复制';
  });
}

function connectWs() {
  if (!online.roomId || !online.token) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/api/rooms/${online.roomId}/ws?token=${encodeURIComponent(online.token)}`);
  online.ws = ws;
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.state) applyState(msg.state);
    if (msg.type === 'error') alert(msg.message || '联机错误');
  };
}

async function resumeOnlineIfNeeded() {
  const params = new URLSearchParams(location.search);
  if (params.get('online') === '1' || params.get('room')) {
    try {
      const saved = JSON.parse(localStorage.getItem('xq_online') || 'null');
      if (saved?.roomId && saved?.token) {
        online = { ...saved, ws: null, active: true };
        const state = await api(`/rooms/${online.roomId}`);
        mode = 'human_vs_human';
        flipped = online.color === 'black';
        applyState(state);
        connectWs();
        document.getElementById('council-note').innerHTML = `<strong>联机房间 ${online.roomId}</strong><p>你执${online.color === 'red' ? '红' : '黑'}方。对手走子会实时同步。</p>`;
        return true;
      }
    } catch (_) {}
  }
  return false;
}

async function bootTools() {
  document.getElementById('btn-export-fen')?.addEventListener('click', async () => {
    const state = await api('/game/state');
    document.getElementById('fen-box').value = state.fen;
  });
  document.getElementById('btn-load-fen')?.addEventListener('click', async () => {
    const fen = document.getElementById('fen-box').value.trim();
    await api('/game/load-fen', { method: 'POST', body: JSON.stringify({ fen }) });
    alert('FEN 已加载，可回对弈页继续');
  });
  document.getElementById('btn-goto-board')?.addEventListener('click', () => {
    location.href = 'index.html?continue=1';
  });
}

async function boot() {
  try {
    const h = await api('/health');
    const el = document.getElementById('service-status');
    if (el) el.textContent = `${h.product} · 规则就绪`;
  } catch (_) {
    const el = document.getElementById('service-status');
    if (el) el.textContent = '服务未连接';
  }

  if (PAGE === 'play') {
    const resumed = await resumeOnlineIfNeeded();
    if (!resumed) await bootPlay();
    else {
      canvas = document.getElementById('xiangqi-board');
      ctx = canvas.getContext('2d');
      canvas.addEventListener('click', onBoardClick);
      document.getElementById('flip')?.addEventListener('click', () => {
        flipped = !flipped;
        renderBoard();
      });
    }
  } else if (PAGE === 'learn') {
    await bootLearn();
  } else if (PAGE === 'online') {
    await bootOnline();
  } else if (PAGE === 'tools') {
    await bootTools();
  }
}

boot().catch((err) => console.error(err));
