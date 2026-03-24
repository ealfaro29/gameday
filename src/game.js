export const STORAGE_KEY = 'gameday-state-v1';
export const INSTAGRAM_MINIMUM = 5;
export const INSTAGRAM_TARGET = 6;
export const XP_VALUES = {
  sundayExtra: 180
};

export const SBPD_SECTORS = [
  {
    id: 'alpha',
    title: 'Sector Alpha',
    window: '9:00 a. m. - 11:00 a. m.',
    lore: 'Primera ventana de foco duro para abrir la nave.',
    xp: 55
  },
  {
    id: 'beta',
    title: 'Sector Beta',
    window: '11:00 a. m. - 1:00 p. m.',
    lore: 'Segundo bloque de 2 horas para mantener presion.',
    xp: 55
  },
  {
    id: 'gamma',
    title: 'Cierre Gamma',
    window: '1:00 p. m. - 2:00 p. m.',
    lore: 'Aterrizaje final para cerrar la jornada SBPD.',
    xp: 30
  }
];

export const EFFORTS = [
  {
    id: 'scout',
    label: 'Scout',
    description: 'rapida',
    basePoints: 25
  },
  {
    id: 'orbit',
    label: 'Forge',
    description: 'media',
    basePoints: 52
  },
  {
    id: 'boss',
    label: 'Titan',
    description: 'pesada',
    basePoints: 92
  }
];

const DAY_SHORT = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
const DAY_FULL = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado'
];
const MONTH_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic'
];
const RANKS = [
  'Cadete Solar',
  'Piloto de Nexo',
  'Navegante Rift',
  'Capitan Nebular',
  'Arquitecta Quasar',
  'Mariscal Xenon',
  'Almirante del Vacio'
];

export function createDefaultState() {
  return {
    version: 2,
    daily: {},
    tasks: []
  };
}

export function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object') {
    return createDefaultState();
  }

  const safeDaily = {};
  const sourceDaily = raw.daily && typeof raw.daily === 'object' ? raw.daily : {};

  Object.entries(sourceDaily).forEach(([dateKey, entry]) => {
    const inheritedSbpd = Boolean(entry?.sbpdDone);
    const storedSectors =
      entry?.sbpdSectors && typeof entry.sbpdSectors === 'object' ? entry.sbpdSectors : {};

    safeDaily[dateKey] = {
      instagramCount: clampNumber(entry?.instagramCount, 0, 24, 0),
      sundayExtraDone: Boolean(entry?.sundayExtraDone),
      note: typeof entry?.note === 'string' ? entry.note : '',
      sbpdSectors: buildSectorState(
        SBPD_SECTORS.map((sector) => [
          sector.id,
          inheritedSbpd ? true : Boolean(storedSectors[sector.id])
        ])
      )
    };
  });

  const safeTasks = Array.isArray(raw.tasks)
    ? raw.tasks
        .map((task) => sanitizeTask(task))
        .filter(Boolean)
        .sort((left, right) => sortTaskComparator(left, right, new Date()))
    : [];

  return {
    version: 2,
    daily: safeDaily,
    tasks: safeTasks
  };
}

