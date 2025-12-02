## Game Board

The playing area is an 800x800 pixel canvas with 30 circles packed into it. Each circle has a random radius between 20-50 pixels. The center of each circle is a spot that pieces can move to. Circles are connected to their 3 nearest neighbors, forming a bidirectional graph.

## Players

- **Player 1 (Blue)**: Human-controlled, starts at the farthest left-bottom circle (colored blue)
- **Player 2 (Red)**: AI-controlled, starts at the farthest right-top circle (colored red)

## Pieces

Each player has 5 pieces that start in a holding area. Pieces are represented as smaller circles (60% of the circle radius) colored to match their player.

## Movement

- Click a piece to select it (or click your start circle to highlight it for placing from holding)
- Click a valid destination to move
- Pieces on the board can move one space to a directly connected neighbor circle
- Pieces in holding can be placed on their player's start circle
- A piece cannot move into a spot occupied by another piece
- Valid move destinations are highlighted in yellow when a piece is selected

## Turn Flow

Players alternate turns. After Player 1 makes a move, Player 2 (AI) automatically makes a random valid move after a 500ms delay.
