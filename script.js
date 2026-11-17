const FILENAME = 'chess.js';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const pieceMap = {
  w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' },
};

const boardEl = document.getElementById('board');
const turnBadge = document.getElementById('turnBadge');
const statusText = document.getElementById('statusText');
const moveListEl = document.getElementById('moveList');
const newGameBtn = document.getElementById('newGameBtn');
const undoBtn = document.getElementById('undoBtn');
const flipBtn = document.getElementById('flipBtn');
const whiteClockEl = document.getElementById('whiteClock');
const blackClockEl = document.getElementById('blackClock');
const whiteTimerPanel = document.getElementById('whiteTimerPanel');
const blackTimerPanel = document.getElementById('blackTimerPanel');

let game;
let selectedSquare = null;
let legalMoves = [];
let isFlipped = false;
let dragActive = null;
let timerHandle = null;
let isGamePaused = false;

const clock = {
  white: 600,
  black: 600,
  activeColor: 'w',
  started: false,
  lastTick: 0,
};

function safeChessInit() {
  if (!window.Chess) {
    statusText.textContent = 'Unable to load the chess engine. Please refresh the page.';
    return false;
  }

  game = new Chess();
  return true;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateClocks() {
  whiteClockEl.textContent = formatTime(clock.white);
  blackClockEl.textContent = formatTime(clock.black);

  const activePanel = clock.activeColor === 'w' ? whiteTimerPanel : blackTimerPanel;
  const otherPanel = clock.activeColor === 'w' ? blackTimerPanel : whiteTimerPanel;

  whiteTimerPanel.classList.toggle('active', clock.activeColor === 'w');
  blackTimerPanel.classList.toggle('active', clock.activeColor === 'b');

  if (clock.activeColor === 'w') {
    whiteTimerPanel.style.opacity = '1';
    blackTimerPanel.style.opacity = '0.8';
  } else {
    blackTimerPanel.style.opacity = '1';
    whiteTimerPanel.style.opacity = '0.8';
  }

  activePanel.style.transform = 'translateY(-1px)';
  otherPanel.style.transform = 'translateY(0)';
}

function startClock() {
  clearInterval(timerHandle);

  timerHandle = setInterval(() => {
    if (!clock.started || isGamePaused || game.isGameOver()) {
      return;
    }

    if (clock.activeColor === 'w') {
      clock.white = Math.max(0, clock.white - 1);
    } else {
      clock.black = Math.max(0, clock.black - 1);
    }

    if (clock.white === 0 || clock.black === 0) {
      clearInterval(timerHandle);
      clock.started = false;
      const winner = clock.activeColor === 'w' ? 'Black' : 'White';
      statusText.textContent = `Time up! ${winner} wins by timeout.`;
      turnBadge.textContent = 'TIME OUT';
      return;
    }

    updateClocks();
  }, 1000);
}

function resetClocks() {
  clock.white = 600;
  clock.black = 600;
  clock.activeColor = 'w';
  clock.started = true;
  clock.lastTick = Date.now();
  updateClocks();
  startClock();
}

function setTurnBadge() {
  turnBadge.textContent = game.turn() === 'w' ? 'WHITE TO MOVE' : 'BLACK TO MOVE';
}

function getBoardSquares() {
  const result = [];
  for (let rank = 8; rank >= 1; rank--) {
    for (const file of files) {
      result.push(`${file}${rank}`);
    }
  }
  return result;
}

function buildBoard() {
  boardEl.innerHTML = '';
  const squares = isFlipped ? [...getBoardSquares()].reverse() : getBoardSquares();

  squares.forEach((square) => {
    const file = square[0];
    const rank = Number(square[1]);
    const fileIndex = files.indexOf(file);
    const isLight = (fileIndex + rank) % 2 === 0;

    const squareEl = document.createElement('div');
    squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
    squareEl.dataset.square = square;

    if (selectedSquare === square) {
      squareEl.classList.add('selected');
    }

    if (legalMoves.includes(square)) {
      const captureMove = !!(game.get(square) && game.get(square).color !== game.turn());
      squareEl.classList.add(captureMove ? 'capture' : 'legal');
    }

    const piece = game.get(square);
    if (piece) {
      const pieceEl = document.createElement('div');
      pieceEl.className = `piece ${piece.color === 'w' ? 'white' : 'black'}`;
      pieceEl.textContent = pieceMap[piece.color][piece.type];
      pieceEl.setAttribute('aria-label', `${piece.color === 'w' ? 'white' : 'black'} ${piece.type}`);
      pieceEl.draggable = true;

      pieceEl.addEventListener('dragstart', (event) => {
        dragActive = square;
        if (!piece || piece.color !== game.turn()) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData('text/plain', square);
        event.dataTransfer.effectAllowed = 'move';
        pieceEl.classList.add('dragging');
      });

      pieceEl.addEventListener('dragend', () => {
        pieceEl.classList.remove('dragging');
        dragActive = null;
      });

      pieceEl.addEventListener('mousedown', () => {
        if (!piece || piece.color !== game.turn()) return;
        handleSquareClick(square, true);
      });

      squareEl.appendChild(pieceEl);
    }

    if (square[0] === 'a' || square[0] === 'h') {
      const rankLabel = document.createElement('span');
      rankLabel.className = 'coordinate rank-label';
      rankLabel.textContent = square[1];
      squareEl.appendChild(rankLabel);
    }

    if (square[1] === '1' || square[1] === '8') {
      const fileLabel = document.createElement('span');
      fileLabel.className = 'coordinate file-label';
      fileLabel.textContent = square[0];
      squareEl.appendChild(fileLabel);
    }

    squareEl.addEventListener('dragover', (event) => {
      if (dragActive) {
        event.preventDefault();
      }
    });

    squareEl.addEventListener('drop', (event) => {
      event.preventDefault();
      const sourceSquare = event.dataTransfer.getData('text/plain') || dragActive;
      if (sourceSquare) {
        handleSquareClick(square, false, sourceSquare);
      }
    });

    squareEl.addEventListener('click', () => handleSquareClick(square));
    boardEl.appendChild(squareEl);
  });
}

function updateStatus() {
  if (game.isGameOver()) {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      statusText.textContent = `Checkmate — ${winner} wins.`;
    } else if (game.isStalemate()) {
      statusText.textContent = 'Stalemate — draw game.';
    } else if (game.isThreefoldRepetition()) {
      statusText.textContent = 'Threefold repetition — draw game.';
    } else if (game.isInsufficientMaterial()) {
      statusText.textContent = 'Insufficient material — draw game.';
    } else if (game.isDraw()) {
      statusText.textContent = 'Draw game.';
    }
  } else if (game.inCheck()) {
    const side = game.turn() === 'w' ? 'White' : 'Black';
    statusText.textContent = `${side} is in check.`;
  } else {
    const side = game.turn() === 'w' ? 'White' : 'Black';
    statusText.textContent = `${side} to move.`;
  }

  setTurnBadge();
}

