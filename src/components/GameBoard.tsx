import React from 'react';
import {
  PlayerColor,
  BoardState,
  getTokenCoordinates,
  TRACK_COORDS,
  HOME_PATHS,
  SAFE_TRACK_INDICES,
  COLOR_START_INDEX,
} from '@/lib/ludoEngine';
import { Star } from 'lucide-react';

interface GameBoardProps {
  boardState: BoardState;
  activeTurnColor: PlayerColor;
  movableTokens: number[]; // indices of tokens the current player can move
  onMoveToken: (tokenIndex: number) => void;
  currentPlayerColor: PlayerColor;
  isMyTurn: boolean;
}

export default function GameBoard({
  boardState,
  activeTurnColor,
  movableTokens,
  onMoveToken,
  currentPlayerColor,
  isMyTurn,
}: GameBoardProps) {
  
  // Calculate center coordinates for tokens
  const getCenterCoord = (color: PlayerColor, tokenIndex: number, step: number) => {
    const coord = getTokenCoordinates(color, tokenIndex, step);
    if (step === 0) {
      // Yard coordinates are already center decimals (e.g. 1.5, 3.5)
      return coord;
    }
    // Track & home path coordinates are integers, so center is + 0.5
    return {
      r: coord.r + 0.5,
      c: coord.c + 0.5,
    };
  };

  // Group tokens that occupy the same path cells
  const groupedTokens = React.useMemo(() => {
    const groups: Record<string, { color: PlayerColor; index: number; isMovable: boolean }[]> = {};
    const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

    colors.forEach((color) => {
      boardState[color].forEach((step, index) => {
        // Yard and finished tokens are rendered in designated spots, no stacking calculations needed
        if (step === 0 || step === 57) {
          const coord = getCenterCoord(color, index, step);
          const key = `${color}_yard_${index}`;
          groups[key] = [{
            color,
            index,
            isMovable: isMyTurn && color === currentPlayerColor && movableTokens.includes(index)
          }];
          return;
        }

        // Active tokens on track or home path
        const coord = getCenterCoord(color, index, step);
        const key = `${coord.r}_${coord.c}`;
        
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push({
          color,
          index,
          isMovable: isMyTurn && color === currentPlayerColor && movableTokens.includes(index)
        });
      });
    });

    return groups;
  }, [boardState, movableTokens, isMyTurn, currentPlayerColor]);

  // Helper to determine the CSS class of path cells
  const getCellClassName = (r: number, c: number) => {
    let classes = 'board-cell ';
    
    // Check if it is a starting cell
    if (r === 6 && c === 1) classes += 'cell-red-start';
    else if (r === 1 && c === 8) classes += 'cell-green-start';
    else if (r === 8 && c === 13) classes += 'cell-yellow-start';
    else if (r === 13 && c === 6) classes += 'cell-blue-start';
    // Check if it is a home path cell
    else if (r === 7 && c >= 1 && c <= 5) classes += 'cell-red-home';
    else if (c === 7 && r >= 1 && r <= 5) classes += 'cell-green-home';
    else if (r === 7 && c >= 9 && c <= 13) classes += 'cell-yellow-home';
    else if (c === 7 && r >= 9 && r <= 13) classes += 'cell-blue-home';

    return classes.trim();
  };

  // Render path cells (52 common + 20 home path cells)
  const pathCells = React.useMemo(() => {
    const cells: { r: number; c: number; isSafe: boolean }[] = [];
    
    // Add common track coordinates
    TRACK_COORDS.forEach((coord, idx) => {
      cells.push({
        r: coord.r,
        c: coord.c,
        isSafe: SAFE_TRACK_INDICES.includes(idx),
      });
    });

    // Add home path coordinates
    const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
    colors.forEach((color) => {
      HOME_PATHS[color].forEach((coord) => {
        cells.push({
          r: coord.r,
          c: coord.c,
          isSafe: true, // Home path cells are inherently safe
        });
      });
    });

    return cells;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Board Layout Grid */}
      <div className="ludo-grid">
        
        {/* Red Home Yard */}
        <div className="yard yard-red">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-xl font-bold font-mono tracking-wider opacity-20 text-pink-500">RED YARD</span>
          </div>
        </div>

        {/* Green Home Yard */}
        <div className="yard yard-green">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-xl font-bold font-mono tracking-wider opacity-20 text-emerald-500">GREEN YARD</span>
          </div>
        </div>

        {/* Yellow Home Yard */}
        <div className="yard yard-yellow">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-xl font-bold font-mono tracking-wider opacity-20 text-amber-500">YELLOW YARD</span>
          </div>
        </div>

        {/* Blue Home Yard */}
        <div className="yard yard-blue">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-xl font-bold font-mono tracking-wider opacity-20 text-blue-500">BLUE YARD</span>
          </div>
        </div>

        {/* Center Home Triangle Area */}
        <div className="center-home">
          <div className="home-triangle triangle-red" />
          <div className="home-triangle triangle-green" />
          <div className="home-triangle triangle-yellow" />
          <div className="home-triangle triangle-blue" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center shadow-lg">
              <span className="text-[10px] font-extrabold text-purple-300 font-mono">GOAL</span>
            </div>
          </div>
        </div>

        {/* Path Cells */}
        {pathCells.map((cell, idx) => (
          <div
            key={`cell_${cell.r}_${cell.c}_${idx}`}
            className={getCellClassName(cell.r, cell.c)}
            style={{
              gridRow: cell.r + 1,
              gridColumn: cell.c + 1,
            }}
          >
            {cell.isSafe && <Star className="safe-star" size={14} fill="var(--neon-purple-glow)" />}
          </div>
        ))}

        {/* Render stacked/placed tokens */}
        {Object.entries(groupedTokens).map(([key, group]) => {
          // Parse coordinate from key
          const isYard = key.includes('yard');
          let r: number, c: number;

          if (isYard) {
            const parts = key.split('_');
            const color = parts[0] as PlayerColor;
            const tokenIdx = parseInt(parts[2]);
            const coord = getCenterCoord(color, tokenIdx, 0);
            r = coord.r;
            c = coord.c;
          } else {
            const parts = key.split('_');
            r = parseFloat(parts[0]);
            c = parseFloat(parts[1]);
          }

          const count = group.length;

          return (
            <div
              key={`token_group_${key}`}
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                top: `calc(${r} * (100% / 15))`,
                left: `calc(${c} * (100% / 15))`,
                width: 'calc(100% / 15)',
                height: 'calc(100% / 15)',
                transform: 'translate(-50%, -50%)',
                zIndex: count > 1 ? 20 : 15,
              }}
            >
              <div className="stacked-token-container">
                {group.map((token, index) => {
                  let stackClass = '';
                  if (count === 2) stackClass = 'stacked-token-2';
                  else if (count === 3) stackClass = 'stacked-token-3';
                  else if (count === 4) stackClass = 'stacked-token-4';

                  return (
                    <button
                      key={`token_${token.color}_${token.index}`}
                      onClick={() => token.isMovable && onMoveToken(token.index)}
                      disabled={!token.isMovable}
                      className={`token token-${token.color} ${stackClass} ${
                        token.isMovable ? 'token-movable pointer-events-auto' : ''
                      }`}
                      style={{
                        backgroundColor: token.isMovable ? `var(--neon-${token.color})` : undefined,
                      }}
                      title={`${token.color.toUpperCase()} Token ${token.index + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
