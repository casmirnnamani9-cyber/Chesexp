const pieceMap = {
  w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' },
};

const boardEl = document.getElementById('board');
const turnBadge = document.getElementById('turnBadge');
const statusText = document.getElementById('statusText');
const moveListEl = document.getElementById('moveList');
const newGameBtn = document.getElementById('newGameBtn');
const flipBtn = document.getElementById('flipBtn');

let game = new Chess();
let selectedSquare = null;
let legalMoves = [];
let isFlipped = false;

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function buildBoard() {
  boardEl.innerHTML = '';

  const squares = isFlipped ? [...Chess.BOARD_SQUARES].reverse() : [...Chess.BOARD_SQUARES];

  squares.forEach((square) => {
    const row = Number(square[1]);
    const file = square[0];
    const index = files.indexOf(file);
    const isLight = (row + index) % 2 !== 0;

    const squareEl = document.createElement('div');
    squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
    squareEl.dataset.square = square;

    if (square === selectedSquare) {
      squareEl.classList.add('selected');
    }

    if (legalMoves.includes(square)) {
      const captureMove = game.get(square) && game.get(square).color !== game.turn();
      squareEl.classList.add(captureMove ? 'capture' : 'legal');
    }

    const piece = game.get(square);
    if (piece) {
      const pieceEl = document.createElement('div');
      pieceEl.className = `piece ${piece.color === 'w' ? 'white' : 'black'}`;
      pieceEl.textContent = pieceMap[piece.color][piece.type];
      pieceEl.setAttribute('aria-label', `${piece.color === 'w' ? 'white' : 'black'} ${piece.type}`);
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

  const turnLabel = game.turn() === 'w' ? 'WHITE TO MOVE' : 'BLACK TO MOVE';
  turnBadge.textContent = turnLabel;
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
}

function handleSquareClick(square) {
  if (game.isGameOver()) {
    return;
  }

  const piece = game.get(square);

  if (selectedSquare === null) {
    if (!piece || piece.color !== game.turn()) {
      return;
    }

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
    game.move({
      from: selectedSquare,
      to: square,
      promotion: 'q',
    });
    selectedSquare = null;
    legalMoves = [];
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
  game = new Chess();
  selectedSquare = null;
  legalMoves = [];
  renderBoard();
}

newGameBtn.addEventListener('click', resetGame);
flipBtn.addEventListener('click', () => {
  isFlipped = !isFlipped;
  renderBoard();
});

renderBoard();

window.addEventListener('keydown', (event) => {
  if (event.key === 'n' || event.key === 'N') {
    resetGame();
  }
});

const boardSquares = [...Chess.BOARD_SQUARES];
console.log(boardSquares.slice(0, 5));
