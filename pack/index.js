const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 800;
const MIN_RADIUS = 20;
const MAX_RADIUS = 200;
const NUM_CIRCLES = 30;
const PIECES_PER_PLAYER = 5;
const RENDER_RADIUS = 20;
const MAX_EDGE_DISTANCE = 300;
const LARGE_DISTANCE = 1000000;

let circles = [];
let connections = [];
let pieces = [];
let currentPlayer = 1;
let selectedPiece = null;
let highlightedStartCircle = null;
let player1Points = 0;
let player2Points = 0;
let gameWon = false;

const view = new View(ctx, { GRID_SIZE, RENDER_RADIUS });

class Circle {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.occupiedBy = null;
        this.isStart1 = false;
        this.isStart2 = false;
        this.pipCountForPlayer1 = null;
        this.pipCountForPlayer2 = null;
    }

    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return dx * dx + dy * dy <= RENDER_RADIUS * RENDER_RADIUS;
    }

    distanceSquared(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return dx * dx + dy * dy;
    }

    distanceToPointSquared(px, py) {
        const dx = this.x - px;
        const dy = this.y - py;
        return dx * dx + dy * dy;
    }

    distance(other) {
        return Math.sqrt(this.distanceSquared(other));
    }

    overlaps(other, minGap) {
        const dist = this.distance(other);
        return dist < this.radius + other.radius + minGap;
    }
}

class Edge {
    constructor(fromIndex, toIndex, fromCircle, toCircle) {
        this.from = fromIndex;
        this.to = toIndex;
        this.length = fromCircle.distance(toCircle);
        this.line = [fromCircle.x, fromCircle.y, toCircle.x, toCircle.y];
    }

    sharesEndpoint(other) {
        return this.from === other.from || this.from === other.to ||
               this.to === other.from || this.to === other.to;
    }

    intersects(other) {
        if (this.sharesEndpoint(other)) {
            return false;
        }
        
        const [x1, y1, x2, y2] = this.line;
        const [x3, y3, x4, y4] = other.line;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        
        if (Math.abs(denom) < 1e-10) {
            return false;
        }
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t > 0 && t < 1 && u > 0 && u < 1;
    }
}

class Piece {
    constructor(player, id) {
        this.player = player;
        this.id = id;
        this.circleIndex = null;
        this.inHolding = true;
        this.isRemoved = false;
    }
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function checkOverlapsWithExisting(newCircle, existingCircles) {
    for (const existing of existingCircles) {
        if (newCircle.overlaps(existing, 5)) {
            return true;
        }
    }
    return false;
}

function generateCircles() {
    const circles = [];
    const attempts = 1000;
    
    for (let i = 0; i < NUM_CIRCLES; i++) {
        let placed = false;
        let attemptsLeft = attempts;
        
        while (!placed && attemptsLeft > 0) {
            const radius = random(MIN_RADIUS, MAX_RADIUS);
            const x = random(radius, GRID_SIZE - radius);
            const y = random(radius, GRID_SIZE - radius);
            
            const newCircle = new Circle(x, y, radius);
            
            if (!checkOverlapsWithExisting(newCircle, circles)) {
                circles.push(newCircle);
                placed = true;
            }
            
            attemptsLeft--;
        }
    }
    
    return circles;
}

function generateCandidateEdges(circles, maxDistance) {
    const candidateEdges = [];
    
    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            const dist = circles[i].distance(circles[j]);
            if (dist <= maxDistance) {
                candidateEdges.push(new Edge(i, j, circles[i], circles[j]));
            }
        }
    }
    
    return candidateEdges;
}

function checkIntersectionAndUpdate(finalEdges, newEdge) {
    let shouldAdd = true;
    let indexToRemove = -1;
    
    for (let i = 0; i < finalEdges.length; i++) {
        const existingEdge = finalEdges[i];
        
        if (newEdge.intersects(existingEdge)) {
            if (newEdge.length < existingEdge.length) {
                indexToRemove = i;
            } else {
                shouldAdd = false;
                break;
            }
        }
    }
    
    return { shouldAdd, indexToRemove };
}

