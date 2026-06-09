import { useState, useCallback, useRef, useEffect } from 'react';
import { generatePuzzle, areCellsAdjacent, isCenter } from './utils/gameLogic';
import html2canvas from 'html2canvas-pro';

const ROWS = 8;
const COLS = 8;
const NUM_PAIRS = 10;

const DIFFICULTIES = [
  { label: 'Facile', min: 10, max: 20 },
  { label: 'Medio', min: 20, max: 35 },
  { label: 'Difficile', min: 30, max: 50 },
];

function rand(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

interface FP { r1: number; c1: number; r2: number; c2: number }
function ck(r: number, c: number) { return `${r}-${c}`; }

export default function App() {
  const [diff, setDiff] = useState(0);
  const [target, setTarget] = useState(() => rand(DIFFICULTIES[0].min, DIFFICULTIES[0].max));
  const [puzzle, setPuzzle] = useState(() => generatePuzzle(ROWS, COLS, NUM_PAIRS, target));
  const [found, setFound] = useState<FP[]>([]);
  const [fb, setFb] = useState<'ok' | 'no' | null>(null);
  const [won, setWon] = useState(false);
  const [help, setHelp] = useState(false);
  const [confetti, setConfetti] = useState(false);

  // Drag state
  const [dragS, setDragS] = useState<{ r: number; c: number } | null>(null);
  const [dragE, setDragE] = useState<{ r: number; c: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const grid = puzzle.grid;
  const pairs = puzzle.pairs;

  const newGame = useCallback((di?: number) => {
    const d = di ?? diff;
    const p = DIFFICULTIES[d];
    const t = rand(p.min, p.max);
    setTarget(t);
    setPuzzle(generatePuzzle(ROWS, COLS, NUM_PAIRS, t));
    setFound([]); setDragS(null); setDragE(null);
    setDragging(false); setFb(null); setWon(false);
  }, [diff]);

  const chDiff = (i: number) => { setDiff(i); newGame(i); };

  useEffect(() => {
    if (won) { setConfetti(true); const t = setTimeout(() => setConfetti(false), 3000); return () => clearTimeout(t); }
  }, [won]);

  const fSet = new Set<string>();
  found.forEach(f => { fSet.add(ck(f.r1, f.c1)); fSet.add(ck(f.r2, f.c2)); });
  const inFound = (r: number, c: number) => fSet.has(ck(r, c));

  // ── Drag helpers ──
  const cellAt = (x: number, y: number) => {
    if (!gridRef.current) return null;
    const rc = gridRef.current.getBoundingClientRect();
    const col = Math.floor((x - rc.left) / (rc.width / COLS));
    const row = Math.floor((y - rc.top) / (rc.height / ROWS));
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
    if (isCenter(row, col)) return null;
    return { r: row, c: col };
  };

  const tryMatch = (s: { r: number; c: number }, e: { r: number; c: number }) => {
    if (won || (s.r === e.r && s.c === e.c)) return;
    if (inFound(s.r, s.c) || inFound(e.r, e.c)) return;
    if (!areCellsAdjacent(s.r, s.c, e.r, e.c)) { flash('no'); return; }
    if (grid[s.r][s.c] + grid[e.r][e.c] === target) {
      const nf = [...found, { r1: s.r, c1: s.c, r2: e.r, c2: e.c }];
      setFound(nf); flash('ok');
      if (nf.length === pairs.length) setWon(true);
    } else { flash('no'); }
  };

  const flash = (v: 'ok' | 'no') => { setFb(v); setTimeout(() => setFb(null), 500); };

  const onDown = (e: React.PointerEvent) => {
    if (won) return;
    const c = cellAt(e.clientX, e.clientY);
    if (!c || inFound(c.r, c.c)) return;
    setDragS(c); setDragE(c); setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging || !dragS) return;
    const c = cellAt(e.clientX, e.clientY);
    if (c && areCellsAdjacent(dragS.r, dragS.c, c.r, c.c)) setDragE(c);
    else if (c && c.r === dragS.r && c.c === dragS.c) setDragE(c);
  };
  const onUp = () => {
    if (dragging && dragS && dragE) tryMatch(dragS, dragE);
    setDragS(null); setDragE(null); setDragging(false);
  };

  const isDragSel = (r: number, c: number) =>
    !!dragging && !!dragS && !!dragE &&
    ((r === dragS.r && c === dragS.c) || (r === dragE.r && c === dragE.c));

  const hasDrag = !!dragging && !!dragS && !!dragE &&
    !(dragS.r === dragE.r && dragS.c === dragE.c);

  const exportPNG = async () => {
    if (!printRef.current) return;
    try {
      const canvas = await html2canvas(printRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const a = document.createElement('a');
      a.download = `number-search-${target}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch (err) { console.error(err); }
  };

  const pct = pairs.length > 0 ? (found.length / pairs.length) * 100 : 0;

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 flex flex-col select-none">
      {confetti && <Confetti />}

      {/* ── Top bar ── */}
      <header className="print:hidden flex items-center justify-between px-3 py-2 bg-white/70 backdrop-blur-md shrink-0 border-b border-indigo-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔢</span>
          <h1 className="text-sm sm:text-base font-bold text-indigo-800 tracking-tight">Number Search</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {DIFFICULTIES.map((d, i) => (
            <button key={i} onClick={() => chDiff(i)}
              className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                diff === i
                  ? 'bg-indigo-500 text-white shadow shadow-indigo-200'
                  : 'text-indigo-400 hover:bg-indigo-50 border border-indigo-100'
              }`}>{d.label}</button>
          ))}
          <div className="w-px h-5 bg-indigo-200 mx-0.5" />
          <button onClick={() => newGame()} className="px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-400 shadow shadow-emerald-200 transition-all" title="Nuova partita">🔄</button>
          <button onClick={() => window.print()} className="px-2 py-1 rounded-lg text-[11px] sm:text-xs font-semibold bg-blue-500 text-white hover:bg-blue-400 shadow shadow-blue-200 transition-all" title="Stampa">🖨️</button>
          <button onClick={exportPNG} className="px-2 py-1 rounded-lg text-[11px] sm:text-xs font-semibold bg-purple-500 text-white hover:bg-purple-400 shadow shadow-purple-200 transition-all" title="Esporta PNG">📥</button>
          <button onClick={() => setHelp(true)} className="px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold text-indigo-400 hover:bg-indigo-50 border border-indigo-100 transition-all" title="Aiuto">?</button>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-3 print:p-0">
        <div className="flex gap-3 items-center h-full max-h-full print:block">

          {/* Left sidebar */}
          <div className="print:hidden flex flex-col items-center gap-3 shrink-0">
            <div className="text-center">
              <div className="text-[9px] font-semibold text-indigo-300 uppercase tracking-widest">Trovate</div>
              <div className="text-xl font-black text-indigo-600 leading-none mt-0.5">
                {found.length}<span className="text-indigo-200">/{pairs.length}</span>
              </div>
            </div>
            <div className="w-2.5 h-24 bg-indigo-100 rounded-full overflow-hidden">
              <div className="w-full bg-gradient-to-t from-emerald-400 to-emerald-300 rounded-full transition-all duration-300"
                style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
            </div>
            <div className="h-7 flex items-center justify-center">
              {fb === 'ok' && <span className="text-lg animate-bounce">✅</span>}
              {fb === 'no' && <span className="text-lg animate-pulse">❌</span>}
            </div>
          </div>

          {/* Grid container */}
          <div ref={printRef} data-print-area
            className="bg-white rounded-xl shadow-lg border-2 border-indigo-200 overflow-hidden print:shadow-none print:rounded-none print:border-gray-400 print:w-full"
            style={{ aspectRatio: '1', height: '100%', maxHeight: 'min(100%, 88vw)' }}>

            <div className="relative w-full h-full"
              ref={gridRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              style={{ touchAction: 'none' }}>

              {/* SVG capsule highlights */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20"
                viewBox={`0 0 ${COLS * 100} ${ROWS * 100}`} preserveAspectRatio="none">
                {/* Found pairs */}
                {found.map((f, i) => (
                  <line key={i}
                    x1={(f.c1 + 0.5) * 100} y1={(f.r1 + 0.5) * 100}
                    x2={(f.c2 + 0.5) * 100} y2={(f.r2 + 0.5) * 100}
                    stroke="rgba(16, 185, 129, 0.4)" strokeWidth="78" strokeLinecap="round" />
                ))}
                {/* Active drag */}
                {hasDrag && (
                  <line
                    x1={(dragS!.c + 0.5) * 100} y1={(dragS!.r + 0.5) * 100}
                    x2={(dragE!.c + 0.5) * 100} y2={(dragE!.r + 0.5) * 100}
                    stroke="rgba(99, 102, 241, 0.3)" strokeWidth="78" strokeLinecap="round" />
                )}
              </svg>

              {/* Grid cells + center target (using explicit grid positions) */}
              <div className="grid w-full h-full"
                style={{
                  gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                  gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                }}>
                {grid.map((row, ri) =>
                  row.map((val, ci) => {
                    // Center 2x2 placeholder (empty cells)
                    if (isCenter(ri, ci)) {
                      return <div key={ck(ri, ci)} style={{ gridColumn: ci + 1, gridRow: ri + 1 }} />;
                    }

                    const isF = fSet.has(ck(ri, ci));
                    const isD = isDragSel(ri, ci);
                    const isLight = (ri + ci) % 2 === 0;

                    return (
                      <div key={ck(ri, ci)}
                        style={{ gridColumn: ci + 1, gridRow: ri + 1 }}
                        className={`
                          relative flex items-center justify-center
                          text-2xl sm:text-4xl md:text-5xl font-extrabold
                          border border-indigo-100/40
                          print:border-gray-200 print:text-black print:text-sm
                          ${isLight ? 'bg-white' : 'bg-indigo-50/20'}
                          ${isF ? 'text-emerald-700' : isD ? 'text-white' : 'text-gray-700'}
                        `}>
                        {val}
                      </div>
                    );
                  })
                )}

                {/* Center target block — merged 2x2 */}
                <div className="flex items-center justify-center
                  bg-gradient-to-br from-indigo-50 to-indigo-100 print:from-gray-50 print:to-gray-100
                  border-2 border-indigo-300 print:border-gray-400 rounded-xl z-10"
                  style={{ gridColumn: '4 / 6', gridRow: '4 / 6' }}>
                  <div className="text-center">
                    <div className="text-[clamp(2rem,7vmin,4rem)] font-black text-indigo-700 print:text-black leading-none">
                      {target}
                    </div>
                    <div className="text-[clamp(0.35rem,1vmin,0.55rem)] text-indigo-400 print:text-gray-500 font-semibold mt-0.5 uppercase tracking-wider">
                      {pairs.length} coppie
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="print:hidden shrink-0 bg-white/60 backdrop-blur-md border-t border-indigo-100 px-3 py-1.5 text-center">
        <span className="text-xs sm:text-sm text-indigo-500">
          Trascina da un numero a uno <strong>adiacente</strong> — trova le <strong className="text-indigo-700">{pairs.length}</strong> coppie che sommano a{' '}
          <strong className="text-emerald-600 text-sm sm:text-base">{target}</strong>
        </span>
      </div>

      {/* Win */}
      {won && (
        <div className="print:hidden fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setWon(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 text-center border-2 border-amber-200" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-2">🎉🏆🎉</div>
            <div className="text-xl font-black text-gray-800">Complimenti!</div>
            <div className="text-sm text-gray-500 mt-1">Tutte le {pairs.length} coppie trovate!</div>
            <button onClick={() => newGame()} className="mt-4 px-5 py-2 bg-indigo-500 text-white rounded-lg font-bold text-sm hover:bg-indigo-400 shadow-md shadow-indigo-200">🔄 Gioca ancora</button>
          </div>
        </div>
      )}

      {/* Help */}
      {help && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setHelp(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-xs mx-4 border border-indigo-100" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-3 text-base">📖 Come si gioca</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 shrink-0">●</span>
                <span><strong>Trascina</strong> da un numero a un numero <strong>adiacente</strong> (↔ ↕ ↗ ↘)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 shrink-0">●</span>
                <span>La somma deve fare <strong>{target}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 shrink-0">●</span>
                <span>Trova tutte le <strong>{NUM_PAIRS} coppie</strong> per vincere!</span>
              </li>
            </ul>
            <button onClick={() => setHelp(false)} className="mt-4 w-full py-2 bg-indigo-500 text-white rounded-lg font-semibold text-sm hover:bg-indigo-600">Ho capito!</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Confetti() {
  const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98'];
  const pcs = Array.from({ length: 50 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 0.5,
    dur: 1.5 + Math.random() * 2, color: colors[i % colors.length],
    size: 6 + Math.random() * 8, rot: Math.random() * 360,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pcs.map(p => (
        <div key={p.id} className="absolute"
          style={{
            left: `${p.left}%`, top: '-20px',
            width: `${p.size}px`, height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            transform: `rotate(${p.rot}deg)`,
            animation: `confettiFall ${p.dur}s ease-in ${p.delay}s forwards`,
          }} />
      ))}
    </div>
  );
}
