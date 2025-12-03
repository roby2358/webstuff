class View {
    constructor(ctx, constants) {
        this.ctx = ctx;
        this.GRID_SIZE = constants.GRID_SIZE;
        this.RENDER_RADIUS = constants.RENDER_RADIUS;
        this.highlightedStartCircle = null;
        this.selectedPiece = null;
    }

    setState(circles, connections, pieces) {
        this.circles = circles;
        this.connections = connections;
        this.pieces = pieces;
    }

    getCircleFillColor(circle) {
        if (circle.isStart1) {
            return '#4a90e2';
        }
        if (circle.isStart2) {
            return '#e24a4a';
        }
        return '#ddd';
    }

    renderConnections() {
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.circles.length; i++) {
            const circle = this.circles[i];
            const neighbors = this.connections[i];
            
            for (const neighborIndex of neighbors) {
                const neighbor = this.circles[neighborIndex];
                this.ctx.beginPath();
                this.ctx.moveTo(circle.x, circle.y);
                this.ctx.lineTo(neighbor.x, neighbor.y);
                this.ctx.stroke();
            }
        }
    }

    renderCircle(circle) {
        this.ctx.fillStyle = this.getCircleFillColor(circle);
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, this.RENDER_RADIUS, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    renderPieceOnCircle(circle, piece) {
        const isSelected = this.selectedPiece === piece && !piece.inHolding;
        
        this.ctx.fillStyle = piece.player === 1 ? '#4a90e2' : '#e24a4a';
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, this.RENDER_RADIUS * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = isSelected ? '#ffff00' : '#fff';
        this.ctx.lineWidth = isSelected ? 3 : 2;
        this.ctx.stroke();
    }

    renderCircleHighlight(circle) {
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, this.RENDER_RADIUS, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    renderValidMoveHighlight(circle) {
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, this.RENDER_RADIUS, 0, Math.PI * 2);
        this.ctx.fill();
    }

    renderValidMovesForDraggedPiece() {
        if (this.selectedPiece === null || this.selectedPiece.inHolding || this.selectedPiece.isRemoved) {
            return;
        }
        
        const currentCircleIndex = this.selectedPiece.circleIndex;
        if (currentCircleIndex === null) {
            return;
        }
        
        const neighbors = this.connections[currentCircleIndex];
        if (!neighbors) {
            return;
        }
        
        for (const neighborIndex of neighbors) {
            const neighbor = this.circles[neighborIndex];
            if (neighbor.occupiedBy === null) {
                this.renderValidMoveHighlight(neighbor);
            } else {
                const occupyingPiece = this.pieces[neighbor.occupiedBy];
                if (occupyingPiece.player !== this.selectedPiece.player) {
                    this.renderValidMoveHighlight(neighbor);
                }
            }
        }
    }

    renderHighlightedStartCircle() {
        if (this.highlightedStartCircle === null) {
            return;
        }
        
        const startCircle = this.circles[this.highlightedStartCircle];
        if (startCircle.occupiedBy === null) {
            this.renderCircleHighlight(startCircle);
            
            const playerForStart = startCircle.isStart1 ? 1 : 2;
            const neighbors = this.connections[this.highlightedStartCircle];
            for (const neighborIndex of neighbors) {
                const neighbor = this.circles[neighborIndex];
                if (neighbor.occupiedBy === null) {
                    this.renderValidMoveHighlight(neighbor);
                } else {
                    const occupyingPiece = this.pieces[neighbor.occupiedBy];
                    if (occupyingPiece.player !== playerForStart) {
                        this.renderValidMoveHighlight(neighbor);
                    }
                }
            }
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.GRID_SIZE, this.GRID_SIZE);
        
        this.renderConnections();
        
        for (let i = 0; i < this.circles.length; i++) {
            const circle = this.circles[i];
            
            this.renderCircle(circle);
            
            if (circle.occupiedBy !== null) {
                const piece = this.pieces[circle.occupiedBy];
                if (!piece.isRemoved) {
                    this.renderPieceOnCircle(circle, piece);
                }
            }
            
            if (this.selectedPiece !== null && !this.selectedPiece.inHolding && !this.selectedPiece.isRemoved && this.selectedPiece.circleIndex === i) {
                this.renderCircleHighlight(circle);
            }
        }
        
        this.renderValidMovesForDraggedPiece();
        this.renderHighlightedStartCircle();
    }
}

