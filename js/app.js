/* ============================================================
   app.js — Core: seed data, auth, router, localStorage helpers
   ============================================================ */

// ---- localStorage availability check ----
(function checkStorage() {
  try {
    localStorage.setItem('_sms_test', '1');
    localStorage.removeItem('_sms_test');
  } catch (e) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f4f8;font-family:sans-serif">
        <div style="background:#fff;padding:40px;border-radius:12px;text-align:center;max-width:420px;box-shadow:0 8px 24px rgba(0,0,0,.1)">
          <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#e74c3c;display:block;margin-bottom:16px"></i>
          <h2 style="margin-bottom:8px">Storage Unavailable</h2>
          <p style="color:#7f8c8d">This app requires browser storage (localStorage). Please disable private/incognito mode or enable cookies and try again.</p>
        </div>
      </div>`;
    throw new Error('localStorage unavailable');
  }
})();

// ---- localStorage helpers ----
const DB = {
  get: key => JSON.parse(localStorage.getItem(key) || '[]'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  getOne: (key, id) => DB.get(key).find(x => x.id === id) || null,
  save: (key, item) => {
    const list = DB.get(key);
    const idx = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    DB.set(key, list);
  },
  remove: (key, id) => DB.set(key, DB.get(key).filter(x => x.id !== id)),
  nextId: key => {
    const list = DB.get(key);
    return list.length ? Math.max(...list.map(x => x.id)) + 1 : 1;
  }
};

// ---- Seed default data ----
function seedData() {
  if (localStorage.getItem('sms_seeded')) return;

  DB.set('sms_users', [
    { id: 1, name: 'Admin User',    email: 'admin@school.com',   password: 'admin123', role: 'admin'   },
    { id: 2, name: 'John Smith',    email: 'teacher@school.com', password: 'teach123', role: 'teacher' },
    { id: 3, name: 'Alice Johnson', email: 'student@school.com', password: 'study123', role: 'student' }
  ]);

  DB.set('sms_teachers', [
    { id: 1, name: 'John Smith',    email: 'teacher@school.com', subject: 'Mathematics', phone: '555-0101' },
    { id: 2, name: 'Sarah Connor',  email: 'sarah@school.com',   subject: 'Science',     phone: '555-0102' },
    { id: 3, name: 'Mark Davis',    email: 'mark@school.com',    subject: 'English',     phone: '555-0103' }
  ]);

  DB.set('sms_students', [
    { id: 1, name: 'Alice Johnson', email: 'student@school.com', class_id: 1, dob: '2008-03-15', phone: '555-1001', guardian: 'Bob Johnson'  },
    { id: 2, name: 'Tom Williams',  email: 'tom@school.com',     class_id: 1, dob: '2008-07-22', phone: '555-1002', guardian: 'Linda Williams' },
    { id: 3, name: 'Mia Brown',     email: 'mia@school.com',     class_id: 2, dob: '2009-01-10', phone: '555-1003', guardian: 'Sam Brown' },
    { id: 4, name: 'Jake White',    email: 'jake@school.com',    class_id: 2, dob: '2009-05-18', phone: '555-1004', guardian: 'Carol White' }
  ]);

  DB.set('sms_classes', [
    { id: 1, name: 'Grade 10-A', teacher_id: 1, student_ids: [1, 2] },
    { id: 2, name: 'Grade 10-B', teacher_id: 2, student_ids: [3, 4] }
  ]);

  DB.set('sms_grades', [
    { id: 1, student_id: 1, class_id: 1, subject: 'Mathematics', score: 88, date: '2026-03-01' },
    { id: 2, student_id: 2, class_id: 1, subject: 'Mathematics', score: 75, date: '2026-03-01' },
    { id: 3, student_id: 3, class_id: 2, subject: 'Science',     score: 92, date: '2026-03-01' },
    { id: 4, student_id: 4, class_id: 2, subject: 'Science',     score: 68, date: '2026-03-01' }
  ]);

  DB.set('sms_attendance', [
    { id: 1, student_id: 1, class_id: 1, date: '2026-03-10', status: 'present' },
    { id: 2, student_id: 2, class_id: 1, date: '2026-03-10', status: 'present' },
    { id: 3, student_id: 3, class_id: 2, date: '2026-03-10', status: 'absent'  },
    { id: 4, student_id: 4, class_id: 2, date: '2026-03-10', status: 'present' }
  ]);

  localStorage.setItem('sms_seeded', '1');
}

// ---- Auth ----
const Auth = {
  login(email, password) {
    const users = DB.get('sms_users');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return null;
    sessionStorage.setItem('sms_session', JSON.stringify(user));
    return user;
  },
  logout() {
    sessionStorage.removeItem('sms_session');
    App.showPage('login');
  },
  current() {
    const s = sessionStorage.getItem('sms_session');
    return s ? JSON.parse(s) : null;
  },
  require() {
    const u = Auth.current();
    if (!u) { App.showPage('login'); return null; }
    return u;
  },
  is(role) {
    const u = Auth.current();
    return u && u.role === role;
  },
  isStaff() {
    const u = Auth.current();
    return u && (u.role === 'admin' || u.role === 'teacher');
  }
};

// ---- Toast ----
function showToast(msg, type = 'default') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

// ---- Router / View Manager ----
const Router = {
  currentView: 'dashboard',
  navigate(view) {
    const user = Auth.require();
    if (!user) return;

    // Role guards
    const adminViews   = ['students','teachers','classes'];
    const staffViews   = ['grades','attendance'];
    const studentViews = ['my-grades','my-attendance'];

    if (adminViews.includes(view) && user.role !== 'admin') {
      showToast('Access denied', 'error'); return;
    }
    if (staffViews.includes(view) && !Auth.isStaff()) {
      showToast('Access denied', 'error'); return;
    }
    if (studentViews.includes(view) && user.role !== 'student') {
      showToast('Access denied', 'error'); return;
    }

    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show target view
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) viewEl.classList.add('active');

    // Highlight nav
    const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (navEl) navEl.classList.add('active');

    // Update title
    const titles = {
      dashboard: 'Dashboard', students: 'Students', teachers: 'Teachers',
      classes: 'Classes', grades: 'Grades', attendance: 'Attendance',
      'my-grades': 'My Grades', 'my-attendance': 'My Attendance'
    };
    document.getElementById('page-title').textContent = titles[view] || view;
    this.currentView = view;

    // Trigger view-specific load
    const loaders = {
      dashboard: App.loadDashboard,
      students:  () => Students.render(),
      teachers:  () => Teachers.render(),
      classes:   () => Classes.render(),
      grades:    () => Grades.init(),
      attendance:() => Attendance.init(),
      'my-grades':    () => MyProfile.loadGrades(),
      'my-attendance':() => MyProfile.loadAttendance()
    };
    if (loaders[view]) loaders[view]();
  }
};

// ---- App ----
const App = {
  showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(`page-${name}`);
    if (el) el.classList.add('active');
  },

  applyRoleVisibility() {
    const user = Auth.current();
    if (!user) return;

    const role = user.role;
    // Show/hide nav items
    document.querySelectorAll('.admin-only').forEach(el =>
      el.style.display = role === 'admin' ? '' : 'none');
    document.querySelectorAll('.staff-only').forEach(el =>
      el.style.display = (role === 'admin' || role === 'teacher') ? '' : 'none');
    document.querySelectorAll('.student-only').forEach(el =>
      el.style.display = role === 'student' ? '' : 'none');

    // Update sidebar user info
    document.getElementById('sidebar-user-name').textContent = user.name;
    document.getElementById('sidebar-user-role').textContent = user.role;
    document.getElementById('header-user').textContent = `Hi, ${user.name}`;
  },

  loadDashboard() {
    const students   = DB.get('sms_students');
    const teachers   = DB.get('sms_teachers');
    const classes    = DB.get('sms_classes');
    const grades     = DB.get('sms_grades');
    const attendance = DB.get('sms_attendance');

    const stats = [
      { label: 'Total Students', value: students.length,   icon: 'fas fa-user-graduate',       color: '#3498db' },
      { label: 'Total Teachers', value: teachers.length,   icon: 'fas fa-chalkboard-teacher',  color: '#27ae60' },
      { label: 'Total Classes',  value: classes.length,    icon: 'fas fa-school',              color: '#8e44ad' },
      { label: 'Grade Records',  value: grades.length,     icon: 'fas fa-star',                color: '#f39c12' },
      { label: 'Attendance Records', value: attendance.length, icon: 'fas fa-clipboard-check', color: '#e74c3c' }
    ];

    const grid = document.getElementById('stats-grid');
    grid.innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-icon" style="background:${s.color}">
          <i class="${s.icon}"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">${s.value}</div>
          <div class="stat-label">${s.label}</div>
        </div>
      </div>`).join('');
  },

  init() {
    seedData();

    // Login form
    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const user = Auth.login(email, password);
      if (!user) {
        const err = document.getElementById('login-error');
        err.textContent = 'Invalid email or password.';
        err.classList.remove('hidden');
        return;
      }
      document.getElementById('login-error').classList.add('hidden');
      App.showPage('app');
      App.applyRoleVisibility();

      // Navigate to right default view
      const defaultView = user.role === 'student' ? 'my-grades' : 'dashboard';
      Router.navigate(defaultView);
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', Auth.logout);

    // Nav items
    document.querySelectorAll('.nav-item[data-view]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        Router.navigate(el.dataset.view);
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
          document.getElementById('sidebar').classList.remove('open');
        }
      });
    });

    // Sidebar toggle (mobile)
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Check existing session
    const user = Auth.current();
    if (user) {
      App.showPage('app');
      App.applyRoleVisibility();
      const defaultView = user.role === 'student' ? 'my-grades' : 'dashboard';
      Router.navigate(defaultView);
    }
  }
};

