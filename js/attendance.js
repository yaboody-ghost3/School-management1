/* ============================================================
   attendance.js — Attendance tracking and report
   ============================================================ */

const Attendance = {
  init() {
    // Populate class dropdown
    const sel = document.getElementById('att-class-select');
    sel.innerHTML = '<option value="">Select Class</option>' +
      DB.get('sms_classes').map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    // Default date = today
    const dateInput = document.getElementById('att-date');
    if (!dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    document.getElementById('attendance-sheet').innerHTML = '';
  },

  loadSheet() {
    const classId = parseInt(document.getElementById('att-class-select').value);
    const date    = document.getElementById('att-date').value;
    const container = document.getElementById('attendance-sheet');

    if (!classId) { showToast('Please select a class.', 'error'); return; }
    if (!date)     { showToast('Please select a date.', 'error'); return; }

    const cls = DB.getOne('sms_classes', classId);
    if (!cls) return;

    const students   = DB.get('sms_students').filter(s => (cls.student_ids || []).includes(s.id));
    const allRecords = DB.get('sms_attendance');

    if (!students.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-user-graduate"></i><p>No students enrolled in this class.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="grade-sheet-container">
        <div class="grade-sheet-header">
          <div>
            <strong>${cls.name}</strong> — ${date}
            <span style="margin-left:12px;font-size:12px;color:#7f8c8d">${students.length} student(s)</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="Attendance.markAll(${classId}, '${date}', 'present')">
              <i class="fas fa-check-double"></i> All Present
            </button>
            <button class="btn btn-success btn-sm" onclick="Attendance.save(${classId}, '${date}')">
              <i class="fas fa-save"></i> Save
            </button>
          </div>
        </div>
        <table class="data-table attendance-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th style="text-align:center">Present</th>
              <th style="text-align:center">Late</th>
              <th style="text-align:center">Absent</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, i) => {
              const rec = allRecords.find(r =>
                r.student_id === s.id && r.class_id === classId && r.date === date
              );
              const status = rec ? rec.status : 'present';
              return `<tr id="att-row-${s.id}">
                <td>${i + 1}</td>
                <td><strong>${s.name}</strong></td>
                <td class="att-status">
                  <button class="att-btn att-present ${status === 'present' ? 'selected' : ''}"
                    onclick="Attendance.setStatus(${s.id}, 'present', ${classId}, '${date}')">
                    <i class="fas fa-check"></i>
                  </button>
                </td>
                <td class="att-status">
                  <button class="att-btn att-late ${status === 'late' ? 'selected' : ''}"
                    onclick="Attendance.setStatus(${s.id}, 'late', ${classId}, '${date}')">
                    <i class="fas fa-clock"></i>
                  </button>
                </td>
                <td class="att-status">
                  <button class="att-btn att-absent ${status === 'absent' ? 'selected' : ''}"
                    onclick="Attendance.setStatus(${s.id}, 'absent', ${classId}, '${date}')">
                    <i class="fas fa-times"></i>
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  // Track in-memory changes before save
  _pending: {},

  setStatus(studentId, status, classId, date) {
    const key = `${studentId}-${classId}-${date}`;
    Attendance._pending[key] = { studentId, status, classId, date };

    // Update UI buttons in the row
    const row = document.getElementById(`att-row-${studentId}`);
    if (!row) return;
    row.querySelectorAll('.att-btn').forEach(btn => {
      btn.classList.remove('selected');
      if (btn.classList.contains(`att-${status}`)) btn.classList.add('selected');
    });
  },

  markAll(classId, date, status) {
    const cls = DB.getOne('sms_classes', classId);
    if (!cls) return;
    (cls.student_ids || []).forEach(sid => {
      Attendance.setStatus(sid, status, classId, date);
    });
  },

  save(classId, date) {
    const cls = DB.getOne('sms_classes', classId);
    if (!cls) return;
    const students = DB.get('sms_students').filter(s => (cls.student_ids || []).includes(s.id));
    const today = date;
    let saved = 0;

    students.forEach(s => {
      const key = `${s.id}-${classId}-${date}`;
      const pending = Attendance._pending[key];

      // Determine status: pending change OR read from buttons in DOM
      let status = 'present';
      if (pending) {
        status = pending.status;
      } else {
        const row = document.getElementById(`att-row-${s.id}`);
        if (row) {
          const selected = row.querySelector('.att-btn.selected');
          if (selected) {
            if (selected.classList.contains('att-present')) status = 'present';
            else if (selected.classList.contains('att-late'))   status = 'late';
            else if (selected.classList.contains('att-absent')) status = 'absent';
          }
        }
      }

      const records = DB.get('sms_attendance');
      const idx = records.findIndex(r =>
        r.student_id === s.id && r.class_id === classId && r.date === date
      );

      if (idx >= 0) {
        records[idx].status = status;
        DB.set('sms_attendance', records);
      } else {
        DB.save('sms_attendance', {
          id: DB.nextId('sms_attendance'),
          student_id: s.id,
          class_id: classId,
          date,
          status
        });
      }
      saved++;
    });

    // Clear pending
    Attendance._pending = {};
    showToast(`Attendance saved for ${saved} student(s)!`, 'success');
  },

  showReport() {
    const classId = parseInt(document.getElementById('att-class-select').value);
    const container = document.getElementById('attendance-sheet');

    if (!classId) { showToast('Please select a class first.', 'error'); return; }

    const cls      = DB.getOne('sms_classes', classId);
    const students = DB.get('sms_students').filter(s => (cls.student_ids || []).includes(s.id));
    const records  = DB.get('sms_attendance').filter(r => r.class_id === classId);

    if (!students.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No students in this class.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div style="background:#fff;border-radius:10px;padding:16px;box-shadow:var(--shadow)">
        <h4 style="margin-bottom:16px">Attendance Report — ${cls.name}</h4>
        <table class="report-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Present</th>
              <th>Late</th>
              <th>Absent</th>
              <th>Total</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => {
              const sRecords = records.filter(r => r.student_id === s.id);
              const present  = sRecords.filter(r => r.status === 'present').length;
              const late     = sRecords.filter(r => r.status === 'late').length;
              const absent   = sRecords.filter(r => r.status === 'absent').length;
              const total    = sRecords.length;
              const rate     = total ? ((present + late) / total * 100).toFixed(1) : '—';
              const rateNum  = total ? (present + late) / total * 100 : 0;
              const badge    = rateNum >= 80 ? 'badge-green' : rateNum >= 60 ? 'badge-orange' : 'badge-red';
              return `<tr>
                <td><strong>${s.name}</strong></td>
                <td><span class="badge badge-green">${present}</span></td>
                <td><span class="badge badge-orange">${late}</span></td>
                <td><span class="badge badge-red">${absent}</span></td>
                <td>${total}</td>
                <td>${total ? `<span class="badge ${badge}">${rate}%</span>` : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }
};