function buildConnections() {
    const candidateEdges = generateCandidateEdges(circles, MAX_EDGE_DISTANCE);
    
    candidateEdges.sort((a, b) => a.length - b.length);
    
    const finalEdges = [];
    
    for (const newEdge of candidateEdges) {
        const { shouldAdd, indexToRemove } = checkIntersectionAndUpdate(finalEdges, newEdge);
        
        if (indexToRemove !== -1) {
            finalEdges.splice(indexToRemove, 1);
        }
        
        if (shouldAdd) {
            finalEdges.push(newEdge);
        }
    }
    
    const connections = [];
    for (let i = 0; i < circles.length; i++) {
        connections.push([]);
    }
    
    for (const edge of finalEdges) {
        connections[edge.from].push(edge.to);
        connections[edge.to].push(edge.from);
    }
    
    return connections;
}

function findStartCircles() {
    let start1Index = 0;
    let start2Index = 0;
    let minDistToUpperLeft = LARGE_DISTANCE;
    let minDistToLowerRight = LARGE_DISTANCE;
    
    for (let i = 0; i < circles.length; i++) {
        const circle = circles[i];
        const distToUpperLeft = circle.distanceToPointSquared(0, 0);
        const distToLowerRight = circle.distanceToPointSquared(GRID_SIZE, GRID_SIZE);
        
        if (distToUpperLeft < minDistToUpperLeft) {
            minDistToUpperLeft = distToUpperLeft;
            start1Index = i;
        }
        
        if (distToLowerRight < minDistToLowerRight) {
            minDistToLowerRight = distToLowerRight;
            start2Index = i;
        }
    }
    
    circles[start1Index].isStart1 = true;
    circles[start2Index].isStart2 = true;
    
    return { start1Index, start2Index };
}

function initializePieces() {
    const pieces = [];
    
    for (let player = 1; player <= 2; player++) {
        for (let i = 0; i < PIECES_PER_PLAYER; i++) {
            const piece = new Piece(player, i);
            pieces.push(piece);
        }
    }
    
    return pieces;
}

function render(view) {
    view.setState(circles, connections, pieces, selectedPiece, highlightedStartCircle);
    view.render();
}

function createPieceElement(player) {
    const pieceEl = document.createElement('div');
    pieceEl.className = `piece player${player}`;
    if (player === 2) {
        pieceEl.draggable = false;
    }
    return pieceEl;
}

function updateHoldingAreas() {
    const player1Area = document.getElementById('player1-pieces');
    const player2Area = document.getElementById('player2-pieces');
    
    player1Area.innerHTML = '';
    player2Area.innerHTML = '';
    
    for (const piece of pieces) {
        if (piece.isRemoved || !piece.inHolding) {
            continue;
        }
        
        if (piece.player === 1) {
            player1Area.appendChild(createPieceElement(1));
        } else if (piece.player === 2) {
            player2Area.appendChild(createPieceElement(2));
        }
    }
}

function getCircleAt(x, y) {
    for (let i = 0; i < circles.length; i++) {
        if (circles[i].contains(x, y)) {
            return i;
        }
    }
    return null;
}

function canMoveTo(piece, targetCircleIndex) {
    if (targetCircleIndex === null) {
        return false;
    }
    
    const targetCircle = circles[targetCircleIndex];
    
    if (targetCircle.occupiedBy !== null) {
        const occupyingPiece = pieces[targetCircle.occupiedBy];
        if (occupyingPiece.player === piece.player) {
            return false;
        }
    }
    
    if (piece.inHolding) {
        const startCircleIndex = findStartCircleIndex(piece.player);
        if (startCircleIndex === -1) {
            return false;
        }
        
        if (piece.player === 1 && targetCircle.isStart1) {
            return false;
        }
        if (piece.player === 2 && targetCircle.isStart2) {
            return false;
        }
        
        const neighbors = connections[startCircleIndex];
        return neighbors.includes(targetCircleIndex);
    }
    
    const currentCircleIndex = piece.circleIndex;
    
    if (piece.player === 1 && targetCircle.isStart1) {
        return false;
    }
    if (piece.player === 2 && targetCircle.isStart2) {
        return false;
    }
    
    const neighbors = connections[currentCircleIndex];
    
    if (neighbors.includes(targetCircleIndex)) {
        return true;
    }
    
    return false;
}

