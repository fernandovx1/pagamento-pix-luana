// ==========================================
// UTILITÁRIOS, FORMATAÇÃO, ÁUDIO & EFEITOS VISUAIS
// ==========================================

export function formatMoney(val) {
    return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDateBr(isoStr) {
    if (!isoStr) return '';
    const parts = isoStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoStr;
}

// Formatação automática do input de telefone
export function formatPhoneInput(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 6) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
    } else if (v.length > 2) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    } else if (v.length > 0) {
        input.value = `(${v}`;
    }
}

// Cálculo das próximas sextas-feiras
export function getUpcomingFridays() {
    const fridays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let check = new Date(today);
    const dayOfWeek = check.getDay();
    const daysUntilNextFriday = (5 - dayOfWeek + 7) % 7;
    check.setDate(check.getDate() + daysUntilNextFriday);

    for (let i = 0; i < 4; i++) {
        const d = new Date(check);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const iso = `${year}-${month}-${day}`;
        const label = `${day}/${month}`;

        let isToday = false;
        let isTomorrow = false;
        const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) isToday = true;
        if (diffDays === 1) isTomorrow = true;

        let badge = 'Sexta';
        if (isToday) badge = 'Hoje!';
        else if (isTomorrow) badge = 'Amanhã!';

        fridays.push({
            date: d,
            iso: iso,
            label: label,
            badge: badge,
            isNext: i === 0
        });
        check.setDate(check.getDate() + 7);
    }
    return fridays;
}

// Cálculo do 5º dia útil do próximo mês
export function setQuickDueFifthBusinessDay() {
    const today = new Date();
    let year = today.getFullYear();
    let nextMonth = today.getMonth() + 1;
    if (nextMonth > 11) {
        nextMonth = 0;
        year++;
    }

    let businessDaysCount = 0;
    let targetDay = 1;
    while (businessDaysCount < 5) {
        const curDate = new Date(year, nextMonth, targetDay);
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            businessDaysCount++;
        }
        if (businessDaysCount < 5) targetDay++;
    }

    const monthStr = String(nextMonth + 1).padStart(2, '0');
    const dayStr = String(targetDay).padStart(2, '0');
    const formatted = `${year}-${monthStr}-${dayStr}`;

    const input = document.getElementById('directOrderDueDate') || document.getElementById('noteDueDate');
    if (input) {
        input.value = formatted;
        input.classList.add('pulse-glow');
        setTimeout(() => input.classList.remove('pulse-glow'), 600);
    }
}

// Helpers de datas rápidas
export function setQuickDueDate(days) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    const input = document.getElementById('directOrderDueDate') || document.getElementById('noteDueDate');
    if (input) {
        input.value = `${y}-${m}-${d}`;
        input.classList.add('pulse-glow');
        setTimeout(() => input.classList.remove('pulse-glow'), 600);
    }
}

export function setQuickDueDateNextDay() {
    setQuickDueDate(1);
}

export function setQuickDueDayOfMonth(dayOfMonth) {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();

    if (today.getDate() >= dayOfMonth) {
        month++;
        if (month > 11) {
            month = 0;
            year++;
        }
    }

    const m = String(month + 1).padStart(2, '0');
    const d = String(dayOfMonth).padStart(2, '0');
    const input = document.getElementById('directOrderDueDate') || document.getElementById('noteDueDate');
    if (input) {
        input.value = `${year}-${m}-${d}`;
        input.classList.add('pulse-glow');
        setTimeout(() => input.classList.remove('pulse-glow'), 600);
    }
}

// Som de Venda e Notificação (Consolidado com WebAudio)
export function playSaleNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        // Acorde alegre e cristalino de caixa registradora (F6, A6, C7, E7)
        const notes = [
            { freq: 1396.91, time: 0.00, dur: 0.35, gain: 0.15 },
            { freq: 1760.00, time: 0.08, dur: 0.40, gain: 0.18 },
            { freq: 2093.00, time: 0.16, dur: 0.45, gain: 0.20 },
            { freq: 2637.02, time: 0.24, dur: 0.60, gain: 0.22 },
            { freq: 3135.96, time: 0.30, dur: 0.75, gain: 0.15 }
        ];

        notes.forEach(n => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

            gainNode.gain.setValueAtTime(0.001, ctx.currentTime + n.time);
            gainNode.gain.exponentialRampToValueAtTime(n.gain, ctx.currentTime + n.time + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.time + n.dur);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(ctx.currentTime + n.time);
            osc.stop(ctx.currentTime + n.time + n.dur);
        });
    } catch (e) {
        console.log('AudioContext notification sound error:', e);
    }
}

// Sistema de Borboletas Animadas
export function spawnButterfly(side, yPercent, duration, size, pairOffset) {
    const c = document.getElementById('butterflyContainer');
    if (!c) return;

    const b = document.createElement('div');
    b.className = 'butterfly';
    b.style.top = (yPercent + (pairOffset || 0)) + 'vh';
    b.style.width = size + 'px';
    b.style.height = (size * 0.75) + 'px';

    const wingL = document.createElement('div');
    wingL.className = 'wing wing-left';
    const wingR = document.createElement('div');
    wingR.className = 'wing wing-right';
    b.appendChild(wingL);
    b.appendChild(wingR);

    b.style.animation = `flyAcross ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;

    c.appendChild(b);
    setTimeout(() => {
        if (b && b.parentNode) b.parentNode.removeChild(b);
    }, (duration + 1) * 1000);
}

export function triggerButterflyPair() {
    const y = Math.random() * 70 + 10;
    const dur = Math.random() * 4 + 7;
    const sz = Math.random() * 8 + 22;
    spawnButterfly('left', y, dur, sz, 0);
    setTimeout(() => {
        spawnButterfly('left', y + (Math.random() * 6 - 3), dur + (Math.random() * 0.8 - 0.4), sz * 0.85, 3);
    }, 600);
}

export function startButterflySystem() {
    setTimeout(() => { triggerButterflyPair(); }, 1000);
    setInterval(() => {
        triggerButterflyPair();
    }, 18000);
}
