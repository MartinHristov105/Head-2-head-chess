const board = document.getElementById("chessboard"); // get element from HTML
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']; // cols
const ranks = [8, 7, 6, 5, 4, 3, 2, 1]; // rows

let selected = null; // null means no/empty value
let currentPlayer = 'w'; // white
let lastMove = null;
let castlingRights = { // map of maps (key-value)
  w: { kingMoved: false, rookAMoved: false, rookHMoved: false },
  b: { kingMoved: false, rookAMoved: false, rookHMoved: false }
};

const initialBoard = { // no need to write every single tile => by default they are undifined, later we can change them
  a1: 'wr', b1: 'wn', c1: 'wb', d1: 'wq', e1: 'wk', f1: 'wb', g1: 'wn', h1: 'wr',
  a2: 'wp', b2: 'wp', c2: 'wp', d2: 'wp', e2: 'wp', f2: 'wp', g2: 'wp', h2: 'wp',
  a7: 'bp', b7: 'bp', c7: 'bp', d7: 'bp', e7: 'bp', f7: 'bp', g7: 'bp', h7: 'bp',
  a8: 'br', b8: 'bn', c8: 'bb', d8: 'bq', e8: 'bk', f8: 'bb', g8: 'bn', h8: 'br',
};

let gameState = { ...initialBoard }; // shallow copy, no need for deep copy because of simple structures(strings)

function createBoard() {
  board.innerHTML = ''; // clear the board
  for (let r of ranks) {
    for (let f of files) {
      const square = document.createElement("div"); // create new div element for each square
      const pos = f + r; // create "key"
      square.classList.add("square"); // styling with css
      square.classList.add((files.indexOf(f) + ranks.indexOf(r)) % 2 === 0 ? "white" : "black"); // styling with css
      square.id = pos; // easier reference trough ID later

      if (gameState[pos]) { // check for piece
        const img = document.createElement("img"); // create the image
        img.src = `img/${gameState[pos]}.png`; // get the location of the imgages
        img.draggable = false; // can not drag
        img.dataset.pos = pos; // safe way to save special information
        square.appendChild(img); // attach/connect the img to the square
      }

      square.addEventListener("click", () => handleSelect(pos)); // click event listener which triggers handleSelect
      board.appendChild(square); // attach/connect the square to the board
    }
  }
  highlightLastMove(); // color in yellow the last move
}

function switchTurn() {
  currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
}

function handleSelect(pos) {
  const piece = gameState[pos];  // get piece
  const pieceColor = piece?.[0]; // get w(white) or b(black). ?. throw undefined and prevents throwing an error 

  if (selected && selected !== pos && isMoveLegal(selected, pos)) { // if the click is move selection
    makeMove(selected, pos); // makes the move
    selected = null;
    clearHighlights(); // removes the possible moves(green painted squares)
    switchTurn(); // opponents turns
  } else if (piece && pieceColor === currentPlayer) { // if the click is a valid piece selection
    selected = pos; // get the piece
    clearHighlights(); // clear old possible moves
    highlightMoves(pos); // paints the new possible moves
  } else { // if the click is a non valid piece selection
    selected = null; // unselect
    clearHighlights();
  }
}