function movePiece(piece, targetCircleIndex) {
    const player1PipCount = calculateTotalPipCount(1);
    const player2PipCount = calculateTotalPipCount(2);
    console.log(`Pip count: 1=${player1PipCount} 2=${player2PipCount}`);
    
    const targetCircle = circles[targetCircleIndex];
    
    if (targetCircle.occupiedBy !== null) {
        const capturedPiece = pieces[targetCircle.occupiedBy];
        if (capturedPiece.player !== piece.player) {
            if (capturedPiece.circleIndex !== null) {
                circles[capturedPiece.circleIndex].occupiedBy = null;
            }
            capturedPiece.circleIndex = null;
            capturedPiece.inHolding = true;
        }
    }
    
    const isOpponentStart = (piece.player === 1 && targetCircle.isStart2) || 
                           (piece.player === 2 && targetCircle.isStart1);
    
    if (isOpponentStart) {
        if (piece.circleIndex !== null) {
            circles[piece.circleIndex].occupiedBy = null;
        }
        piece.circleIndex = null;
        piece.inHolding = false;
        piece.isRemoved = true;
        
        if (selectedPiece === piece) {
            selectedPiece = null;
        }
        
        if (piece.player === 1) {
            player1Points++;
        } else {
            player2Points++;
        }
        
        updatePoints();
        checkWinCondition();
        
        updateHoldingAreas();
        render(view);
        
        if (!gameWon) {
            switchPlayer();
        }
        
        return true;
    } else {
        if (piece.circleIndex !== null) {
            circles[piece.circleIndex].occupiedBy = null;
        }
        
        piece.circleIndex = targetCircleIndex;
        piece.inHolding = false;
        circles[targetCircleIndex].occupiedBy = pieces.indexOf(piece);
        
        updateHoldingAreas();
        render(view);
        
        return false;
    }
}

function findStartCircleIndex(player) {
    if (player === 1) {
        return circles.findIndex(c => c.isStart1);
    }
    return circles.findIndex(c => c.isStart2);
}

function calculateShortestPaths(targetCircleIndex) {
    if (targetCircleIndex === -1) {
        return null;
    }
    
    const distances = new Array(circles.length).fill(-1);
    const queue = [targetCircleIndex];
    distances[targetCircleIndex] = 0;
    
    while (queue.length > 0) {
        const currentIndex = queue.shift();
        const currentDistance = distances[currentIndex];
        
        const neighbors = connections[currentIndex];
        for (const neighborIndex of neighbors) {
            if (distances[neighborIndex] === -1) {
                distances[neighborIndex] = currentDistance + 1;
                queue.push(neighborIndex);
            }
        }
    }
    
    return distances;
}

function calculatePipCounts() {
    const start1Index = findStartCircleIndex(1);
    const start2Index = findStartCircleIndex(2);
    
    if (start1Index === -1 || start2Index === -1) {
        return;
    }
    
    const distancesToStart2 = calculateShortestPaths(start2Index);
    const distancesToStart1 = calculateShortestPaths(start1Index);
    
    if (distancesToStart2 === null || distancesToStart1 === null) {
        return;
    }
    
    for (let i = 0; i < circles.length; i++) {
        circles[i].pipCountForPlayer1 = distancesToStart2[i] === -1 ? null : distancesToStart2[i];
        circles[i].pipCountForPlayer2 = distancesToStart1[i] === -1 ? null : distancesToStart1[i];
    }
}

function calculateTotalPipCount(player) {
    const piecesInHolding = pieces.filter(p => p.player === player && p.inHolding && !p.isRemoved).length;
    const holdingPipCount = 10 * piecesInHolding;
    
    let boardPipCount = 0;
    for (const piece of pieces) {
        if (piece.player !== player || piece.isRemoved || piece.inHolding) {
            continue;
        }
        
        if (piece.circleIndex === null) {
            continue;
        }
        
        const circle = circles[piece.circleIndex];
        if (player === 1 && circle.pipCountForPlayer1 !== null) {
            boardPipCount += circle.pipCountForPlayer1;
        } else if (player === 2 && circle.pipCountForPlayer2 !== null) {
            boardPipCount += circle.pipCountForPlayer2;
        }
    }
    
    return holdingPipCount + boardPipCount;
}

