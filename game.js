const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 720, H = 586;
canvas.width = W; canvas.height = H;

const T = {
    bg      : '#050C01',
    accent  : '#81F416',
    white   : '#B9EC6C',
    dim     : 'rgba(129,244,22,0.38)',
    dimmer  : 'rgba(129,244,22,0.12)',
    btnBg   : '#000000',
    btnBorder:'rgba(129,244,22,0.22)',
    label   : 'rgba(129,244,22,0.22)',
};

const smileyImg = new Image();
smileyImg.src = 'TetrisGameAssets/smiley.svg';

const illuImg = new Image();
illuImg.src = 'TetrisGameAssets/illu.svg';

const organicClipPath = new Path2D(
    'M191.477 296.741 ' +
    'C236.688 298.53 324.729 291.385 340.195 289.606 ' +
    'C355.661 287.817 361.017 275.326 363.991 260.453 ' +
    'C366.966 245.581 371.729 171.819 371.127 148.023 ' +
    'C370.534 124.226 370.339 89.6396 368.152 68.9052 ' +
    'C365.77 46.3044 363.389 26.0754 356.847 16.5588 ' +
    'C351.52 8.8113 330.076 7.04214 330.076 7.04214 ' +
    'C290.813 1.09302 191.467 0.500008 191.467 0.500008 ' +
    'H180.21 ' +
    'C180.21 0.500008 80.8637 1.09302 41.6015 7.04214 ' +
    'C41.6015 7.04214 20.1574 8.8113 14.8304 16.5588 ' +
    'C8.28833 26.0754 5.90674 46.3044 3.52515 68.9052 ' +
    'C1.33797 89.6494 1.14355 124.226 0.550582 148.023 ' +
    'C-0.0423866 171.819 4.71108 245.581 7.68564 260.453 ' +
    'C10.6602 275.326 16.0164 287.817 31.4821 289.606 ' +
    'C46.9479 291.395 134.989 298.53 180.2 296.741 ' +
    'H191.457 H191.477 Z'
);

// ── App state ─────────────────────────────────
let appState = 'intro'; // 'intro' | 'playing' | 'leaderboard'
let cursorBlink = 0;
let playerName = '';

// ── Leaderboard ───────────────────────────────
const LB_KEY = 'acidburn_scores';
let _lbMemory = null; // in-memory fallback if localStorage unavailable

function lbStorage() {
    // Returns a simple {get, set} wrapper — falls back to in-memory array
    try {
        localStorage.setItem('__lb_test', '1');
        localStorage.removeItem('__lb_test');
        return {
            get: () => { try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch(e) { return []; } },
            set: (data) => localStorage.setItem(LB_KEY, JSON.stringify(data))
        };
    } catch(e) {
        // localStorage blocked (iframe sandbox, private mode, file://) — use memory
        return {
            get: () => _lbMemory ? [..._lbMemory] : [],
            set: (data) => { _lbMemory = [...data]; }
        };
    }
}
function lbLoad() { return lbStorage().get(); }
function lbSave(name, sc, lv, ln) {
    const store = lbStorage();
    const all = store.get();
    all.push({ name: (name || 'ANON').trim() || 'ANON', score: sc|0, level: lv|0, lines: ln|0 });
    all.sort((a,b) => b.score - a.score);
    store.set(all.slice(0, 10));
    console.log('[ACID BURN] Score saved:', name, sc, '— leaderboard:', all.length, 'entries');
}
function drawLeaderboard() {
    clearScreen();
    const entries = lbLoad();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    ctx.font = '700 22px "JetBrains Mono",monospace';
    ctx.fillStyle = T.accent;
    ctx.fillText('LEADERBOARD', W/2, 60);

    ctx.setLineDash([]);
    ctx.strokeStyle = T.dimmer; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, 86); ctx.lineTo(W-24, 86); ctx.stroke();

    if (entries.length === 0) {
        ctx.font = '400 12px "JetBrains Mono",monospace';
        ctx.fillStyle = T.dim;
        ctx.fillText('NO  SCORES  YET', W/2, 200);
        ctx.fillText('PLAY  A  GAME  FIRST', W/2, 224);
    } else {
        // Header row
        ctx.font = '500 9px "JetBrains Mono",monospace';
        ctx.fillStyle = T.dimmer;
        ctx.textAlign = 'left';
        const lx = 48, rx = W - 48;
        ctx.fillText('#', lx, 104);
        ctx.fillText('NAME', lx+24, 104);
        ctx.fillText('SCORE', lx+170, 104);
        ctx.fillText('LV', lx+270, 104);
        ctx.fillText('LN', lx+310, 104);

        ctx.beginPath(); ctx.moveTo(24, 112); ctx.lineTo(W-24, 112); ctx.stroke();

        entries.forEach((e, i) => {
            const y = 130 + i * 38;
            const isTop = i === 0;
            ctx.font = isTop ? '700 13px "JetBrains Mono",monospace' : '500 12px "JetBrains Mono",monospace';
            ctx.fillStyle = isTop ? T.accent : (i < 3 ? T.white : T.dim);
            ctx.textAlign = 'left';
            ctx.fillText(`${i+1}`, lx, y);
            ctx.fillText((e.name || 'ANON').slice(0,12), lx+24, y);
            ctx.fillText(String(e.score).padStart(7,'0'), lx+170, y);
            ctx.fillText(String(e.level).padStart(2,'0'), lx+270, y);
            ctx.fillText(String(e.lines).padStart(4,'0'), lx+310, y);
            if (i < entries.length-1) {
                ctx.strokeStyle = 'rgba(129,244,22,0.06)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(24, y+18); ctx.lineTo(W-24, y+18); ctx.stroke();
            }
        });
    }

    // Back button — fixed at bottom
    ctx.textAlign = 'center';
    rBtn(W/2 - 140, LB_BACK_Y, 280, 44, T.btnBg, T.btnBorder);
    ctx.font = '700 13px "JetBrains Mono",monospace';
    ctx.fillStyle = T.dim;
    ctx.fillText('← BACK', W/2, LB_BACK_Y + 22);
}