function makeMove(from, to) {
  const movingPiece = gameState[from];
  const movingPieceType = movingPiece[1]; // get the second letter (r,n,b,q,k,p)
  const color = movingPiece?.[0];

  // castling
  if (movingPieceType === 'k') { // king moves
    castlingRights[color].kingMoved = true; // if king moves castling is no longer available
    if (from === 'e1' && to === 'g1') { // white king side castling
      gameState['f1'] = gameState['h1']; // moves the rook
      delete gameState['h1']; // removes the old rook
    }
    if (from === 'e1' && to === 'c1') { // white queen side castling
      gameState['d1'] = gameState['a1']; // moves the rook
      delete gameState['a1']; // removes the old rook
    }
    if (from === 'e8' && to === 'g8') { // black king side castling
      gameState['f8'] = gameState['h8'];
      delete gameState['h8'];
    }
    if (from === 'e8' && to === 'c8') { // black queen side castling
      gameState['d8'] = gameState['a8'];
      delete gameState['a8'];
    }
  }

  if (movingPieceType === 'r') { // if rook moves castling is no logner available
    if (from === 'a1') castlingRights['w'].rookAMoved = true;
    if (from === 'h1') castlingRights['w'].rookHMoved = true;
    if (from === 'a8') castlingRights['b'].rookAMoved = true;
    if (from === 'h8') castlingRights['b'].rookHMoved = true;
  }

  // pawn promotion
  if (movingPieceType === 'p' && (to[1] === '8' || to[1] === '1')) {
    const promotionChoice = prompt("Promote pawn to (q)ueen, (r)ook, (b)ishop, or (n)ight?"); // popup to ask the player
    gameState[to] = currentPlayer + (promotionChoice || 'q'); // promote the pawn. Queen is default value
  } else {
    gameState[to] = movingPiece; // move the piece to new place
  }

  delete gameState[from]; // remove the piece from old place
  lastMove = { from, to }; // remember last move
  playSound();
  createBoard(); // redraw the board so we can see the changes

  // check mate mechanics
  const enemy = currentPlayer === 'w' ? 'b' : 'w'; // get the enemy
  if (isCheckmate(enemy)) { // check mate
    setTimeout(() => alert(`Checkmate! ${currentPlayer === 'w' ? "Black" : "White"} wins!`), 10); // first update the board then we alert the players for the end of the game
  } else if (isStalemate(enemy)) { // no check and no valid moves for the enemy king
    setTimeout(() => alert("Stalemate! It's a draw."), 10);
  } else if (isInsufficientMaterial()) { // situation where check mate is impossible (example: king vs king)
    setTimeout(() => alert("Draw due to insufficient material."), 10);
  } else if (isKingInCheck(enemy)) { // check
    setTimeout(() => alert("Check!"), 10); // arrow function with no parameters
  }
}

