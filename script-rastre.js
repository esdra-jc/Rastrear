(function () {
'use strict';
var KEY = 'bobinatrack.v1', OPK = 'bobinatrack.op';
var S = { coils: [], hist: [] }, mode = '', editId = null, view = 'dashboard';
var TITLES = { dashboard: 'Visão geral', coils: 'Bobinas', search: 'Pesquisa', history: 'Histórico', io: 'Importar e exportar', settings: 'Configurações' };
var $ = function (s) { return document.querySelector(s); };
var clean = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };
var key = function (s) { return clean(s).replace(/\s/g, '').toUpperCase(); };
var nz = function (s) { return clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var fmt = function (t) { var d = new Date(t); return isNaN(d) ? '-' : d.toLocaleString('pt-BR'); };
var now = function () { return new Date().toISOString(); };
var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
var defOp = function () { try { return localStorage.getItem(OPK) || ''; } catch (e) { return ''; } };

function toast(m, t) {
  var e = document.createElement('div');
  e.className = 'toast ' + (t || 'ok'); e.textContent = m;
  $('#toasts').appendChild(e); setTimeout(function () { e.remove(); }, 5000);
}

function sane(r) {
  var coils = [], seen = {};
  (Array.isArray(r && r.coils) ? r.coils : []).forEach(function (x) {
    if (!x) return;
    var n = key(x.number), t = clean(x.type).toUpperCase(), a = key(x.address);
    if (!n || !t || !a || seen[n]) return;
    seen[n] = 1;
    coils.push({ id: x.id || uid(), type: t, number: n, address: a, operator: clean(x.operator), created: x.created || now(), updated: x.updated || x.created || now() });
  });
  var hist = (Array.isArray(r && r.hist) ? r.hist : []).filter(function (x) { return x && x.op && x.ts; }).map(function (x) {
    return { ts: x.ts, number: String(x.number || ''), type: String(x.type || ''), op: String(x.op), from: String(x.from || ''), to: String(x.to || ''), operator: String(x.operator || '') };
  });
  return { coils: coils, hist: hist };
}
function load() {
  try { var raw = localStorage.getItem(KEY); if (raw) S = sane(JSON.parse(raw)); }
  catch (e) { toast('Não foi possível ler os dados salvos. Eles não foram alterados.', 'err'); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
  catch (e) { toast('Falha ao gravar: armazenamento cheio ou bloqueado pelo navegador.', 'err'); return false; }
}
function log(op, c, from, to, operator) {
  S.hist.unshift({ ts: now(), number: c ? c.number : '-', type: c ? c.type : '-', op: op, from: from || '', to: to || '', operator: operator || '' });
}

/* ---------- navegação ---------- */
function show(v) {
  view = v;
  document.querySelectorAll('.view').forEach(function (s) { s.classList.toggle('on', s.id === 'v-' + v); });
  document.querySelectorAll('#side nav [data-v]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === v); });
  $('#title').textContent = TITLES[v];
  document.body.classList.remove('open');
  render();
}
function empty(msg) { return '<p class="empty">' + msg + '</p>'; }
function coilRow(c) {
  return '<tr><td>' + esc(c.type) + '</td><td><b>' + esc(c.number) + '</b></td><td>' + esc(c.address) + '</td><td>' + fmt(c.updated) + '</td><td>' + esc(c.operator || '-') + '</td>' + actions(c) + '</tr>';
}
function actions(c) {
  return '<td class="act"><button class="btn sm" data-a="move" data-id="' + c.id + '">Mover</button><button class="btn sm" data-a="edit" data-id="' + c.id + '">Editar</button><button class="btn sm danger" data-a="del" data-id="' + c.id + '">Excluir</button></td>';
}
function render() {
  var n = S.coils.length;
  if (view === 'dashboard') {
    var types = {}, addrs = {};
    S.coils.forEach(function (c) { types[c.type] = 1; addrs[c.address] = 1; });
    var card = function (v, l) { return '<div class="card"><b>' + v + '</b><span>' + l + '</span></div>'; };
    $('#cards').innerHTML = card(n, 'Total de bobinas') + card(Object.keys(types).length, 'Tipos de bobinas') + card(Object.keys(addrs).length, 'Endereços ocupados') + card(S.hist.length, 'Alterações registradas');
    $('#d-act').innerHTML = S.hist.length ? '<ul class="list">' + S.hist.slice(0, 6).map(function (h) {
      return '<li><b>' + esc(h.op) + '</b> — ' + esc(h.number) + '<small>' + fmt(h.ts) + (h.to ? ' · ' + esc(h.from || '-') + ' para ' + esc(h.to) : '') + '</small></li>';
    }).join('') + '</ul>' : empty('Nenhuma atividade ainda. Cadastre a primeira bobina para começar.');
    var rec = S.coils.slice().sort(function (a, b) { return b.created < a.created ? -1 : 1; }).slice(0, 5);
    $('#d-rec').innerHTML = rec.length ? '<ul class="list">' + rec.map(function (c) {
      return '<li><b>' + esc(c.number) + '</b> — tipo ' + esc(c.type) + '<small>Endereço ' + esc(c.address) + ' · ' + fmt(c.created) + '</small></li>';
    }).join('') + '</ul>' : empty('Nenhuma bobina cadastrada.');
  }
  if (view === 'coils') {
    var f = key($('#cf').value);
    var list = S.coils.filter(function (c) { return !f || (c.number + c.type + c.address).indexOf(f) >= 0; });
    $('#coilBody').innerHTML = list.length ? list.map(coilRow).join('') : '<tr><td colspan="6">' + empty(n ? 'Nada encontrado para este filtro.' : 'Nenhuma bobina cadastrada. Use "Cadastrar bobina".') + '</td></tr>';
  }
  if (view === 'search') doSearch();
  if (view === 'history') renderHist();
  if (view === 'settings') {
    var size = 0; try { size = (localStorage.getItem(KEY) || '').length; } catch (e) {}
    $('#stInfo').textContent = n + ' bobinas e ' + S.hist.length + ' registros de histórico · ocupação aproximada: ' + (size / 1024).toFixed(1) + ' KB.';
    $('#defop').value = defOp();
  }
}

/* ---------- pesquisa ---------- */
function lev(a, b) {
  var p = [], i, j;
  for (j = 0; j <= b.length; j++) p[j] = j;
  for (i = 1; i <= a.length; i++) {
    var c = [i];
    for (j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[b.length];
}
function search(q) {
  var Q = key(q), out = [];
  if (!Q) return out;
  S.coils.forEach(function (c) {
    var s = 0, l = '', sim = '';
    if (c.number === Q || c.address === Q) { s = 100; l = 'Exata'; sim = '100%'; }
    else if (c.number.indexOf(Q) >= 0 || c.address.indexOf(Q) >= 0) {
      var base = c.number.indexOf(Q) >= 0 ? c.number : c.address;
      s = 70 + Math.round(25 * Q.length / base.length); l = 'Parcial'; sim = s + '%';
    } else if (c.type === Q) { s = 60; l = 'Tipo'; sim = '-'; }
    else {
      var r = 1 - lev(Q, c.number) / Math.max(Q.length, c.number.length);
      if (r >= 0.7) { s = Math.round(r * 100); l = 'Aproximada'; sim = s + '%'; }
    }
    if (s) out.push({ c: c, s: s, l: l, sim: sim });
  });
  return out.sort(function (a, b) { return b.s - a.s; });
}
function doSearch() {
  var q = $('#q').value, msg = $('#qmsg'), body = $('#qBody');
  if (!clean(q)) { body.innerHTML = ''; msg.textContent = 'Aceita busca parcial e números parecidos (possíveis erros de digitação).'; return; }
  var r = search(q);
  if (!r.length) { body.innerHTML = ''; msg.textContent = 'Nenhuma correspondência confiável encontrada. Confira o que foi digitado.'; return; }
  msg.textContent = r.length > 1 ? 'Há mais de um candidato. Confira número, tipo e endereço antes de agir.' : (r[0].l === 'Exata' ? 'Correspondência exata.' : 'Resultado aproximado — confirme se é a bobina correta.');
  body.innerHTML = r.map(function (x) {
    return '<tr><td><span class="tag ' + (x.l === 'Exata' ? 'ex' : x.l === 'Aproximada' ? 'ap' : '') + '">' + x.l + '</span></td><td>' + esc(x.c.type) + '</td><td><b>' + esc(x.c.number) + '</b></td><td>' + esc(x.c.address) + '</td><td>' + x.sim + '</td>' + actions(x.c) + '</tr>';
  }).join('');
}

/* ---------- histórico ---------- */
function renderHist() {
  var q = key($('#hq').value), t = key($('#ht').value), d1 = $('#hd1').value, d2 = $('#hd2').value;
  var a = d1 ? new Date(d1 + 'T00:00:00') : null, b = d2 ? new Date(d2 + 'T23:59:59.999') : null;
  var list = S.hist.filter(function (h) {
    var d = new Date(h.ts);
    if (q && (key(h.number) + key(h.from) + key(h.to)).indexOf(q) < 0) return false;
    if (t && key(h.type).indexOf(t) < 0) return false;
    if (a && d < a) return false;
    if (b && d > b) return false;
    return true;
  });
  $('#hBody').innerHTML = list.length ? list.map(function (h) {
    return '<tr><td>' + fmt(h.ts) + '</td><td><b>' + esc(h.number) + '</b></td><td>' + esc(h.type) + '</td><td>' + esc(h.op) + '</td><td>' + esc(h.from || '-') + '</td><td>' + esc(h.to || '-') + '</td><td>' + esc(h.operator || '-') + '</td></tr>';
  }).join('') : '<tr><td colspan="7">' + empty('Nenhum registro encontrado.') + '</td></tr>';
}

/* ---------- cadastro, edição e movimentação ---------- */
function openForm(m, id) {
  mode = m; editId = id || null;
  var c = id ? S.coils.filter(function (x) { return x.id === id; })[0] : null;
  if (id && !c) return;
  $('#dTitle').textContent = m === 'new' ? 'Cadastrar bobina' : m === 'edit' ? 'Editar bobina' : 'Movimentar bobina';
  $('#f-type').value = c ? c.type : ''; $('#f-num').value = c ? c.number : '';
  $('#f-addr').value = c ? c.address : ''; $('#f-op').value = defOp();
  $('#f-type').disabled = $('#f-num').disabled = m === 'move';
  $('#ferr').textContent = '';
  $('#dlg').showModal();
  (m === 'move' ? $('#f-addr') : $('#f-type')).focus();
  if (m === 'move') $('#f-addr').select();
}
function submitForm(e) {
  e.preventDefault();
  var er = $('#ferr'), o = clean($('#f-op').value);
  var c = editId ? S.coils.filter(function (x) { return x.id === editId; })[0] : null;
  var t = mode === 'move' ? c.type : clean($('#f-type').value).toUpperCase();
  var n = mode === 'move' ? c.number : key($('#f-num').value);
  var a = key($('#f-addr').value);
  if (!t || !n || !a) { er.textContent = 'Preencha tipo, número e endereço.'; return; }
  var dup = S.coils.filter(function (x) { return x.number === n && x.id !== editId; })[0];
  if (dup) { er.textContent = 'O número ' + n + ' já está cadastrado (endereço ' + dup.address + ').'; return; }
  var backup = JSON.stringify(S), msg;
  if (mode === 'new') {
    c = { id: uid(), type: t, number: n, address: a, operator: o, created: now(), updated: now() };
    S.coils.push(c); log('Cadastro', c, '', a, o); msg = 'Bobina ' + n + ' cadastrada no endereço ' + a + '.';
  } else {
    if (mode === 'move' && a === c.address) { er.textContent = 'O novo endereço é igual ao atual.'; return; }
    var oldA = c.address, oldN = c.number, oldT = c.type;
    if (n !== oldN || t !== oldT) log('Alteração de dados (' + oldT + ' / ' + oldN + ' para ' + t + ' / ' + n + ')', { number: n, type: t }, oldA, oldA, o);
    c.type = t; c.number = n; c.operator = o || c.operator; c.updated = now();
    if (a !== oldA) { c.address = a; log('Alteração de endereço', c, oldA, a, o); }
    msg = mode === 'move' ? 'Bobina ' + n + ' movida de ' + oldA + ' para ' + a + '.' : 'Bobina ' + n + ' atualizada.';
  }
  if (!save()) { S = JSON.parse(backup); return; }
  $('#dlg').close(); toast(msg); render();
}
function del(id) {
  var c = S.coils.filter(function (x) { return x.id === id; })[0];
  if (!c || !confirm('Excluir a bobina ' + c.number + ' (endereço ' + c.address + ')? O histórico será mantido.')) return;
  var backup = JSON.stringify(S);
  S.coils = S.coils.filter(function (x) { return x.id !== id; });
  log('Exclusão', c, c.address, '', defOp());
  if (!save()) { S = JSON.parse(backup); return; }
  toast('Bobina ' + c.number + ' excluída.'); render();
}

/* ---------- CSV, JSON ---------- */
function dl(name, txt, type) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
}
function stamp() { return new Date().toISOString().slice(0, 10); }
function parseCSV(t) {
  t = t.replace(/^\uFEFF/, '');
  var l1 = t.split(/\r?\n/)[0] || '', d = (l1.match(/;/g) || []).length >= (l1.match(/,/g) || []).length ? ';' : ',';
  var rows = [], r = [], f = '', q = false, i, c;
  var endRow = function () { r.push(f); f = ''; if (r.some(function (x) { return x.trim(); })) rows.push(r); r = []; };
  for (i = 0; i < t.length; i++) {
    c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === d) { r.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; endRow(); }
    else f += c;
  }
  endRow();
  return rows;
}
function readFile(inp, cb) {
  var file = inp.files[0]; inp.value = '';
  if (!file) return;
  var fr = new FileReader();
  fr.onload = function () { cb(String(fr.result)); };
  fr.onerror = function () { toast('Não foi possível ler o arquivo.', 'err'); };
  fr.readAsText(file);
}
function report(lines, bad) {
  var p = $('#ioRes'); p.hidden = false;
  p.innerHTML = '<h2>Resultado</h2><ul class="list">' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' + (bad && bad.length ? '<p class="hint">Linhas rejeitadas: ' + esc(bad.slice(0, 20).join('; ')) + (bad.length > 20 ? '…' : '') + '</p>' : '');
}
function importCSV(text) {
  var rows = parseCSV(text);
  if (rows.length < 2) { toast('Arquivo vazio ou sem linhas de dados.', 'err'); return; }
  var h = rows[0].map(nz);
  var ix = { t: h.findIndex(function (x) { return x.indexOf('tipo') === 0; }), n: h.findIndex(function (x) { return x.indexOf('numero') >= 0 || x.indexOf('bobina') >= 0; }), a: h.findIndex(function (x) { return x.indexOf('endereco') === 0; }), o: h.findIndex(function (x) { return x.indexOf('respons') === 0; }) };
  if (ix.t < 0 || ix.n < 0 || ix.a < 0) { toast('Cabeçalho inválido. Use: Tipo;Número;Endereço;Responsável.', 'err'); return; }
  var byNum = {}; S.coils.forEach(function (c) { byNum[c.number] = c; });
  var seen = {}, add = [], upd = [], ign = 0, bad = [];
  rows.slice(1).forEach(function (r, i) {
    var t = clean(r[ix.t]).toUpperCase(), n = key(r[ix.n]), a = key(r[ix.a]), o = ix.o >= 0 ? clean(r[ix.o]) : '';
    if (!t || !n || !a) { bad.push('linha ' + (i + 2)); return; }
    if (seen[n]) { ign++; return; }
    seen[n] = 1;
    var ex = byNum[n];
    if (!ex) add.push({ t: t, n: n, a: a, o: o });
    else if (ex.type === t && ex.address === a) ign++;
    else upd.push({ c: ex, t: t, a: a, o: o });
  });
  var sum = add.length + ' a adicionar, ' + upd.length + ' a atualizar, ' + ign + ' a ignorar, ' + bad.length + ' rejeitados.';
  if (!add.length && !upd.length) { report(['Nada para importar. ' + sum], bad); return; }
  if (!confirm('Importar registros? ' + sum)) return;
  var backup = JSON.stringify(S);
  add.forEach(function (x) {
    var c = { id: uid(), type: x.t, number: x.n, address: x.a, operator: x.o, created: now(), updated: now() };
    S.coils.push(c); log('Importação (cadastro)', c, '', x.a, x.o);
  });
  upd.forEach(function (x) {
    var old = x.c.address; x.c.type = x.t; x.c.address = x.a; x.c.operator = x.o || x.c.operator; x.c.updated = now();
    log('Importação (atualização)', x.c, old, x.a, x.o);
  });
  if (!save()) { S = JSON.parse(backup); return; }
  report(['Importação concluída: ' + add.length + ' adicionados, ' + upd.length + ' atualizados, ' + ign + ' ignorados, ' + bad.length + ' rejeitados.'], bad);
  toast('Importação concluída.'); render();
}
function exportCSV() {
  if (!S.coils.length) { toast('Não há bobinas para exportar.', 'err'); return; }
  var q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
  var lines = [['Tipo', 'Número', 'Endereço', 'Responsável', 'Cadastro', 'Atualização'].join(';')];
  S.coils.forEach(function (c) { lines.push([c.type, c.number, c.address, c.operator, c.created, c.updated].map(q).join(';')); });
  dl('bobinatrack-bobinas-' + stamp() + '.csv', '\uFEFF' + lines.join('\r\n'), 'text/csv;charset=utf-8');
}
function restore(text) {
  var r;
  try { r = JSON.parse(text); } catch (e) { toast('Arquivo de backup inválido.', 'err'); return; }
  if (!r || !Array.isArray(r.coils)) { toast('Este arquivo não é um backup do BobinaTrack.', 'err'); return; }
  var ns = sane(r);
  if (!confirm('Restaurar backup? Isso SUBSTITUI os dados atuais por ' + ns.coils.length + ' bobinas e ' + ns.hist.length + ' registros de histórico.')) return;
  var backup = JSON.stringify(S);
  S = ns; log('Restauração de backup', null, '', '', defOp());
  if (!save()) { S = JSON.parse(backup); return; }
  report(['Backup restaurado: ' + ns.coils.length + ' bobinas e ' + ns.hist.length + ' registros de histórico.']);
  toast('Backup restaurado.'); render();
}

/* ---------- eventos ---------- */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-v],[data-a]');
  if (!b) return;
  if (b.dataset.v) return show(b.dataset.v);
  var a = b.dataset.a, id = b.dataset.id;
  if (a === 'new') openForm('new');
  else if (a === 'edit') openForm('edit', id);
  else if (a === 'move') openForm('move', id);
  else if (a === 'del') del(id);
  else if (a === 'pick-csv') $('#fcsv').click();
  else if (a === 'pick-json') $('#fjson').click();
  else if (a === 'exp-csv') exportCSV();
  else if (a === 'exp-json') dl('bobinatrack-backup-' + stamp() + '.json', JSON.stringify({ app: 'BobinaTrack', version: 1, exported: now(), coils: S.coils, hist: S.hist }, null, 2), 'application/json');
  else if (a === 'clear') {
    if (confirm('Apagar TODAS as bobinas e o histórico deste navegador? Faça um backup antes.') && confirm('Confirma a exclusão definitiva?')) {
      S = { coils: [], hist: [] }; if (save()) { toast('Todos os dados foram apagados.'); render(); }
    }
  }
});
$('#frm').addEventListener('submit', submitForm);
$('#cancel').addEventListener('click', function () { $('#dlg').close(); });
$('#menu').addEventListener('click', function () { document.body.classList.add('open'); });
$('#scrim').addEventListener('click', function () { document.body.classList.remove('open'); });
$('#cf').addEventListener('input', render);
$('#q').addEventListener('input', doSearch);
['#hq', '#ht', '#hd1', '#hd2'].forEach(function (s) { $(s).addEventListener('input', renderHist); });
$('#fcsv').addEventListener('change', function () { readFile(this, importCSV); });
$('#fjson').addEventListener('change', function () { readFile(this, restore); });
$('#defop').addEventListener('change', function () { try { localStorage.setItem(OPK, clean(this.value)); toast('Responsável padrão salvo.'); } catch (e) { toast('Não foi possível salvar a configuração.', 'err'); } });

$('#date').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
load(); show('dashboard');
})();