// ── Helpers ───────────────────────────────────
function clipScreen() {
    ctx.save();
    ctx.setTransform(1.828, 0, 0, 1.835, 19.6, 20.9);
    ctx.beginPath(); ctx.clip(organicClipPath);
    ctx.restore();
}
function clearScreen() {
    clipScreen();
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, W, H);
}
function rBtn(x, y, w, h, fill, border) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 4);
    ctx.fillStyle = fill; ctx.fill();
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 1.5; ctx.stroke(); }
}

// ── Intro screen ──────────────────────────────
const INTRO_PLAY_BY  = 286; // y of PLAY button
const INTRO_LB_BY    = 286 + 46 + 20; // y of LEADERBOARD button
const INTRO_BW = 280, INTRO_BH = 46;
const LB_BACK_Y = 510; // y of BACK button on leaderboard screen

function drawTitle() {
    clearScreen();

    // Illustration — uniformly scaled to fit screen width, clipped to organic screen border
    if (illuImg.complete && illuImg.naturalWidth > 0) {
        const iW = illuImg.naturalWidth, iH = illuImg.naturalHeight;
        const scale = W / iW;                  // fit width exactly
        const dh = iH * scale;                 // height preserving aspect ratio
        const dy = H - dh;                     // anchor to bottom

        ctx.save();
        ctx.setTransform(1.828, 0, 0, 1.835, 19.6, 20.9);
        ctx.beginPath();
        ctx.clip(organicClipPath);             // clip to exact organic screen boundary
        ctx.resetTransform();
        ctx.drawImage(illuImg, 0, dy, W, dh);
        ctx.restore();
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 47px "JetBrains Mono",monospace';
    ctx.fillStyle = T.white;
    const titleText = 'ACID BURN';
    const metrics   = ctx.measureText(titleText);
    const titleW    = metrics.width;
    const textH     = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const smSize    = Math.round(textH);
    const smGap     = 12;
    const smCenterY = 76 + (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2;
    const smY       = smCenterY - smSize / 2;
    if (smileyImg.complete && smileyImg.naturalWidth > 0) {
        ctx.drawImage(smileyImg, W/2 - titleW/2 - smGap - smSize, smY, smSize, smSize);
        ctx.drawImage(smileyImg, W/2 + titleW/2 + smGap,          smY, smSize, smSize);
    }
    ctx.fillText(titleText, W/2, 76);

    ctx.font = '600 15px "JetBrains Mono",monospace';
    ctx.fillStyle = T.white;
    ctx.fillText('THE CLASSIC TETRIS HACKED', W/2, 124);

    ctx.setLineDash([]);
    ctx.strokeStyle = T.dimmer; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, 155); ctx.lineTo(W - 24, 155); ctx.stroke();

    ctx.font = '600 11px "JetBrains Mono",monospace';
    ctx.fillStyle = T.dim;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('YOUR  NAME', W/2, 192);

    const inW = 340, inH = 44, inX = W/2 - 170, inY = 212;
    ctx.beginPath(); ctx.roundRect(inX, inY, inW, inH, 3);
    ctx.fillStyle = T.btnBg; ctx.fill();
    ctx.strokeStyle = T.accent; ctx.lineWidth = 1.5; ctx.stroke();

    if (playerName) {
        ctx.font = '700 18px "JetBrains Mono",monospace';
        ctx.fillStyle = T.accent;
        ctx.fillText(playerName + (cursorBlink % 60 < 30 ? '▌' : ''), W/2, inY + inH / 2);
    } else {
        ctx.font = '400 12px "JetBrains Mono",monospace';
        ctx.fillStyle = T.label;
        ctx.fillText('TYPE  YOUR  NAME' + (cursorBlink % 60 < 30 ? '  ▌' : ''), W/2, inY + inH / 2);
    }

    let by = INTRO_PLAY_BY;
    rBtn(W/2 - INTRO_BW/2, by, INTRO_BW, INTRO_BH, T.accent, null);
    ctx.font = '700 15px "JetBrains Mono",monospace';
    ctx.fillStyle = T.bg;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('▶  PLAY', W/2, by + INTRO_BH / 2);
    by += INTRO_BH + 20;

    rBtn(W/2 - INTRO_BW/2, by, INTRO_BW, INTRO_BH, T.btnBg, T.btnBorder);
    ctx.font = '700 15px "JetBrains Mono",monospace';
    ctx.fillStyle = T.dim;
    ctx.fillText('LEADERBOARD', W/2, by + INTRO_BH / 2);
}

function loop() {
    if (appState !== 'intro' && appState !== 'leaderboard') return;
    cursorBlink++;
    if (appState === 'intro') drawTitle();
    else drawLeaderboard();
    requestAnimationFrame(loop);
}

// ── Tetris ────────────────────────────────────
const COLS = 10, ROWS = 20, CELL = 25;
// Screen usable area: x ≈ 20–699 (centre 359), y ≈ 22–569 (centre 295)
// Board 250×500 → centre at (359,295) → top-left (234, 45)
const BOARD_X = 234, BOARD_Y = 45;

const PIECE_COLORS = [
    '#81F416', // I
    '#C4F480', // O
    '#5db80e', // T
    '#A8E040', // S
    '#4a9008', // Z
    '#6DCF20', // J
    '#B9EC6C', // L
];

const SHAPES = [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
    [[1,1],[1,1]],                               // O
    [[0,1,0],[1,1,1],[0,0,0]],                  // T
    [[0,1,1],[1,1,0],[0,0,0]],                  // S
    [[1,1,0],[0,1,1],[0,0,0]],                  // Z
    [[1,0,0],[1,1,1],[0,0,0]],                  // J
    [[0,0,1],[1,1,1],[0,0,0]],                  // L
];

let board, current, nextPc, score, level, lines, gameOver, paused, dropAccum, dropInterval;
let gameOverBtns = null;

// Acid-burn dissolve state
let dissolving = false;
let dissolveRows = [];   // [{row, cells:[{ci,color,dy,alpha,drips:[]}], elapsed}]
let dissolveParticles = [];
let pendingClearedRows = [];
let pendingScore = 0, pendingLines = 0, pendingLevel = 0, pendingInterval = 0;

function newPiece() {
    const t = Math.floor(Math.random() * 7);
    const sh = SHAPES[t].map(r => [...r]);
    return { type: t, shape: sh, x: Math.floor(COLS/2) - Math.floor(sh[0].length/2), y: 0 };
}

function rot90(s) {
    return Array.from({length: s[0].length}, (_, c) =>
        Array.from({length: s.length}, (_, r) => s[s.length-1-r][c])
    );
}

function valid(p, dx=0, dy=0, sh=null) {
    const s = sh || p.shape;
    for (let r=0; r<s.length; r++)
        for (let c=0; c<s[r].length; c++) {
            if (!s[r][c]) continue;
            const nx=p.x+c+dx, ny=p.y+r+dy;
            if (nx<0||nx>=COLS||ny>=ROWS) return false;
            if (ny>=0 && board[ny][nx]) return false;
        }
    return true;
}

function triggerGameOver() {
    if (gameOver) return;
    gameOver = true;
    lbSave(playerName, score, level, lines);
}

function lock() {
    for (let r=0; r<current.shape.length; r++)
        for (let c=0; c<current.shape[r].length; c++) {
            if (!current.shape[r][c]) continue;
            const y=current.y+r;
            if (y<0) { triggerGameOver(); return; }
            board[y][current.x+c] = current.type+1;
        }
    const rowsToClear = [];
    for (let r=ROWS-1; r>=0; r--) {
        if (board[r].every(v=>v)) rowsToClear.push(r);
    }
    if (rowsToClear.length) {
        // Kick off acid dissolve — freeze gameplay until animation ends
        dissolving = true;
        dissolveRows = rowsToClear.map(r => ({
            row: r,
            elapsed: 0,
            // cellAlpha: how much of the solid block remains (shrinks upward)
            cells: board[r].map((v,ci) => ({
                ci,
                fillH: CELL,   // block body height, shrinks to 0
                drips: Array.from({length: 1+Math.floor(Math.random()*3)}, () => ({
                    x: BOARD_X + ci*CELL + CELL*0.2 + Math.random()*CELL*0.6,
                    len: 0,
                    maxLen: CELL * (0.9 + Math.random()*1.2),
                    vy: 0.6 + Math.random()*1.2,
                    w: 3.5 + Math.random()*5,
                    detached: false,
                    blobY: 0, blobVy: 0, blobAlpha: 0
                }))
            }))
        }));
        dissolveParticles = [];
        // Store what to apply after animation
        const cleared = rowsToClear.length;
        pendingScore    = [0,100,300,500,800][cleared] * level;
        pendingLines    = cleared;
        pendingLevel    = Math.floor((lines+cleared)/5)+1;
        pendingInterval = Math.max(80, 800-(pendingLevel-1)*75);
        pendingClearedRows = [...rowsToClear].sort((a,b)=>b-a);
    } else {
        current = nextPc;
        nextPc  = newPiece();
        if (!valid(current)) triggerGameOver();
    }
}

function ghostRow() { let d=0; while(valid(current,0,d+1)) d++; return current.y+d; }
function moveL()   { if (valid(current,-1)) current.x--; }
function moveR()   { if (valid(current, 1)) current.x++; }
function softDrop(){ if (valid(current,0,1)) { current.y++; dropAccum=0; } else lock(); }
function hardDrop(){ while(valid(current,0,1)) current.y++; lock(); }
function rotate()  {
    const r=rot90(current.shape);
    for (const k of [0,-1,1,-2,2])
        if (valid(current,k,0,r)) { current.shape=r; current.x+=k; return; }
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x+1, y+1, CELL-2, CELL-2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x+2, y+2, CELL-4, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x+2, y+CELL-5, CELL-4, 3);
}

