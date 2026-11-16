import { clamp } from './geo.js';

// Bàn phím + chuột (khoá con trỏ) + cảm ứng (joystick trái, kéo phải để nhìn).
// state: { player, orbit, mode() }, hooks: { onStart, onUserMove, onTap(event) }
export function createControls(stage, canvas, state, hooks) {
    const keys = new Set();
    const touches = new Map();
    let moveVec = { x: 0, y: 0 };
    const joy = document.getElementById('joy'), knob = document.getElementById('joyKnob');
    const cross = document.getElementById('cross'), hint = document.getElementById('hint');
    const locked = () => document.pointerLockElement === canvas;
    const lock = () => {
        try {
            const r = canvas.requestPointerLock && canvas.requestPointerLock();
            if (r && r.catch) r.catch(() => {});
        } catch (e) {}
    };
    const refresh = () => {
        cross.hidden = !(locked() && state.mode() === 'walk');
        hint.hidden = !locked();
    };
    document.addEventListener('pointerlockchange', refresh);

    const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'];
    window.addEventListener('keydown', (e) => {
        if (!(locked() || document.activeElement === stage)) return;
        const k = e.key.toLowerCase();
        if (!MOVE_KEYS.includes(k)) return;
        keys.add(k);
        if (k !== 'shift') hooks.onUserMove();
        if (k.startsWith('arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => keys.clear());

    canvas.addEventListener('mousemove', (e) => {
        if (!locked() || state.mode() !== 'walk') return;
        const p = state.player;
        p.yaw -= e.movementX * 0.0022;
        p.pitch = clamp(p.pitch - e.movementY * 0.0022, -1.3, 1.3);
    });

    canvas.addEventListener('pointerdown', (e) => {
        stage.focus();
        hooks.onStart();
        const rect = stage.getBoundingClientRect(), lx = e.clientX - rect.left;
        if (e.pointerType === 'touch' && state.mode() === 'walk' && lx < rect.width * 0.45) {
            touches.set(e.pointerId, { kind: 'joy', ox: e.clientX, oy: e.clientY });
            joy.hidden = false;
            joy.style.left = lx + 'px';
            joy.style.top = e.clientY - rect.top + 'px';
            knob.style.transform = '';
            hooks.onUserMove();
        } else touches.set(e.pointerId, { kind: 'look', lx: e.clientX, ly: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointermove', (e) => {
        const t = touches.get(e.pointerId);
        if (!t) return;
        if (t.kind === 'joy') {
            let dx = e.clientX - t.ox, dy = e.clientY - t.oy;
            const d = Math.hypot(dx, dy), m = 45;
            if (d > m) { dx *= m / d; dy *= m / d; }
            knob.style.transform = `translate(${dx}px,${dy}px)`;
            moveVec = { x: dx / m, y: -dy / m };
            return;
        }
        if (locked()) return;
        const dx = e.clientX - t.lx, dy = e.clientY - t.ly;
        t.lx = e.clientX; t.ly = e.clientY;
        if (Math.hypot(e.clientX - t.sx, e.clientY - t.sy) > 5) t.moved = true;
        if (state.mode() === 'walk') {
            const s = e.pointerType === 'touch' ? 0.005 : 0.004, p = state.player;
            p.yaw += dx * s;
            p.pitch = clamp(p.pitch + dy * s, -1.3, 1.3);
            if (t.moved) hooks.onUserMove();
        } else {
            const o = state.orbit;
            o.theta -= dx * 0.006;
            o.phi = clamp(o.phi - dy * 0.006, 0.02, 1.45);
        }
    });
    const end = (e) => {
        const t = touches.get(e.pointerId);
        if (!t) return;
        touches.delete(e.pointerId);
        if (t.kind === 'joy') { joy.hidden = true; moveVec = { x: 0, y: 0 }; }
        else if (!t.moved) {
            if (state.mode() === 'model') hooks.onTap(e);
            else if (e.pointerType === 'mouse' && !locked()) lock();
        }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => {
        if (state.mode() !== 'model') return;
        e.preventDefault();
        state.orbit.r = clamp(state.orbit.r * (1 + e.deltaY * 0.001), 5, 30);
    }, { passive: false });

    return {
        lock,
        locked,
        refresh,
        unlock: () => locked() && document.exitPointerLock(),
        // hướng đi mong muốn: f = tới/lùi, s = phải/trái, turn = xoay bằng phím mũi tên
        input() {
            let f = 0, s = 0, turn = 0;
            if (keys.has('w') || keys.has('arrowup')) f += 1;
            if (keys.has('s') || keys.has('arrowdown')) f -= 1;
            if (keys.has('d')) s += 1;
            if (keys.has('a')) s -= 1;
            if (keys.has('arrowleft')) turn += 1;
            if (keys.has('arrowright')) turn -= 1;
            return { f: f + moveVec.y, s: s + moveVec.x, turn, run: keys.has('shift') };
        }
    };
}