function getLegalMovesRaw(pos, state = gameState, skipKingCheck = false) {
  const piece = state[pos];
  if (!piece) return []; // if no piece => empty list === no valid moves
  const color = piece[0];
  const type = piece[1];
  const moves = [];

  const [file, rank] = [pos[0], parseInt(pos[1])]; // parse string to int
  const fileIdx = files.indexOf(file); // get the index of the letter

  const isEmpty = p => !state[p]; // arrow function that checks for empty square p
  const isEnemy = p => state[p] && state[p][0] !== color; // arrow function that checks for enemy pieces in the square p

  const directions = { // moving patterns
    p: color === 'w' ? 1 : -1,
    r: [[1,0],[0,1],[-1,0],[0,-1]],
    b: [[1,1],[1,-1],[-1,1],[-1,-1]],
    q: [[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],
    k: [[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],
    n: [[2,1],[1,2],[-1,2],[-2,1],[-2,-1],[-1,-2],[1,-2],[2,-1]]
  };

  if (type === 'p') { // pawn
    const fwd = rank + directions.p; // get where to go +-1
    const oneAhead = file + fwd; // set where to go
    if (isEmpty(oneAhead)) moves.push(oneAhead); // check for empty square and add the move to the list of legal moves
    if ((color === 'w' && rank === 2) || (color === 'b' && rank === 7)) { // handle two tile move
      const twoAhead = file + (rank + 2 * directions.p);
      if (isEmpty(oneAhead) && isEmpty(twoAhead)) moves.push(twoAhead);
    }
    for (let dx of [-1,1]) { // attack enemy
      const df = files[fileIdx + dx]; // to check if it is in board
      const diag = df + fwd; // find diagonal
      if (df && isEnemy(diag)) moves.push(diag); // capture
    }
  }

  if (['r','b','q'].includes(type)) { // check if type is on of rook, bishop, queen
    const dirs = directions[type];
    for (let [dx,dy] of dirs) {
      for (let i = 1; i < 8; i++) {
        const nf = files[fileIdx + dx*i]; /// move left or right
        const nr = rank + dy*i; // move up or down
        const np = nf + nr;  // new position
        if (!nf || nr < 1 || nr > 8) break; // invalid move
        if (isEmpty(np)) moves.push(np); // add the move to the list of legal moves if the square is empty
        else {
          if (isEnemy(np)) moves.push(np); // add the move to the list of legal moves if capture
          break;
        }
      }
    }
  }

  if (type === 'k') { // king
    for (let [dx,dy] of directions.k) {
      const nf = files[fileIdx + dx]; // left or right
      const nr = rank + dy; // up or down
      const np = nf + nr; // new position
      if (nf && nr >= 1 && nr <= 8 && (!state[np] || isEnemy(np))) { // move on empty square or capture
        moves.push(np);
      }
    }
    if (!skipKingCheck && !isKingInCheck(color, state)) {
      if (!castlingRights[color].kingMoved) {
        // king side castling
        if (!state[files[fileIdx+1]+rank] && !state[files[fileIdx+2]+rank] &&
            !castlingRights[color].rookHMoved) {
          if (!isSquareAttacked(files[fileIdx+1]+rank, color, state) && !isSquareAttacked(files[fileIdx+2]+rank, color, state)) {
            moves.push(files[fileIdx+2]+rank);
          }
        }
        // queen side castling
        if (!state[files[fileIdx-1]+rank] && !state[files[fileIdx-2]+rank] && !state[files[fileIdx-3]+rank] &&
            !castlingRights[color].rookAMoved) {
          if (!isSquareAttacked(files[fileIdx-1]+rank, color, state) && !isSquareAttacked(files[fileIdx-2]+rank, color, state)) {
            moves.push(files[fileIdx-2]+rank);
          }
        }
      }
    }
  }

  if (type === 'n') { // knight
    const knightMoves = directions.n;
    for (let [dx, dy] of knightMoves) {
      const nf = files[fileIdx + dx]; // left or right
      const nr = rank + dy; // up or down
      const np = nf + nr; // new position
      if (nf && nr >= 1 && nr <= 8 && (!state[np] || isEnemy(np))) { // move on empty square or capture
        moves.push(np);
      }
    }
  }

  return moves; // return a list of moves(positions)
}

function getLegalMoves(pos) {
  const piece = gameState[pos];
  if (!piece) return []; // no legal moves

  const color = piece[0];
  const rawMoves = getLegalMovesRaw(pos, gameState); // all moves
  const legalMoves = [];

  for (let move of rawMoves) {
    const temp = { ...gameState };
    temp[move] = temp[pos]; // move the piece to new place
    delete temp[pos]; // delete the piece from old place
    if (!isKingInCheck(color, temp)) { // check for king safety
      legalMoves.push(move);
    }
  }

  return legalMoves; // list of legal moves(positions)
}

function isSquareAttacked(square, color, state) {
  const enemyColor = color === 'w' ? 'b' : 'w';
  for (let pos in state) {
    if (state[pos][0] === enemyColor) {
      const moves = getLegalMovesRaw(pos, state, true); // get all enemy moves
      if (moves.includes(square)) return true; // check if the enemy can attack the given square
    }
  }
  return false; // no attacking => safe
}

function isMoveLegal(from, to) {
  const legalMoves = getLegalMoves(from); // all valid moves for piece
  return legalMoves.includes(to); // check if to belongs to them
}

function playSound() {
  const sound = document.getElementById("moveSound"); // connection to the HTML
  if (sound) sound.play(); // play sound if it exsists
}

function highlightMoves(pos) {
  const moves = getLegalMoves(pos);
  for (let m of moves) {
    const sq = document.getElementById(m); // m is position (a1, e4, ...)
    if (sq) sq.classList.add("highlight"); // highlight the square
  }
}

function highlightLastMove() {
  if (lastMove) {
    const { from, to } = lastMove; // extract starting and ending positions
    const fromSquare = document.getElementById(from);
    const toSquare = document.getElementById(to);
    if (fromSquare) fromSquare.classList.add("highlightLast"); // highlight starting position
    if (toSquare) toSquare.classList.add("highlightLast"); // highlight ending position
  }
}

function clearHighlights() {
  document.querySelectorAll(".square").forEach(sq => sq.classList.remove("highlight")); // selects all squares and then for each remove the highlight
}

function isKingInCheck(color, state = gameState) {
  const kingPos = Object.keys(state).find(pos => state[pos] === color + 'k'); // get all keys(positions) on the board and check which one is the king of the given color
  return isSquareAttacked(kingPos, color, state);
}

function isCheckmate(color) {
  if (!isKingInCheck(color)) return false; // no check
  for (let from in gameState) {
    if (gameState[from][0] === color) {
      if (getLegalMoves(from).length > 0) return false; // has legal moves => only checked
    }
  }
  return true; // check mate
}

function isStalemate(color) {
  if (isKingInCheck(color)) return false; // king in check
  for (let from in gameState) {
    if (gameState[from][0] === color) {
      if (getLegalMoves(from).length > 0) return false; // has legal moves => only checked
    }
  }
  return true; // draw
}

function isInsufficientMaterial() {
  const pieces = Object.values(gameState).map(p => p[1]); // list of all pieces and retrieve only the type of the pieces
  const minorPieces = pieces.filter(p => ['n', 'b'].includes(p)); // filters only the knight and the bishop
  if (pieces.every(p => p === 'k')) return true; // only kings
  if (pieces.length === 3 && minorPieces.length === 1) return true; // two kings with one knight/bishop
  return false;
}

createBoard();