function stat(x, y, label, value, size=20) {
    ctx.font = '500 9px "JetBrains Mono",monospace';
    ctx.fillStyle = T.dim; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(label, x, y);
    ctx.font = `700 ${size}px "JetBrains Mono",monospace`;
    ctx.fillStyle = T.white;
    ctx.fillText(value, x, y+13);
}

function drawGame() {
    clearScreen();

    const BW = COLS*CELL, BH = ROWS*CELL;

    // ── Board ────────────────────────────────
    // Subtle fill
    ctx.fillStyle = 'rgba(129,244,22,0.02)';
    ctx.fillRect(BOARD_X, BOARD_Y, BW, BH);

    // Grid lines
    ctx.strokeStyle = 'rgba(129,244,22,0.055)'; ctx.lineWidth=0.5;
    for (let c=1;c<COLS;c++) {
        ctx.beginPath(); ctx.moveTo(BOARD_X+c*CELL,BOARD_Y); ctx.lineTo(BOARD_X+c*CELL,BOARD_Y+BH); ctx.stroke();
    }
    for (let r=1;r<ROWS;r++) {
        ctx.beginPath(); ctx.moveTo(BOARD_X,BOARD_Y+r*CELL); ctx.lineTo(BOARD_X+BW,BOARD_Y+r*CELL); ctx.stroke();
    }

    // Border
    ctx.strokeStyle = T.accent; ctx.lineWidth=1.5;
    ctx.strokeRect(BOARD_X-1, BOARD_Y-1, BW+2, BH+2);

    // Locked cells
    for (let r=0;r<ROWS;r++)
        for (let c=0;c<COLS;c++)
            if (board[r][c]) drawBlock(BOARD_X+c*CELL, BOARD_Y+r*CELL, PIECE_COLORS[board[r][c]-1]);

    // ── Acid slime dissolve overlay ──────────
    if (dissolving) {
        ctx.save();

        dissolveRows.forEach(dr => {
            dr.cells.forEach(cell => {
                const px = BOARD_X + cell.ci * CELL;
                const rootY = BOARD_Y + dr.row * CELL; // top of this cell's row

                // Shrinking block body (drains from bottom upward)
                if (cell.fillH > 0) {
                    const bh = Math.max(0, cell.fillH);
                    // Solid fill
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#5db80e';
                    ctx.fillRect(px+1, rootY+1, CELL-2, bh-2);
                    // Bright top highlight
                    ctx.fillStyle = '#C4F480';
                    ctx.fillRect(px+1, rootY+1, CELL-2, 3);
                    // Shiny left edge
                    ctx.fillStyle = 'rgba(196,244,128,0.5)';
                    ctx.fillRect(px+1, rootY+1, 3, bh-2);
                    // Wet bottom edge — darker where it bleeds into drip
                    ctx.fillStyle = '#3a8000';
                    ctx.fillRect(px+1, rootY+bh-4, CELL-2, 3);
                }

                // Slime drip streams
                cell.drips.forEach(d => {
                    if (d.detached) {
                        // Falling detached blob
                        if (d.blobAlpha > 0) {
                            ctx.globalAlpha = d.blobAlpha;
                            drawSlimeBlob(ctx, d.x, d.blobY, d.w * 0.65);
                            ctx.globalAlpha = 1;
                        }
                        return;
                    }
                    if (d.len <= 0) return;

                    const rootX = d.x;
                    const streamTop = rootY + cell.fillH;   // attaches to bottom of block
                    const tipY = streamTop + d.len;
                    const hw = d.w / 2;                     // half-width of stream at root
                    const blobR = hw * 1.7;                 // blob radius at tip

                    ctx.globalAlpha = 1;

                    // Stream body as a tapered bezier path
                    ctx.beginPath();
                    // Left side: root → taper → left edge of blob
                    ctx.moveTo(rootX - hw, streamTop);
                    ctx.bezierCurveTo(
                        rootX - hw,    streamTop + d.len*0.5,
                        rootX - blobR, tipY - blobR*0.5,
                        rootX - blobR, tipY
                    );
                    // Arc around bottom of blob: π→3π/2→0 clockwise = through the bottom
                    ctx.arc(rootX, tipY, blobR, Math.PI, 0, false);
                    // Right side back up to root
                    ctx.bezierCurveTo(
                        rootX + blobR, tipY - blobR*0.5,
                        rootX + hw,    streamTop + d.len*0.5,
                        rootX + hw,    streamTop
                    );
                    ctx.closePath();

                    // Fill: gradient from bright lime at top to deeper green
                    const grad = ctx.createLinearGradient(rootX, streamTop, rootX, tipY + blobR);
                    grad.addColorStop(0,   '#81F416');
                    grad.addColorStop(0.5, '#6dcf10');
                    grad.addColorStop(1,   '#4a9008');
                    ctx.fillStyle = grad;
                    ctx.fill();

                    // Shiny highlight stripe down left of stream
                    ctx.beginPath();
                    ctx.moveTo(rootX - hw*0.55, streamTop);
                    ctx.quadraticCurveTo(rootX - hw*0.4, streamTop + d.len*0.5, rootX - hw*0.3, tipY - blobR);
                    ctx.lineWidth = hw * 0.55;
                    ctx.strokeStyle = 'rgba(196,244,128,0.65)';
                    ctx.lineCap = 'round';
                    ctx.stroke();

                    // Bright specular dot on blob
                    ctx.globalAlpha = 0.7;
                    ctx.fillStyle = '#d8ffaa';
                    ctx.beginPath();
                    ctx.arc(rootX - blobR*0.35, tipY - blobR*0.3, blobR*0.28, 0, Math.PI*2);
                    ctx.fill();

                    ctx.globalAlpha = 1;
                    ctx.lineCap = 'butt';
                });
            });
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    if (!gameOver && !dissolving) {
        // Ghost
        const gy = ghostRow();
        current.shape.forEach((row,r) => row.forEach((v,c) => {
            if (!v) return;
            const px=BOARD_X+(current.x+c)*CELL, py=BOARD_Y+(gy+r)*CELL;
            if (py>=BOARD_Y) {
                ctx.strokeStyle='rgba(129,244,22,0.22)'; ctx.lineWidth=1;
                ctx.strokeRect(px+1,py+1,CELL-2,CELL-2);
            }
        }));

        // Active piece
        current.shape.forEach((row,r) => row.forEach((v,c) => {
            if (!v) return;
            const px=BOARD_X+(current.x+c)*CELL, py=BOARD_Y+(current.y+r)*CELL;
            if (py>=BOARD_Y) drawBlock(px, py, PIECE_COLORS[current.type]);
        }));
    }

    // ── Left panel ──────────────────────────
    // lx=82: safe inside the curved left screen border even at the top
    const lx=82;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.font='700 18px "JetBrains Mono",monospace'; ctx.fillStyle=T.accent;
    ctx.fillText('ACID', lx, 84); ctx.fillText('BURN', lx, 105);
    ctx.font='600 8px "JetBrains Mono",monospace'; ctx.fillStyle=T.dim;
    ctx.fillText('TETRIS', lx+2, 130);

    ctx.strokeStyle=T.dimmer; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(lx,146); ctx.lineTo(lx+120,146); ctx.stroke();

    stat(lx, 158, 'SCORE', String(score).padStart(7,'0'), 18);
    stat(lx, 206, 'LEVEL', String(level).padStart(2,'0'), 18);
    stat(lx, 254, 'LINES', String(lines).padStart(4,'0'), 18);

    ctx.font='600 11px "JetBrains Mono",monospace';
    [['←→','MOVE'],['↑','ROTATE'],['↓','SOFT DROP'],['SPC','HARD DROP'],['P','PAUSE'],['ESC','MENU']]
        .forEach(([key,action],i) => {
            const cy = 408+i*22;
            ctx.fillStyle='rgba(129,244,22,0.55)';
            ctx.fillText(key, lx, cy);
            ctx.fillStyle=T.dim;
            ctx.fillText(action, lx+46, cy);
        });

    // ── Right panel ─────────────────────────
    const rx = BOARD_X + BW + 54;
    const previewCell=22, previewBox=4*previewCell;

    const previewTop = 100; // aligned with ACID title on the left panel
    ctx.font='500 9px "JetBrains Mono",monospace'; ctx.fillStyle=T.dim;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText('NEXT', rx, 84);

    ctx.strokeStyle=T.dimmer; ctx.lineWidth=1;
    ctx.strokeRect(rx, 100, previewBox, previewBox);
    ctx.fillStyle='rgba(3,9,0,0.85)'; ctx.fillRect(rx+1,101,previewBox-2,previewBox-2);

    const ns=nextPc.shape;
    const nOx=Math.floor((previewBox - ns[0].length*previewCell)/2);
    const nOy=Math.floor((previewBox - ns.length*previewCell)/2);
    ns.forEach((row,r) => row.forEach((v,c) => {
        if (!v) return;
        ctx.fillStyle=PIECE_COLORS[nextPc.type];
        ctx.fillRect(rx+nOx+c*previewCell+1, previewTop+nOy+r*previewCell+1, previewCell-2, previewCell-2);
    }));

    // ── Overlays ─────────────────────────────
    if (paused && !gameOver) {
        ctx.fillStyle='rgba(3,9,0,0.9)'; ctx.fillRect(BOARD_X,BOARD_Y,BW,BH);
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font='700 22px "JetBrains Mono",monospace'; ctx.fillStyle=T.accent;
        ctx.fillText('PAUSED', BOARD_X+BW/2, BOARD_Y+BH/2-16);
        ctx.font='500 10px "JetBrains Mono",monospace'; ctx.fillStyle=T.dim;
        ctx.fillText('P  TO  RESUME', BOARD_X+BW/2, BOARD_Y+BH/2+14);
    }

    if (gameOver) {
        ctx.globalAlpha=1; ctx.setLineDash([]);
        ctx.fillStyle='rgba(3,9,0,0.92)'; ctx.fillRect(BOARD_X,BOARD_Y,BW,BH);
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font='700 22px "JetBrains Mono",monospace'; ctx.fillStyle=T.accent;
        ctx.fillText('GAME  OVER', BOARD_X+BW/2, BOARD_Y+BH/2-52);
        ctx.font='600 15px "JetBrains Mono",monospace'; ctx.fillStyle=T.white;
        ctx.fillText('SCORE  ' + score, BOARD_X+BW/2, BOARD_Y+BH/2-18);

        // Buttons — sized to content
        ctx.font='700 15px "JetBrains Mono",monospace';
        const btnH=38, pad=20, gap=16, cy=BOARD_Y+BH/2+30;
        const rW=ctx.measureText('RETRY').width+pad*2;
        const mW=ctx.measureText('MENU').width+pad*2;
        const totalW=rW+gap+mW;
        const rX=BOARD_X+BW/2-totalW/2;
        const mX=rX+rW+gap;

        // Store button rects for click handling
        gameOverBtns = { rX, rY: cy-btnH/2, rW, mX, mY: cy-btnH/2, mW, btnH };

        // RETRY — filled accent
        ctx.beginPath(); ctx.roundRect(rX, cy-btnH/2, rW, btnH, 4);
        ctx.fillStyle=T.accent; ctx.fill();
        ctx.fillStyle=T.bg; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('RETRY', rX+rW/2, cy);

        // MENU — outline only
        ctx.beginPath(); ctx.roundRect(mX, cy-btnH/2, mW, btnH, 4);
        ctx.fillStyle=T.btnBg; ctx.fill();
        ctx.strokeStyle=T.accent; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle=T.accent;
        ctx.fillText('MENU', mX+mW/2, cy);
    }
}

// ── Game loop ─────────────────────────────────
let lastTS = 0;

function drawSlimeBlob(ctx, x, y, r) {
    const grad = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.1, x, y, r);
    grad.addColorStop(0,   '#C4F480');
    grad.addColorStop(0.5, '#81F416');
    grad.addColorStop(1,   '#4a9008');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
    // specular
    ctx.fillStyle = 'rgba(220,255,160,0.7)';
    ctx.beginPath();
    ctx.arc(x - r*0.3, y - r*0.3, r*0.25, 0, Math.PI*2);
    ctx.fill();
}

function advanceDissolve(dt) {
    const DURATION = 950;
    dissolveRows.forEach(dr => {
        dr.elapsed += dt;
        const t = Math.min(dr.elapsed / DURATION, 1);

        dr.cells.forEach(cell => {
            // Block body drains downward — shrink fillH to 0 over first 70% of duration
            if (t < 0.7) {
                cell.fillH = Math.max(0, CELL * (1 - t / 0.7));
            } else {
                cell.fillH = 0;
            }

            // Grow drips; detach when they get long enough
            cell.drips.forEach(d => {
                if (d.detached) {
                    d.blobVy += 0.25;          // gravity on blob
                    d.blobY  += d.blobVy;
                    d.blobAlpha = Math.max(0, d.blobAlpha - dt * 0.0012);
                    return;
                }
                d.len += d.vy * dt * 0.1;
                if (d.len >= d.maxLen) {
                    // Detach: spawn a falling blob
                    d.detached = true;
                    d.blobY    = BOARD_Y + dr.row * CELL + cell.fillH + d.len;
                    d.blobVy   = d.vy * 0.4;
                    d.blobAlpha = 1;
                    d.len      = 0;
                }
            });
        });
    });

    // All rows done?
    if (dissolveRows.every(dr => dr.elapsed >= DURATION)) {
        // Commit the cleared rows now
        pendingClearedRows.forEach(r => {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
        });
        score    += pendingScore;
        lines    += pendingLines;
        level     = pendingLevel;
        dropInterval = pendingInterval;
        dissolving = false;
        dissolveRows = [];
        dissolveParticles = [];
        current = nextPc;
        nextPc  = newPiece();
        if (!valid(current)) triggerGameOver();
    }
}

function gameLoop(ts) {
    if (appState !== 'playing') return;
    const dt = ts - lastTS; lastTS = ts;
    if (!paused && !gameOver) {
        if (dissolving) {
            advanceDissolve(dt);
        } else {
            dropAccum += dt;
            if (dropAccum >= dropInterval) { softDrop(); dropAccum = 0; }
        }
    }
    drawGame();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    board = Array.from({length:ROWS},()=>Array(COLS).fill(0));
    score=0; level=1; lines=0; gameOver=false; paused=false;
    dropAccum=0; dropInterval=800;
    dissolving=false; dissolveRows=[]; dissolveParticles=[]; gameOverBtns=null;
    nextPc  = newPiece();
    current = newPiece();
    appState = 'playing';
    lastTS = performance.now();
    requestAnimationFrame(ts => { lastTS=ts; gameLoop(ts); });
}

// ── Input ─────────────────────────────────────
canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);

    if (appState === 'intro') {
        if (mx >= W/2-INTRO_BW/2 && mx <= W/2+INTRO_BW/2) {
            if (my >= INTRO_PLAY_BY && my <= INTRO_PLAY_BY+INTRO_BH) { startGame(); return; }
            if (my >= INTRO_LB_BY  && my <= INTRO_LB_BY+INTRO_BH)  {
                appState = 'leaderboard'; requestAnimationFrame(loop); return;
            }
        }
        return;
    }

    if (appState === 'leaderboard') {
        if (mx >= W/2-140 && mx <= W/2+140 && my >= LB_BACK_Y && my <= LB_BACK_Y+44) {
            appState = 'intro'; requestAnimationFrame(loop);
        }
        return;
    }

    if (appState === 'playing' && gameOver && gameOverBtns) {
        const b = gameOverBtns;
        if (mx >= b.rX && mx <= b.rX+b.rW && my >= b.rY && my <= b.rY+b.btnH) {
            startGame(); return;
        }
        if (mx >= b.mX && mx <= b.mX+b.mW && my >= b.mY && my <= b.mY+b.btnH) {
            appState='intro'; gameOverBtns=null; canvas.style.cursor='default';
            requestAnimationFrame(loop); return;
        }
    }
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);
    if (appState === 'intro') {
        const inX = mx >= W/2-INTRO_BW/2 && mx <= W/2+INTRO_BW/2;
        const over = inX && ((my >= INTRO_PLAY_BY && my <= INTRO_PLAY_BY+INTRO_BH) ||
                             (my >= INTRO_LB_BY   && my <= INTRO_LB_BY+INTRO_BH));
        canvas.style.cursor = over ? 'pointer' : 'default';
    } else if (appState === 'leaderboard') {
        const over = mx >= W/2-140 && mx <= W/2+140 && my >= LB_BACK_Y && my <= LB_BACK_Y+44;
        canvas.style.cursor = over ? 'pointer' : 'default';
    } else if (appState === 'playing' && gameOver && gameOverBtns) {
        const b = gameOverBtns;
        const overRetry = mx >= b.rX && mx <= b.rX+b.rW && my >= b.rY && my <= b.rY+b.btnH;
        const overMenu  = mx >= b.mX && mx <= b.mX+b.mW && my >= b.mY && my <= b.mY+b.btnH;
        canvas.style.cursor = (overRetry || overMenu) ? 'pointer' : 'default';
    }
});

