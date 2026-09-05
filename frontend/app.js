const canvas = document.getElementById('xiangqi-board');
const ctx = canvas.getContext('2d');

const START = [
  ['r', 'n', 'b', 'a', 'k', 'a', 'b', 'n', 'r'],
  [null, null, null, null, null, null, null, null, null],
  [null, 'c', null, null, null, null, null, 'c', null],
  ['p', null, 'p', null, 'p', null, 'p', null, 'p'],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  ['P', null, 'P', null, 'P', null, 'P', null, 'P'],
  [null, 'C', null, null, null, null, null, 'C', null],
  [null, null, null, null, null, null, null, null, null],
  ['R', 'N', 'B', 'A', 'K', 'A', 'B', 'N', 'R'],
];

const LABELS = {
  R: '俥', N: '傌', B: '相', A: '仕', K: '帥', C: '炮', P: '兵',
  r: '車', n: '馬', b: '象', a: '士', k: '將', c: '砲', p: '卒',
};
const NAMES = { r: '车', n: '马', b: '象', a: '士', k: '将', c: '炮', p: '兵' };

let board = [];
let turn = 'red';
let selected = null;
let history = [];
let flipped = false;

function resetGame() {
  board = START.map(row => [...row]);
  turn = 'red';
  selected = null;
  history = [];
  render();
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

  if (selected) {
    const p = screenPoint(selected.row, selected.col);
    ctx.fillStyle = 'rgba(255, 238, 125, .38)';
    ctx.beginPath();
    ctx.arc(padX + p.col * cellX, padY + p.row * cellY, Math.min(cellX, cellY) * .43, 0, Math.PI * 2);
    ctx.fill();
  }
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawPieces() {
  const { padX, padY, cellX, cellY } = metrics();
  const radius = Math.min(cellX, cellY) * .39;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
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

function render() {
  drawBoard();
  drawPieces();
  document.getElementById('turn-badge').textContent = `${turn === 'red' ? '红' : '黑'}方行棋`;
  document.getElementById('red-state').textContent = turn === 'red' ? '轮到你走' : '等待黑方';
  document.getElementById('black-state').textContent = turn === 'black' ? '轮到你走' : '等待红方';
  const list = document.getElementById('move-list');
  if (!history.length) {
    list.innerHTML = '<li class="placeholder">尚无着法</li>';
    return;
  }
  list.innerHTML = history.map((entry, i) =>
    `<li>${i + 1}. ${entry.color === 'red' ? '红' : '黑'} ${entry.label}</li>`
  ).join('');
  list.scrollTop = list.scrollHeight;
}

function inBoard(row, col) {
  return row >= 0 && row < 10 && col >= 0 && col < 9;
}

function countBetween(from, to) {
  let count = 0;
  if (from.row === to.row) {
    const [a, b] = [from.col, to.col].sort((x, y) => x - y);
    for (let col = a + 1; col < b; col++) if (board[from.row][col]) count++;
  } else if (from.col === to.col) {
    const [a, b] = [from.row, to.row].sort((x, y) => x - y);
    for (let row = a + 1; row < b; row++) if (board[row][from.col]) count++;
  }
  return count;
}

function isPseudoLegal(from, to) {
  if (!inBoard(to.row, to.col)) return false;
  const piece = board[from.row][from.col];
  const target = board[to.row][to.col];
  if (!piece || colorOf(piece) !== turn || colorOf(target) === turn) return false;
  const type = piece.toLowerCase();
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const ar = Math.abs(dr);
  const ac = Math.abs(dc);
  const red = colorOf(piece) === 'red';

  if (type === 'r') return (dr === 0 || dc === 0) && countBetween(from, to) === 0;
  if (type === 'c') {
    if (dr !== 0 && dc !== 0) return false;
    const screens = countBetween(from, to);
    return target ? screens === 1 : screens === 0;
  }
  if (type === 'n') {
    if (!((ar === 2 && ac === 1) || (ar === 1 && ac === 2))) return false;
    const leg = ar === 2
      ? { row: from.row + Math.sign(dr), col: from.col }
      : { row: from.row, col: from.col + Math.sign(dc) };
    return !board[leg.row][leg.col];
  }
  if (type === 'b') {
    if (ar !== 2 || ac !== 2) return false;
    if (red ? to.row < 5 : to.row > 4) return false;
    return !board[from.row + dr / 2][from.col + dc / 2];
  }
  if (type === 'a') {
    return ar === 1 && ac === 1 && to.col >= 3 && to.col <= 5 &&
      (red ? to.row >= 7 : to.row <= 2);
  }
  if (type === 'k') {
    return ar + ac === 1 && to.col >= 3 && to.col <= 5 &&
      (red ? to.row >= 7 : to.row <= 2);
  }
  if (type === 'p') {
    const forward = red ? -1 : 1;
    if (dr === forward && dc === 0) return true;
    const crossed = red ? from.row <= 4 : from.row >= 5;
    return crossed && dr === 0 && ac === 1;
  }
  return false;
}

function generalsFace() {
  let redGeneral = null;
  let blackGeneral = null;
  for (let row = 0; row < 10; row++) {
    for (let col = 3; col <= 5; col++) {
      if (board[row][col] === 'K') redGeneral = { row, col };
      if (board[row][col] === 'k') blackGeneral = { row, col };
    }
  }
  return redGeneral && blackGeneral && redGeneral.col === blackGeneral.col &&
    countBetween(redGeneral, blackGeneral) === 0;
}

function tryMove(from, to) {
  if (!isPseudoLegal(from, to)) return false;
  const piece = board[from.row][from.col];
  const captured = board[to.row][to.col];
  board[to.row][to.col] = piece;
  board[from.row][from.col] = null;
  if (generalsFace()) {
    board[from.row][from.col] = piece;
    board[to.row][to.col] = captured;
    return false;
  }
  history.push({
    from, to, piece, captured, color: turn,
    label: `${NAMES[piece.toLowerCase()]} ${String.fromCharCode(97 + from.col)}${10 - from.row}→${String.fromCharCode(97 + to.col)}${10 - to.row}`,
  });
  turn = turn === 'red' ? 'black' : 'red';
  return true;
}

canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * sx;
  const y = (event.clientY - rect.top) * sy;
  const { padX, padY, cellX, cellY } = metrics();
  const screenCol = Math.round((x - padX) / cellX);
  const screenRow = Math.round((y - padY) / cellY);
  if (!inBoard(screenRow, screenCol)) return;
  const point = boardPoint(screenRow, screenCol);
  const piece = board[point.row][point.col];

  if (!selected) {
    if (piece && colorOf(piece) === turn) selected = point;
  } else if (piece && colorOf(piece) === turn) {
    selected = point;
  } else {
    tryMove(selected, point);
    selected = null;
  }
  render();
});

document.getElementById('new-game').addEventListener('click', resetGame);
document.getElementById('clear-history').addEventListener('click', () => {
  history = [];
  render();
});
document.getElementById('flip').addEventListener('click', () => {
  flipped = !flipped;
  selected = null;
  render();
});
document.getElementById('undo').addEventListener('click', () => {
  const last = history.pop();
  if (!last) return;
  board[last.from.row][last.from.col] = last.piece;
  board[last.to.row][last.to.col] = last.captured;
  turn = last.color;
  selected = null;
  render();
});

fetch('/api/health')
  .then(response => response.json())
  .then(() => { document.getElementById('service-status').textContent = '服务已连接'; })
  .catch(() => { document.getElementById('service-status').textContent = '纯前端模式'; });

resetGame();