function getAllValidMoves(player) {
    const validMoves = [];
    
    for (const piece of pieces) {
        if (piece.player !== player || piece.isRemoved) {
            continue;
        }
        
        if (piece.inHolding) {
            const startCircleIndex = findStartCircleIndex(player);
            
            if (startCircleIndex !== -1) {
                const neighbors = connections[startCircleIndex];
                for (const neighborIndex of neighbors) {
                    if (canMoveTo(piece, neighborIndex)) {
                        validMoves.push({ piece, targetCircleIndex: neighborIndex });
                    }
                }
            }
        } else {
            const currentCircleIndex = piece.circleIndex;
            const neighbors = connections[currentCircleIndex];
            
            for (const neighborIndex of neighbors) {
                if (canMoveTo(piece, neighborIndex)) {
                    validMoves.push({ piece, targetCircleIndex: neighborIndex });
                }
            }
        }
    }
    
    return validMoves;
}

function aiMove() {
    if (gameWon) {
        return;
    }
    
    const validMoves = getAllValidMoves(2);
    
    if (validMoves.length === 0) {
        switchPlayer();
        return;
    }
    
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    const pieceRemoved = movePiece(randomMove.piece, randomMove.targetCircleIndex);
    if (!pieceRemoved) {
        switchPlayer();
    }
}

function updatePoints() {
    const player1PointsEl = document.getElementById('player1-points');
    const player2PointsEl = document.getElementById('player2-points');
    if (player1PointsEl) {
        player1PointsEl.textContent = `Points: ${player1Points}`;
    }
    if (player2PointsEl) {
        player2PointsEl.textContent = `Points: ${player2Points}`;
    }
}

function checkWinCondition() {
    const player1PiecesRemaining = pieces.filter(p => p.player === 1 && !p.isRemoved).length;
    const player2PiecesRemaining = pieces.filter(p => p.player === 2 && !p.isRemoved).length;
    
    if (player1PiecesRemaining === 0) {
        gameWon = true;
        const indicator = document.getElementById('player-indicator');
        indicator.textContent = 'Player 1 Wins!';
        indicator.className = '';
        return;
    }
    
    if (player2PiecesRemaining === 0) {
        gameWon = true;
        const indicator = document.getElementById('player-indicator');
        indicator.textContent = 'Player 2 Wins!';
        indicator.className = 'player2';
        return;
    }
}

function switchPlayer() {
    if (gameWon) {
        return;
    }
    
    selectedPiece = null;
    highlightedStartCircle = null;
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    const indicator = document.getElementById('player-indicator');
    indicator.textContent = `Player ${currentPlayer}`;
    indicator.className = currentPlayer === 1 ? '' : 'player2';
    
    if (currentPlayer === 2) {
        setTimeout(() => {
            aiMove();
        }, 500);
    }
}

function getPlayerForStartCircle(circle) {
    if (circle.isStart1) {
        return 1;
    }
    if (circle.isStart2) {
        return 2;
    }
    return null;
}

function clearSelection() {
    selectedPiece = null;
    highlightedStartCircle = null;
    updateHoldingAreas();
    render(view);
}

function hasPiecesInHolding(player) {
    return pieces.some(p => p.player === player && p.inHolding && !p.isRemoved);
}

function getValidMovesFromStartCircle(startCircleIndex) {
    if (startCircleIndex === null) {
        return [];
    }
    const startCircle = circles[startCircleIndex];
    const playerForStart = getPlayerForStartCircle(startCircle);
    if (playerForStart === null) {
        return [];
    }
    const neighbors = connections[startCircleIndex];
    return neighbors.filter(neighborIndex => {
        const neighbor = circles[neighborIndex];
        if (neighbor.occupiedBy === null) {
            return true;
        }
        const occupyingPiece = pieces[neighbor.occupiedBy];
        return occupyingPiece.player !== playerForStart;
    });
}