// ---- Student profile views ----
const MyProfile = {
  loadGrades() {
    const user = Auth.current();
    if (!user) return;
    const student = DB.get('sms_students').find(s => s.email === user.email);
    const container = document.getElementById('my-grades-content');

    if (!student) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-star"></i><p>No grade records found for your account.</p></div>`;
      return;
    }

    const grades = DB.get('sms_grades').filter(g => g.student_id === student.id);
    const classes = DB.get('sms_classes');

    if (!grades.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-star"></i><p>No grade records yet.</p></div>`;
      return;
    }

    const avg = (grades.reduce((s, g) => s + g.score, 0) / grades.length).toFixed(1);

    container.innerHTML = `
      <div class="welcome-card" style="margin-bottom:16px">
        <h3>${student.name}</h3>
        <p>Average Score: <strong>${avg}%</strong> across ${grades.length} record(s)</p>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Subject</th><th>Class</th><th>Score</th><th>Grade</th><th>Date</th></tr></thead>
          <tbody>
            ${grades.map(g => {
              const cls = classes.find(c => c.id === g.class_id);
              const letter = g.score >= 90 ? 'A' : g.score >= 80 ? 'B' : g.score >= 70 ? 'C' : g.score >= 60 ? 'D' : 'F';
              const badge  = g.score >= 90 ? 'badge-green' : g.score >= 70 ? 'badge-blue' : g.score >= 60 ? 'badge-orange' : 'badge-red';
              return `<tr>
                <td>${g.subject}</td>
                <td>${cls ? cls.name : '-'}</td>
                <td>${g.score}%</td>
                <td><span class="badge ${badge}">${letter}</span></td>
                <td>${g.date}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  loadAttendance() {
    const user = Auth.current();
    if (!user) return;
    const student = DB.get('sms_students').find(s => s.email === user.email);
    const container = document.getElementById('my-attendance-content');

    if (!student) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-check"></i><p>No attendance records found.</p></div>`;
      return;
    }

    const records = DB.get('sms_attendance').filter(a => a.student_id === student.id);
    const classes = DB.get('sms_classes');

    if (!records.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-check"></i><p>No attendance records yet.</p></div>`;
      return;
    }

    const present = records.filter(r => r.status === 'present').length;
    const pct = ((present / records.length) * 100).toFixed(1);

    container.innerHTML = `
      <div class="welcome-card" style="margin-bottom:16px">
        <h3>${student.name}</h3>
        <p>Attendance Rate: <strong>${pct}%</strong> (${present}/${records.length} sessions)</p>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Class</th><th>Status</th></tr></thead>
          <tbody>
            ${records.map(r => {
              const cls = classes.find(c => c.id === r.class_id);
              const badge = r.status === 'present' ? 'badge-green' : r.status === 'late' ? 'badge-orange' : 'badge-red';
              return `<tr>
                <td>${r.date}</td>
                <td>${cls ? cls.name : '-'}</td>
                <td><span class="badge ${badge}">${r.status}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }
};

// ---- Init on DOM ready ----
document.addEventListener('DOMContentLoaded', () => App.init());
