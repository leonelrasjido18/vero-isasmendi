const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('vi_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error del servidor');
  }
  return data;
};

// Auth
export const login = (email, password) =>
  fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(handleResponse);

export const verifyToken = () =>
  fetch(`${API_BASE}/auth/verify`, {
    headers: getHeaders(),
  }).then(handleResponse);

// Students
export const getStudents = () =>
  fetch(`${API_BASE}/students`, { headers: getHeaders() }).then(handleResponse);

export const getStudent = (id) =>
  fetch(`${API_BASE}/students/${id}`, { headers: getHeaders() }).then(handleResponse);

export const createStudent = (data) =>
  fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const updateStudent = (id, data) =>
  fetch(`${API_BASE}/students/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const toggleStudentActive = (id) =>
  fetch(`${API_BASE}/students/${id}/toggle-active`, {
    method: 'PATCH',
    headers: getHeaders(),
  }).then(handleResponse);

export const deleteStudent = (id) =>
  fetch(`${API_BASE}/students/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  }).then(handleResponse);

// Routines
export const getRoutines = (userId, day) => {
  const params = day !== undefined ? `?day=${day}` : '';
  return fetch(`${API_BASE}/routines/user/${userId}${params}`, {
    headers: getHeaders(),
  }).then(handleResponse);
};

export const saveRoutine = (userId, data) =>
  fetch(`${API_BASE}/routines/user/${userId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const updateRoutine = (id, data) =>
  fetch(`${API_BASE}/routines/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const deleteRoutine = (id) =>
  fetch(`${API_BASE}/routines/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  }).then(handleResponse);

// Meal Plans
export const getMealPlans = (userId, day) => {
  const params = day !== undefined ? `?day=${day}` : '';
  return fetch(`${API_BASE}/meals/user/${userId}${params}`, {
    headers: getHeaders(),
  }).then(handleResponse);
};

export const saveMealPlan = (userId, data) =>
  fetch(`${API_BASE}/meals/user/${userId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const updateMealPlan = (id, data) =>
  fetch(`${API_BASE}/meals/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const deleteMealPlan = (id) =>
  fetch(`${API_BASE}/meals/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  }).then(handleResponse);

export const uploadMealImage = (userId, formData) => {
  const token = localStorage.getItem('vi_token');
  return fetch(`${API_BASE}/meals/upload-image/${userId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }).then(handleResponse);
};

// Images
export const getImages = (userId) =>
  fetch(`${API_BASE}/images/user/${userId}`, {
    headers: getHeaders(),
  }).then(handleResponse);

export const uploadImage = (userId, formData) => {
  const token = localStorage.getItem('vi_token');
  return fetch(`${API_BASE}/images/user/${userId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }).then(handleResponse);
};

export const deleteImage = (id) =>
  fetch(`${API_BASE}/images/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  }).then(handleResponse);
