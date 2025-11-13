// allarmi.js v1.0
// assets/js/alarms.js
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { db } from './firebase-config.js';

window.addEventListener('DOMContentLoaded', async () => {

  const alarmList = document.getElementById('alarmList');
  if (!alarmList) {
    return;
  }

  // 1) Fetch alarm_general
  let general = [];
  try {
    const genSnap = await getDoc(doc(db, 'Data', 'alarm_general'));
    if (genSnap.exists()) {
      general = genSnap.data().alarm_general || [];
    }
  } catch (e) {
  }

  // 2) Fetch alarm_acli
  let acli = [];
  try {
    const acliSnap = await getDoc(doc(db, 'Data', 'alarm_acli'));
    if (acliSnap.exists()) {
      acli = acliSnap.data().alarm_acli || [];
    }
  } catch (e) {
  }

  // 3) Render general
  if (!Array.isArray(general)) {
  } else {
    general.forEach((alarm, i) => {
      const div = document.createElement('div');
      div.className = 'alarm-item mb-2';
      div.innerHTML = `
        <span class="fw-bold text-light">${alarm.name}:</span>
        <span class="text-info ms-2">${alarm.code}</span>
      `;
      alarmList.appendChild(div);
    });
  }

  // 4) Render acli
  if (!Array.isArray(acli)) {
  } else if (acli.length) {
    const section = document.createElement('div');
    section.className = 'alarm-group mt-4';
    section.innerHTML = `<h5 class="mb-3 text-light">ACLI:</h5>`;
    acli.forEach((loc, i) => {
      const div = document.createElement('div');
      div.className = 'alarm-subitem mb-1';
      div.innerHTML = `
        <span class="fw-bold text-light">${loc.location}:</span>
        <span class="text-info ms-2">${loc.code}</span>
      `;
      section.appendChild(div);
    });
    alarmList.appendChild(section);
  } else {
  }

});
