export const STORAGE_KEY = 'gameday-state-v1';
export const INSTAGRAM_MINIMUM = 5;
export const INSTAGRAM_TARGET = 6;
export const XP_VALUES = {
  sbpd: 140,
  sundayExtra: 180
};

export const EFFORTS = [
  {
    id: 'scout',
    label: 'Scout',
    description: 'rapida',
    basePoints: 25
  },
  {
    id: 'orbit',
    label: 'Orbit',
    description: 'normal',
    basePoints: 50
  },
  {
    id: 'boss',
    label: 'Boss',
    description: 'pesada',
    basePoints: 90
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

export function createDefaultState() {
  return {
    version: 1,
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
    safeDaily[dateKey] = {
      instagramCount: clampNumber(entry?.instagramCount, 0, 24, 0),
      sbpdDone: Boolean(entry?.sbpdDone),
      sundayExtraDone: Boolean(entry?.sundayExtraDone),
      note: typeof entry?.note === 'string' ? entry.note : ''
    };
  });

  const safeTasks = Array.isArray(raw.tasks)
    ? raw.tasks
        .map((task) => sanitizeTask(task))
        .filter(Boolean)
        .sort((a, b) => {
          if (a.status === 'done' && b.status !== 'done') {
            return 1;
          }
          if (a.status !== 'done' && b.status === 'done') {
            return -1;
          }
          return dateToMillis(a.dueAt) - dateToMillis(b.dueAt);
        })
    : [];

  return {
    version: 1,
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

function clampNumber(value, min, max, fallback) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, min), max);
}

function isIso(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
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
  return state.daily[dateKey] || {
    instagramCount: 0,
    sbpdDone: false,
    sundayExtraDone: false,
    note: ''
  };
}

export function getInstagramXp(count) {
  if (count <= 0) {
    return 0;
  }

  if (count < INSTAGRAM_MINIMUM) {
    return count * 10;
  }

  if (count === INSTAGRAM_MINIMUM) {
    return 60;
  }

  if (count === INSTAGRAM_TARGET) {
    return 80;
  }

  return 80 + (count - INSTAGRAM_TARGET) * 4;
}

export function getRecurringXpForDate(state, dateKey) {
  const entry = getDailyEntry(state, dateKey);
  let xp = getInstagramXp(entry.instagramCount);

  if (isWeekday(dateKey) && entry.sbpdDone) {
    xp += XP_VALUES.sbpd;
  }

  if (isSunday(dateKey) && entry.sundayExtraDone) {
    xp += XP_VALUES.sundayExtra;
  }

  return xp;
}

export function isCoreComplete(state, dateKey) {
  const entry = getDailyEntry(state, dateKey);
  const instagramReady = entry.instagramCount >= INSTAGRAM_MINIMUM;

  if (!instagramReady) {
    return false;
  }

  if (isWeekday(dateKey)) {
    return entry.sbpdDone;
  }

  return true;
}

export function getRecurringMissions(state, dateKey) {
  const entry = getDailyEntry(state, dateKey);
  const missions = [];

  if (isWeekday(dateKey)) {
    missions.push({
      id: 'sbpd',
      type: 'core',
      title: 'Bloque SBPD',
      lore: 'Turno de mando de 9:00 a. m. a 2:00 p. m. para trabajo profundo.',
      status: entry.sbpdDone ? 'done' : 'open',
      xp: XP_VALUES.sbpd,
      detail: 'Lunes a viernes'
    });
  }

  missions.push({
    id: 'instagram',
    type: 'core',
    title: 'Canal de transmision',
    lore: 'Publica 6 posts. Con 5 ya salvas la orbita del dia antes de medianoche.',
    status: entry.instagramCount >= INSTAGRAM_MINIMUM ? 'done' : 'open',
    xp: getInstagramXp(entry.instagramCount),
    maxXp: getInstagramXp(INSTAGRAM_TARGET),
    current: entry.instagramCount,
    target: INSTAGRAM_TARGET,
    minimum: INSTAGRAM_MINIMUM,
    detail: 'Todos los dias'
  });

  if (isSunday(dateKey)) {
    missions.push({
      id: 'sunday-extra',
      type: 'bonus',
      title: 'Sunday Extra',
      lore: 'Ventana de empuje largo de 8:00 a. m. a 4:00 p. m. para cerrar pendiente pesado.',
      status: entry.sundayExtraDone ? 'done' : 'open',
      xp: XP_VALUES.sundayExtra,
      detail: 'Domingo opcional'
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

  if (delta <= 1000 * 60 * 60 * 12) {
    return base + 16;
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
    return `Cobrado ${formatLongDate(toDateKey(task.completedAt))}`;
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
  return [...tasks].sort((left, right) => {
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
  });
}

export function getDayXp(state, dateKey) {
  const recurringXp = getRecurringXpForDate(state, dateKey);
  const taskXp = state.tasks
    .filter((task) => task.status === 'done' && task.completedAt && toDateKey(task.completedAt) === dateKey)
    .reduce((sum, task) => sum + task.points, 0);

  return recurringXp + taskXp;
}

export function getProfile(state, now = new Date()) {
  const todayKey = toDateKey(now);
  const totalXp =
    Object.keys(state.daily).reduce((sum, dateKey) => sum + getRecurringXpForDate(state, dateKey), 0) +
    state.tasks.filter((task) => task.status === 'done').reduce((sum, task) => sum + task.points, 0);

  const level = getLevelFromXp(totalXp);
  const currentLevelFloor = getLevelFloor(level);
  const nextLevelFloor = getLevelFloor(level + 1);

  return {
    totalXp,
    level,
    currentLevelFloor,
    nextLevelFloor,
    currentStreak: getCurrentStreak(state, todayKey),
    projectedStreak: getProjectedStreak(state, todayKey),
    bestStreak: getBestStreak(state, todayKey),
    todayXp: getDayXp(state, todayKey),
    todayCoreComplete: isCoreComplete(state, todayKey),
    overdueCount: state.tasks.filter((task) => getTaskDueState(task, now) === 'overdue').length,
    openCount: state.tasks.filter((task) => task.status === 'open').length
  };
}

function getLevelFloor(level) {
  if (level <= 1) {
    return 0;
  }

  return ((level - 1) * level * 100) / 2;
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

export function getHeadlineCopy(state, now = new Date()) {
  const todayKey = toDateKey(now);
  const entry = getDailyEntry(state, todayKey);
  const remainingPosts = Math.max(INSTAGRAM_MINIMUM - entry.instagramCount, 0);
  const overdueCount = state.tasks.filter((task) => getTaskDueState(task, now) === 'overdue').length;

  if (!entry.sbpdDone && isWeekday(todayKey)) {
    return 'Aun falta activar el bloque SBPD de hoy.';
  }

  if (remainingPosts > 0) {
    return `Te faltan ${remainingPosts} posts para cerrar la transmision minima.`;
  }

  if (overdueCount > 0) {
    return `Hay ${overdueCount} side quest atrasada pidiendo combustible.`;
  }

  return 'Orbita estable. Sigue cobrando puntos antes de que cierre el dia.';
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

export function getCompletedTasks(state, limit = 6) {
  return [...state.tasks]
    .filter((task) => task.status === 'done')
    .sort((left, right) => dateToMillis(right.completedAt) - dateToMillis(left.completedAt))
    .slice(0, limit);
}

function isValidDateInput(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function dateToMillis(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
