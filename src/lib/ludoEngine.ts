export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface BoardState {
  red: number[];
  green: number[];
  yellow: number[];
  blue: number[];
}

export interface GameState {
  board_state: BoardState;
  dice_value: number | null;
  dice_state: 'idle' | 'rolling' | 'rolled_need_move' | 'no_moves_possible';
  rolls_left_for_six: number;
  winner: PlayerColor | null;
  consecutive_sixes: number;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  is_ready: boolean;
  is_host: boolean;
}

// 52 common track coordinate points
export const TRACK_COORDS = [
  { r: 6, c: 0 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }, { r: 6, c: 4 }, { r: 6, c: 5 }, // Left arm upper
  { r: 5, c: 6 }, { r: 4, c: 6 }, { r: 3, c: 6 }, { r: 2, c: 6 }, { r: 1, c: 6 }, { r: 0, c: 6 }, // Top arm left
  { r: 0, c: 7 }, // Top turnaround
  { r: 0, c: 8 }, { r: 1, c: 8 }, { r: 2, c: 8 }, { r: 3, c: 8 }, { r: 4, c: 8 }, { r: 5, c: 8 }, // Top arm right
  { r: 6, c: 9 }, { r: 6, c: 10 }, { r: 6, c: 11 }, { r: 6, c: 12 }, { r: 6, c: 13 }, { r: 6, c: 14 }, // Right arm upper
  { r: 7, c: 14 }, // Right turnaround
  { r: 8, c: 14 }, { r: 8, c: 13 }, { r: 8, c: 12 }, { r: 8, c: 11 }, { r: 8, c: 10 }, { r: 8, c: 9 }, // Right arm lower
  { r: 9, c: 8 }, { r: 10, c: 8 }, { r: 11, c: 8 }, { r: 12, c: 8 }, { r: 13, c: 8 }, { r: 14, c: 8 }, // Bottom arm right
  { r: 14, c: 7 }, // Bottom turnaround
  { r: 14, c: 6 }, { r: 13, c: 6 }, { r: 12, c: 6 }, { r: 11, c: 6 }, { r: 10, c: 6 }, { r: 9, c: 6 }, // Bottom arm left
  { r: 8, c: 5 }, { r: 8, c: 4 }, { r: 8, c: 3 }, { r: 8, c: 2 }, { r: 8, c: 1 }, { r: 8, c: 0 }, // Left arm lower
  { r: 7, c: 0 } // Left turnaround
];

// Color start indices on the common track
export const COLOR_START_INDEX: Record<PlayerColor, number> = {
  red: 1,      // (6, 1)
  green: 14,   // (1, 8)
  yellow: 27,  // (8, 13)
  blue: 40     // (13, 6)
};

// Safe indices on the common track (0-indexed relative to TRACK_COORDS)
export const SAFE_TRACK_INDICES = [1, 8, 14, 21, 27, 34, 40, 47];

// Home paths for each color (steps 52-56)
export const HOME_PATHS: Record<PlayerColor, { r: number; c: number }[]> = {
  red: [
    { r: 7, c: 1 }, { r: 7, c: 2 }, { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 7, c: 5 }
  ],
  green: [
    { r: 1, c: 7 }, { r: 2, c: 7 }, { r: 3, c: 7 }, { r: 4, c: 7 }, { r: 5, c: 7 }
  ],
  yellow: [
    { r: 7, c: 13 }, { r: 7, c: 12 }, { r: 7, c: 11 }, { r: 7, c: 10 }, { r: 7, c: 9 }
  ],
  blue: [
    { r: 13, c: 7 }, { r: 12, c: 7 }, { r: 11, c: 7 }, { r: 10, c: 7 }, { r: 9, c: 7 }
  ]
};

// Home center coordinate for each color (step 57)
export const HOME_CENTERS: Record<PlayerColor, { r: number; c: number }> = {
  red: { r: 7, c: 6 },
  green: { r: 6, c: 7 },
  yellow: { r: 7, c: 8 },
  blue: { r: 8, c: 7 }
};

// Yard offsets for 4 tokens inside the home yard quadrants
export const YARD_POSITIONS: Record<PlayerColor, { r: number; c: number }[]> = {
  red: [
    { r: 1.5, c: 1.5 }, { r: 1.5, c: 3.5 },
    { r: 3.5, c: 1.5 }, { r: 3.5, c: 3.5 }
  ],
  green: [
    { r: 1.5, c: 10.5 }, { r: 1.5, c: 12.5 },
    { r: 3.5, c: 10.5 }, { r: 3.5, c: 12.5 }
  ],
  yellow: [
    { r: 10.5, c: 10.5 }, { r: 10.5, c: 12.5 },
    { r: 12.5, c: 10.5 }, { r: 12.5, c: 12.5 }
  ],
  blue: [
    { r: 10.5, c: 1.5 }, { r: 10.5, c: 3.5 },
    { r: 12.5, c: 1.5 }, { r: 12.5, c: 3.5 }
  ]
};

