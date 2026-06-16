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
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'progress'
  const [routineOpen, setRoutineOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  
  // Data States
  const [allRoutines, setAllRoutines] = useState([]);
  const [allMeals, setAllMeals] = useState([]);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Daily Log State
  const [dailyLog, setDailyLog] = useState({
    workout_completed: 0,
    workout_feedback: '',
    exercise_logs: '{}',
    meal_feedback: ''
  });
  const [exerciseLogsMap, setExerciseLogsMap] = useState({}); // parsed JSON of exercise_logs

  // Checkins & Progress States
  const [checkinsList, setCheckinsList] = useState([]);
  const [checkinForm, setCheckinForm] = useState({
    date: formatDate(new Date()),
    weight: '', waist: '', hip: '', thigh: '',
    photo_front: '', photo_side: '', photo_back: '', notes: ''
  });
  const [uploadingPhotos, setUploadingPhotos] = useState({ photo_front: false, photo_side: false, photo_back: false });
  const [photoCompareA, setPhotoCompareA] = useState('');
  const [photoCompareB, setPhotoCompareB] = useState('');
  const [compareType, setCompareType] = useState('photo_front');

  // Interactive Elements
  const [selectedExerciseInfo, setSelectedExerciseInfo] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [confetiActive, setConfetiActive] = useState(false);
  const [expandedCargas, setExpandedCargas] = useState({});

  const toggleCargas = (exerciseName, initiallyExpanded) => {
    setExpandedCargas(prev => {
      const currentVal = prev[exerciseName] ?? initiallyExpanded;
      return {
        ...prev,
        [exerciseName]: !currentVal
      };
    });
  };

  // Rest Timer States
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [timerTotal, setTimerTotal] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);

  // Auto-advance: check every minute if the day changed
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  // Sync Offline Queue on Recovery
  const syncOfflineQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const queue = JSON.parse(localStorage.getItem('vi_sync_queue') || '[]');
    if (queue.length === 0) return;

    for (const dateStr of queue) {
      const cached = localStorage.getItem(`vi_log_${user.id}_${dateStr}`);
      if (cached) {
        try {
          await api.saveDailyLog(user.id, { date: dateStr, ...JSON.parse(cached) });
          // Remove from cache list
          const remainingQueue = JSON.parse(localStorage.getItem('vi_sync_queue') || '[]').filter(d => d !== dateStr);
          localStorage.setItem('vi_sync_queue', JSON.stringify(remainingQueue));
        } catch (e) {
          console.error('Failed to sync offline log for ' + dateStr, e);
        }
      }
    }
  }, [user.id]);

  useEffect(() => {
    window.addEventListener('online', syncOfflineQueue);
    return () => window.removeEventListener('online', syncOfflineQueue);
  }, [syncOfflineQueue]);

  // Rest Timer Logic
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            clearInterval(timerIntervalRef.current);
            playAlarmSound();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerRunning]);

  const playAlarmSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, duration, start) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration - 0.05);
        osc.start(start);
        osc.stop(start + duration);
      };
      const now = audioCtx.currentTime;
      playTone(880, 0.15, now);
      playTone(880, 0.15, now + 0.25);
    } catch (e) {
      console.error(e);
    }
  };

  const startTimer = (seconds) => {
    setTimerTotal(seconds);
    setTimerSeconds(seconds);
    setTimerRunning(true);
    setTimerOpen(true);
  };

  // Confetti Particle Celebration
  const triggerConfetti = () => {
    setConfetiActive(true);
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    const colors = ['#c4956a', '#e0b388', '#f3d9b1', '#a07148', '#8a5e28', '#ffd6d6'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.left = Math.random() * 100 + 'vw';
      p.style.setProperty('--x-speed', (Math.random() * 30 - 15) + 'px');
      p.style.setProperty('--y-speed', (Math.random() * 12 + 12) + 'vh');
      p.style.setProperty('--rotation', Math.random() * 360 + 'deg');
      p.style.animationDelay = Math.random() * 0.4 + 's';
      container.appendChild(p);
    }
    
    setTimeout(() => {
      container.remove();
      setConfetiActive(false);
    }, 4000);
  };

  // Fetch all initial metadata
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m, exLib, checkins] = await Promise.all([
        api.getRoutines(user.id),
        api.getMealPlans(user.id),
        api.getExercises(),
        api.getCheckins(user.id)
      ]);
      setAllRoutines(r);
      setAllMeals(m);
      setExerciseLibrary(exLib);
      setCheckinsList(checkins);
      
      const todayStr = formatDate(new Date());
      const existingToday = checkins.find(c => c.date === todayStr);
      if (existingToday) {
        setCheckinForm({
          date: todayStr,
          weight: existingToday.weight !== null ? existingToday.weight.toString() : '',
          waist: existingToday.waist !== null ? existingToday.waist.toString() : '',
          hip: existingToday.hip !== null ? existingToday.hip.toString() : '',
          thigh: existingToday.thigh !== null ? existingToday.thigh.toString() : '',
          photo_front: existingToday.photo_front || '',
          photo_side: existingToday.photo_side || '',
          photo_back: existingToday.photo_back || '',
          notes: existingToday.notes || ''
        });
      } else {
        setCheckinForm(prev => ({ ...prev, date: todayStr }));
      }

      // Auto fill comparison dropdowns with newest checkins
      if (checkins.length > 0) {
        setPhotoCompareA(checkins[checkins.length - 1].id.toString());
        setPhotoCompareB(checkins[0].id.toString());
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load Daily Logs on date change
  const loadDailyLogForDate = useCallback(async (dateStr) => {
    // Check localStorage cache first (offline support)
    const cacheKey = `vi_log_${user.id}_${dateStr}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const parsed = JSON.parse(cached);
      setDailyLog(parsed);
      try {
        setExerciseLogsMap(JSON.parse(parsed.exercise_logs || '{}'));
      } catch (e) {
        setExerciseLogsMap({});
      }
    }

    try {
      const log = await api.getDailyLog(user.id, dateStr);
      setDailyLog(log);
      try {
        setExerciseLogsMap(JSON.parse(log.exercise_logs || '{}'));
      } catch (e) {
        setExerciseLogsMap({});
      }
      // Save/refresh cache
      localStorage.setItem(cacheKey, JSON.stringify(log));
    } catch (err) {
      console.error('Failed to fetch daily log, using cache/defaults:', err);
    }
  }, [user.id]);

  useEffect(() => {
    const dStr = formatDate(selectedDate);
    loadDailyLogForDate(dStr);
  }, [selectedDate, loadDailyLogForDate]);

  // Save log debounced
  const saveTimeoutRef = useRef(null);
  const saveDailyLogData = (updatedLog, updatedMap) => {
    const dateStr = formatDate(selectedDate);
    const logData = {
      ...updatedLog,
      exercise_logs: JSON.stringify(updatedMap)
    };

    setDailyLog(logData);

    // Save to cache
    const cacheKey = `vi_log_${user.id}_${dateStr}`;
    localStorage.setItem(cacheKey, JSON.stringify(logData));

    // Queue for sync
    const queue = JSON.parse(localStorage.getItem('vi_sync_queue') || '[]');
    if (!queue.includes(dateStr)) {
      queue.push(dateStr);
      localStorage.setItem('vi_sync_queue', JSON.stringify(queue));
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (navigator.onLine) {
        try {
          await api.saveDailyLog(user.id, { date: dateStr, ...logData });
          // Remove from sync queue
          const newQueue = JSON.parse(localStorage.getItem('vi_sync_queue') || '[]').filter(d => d !== dateStr);
          localStorage.setItem('vi_sync_queue', JSON.stringify(newQueue));
        } catch (e) {
          console.error('Autosave sync failed, will retry:', e);
        }
      }
    }, 1200);
  };

  const handleToggleWorkoutCompleted = () => {
    const isCompleted = dailyLog.workout_completed === 1;
    const nextCompleted = isCompleted ? 0 : 1;
    const updated = { ...dailyLog, workout_completed: nextCompleted };
    
    saveDailyLogData(updated, exerciseLogsMap);
    
    if (nextCompleted === 1) {
      triggerConfetti();
      showToast('¡Entrenamiento completado! ¡Bien hecho! 🏆');
    }
  };

  const handleFeedbackChange = (field, value) => {
    const updated = { ...dailyLog, [field]: value };
    saveDailyLogData(updated, exerciseLogsMap);
  };

  // Set Logs Tracking Update
  const handleSetLogChange = (exerciseName, setIdx, field, value) => {
    const currentExLogs = [...(exerciseLogsMap[exerciseName] || [])];
    
    // Ensure set exists
    if (!currentExLogs[setIdx]) {
      currentExLogs[setIdx] = { reps: '', weight: '', completed: false };
    }
    
    currentExLogs[setIdx] = {
      ...currentExLogs[setIdx],
      [field]: value
    };

    const newMap = {
      ...exerciseLogsMap,
      [exerciseName]: currentExLogs
    };

    setExerciseLogsMap(newMap);
    saveDailyLogData(dailyLog, newMap);
  };

  const handleToggleSetCompleted = (exerciseName, setIdx) => {
    const currentExLogs = [...(exerciseLogsMap[exerciseName] || [])];
    if (!currentExLogs[setIdx]) {
      currentExLogs[setIdx] = { reps: '', weight: '', completed: false };
    }

    const nextCompleted = !currentExLogs[setIdx].completed;
    currentExLogs[setIdx] = {
      ...currentExLogs[setIdx],
      completed: nextCompleted
    };

    const newMap = {
      ...exerciseLogsMap,
      [exerciseName]: currentExLogs
    };

    setExerciseLogsMap(newMap);
    saveDailyLogData(dailyLog, newMap);

    if (nextCompleted) {
      // Auto-trigger a 90s rest timer if checked completed
      startTimer(90);
    }
  };

  // Checkin & Progression Form handlers
  const handleCheckinPhotoUpload = async (fieldName, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append(fieldName, file);

    setUploadingPhotos(prev => ({ ...prev, [fieldName]: true }));
    try {
      const res = await api.uploadCheckinPhotos(user.id, formData);
      if (res[fieldName]) {
        setCheckinForm(prev => ({ ...prev, [fieldName]: res[fieldName] }));
        showToast('Foto cargada correctamente');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleCheckinDateChange = (newDate) => {
    setCheckinForm(prev => {
      const existing = checkinsList.find(c => c.date === newDate);
      if (existing) {
        return {
          ...prev,
          date: newDate,
          weight: existing.weight !== null ? existing.weight.toString() : '',
          waist: existing.waist !== null ? existing.waist.toString() : '',
          hip: existing.hip !== null ? existing.hip.toString() : '',
          thigh: existing.thigh !== null ? existing.thigh.toString() : '',
          photo_front: existing.photo_front || '',
          photo_side: existing.photo_side || '',
          photo_back: existing.photo_back || '',
          notes: existing.notes || ''
        };
      } else {
        return {
          ...prev,
          date: newDate,
          weight: '', waist: '', hip: '', thigh: '',
          photo_front: '', photo_side: '', photo_back: '', notes: ''
        };
      }
    });
  };

  const handleSaveCheckin = async (e) => {
    e.preventDefault();
    if (!navigator.onLine) {
      showToast('Debes estar conectado a Internet para guardar un reporte con imágenes.', 'error');
      return;
    }

    try {
      const dateStr = checkinForm.date || formatDate(today);
      const payload = {
        date: dateStr,
        weight: checkinForm.weight ? parseFloat(checkinForm.weight) : null,
        waist: checkinForm.waist ? parseFloat(checkinForm.waist) : null,
        hip: checkinForm.hip ? parseFloat(checkinForm.hip) : null,
        thigh: checkinForm.thigh ? parseFloat(checkinForm.thigh) : null,
        photo_front: checkinForm.photo_front || null,
        photo_side: checkinForm.photo_side || null,
        photo_back: checkinForm.photo_back || null,
        notes: checkinForm.notes || null
      };

      await api.saveCheckin(user.id, payload);
      showToast('Reporte de progreso guardado con éxito! 💪');
      
      // Clear form and reset to today
      setCheckinForm({
        date: formatDate(new Date()),
        weight: '', waist: '', hip: '', thigh: '',
        photo_front: '', photo_side: '', photo_back: '', notes: ''
      });

      // Reload checkins
      const checkins = await api.getCheckins(user.id);
      setCheckinsList(checkins);

      // Auto fill comparison dropdowns with newest checkins
      if (checkins.length > 0) {
        setPhotoCompareA(checkins[checkins.length - 1].id.toString());
        setPhotoCompareB(checkins[0].id.toString());
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Build Calendar Info
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
    const hasDailyMeal = allMeals.some(m => m.date === null && m.day_of_week === 7);
    return allRoutines.some(r => r.date === dStr || (r.date === null && r.day_of_week === dIdx)) ||
           hasDailyMeal ||
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
    || allMeals.find(m => m.date === null && m.day_of_week === selectedDayIndex)
    || allMeals.find(m => m.date === null && m.day_of_week === 7);

  const calendarDays = buildCalendar();

  // Combined Exercises Logic Grouping
  const groupExercises = (exercises) => {
    const blocks = [];
    let currentGroup = null;
    let currentBlock = null;

    exercises.forEach((ex, idx) => {
      const grp = ex.group ? ex.group.toUpperCase().trim() : '';
      if (grp) {
        if (currentGroup === grp && currentBlock && currentBlock.type === 'combined') {
          currentBlock.exercises.push({ ...ex, originalIndex: idx });
        } else {
          currentGroup = grp;
          currentBlock = {
            type: 'combined',
            groupName: grp,
            exercises: [{ ...ex, originalIndex: idx }]
          };
          blocks.push(currentBlock);
        }
      } else {
        currentGroup = null;
        currentBlock = {
          type: 'single',
          exercise: { ...ex, originalIndex: idx }
        };
        blocks.push(currentBlock);
      }
    });
    return blocks;
  };

  const getExerciseLibraryMatch = (exName) => {
    return exerciseLibrary.find(e => e.name.toLowerCase().trim() === exName.toLowerCase().trim());
  };

  // Render weight history SVG Chart
  const renderWeightChart = () => {
    if (checkinsList.length === 0) {
      return <p className="empty-chart">Registra tu peso en el formulario de arriba para ver la gráfica.</p>;
    }

    const sorted = [...checkinsList].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weights = sorted.map(c => c.weight).filter(w => w !== null && w > 0);

    if (weights.length === 0) {
      return <p className="empty-chart">No hay registros de peso válidos.</p>;
    }

    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const rangeY = maxW - minW || 1;

    const width = 500;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = sorted.map((c, i) => {
      const x = paddingLeft + (sorted.length > 1 ? (i / (sorted.length - 1)) * chartWidth : chartWidth / 2);
      const y = paddingTop + chartHeight - ((c.weight - minW) / rangeY) * chartHeight;
      const dayStr = c.date.split('-').slice(1).reverse().join('/'); // MM/DD
      return { x, y, weight: c.weight, date: dayStr };
    });

    let pathD = '';
    if (points.length > 1) {
      pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    }

    return (
      <div className="chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="svg-chart">
          <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--text-accent)" />
              <stop offset="100%" stopColor="#b07840" />
            </linearGradient>
            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--text-accent)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--text-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="rgba(160,110,70,0.12)" strokeDasharray="3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight/2} x2={width - paddingRight} y2={paddingTop + chartHeight/2} stroke="rgba(160,110,70,0.12)" strokeDasharray="3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="rgba(160,110,70,0.25)" />

          {/* Fill Area */}
          {points.length > 1 && (
            <path
              d={`${pathD} L ${points[points.length-1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`}
              fill="url(#area-gradient)"
            />
          )}

          {/* Line Path */}
          {points.length > 1 ? (
            <path d={pathD} fill="none" stroke="url(#chart-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <circle cx={points[0].x} cy={points[0].y} r="5" fill="var(--text-accent)" />
          )}

          {/* Dots and Labels */}
          {points.map((p, i) => (
            <g key={i} className="chart-dot-group">
              <circle cx={p.x} cy={p.y} r="4" fill="var(--text-accent)" stroke="#fff" strokeWidth="1.5" />
              <text x={p.x} y={p.y - 7} className="chart-val-label" textAnchor="middle">{p.weight} kg</text>
              <text x={p.x} y={height - 8} className="chart-axis-label" textAnchor="middle">{p.date}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // Load photos comparison
  const compareA = checkinsList.find(c => c.id.toString() === photoCompareA);
  const compareB = checkinsList.find(c => c.id.toString() === photoCompareB);

  return (
    <div className="student-layout">
      {/* Header */}
      <header className="student-header">
        <div className="container student-header-inner">
          <div className="student-header-brand">
            <span className="brand-vi">VI</span>
            <span className="student-header-greeting">Hola, <strong>{user?.name?.split(' ')[0]}</strong></span>
          </div>
          <div className="student-header-right">
            {!navigator.onLine && <span className="offline-badge">Offline</span>}
            <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>Salir</button>
          </div>
        </div>
      </header>

      <main className="student-main container">
        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : (
          <>
            {activeTab === 'today' ? (
              <>
                {/* Date Chip — tap toggles calendar */}
                <button className="date-chip" onClick={() => setCalendarOpen(o => !o)}>
                  <span className="date-chip-day">{DAY_NAMES[selectedDayIndex]}</span>
                  <span className="date-chip-full">
                    {selectedDate.getDate()} de {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                  </span>
                  <span className={`date-chip-arrow ${calendarOpen ? 'open' : ''}`}>›</span>
                </button>

                {/* Calendar */}
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
                              {dayRoutine && (
                                <span className="toggle-count">
                                  {dayRoutine.exercises.length} ejercicio{dayRoutine.exercises.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              <span className="toggle-arrow">›</span>
                            </button>

                            <div className={`section-collapse ${routineOpen ? 'section-collapse--open' : ''}`}>
                              {dayRoutine ? (
                                <div className="day-detail-block">
                                  <div className="routine-title-bar">
                                    <p className="day-detail-block-title">{dayRoutine.title}</p>
                                    <button 
                                      className={`btn-complete-workout ${dailyLog.workout_completed === 1 ? 'completed' : ''}`}
                                      onClick={handleToggleWorkoutCompleted}
                                    >
                                      {dailyLog.workout_completed === 1 ? '✅ ¡Hecho!' : '✔ Completar'}
                                    </button>
                                  </div>

                                  {dayRoutine.exercises.length > 0 ? (
                                    <div className="student-exercises">
                                      {groupExercises(dayRoutine.exercises).map((block, bIdx) => {
                                        if (block.type === 'combined') {
                                          return (
                                            <div key={bIdx} className="combined-exercises-block">
                                              <div className="combined-block-header">
                                                <span>🔁 Bloque Combinado {block.groupName}</span>
                                                <small>Hacer seguidos sin descansar</small>
                                              </div>
                                              
                                              {block.exercises.map((ex) => {
                                                const setsCount = parseInt(ex.sets) || 1;
                                                const libraryMatch = getExerciseLibraryMatch(ex.name);
                                                const loggedSets = exerciseLogsMap[ex.name] || [];
                                                const hasLoggedData = loggedSets.some(set => set.reps || set.weight || set.completed);
                                                const isExpanded = expandedCargas[ex.name] ?? hasLoggedData;
                                                
                                                return (
                                                  <div key={ex.originalIndex} className="student-exercise combined-item">
                                                    <div className="student-exercise-info">
                                                      <div className="ex-title-wrap">
                                                        <strong 
                                                          className={libraryMatch ? 'has-library-link' : ''}
                                                          onClick={() => libraryMatch && setSelectedExerciseInfo(libraryMatch)}
                                                        >
                                                          {ex.name} {libraryMatch && <span className="info-badge">ℹ</span>}
                                                        </strong>
                                                        {ex.rest && <span className="meta-tag timer-trigger-inline" onClick={() => startTimer(parseInt(ex.rest) || 90)}>⏱️ {ex.rest}</span>}
                                                      </div>
                                                      <div className="student-exercise-meta">
                                                        {ex.sets && <span className="meta-tag">{ex.sets} series</span>}
                                                        {ex.reps && <span className="meta-tag">{ex.reps} reps</span>}
                                                        <button 
                                                          className={`btn-cargar-peso ${isExpanded ? 'active' : ''}`}
                                                          onClick={() => toggleCargas(ex.name, hasLoggedData)}
                                                        >
                                                          {isExpanded ? 'Ocultar peso' : '🏋️ Cargar peso'}
                                                        </button>
                                                        {ex.notes && <p className="student-exercise-notes">{ex.notes}</p>}
                                                      </div>

                                                      {/* Set Inputs for Cargas */}
                                                      {isExpanded && (
                                                        <div className="sets-log-table">
                                                          {Array.from({ length: setsCount }).map((_, sIdx) => {
                                                            const setLog = loggedSets[sIdx] || { reps: '', weight: '', completed: false };
                                                            return (
                                                              <div key={sIdx} className={`set-row ${setLog.completed ? 'completed' : ''}`}>
                                                                <span className="set-num">S{sIdx + 1}</span>
                                                                <input 
                                                                  type="number" 
                                                                  placeholder="reps" 
                                                                  inputMode="decimal"
                                                                  value={setLog.reps}
                                                                  onChange={(e) => handleSetLogChange(ex.name, sIdx, 'reps', e.target.value)}
                                                                />
                                                                <span className="x-char">x</span>
                                                                <input 
                                                                  type="text" 
                                                                  placeholder="kg / lb" 
                                                                  value={setLog.weight}
                                                                  onChange={(e) => handleSetLogChange(ex.name, sIdx, 'weight', e.target.value)}
                                                                />
                                                                <button 
                                                                  className={`btn-set-check ${setLog.completed ? 'checked' : ''}`}
                                                                  onClick={() => handleToggleSetCompleted(ex.name, sIdx)}
                                                                >
                                                                  ✔
                                                                </button>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        } else {
                                          const ex = block.exercise;
                                          const setsCount = parseInt(ex.sets) || 1;
                                          const libraryMatch = getExerciseLibraryMatch(ex.name);
                                          const loggedSets = exerciseLogsMap[ex.name] || [];
                                          const hasLoggedData = loggedSets.some(set => set.reps || set.weight || set.completed);
                                          const isExpanded = expandedCargas[ex.name] ?? hasLoggedData;

                                          return (
                                            <div key={ex.originalIndex} className="student-exercise">
                                              <div className="student-exercise-num">{bIdx + 1}</div>
                                              <div className="student-exercise-info">
                                                <div className="ex-title-wrap">
                                                  <strong 
                                                    className={libraryMatch ? 'has-library-link' : ''}
                                                    onClick={() => libraryMatch && setSelectedExerciseInfo(libraryMatch)}
                                                  >
                                                    {ex.name} {libraryMatch && <span className="info-badge">ℹ</span>}
                                                  </strong>
                                                  {ex.rest && <span className="meta-tag timer-trigger-inline" onClick={() => startTimer(parseInt(ex.rest) || 90)}>⏱️ {ex.rest}</span>}
                                                </div>
                                                <div className="student-exercise-meta">
                                                  {ex.sets && <span className="meta-tag">{ex.sets} series</span>}
                                                  {ex.reps && <span className="meta-tag">{ex.reps} reps</span>}
                                                  <button 
                                                    className={`btn-cargar-peso ${isExpanded ? 'active' : ''}`}
                                                    onClick={() => toggleCargas(ex.name, hasLoggedData)}
                                                  >
                                                    {isExpanded ? 'Ocultar peso' : '🏋️ Cargar peso'}
                                                  </button>
                                                  {ex.notes && <p className="student-exercise-notes">{ex.notes}</p>}
                                                </div>

                                                {/* Set Inputs for Cargas */}
                                                {isExpanded && (
                                                  <div className="sets-log-table">
                                                  {Array.from({ length: setsCount }).map((_, sIdx) => {
                                                    const setLog = loggedSets[sIdx] || { reps: '', weight: '', completed: false };
                                                    return (
                                                      <div key={sIdx} className={`set-row ${setLog.completed ? 'completed' : ''}`}>
                                                        <span className="set-num">S{sIdx + 1}</span>
                                                        <input 
                                                          type="number" 
                                                          placeholder="reps" 
                                                          inputMode="decimal"
                                                          value={setLog.reps}
                                                          onChange={(e) => handleSetLogChange(ex.name, sIdx, 'reps', e.target.value)}
                                                        />
                                                        <span className="x-char">x</span>
                                                        <input 
                                                          type="text" 
                                                          placeholder="kg / lb" 
                                                          value={setLog.weight}
                                                          onChange={(e) => handleSetLogChange(ex.name, sIdx, 'weight', e.target.value)}
                                                        />
                                                        <button 
                                                          className={`btn-set-check ${setLog.completed ? 'checked' : ''}`}
                                                          onClick={() => handleToggleSetCompleted(ex.name, sIdx)}
                                                        >
                                                          ✔
                                                        </button>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        }
                                      })}
                                    </div>
                                  ) : <p className="empty-msg">Sin ejercicios cargados.</p>}
                                  
                                  {dayRoutine.notes && <div className="student-notes">📝 {dayRoutine.notes}</div>}
                                  
                                  {/* Routine Feedback */}
                                  <div className="feedback-form-group">
                                    <label>¿Cómo sentiste la rutina de hoy? (Notas para tu Coach)</label>
                                    <textarea 
                                      placeholder="Ej: Sentí molestia en la rodilla, o muy liviano el peso..."
                                      value={dailyLog.workout_feedback || ''}
                                      onChange={(e) => handleFeedbackChange('workout_feedback', e.target.value)}
                                      rows={2}
                                    />
                                  </div>
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
                                
                                {/* Meal Feedback */}
                                <div className="feedback-form-group">
                                  <label>¿Cómo estuvo tu alimentación hoy?</label>
                                  <textarea 
                                    placeholder="Ej: Pude cumplir todas las comidas, o me costó llegar a la proteína..."
                                    value={dailyLog.meal_feedback || ''}
                                    onChange={(e) => handleFeedbackChange('meal_feedback', e.target.value)}
                                    rows={2}
                                  />
                                </div>
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
            ) : (
              // TAB PROGRESS VIEW
              <div className="student-progress-view">
                <h2 className="progress-section-title">📈 Mi Progreso Corporal</h2>
                
                {/* Weight Evolution Chart */}
                <div className="progress-card chart-card">
                  <h3>Evolución de Peso</h3>
                  {renderWeightChart()}
                </div>

                {/* Photo Comparator */}
                {checkinsList.length >= 2 && (
                  <div className="progress-card compare-card">
                    <h3>Comparar Fotos de Progreso</h3>
                    <div className="compare-selectors">
                      <div className="selector-field">
                        <label>Antes (Fecha):</label>
                        <select value={photoCompareA} onChange={e => setPhotoCompareA(e.target.value)}>
                          {checkinsList.map(c => (
                            <option key={c.id} value={c.id}>{c.date.split('-').reverse().join('/')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="selector-field">
                        <label>Después (Fecha):</label>
                        <select value={photoCompareB} onChange={e => setPhotoCompareB(e.target.value)}>
                          {checkinsList.map(c => (
                            <option key={c.id} value={c.id}>{c.date.split('-').reverse().join('/')}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="compare-type-selectors">
                      <button className={compareType === 'photo_front' ? 'active' : ''} onClick={() => setCompareType('photo_front')}>Frente</button>
                      <button className={compareType === 'photo_side' ? 'active' : ''} onClick={() => setCompareType('photo_side')}>Perfil</button>
                      <button className={compareType === 'photo_back' ? 'active' : ''} onClick={() => setCompareType('photo_back')}>Espalda</button>
                    </div>

                    <div className="compare-images-grid">
                      <div className="compare-image-pane">
                        <span className="compare-pane-label">{compareA ? compareA.date.split('-').reverse().join('/') : ''}</span>
                        {compareA && compareA[compareType] ? (
                          <img 
                            src={`/uploads/checkins/${user.id}/${compareA[compareType]}`} 
                            alt="Antes"
                            onClick={() => setLightboxImg({ url: `/uploads/checkins/${user.id}/${compareA[compareType]}`, description: `Antes: ${compareA.date}` })}
                          />
                        ) : <div className="no-photo-box">Sin foto</div>}
                      </div>
                      <div className="compare-image-pane">
                        <span className="compare-pane-label">{compareB ? compareB.date.split('-').reverse().join('/') : ''}</span>
                        {compareB && compareB[compareType] ? (
                          <img 
                            src={`/uploads/checkins/${user.id}/${compareB[compareType]}`} 
                            alt="Después"
                            onClick={() => setLightboxImg({ url: `/uploads/checkins/${user.id}/${compareB[compareType]}`, description: `Después: ${compareB.date}` })}
                          />
                        ) : <div className="no-photo-box">Sin foto</div>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Register checkin form */}
                <div className="progress-card form-card">
                  <h3>Cargar Reporte de Progreso / Estado Inicial</h3>
                  <form onSubmit={handleSaveCheckin}>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label">Fecha del Reporte</label>
                      <input 
                        type="date" 
                        value={checkinForm.date} 
                        onChange={e => handleCheckinDateChange(e.target.value)}
                        required
                        className="form-input"
                        style={{ textAlign: 'left', width: '100%' }}
                      />
                      <small className="photo-upload-hint" style={{ marginTop: '0.4rem', display: 'block' }}>
                        * Si estás cargando tu estado inicial ("el antes"), selecciona la fecha en la que comenzaste. Los datos y fotos se guardarán para ese día.
                      </small>
                    </div>

                    <div className="form-row">
                      <div className="form-group-half">
                        <label>Peso (kg)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          placeholder="0.0" 
                          inputMode="decimal"
                          value={checkinForm.weight} 
                          onChange={e => setCheckinForm(p => ({ ...p, weight: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group-half">
                        <label>Medida Cintura (cm)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          placeholder="Opcional" 
                          inputMode="decimal"
                          value={checkinForm.waist} 
                          onChange={e => setCheckinForm(p => ({ ...p, waist: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group-half">
                        <label>Medida Cadera (cm)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          placeholder="Opcional" 
                          inputMode="decimal"
                          value={checkinForm.hip} 
                          onChange={e => setCheckinForm(p => ({ ...p, hip: e.target.value }))}
                        />
                      </div>
                      <div className="form-group-half">
                        <label>Medida Muslo (cm)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          placeholder="Opcional" 
                          inputMode="decimal"
                          value={checkinForm.thigh} 
                          onChange={e => setCheckinForm(p => ({ ...p, thigh: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Progress Photos Upload */}
                    <div className="photo-uploads-section">
                      <h4>Fotos de Progreso (Opcional)</h4>
                      <p className="photo-upload-hint">Sube tus fotos para que Verónica pueda evaluar tu cambio.</p>
                      
                      <div className="photo-upload-row">
                        {/* Front */}
                        <div className="photo-upload-item">
                          <label className="photo-upload-box">
                            {uploadingPhotos.photo_front ? (
                              <div className="upload-spinner"></div>
                            ) : checkinForm.photo_front ? (
                              <img src={`/uploads/checkins/${user.id}/${checkinForm.photo_front}`} alt="Frontal" />
                            ) : (
                              <div className="photo-box-placeholder">
                                <span className="ph-icon">📷</span>
                                <span>De Frente</span>
                              </div>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              hidden 
                              onChange={e => handleCheckinPhotoUpload('photo_front', e.target.files[0])} 
                            />
                          </label>
                        </div>

                        {/* Side */}
                        <div className="photo-upload-item">
                          <label className="photo-upload-box">
                            {uploadingPhotos.photo_side ? (
                              <div className="upload-spinner"></div>
                            ) : checkinForm.photo_side ? (
                              <img src={`/uploads/checkins/${user.id}/${checkinForm.photo_side}`} alt="Perfil" />
                            ) : (
                              <div className="photo-box-placeholder">
                                <span className="ph-icon">📷</span>
                                <span>De Perfil</span>
                              </div>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              hidden 
                              onChange={e => handleCheckinPhotoUpload('photo_side', e.target.files[0])} 
                            />
                          </label>
                        </div>

                        {/* Back */}
                        <div className="photo-upload-item">
                          <label className="photo-upload-box">
                            {uploadingPhotos.photo_back ? (
                              <div className="upload-spinner"></div>
                            ) : checkinForm.photo_back ? (
                              <img src={`/uploads/checkins/${user.id}/${checkinForm.photo_back}`} alt="Dorsal" />
                            ) : (
                              <div className="photo-box-placeholder">
                                <span className="ph-icon">📷</span>
                                <span>De Espalda</span>
                              </div>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              hidden 
                              onChange={e => handleCheckinPhotoUpload('photo_back', e.target.files[0])} 
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <label className="form-label">Notas adicionales</label>
                      <textarea 
                        className="form-input"
                        placeholder="¿Cómo te has sentido esta semana en general?" 
                        value={checkinForm.notes} 
                        onChange={e => setCheckinForm(p => ({ ...p, notes: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-full-width">
                      💾 Guardar Reporte
                    </button>
                  </form>
                </div>

                {/* Historical checkins list */}
                <div className="progress-card history-card">
                  <h3>Historial de Reportes</h3>
                  {checkinsList.length > 0 ? (
                    <div className="checkins-history-list">
                      {checkinsList.map(c => (
                        <div key={c.id} className="history-item-row">
                          <div className="history-item-date">{c.date.split('-').reverse().join('/')}</div>
                          <div className="history-item-data">
                            <strong>{c.weight} kg</strong>
                            {c.waist && <span> | Cintura: {c.waist}cm</span>}
                            {c.hip && <span> | Cadera: {c.hip}cm</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="empty-state">No has cargado ningún reporte aún.</p>}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Bottom Navigation Bar for Mobile-first feeling */}
      <div className="bottom-nav-bar">
        <button 
          className={`bottom-nav-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <span className="nav-icon">📅</span>
          <span className="nav-label">Mi Día</span>
        </button>
        <button 
          className={`bottom-nav-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <span className="nav-icon">📈</span>
          <span className="nav-label">Progreso</span>
        </button>
      </div>

      {/* Floating Rest Timer Component */}
      {timerOpen && (
        <div className={`floating-timer ${timerRunning ? 'running' : 'paused'}`}>
          <div className="timer-inner">
            <div className="timer-radial">
              <svg width="46" height="46" viewBox="0 0 46 46">
                <circle cx="23" cy="23" r="20" className="timer-track" />
                <circle 
                  cx="23" 
                  cy="23" 
                  r="20" 
                  className="timer-fill" 
                  style={{
                    strokeDasharray: 2 * Math.PI * 20,
                    strokeDashoffset: 2 * Math.PI * 20 * (1 - timerSeconds / (timerTotal || 1))
                  }}
                />
              </svg>
              <div className="timer-seconds-label">{timerSeconds}s</div>
            </div>
            <div className="timer-controls">
              <button onClick={() => setTimerRunning(!timerRunning)}>
                {timerRunning ? '⏸' : '▶'}
              </button>
              <button onClick={() => setTimerSeconds(s => s + 30)}>+30s</button>
              <button className="timer-close-btn" onClick={() => { setTimerRunning(false); setTimerOpen(false); }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise info technique modal */}
      {selectedExerciseInfo && (
        <div className="modal-overlay" onClick={() => setSelectedExerciseInfo(null)}>
          <div className="modal-content technique-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedExerciseInfo.name}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedExerciseInfo(null)}>✕</button>
            </div>
            <div className="modal-body">
              {selectedExerciseInfo.description && (
                <div className="tech-description">
                  <h4>Instrucciones:</h4>
                  <p>{selectedExerciseInfo.description}</p>
                </div>
              )}
              {selectedExerciseInfo.video_url && (
                <div className="tech-video">
                  <h4>Ejecución Técnica:</h4>
                  {selectedExerciseInfo.video_url.includes('youtube.com') || selectedExerciseInfo.video_url.includes('youtu.be') ? (
                    <div className="iframe-wrapper">
                      <iframe 
                        src={selectedExerciseInfo.video_url.replace('watch?v=', 'embed/').split('&')[0]} 
                        title="Video"
                        frameBorder="0" 
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <a 
                      href={selectedExerciseInfo.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary btn-sm btn-full-width"
                      style={{ marginTop: '0.5rem' }}
                    >
                      🔗 Ver video demostrativo externo
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Photos */}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightboxImg.url} alt={lightboxImg.description || ''} />
            {lightboxImg.description && <p className="lightbox-desc">{lightboxImg.description}</p>}
            <button className="btn btn-ghost lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}><span className="toast-message">{toast.message}</span></div>
        </div>
      )}
    </div>
  );
}
