const liffId = '2007795446-LJyk3OJ3';
const appUrl = 'https://script.google.com/macros/s/AKfycbx3AdztCYbCAUygSo4669BLcBrnE0Cqii5u1x8o6Aiwn8UUFe6_w4dtqT_PnsmRRsdf/exec';

let intent = null, room = null, newRoom = null, user = null, selectedEvent = null;

const names = {
  evolve: 'Evolve Room - 1st floor',
  strategic: 'Strategic Thinking Room - 2nd floor',
  teamwork: 'Teamwork Room - 4th floor'
};

document.addEventListener('DOMContentLoaded', () => {
  initLIFF();
  bindUI();
});

function log(m) {
  const box = document.getElementById('log');
  const body = document.getElementById('logContent');
  const t = new Date().toLocaleTimeString();
  body.innerHTML += `[${t}] ${m}<br>`;
  box.style.display = 'block';
}

function initLIFF() {
  liff.init({ liffId })
    .then(() => {
      if (liff.isInClient()) {
        liff.getProfile().then(p => {
          user = p;
          log('User loaded: ' + user.userId);
        });
      }
      const today = new Date().toISOString().split('T')[0];
      ['date', 'newDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
      });
    })
    .catch(e => log('LIFF init error: ' + e));
}

function bindUI() {
  document.querySelectorAll('.intention-option').forEach(el => {
    el.onclick = () => { intent = el.dataset.intent; selectIntent(el); };
  });
  document.querySelectorAll('#roomGrid .room-option').forEach(o => {
    o.onclick = () => { selectRoom(o, 'roomGrid'); room = o.dataset.room; };
  });
  document.querySelectorAll('#newRoomGrid .room-option').forEach(o => {
    o.onclick = () => { selectRoom(o, 'newRoomGrid'); newRoom = o.dataset.room; };
  });
  document.getElementById('mainForm').onsubmit = e => { e.preventDefault(); sendMain(); };

  document.getElementById('saveEditBtn').onclick = sendEdit;
  document.getElementById('backBtn').onclick = () => toggleForms(true);
  document.getElementById('backFromEdit').onclick = () => toggleForms(true);
  document.getElementById('backFromList').onclick = () => toggleForms(true);
}

function selectIntent(el) {
  document.querySelectorAll('.intention-option').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  selectedEvent = null;
  toggleForms();
}

function selectRoom(el, grid) {
  document.querySelectorAll('#' + grid + ' .room-option').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
}

function toggleForms(back) {
  document.getElementById('intentScreen').style.display = back ? 'block' : 'none';
  document.getElementById('mainForm').style.display = intent === 'book' && !back ? 'block' : 'none';
  document.getElementById('editForm').style.display = intent === 'edit' && !back && selectedEvent ? 'block' : 'none';
  document.getElementById('eventList').style.display =
    (intent === 'cancel' || intent === 'edit') && !back && !selectedEvent ? 'block' : 'none';
  if ((intent === 'cancel' || intent === 'edit') && !back && !selectedEvent) loadEvents();
}

async function loadEvents(retry = 0) {
  if (!user) {
    if (retry < 5) {
      log('User not loaded, retry ' + retry);
      setTimeout(() => loadEvents(retry + 1), 300);
    } else { log('Give up loading events'); }
    return;
  }
  try {
    log('Fetching events for ' + user.userId);
    const res = await fetch(`${appUrl}?userid=${encodeURIComponent(user.userId)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    renderEvents(data);
  } catch (e) { log('Load events error: ' + e); }
}

function renderEvents(list) {
  const box = document.getElementById('eventItems');
  if (!Array.isArray(list) || list.length === 0) {
    box.innerHTML = '<div style="padding:6px">ไม่พบการจอง</div>';
    return;
  }
  box.innerHTML = list.map(ev => `
    <div class="room-option" data-id="${ev.id}">
      <b>${ev.title}</b><br>${ev.room}<br>${ev.date} ${ev.start}-${ev.end}
    </div>`).join('');
  box.querySelectorAll('.room-option').forEach(div =>
    div.onclick = () => selectEvent(div.dataset.id, list)
  );
}

function selectEvent(id, data) {
  selectedEvent = data.find(x => x.id === id);
  if (intent === 'cancel') {
    const t = `Cancel Request\nเพื่อ ${selectedEvent.title} ห้อง ${selectedEvent.room} วันที่ ${selectedEvent.date} เวลา ${selectedEvent.start} - ${selectedEvent.end}`;
    sendMsg(t);
  }
  if (intent === 'edit') {
    document.getElementById('editTitle').value = selectedEvent.title;
    document.getElementById('eventList').style.display = 'none';
    document.getElementById('editForm').style.display = 'block';
  }
}

function sendMain() {
  const title = document.getElementById('title').value.trim();
  const d = document.getElementById('date').value;
  const s = document.getElementById('start').value;
  const e = document.getElementById('end').value;
  const text = `Booking Request\nเพื่อ ${title} ห้อง ${names[room]} วันที่ ${d} เวลา ${s} - ${e}`;
  sendMsg(text);
}

function sendEdit() {
  const nd = document.getElementById('newDate').value;
  const ns = document.getElementById('newStart').value;
  const ne = document.getElementById('newEnd').value;
  const txt =
    `Edit Request\nเพื่อ ${selectedEvent.title} ห้อง ${selectedEvent.room} วันที่ ${selectedEvent.date} เวลา ${selectedEvent.start} - ${selectedEvent.end} เป็น ${names[newRoom]} วันที่ ${nd} เวลา ${ns} - ${ne}`;
  sendMsg(txt);
}

function sendMsg(text) {
  if (!liff.isInClient()) { log('Outside LINE, msg:\n' + text); return; }
  liff.sendMessages([{ type: 'text', text }])
    .then(() => liff.closeWindow())
    .catch(e => log('Send error: ' + e.message));
}
