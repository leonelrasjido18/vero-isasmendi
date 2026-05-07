import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import * as api from '../api';
import './Student.css';

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const jsDayToIndex = (jsDay) => jsDay === 0 ? 6 : jsDay - 1;

const isSameDay = (a, b) =>
  a && b &&
  a.getDate() === b.getDate() &&
  a.getMonth() === b.getMonth() &&
  a.getFullYear() === b.getFullYear();

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export default function StudentPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  const [routineOpen, setRoutineOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [allRoutines, setAllRoutines] = useState([]);
  const [allMeals, setAllMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Auto-advance: check every minute if the day changed
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (!isSameDay(now, selectedDateRef.current)) {
        setSelectedDate(now);
        setViewMonth(now.getMonth());
        setViewYear(now.getFullYear());
        setCalendarOpen(false);
      }
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([
        api.getRoutines(user.id),
        api.getMealPlans(user.id),
      ]);
      setAllRoutines(r);
      setAllMeals(m);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build calendar
  const buildCalendar = () => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startOffset = jsDayToIndex(firstDay.getDay());
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(viewYear, viewMonth, d));
    }
    return days;
  };

  const hasContent = (date) => {
    if (!date) return false;
    const dStr = formatDate(date);
    const dIdx = jsDayToIndex(date.getDay());
    return allRoutines.some(r => r.date === dStr || (r.date === null && r.day_of_week === dIdx)) ||
           allMeals.some(m => m.date === dStr || (m.date === null && m.day_of_week === dIdx));
  };

  const isToday = (date) => date && isSameDay(date, today);
  const isSelected = (date) => date && isSameDay(date, selectedDate);

  const handleDayClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setCalendarOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectedDayIndex = jsDayToIndex(selectedDate.getDay());
  const selectedDateStr = formatDate(selectedDate);
  const dayRoutine = allRoutines.find(r => r.date === selectedDateStr)
    || allRoutines.find(r => r.date === null && r.day_of_week === selectedDayIndex);
  const dayMeal = allMeals.find(m => m.date === selectedDateStr)
    || allMeals.find(m => m.date === null && m.day_of_week === selectedDayIndex);

  const calendarDays = buildCalendar();

  return (
    <div className="student-layout">
      {/* Header */}
      <header className="student-header">
        <div className="container student-header-inner">
          <div className="student-header-brand">
            <span className="brand-vi">VI</span>
            <span className="student-header-greeting">Hola, <strong>{user?.name?.split(' ')[0]}</strong></span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>Salir</button>
        </div>
      </header>

      <main className="student-main container">
        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : (
          <>
            {/* Date Chip — always visible, tapping toggles calendar */}
            <button className="date-chip" onClick={() => setCalendarOpen(o => !o)}>
              <span className="date-chip-day">{DAY_NAMES[selectedDayIndex]}</span>
              <span className="date-chip-full">
                {selectedDate.getDate()} de {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </span>
              <span className={`date-chip-arrow ${calendarOpen ? 'open' : ''}`}>›</span>
            </button>

            {/* Calendar — slides in/out */}
            <div className={`cal-wrapper ${calendarOpen ? 'cal-wrapper--open' : ''}`}>
              <div className="cal-card">
                <div className="cal-nav">
                  <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
                  <span className="cal-month-label">{MONTH_NAMES[viewMonth]} {viewYear}</span>
                  <button className="cal-nav-btn" onClick={nextMonth}>›</button>
                </div>
                <div className="cal-grid">
                  {DAY_SHORT.map(d => (
                    <div key={d} className="cal-weekday">{d}</div>
                  ))}
                  {calendarDays.map((date, i) => (
                    <div
                      key={i}
                      className={[
                        'cal-day',
                        !date ? 'cal-day--empty' : '',
                        date && isToday(date) ? 'cal-day--today' : '',
                        date && isSelected(date) ? 'cal-day--selected' : '',
                        date && hasContent(date) ? 'cal-day--has-content' : '',
                      ].join(' ')}
                      onClick={() => handleDayClick(date)}
                    >
                      {date && (
                        <>
                          <span className="cal-day-num">{date.getDate()}</span>
                          {hasContent(date) && <span className="cal-dot" />}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="cal-legend">
                  <span className="cal-legend-dot" /> Día con plan cargado
                </div>
              </div>
            </div>

            {/* Day Detail */}
            <div className="day-detail">
              {(() => {
                const pt = user?.plan_type || 'both';
                const showRoutine = pt === 'both' || pt === 'routine';
                const showMeal    = pt === 'both' || pt === 'meal';
                return (
                  <>
              {/* Rutina */}
              {showRoutine && (
              <div className="day-detail-section">
                <button
                  className={`day-section-toggle ${routineOpen ? 'open' : ''}`}
                  onClick={() => setRoutineOpen(o => !o)}
                >
                  <span className="day-detail-icon">🏋️</span>
                  <span>Rutina</span>
                  {dayRoutine && <span className="toggle-count">{dayRoutine.exercises.length} ejercicio{dayRoutine.exercises.length !== 1 ? 's' : ''}</span>}
                  <span className="toggle-arrow">›</span>
                </button>

                <div className={`section-collapse ${routineOpen ? 'section-collapse--open' : ''}`}>
                  {dayRoutine ? (
                    <div className="day-detail-block">
                      <p className="day-detail-block-title">{dayRoutine.title}</p>
                      {dayRoutine.exercises.length > 0 ? (
                        <div className="student-exercises">
                          {dayRoutine.exercises.map((ex, i) => (
                            <div key={i} className="student-exercise">
                              <div className="student-exercise-num">{i + 1}</div>
                              <div className="student-exercise-info">
                                <strong>{ex.name}</strong>
                                <div className="student-exercise-meta">
                                  {ex.sets && <span className="meta-tag">{ex.sets} series</span>}
                                  {ex.reps && <span className="meta-tag">{ex.reps} reps</span>}
                                  {ex.rest && <span className="meta-tag">{ex.rest} desc.</span>}
                                </div>
                                {ex.notes && <p className="student-exercise-notes">{ex.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="empty-msg">Sin ejercicios cargados.</p>}
                      {dayRoutine.notes && <div className="student-notes">📝 {dayRoutine.notes}</div>}
                    </div>
                  ) : (
                    <p className="day-detail-empty">Sin rutina para este día.</p>
                  )}
                </div>
              </div>
              )}

              {/* Alimentación */}
              {showMeal && (
              <div className="day-detail-section">
                <h3 className="day-detail-section-title">
                  <span className="day-detail-icon">🥗</span> Alimentación
                </h3>
                {dayMeal ? (
                  <div className="day-detail-block">
                    {dayMeal.meals.length > 0 ? (
                      <div className="student-meals">
                        {dayMeal.meals.map((meal, i) => (
                          <div key={i} className="student-meal">
                            <div className="student-meal-header">
                              <span className="student-meal-name">{meal.name}</span>
                              {meal.time && <span className="student-meal-time">{meal.time}</span>}
                            </div>
                            {meal.description && <p className="student-meal-desc">{meal.description}</p>}
                            {meal.image && (
                              <button className="meal-photo-btn" onClick={() => setLightboxImg({ url: `/uploads/meals/${meal.image}`, description: meal.name })}>
                                <img className="meal-photo-thumb" src={`/uploads/meals/${meal.image}`} alt="" />
                                Ver foto
                                <span className="meal-photo-arrow">›</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : <p className="empty-msg">Sin comidas cargadas.</p>}
                    {dayMeal.notes && <div className="student-notes">📝 {dayMeal.notes}</div>}
                  </div>
                ) : (
                  <p className="day-detail-empty">Sin plan de alimentación para este día.</p>
                )}
              </div>
              )}
                  </>
                );
              })()}
            </div>
          </>
        )}
      </main>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightboxImg.url} alt={lightboxImg.description || ''} />
            {lightboxImg.description && <p className="lightbox-desc">{lightboxImg.description}</p>}
            <button className="btn btn-ghost lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
