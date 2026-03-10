/* ============================================================
   grades.js — Grade entry and report
   ============================================================ */

const Grades = {
  init() {
    // Populate class dropdown
    const sel = document.getElementById('grades-class-select');
    sel.innerHTML = '<option value="">Select Class</option>' +
      DB.get('sms_classes').map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('grades-sheet').innerHTML = '';
  },

  loadGradeSheet() {
    const classId = parseInt(document.getElementById('grades-class-select').value);
    const subject = document.getElementById('grades-subject').value.trim();
    const container = document.getElementById('grades-sheet');

    if (!classId) { showToast('Please select a class.', 'error'); return; }
    if (!subject)  { showToast('Please enter a subject.', 'error'); return; }

    const cls = DB.getOne('sms_classes', classId);
    if (!cls) return;

    const students = DB.get('sms_students').filter(s => (cls.student_ids || []).includes(s.id));
    if (!students.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-user-graduate"></i><p>No students enrolled in this class.</p></div>`;
      return;
    }

    const allGrades = DB.get('sms_grades');

    container.innerHTML = `
      <div class="grade-sheet-container">
        <div class="grade-sheet-header">
          <div>
            <strong>${cls.name}</strong> — ${subject}
          </div>
          <button class="btn btn-success" onclick="Grades.saveGrades(${classId}, '${subject.replace(/'/g, "\\'")}')">
            <i class="fas fa-save"></i> Save Grades
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Score (0–100)</th>
              <th>Grade</th>
              <th>Previous Entry</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, i) => {
              const existing = allGrades.find(g =>
                g.student_id === s.id && g.class_id === classId && g.subject === subject
              );
              const val = existing ? existing.score : '';
              const letter = existing ? Grades.letter(existing.score) : '—';
              const badge  = existing ? Grades.badge(existing.score) : '';
              return `<tr>
                <td>${i + 1}</td>
                <td><strong>${s.name}</strong></td>
                <td>
                  <input type="number" min="0" max="100"
                    class="grade-input"
                    id="grade-input-${s.id}"
                    value="${val}"
                    placeholder="0–100"
                    oninput="Grades.updateLive(${s.id})"
                  />
                </td>
                <td id="grade-letter-${s.id}">
                  ${existing ? `<span class="badge ${badge}">${letter}</span>` : '—'}
                </td>
                <td>${existing ? `${existing.score}% on ${existing.date}` : '<em>No record</em>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div id="grades-report" style="margin-top:16px"></div>`;
  },

  updateLive(studentId) {
    const input  = document.getElementById(`grade-input-${studentId}`);
    const cell   = document.getElementById(`grade-letter-${studentId}`);
    const score  = parseInt(input.value);
    if (!isNaN(score) && score >= 0 && score <= 100) {
      const l = Grades.letter(score);
      const b = Grades.badge(score);
      cell.innerHTML = `<span class="badge ${b}">${l}</span>`;
    } else {
      cell.innerHTML = '—';
    }
  },

  saveGrades(classId, subject) {
    const cls = DB.getOne('sms_classes', classId);
    if (!cls) return;
    const students = DB.get('sms_students').filter(s => (cls.student_ids || []).includes(s.id));
    const today = new Date().toISOString().split('T')[0];
    let saved = 0;

    students.forEach(s => {
      const input = document.getElementById(`grade-input-${s.id}`);
      const score = parseInt(input.value);
      if (isNaN(score) || score < 0 || score > 100) return;

      const grades = DB.get('sms_grades');
      const idx = grades.findIndex(g =>
        g.student_id === s.id && g.class_id === classId && g.subject === subject
      );

      if (idx >= 0) {
        grades[idx].score = score;
        grades[idx].date  = today;
        DB.set('sms_grades', grades);
      } else {
        DB.save('sms_grades', {
          id: DB.nextId('sms_grades'),
          student_id: s.id,
          class_id: classId,
          subject,
          score,
          date: today
        });
      }
      saved++;
    });

    showToast(`${saved} grade(s) saved!`, 'success');
    Grades.loadGradeSheet(); // refresh
  },

  letter(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  },

  badge(score) {
    if (score >= 90) return 'badge-green';
    if (score >= 70) return 'badge-blue';
    if (score >= 60) return 'badge-orange';
    return 'badge-red';
  }
};