function updateMoveList() {
  const history = game.history({ verbose: true });
  moveListEl.innerHTML = '';

  history.forEach((move, index) => {
    const item = document.createElement('li');
    const moveNumber = Math.floor(index / 2) + 1;
    const prefix = index % 2 === 0 ? `${moveNumber}.` : '';
    item.textContent = `${prefix} ${move.san}`.trim();
    moveListEl.appendChild(item);
  });
}

function renderBoard() {
  buildBoard();
  updateStatus();
  updateMoveList();
  updateClocks();
}

function playMoveSound() {
  const AudioContextCls = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCls) return;

  const context = new AudioContextCls();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.value = 440;
  gain.gain.value = 0.05;

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.08);
}

function handleSquareClick(square, isSoftSelection = false, sourceSquare = null) {
  if (game.isGameOver()) return;

  const piece = game.get(square);
  const source = sourceSquare || selectedSquare;

  if (source && !isSoftSelection) {
    const moves = game.moves({ square: source, verbose: true });
    const chosenMove = moves.find((move) => move.to === square);

    if (chosenMove) {
      game.move({ from: source, to: square, promotion: 'q' });
      selectedSquare = null;
      legalMoves = [];
      clock.activeColor = game.turn();
      playMoveSound();
      renderBoard();
      return;
    }
  }

  if (sourceSquare && !selectedSquare) {
    selectedSquare = sourceSquare;
  }

  if (selectedSquare === null) {
    if (!piece || piece.color !== game.turn()) return;
    selectedSquare = square;
    legalMoves = game.moves({ square, verbose: true }).map((move) => move.to);
    renderBoard();
    return;
  }

  if (square === selectedSquare) {
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
    return;
  }

  const moves = game.moves({ square: selectedSquare, verbose: true });
  const chosenMove = moves.find((move) => move.to === square);

  if (chosenMove) {
    game.move({ from: selectedSquare, to: square, promotion: 'q' });
    selectedSquare = null;
    legalMoves = [];
    clock.activeColor = game.turn();
    playMoveSound();
    renderBoard();
    return;
  }

  if (piece && piece.color === game.turn()) {
    selectedSquare = square;
    legalMoves = game.moves({ square, verbose: true }).map((move) => move.to);
    renderBoard();
    return;
  }

  selectedSquare = null;
  legalMoves = [];
  renderBoard();
}

function resetGame() {
  if (!safeChessInit()) return;
  selectedSquare = null;
  legalMoves = [];
  clearInterval(timerHandle);
  resetClocks();
  renderBoard();
}

function undoMove() {
  if (!game) return;
  const undone = game.undo();
  if (!undone) return;
  selectedSquare = null;
  legalMoves = [];
  clock.activeColor = game.turn();
  renderBoard();
}

newGameBtn.addEventListener('click', resetGame);
undoBtn.addEventListener('click', undoMove);
flipBtn.addEventListener('click', () => {
  isFlipped = !isFlipped;
  renderBoard();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'n' || event.key === 'N') {
    resetGame();
  }
  if (event.key === 'u' || event.key === 'U') {
    undoMove();
  }
});

if (!safeChessInit()) {
  throw new Error('Chess engine failed to initialize.');
}

resetClocks();
renderBoard();

console.log('Chesexp loaded successfully');
