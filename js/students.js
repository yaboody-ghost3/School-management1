/* ============================================================
   students.js — Student CRUD
   ============================================================ */

const Students = {
  render(filter = '') {
    const list = DB.get('sms_students');
    const classes = DB.get('sms_classes');
    const tbody = document.getElementById('students-tbody');
    const q = filter.toLowerCase();

    const rows = list.filter(s =>
      !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7">
        <div class="empty-state">
          <i class="fas fa-user-graduate"></i>
          <p>${q ? 'No students match your search.' : 'No students added yet.'}</p>
        </div></td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(s => {
      const cls = classes.find(c => c.id === s.class_id);
      return `<tr>
        <td><span class="badge badge-blue">#${s.id}</span></td>
        <td><strong>${s.name}</strong></td>
        <td>${cls ? `<span class="badge badge-green">${cls.name}</span>` : '<span class="badge badge-orange">Unassigned</span>'}</td>
        <td>${s.email}</td>
        <td>${s.phone || '—'}</td>
        <td>${s.guardian || '—'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="Students.openModal(${s.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="Students.delete(${s.id})" style="margin-left:4px">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  },

  openModal(id = null) {
    const modal = document.getElementById('student-modal');
    const title = document.getElementById('student-modal-title');
    const form  = document.getElementById('student-form');

    // Populate class dropdown
    const classSelect = document.getElementById('student-class');
    classSelect.innerHTML = '<option value="">No Class</option>' +
      DB.get('sms_classes').map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (id) {
      const s = DB.getOne('sms_students', id);
      if (!s) return;
      title.textContent = 'Edit Student';
      document.getElementById('student-id').value      = s.id;
      document.getElementById('student-name').value    = s.name;
      document.getElementById('student-email').value   = s.email;
      document.getElementById('student-phone').value   = s.phone || '';
      document.getElementById('student-dob').value     = s.dob || '';
      document.getElementById('student-guardian').value = s.guardian || '';
      classSelect.value = s.class_id || '';
    } else {
      title.textContent = 'Add Student';
      form.reset();
      document.getElementById('student-id').value = '';
    }

    modal.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('student-modal').classList.add('hidden');
  },

  delete(id) {
    if (!confirm('Delete this student? This will also remove their grades and attendance records.')) return;
    DB.remove('sms_students', id);
    // Remove grades + attendance
    DB.set('sms_grades',     DB.get('sms_grades').filter(g => g.student_id !== id));
    DB.set('sms_attendance', DB.get('sms_attendance').filter(a => a.student_id !== id));
    // Remove from classes
    const classes = DB.get('sms_classes').map(c => ({
      ...c, student_ids: c.student_ids.filter(sid => sid !== id)
    }));
    DB.set('sms_classes', classes);
    Students.render(document.getElementById('student-search').value);
    showToast('Student deleted.', 'error');
  }
};

// ---- Form submit ----
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('student-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('student-id').value;
    const student = {
      id:       id ? parseInt(id) : DB.nextId('sms_students'),
      name:     document.getElementById('student-name').value.trim(),
      email:    document.getElementById('student-email').value.trim(),
      phone:    document.getElementById('student-phone').value.trim(),
      dob:      document.getElementById('student-dob').value,
      guardian: document.getElementById('student-guardian').value.trim(),
      class_id: parseInt(document.getElementById('student-class').value) || null
    };

    // Update class membership
    const classes = DB.get('sms_classes');
    classes.forEach(c => {
      c.student_ids = c.student_ids.filter(sid => sid !== student.id);
      if (c.id === student.class_id) c.student_ids.push(student.id);
    });
    DB.set('sms_classes', classes);

    DB.save('sms_students', student);
    Students.closeModal();
    Students.render(document.getElementById('student-search').value);
    showToast(id ? 'Student updated!' : 'Student added!', 'success');
  });

  document.getElementById('student-search').addEventListener('input', e => {
    Students.render(e.target.value);
  });
});
