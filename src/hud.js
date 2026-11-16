import { WALLS, ROOMS, TOUR, BOUNDS } from './plan.js';

// Thanh nút, nhãn phòng và minimap (vẽ từ cùng dữ liệu với phần 3D, hướng giống ảnh mặt bằng).
export function createHud(cb) {
    const toolbar = document.getElementById('toolbar');
    const roomChip = document.getElementById('roomChip'), coords = document.getElementById('coords');
    const mini = document.getElementById('mini'), g = mini.getContext('2d');
    const btn = (html, fn) => {
        const b = document.createElement('button');
        b.className = 'tb-btn';
        b.innerHTML = html;
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); b.blur(); });
        toolbar.appendChild(b);
        return b;
    };
    const stops = TOUR.map((t, i) => btn(`<span class="n">${i + 1}</span>${t.name}`, () => cb.onStop(i)));
    const sep = document.createElement('span');
    sep.className = 'tb-sep';
    toolbar.appendChild(sep);
    const tourBtn = btn('▶ Tour tự động', cb.onTour);
    const modeBtn = btn('Xem mô hình', cb.onMode);
    const refBtn = btn('Đối chiếu bản vẽ', cb.onOverlay);
    const qBtn = btn('Chất lượng: Cao', cb.onQuality);
    refBtn.hidden = true;

    let mm = { s: 1, ox: 0, oy: 0, w: 0, h: 0 };
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2), w = mini.clientWidth, h = mini.clientHeight;
        mini.width = w * dpr;
        mini.height = h * dpr;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const pad = 8, W = BOUNDS.maxX - BOUNDS.minX, D = BOUNDS.maxZ - BOUNDS.minZ;
        const s = Math.min((w - pad * 2) / W, (h - pad * 2) / D);
        mm = { s, ox: (w - W * s) / 2 - BOUNDS.minX * s, oy: (h - D * s) / 2 - BOUNDS.minZ * s, w, h };
    }
    const toC = (x, z) => [mm.ox + x * mm.s, mm.oy + z * mm.s];
    mini.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const r = mini.getBoundingClientRect();
        cb.onMiniClick((e.clientX - r.left - mm.ox) / mm.s, (e.clientY - r.top - mm.oy) / mm.s);
    });

    function draw(player, room, path) {
        g.clearRect(0, 0, mm.w, mm.h);
        for (const r of ROOMS) {
            g.beginPath();
            r.poly.forEach((p, i) => { const c = toC(p[0], p[1]); i ? g.lineTo(c[0], c[1]) : g.moveTo(c[0], c[1]); });
            g.closePath();
            g.fillStyle = r === room ? 'rgba(168,102,45,.25)' : r.floor === 'wood' ? 'rgba(196,154,107,.2)' : 'rgba(120,130,135,.14)';
            g.fill();
        }
        for (const w of WALLS) {
            const at = (s) => toC(w.a[0] + w.dx * s, w.a[1] + w.dz * s);
            const seg = (s0, s1, lw, col) => {
                const a = at(s0), b = at(s1);
                g.strokeStyle = col; g.lineWidth = lw;
                g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
            };
            const lw = Math.max(1.5, w.t * mm.s);
            let cur = -w.t / 2;
            for (const op of [...w.openings].sort((a, b) => a.at - b.at)) {
                seg(cur, op.at, lw, '#1b2321');
                if (op.type === 'window' || op.type === 'balcony') seg(op.at, op.at + op.w, 1.3, '#3f6f8f');
                cur = op.at + op.w;
            }
            seg(cur, w.L + w.t / 2, lw, '#1b2321');
        }
        if (path && path.length) {
            g.strokeStyle = 'rgba(168,102,45,.8)'; g.lineWidth = 1.2; g.setLineDash([3, 3]);
            g.beginPath();
            const s = toC(player.x, player.z);
            g.moveTo(s[0], s[1]);
            for (const p of path) { const c = toC(p[0], p[1]); g.lineTo(c[0], c[1]); }
            g.stroke(); g.setLineDash([]);
        }
        const p = toC(player.x, player.z), ang = Math.atan2(-Math.cos(player.yaw), -Math.sin(player.yaw));
        g.fillStyle = 'rgba(168,102,45,.3)';
        g.beginPath(); g.moveTo(p[0], p[1]); g.arc(p[0], p[1], 24, ang - 0.5, ang + 0.5); g.closePath(); g.fill();
        g.fillStyle = '#a8662d'; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(p[0], p[1], 3.5, 0, Math.PI * 2); g.fill(); g.stroke();
    }

    let lastName = '';
    return {
        resize,
        update(player, room, path) {
            const name = room ? `${room.name} · ${room.area.toFixed(1)} m²` : 'Ngoài căn hộ';
            if (name !== lastName) { roomChip.textContent = name; lastName = name; }
            coords.textContent = `x ${player.x.toFixed(2)} m · y ${player.z.toFixed(2)} m`;
            draw(player, room, path);
        },
        setStop: (i) => stops.forEach((b, k) => b.classList.toggle('on', k === i)),
        setTour(running) { tourBtn.textContent = running ? '■ Dừng tour' : '▶ Tour tự động'; tourBtn.classList.toggle('on', running); },
        setMode(m) { modeBtn.textContent = m === 'walk' ? 'Xem mô hình' : 'Đi bộ'; refBtn.hidden = m === 'walk'; },
        setOverlay: (on) => refBtn.classList.toggle('on', on),
        setQuality: (hq) => (qBtn.textContent = 'Chất lượng: ' + (hq ? 'Cao' : 'Thấp'))
    };
}
