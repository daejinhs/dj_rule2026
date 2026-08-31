// *.dc.html 아트보드를 발표용 단일 HTML 뷰어로 묶는다.
//   node build-viewer.mjs <아트보드 폴더> <출력 파일>
// 순서와 덱 구분은 각 슬라이드 바닥글(예: "01 / 11")에서 읽는다 — 캔버스 배치와 무관.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const SRC = process.argv[2];
const OUT = process.argv[3];

const DECKS = [
  { key: 'staff', label: '교직원 연수', match: '교직원 연수' },
  { key: 'student', label: '학생 교육', match: '학생 교육' },
];

const files = readdirSync(SRC).filter((f) => f.endsWith('.dc.html'));
let sharedStyle = '';
let fontLink = '';
const slides = [];

for (const f of files) {
  const raw = readFileSync(join(SRC, f), 'utf8');
  const helmet = raw.match(/<helmet>([\s\S]*?)<\/helmet>/)?.[1] ?? '';
  if (!sharedStyle) {
    sharedStyle = helmet.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
    fontLink = helmet.match(/<link[^>]*fonts\.googleapis[^>]*>/)?.[0] ?? '';
  }
  const inner = raw.split('</helmet>')[1].split('</x-dc>')[0].trim();

  const foot = inner.match(/<div class="foot[^"]*">\s*<span>([^<]*)<\/span>\s*<span>\s*(\d+)\s*\/\s*(\d+)\s*<\/span>/);
  if (!foot) { console.error(`  ! 바닥글을 못 읽음: ${f}`); continue; }
  const deckLabel = foot[1];
  const n = parseInt(foot[2], 10);
  const deck = DECKS.find((d) => deckLabel.includes(d.match))?.key ?? 'staff';

  const titleRaw =
    inner.match(/<h1 class="big[^"]*">([\s\S]*?)<\/h1>/)?.[1] ??
    inner.match(/<h1 class="h1[^"]*">([\s\S]*?)<\/h1>/)?.[1] ?? f;
  const title = titleRaw.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  slides.push({ file: f, deck, n, title, inner });
}

slides.sort((a, b) => (a.deck === b.deck ? a.n - b.n : a.deck === 'staff' ? -1 : 1));
for (const d of DECKS) {
  const c = slides.filter((s) => s.deck === d.key).length;
  console.log(`  ${d.label}: ${c}장`);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const body = slides
  .map((s, i) => `<div class="slidewrap" data-i="${i}" data-deck="${s.deck}" data-title="${esc(s.title)}">${s.inner}</div>`)
  .join('\n');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>학생생활규정 개정 교육 — 대진고등학교</title>
<meta name="description" content="2026. 9. 1. 시행 학생생활규정 전부개정 교육자료. 교직원 연수 11장, 학생 교육 8장.">
${fontLink}
<style>
${sharedStyle}

/* ── 뷰어 ── */
html,body{height:100%}
body{background:#4a4844;display:flex;align-items:center;justify-content:center;overflow:hidden}
#stage{position:relative;width:1280px;height:720px;transform-origin:center center;
  box-shadow:0 18px 60px rgba(0,0,0,.34)}
.slidewrap{position:absolute;inset:0;display:none}
.slidewrap.is-active{display:block}
.slidewrap .slide{position:absolute;inset:0}

/* 활성 슬라이드에서만 등장 효과가 다시 돈다 (animation-name 만 건드려 지연값은 보존) */
.slidewrap:not(.is-active) .a,
.slidewrap:not(.is-active) .f,
.slidewrap:not(.is-active) .aline,
.slidewrap:not(.is-active) .mv,
.slidewrap:not(.is-active) .sweep,
.slidewrap:not(.is-active) .pop,
.slidewrap:not(.is-active) .pls,
.slidewrap:not(.is-active) .arw{animation-name:none}

/* ── 하단 바 ── */
#bar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:20;
  display:flex;align-items:center;gap:6px;padding:7px 9px;border-radius:2px;
  background:rgba(28,26,23,.9);color:#EDE8DF;font:500 13px/1 'IBM Plex Sans KR',system-ui,sans-serif;
  transition:opacity .3s;letter-spacing:.02em}
