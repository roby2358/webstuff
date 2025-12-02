# Technical Specification

## Game Board

### Circle Generation
- MUST generate exactly 30 circles within an 800x800 pixel grid
- MUST assign each circle a random radius between 20 and 50 pixels
- MUST ensure circles do not overlap (minimum gap of 5 pixels between circle edges)
- MUST place circle centers within bounds: x and y coordinates MUST be between [radius, 800 - radius]
- MUST attempt up to 1000 placement attempts per circle before giving up
- SHOULD distribute circles reasonably across the available space

### Graph Structure
- MUST connect each circle to its 3 nearest neighbors (or all neighbors if fewer than 3 exist)
- MUST create bidirectional connections (if circle A connects to circle B, circle B connects to circle A)
- MUST use Euclidean distance to determine nearest neighbors
- Connections MUST be stored as an adjacency list structure

### Start Positions
- MUST identify Player 1's start circle as the circle with the minimum x-coordinate, breaking ties by maximum y-coordinate (farthest left-bottom)
- MUST identify Player 2's start circle as the circle with the maximum x-coordinate, breaking ties by minimum y-coordinate (farthest right-top)
- MUST mark start circles with `isStart1` and `isStart2` flags respectively
- MUST render Player 1's start circle in blue (#4a90e2)
- MUST render Player 2's start circle in red (#e24a4a)
- MUST render non-start circles in gray (#ddd)

## Game Pieces

### Piece Initialization
- MUST create exactly 5 pieces per player (10 total pieces)
- MUST assign each piece a unique ID within its player's set (0-4)
- MUST initialize all pieces in holding state (`inHolding = true`)
- MUST track which player owns each piece (`player` property: 1 or 2)

### Piece State
- MUST track whether a piece is in holding area or on the board
- MUST track which circle index a piece occupies when on the board (`circleIndex`)
- MUST set `circleIndex` to `null` when piece is in holding
- MUST ensure each circle can be occupied by at most one piece (`occupiedBy` property)

## Movement Rules

### Valid Moves
- MUST allow pieces in holding to move only to their player's start circle
- MUST allow pieces on the board to move only to directly connected neighbor circles
- MUST prevent movement to circles already occupied by another piece
- MUST validate moves before executing them
- MUST highlight valid move destinations when a piece is selected

### Movement Execution
- MUST clear the previous circle's `occupiedBy` property when a piece moves
- MUST set the target circle's `occupiedBy` property to the piece's index
- MUST update the piece's `circleIndex` property
- MUST set `inHolding` to `false` when a piece moves to the board
- MUST update the holding area UI after each move
- MUST switch to the next player after a valid move is executed

## User Interface

### Canvas Rendering
- MUST render all circles with their assigned colors
- MUST render connections between circles as gray lines (#ccc, 1px width)
- MUST render circles with black borders (#333, 2px width)
- MUST render pieces on circles as smaller circles (60% of circle radius)
- MUST render Player 1 pieces in blue (#4a90e2)
- MUST render Player 2 pieces in red (#e24a4a)
- MUST render selected pieces with yellow highlight (#ffff00, 3px border)
- MUST highlight valid move destinations with semi-transparent yellow overlay (rgba(255, 255, 0, 0.3))
- MUST clear and redraw the entire canvas on each render cycle

### Holding Areas
- MUST display Player 1's holding area with blue pieces
- MUST display Player 2's holding area with red pieces
- MUST show only pieces currently in holding state
- MUST update holding areas immediately after any piece state change
- MUST render holding pieces as 30x30 pixel circles with 2px borders

### Player Indicator
- MUST display the current player's turn
- MUST highlight Player 1 indicator in blue (#4a90e2)
- MUST highlight Player 2 indicator in red (#e24a4a)
- MUST update immediately when player switches

## Interaction

### Piece Selection
- MUST allow clicking on a piece to select it (set `draggedPiece`)
- MUST allow clicking on a start circle when holding a piece to highlight it
- MUST allow clicking a highlighted start circle to place a holding piece
- MUST allow clicking on an empty circle to deselect
- MUST prevent selecting opponent pieces
- MUST prevent selecting pieces when it's not the player's turn

### Move Validation Feedback
- MUST highlight the selected piece's current circle with yellow border
- MUST highlight all valid move destinations when a piece is selected
- MUST highlight the start circle when a holding piece is ready to be placed
- MUST clear all highlights when selection is cleared

### Click Handling
- MUST convert mouse coordinates to canvas coordinates accounting for canvas position
- MUST detect which circle (if any) was clicked using point-in-circle collision detection
- MUST handle clicks outside any circle by clearing selection
- MUST ignore clicks when it's not Player 1's turn (Player 2 is AI-controlled)

## AI Player

### AI Behavior
- MUST automatically make moves for Player 2 after Player 1's turn
- MUST wait 500ms before executing AI move (for visual feedback)
- MUST select randomly from all valid moves
- MUST switch back to Player 1 after AI move completes
- MUST skip turn if no valid moves are available

### Valid Move Calculation
- MUST enumerate all valid moves for the current player
- MUST include moves from holding area to start circle
- MUST include moves from board pieces to connected neighbors
- MUST exclude moves to occupied circles

## Game State Management

### Initialization
- MUST generate circles before building connections
- MUST build connections after circles are generated
- MUST identify start circles after connections are built
- MUST initialize pieces after start circles are identified
- MUST render initial state after all initialization completes
- MUST start with Player 1's turn

### State Consistency
- MUST maintain consistent state between pieces array and circles array
- MUST ensure `circle.occupiedBy` always references a valid piece index or `null`
- MUST ensure `piece.circleIndex` matches the circle's `occupiedBy` when on board
- MUST update UI immediately after any state change

## Technical Requirements

### Code Structure
- MUST use ES6 classes for Circle and Piece entities
- MUST use functional programming patterns where appropriate
- MUST avoid default parameter values
- MUST use guard conditions to exit early from invalid states
- MUST keep functions focused and granular

### Performance
- SHOULD render efficiently using requestAnimationFrame if needed
- SHOULD minimize unnecessary re-renders
- MUST complete circle generation within reasonable time (< 1 second)

### Browser Compatibility
- MUST work in modern browsers supporting HTML5 Canvas
- MUST use standard DOM APIs
- MUST not require any external dependencies