export const COLOR_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

/**
 * Returns the exact (row, col) grid coordinate for a token
 */
export function getTokenCoordinates(color: PlayerColor, tokenIndex: number, step: number): { r: number; c: number } {
  if (step === 0) {
    return YARD_POSITIONS[color][tokenIndex];
  }
  if (step >= 1 && step <= 51) {
    const startIndex = COLOR_START_INDEX[color];
    const trackIndex = (startIndex + step - 1) % 52;
    return TRACK_COORDS[trackIndex];
  }
  if (step >= 52 && step <= 56) {
    const pathIndex = step - 52;
    return HOME_PATHS[color][pathIndex];
  }
  // step == 57 (finished)
  return HOME_CENTERS[color];
}

/**
 * Get track index for a token if it's on the common track, otherwise null
 */
export function getTrackIndex(color: PlayerColor, step: number): number | null {
  if (step >= 1 && step <= 51) {
    const startIndex = COLOR_START_INDEX[color];
    return (startIndex + step - 1) % 52;
  }
  return null;
}

/**
 * Check if a common track index is a safe cell
 */
export function isSafeTrackIndex(trackIndex: number): boolean {
  return SAFE_TRACK_INDICES.includes(trackIndex);
}

/**
 * Determine which tokens are allowed to move for the current player & roll
 */
export function getMovableTokens(boardState: BoardState, color: PlayerColor, roll: number): number[] {
  const tokens = boardState[color];
  const movable: number[] = [];

  tokens.forEach((step, index) => {
    // Cannot move finished tokens
    if (step === 57) return;

    if (step === 0) {
      // Yard tokens require a 6 to exit
      if (roll === 6) {
        movable.push(index);
      }
    } else {
      // Active tokens can move if they don't overshoot the home (57)
      if (step + roll <= 57) {
        movable.push(index);
      }
    }
  });

  return movable;
}

/**
 * Apply token movement and check for any captured opponent tokens.
 * Modifies boardState in-place or returns a copy.
 * Returns true if a capture occurred.
 */
export function moveToken(
  boardState: BoardState,
  color: PlayerColor,
  tokenIndex: number,
  roll: number
): { boardState: BoardState; captureOccurred: boolean; reachedHomeOccurred: boolean } {
  const nextBoardState = JSON.parse(JSON.stringify(boardState)) as BoardState;
  const currentStep = nextBoardState[color][tokenIndex];
  let nextStep = currentStep;
  let reachedHomeOccurred = false;

  if (currentStep === 0 && roll === 6) {
    nextStep = 1; // Release token
  } else if (currentStep > 0 && currentStep + roll <= 57) {
    nextStep = currentStep + roll;
    if (nextStep === 57) {
      reachedHomeOccurred = true;
    }
  }

  nextBoardState[color][tokenIndex] = nextStep;

  let captureOccurred = false;

  // Only check captures if the token ended up on the common track
  const newTrackIndex = getTrackIndex(color, nextStep);
  if (newTrackIndex !== null && !isSafeTrackIndex(newTrackIndex)) {
    // Check all opponent colors
    COLOR_ORDER.forEach((oppColor) => {
      if (oppColor === color) return;

      nextBoardState[oppColor].forEach((oppStep, oppIndex) => {
        const oppTrackIndex = getTrackIndex(oppColor, oppStep);
        if (oppTrackIndex === newTrackIndex) {
          // CAPTURE! Send opponent back to yard (step 0)
          nextBoardState[oppColor][oppIndex] = 0;
          captureOccurred = true;
        }
      });
    });
  }

  return {
    boardState: nextBoardState,
    captureOccurred,
    reachedHomeOccurred
  };
}

/**
 * Check if the player has won (all 4 tokens at step 57)
 */
export function checkWinner(boardState: BoardState, color: PlayerColor): boolean {
  return boardState[color].every((step) => step === 57);
}

/**
 * Gets the next player index based on color order and availability of active players
 */
export function getNextPlayerIndex(
  currentIndex: number,
  activeColors: PlayerColor[],
  winnersList: PlayerColor[] = []
): number {
  let nextIndex = currentIndex;
  for (let i = 0; i < 4; i++) {
    nextIndex = (nextIndex + 1) % 4;
    const nextColor = COLOR_ORDER[nextIndex];
    // Next player must be in the active room and must not have already finished/won
    if (activeColors.includes(nextColor) && !winnersList.includes(nextColor)) {
      return nextIndex;
    }
  }
  return currentIndex;
}
