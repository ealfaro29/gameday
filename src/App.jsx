import { useEffect, useState } from 'react';
import {
  EFFORTS,
  INSTAGRAM_MINIMUM,
  INSTAGRAM_TARGET,
  addDays,
  createTask,
  formatChipDate,
  formatLongDate,
  formatTime,
  getCompletedTasks,
  getCountdownToMidnight,
  getDailyEntry,
  getDayXp,
  getDefaultDueDate,
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
  const dayEntry = getDailyEntry(state, selectedDateKey);
  const missions = getRecurringMissions(state, selectedDateKey);
  const orbitDays = getTimelineDays(todayKey, 3);
  const openBuckets = getOpenTaskBuckets(state, now);
  const completedTasks = getCompletedTasks(state);
  const selectedDayXp = getDayXp(state, selectedDateKey);
  const levelProgress =
    (profile.totalXp - profile.currentLevelFloor) /
    Math.max(profile.nextLevelFloor - profile.currentLevelFloor, 1);
  const selectedCoreComplete = isCoreComplete(state, selectedDateKey);
  const pointsPreview = getSuggestedPoints(taskForm.effort, taskForm.dueAt, now);
  const streakCopy = getStreakCopy(profile);
  const heroCopy = getHeadlineCopy(state, now);

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

  function toggleSbpd(dateKey) {
    const entry = getDailyEntry(state, dateKey);
    patchDaily(dateKey, { sbpdDone: !entry.sbpdDone });
  }

  function toggleSundayExtra(dateKey) {
    const entry = getDailyEntry(state, dateKey);
    patchDaily(dateKey, { sundayExtraDone: !entry.sundayExtraDone });
  }

  function adjustInstagram(dateKey, delta) {
    const entry = getDailyEntry(state, dateKey);
    const nextCount = Math.min(Math.max(entry.instagramCount + delta, 0), 20);
    patchDaily(dateKey, { instagramCount: nextCount });
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
          completedAt: new Date().toISOString()
        };
      });

      return {
        ...current,
        tasks: sortTasks(nextTasks, now)
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
      <main className="command-deck">
        <section className="hero-card">
          <div className="hero-decoration hero-decoration-left" />
          <div className="hero-decoration hero-decoration-right" />
          <div className="hero-copy">
            <span className="eyebrow">Sector Tau Ceti / Bitacora diaria</span>
            <h1>Gameday</h1>
            <p className="hero-tagline">
              Convierte deadlines, posts y bloques de trabajo en una expedicion por galaxias
              lejanas.
            </p>
            <p className="hero-status">{heroCopy}</p>
          </div>

          <div className="hero-stats">
            <div className="stat-card accent-fire">
              <span className="stat-label">Nivel</span>
              <strong>{profile.level}</strong>
              <span className="stat-foot">Rango del capitan</span>
            </div>
            <div className="stat-card accent-aurora">
              <span className="stat-label">XP total</span>
              <strong>{profile.totalXp}</strong>
              <span className="stat-foot">Combustible acumulado</span>
            </div>
            <div className="stat-card accent-ice">
              <span className="stat-label">Racha</span>
              <strong>{profile.currentStreak}</strong>
              <span className="stat-foot">{streakCopy}</span>
            </div>
            <div className="stat-card accent-dusk">
              <span className="stat-label">Hoy</span>
              <strong>{profile.todayXp}</strong>
              <span className="stat-foot">{getCountdownToMidnight(now)} hasta cierre</span>
            </div>
          </div>

          <div className="level-meter">
            <div className="level-meter-copy">
              <span>Motor warp al siguiente nivel</span>
              <strong>
                {profile.nextLevelFloor - profile.totalXp > 0
                  ? `${profile.nextLevelFloor - profile.totalXp} XP restantes`
                  : 'Nivel asegurado'}
              </strong>
            </div>
            <div className="level-track">
              <div className="level-fill" style={{ width: `${Math.max(levelProgress * 100, 6)}%` }} />
            </div>
          </div>
        </section>

        {!isStandalone && (
          <section className="install-card">
            <div>
              <span className="eyebrow">Modo nave en iPhone</span>
              <h2>Instalala desde Safari</h2>
              <p>
                Abre esta app en Safari, toca Share y luego Add to Home Screen para que se vea
                como app completa.
              </p>
            </div>
            <div className="install-steps">
              <span>1. Safari</span>
              <span>2. Share</span>
              <span>3. Add to Home Screen</span>
            </div>
          </section>
        )}

        <section className="panel-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Orbita</span>
              <h2>Selecciona tu planeta del dia</h2>
            </div>
            <p className="section-note">Marca hoy, corrige ayer o planifica el siguiente salto.</p>
          </div>

          <div className="orbit-strip">
            {orbitDays.map((day) => {
              const complete = isCoreComplete(state, day.dateKey);
              const isToday = day.dateKey === todayKey;
              const isSelected = day.dateKey === selectedDateKey;

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  className={`orbit-chip${isSelected ? ' is-selected' : ''}${complete ? ' is-complete' : ''}`}
                  onClick={() => setSelectedDateKey(day.dateKey)}
                >
                  <span className="orbit-chip-top">
                    <span>{day.short}</span>
                    {isToday ? <small>Hoy</small> : <small>{day.offset > 0 ? `+${day.offset}` : day.offset}</small>}
                  </span>
                  <strong>{formatChipDate(day.dateKey)}</strong>
                  <span className="orbit-chip-bottom">{complete ? 'Orbita limpia' : 'Pendiente'}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mission-layout">
          <div className="panel-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Puente de mando</span>
                <h2>{formatLongDate(selectedDateKey)}</h2>
              </div>
              <p className={`day-outcome${selectedCoreComplete ? ' is-complete' : ''}`}>
                {selectedCoreComplete ? 'Mision base asegurada' : 'Todavia no limpias el core del dia'}
              </p>
            </div>

            <div className="day-scoreboard">
              <div>
                <span className="stat-label">XP del dia</span>
                <strong>{selectedDayXp}</strong>
              </div>
              <div>
                <span className="stat-label">Posts</span>
                <strong>
                  {dayEntry.instagramCount}/{INSTAGRAM_TARGET}
                </strong>
              </div>
              <div>
                <span className="stat-label">Core</span>
                <strong>{selectedCoreComplete ? 'cerrado' : 'abierto'}</strong>
              </div>
            </div>

            <div className="mission-grid">
              {missions.map((mission) => {
                if (mission.id === 'instagram') {
                  return (
                    <article
                      key={mission.id}
                      className={`mission-card ${mission.status === 'done' ? 'is-done' : ''}`}
                    >
                      <div className="mission-copy">
                        <span className="mission-type">Canal diario</span>
                        <h3>{mission.title}</h3>
                        <p>{mission.lore}</p>
                      </div>

                      <div className="posts-panel">
                        <div className="posts-counter">
                          <button
                            type="button"
                            className="counter-button"
                            onClick={() => adjustInstagram(selectedDateKey, -1)}
                          >
                            -
                          </button>
                          <div>
                            <strong>{dayEntry.instagramCount}</strong>
                            <span>posts lanzados</span>
                          </div>
                          <button
                            type="button"
                            className="counter-button"
                            onClick={() => adjustInstagram(selectedDateKey, 1)}
                          >
                            +
                          </button>
                        </div>

                        <div className="posts-track">
                          <div
                            className="posts-fill"
                            style={{
                              width: `${Math.min((dayEntry.instagramCount / MAX_POSTS_VISIBLE) * 100, 100)}%`
                            }}
                          />
                        </div>

                        <div className="posts-legend">
                          <span>{INSTAGRAM_MINIMUM} salva el dia</span>
                          <span>{INSTAGRAM_TARGET} deja la orbita perfecta</span>
                        </div>

                        <div className="mission-actions">
                          <span className="mission-xp">+{mission.xp} XP</span>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => patchDaily(selectedDateKey, { instagramCount: 0 })}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }

                const isDone = mission.status === 'done';
                const isBonus = mission.type === 'bonus';
                const action = mission.id === 'sbpd'
                  ? () => toggleSbpd(selectedDateKey)
                  : () => toggleSundayExtra(selectedDateKey);

                return (
                  <article
                    key={mission.id}
                    className={`mission-card ${isDone ? 'is-done' : ''}${isBonus ? ' is-bonus' : ''}`}
                  >
                    <div className="mission-copy">
                      <span className="mission-type">{mission.detail}</span>
                      <h3>{mission.title}</h3>
                      <p>{mission.lore}</p>
                    </div>
                    <div className="mission-actions">
                      <span className="mission-xp">+{mission.xp} XP</span>
                      <button type="button" className="action-button" onClick={action}>
                        {isDone ? 'Desmarcar' : 'Marcar completo'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="side-column">
            <section className="panel-card compact-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Señal de nave</span>
                  <h2>Estado actual</h2>
                </div>
              </div>

              <div className="signal-grid">
                <SignalCard
                  label="SBPD"
                  value={
                    isWeekday(todayKey)
                      ? getDailyEntry(state, todayKey).sbpdDone
                        ? 'on'
                        : 'off'
                      : 'free'
                  }
                  tone={getDailyEntry(state, todayKey).sbpdDone ? 'ok' : 'warn'}
                />
                <SignalCard
                  label="Posts"
                  value={`${getDailyEntry(state, todayKey).instagramCount}/${INSTAGRAM_TARGET}`}
                  tone={
                    getDailyEntry(state, todayKey).instagramCount >= INSTAGRAM_MINIMUM ? 'ok' : 'warn'
                  }
                />
                <SignalCard label="Overdue" value={`${profile.overdueCount}`} tone={profile.overdueCount ? 'risk' : 'ok'} />
                <SignalCard label="Best" value={`${profile.bestStreak}`} tone="calm" />
              </div>

              <div className="lore-box">
                <span className="eyebrow">Lore activo</span>
                <p>
                  Cada dia limpio mantiene tu ruta estable. Los weekdays exigen SBPD mas posts;
                  los domingos permiten un Sunday Extra como turbo opcional.
                </p>
              </div>
            </section>

            <section className="panel-card compact-card">
              <div className="section-head">
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
                    placeholder="Ej. editar reel o responder cliente"
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
                    placeholder="Que define que esta side quest quede cerrada"
                  />
                </label>

                <div className="form-footer">
                  <div>
                    <span className="stat-label">Recompensa sugerida</span>
                    <strong>{pointsPreview} XP</strong>
                  </div>
                  <button type="submit" className="action-button">
                    Crear side quest
                  </button>
                </div>

                {formError ? <p className="form-error">{formError}</p> : null}
              </form>
            </section>
          </aside>
        </section>

        <section className="panel-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Mapa estelar</span>
              <h2>Deadlines activos</h2>
            </div>
            <p className="section-note">Las side quests se ordenan por riesgo de colision.</p>
          </div>

          <div className="bucket-grid">
            <TaskBucket
              title="Atrasadas"
              tone="risk"
              tasks={openBuckets.overdue}
              emptyCopy="No hay choques vencidos."
              now={now}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
            <TaskBucket
              title="Hoy"
              tone="focus"
              tasks={openBuckets.today}
              emptyCopy="Hoy no hay deadlines extras."
              now={now}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
            <TaskBucket
              title="Proximas"
              tone="calm"
              tasks={openBuckets.soon}
              emptyCopy="No hay side quests para las proximas 48h."
              now={now}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
            <TaskBucket
              title="Lejanas"
              tone="dusk"
              tasks={openBuckets.later}
              emptyCopy="Aun no cargaste tareas lejanas."
              now={now}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
          </div>
        </section>

        <section className="panel-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Hangar</span>
              <h2>Misiones cobradas</h2>
            </div>
            <p className="section-note">Tus ultimas quests cerradas para alimentar la sensacion de avance.</p>
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
              <h3>El hangar esta vacio</h3>
              <p>Cierra tu primera side quest para empezar a sentir progreso acumulado.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SignalCard({ label, value, tone }) {
  return (
    <div className={`signal-card tone-${tone}`}>
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
  const taskState = getTaskDueState(task, now);

  return (
    <article className={`task-card state-${taskState}`}>
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
    return 'Hoy ya cuenta para tu racha';
  }

  if (profile.currentStreak > 0) {
    return `Si limpias hoy llegas a ${profile.projectedStreak}`;
  }

  return 'Hoy puede iniciar una nueva racha';
}

function detectStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(window.navigator.standalone);
}
