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
  const [activeTab, setActiveTab] = useState('dashboard');
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

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const fetchStudentData = useCallback(async (studentId) => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([
        api.getRoutines(studentId),
        api.getMealPlans(studentId),
      ]);
      setRoutines(r);
      setMealPlans(m);
    } catch (err) { showToast(err.message, 'error'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedStudent) fetchStudentData(selectedStudent.id);
  }, [selectedStudent, fetchStudentData]);

  // Student CRUD
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    console.log('[DEBUG] plan_type al guardar =', JSON.stringify(studentForm.plan_type));
    console.log('[DEBUG] studentForm completo =', JSON.stringify(studentForm));

    try {
      let updated;
      if (editingStudent) {
        updated = await api.updateStudent(editingStudent.id, studentForm);
        showToast('Alumno actualizado');
        // If we're viewing this student's plan, refresh selectedStudent immediately
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

  const addExercise = () => {
    setRoutineForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, { name: '', sets: '', reps: '', rest: '', notes: '' }]
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
      const payload = mealWeekly
        ? { day_of_week: dayIdx, date: null, ...mealForm }
        : { date: selectedDate, day_of_week: dayIdx, ...mealForm };
      await api.saveMealPlan(selectedStudent.id, payload);
      fetchStudentData(selectedStudent.id);
      setShowMealForm(false);
      showToast('Plan nutricional guardado');
    } catch (err) { showToast(err.message, 'error'); }
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
    setRoutineForm({ title: r ? r.title : '', exercises: r ? r.exercises : [], notes: r ? (r.notes || '') : '' });
    setRoutineWeekly(r ? r.date === null : false);
    setShowRoutineForm(true);
  };

  const openMealEdit = (m) => {
    setMealForm({ meals: m ? m.meals : [], notes: m ? (m.notes || '') : '' });
    setMealWeekly(m ? m.date === null : false);
    setShowMealForm(true);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeCount = students.filter(s => s.active).length;
  const inactiveCount = students.filter(s => !s.active).length;

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
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
          ].map(tab => (
            <button key={tab.key} className={`sidebar-link ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.key); setSelectedStudent(null); }}>
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
                    <button className="btn btn-outline btn-sm" onClick={() => { setSelectedStudent(s); setSelectedDate(formatDate(today)); }}>Ver Plan</button>
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

        {/* Student Detail */}
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
            || mealPlans.find(m => m.date === null && m.day_of_week === selectedDayIdx);

          const hasContent = (date) => {
            if (!date) return false;
            const dStr = formatDate(date);
            const dIdx = jsDayToIndex(date.getDay());
            return routines.some(r => r.date === dStr || (r.date === null && r.day_of_week === dIdx))
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
                <>
                  {/* Admin Calendar — collapsible chip */}
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

                  {/* Day content */}
                  {(() => {
                    const pt = selectedStudent.plan_type || 'both';
                    const showRoutine = pt === 'both' || pt === 'routine';
                    const showMeal    = pt === 'both' || pt === 'meal';
                    return (
                      <div className={`student-detail-grid ${!showRoutine || !showMeal ? 'student-detail-grid--single' : ''}`}>
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
                                  {dayRoutine.exercises.map((ex, i) => (
                                    <div key={i} className="exercise-item">
                                      <span className="exercise-num">{i + 1}</span>
                                      <div className="exercise-details">
                                        <strong>{ex.name}</strong>
                                        <span>{ex.sets && `${ex.sets} series`} {ex.reps && `× ${ex.reps}`} {ex.rest && `· ${ex.rest} desc.`}</span>
                                        {ex.notes && <small>{ex.notes}</small>}
                                      </div>
                                    </div>
                                  ))}
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
                                {dayMeal.date === null && <span className="badge-weekly">🔁 Semanal</span>}
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
                </>
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
                  <label className="form-label">Título</label>
                  <input className="form-input" value={routineForm.title} onChange={e => setRoutineForm(p => ({...p, title: e.target.value}))} required placeholder="Ej: Tren Superior" />
                </div>
                <div className="form-group">
                  <label className="form-label">Ejercicios</label>
                  {routineForm.exercises.map((ex, i) => (
                    <div key={i} className="exercise-form-row">
                      <input className="form-input" placeholder="Ejercicio" value={ex.name} onChange={e => updateExercise(i, 'name', e.target.value)} />
                      <input className="form-input" placeholder="Series" value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} style={{maxWidth:'80px'}} />
                      <input className="form-input" placeholder="Reps" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} style={{maxWidth:'80px'}} />
                      <input className="form-input" placeholder="Desc." value={ex.rest} onChange={e => updateExercise(i, 'rest', e.target.value)} style={{maxWidth:'80px'}} />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeExercise(i)}>🗑️</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addExercise}>+ Agregar Ejercicio</button>
                </div>
                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea className="form-input" value={routineForm.notes} onChange={e => setRoutineForm(p => ({...p, notes: e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
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
                <div className="form-group">
                  <label className="form-label">Frecuencia</label>
                  <div className="plan-type-selector">
                    <button type="button" className={`plan-type-btn ${!mealWeekly ? 'plan-type-btn--active' : ''}`} onClick={() => setMealWeekly(false)}>
                      <span>📅</span><span>Solo este {modalDayName.toLowerCase()}</span>
                    </button>
                    <button type="button" className={`plan-type-btn ${mealWeekly ? 'plan-type-btn--active' : ''}`} onClick={() => setMealWeekly(true)}>
                      <span>🔁</span><span>Todos los {modalDayName.toLowerCase()}s</span>
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowMealForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}><span className="toast-message">{toast.message}</span></div>
        </div>
      )}
    </div>
  );
}