#bar.hide{opacity:0;pointer-events:none}
#bar button{font:inherit;color:inherit;background:transparent;border:0;padding:7px 11px;
  cursor:pointer;border-radius:2px;letter-spacing:.02em}
#bar button:hover{background:rgba(255,255,255,.14)}
#bar button[aria-pressed="true"]{background:#9C3B26;color:#fff}
#count{padding:0 12px;font-variant-numeric:tabular-nums;opacity:.72;white-space:nowrap}
#bar .sep{width:1px;height:20px;background:rgba(255,255,255,.2);margin:0 3px}

/* ── 전체보기 ── */
#grid{position:fixed;inset:0;z-index:30;background:#413e39;overflow:auto;padding:34px 30px 90px;display:none}
#grid.on{display:block}
#grid h2{font:600 14px/1 'IBM Plex Sans KR',system-ui,sans-serif;letter-spacing:.14em;
  color:#B9B2A6;margin:0 0 16px}
#grid h2:not(:first-child){margin-top:34px}
.gwrap{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:26px 20px}
.gcell{cursor:pointer;border:0;background:none;padding:0;text-align:left;font:inherit}
.gthumb{width:100%;aspect-ratio:16/9;overflow:hidden;position:relative;outline:1px solid rgba(255,255,255,.16)}
.gthumb > .slide{position:absolute;top:0;left:0;transform:scale(.209);transform-origin:top left}
.gcell:hover .gthumb{outline:2px solid #9C3B26}
.gcap{margin-top:7px;font:500 12.5px/1.45 'IBM Plex Sans KR',system-ui,sans-serif;color:#CFC8BC}
.gcap b{color:#8E877B;font-weight:600;margin-right:7px;font-variant-numeric:tabular-nums}
.gthumb .a,.gthumb .f,.gthumb .aline,.gthumb .mv,.gthumb .sweep,.gthumb .pop,.gthumb .pls,.gthumb .arw{animation-name:none}

/* ── 인쇄 (Ctrl+P → PDF로 저장). 웹폰트가 그대로 살아 있다 ── */
@page{size:13.333in 7.5in;margin:0}
@media print{
  html,body{height:auto;background:#fff;display:block;overflow:visible}
  #bar,#grid{display:none!important}
  #stage{position:static;width:auto;height:auto;transform:none!important;box-shadow:none}
  .slidewrap{position:static;display:block!important;break-after:page;page-break-after:always}
  .slidewrap:last-child{break-after:auto;page-break-after:auto}
  .slidewrap .slide{position:relative;inset:auto;width:1280px;height:720px}
  .slidewrap .a,.slidewrap .f,.slidewrap .aline,.slidewrap .mv,.slidewrap .sweep,.slidewrap .pop,.slidewrap .pls,.slidewrap .arw{animation-name:none}
}
</style>
</head>
<body>
<div id="stage">
${body}
</div>

<div id="bar">
  <button id="d-staff" aria-pressed="true">교직원</button>
  <button id="d-student" aria-pressed="false">학생</button>
  <span class="sep"></span>
  <button id="prev" title="←">◀</button>
  <span id="count">1 / 11</span>
  <button id="next" title="→">▶</button>
  <span class="sep"></span>
  <button id="overview" title="O">전체보기</button>
  <button id="full" title="F">전체화면</button>
</div>

<div id="grid"></div>

<script>
(function () {
  var wraps = [].slice.call(document.querySelectorAll('.slidewrap'));
  var stage = document.getElementById('stage');
  var bar = document.getElementById('bar');
  var grid = document.getElementById('grid');
  var countEl = document.getElementById('count');
  var deck = 'staff';
  var idx = 0;

  var DECKS = { staff: '교직원 연수', student: '학생 교육' };
  function list() { return wraps.filter(function (w) { return w.dataset.deck === deck; }); }

  function show(i) {
    var ls = list();
    idx = Math.max(0, Math.min(i, ls.length - 1));
    wraps.forEach(function (w) { w.classList.remove('is-active'); });
    if (ls[idx]) ls[idx].classList.add('is-active');
    countEl.textContent = (idx + 1) + ' / ' + ls.length;
    try { location.replace('#' + deck + '-' + (idx + 1)); } catch (e) {}
  }
  function setDeck(d, i) {
    deck = d;
    document.getElementById('d-staff').setAttribute('aria-pressed', String(d === 'staff'));
    document.getElementById('d-student').setAttribute('aria-pressed', String(d === 'student'));
    show(i || 0);
  }
  function fit() {
    var k = Math.min(innerWidth / 1280, innerHeight / 720) * 0.94;
    stage.style.transform = 'scale(' + k + ')';
  }

  function buildGrid() {
    if (grid.dataset.built) return;
    var html = '';
    Object.keys(DECKS).forEach(function (d) {
      html += '<h2>' + DECKS[d] + '</h2><div class="gwrap">';
      wraps.filter(function (w) { return w.dataset.deck === d; }).forEach(function (w, i) {
        html += '<button class="gcell" data-deck="' + d + '" data-i="' + i + '">' +
          '<div class="gthumb">' + w.innerHTML + '</div>' +
          '<div class="gcap"><b>' + String(i + 1).padStart(2, '0') + '</b>' + w.dataset.title + '</div></button>';
      });
      html += '</div>';
    });
    grid.innerHTML = html;
    grid.dataset.built = '1';
    grid.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('.gcell') : null;
      if (!c) return;
      toggleGrid(false);
      setDeck(c.dataset.deck, parseInt(c.dataset.i, 10));
    });
  }
  function toggleGrid(on) {
    if (on === undefined) on = !grid.classList.contains('on');
    if (on) buildGrid();
    grid.classList.toggle('on', on);
  }

  document.getElementById('prev').onclick = function () { show(idx - 1); };
  document.getElementById('next').onclick = function () { show(idx + 1); };
  document.getElementById('d-staff').onclick = function () { setDeck('staff'); };
  document.getElementById('d-student').onclick = function () { setDeck('student'); };
  document.getElementById('overview').onclick = function () { toggleGrid(); };
  document.getElementById('full').onclick = function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };

  addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { show(idx + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { show(idx - 1); e.preventDefault(); }
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(list().length - 1);
    else if (e.key === 'o' || e.key === 'O') toggleGrid();
    else if (e.key === 'f' || e.key === 'F') document.getElementById('full').click();
    else if (e.key === 'Escape' && grid.classList.contains('on')) toggleGrid(false);
  });

  stage.addEventListener('click', function (e) {
    show(e.clientX < innerWidth / 2 ? idx - 1 : idx + 1);
  });

  var t;
  function wake() {
    bar.classList.remove('hide');
    clearTimeout(t);
    t = setTimeout(function () {
      if (document.fullscreenElement) bar.classList.add('hide');
    }, 2200);
  }
  addEventListener('mousemove', wake);
  addEventListener('keydown', wake);
  document.addEventListener('fullscreenchange', wake);

  addEventListener('resize', fit);
  fit();

  var m = /^#(staff|student)-(\\d+)$/.exec(location.hash || '');
  if (m) setDeck(m[1], parseInt(m[2], 10) - 1);
  else setDeck('staff', 0);
  wake();
})();
</script>
</body>
</html>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, 'utf8');
console.log(`wrote ${OUT} — ${slides.length} slides, ${(html.length / 1024).toFixed(0)} KB`);