function handleStartCircleClickWhenNoSelection(clickedCircle, clickedCircleIndex) {
    const playerForStart = getPlayerForStartCircle(clickedCircle);
    
    if (playerForStart !== currentPlayer) {
        highlightedStartCircle = null;
        render(view);
        return;
    }
    
    if (clickedCircle.occupiedBy !== null) {
        const piece = pieces[clickedCircle.occupiedBy];
        if (piece.player === currentPlayer) {
            selectedPiece = piece;
            highlightedStartCircle = null;
            render(view);
        }
        return;
    }
    
    if (!hasPiecesInHolding(playerForStart)) {
        highlightedStartCircle = null;
        render(view);
        return;
    }
    
    if (highlightedStartCircle === clickedCircleIndex) {
        highlightedStartCircle = null;
    } else {
        highlightedStartCircle = clickedCircleIndex;
    }
    render(view);
}

function handleCircleClickWhenNoSelection(clickedCircle, clickedCircleIndex) {
    if (highlightedStartCircle !== null) {
        const validMoves = getValidMovesFromStartCircle(highlightedStartCircle);
        if (validMoves.includes(clickedCircleIndex)) {
            const playerForStart = getPlayerForStartCircle(circles[highlightedStartCircle]);
            const pieceInHolding = pieces.find(p => p.player === playerForStart && p.inHolding && !p.isRemoved);
            if (pieceInHolding) {
                highlightedStartCircle = null;
                const pieceRemoved = movePiece(pieceInHolding, clickedCircleIndex);
                if (!pieceRemoved) {
                    switchPlayer();
                }
                return;
            }
        }
        highlightedStartCircle = null;
        render(view);
        return;
    }
    
    if (clickedCircle.occupiedBy !== null) {
        const piece = pieces[clickedCircle.occupiedBy];
        if (piece.player === currentPlayer) {
            selectedPiece = piece;
            highlightedStartCircle = null;
            render(view);
        }
    } else {
        highlightedStartCircle = null;
        render(view);
    }
}

function handleCircleClickWhenPieceSelected(clickedCircle, clickedCircleIndex) {
    if (clickedCircle.occupiedBy !== null) {
        const piece = pieces[clickedCircle.occupiedBy];
        if (piece === selectedPiece) {
            clearSelection();
            return;
        }
        if (piece.player === currentPlayer) {
            selectedPiece = piece;
            highlightedStartCircle = null;
            render(view);
            return;
        }
    }
    
    if (canMoveTo(selectedPiece, clickedCircleIndex)) {
        const pieceRemoved = movePiece(selectedPiece, clickedCircleIndex);
        selectedPiece = null;
        highlightedStartCircle = null;
        if (!pieceRemoved) {
            switchPlayer();
        }
    } else {
        render(view);
    }
}

canvas.addEventListener('click', (e) => {
    if (gameWon) {
        return;
    }
    
    if (currentPlayer !== 1) {
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedCircleIndex = getCircleAt(x, y);
    
    if (clickedCircleIndex === null) {
        clearSelection();
        return;
    }
    
    const clickedCircle = circles[clickedCircleIndex];
    
    if (selectedPiece === null) {
        if (clickedCircle.isStart1 || clickedCircle.isStart2) {
            handleStartCircleClickWhenNoSelection(clickedCircle, clickedCircleIndex);
            return;
        }
        
        handleCircleClickWhenNoSelection(clickedCircle, clickedCircleIndex);
        return;
    }
    
    handleCircleClickWhenPieceSelected(clickedCircle, clickedCircleIndex);
});


function init() {
    circles = generateCircles();
    connections = buildConnections();
    const { start1Index, start2Index } = findStartCircles();
    pieces = initializePieces();
    player1Points = 0;
    player2Points = 0;
    gameWon = false;
    
    calculatePipCounts();
    
    updateHoldingAreas();
    updatePoints();
    render(view);
}

init();


