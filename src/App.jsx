import { useEffect, useState } from 'react';
import {
  EFFORTS,
  INSTAGRAM_MINIMUM,
  INSTAGRAM_TARGET,
  createTask,
  formatChipDate,
  formatLongDate,
  getCompletedTasks,
  getCountdownToMidnight,
  getDailyEntry,
  getDayBreakdown,
  getDefaultDueDate,
  getFocusDirective,
  getHeadlineCopy,
  getOpenTaskBuckets,
  getProfile,
  getRecurringMissions,
  getRelativeDueCopy,
  getSuggestedPoints,
  getTaskDueState,
  getTimelineDays,
  isCoreComplete,
  isSunday,
  isWeekday,
  loadState,
  saveState,
  sortTasks,
  toDateKey,
  toLocalInputValue
} from './game.js';

const MAX_POSTS_VISIBLE = 8;

export default function App() {
  const [state, setState] = useState(() => loadState());
  const [now, setNow] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [isStandalone, setIsStandalone] = useState(() => detectStandalone());
  const [formError, setFormError] = useState('');
  const [taskForm, setTaskForm] = useState(() => ({
    title: '',
    dueAt: toLocalInputValue(getDefaultDueDate()),
    effort: 'orbit',
    notes: ''
  }));

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const sync = () => setIsStandalone(detectStandalone());

    sync();
    media.addEventListener?.('change', sync);

    return () => media.removeEventListener?.('change', sync);
  }, []);

  const todayKey = toDateKey(now);
  const profile = getProfile(state, now);
  const directive = getFocusDirective(state, now);
  const headline = getHeadlineCopy(state, now);
  const openBuckets = getOpenTaskBuckets(state, now);
  const completedTasks = getCompletedTasks(state);
  const orbitDays = getTimelineDays(todayKey, 3);
  const selectedEntry = getDailyEntry(state, selectedDateKey);
  const selectedBreakdown = getDayBreakdown(state, selectedDateKey, now);
  const selectedMissions = getRecurringMissions(state, selectedDateKey);
  const sbpdMission = selectedMissions.find((mission) => mission.id === 'sbpd');
  const instagramMission = selectedMissions.find((mission) => mission.id === 'instagram');
  const sundayMission = selectedMissions.find((mission) => mission.id === 'sunday-extra');
  const pointsPreview = getSuggestedPoints(taskForm.effort, taskForm.dueAt, now);
  const levelProgress =
    (profile.totalXp - profile.currentLevelFloor) /
    Math.max(profile.nextLevelFloor - profile.currentLevelFloor, 1);
  const syncPercent = Math.round(profile.syncRate * 100);
  const reactorPercent = Math.round(profile.reactorCharge * 100);

  function patchDaily(dateKey, partial) {
    setState((current) => {
      const base = getDailyEntry(current, dateKey);
      return {
        ...current,
        daily: {
          ...current.daily,
          [dateKey]: {
            ...base,
            ...partial
          }
        }
      };
    });
  }

  function toggleSector(dateKey, sectorId) {
    const entry = getDailyEntry(state, dateKey);
    patchDaily(dateKey, {
      sbpdSectors: {
        ...entry.sbpdSectors,
        [sectorId]: !entry.sbpdSectors[sectorId]
      }
    });
  }

  function toggleSundayExtra(dateKey) {
    const entry = getDailyEntry(state, dateKey);
    patchDaily(dateKey, { sundayExtraDone: !entry.sundayExtraDone });
  }

  function adjustInstagram(dateKey, delta) {
    const entry = getDailyEntry(state, dateKey);
    patchDaily(dateKey, {
      instagramCount: Math.min(Math.max(entry.instagramCount + delta, 0), 20)
    });
  }

  function handleAddTask(event) {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      setFormError('Ponle nombre a la side quest.');
      return;
    }

    const task = createTask(taskForm, now);

    setState((current) => ({
      ...current,
      tasks: sortTasks([...current.tasks, task], now)
    }));

    setTaskForm({
      title: '',
      dueAt: toLocalInputValue(getDefaultDueDate(now)),
      effort: 'orbit',
      notes: ''
    });
    setFormError('');
  }

  function toggleTask(taskId) {
    setState((current) => {
      const stamp = new Date();
      const nextTasks = current.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        if (task.status === 'done') {
          return {
            ...task,
            status: 'open',
            completedAt: null
          };
        }

        return {
          ...task,
          status: 'done',
          completedAt: stamp.toISOString()
        };
      });

      return {
        ...current,
        tasks: sortTasks(nextTasks, stamp)
      };
    });
  }

  function deleteTask(taskId) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId)
    }));
  }

  return (
    <div className="app-shell">
      <main className="hud-board">
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">Deep Space Command / Sector Tau Ceti</span>
            <h1>Gameday</h1>
            <p className="hero-tagline">
              Un tablero de mando para convertir deadlines y procrastinacion en avance visible,
              racha y sensacion de conquista.
            </p>
            <p className="hero-status">{headline}</p>
          </div>

          <div className="directive-card">
            <span className="directive-badge">{directive.badge}</span>
            <h2>{directive.title}</h2>
            <p>{directive.body}</p>
          </div>

          <div className="hero-metrics">
            <MetricCard label="Nivel" value={profile.level} sub={profile.rank} tone="cyan" />
            <MetricCard
              label="Amenaza"
              value={`${profile.threatScore}%`}
              sub={profile.threat.label}
              tone={profile.threat.tone}
            />
            <MetricCard label="Racha" value={profile.currentStreak} sub={getStreakCopy(profile)} tone="violet" />
            <MetricCard label="Hoy" value={profile.todayXp} sub={profile.todayGrade} tone="amber" />
          </div>

          <div className="meter-grid">
            <HudMeter
              label="Sync rate"
              value={syncPercent}
              caption={`${syncPercent}% de coherencia diaria`}
              tone="cyan"
            />
            <HudMeter
              label="Reactor"
              value={reactorPercent}
              caption={`${reactorPercent}% de carga en el dia`}
              tone="violet"
            />
            <HudMeter
              label="Warp XP"
              value={Math.round(levelProgress * 100)}
              caption={`${Math.max(profile.nextLevelFloor - profile.totalXp, 0)} XP al siguiente nivel`}
              tone="amber"
            />
          </div>
        </section>

        <section className="panel panel-dark">
          <div className="section-head">
            <div>
              <span className="eyebrow">Star map</span>
              <h2>Orbita semanal</h2>
            </div>
            <p className="section-note">{getCountdownToMidnight(now)} hasta que cierre el portal diario.</p>
          </div>

          <div className="orbit-strip">
            {orbitDays.map((day) => {
              const dayBreakdown = getDayBreakdown(state, day.dateKey, now);
              const isSelected = day.dateKey === selectedDateKey;
              const isToday = day.dateKey === todayKey;

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  className={`orbit-chip is-${dayBreakdown.grade.tone}${isSelected ? ' is-selected' : ''}${
                    dayBreakdown.coreComplete ? ' is-complete' : ''
                  }`}
                  onClick={() => setSelectedDateKey(day.dateKey)}
                >
                  <span className="orbit-chip-top">
                    <span>{day.short}</span>
                    <small>{isToday ? 'Hoy' : day.offset > 0 ? `+${day.offset}` : `${day.offset}`}</small>
                  </span>
                  <strong>{formatChipDate(day.dateKey)}</strong>
                  <span className="orbit-chip-bottom">{dayBreakdown.grade.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="layout-grid">
          <div className="main-column">
            <section className="panel mission-panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Mission deck</span>
                  <h2>{formatLongDate(selectedDateKey)}</h2>
                </div>
                <StatusPill
                  label={selectedBreakdown.grade.name}
                  detail={selectedBreakdown.grade.lore}
                  tone={selectedBreakdown.grade.tone}
                />
              </div>

              <div className="overview-grid">
                <OverviewCard label="XP del dia" value={selectedBreakdown.totalXp} />
                <OverviewCard
                  label="SBPD"
                  value={
                    isWeekday(selectedDateKey)
                      ? `${selectedBreakdown.sbpdCompleted}/${selectedBreakdown.sbpdTotal}`
                      : 'free'
                  }
                />
                <OverviewCard
                  label="Posts"
                  value={`${selectedEntry.instagramCount}/${INSTAGRAM_TARGET}`}
                />
                <OverviewCard label="Quests" value={`${selectedBreakdown.tasksDone}`} />
              </div>

              {sbpdMission ? (
                <article className="mission-card mission-card-sbpd">
                  <div className="mission-head">
                    <div>
                      <span className="mission-type">Cadena SBPD</span>
                      <h3>{sbpdMission.title}</h3>
                      <p>{sbpdMission.lore}</p>
                    </div>
                    <div className="mission-summary">
                      <strong>
                        {sbpdMission.completed}/{sbpdMission.total}
                      </strong>
                      <span>{sbpdMission.xp} XP</span>
                    </div>
                  </div>

                  <div className="sector-grid">
                    {sbpdMission.sectors.map((sector) => (
                      <button
                        key={sector.id}
                        type="button"
                        className={`sector-card${sector.done ? ' is-done' : ''}`}
                        onClick={() => toggleSector(selectedDateKey, sector.id)}
                      >
                        <span className="sector-window">{sector.window}</span>
                        <strong>{sector.title}</strong>
                        <p>{sector.lore}</p>
                        <span className="sector-xp">+{sector.xp} XP</span>
                      </button>
                    ))}
                  </div>
                </article>
              ) : (
                <article className="mission-card weekend-card">
                  <span className="mission-type">Weekend protocol</span>
                  <h3>Sin cadena SBPD obligatoria</h3>
                  <p>En este planeta no corre el turno fijo de SBPD. El canal social sigue activo.</p>
                </article>
              )}

              {instagramMission ? (
                <article className={`mission-card mission-card-instagram is-${instagramMission.status}`}>
                  <div className="mission-head">
                    <div>
                      <span className="mission-type">Signal grid</span>
                      <h3>{instagramMission.title}</h3>
                      <p>{instagramMission.lore}</p>
                    </div>
                    <div className="mission-summary">
                      <strong>{selectedEntry.instagramCount}</strong>
                      <span>{instagramMission.xp} XP</span>
                    </div>
                  </div>

                  <div className="signal-controls">
                    <button type="button" className="control-button" onClick={() => adjustInstagram(selectedDateKey, -1)}>
                      -
                    </button>
                    <div className="signal-value">
                      <strong>{selectedEntry.instagramCount}</strong>
                      <span>senales lanzadas</span>
                    </div>
                    <button type="button" className="control-button" onClick={() => adjustInstagram(selectedDateKey, 1)}>
                      +
                    </button>
                  </div>

                  <div className="signal-track">
                    <div
                      className="signal-fill"
                      style={{
                        width: `${Math.min((selectedEntry.instagramCount / MAX_POSTS_VISIBLE) * 100, 100)}%`
                      }}
                    />
                  </div>

                  <div className="signal-legend">
                    <span>{INSTAGRAM_MINIMUM} estabiliza el dia</span>
                    <span>{INSTAGRAM_TARGET} activa overdrive</span>
                  </div>
                </article>
              ) : null}

              {sundayMission ? (
                <article className={`mission-card mission-card-bonus${selectedEntry.sundayExtraDone ? ' is-done' : ''}`}>
                  <div className="mission-head">
                    <div>
                      <span className="mission-type">Bonus lane</span>
                      <h3>{sundayMission.title}</h3>
                      <p>{sundayMission.lore}</p>
                    </div>
                    <div className="mission-summary">
                      <strong>{selectedEntry.sundayExtraDone ? 'on' : 'off'}</strong>
                      <span>+{sundayMission.maxXp} XP</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="action-button"
                    onClick={() => toggleSundayExtra(selectedDateKey)}
                  >
                    {selectedEntry.sundayExtraDone ? 'Desmarcar Sunday Extra' : 'Marcar Sunday Extra'}
                  </button>
                </article>
              ) : null}
            </section>

            <section className="panel panel-dark">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Threat map</span>
                  <h2>Deadlines activos</h2>
                </div>
                <p className="section-note">Prioriza por colision, no por intuicion.</p>
              </div>

              <div className="bucket-grid">
                <TaskBucket
                  title="Atrasadas"
                  tone="breach"
                  tasks={openBuckets.overdue}
                  emptyCopy="Sin colisiones vencidas."
                  now={now}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
                <TaskBucket
                  title="Hoy"
                  tone="amber"
                  tasks={openBuckets.today}
                  emptyCopy="La ventana de hoy esta limpia."
                  now={now}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
                <TaskBucket
                  title="Proximas"
                  tone="cyan"
                  tasks={openBuckets.soon}
                  emptyCopy="No hay impactos cercanos."
                  now={now}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
                <TaskBucket
                  title="Lejanas"
                  tone="violet"
                  tasks={openBuckets.later}
                  emptyCopy="Aun no cargaste quests de largo rango."
                  now={now}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
              </div>
            </section>

            <section className="panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Hangar</span>
                  <h2>Misiones cobradas</h2>
                </div>
                <p className="section-note">
                  Tu evidencia visual de que si estas moviendo la nave.
                </p>
              </div>

              {completedTasks.length ? (
                <div className="completed-list">
                  {completedTasks.map((task) => (
                    <article key={task.id} className="task-card is-done">
                      <div className="task-copy">
                        <div className="task-title-row">
                          <h3>{task.title}</h3>
                          <span className="task-points">+{task.points}</span>
                        </div>
                        <p>{getRelativeDueCopy(task, now)}</p>
                        {task.notes ? <small>{task.notes}</small> : null}
                      </div>
                      <div className="task-actions">
                        <button type="button" className="ghost-button" onClick={() => toggleTask(task.id)}>
                          Reabrir
                        </button>
                        <button type="button" className="ghost-button danger" onClick={() => deleteTask(task.id)}>
                          Borrar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-card">
                  <h3>Hangar vacio</h3>
                  <p>Cierra una side quest y el sistema empezara a verse vivo.</p>
                </div>
              )}
            </section>
          </div>

          <aside className="side-column">
            {!isStandalone && (
              <section className="panel install-panel">
                <span className="eyebrow">iPhone mode</span>
                <h2>Instalala como nave real</h2>
                <p>Abrela en Safari, toca Share y luego Add to Home Screen.</p>
                <div className="install-steps">
                  <span>1. Safari</span>
                  <span>2. Share</span>
                  <span>3. Add to Home Screen</span>
                </div>
              </section>
            )}

            <section className="panel side-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">System intel</span>
                  <h2>Estado del dia</h2>
                </div>
              </div>

              <div className="intel-grid">
                <IntelCard label="Rank" value={profile.rank} tone="cyan" />
                <IntelCard label="Threat" value={profile.threat.label} tone={profile.threat.tone} />
                <IntelCard label="Grade" value={profile.todayGrade} tone="violet" />
                <IntelCard label="Cleared" value={`${profile.completedTodayCount}`} tone="amber" />
              </div>

              <div className="system-lines">
                <SystemLine label="Core del dia" value={profile.todayCoreComplete ? 'asegurado' : 'abierto'} />
                <SystemLine label="Posts hoy" value={`${getDailyEntry(state, todayKey).instagramCount}/${INSTAGRAM_TARGET}`} />
                <SystemLine label="Open quests" value={`${profile.openCount}`} />
                <SystemLine label="Racha potencial" value={`${profile.projectedStreak}`} />
              </div>
            </section>

            <section className="panel side-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Quick forge</span>
                  <h2>Nueva side quest</h2>
                </div>
              </div>

              <form className="task-form" onSubmit={handleAddTask}>
                <label>
                  Titulo
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(event) => {
                      setTaskForm((current) => ({ ...current, title: event.target.value }));
                      setFormError('');
                    }}
                    placeholder="Ej. editar carrusel o responder clientes"
                  />
                </label>

                <label>
                  Deadline
                  <input
                    type="datetime-local"
                    value={taskForm.dueAt}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, dueAt: event.target.value }))
                    }
                  />
                </label>

                <div>
                  <span className="input-label">Tamano</span>
                  <div className="effort-row">
                    {EFFORTS.map((effort) => (
                      <button
                        key={effort.id}
                        type="button"
                        className={`effort-chip${taskForm.effort === effort.id ? ' is-selected' : ''}`}
                        onClick={() => setTaskForm((current) => ({ ...current, effort: effort.id }))}
                      >
                        <strong>{effort.label}</strong>
                        <span>{effort.basePoints} base</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label>
                  Nota opcional
                  <textarea
                    rows="3"
                    value={taskForm.notes}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder="Que define que esta side quest queda cerrada"
                  />
                </label>

                <div className="forge-footer">
                  <div>
                    <span className="stat-label">Bounty sugerida</span>
                    <strong>{pointsPreview} XP</strong>
                  </div>
                  <button type="submit" className="action-button">
                    Crear quest
                  </button>
                </div>

                {formError ? <p className="form-error">{formError}</p> : null}
              </form>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, sub, tone }) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function HudMeter({ label, value, caption, tone }) {
  return (
    <div className={`meter-card tone-${tone}`}>
      <div className="meter-head">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${Math.max(value, 6)}%` }} />
      </div>
      <small>{caption}</small>
    </div>
  );
}

function OverviewCard({ label, value }) {
  return (
    <div className="overview-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ label, detail, tone }) {
  return (
    <div className={`status-pill tone-${tone}`}>
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
  );
}

function IntelCard({ label, value, tone }) {
  return (
    <div className={`intel-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SystemLine({ label, value }) {
  return (
    <div className="system-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TaskBucket({ title, tone, tasks, emptyCopy, now, onToggle, onDelete }) {
  return (
    <section className={`bucket-card tone-${tone}`}>
      <div className="bucket-head">
        <h3>{title}</h3>
        <span>{tasks.length}</span>
      </div>

      {tasks.length ? (
        <div className="bucket-stack">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} now={now} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <div className="empty-card compact">
          <p>{emptyCopy}</p>
        </div>
      )}
    </section>
  );
}

function TaskCard({ task, now, onToggle, onDelete }) {
  const dueState = getTaskDueState(task, now);

  return (
    <article className={`task-card state-${dueState}`}>
      <div className="task-copy">
        <div className="task-title-row">
          <h3>{task.title}</h3>
          <span className="task-points">+{task.points}</span>
        </div>
        <p>{getRelativeDueCopy(task, now)}</p>
        {task.notes ? <small>{task.notes}</small> : null}
      </div>

      <div className="task-actions">
        <button type="button" className="action-button" onClick={() => onToggle(task.id)}>
          Hecha
        </button>
        <button type="button" className="ghost-button danger" onClick={() => onDelete(task.id)}>
          Borrar
        </button>
      </div>
    </article>
  );
}

function getStreakCopy(profile) {
  if (profile.todayCoreComplete) {
    return 'hoy ya cuenta';
  }

  if (profile.currentStreak > 0) {
    return `si cierras hoy sube a ${profile.projectedStreak}`;
  }

  return 'lista para reiniciar';
}

function detectStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(window.navigator.standalone);
}
