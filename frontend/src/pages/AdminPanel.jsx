import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import * as api from '../api';
import './Admin.css';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_SHORT_CAL = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const jsDayToIndex = (d) => d === 0 ? 6 : d - 1;
const isSameDay = (a, b) => a && b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'students', 'exercises', 'templates'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const today = new Date();
  
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(formatDate(today));
  const [calOpen, setCalOpen] = useState(false);
  const [calViewMonth, setCalViewMonth] = useState(today.getMonth());
  const [calViewYear, setCalViewYear] = useState(today.getFullYear());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Exercise Library state
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseForm, setExerciseForm] = useState({ name: '', video_url: '', description: '' });

  // Templates states
  const [routineTemplates, setRoutineTemplates] = useState([]);
  const [mealTemplates, setMealTemplates] = useState([]);

  // Selected Student Check-ins and Logs
  const [selectedStudentCheckins, setSelectedStudentCheckins] = useState([]);
  const [selectedStudentDailyLog, setSelectedStudentDailyLog] = useState(null);
  const [studentLogMap, setStudentLogMap] = useState({});
  const [photoCompareA, setPhotoCompareA] = useState('');
  const [photoCompareB, setPhotoCompareB] = useState('');
  const [compareType, setCompareType] = useState('photo_front');

  // Modals
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '', phone: '', notes: '', plan_type: 'both' });

  // Routine & Meal data
  const [routines, setRoutines] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);

  // Routine form
  const [routineForm, setRoutineForm] = useState({ title: '', exercises: [], notes: '' });
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [routineWeekly, setRoutineWeekly] = useState(false);

  // Meal form
  const [mealForm, setMealForm] = useState({ meals: [], notes: '' });
  const [showMealForm, setShowMealForm] = useState(false);
  const [mealWeekly, setMealWeekly] = useState(false);
  const [mealDaily, setMealDaily] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStudents = useCallback(async () => {
    try {
      const data = await api.getStudents();
      setStudents(data);
    } catch (err) { showToast(err.message, 'error'); }
  }, []);

  const fetchExerciseLibrary = useCallback(async () => {
    try {
      const data = await api.getExercises();
      setExerciseLibrary(data);
    } catch (err) { showToast(err.message, 'error'); }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const [rTemplates, mTemplates] = await Promise.all([
        api.getRoutineTemplates(),
        api.getMealTemplates()
      ]);
      setRoutineTemplates(rTemplates);
      setMealTemplates(mTemplates);
    } catch (err) { showToast(err.message, 'error'); }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchExerciseLibrary();
    fetchTemplates();
  }, [fetchStudents, fetchExerciseLibrary, fetchTemplates]);

  // Load student tracking details (Checkins, logs, routines, meals)
  const fetchStudentData = useCallback(async (studentId) => {
    setLoading(true);
    try {
      const [r, m, checkins] = await Promise.all([
        api.getRoutines(studentId),
        api.getMealPlans(studentId),
        api.getCheckins(studentId)
      ]);
      setRoutines(r);
      setMealPlans(m);
      setSelectedStudentCheckins(checkins);
      
      if (checkins.length > 0) {
        setPhotoCompareA(checkins[checkins.length - 1].id.toString());
        setPhotoCompareB(checkins[0].id.toString());
      }
    } catch (err) { showToast(err.message, 'error'); }
    setLoading(false);
  }, []);

  // Fetch daily logs and overload feedback when selecting a date
  const fetchDailyLogForStudent = useCallback(async (studentId, dateStr) => {
    try {
      const log = await api.getDailyLog(studentId, dateStr);
      setSelectedStudentDailyLog(log);
      try {
        setStudentLogMap(JSON.parse(log.exercise_logs || '{}'));
      } catch {
        setStudentLogMap({});
      }
    } catch {
      setSelectedStudentDailyLog(null);
      setStudentLogMap({});
    }
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData(selectedStudent.id);
      fetchDailyLogForStudent(selectedStudent.id, selectedDate);
    }
  }, [selectedStudent, selectedDate, fetchStudentData, fetchDailyLogForStudent]);

  // Student CRUD
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      let updated;
      if (editingStudent) {
        updated = await api.updateStudent(editingStudent.id, studentForm);
        showToast('Alumno actualizado');
        if (selectedStudent?.id === editingStudent.id) {
          setSelectedStudent(updated);
        }
      } else {
        await api.createStudent(studentForm);
        showToast('Alumno creado');
      }
      setShowStudentModal(false);
      setEditingStudent(null);
      setStudentForm({ name: '', email: '', password: '', phone: '', notes: '', plan_type: 'both' });
      fetchStudents();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleToggleActive = async (id) => {
    try {
      await api.toggleStudentActive(id);
      fetchStudents();
      showToast('Estado actualizado');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('¿Eliminar este alumno? Se borrarán todos sus datos.')) return;
    try {
      await api.deleteStudent(id);
      if (selectedStudent?.id === id) setSelectedStudent(null);
      fetchStudents();
      showToast('Alumno eliminado');
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Exercise Library CRUD
  const handleSaveExercise = async (e) => {
    e.preventDefault();
    try {
      if (editingExercise) {
        await api.saveExercise({ id: editingExercise.id, ...exerciseForm });
        showToast('Ejercicio actualizado');
      } else {
        await api.saveExercise(exerciseForm);
        showToast('Ejercicio creado');
      }
      setShowExerciseModal(false);
      setEditingExercise(null);
      setExerciseForm({ name: '', video_url: '', description: '' });
      fetchExerciseLibrary();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeleteExercise = async (id) => {
    if (!window.confirm('¿Eliminar este ejercicio de la biblioteca?')) return;
    try {
      await api.deleteExercise(id);
      fetchExerciseLibrary();
      showToast('Ejercicio eliminado');
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Routine
  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    try {
      const dayIdx = jsDayToIndex(new Date(selectedDate + 'T12:00:00').getDay());
      const payload = routineWeekly
        ? { day_of_week: dayIdx, date: null, ...routineForm }
        : { date: selectedDate, day_of_week: dayIdx, ...routineForm };
      await api.saveRoutine(selectedStudent.id, payload);
      fetchStudentData(selectedStudent.id);
      setShowRoutineForm(false);
      showToast('Rutina guardada');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleSaveRoutineAsTemplate = async () => {
    const title = window.prompt('Nombre de la plantilla:', routineForm.title || 'Nueva Plantilla');
    if (!title) return;
    try {
      await api.saveRoutineTemplate({
        title,
        exercises: routineForm.exercises,
        notes: routineForm.notes
      });
      fetchTemplates();
      showToast('Plantilla de rutina guardada');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleLoadRoutineTemplate = (templateId) => {
    if (!templateId) return;
    const t = routineTemplates.find(x => x.id === parseInt(templateId));
    if (t) {
      setRoutineForm({
        title: t.title,
        exercises: t.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets || '',
          reps: ex.reps || '',
          rest: ex.rest || '',
          notes: ex.notes || '',
          group: ex.group || ''
        })),
        notes: t.notes || ''
      });
    }
  };

  const addExercise = () => {
    setRoutineForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, { name: '', sets: '', reps: '', rest: '', notes: '', group: '' }]
    }));
  };

  const updateExercise = (idx, field, value) => {
    setRoutineForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex)
    }));
  };

  const removeExercise = (idx) => {
    setRoutineForm(prev => ({ ...prev, exercises: prev.exercises.filter((_, i) => i !== idx) }));
  };

  const handleDeleteRoutine = async (id) => {
    try {
      await api.deleteRoutine(id);
      fetchStudentData(selectedStudent.id);
      showToast('Rutina eliminada');
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Meals
  const handleSaveMeal = async (e) => {
    e.preventDefault();
    try {
      const dayIdx = jsDayToIndex(new Date(selectedDate + 'T12:00:00').getDay());
      const payload = mealDaily
        ? { day_of_week: 7, date: null, ...mealForm }
        : mealWeekly
        ? { day_of_week: dayIdx, date: null, ...mealForm }
        : { date: selectedDate, day_of_week: dayIdx, ...mealForm };
      await api.saveMealPlan(selectedStudent.id, payload);
      fetchStudentData(selectedStudent.id);
      setShowMealForm(false);
      showToast('Plan nutricional guardado');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleSaveMealAsTemplate = async () => {
    const title = window.prompt('Nombre de la plantilla nutricional:', 'Nueva Plantilla');
    if (!title) return;
    try {
      await api.saveMealTemplate({
        title,
        meals: mealForm.meals,
        notes: mealForm.notes
      });
      fetchTemplates();
      showToast('Plantilla nutricional guardada');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleLoadMealTemplate = (templateId) => {
    if (!templateId) return;
    const t = mealTemplates.find(x => x.id === parseInt(templateId));
    if (t) {
      setMealForm({
        meals: t.meals,
        notes: t.notes || ''
      });
    }
  };

  const handleMealImageUpload = async (idx, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.uploadMealImage(selectedStudent.id, formData);
      updateMeal(idx, 'image', res.filename);
      showToast('Imagen subida');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const addMeal = () => {
    setMealForm(prev => ({
      ...prev,
      meals: [...prev.meals, { name: '', description: '', time: '', image: '' }]
    }));
  };

  const updateMeal = (idx, field, value) => {
    setMealForm(prev => ({
      ...prev,
      meals: prev.meals.map((m, i) => i === idx ? { ...m, [field]: value } : m)
    }));
  };

  const removeMeal = (idx) => {
    setMealForm(prev => ({ ...prev, meals: prev.meals.filter((_, i) => i !== idx) }));
  };

  const handleDeleteMeal = async (id) => {
    try {
      await api.deleteMealPlan(id);
      fetchStudentData(selectedStudent.id);
      showToast('Plan eliminado');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const openEditStudent = (s) => {
    setEditingStudent(s);
    setStudentForm({ name: s.name, email: s.email, password: '', phone: s.phone || '', notes: s.notes || '', plan_type: s.plan_type || 'both' });
    setShowStudentModal(true);
  };

  const openNewStudent = () => {
    setEditingStudent(null);
    setStudentForm({ name: '', email: '', password: '', phone: '', notes: '', plan_type: 'both' });
    setShowStudentModal(true);
  };

  const openRoutineEdit = (r) => {
    setRoutineForm({ 
      title: r ? r.title : '', 
      exercises: r ? r.exercises : [], 
      notes: r ? (r.notes || '') : '' 
    });
    setRoutineWeekly(r ? r.date === null : false);
    setShowRoutineForm(true);
  };

  const openMealEdit = (m) => {
    setMealForm({ meals: m ? m.meals : [], notes: m ? (m.notes || '') : '' });
    setMealDaily(m ? m.day_of_week === 7 : false);
    setMealWeekly(m ? (m.date === null && m.day_of_week !== 7) : false);
    setShowMealForm(true);
  };

  const handleDeleteRoutineTemplate = async (id) => {
    if (!window.confirm('¿Eliminar esta plantilla de rutina?')) return;
    try {
      await api.deleteRoutineTemplate(id);
      fetchTemplates();
      showToast('Plantilla eliminada');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeleteMealTemplate = async (id) => {
    if (!window.confirm('¿Eliminar esta plantilla nutricional?')) return;
    try {
      await api.deleteMealTemplate(id);
      fetchTemplates();
      showToast('Plantilla eliminada');
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Group routines exercises in admin view
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

  // Custom SVG Chart for Coach view
  const renderStudentWeightChart = () => {
    if (selectedStudentCheckins.length === 0) {
      return <p className="empty-state">El alumno no ha registrado pesos de progreso aún.</p>;
    }

    const sorted = [...selectedStudentCheckins].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weights = sorted.map(c => c.weight).filter(w => w !== null && w > 0);

    if (weights.length === 0) return <p className="empty-state">No hay registros de peso válidos.</p>;

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
      <div className="admin-chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="admin-svg-chart">
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="rgba(160,110,70,0.12)" strokeDasharray="3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight/2} x2={width - paddingRight} y2={paddingTop + chartHeight/2} stroke="rgba(160,110,70,0.12)" strokeDasharray="3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="rgba(160,110,70,0.25)" />

          {points.length > 1 && (
            <path d={pathD} fill="none" stroke="var(--text-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4.5" fill="var(--text-accent)" stroke="#fff" strokeWidth="1.5" />
              <text x={p.x} y={p.y - 7} fontSize="8" fontWeight="700" fill="var(--text-primary)" textAnchor="middle">{p.weight} kg</text>
              <text x={p.x} y={height - 8} fontSize="7.5" fill="var(--text-muted)" textAnchor="middle">{p.date}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const compareA = selectedStudentCheckins.find(c => c.id.toString() === photoCompareA);
  const compareB = selectedStudentCheckins.find(c => c.id.toString() === photoCompareB);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeCount = students.filter(s => s.active).length;
  const inactiveCount = students.filter(s => !s.active).length;

  return (
    <div className="admin-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="brand-vi">VI</span>
          <span className="sidebar-title">Panel Admin</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {[
            { key: 'dashboard', icon: '📊', label: 'Dashboard' },
            { key: 'students', icon: '👥', label: 'Alumnos' },
            { key: 'exercises', icon: '📖', label: 'Ejercicios' },
            { key: 'templates', icon: '📋', label: 'Plantillas' },
          ].map(tab => (
            <button key={tab.key} className={`sidebar-link ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.key); setSelectedStudent(null); setSidebarOpen(false); }}>
              <span className="sidebar-icon">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">Administrador</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>Salir</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Mobile top bar */}
        <div className="admin-mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)}>☰</button>
          <span className="brand-vi">VI</span>
          <span />
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="admin-page">
            <h1 className="page-title text-display">Dashboard</h1>
            <div className="stats-grid">
              <div className="stat-card stat-card-total">
                <div className="stat-card-icon">👥</div>
                <div className="stat-value">{students.length}</div>
                <div className="stat-label">Total Alumnos</div>
              </div>
              <div className="stat-card stat-card-active">
                <div className="stat-card-icon">✦</div>
                <div className="stat-value">{activeCount}</div>
                <div className="stat-label">Activos</div>
              </div>
              <div className="stat-card stat-card-inactive">
                <div className="stat-card-icon">○</div>
                <div className="stat-value">{inactiveCount}</div>
                <div className="stat-label">Inactivos</div>
              </div>
            </div>
            
            <div className="dashboard-sections-flex">
              <div className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2>Alumnos Recientes</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('students')}>Ver todos →</button>
                </div>
                <div className="student-list-mini">
                  {students.slice(0, 5).map(s => (
                    <div key={s.id} className="student-mini-card" onClick={() => { setSelectedStudent(s); setActiveTab('students'); }}>
                      <div className="student-mini-avatar">{s.name[0]}</div>
                      <div className="student-mini-info">
                        <span className="student-mini-name">{s.name}</span>
                        <span className="student-mini-email">{s.email}</span>
                      </div>
                      <span className={`badge ${s.active ? 'badge-active' : 'badge-inactive'}`}>
                        {s.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exercise Library Tab */}
        {activeTab === 'exercises' && (
          <div className="admin-page">
            <div className="page-header">
              <h1 className="page-title text-display">Biblioteca de Ejercicios</h1>
              <button className="btn btn-primary" onClick={() => { setEditingExercise(null); setExerciseForm({ name: '', video_url: '', description: '' }); setShowExerciseModal(true); }}>
                + Nuevo Ejercicio
              </button>
            </div>
            
            <div className="exercises-library-grid">
              {exerciseLibrary.map(ex => (
                <div key={ex.id} className="library-ex-card">
                  <div className="lib-ex-header">
                    <h3>{ex.name}</h3>
                    <div className="lib-ex-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingExercise(ex); setExerciseForm({ name: ex.name, video_url: ex.video_url || '', description: ex.description || '' }); setShowExerciseModal(true); }}>✏️</button>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDeleteExercise(ex.id)}>🗑️</button>
                    </div>
                  </div>
                  {ex.description && <p className="lib-ex-desc">{ex.description}</p>}
                  {ex.video_url && (
                    <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="lib-ex-video-link">
                      🎥 Ver video de técnica
                    </a>
                  )}
                </div>
              ))}
              {exerciseLibrary.length === 0 && <p className="empty-state">No hay ejercicios cargados en la biblioteca.</p>}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="admin-page">
            <h1 className="page-title text-display">Plantillas</h1>
            
            <div className="templates-sections-grid">
              {/* Routine Templates */}
              <div className="templates-column-section">
                <h2>🏋️ Plantillas de Rutinas</h2>
                <div className="templates-list-box">
                  {routineTemplates.map(t => (
                    <div key={t.id} className="template-item-card">
                      <div className="template-item-header">
                        <strong>{t.title}</strong>
                        <button className="btn-delete-template" onClick={() => handleDeleteRoutineTemplate(t.id)}>🗑️</button>
                      </div>
                      <span className="template-ex-count">{t.exercises.length} ejercicios</span>
                      {t.notes && <p className="template-notes">{t.notes}</p>}
                    </div>
                  ))}
                  {routineTemplates.length === 0 && <p className="empty-state">Sin plantillas de rutina.</p>}
                </div>
              </div>

              {/* Meal Templates */}
              <div className="templates-column-section">
                <h2>🥗 Plantillas de Alimentación</h2>
                <div className="templates-list-box">
                  {mealTemplates.map(t => (
                    <div key={t.id} className="template-item-card">
                      <div className="template-item-header">
                        <strong>{t.title}</strong>
                        <button className="btn-delete-template" onClick={() => handleDeleteMealTemplate(t.id)}>🗑️</button>
                      </div>
                      <span className="template-ex-count">{t.meals.length} comidas</span>
                      {t.notes && <p className="template-notes">{t.notes}</p>}
                    </div>
                  ))}
                  {mealTemplates.length === 0 && <p className="empty-state">Sin plantillas nutricionales.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students List */}
        {activeTab === 'students' && !selectedStudent && (
          <div className="admin-page">
            <div className="page-header">
              <h1 className="page-title text-display">Alumnos</h1>
              <button className="btn btn-primary" onClick={openNewStudent}>+ Nuevo Alumno</button>
            </div>
            <div className="students-grid">
              {students.map(s => (
                <div key={s.id} className="student-card">
                  <div className="student-card-header">
                    <div className="student-avatar">{s.name[0]}</div>
                    <div className="student-info">
                      <h3>{s.name}</h3>
                      <p>{s.email}</p>
                    </div>
                    <span className={`badge ${s.active ? 'badge-active' : 'badge-inactive'}`}>
                      {s.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {s.phone && <p className="student-phone">📱 {s.phone}</p>}
                  <div className="student-plan-type-badge">
                    {s.plan_type === 'routine' && <span className="plan-badge plan-badge--routine">🏋️ Solo Rutina</span>}
                    {s.plan_type === 'meal' && <span className="plan-badge plan-badge--meal">🥗 Solo Alimentación</span>}
                    {(!s.plan_type || s.plan_type === 'both') && <span className="plan-badge plan-badge--both">✨ Rutina + Alimentación</span>}
                  </div>
                  <div className="student-card-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => { setSelectedStudent(s); setSelectedDate(formatDate(today)); }}>Ver Plan & Progreso</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEditStudent(s)}>Editar</button>
                    <button className={`btn btn-sm ${s.active ? 'btn-danger' : 'btn-success'}`} onClick={() => handleToggleActive(s.id)}>
                      {s.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="btn btn-danger-outline btn-sm" onClick={() => handleDeleteStudent(s.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
              {students.length === 0 && <p className="empty-state">No hay alumnos registrados aún.</p>}
            </div>
          </div>
        )}

        {/* Student Detail (Routines, Meals and progression tracking) */}
        {activeTab === 'students' && selectedStudent && (() => {
          const buildAdminCal = () => {
            const first = new Date(calViewYear, calViewMonth, 1);
            const last = new Date(calViewYear, calViewMonth + 1, 0);
            const offset = jsDayToIndex(first.getDay());
            const days = [];
            for (let i = 0; i < offset; i++) days.push(null);
            for (let d = 1; d <= last.getDate(); d++) days.push(new Date(calViewYear, calViewMonth, d));
            return days;
          };
          const calDays = buildAdminCal();
          const selectedDayIdx = jsDayToIndex(new Date(selectedDate + 'T12:00:00').getDay());
          const dayRoutine = routines.find(r => r.date === selectedDate)
            || routines.find(r => r.date === null && r.day_of_week === selectedDayIdx);
          const dayMeal = mealPlans.find(m => m.date === selectedDate)
            || mealPlans.find(m => m.date === null && m.day_of_week === selectedDayIdx)
            || mealPlans.find(m => m.date === null && m.day_of_week === 7);

          const hasContent = (date) => {
            if (!date) return false;
            const dStr = formatDate(date);
            const dIdx = jsDayToIndex(date.getDay());
            const hasDailyMeal = mealPlans.some(m => m.date === null && m.day_of_week === 7);
            return routines.some(r => r.date === dStr || (r.date === null && r.day_of_week === dIdx))
              || hasDailyMeal
              || mealPlans.some(m => m.date === dStr || (m.date === null && m.day_of_week === dIdx));
          };
          const isToday = (date) => date && isSameDay(date, today);

          return (
            <div className="admin-page">
              <div className="page-header">
                <button className="btn btn-ghost" onClick={() => setSelectedStudent(null)}>← Volver</button>
                <h1 className="page-title text-display">{selectedStudent.name}</h1>
                <span className={`badge ${selectedStudent.active ? 'badge-active' : 'badge-inactive'}`}>
                  {selectedStudent.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
              ) : (
                <div className="student-profile-flex">
                  {/* Left Column: Calendar and Plans */}
                  <div className="student-plans-column">
                    <button className="date-chip" onClick={() => setCalOpen(o => !o)}>
                      <span className="date-chip-day">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long' })}</span>
                      <span className="date-chip-full">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <span className={`date-chip-arrow ${calOpen ? 'open' : ''}`}>›</span>
                    </button>

                    <div className={`cal-wrapper ${calOpen ? 'cal-wrapper--open' : ''}`}>
                      <div className="admin-cal-card">
                        <div className="admin-cal-nav">
                          <button className="cal-nav-btn" onClick={() => { if (calViewMonth === 0) { setCalViewMonth(11); setCalViewYear(y => y-1); } else setCalViewMonth(m => m-1); }}>‹</button>
                          <span className="admin-cal-month">{MONTH_NAMES[calViewMonth]} {calViewYear}</span>
                          <button className="cal-nav-btn" onClick={() => { if (calViewMonth === 11) { setCalViewMonth(0); setCalViewYear(y => y+1); } else setCalViewMonth(m => m+1); }}>›</button>
                        </div>
                        <div className="admin-cal-grid">
                          {DAY_SHORT_CAL.map(d => <div key={d} className="cal-weekday">{d}</div>)}
                          {calDays.map((date, i) => {
                            const dStr = date ? formatDate(date) : null;
                            return (
                              <div
                                key={i}
                                className={[
                                  'admin-cal-day',
                                  !date ? 'cal-day--empty' : '',
                                  date && isToday(date) ? 'cal-day--today' : '',
                                  dStr === selectedDate ? 'admin-cal-day--selected' : '',
                                  date && hasContent(date) ? 'cal-day--has-content' : '',
                                ].join(' ')}
                                onClick={() => {
                                  if (!date) return;
                                  setSelectedDate(formatDate(date));
                                  setCalOpen(false);
                                }}
                              >
                                {date && (
                                  <>
                                    <span className="cal-day-num">{date.getDate()}</span>
                                    {hasContent(date) && <span className="cal-dot" />}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="admin-cal-legend">
                          <span className="cal-legend-dot" /> Día con plan cargado
                        </div>
                      </div>
                    </div>

                    {/* Alumn log/feedback card for selected day */}
                    {selectedStudentDailyLog && (
                      <div className="student-day-logs-card">
                        <h3>📋 Registro del Alumno para este día</h3>
                        <div className="day-log-meta">
                          <span className={`log-completed-badge ${selectedStudentDailyLog.workout_completed ? 'yes' : 'no'}`}>
                            {selectedStudentDailyLog.workout_completed ? '✅ Rutina Completada' : '❌ Rutina Pendiente'}
                          </span>
                        </div>
                        
                        {/* Render weights logged by student */}
                        {Object.keys(studentLogMap).length > 0 && (
                          <div className="student-logged-sets">
                            <h4>Pesos y series marcados:</h4>
                            {Object.entries(studentLogMap).map(([exName, sets]) => (
                              <div key={exName} className="logged-ex-row">
                                <strong>{exName}:</strong>
                                <div className="logged-sets-list">
                                  {sets.map((set, sIdx) => (
                                    <span key={sIdx} className={`logged-set-pill ${set.completed ? 'done' : 'pending'}`}>
                                      S{sIdx+1}: {set.reps || '-'} x {set.weight || '-'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedStudentDailyLog.workout_feedback && (
                          <div className="feedback-quote-box">
                            <strong>Comentario del entrenamiento:</strong>
                            <p>"{selectedStudentDailyLog.workout_feedback}"</p>
                          </div>
                        )}
                        {selectedStudentDailyLog.meal_feedback && (
                          <div className="feedback-quote-box">
                            <strong>Comentario de alimentación:</strong>
                            <p>"{selectedStudentDailyLog.meal_feedback}"</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Plan contents */}
                    {(() => {
                      const pt = selectedStudent.plan_type || 'both';
                      const showRoutine = pt === 'both' || pt === 'routine';
                      const showMeal    = pt === 'both' || pt === 'meal';
                      return (
                        <div className="plans-editor-area">
                          {/* Rutina */}
                          {showRoutine && (
                            <div className="detail-section">
                              <div className="detail-section-header">
                                <h2>🏋️ Rutina — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</h2>
                                <button className="btn btn-primary btn-sm" onClick={() => openRoutineEdit(dayRoutine || null)}>
                                  {dayRoutine ? '✏️ Editar' : '+ Crear'}
                                </button>
                              </div>
                              {dayRoutine ? (
                                <div className="card routine-card">
                                  <div className="routine-header">
                                    <h3>{dayRoutine.title}</h3>
                                    {dayRoutine.date === null && <span className="badge-weekly">🔁 Semanal</span>}
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteRoutine(dayRoutine.id)}>🗑️</button>
                                  </div>
                                  
                                  {dayRoutine.exercises.length > 0 && (
                                    <div className="exercises-list">
                                      {groupExercises(dayRoutine.exercises).map((block, bIdx) => {
                                        if (block.type === 'combined') {
                                          return (
                                            <div key={bIdx} className="admin-combined-ex-block">
                                              <div className="comb-header">Combinado {block.groupName}</div>
                                              {block.exercises.map((ex) => (
                                                <div key={ex.originalIndex} className="exercise-item combined">
                                                  <div className="exercise-details">
                                                    <strong>{ex.name}</strong>
                                                    <span>{ex.sets && `${ex.sets} series`} {ex.reps && `× ${ex.reps}`} {ex.rest && `· ${ex.rest} desc.`}</span>
                                                    {ex.notes && <small>{ex.notes}</small>}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        } else {
                                          const ex = block.exercise;
                                          return (
                                            <div key={ex.originalIndex} className="exercise-item">
                                              <span className="exercise-num">{bIdx + 1}</span>
                                              <div className="exercise-details">
                                                <strong>{ex.name}</strong>
                                                <span>{ex.sets && `${ex.sets} series`} {ex.reps && `× ${ex.reps}`} {ex.rest && `· ${ex.rest} desc.`}</span>
                                                {ex.notes && <small>{ex.notes}</small>}
                                              </div>
                                            </div>
                                          );
                                        }
                                      })}
                                    </div>
                                  )}
                                  {dayRoutine.notes && <p className="routine-notes">📝 {dayRoutine.notes}</p>}
                                </div>
                              ) : <p className="empty-state">Sin rutina para este día.</p>}
                            </div>
                          )}

                          {/* Alimentación */}
                          {showMeal && (
                            <div className="detail-section">
                              <div className="detail-section-header">
                                <h2>🥗 Alimentación — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</h2>
                                <button className="btn btn-primary btn-sm" onClick={() => openMealEdit(dayMeal || null)}>
                                  {dayMeal ? '✏️ Editar' : '+ Crear'}
                                </button>
                              </div>
                              {dayMeal ? (
                                <div className="card meal-card">
                                  <div className="routine-header">
                                    <h3>Plan del día</h3>
                                    {dayMeal.date === null && dayMeal.day_of_week === 7 && <span className="badge-weekly">🔁 Diario</span>}
                                    {dayMeal.date === null && dayMeal.day_of_week !== 7 && <span className="badge-weekly">🔁 Semanal</span>}
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteMeal(dayMeal.id)}>🗑️</button>
                                  </div>
                                  {dayMeal.meals.length > 0 && (
                                    <div className="meals-list">
                                      {dayMeal.meals.map((meal, i) => (
                                        <div key={i} className="meal-item">
                                          <div className="meal-time">{meal.time || '--:--'}</div>
                                          <div className="meal-details">
                                            <strong>{meal.name}</strong>
                                            {meal.description && <p>{meal.description}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {dayMeal.notes && <p className="routine-notes">📝 {dayMeal.notes}</p>}
                                </div>
                              ) : <p className="empty-state">Sin plan para este día.</p>}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column: Weight and Progress Tracking */}
                  <div className="student-progress-column">
                    <div className="student-progress-card">
                      <h3>📈 Evolución de Peso Corporal</h3>
                      {renderStudentWeightChart()}
                    </div>

                    {/* Progress photos list & side-by-side comparison */}
                    {selectedStudentCheckins.length > 0 && (
                      <div className="student-progress-card">
                        <h3>📷 Fotos de Progreso</h3>
                        
                        {selectedStudentCheckins.length >= 2 && (
                          <div className="admin-photo-compare-box">
                            <h4>Comparar antes/después</h4>
                            <div className="compare-selectors-row">
                              <select value={photoCompareA} onChange={e => setPhotoCompareA(e.target.value)}>
                                {selectedStudentCheckins.map(c => (
                                  <option key={c.id} value={c.id}>{c.date.split('-').reverse().join('/')}</option>
                                ))}
                              </select>
                              <span>vs</span>
                              <select value={photoCompareB} onChange={e => setPhotoCompareB(e.target.value)}>
                                {selectedStudentCheckins.map(c => (
                                  <option key={c.id} value={c.id}>{c.date.split('-').reverse().join('/')}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="compare-type-row">
                              <button className={compareType === 'photo_front' ? 'active' : ''} onClick={() => setCompareType('photo_front')}>Frente</button>
                              <button className={compareType === 'photo_side' ? 'active' : ''} onClick={() => setCompareType('photo_side')}>Perfil</button>
                              <button className={compareType === 'photo_back' ? 'active' : ''} onClick={() => setCompareType('photo_back')}>Espalda</button>
                            </div>

                            <div className="admin-compare-view">
                              <div className="compare-img-wrap">
                                <small>{compareA ? compareA.date.split('-').reverse().join('/') : ''}</small>
                                {compareA && compareA[compareType] ? (
                                  <img 
                                    src={`/uploads/checkins/${selectedStudent.id}/${compareA[compareType]}`} 
                                    alt="Antes" 
                                    onClick={() => setLightboxImg({ url: `/uploads/checkins/${selectedStudent.id}/${compareA[compareType]}`, description: `Antes: ${compareA.date}` })}
                                  />
                                ) : <div className="no-photo-slot">Sin foto</div>}
                              </div>
                              <div className="compare-img-wrap">
                                <small>{compareB ? compareB.date.split('-').reverse().join('/') : ''}</small>
                                {compareB && compareB[compareType] ? (
                                  <img 
                                    src={`/uploads/checkins/${selectedStudent.id}/${compareB[compareType]}`} 
                                    alt="Después"
                                    onClick={() => setLightboxImg({ url: `/uploads/checkins/${selectedStudent.id}/${compareB[compareType]}`, description: `Después: ${compareB.date}` })}
                                  />
                                ) : <div className="no-photo-slot">Sin foto</div>}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="photos-history-strip">
                          <h4>Historial de fotos subidas:</h4>
                          <div className="strip-grid">
                            {selectedStudentCheckins.map(c => (
                              <div key={c.id} className="strip-date-group">
                                <h5>{c.date.split('-').reverse().join('/')}</h5>
                                <div className="strip-thumbs">
                                  {c.photo_front && <img src={`/uploads/checkins/${selectedStudent.id}/${c.photo_front}`} alt="Front" onClick={() => setLightboxImg({ url: `/uploads/checkins/${selectedStudent.id}/${c.photo_front}`, description: `Frente - ${c.date}` })} />}
                                  {c.photo_side && <img src={`/uploads/checkins/${selectedStudent.id}/${c.photo_side}`} alt="Side" onClick={() => setLightboxImg({ url: `/uploads/checkins/${selectedStudent.id}/${c.photo_side}`, description: `Perfil - ${c.date}` })} />}
                                  {c.photo_back && <img src={`/uploads/checkins/${selectedStudent.id}/${c.photo_back}`} alt="Back" onClick={() => setLightboxImg({ url: `/uploads/checkins/${selectedStudent.id}/${c.photo_back}`, description: `Espalda - ${c.date}` })} />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* Student Modal */}
      {showStudentModal && (
        <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowStudentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveStudent}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="form-input" value={studentForm.name} onChange={e => setStudentForm(p => ({...p, name: e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={studentForm.email} onChange={e => setStudentForm(p => ({...p, email: e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña{editingStudent ? ' (dejar vacío para no cambiar)' : ''}</label>
                  <input type="password" className="form-input" value={studentForm.password} onChange={e => setStudentForm(p => ({...p, password: e.target.value}))} {...(!editingStudent ? {required: true} : {})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={studentForm.phone} onChange={e => setStudentForm(p => ({...p, phone: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de Plan</label>
                  <div className="plan-type-selector">
                    {[
                      { value: 'both',    icon: '✨', label: 'Rutina + Alimentación' },
                      { value: 'routine', icon: '🏋️', label: 'Solo Rutina' },
                      { value: 'meal',    icon: '🥗', label: 'Solo Alimentación' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`plan-type-btn ${studentForm.plan_type === opt.value ? 'plan-type-btn--active' : ''}`}
                        onClick={() => setStudentForm(p => ({ ...p, plan_type: opt.value }))}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea className="form-input" value={studentForm.notes} onChange={e => setStudentForm(p => ({...p, notes: e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStudentModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {showExerciseModal && (
        <div className="modal-overlay" onClick={() => setShowExerciseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowExerciseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveExercise}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Ejercicio</label>
                  <input className="form-input" value={exerciseForm.name} onChange={e => setExerciseForm(p => ({...p, name: e.target.value}))} required placeholder="Ej: Sentadilla Búlgara" />
                </div>
                <div className="form-group">
                  <label className="form-label">URL del Video de Técnica (YouTube / Instagram)</label>
                  <input className="form-input" value={exerciseForm.video_url} onChange={e => setExerciseForm(p => ({...p, video_url: e.target.value}))} placeholder="Ej: https://www.youtube.com/watch?v=..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Instrucciones / Descripción</label>
                  <textarea className="form-input" value={exerciseForm.description} onChange={e => setExerciseForm(p => ({...p, description: e.target.value}))} rows={4} placeholder="Explicar postura, agarre, etc..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExerciseModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Routine Modal */}
      {showRoutineForm && (() => {
        const modalDayName = DAYS[jsDayToIndex(new Date(selectedDate + 'T12:00:00').getDay())];
        return (
          <div className="modal-overlay" onClick={() => setShowRoutineForm(false)}>
            <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Rutina - {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowRoutineForm(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveRoutine}>
                <div className="modal-body">
                  <div className="templates-selector-row">
                    <label>Cargar plantilla:</label>
                    <select onChange={e => handleLoadRoutineTemplate(e.target.value)} defaultValue="">
                      <option value="">-- Seleccionar Plantilla --</option>
                      {routineTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Frecuencia</label>
                    <div className="plan-type-selector">
                      <button type="button" className={`plan-type-btn ${!routineWeekly ? 'plan-type-btn--active' : ''}`} onClick={() => setRoutineWeekly(false)}>
                        <span>📅</span><span>Solo este {modalDayName.toLowerCase()}</span>
                      </button>
                      <button type="button" className={`plan-type-btn ${routineWeekly ? 'plan-type-btn--active' : ''}`} onClick={() => setRoutineWeekly(true)}>
                        <span>🔁</span><span>Todos los {modalDayName.toLowerCase()}s</span>
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Título de Rutina</label>
                    <input className="form-input" value={routineForm.title} onChange={e => setRoutineForm(p => ({...p, title: e.target.value}))} required placeholder="Ej: Tren Superior" />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Ejercicios</label>
                    <div className="exercise-form-table-header">
                      <span>Ejercicio (Autocompleta)</span>
                      <span>Series</span>
                      <span>Reps</span>
                      <span>Desc.</span>
                      <span>Bloque / Comb.</span>
                      <span>Notas</span>
                      <span></span>
                    </div>

                    {routineForm.exercises.map((ex, i) => (
                      <div key={i} className="exercise-form-row">
                        <div className="input-autocomplete-wrap">
                          <input 
                            className="form-input" 
                            placeholder="Nombre ejercicio" 
                            value={ex.name} 
                            list="exercise-autocomplete-list"
                            onChange={e => updateExercise(i, 'name', e.target.value)} 
                          />
                        </div>
                        <input className="form-input" placeholder="Series" value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} style={{maxWidth:'60px'}} />
                        <input className="form-input" placeholder="Reps" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} style={{maxWidth:'60px'}} />
                        <input className="form-input" placeholder="Desc. (s)" value={ex.rest} onChange={e => updateExercise(i, 'rest', e.target.value)} style={{maxWidth:'60px'}} />
                        
                        {/* Group field for supersets */}
                        <select 
                          className="form-input select-block-group" 
                          value={ex.group || ''} 
                          onChange={e => updateExercise(i, 'group', e.target.value)}
                        >
                          <option value="">Sola</option>
                          <option value="A">Comb. A</option>
                          <option value="B">Comb. B</option>
                          <option value="C">Comb. C</option>
                          <option value="D">Comb. D</option>
                        </select>

                        <input className="form-input" placeholder="Notas/Técnica..." value={ex.notes} onChange={e => updateExercise(i, 'notes', e.target.value)} />
                        
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeExercise(i)}>🗑️</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addExercise} style={{ marginTop: '0.5rem' }}>+ Agregar Ejercicio</button>
                  </div>
                  
                  <datalist id="exercise-autocomplete-list">
                    {exerciseLibrary.map(e => <option key={e.id} value={e.name} />)}
                  </datalist>

                  <div className="form-group">
                    <label className="form-label">Notas Generales de la Sesión</label>
                    <textarea className="form-input" value={routineForm.notes} onChange={e => setRoutineForm(p => ({...p, notes: e.target.value}))} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={handleSaveRoutineAsTemplate}>💾 Guardar como Plantilla</button>
                  <div style={{ flex: 1 }} />
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRoutineForm(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Meal Modal */}
      {showMealForm && (() => {
        const modalDayName = DAYS[jsDayToIndex(new Date(selectedDate + 'T12:00:00').getDay())];
        return (
          <div className="modal-overlay" onClick={() => setShowMealForm(false)}>
            <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Alimentación - {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowMealForm(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveMeal}>
                <div className="modal-body">
                  <div className="templates-selector-row">
                    <label>Cargar plantilla:</label>
                    <select onChange={e => handleLoadMealTemplate(e.target.value)} defaultValue="">
                      <option value="">-- Seleccionar Plantilla --</option>
                      {mealTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Frecuencia</label>
                    <div className="plan-type-selector">
                      <button type="button" className={`plan-type-btn ${!mealWeekly && !mealDaily ? 'plan-type-btn--active' : ''}`} onClick={() => { setMealWeekly(false); setMealDaily(false); }}>
                        <span>📅</span><span>Solo este {modalDayName.toLowerCase()}</span>
                      </button>
                      <button type="button" className={`plan-type-btn ${mealWeekly ? 'plan-type-btn--active' : ''}`} onClick={() => { setMealWeekly(true); setMealDaily(false); }}>
                        <span>🔁</span><span>Todos los {modalDayName.toLowerCase()}s</span>
                      </button>
                      <button type="button" className={`plan-type-btn ${mealDaily ? 'plan-type-btn--active' : ''}`} onClick={() => { setMealDaily(true); setMealWeekly(false); }}>
                        <span>📆</span><span>Todos los días</span>
                      </button>
                    </div>
                  </div>
                  
                  {mealForm.meals.map((meal, i) => (
                    <div key={i} className="meal-form-row">
                      <div className="meal-form-top">
                        <input className="form-input" placeholder="Ej: Desayuno" value={meal.name} onChange={e => updateMeal(i, 'name', e.target.value)} />
                        <input className="form-input meal-time-input" placeholder="Hora" value={meal.time} onChange={e => updateMeal(i, 'time', e.target.value)} />
                        <button type="button" className="btn btn-ghost btn-sm meal-remove-btn" onClick={() => removeMeal(i)}>✕</button>
                      </div>
                      <textarea className="form-input" placeholder="Descripción de la comida..." value={meal.description} onChange={e => updateMeal(i, 'description', e.target.value)} rows={2} />
                      <div className="meal-image-upload">
                        {meal.image ? (
                          <div className="meal-image-preview">
                            <img src={`/uploads/meals/${meal.image}`} alt="preview" />
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateMeal(i, 'image', '')}>✕ Quitar</button>
                          </div>
                        ) : (
                          <label className="meal-image-label">
                            📷 Agregar imagen de referencia
                            <input type="file" accept="image/*" hidden onChange={e => handleMealImageUpload(i, e.target.files[0])} />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addMeal}>+ Agregar Comida</button>
                  <div className="form-group" style={{marginTop:'1rem'}}>
                    <label className="form-label">Notas</label>
                    <textarea className="form-input" value={mealForm.notes} onChange={e => setMealForm(p => ({...p, notes: e.target.value}))} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={handleSaveMealAsTemplate}>💾 Guardar como Plantilla</button>
                  <div style={{ flex: 1 }} />
                  <button type="button" className="btn btn-secondary" onClick={() => setShowMealForm(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}><span className="toast-message">{toast.message}</span></div>
        </div>
      )}
    </div>
  );
}