function sanitizeTask(task) {
  if (!task || typeof task !== 'object') {
    return null;
  }

  if (typeof task.title !== 'string' || !task.title.trim()) {
    return null;
  }

  const effort = EFFORTS.find((item) => item.id === task.effort)?.id || 'orbit';
  const dueAt = isValidDateInput(task.dueAt) ? task.dueAt : toLocalInputValue(getDefaultDueDate());
  const status = task.status === 'done' ? 'done' : 'open';

  return {
    id: typeof task.id === 'string' ? task.id : crypto.randomUUID(),
    title: task.title.trim(),
    notes: typeof task.notes === 'string' ? task.notes : '',
    dueAt,
    effort,
    points: clampNumber(task.points, 10, 300, getSuggestedPoints(effort, dueAt)),
    status,
    createdAt: isIso(task.createdAt) ? task.createdAt : new Date().toISOString(),
    completedAt: status === 'done' && isIso(task.completedAt) ? task.completedAt : null
  };
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    return sanitizeState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

export function saveState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function toDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function addDays(dateKey, amount) {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function isWeekday(dateKey) {
  const day = fromDateKey(dateKey).getDay();
  return day >= 1 && day <= 5;
}

export function isSunday(dateKey) {
  return fromDateKey(dateKey).getDay() === 0;
}

export function getDayShort(dateKey) {
  return DAY_SHORT[fromDateKey(dateKey).getDay()];
}

export function formatLongDate(dateKey) {
  const date = fromDateKey(dateKey);
  return `${DAY_FULL[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

export function formatChipDate(dateKey) {
  const date = fromDateKey(dateKey);
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

export function formatTime(value) {
  const date = new Date(value);
  const hours = date.getHours();
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const meridiem = hours >= 12 ? 'p. m.' : 'a. m.';
  const normalized = hours % 12 || 12;
  return `${normalized}:${minutes} ${meridiem}`;
}

export function toLocalInputValue(value = new Date()) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return toLocalInputValue(getDefaultDueDate());
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function getDefaultDueDate(now = new Date()) {
  const date = new Date(now);
  date.setMinutes(0, 0, 0);

  if (date.getHours() < 18) {
    date.setHours(Math.min(date.getHours() + 4, 22));
  } else {
    date.setDate(date.getDate() + 1);
    date.setHours(10);
  }

  return date;
}

export function getDailyEntry(state, dateKey) {
  const entry = state.daily[dateKey];

  if (!entry) {
    return {
      instagramCount: 0,
      sundayExtraDone: false,
      note: '',
      sbpdSectors: buildSectorState()
    };
  }

  return {
    instagramCount: clampNumber(entry.instagramCount, 0, 24, 0),
    sundayExtraDone: Boolean(entry.sundayExtraDone),
    note: typeof entry.note === 'string' ? entry.note : '',
    sbpdSectors: buildSectorState(Object.entries(entry.sbpdSectors || {}))
  };
}

export function getSbpdCompletedCount(entry) {
  return SBPD_SECTORS.filter((sector) => entry.sbpdSectors[sector.id]).length;
}

export function getSbpdXp(entry) {
  return SBPD_SECTORS.reduce((sum, sector) => {
    return sum + (entry.sbpdSectors[sector.id] ? sector.xp : 0);
  }, 0);
}

export function getInstagramXp(count) {
  if (count <= 0) {
    return 0;
  }

  if (count < INSTAGRAM_MINIMUM) {
    return count * 10;
  }

  if (count === INSTAGRAM_MINIMUM) {
    return 62;
  }

  if (count === INSTAGRAM_TARGET) {
    return 84;
  }

  return 84 + (count - INSTAGRAM_TARGET) * 4;
}

export function getRecurringXpForDate(state, dateKey) {
  const entry = getDailyEntry(state, dateKey);
  let xp = getInstagramXp(entry.instagramCount);

  if (isWeekday(dateKey)) {
    xp += getSbpdXp(entry);
  }

  if (isSunday(dateKey) && entry.sundayExtraDone) {
    xp += XP_VALUES.sundayExtra;
  }

  return xp;
}

export function isCoreComplete(state, dateKey) {
  const entry = getDailyEntry(state, dateKey);

  if (entry.instagramCount < INSTAGRAM_MINIMUM) {
    return false;
  }

  if (isWeekday(dateKey)) {
    return getSbpdCompletedCount(entry) === SBPD_SECTORS.length;
  }

  return true;
}

export function getRecurringMissions(state, dateKey) {
  const entry = getDailyEntry(state, dateKey);
  const missions = [];

  if (isWeekday(dateKey)) {
    const sbpdCount = getSbpdCompletedCount(entry);

    missions.push({
      id: 'sbpd',
      type: 'core',
      title: 'Cadena SBPD',
      lore: 'La mision de 9 a 2 se divide ahora en dos sectores largos de 2 horas y un cierre final.',
      status: sbpdCount === SBPD_SECTORS.length ? 'done' : sbpdCount > 0 ? 'partial' : 'open',
      xp: getSbpdXp(entry),
      maxXp: SBPD_SECTORS.reduce((sum, sector) => sum + sector.xp, 0),
      completed: sbpdCount,
      total: SBPD_SECTORS.length,
      sectors: SBPD_SECTORS.map((sector) => ({
        ...sector,
        done: Boolean(entry.sbpdSectors[sector.id])
      }))
    });
  }

  missions.push({
    id: 'instagram',
    type: 'core',
    title: 'Canal de transmision',
    lore: 'Necesitas 5 senales para salvar el dia y 6 para llevarlo a overdrive antes de medianoche.',
    status:
      entry.instagramCount >= INSTAGRAM_TARGET
        ? 'overdrive'
        : entry.instagramCount >= INSTAGRAM_MINIMUM
          ? 'done'
          : entry.instagramCount > 0
            ? 'partial'
            : 'open',
    xp: getInstagramXp(entry.instagramCount),
    maxXp: getInstagramXp(INSTAGRAM_TARGET),
    current: entry.instagramCount,
    target: INSTAGRAM_TARGET,
    minimum: INSTAGRAM_MINIMUM
  });

  if (isSunday(dateKey)) {
    missions.push({
      id: 'sunday-extra',
      type: 'bonus',
      title: 'Sunday Extra',
      lore: 'Empuje largo de 8:00 a. m. a 4:00 p. m. para limpiar una carga pesada del sistema.',
      status: entry.sundayExtraDone ? 'done' : 'open',
      xp: entry.sundayExtraDone ? XP_VALUES.sundayExtra : 0,
      maxXp: XP_VALUES.sundayExtra
    });
  }

  return missions;
}

export function getSuggestedPoints(effort, dueAt, now = new Date()) {
  const base = EFFORTS.find((item) => item.id === effort)?.basePoints || 50;
  const dueDate = new Date(dueAt);
  const delta = dueDate.getTime() - now.getTime();

  if (delta <= 0) {
    return base + 20;
  }

  if (delta <= 1000 * 60 * 60 * 8) {
    return base + 18;
  }

  if (delta <= 1000 * 60 * 60 * 24) {
    return base + 12;
  }

  if (delta <= 1000 * 60 * 60 * 72) {
    return base + 6;
  }

  return base;
}

export function createTask({ title, dueAt, effort, notes }, now = new Date()) {
  const cleanDueAt = isValidDateInput(dueAt) ? dueAt : toLocalInputValue(getDefaultDueDate(now));

  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    dueAt: cleanDueAt,
    effort: EFFORTS.find((item) => item.id === effort)?.id || 'orbit',
    notes: notes.trim(),
    points: getSuggestedPoints(effort, cleanDueAt, now),
    status: 'open',
    createdAt: now.toISOString(),
    completedAt: null
  };
}

export function getTaskDueState(task, now = new Date()) {
  if (task.status === 'done') {
    return 'done';
  }

  const dueTime = dateToMillis(task.dueAt);
  const diff = dueTime - now.getTime();

  if (diff < 0) {
    return 'overdue';
  }

  if (toDateKey(task.dueAt) === toDateKey(now)) {
    return 'today';
  }

  if (diff <= 1000 * 60 * 60 * 24 * 2) {
    return 'soon';
  }

  return 'later';
}

export function getRelativeDueCopy(task, now = new Date()) {
  const dueDate = new Date(task.dueAt);
  const diff = dueDate.getTime() - now.getTime();

  if (task.status === 'done' && task.completedAt) {
    return `Cobrada ${formatChipDate(toDateKey(task.completedAt))}`;
  }

  if (diff < 0) {
    return `Atrasada desde ${formatChipDate(toDateKey(task.dueAt))} a las ${formatTime(task.dueAt)}`;
  }

  if (toDateKey(task.dueAt) === toDateKey(now)) {
    return `Vence hoy a las ${formatTime(task.dueAt)}`;
  }

  if (toDateKey(task.dueAt) === addDays(toDateKey(now), 1)) {
    return `Vence manana a las ${formatTime(task.dueAt)}`;
  }

  return `Vence ${formatChipDate(toDateKey(task.dueAt))} a las ${formatTime(task.dueAt)}`;
}

export function sortTasks(tasks, now = new Date()) {
  return [...tasks].sort((left, right) => sortTaskComparator(left, right, now));
}

export function getOpenTaskBuckets(state, now = new Date()) {
  const openTasks = sortTasks(
    state.tasks.filter((task) => task.status === 'open'),
    now
  );

  return {
    overdue: openTasks.filter((task) => getTaskDueState(task, now) === 'overdue'),
    today: openTasks.filter((task) => getTaskDueState(task, now) === 'today'),
    soon: openTasks.filter((task) => getTaskDueState(task, now) === 'soon'),
    later: openTasks.filter((task) => getTaskDueState(task, now) === 'later')
  };
}

export function getCompletedTasks(state, limit = 8) {
  return [...state.tasks]
    .filter((task) => task.status === 'done')
    .sort((left, right) => dateToMillis(right.completedAt) - dateToMillis(left.completedAt))
    .slice(0, limit);
}

export function getDayTaskXp(state, dateKey) {
  return state.tasks
    .filter((task) => task.status === 'done' && task.completedAt && toDateKey(task.completedAt) === dateKey)
    .reduce((sum, task) => sum + task.points, 0);
}

export function getDayXp(state, dateKey) {
  return getRecurringXpForDate(state, dateKey) + getDayTaskXp(state, dateKey);
}

export function getDayBreakdown(state, dateKey, now = new Date()) {
  const entry = getDailyEntry(state, dateKey);
  const sbpdCompleted = getSbpdCompletedCount(entry);
  const recurringXp = getRecurringXpForDate(state, dateKey);
  const taskXp = getDayTaskXp(state, dateKey);
  const totalXp = recurringXp + taskXp;
  const tasksDone = state.tasks.filter(
    (task) => task.status === 'done' && task.completedAt && toDateKey(task.completedAt) === dateKey
  ).length;
  const dayPotential =
    (isWeekday(dateKey)
      ? SBPD_SECTORS.reduce((sum, sector) => sum + sector.xp, 0)
      : 0) +
    getInstagramXp(INSTAGRAM_TARGET) +
    (isSunday(dateKey) ? XP_VALUES.sundayExtra : 0);
  const reactorCharge = clamp(totalXp / Math.max(dayPotential + 90, 1), 0, 1);
  const grade = getDayGrade(dateKey, entry, taskXp, tasksDone);

  return {
    totalXp,
    recurringXp,
    taskXp,
    sbpdCompleted,
    sbpdTotal: SBPD_SECTORS.length,
    instagramCount: entry.instagramCount,
    tasksDone,
    reactorCharge,
    grade,
    coreComplete: isCoreComplete(state, dateKey)
  };
}

export function getProfile(state, now = new Date()) {
  const todayKey = toDateKey(now);
  const todayBreakdown = getDayBreakdown(state, todayKey, now);
  const buckets = getOpenTaskBuckets(state, now);
  const totalXp =
    Object.keys(state.daily).reduce((sum, dateKey) => sum + getRecurringXpForDate(state, dateKey), 0) +
    state.tasks.filter((task) => task.status === 'done').reduce((sum, task) => sum + task.points, 0);
  const level = getLevelFromXp(totalXp);
  const currentLevelFloor = getLevelFloor(level);
  const nextLevelFloor = getLevelFloor(level + 1);
  const threatScore = Math.min(
    buckets.overdue.length * 32 + buckets.today.length * 12 + buckets.soon.length * 6,
    100
  );

  return {
    totalXp,
    level,
    rank: getRankForLevel(level),
    currentLevelFloor,
    nextLevelFloor,
    currentStreak: getCurrentStreak(state, todayKey),
    projectedStreak: getProjectedStreak(state, todayKey),
    bestStreak: getBestStreak(state, todayKey),
    todayXp: todayBreakdown.totalXp,
    todayCoreComplete: todayBreakdown.coreComplete,
    todayGrade: todayBreakdown.grade.name,
    todayGradeLore: todayBreakdown.grade.lore,
    reactorCharge: todayBreakdown.reactorCharge,
    overdueCount: buckets.overdue.length,
    openCount: state.tasks.filter((task) => task.status === 'open').length,
    threatScore,
    threat: getThreatBand(threatScore),
    syncRate: getSyncRate(todayBreakdown),
    completedTodayCount: todayBreakdown.tasksDone
  };
}

export function getHeadlineCopy(state, now = new Date()) {
  const todayKey = toDateKey(now);
  const entry = getDailyEntry(state, todayKey);
  const overdueCount = state.tasks.filter((task) => getTaskDueState(task, now) === 'overdue').length;
  const nextSector = isWeekday(todayKey)
    ? SBPD_SECTORS.find((sector) => !entry.sbpdSectors[sector.id])
    : null;
  const missingPosts = Math.max(INSTAGRAM_MINIMUM - entry.instagramCount, 0);

  if (overdueCount > 0) {
    return `${overdueCount} amenazas abiertas estan drenando el casco.`;
  }

  if (nextSector) {
    return `${nextSector.title} espera activacion en la ventana ${nextSector.window}.`;
  }

  if (missingPosts > 0) {
    return `Faltan ${missingPosts} senales para estabilizar el canal de hoy.`;
  }

  return 'Todos los sistemas estan en verde. Buen momento para una quest Titan.';
}

export function getFocusDirective(state, now = new Date()) {
  const todayKey = toDateKey(now);
  const entry = getDailyEntry(state, todayKey);
  const buckets = getOpenTaskBuckets(state, now);
  const nextSector = isWeekday(todayKey)
    ? SBPD_SECTORS.find((sector) => !entry.sbpdSectors[sector.id])
    : null;
  const missingPosts = Math.max(INSTAGRAM_TARGET - entry.instagramCount, 0);

  if (buckets.overdue.length) {
    return {
      badge: 'Alerta roja',
      title: 'Baja la amenaza mas caliente',
      body: `Cierra primero "${buckets.overdue[0].title}" para liberar presion del radar.`
    };
  }

  if (nextSector) {
    return {
      badge: 'Ventana SBPD',
      title: nextSector.title,
      body: `${nextSector.window}. ${nextSector.lore}`
    };
  }

  if (missingPosts > 0) {
    return {
      badge: 'Canal social',
      title: `Lanza ${missingPosts} post${missingPosts > 1 ? 's' : ''} mas`,
      body: 'Cinco estabilizan el dia. Seis lo llevan a overdrive.'
    };
  }

  if (buckets.today.length) {
    return {
      badge: 'Ataque rapido',
      title: `Cobra "${buckets.today[0].title}"`,
      body: 'Quita ruido del tablero antes de que la noche apriete.'
    };
  }

  return {
    badge: 'Overdrive',
    title: 'Dia desbloqueado',
    body: 'El core esta casi limpio. Aprovecha para cerrar una Titan y subir de rango.'
  };
}

export function getTimelineDays(todayKey, radius = 3) {
  const days = [];

  for (let offset = -radius; offset <= radius; offset += 1) {
    const dateKey = addDays(todayKey, offset);
    days.push({
      dateKey,
      short: getDayShort(dateKey),
      chip: formatChipDate(dateKey),
      offset
    });
  }

  return days;
}

export function getCountdownToMidnight(now = new Date()) {
  const target = new Date(now);
  target.setHours(23, 59, 59, 999);
  const diff = Math.max(target.getTime() - now.getTime(), 0);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function buildSectorState(entries = []) {
  const state = {};

  SBPD_SECTORS.forEach((sector) => {
    state[sector.id] = false;
  });

  entries.forEach(([key, value]) => {
    if (key in state) {
      state[key] = Boolean(value);
    }
  });

  return state;
}

function getDayGrade(dateKey, entry, taskXp, tasksDone) {
  const sbpdRatio = isWeekday(dateKey) ? getSbpdCompletedCount(entry) / SBPD_SECTORS.length : 1;
  const postRatio = Math.min(entry.instagramCount / INSTAGRAM_TARGET, 1);
  const score = sbpdRatio * 50 + postRatio * 30 + Math.min(taskXp / 120, 1) * 20 + tasksDone * 2;

  if (score >= 96) {
    return {
      name: 'Singularity',
      lore: 'Todo el dia esta alineado y sin fuga de energia.',
      tone: 'legend'
    };
  }

  if (score >= 75) {
    return {
      name: 'Hyperlane',
      lore: 'La nave ya entra en velocidad alta y el dia responde.',
      tone: 'good'
    };
  }

  if (score >= 45) {
    return {
      name: 'Ignition',
      lore: 'Hay movimiento real. Sigue empujando antes del cierre.',
      tone: 'warm'
    };
  }

  return {
    name: 'Dormant',
    lore: 'El sistema aun no despega. Hace falta activar foco.',
    tone: 'cold'
  };
}

function getThreatBand(score) {
  if (score >= 76) {
    return {
      label: 'Breach',
      tone: 'breach'
    };
  }

  if (score >= 46) {
    return {
      label: 'Heat',
      tone: 'heat'
    };
  }

  if (score >= 18) {
    return {
      label: 'Watch',
      tone: 'watch'
    };
  }

  return {
    label: 'Stable',
    tone: 'stable'
  };
}

function getSyncRate(todayBreakdown) {
  const base = todayBreakdown.coreComplete ? 1 : 0.65;
  return clamp(base * todayBreakdown.reactorCharge + (todayBreakdown.tasksDone ? 0.15 : 0), 0, 1);
}

function getRankForLevel(level) {
  if (level <= 2) {
    return RANKS[0];
  }

  if (level <= 4) {
    return RANKS[1];
  }

  if (level <= 6) {
    return RANKS[2];
  }

  if (level <= 8) {
    return RANKS[3];
  }

  if (level <= 10) {
    return RANKS[4];
  }

  if (level <= 13) {
    return RANKS[5];
  }

  return RANKS[6];
}

function getLevelFloor(level) {
  if (level <= 1) {
    return 0;
  }

  return ((level - 1) * level * 120) / 2;
}

function getLevelFromXp(totalXp) {
  let level = 1;
  while (totalXp >= getLevelFloor(level + 1)) {
    level += 1;
  }
  return level;
}

function getCurrentStreak(state, todayKey) {
  if (isCoreComplete(state, todayKey)) {
    return countBackwards(state, todayKey);
  }

  return countBackwards(state, addDays(todayKey, -1));
}

function getProjectedStreak(state, todayKey) {
  if (isCoreComplete(state, todayKey)) {
    return countBackwards(state, todayKey);
  }

  return countBackwards(state, addDays(todayKey, -1)) + 1;
}

function getBestStreak(state, todayKey) {
  const dailyKeys = Object.keys(state.daily).sort();
  if (!dailyKeys.length) {
    return 0;
  }

  const firstKey = dailyKeys[0];
  let cursor = firstKey;
  let current = 0;
  let best = 0;

  while (cursor <= todayKey) {
    if (isCoreComplete(state, cursor)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }

    cursor = addDays(cursor, 1);
  }

  return best;
}

function countBackwards(state, startKey) {
  let streak = 0;
  let cursor = startKey;

  while (isCoreComplete(state, cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function sortTaskComparator(left, right, now) {
  const leftState = getTaskDueState(left, now);
  const rightState = getTaskDueState(right, now);
  const rank = {
    overdue: 0,
    today: 1,
    soon: 2,
    later: 3,
    done: 4
  };

  if (rank[leftState] !== rank[rightState]) {
    return rank[leftState] - rank[rightState];
  }

  if (left.status === 'done' && right.status === 'done') {
    return dateToMillis(right.completedAt) - dateToMillis(left.completedAt);
  }

  return dateToMillis(left.dueAt) - dateToMillis(right.dueAt);
}

function clampNumber(value, min, max, fallback) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isIso(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function isValidDateInput(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function dateToMillis(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
