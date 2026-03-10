/* ============================================================
   teachers.js — Teacher CRUD
   ============================================================ */

const Teachers = {
  render(filter = '') {
    const list = DB.get('sms_teachers');
    const tbody = document.getElementById('teachers-tbody');
    const q = filter.toLowerCase();

    const rows = list.filter(t =>
      !q || t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
    );

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state">
          <i class="fas fa-chalkboard-teacher"></i>
          <p>${q ? 'No teachers match your search.' : 'No teachers added yet.'}</p>
        </div></td></tr>`;
      return;
    }

    const classes = DB.get('sms_classes');
    tbody.innerHTML = rows.map(t => {
      const assignedClasses = classes.filter(c => c.teacher_id === t.id).map(c => c.name);
      return `<tr>
        <td><span class="badge badge-blue">#${t.id}</span></td>
        <td><strong>${t.name}</strong></td>
        <td><span class="badge badge-green">${t.subject}</span></td>
        <td>${t.email}</td>
        <td>${t.phone || '—'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="Teachers.openModal(${t.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="Teachers.delete(${t.id})" style="margin-left:4px">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  },

  openModal(id = null) {
    const modal = document.getElementById('teacher-modal');
    const title = document.getElementById('teacher-modal-title');
    const form  = document.getElementById('teacher-form');

    if (id) {
      const t = DB.getOne('sms_teachers', id);
      if (!t) return;
      title.textContent = 'Edit Teacher';
      document.getElementById('teacher-id').value      = t.id;
      document.getElementById('teacher-name').value    = t.name;
      document.getElementById('teacher-email').value   = t.email;
      document.getElementById('teacher-subject').value = t.subject;
      document.getElementById('teacher-phone').value   = t.phone || '';
    } else {
      title.textContent = 'Add Teacher';
      form.reset();
      document.getElementById('teacher-id').value = '';
    }

    modal.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('teacher-modal').classList.add('hidden');
  },

  delete(id) {
    if (!confirm('Delete this teacher? Classes assigned to them will become unassigned.')) return;
    DB.remove('sms_teachers', id);
    // Unassign from classes
    const classes = DB.get('sms_classes').map(c => ({
      ...c, teacher_id: c.teacher_id === id ? null : c.teacher_id
    }));
    DB.set('sms_classes', classes);
    Teachers.render(document.getElementById('teacher-search').value);
    showToast('Teacher deleted.', 'error');
  }
};

// ---- Form submit ----
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('teacher-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('teacher-id').value;
    const teacher = {
      id:      id ? parseInt(id) : DB.nextId('sms_teachers'),
      name:    document.getElementById('teacher-name').value.trim(),
      email:   document.getElementById('teacher-email').value.trim(),
      subject: document.getElementById('teacher-subject').value.trim(),
      phone:   document.getElementById('teacher-phone').value.trim()
    };

    DB.save('sms_teachers', teacher);
    Teachers.closeModal();
    Teachers.render(document.getElementById('teacher-search').value);
    showToast(id ? 'Teacher updated!' : 'Teacher added!', 'success');
  });

  document.getElementById('teacher-search').addEventListener('input', e => {
    Teachers.render(e.target.value);
  });
});
