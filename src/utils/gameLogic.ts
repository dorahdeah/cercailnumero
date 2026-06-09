export interface Cell {
  row: number;
  col: number;
  value: number;
}

export interface Pair {
  cell1: Cell;
  cell2: Cell;
}

export type Direction = 'right' | 'down' | 'down-right' | 'down-left';

const DIRECTIONS: { dr: number; dc: number; name: Direction }[] = [
  { dr: 0, dc: 1, name: 'right' },
  { dr: 1, dc: 0, name: 'down' },
  { dr: 1, dc: 1, name: 'down-right' },
  { dr: 1, dc: -1, name: 'down-left' },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Center 2x2 block (rows 3-4, cols 3-4) reserved for target display
export function isCenter(r: number, c: number): boolean {
  return r >= 3 && r <= 4 && c >= 3 && c <= 4;
}

export function generatePuzzle(
  rows: number,
  cols: number,
  numPairs: number,
  targetSum: number
): { grid: number[][]; pairs: Pair[] } {
  const grid: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  );
  const used: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  );
  const pairs: Pair[] = [];

  // Mark center cells as used
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isCenter(r, c)) {
        used[r][c] = true;
      }
    }
  }

  let attempts = 0;
  while (pairs.length < numPairs && attempts < 3000) {
    attempts++;
    const dir = DIRECTIONS[randInt(0, DIRECTIONS.length - 1)];
    const r = randInt(0, rows - 1);
    const c = randInt(0, cols - 1);
    const r2 = r + dir.dr;
    const c2 = c + dir.dc;

    if (r2 < 0 || r2 >= rows || c2 < 0 || c2 >= cols) continue;
    if (used[r][c] || used[r2][c2]) continue;

    const minVal = Math.max(1, targetSum - 30);
    const maxVal = Math.min(targetSum - 1, 30);
    if (minVal >= maxVal) continue;

    const val1 = randInt(minVal, maxVal);
    const val2 = targetSum - val1;

    if (val2 < 1 || val2 > 30) continue;

    grid[r][c] = val1;
    grid[r2][c2] = val2;
    used[r][c] = true;
    used[r2][c2] = true;
    pairs.push({
      cell1: { row: r, col: c, value: val1 },
      cell2: { row: r2, col: c2, value: val2 },
    });
  }

  // Fill remaining non-center cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isCenter(r, c)) continue;
      if (!used[r][c]) {
        let val: number;
        let tries = 0;
        do {
          val = randInt(1, 30);
          tries++;
        } while (tries < 20 && wouldCreatePair(grid, used, r, c, val, targetSum, rows, cols));
        grid[r][c] = val;
      }
    }
  }

  return { grid, pairs };
}

function wouldCreatePair(
  grid: number[][],
  used: boolean[][],
  r: number,
  c: number,
  val: number,
  target: number,
  rows: number,
  cols: number
): boolean {
  const neighbors = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];
  for (const [dr, dc] of neighbors) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      if (!isCenter(nr, nc) && !used[nr][nc] && grid[nr][nc] !== 0 && grid[nr][nc] + val === target) {
        return true;
      }
    }
  }
  return false;
}

export function areCellsAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}
