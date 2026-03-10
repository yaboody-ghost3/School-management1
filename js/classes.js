/* ============================================================
   classes.js — Class CRUD
   ============================================================ */

const Classes = {
  render() {
    const classList = DB.get('sms_classes');
    const teachers  = DB.get('sms_teachers');
    const students  = DB.get('sms_students');
    const grid = document.getElementById('classes-grid');

    if (!classList.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <i class="fas fa-school"></i>
        <p>No classes added yet. Click "Add Class" to get started.</p>
      </div>`;
      return;
    }

    grid.innerHTML = classList.map(c => {
      const teacher = teachers.find(t => t.id === c.teacher_id);
      const count   = (c.student_ids || []).length;
      return `
        <div class="class-card">
          <div class="class-card-header">
            <div class="class-card-title">${c.name}</div>
            <div class="class-card-actions">
              <button class="btn btn-sm btn-secondary" onclick="Classes.openModal(${c.id})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="Classes.delete(${c.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="class-card-meta">
            <span>
              <i class="fas fa-chalkboard-teacher"></i>
              ${teacher ? teacher.name : '<em>No teacher assigned</em>'}
            </span>
            <span>
              <i class="fas fa-user-graduate"></i>
              ${count} student${count !== 1 ? 's' : ''}
            </span>
            ${teacher ? `<span><i class="fas fa-book"></i> ${teacher.subject}</span>` : ''}
          </div>
        </div>`;
    }).join('');
  },

  openModal(id = null) {
    const modal = document.getElementById('class-modal');
    const title = document.getElementById('class-modal-title');
    const form  = document.getElementById('class-form');

    // Populate teacher dropdown
    const teacherSelect = document.getElementById('class-teacher');
    teacherSelect.innerHTML = '<option value="">No Teacher</option>' +
      DB.get('sms_teachers').map(t => `<option value="${t.id}">${t.name} (${t.subject})</option>`).join('');

    // Populate student multi-select
    const studentSelect = document.getElementById('class-students');
    studentSelect.innerHTML = DB.get('sms_students').map(s =>
      `<option value="${s.id}">${s.name}</option>`
    ).join('');

    if (id) {
      const c = DB.getOne('sms_classes', id);
      if (!c) return;
      title.textContent = 'Edit Class';
      document.getElementById('class-id').value   = c.id;
      document.getElementById('class-name').value = c.name;
      teacherSelect.value = c.teacher_id || '';

      // Select enrolled students
      Array.from(studentSelect.options).forEach(opt => {
        opt.selected = (c.student_ids || []).includes(parseInt(opt.value));
      });
    } else {
      title.textContent = 'Add Class';
      form.reset();
      document.getElementById('class-id').value = '';
    }

    modal.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('class-modal').classList.add('hidden');
  },

  delete(id) {
    if (!confirm('Delete this class? Students and records will be unlinked but not deleted.')) return;
    DB.remove('sms_classes', id);
    // Unassign students from this class
    const students = DB.get('sms_students').map(s => ({
      ...s, class_id: s.class_id === id ? null : s.class_id
    }));
    DB.set('sms_students', students);
    Classes.render();
    showToast('Class deleted.', 'error');
  }
};

// ---- Form submit ----
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('class-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('class-id').value;
    const studentSelect = document.getElementById('class-students');
    const selectedStudentIds = Array.from(studentSelect.selectedOptions).map(o => parseInt(o.value));

    const cls = {
      id:          id ? parseInt(id) : DB.nextId('sms_classes'),
      name:        document.getElementById('class-name').value.trim(),
      teacher_id:  parseInt(document.getElementById('class-teacher').value) || null,
      student_ids: selectedStudentIds
    };

    // Update student class assignments
    const students = DB.get('sms_students');
    students.forEach(s => {
      if (selectedStudentIds.includes(s.id)) {
        s.class_id = cls.id;
      } else if (s.class_id === cls.id) {
        s.class_id = null; // removed from this class
      }
    });
    DB.set('sms_students', students);

    DB.save('sms_classes', cls);
    Classes.closeModal();
    Classes.render();
    showToast(id ? 'Class updated!' : 'Class added!', 'success');
  });
});