document.addEventListener('keydown', e => {
    if (appState === 'leaderboard') {
        if (e.key === 'Escape' || e.key === 'Backspace') { appState='intro'; requestAnimationFrame(loop); }
        return;
    }
    if (appState === 'intro') {
        if (e.key === 'Backspace') { playerName = playerName.slice(0, -1); e.preventDefault(); return; }
        if (e.key === 'Enter') { startGame(); return; }
        if (e.key.length === 1 && playerName.length < 16) { playerName += e.key.toUpperCase(); }
        return;
    }
    if (appState === 'playing') {
        if (gameOver) {
            if (e.key==='r'||e.key==='R') startGame();
            if (e.key==='Escape') { appState='intro'; canvas.style.cursor='default'; requestAnimationFrame(loop); }
            return;
        }
        switch (e.key) {
            case 'ArrowLeft':  e.preventDefault(); moveL(); break;
            case 'ArrowRight': e.preventDefault(); moveR(); break;
            case 'ArrowDown':  e.preventDefault(); softDrop(); break;
            case 'ArrowUp':    e.preventDefault(); rotate(); break;
            case ' ':          e.preventDefault(); if(!paused) hardDrop(); break;
            case 'p': case 'P': paused=!paused; break;
            case 'Escape': appState='intro'; canvas.style.cursor='default'; requestAnimationFrame(loop); break;
        }
    }
});

smileyImg.onload = loop;
smileyImg.onerror = loop;
illuImg.onload = () => { if (appState === 'intro') loop(); };
illuImg.onerror = () => {};
