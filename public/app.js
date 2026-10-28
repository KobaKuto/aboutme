const CONFIG = {
  csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTc6RtO2MeSIrh6S9ei32kBM5XVwzsZRWrDhnR-T3VKkOjX9R_MHIjBLhrky6b01RpY6wpCw3dTMkj6/pub?output=csv",
  cacheKey: "csv",
  defaultLang: "ja",
  sns: [
    ["X","https://x.com/KobaKuto"],
    ["GitHub","https://github.com/KobaKuto"],
    ["YouTube","https://www.youtube.com/@KobaKuto"],
    ["YouTube (Translation)","https://www.youtube.com/@KOBA-Traslation"],
    ["nico","https://www.nicovideo.jp/user/51409910"],
    ["Pixiv","https://www.pixiv.net/users/31630557"],
    ["Bilibili","https://space.bilibili.com/484383225"],
  ],
};
const LANGS = [["ja","日本語"],["ko","한국어"],["en","English"],["zh-TW","繁體中文"],["zh-CN","简体中文"]];
const I18N = {
  ja:      {tabAll:"すべて", tabWorks:"創作", tabPosts:"ポスト", empty:"まだ投稿がありません", loadError:"投稿を読み込めませんでした", otherLink:"作品ページ", play:"再生", next:"次の投稿へ（残り{n}件）", back:"最初の投稿に戻る", theme:"ライト／ダーク切り替え", language:"言語"},
  ko:      {tabAll:"전체", tabWorks:"창작", tabPosts:"포스트", empty:"아직 게시물이 없습니다", loadError:"게시물을 불러오지 못했습니다", otherLink:"작품 페이지", play:"재생", next:"다음 게시물 (남은 {n}건)", back:"첫 게시물로", theme:"라이트/다크 전환", language:"언어"},
  en:      {tabAll:"All", tabWorks:"Works", tabPosts:"Posts", empty:"No posts yet", loadError:"Couldn't load posts", otherLink:"Work page", play:"Play", next:"Next post ({n} left)", back:"Back to first post", theme:"Toggle light/dark", language:"Language"},
  "zh-TW": {tabAll:"全部", tabWorks:"創作", tabPosts:"貼文", empty:"還沒有貼文", loadError:"無法載入貼文", otherLink:"作品頁面", play:"播放", next:"下一則（還有 {n} 則）", back:"回到第一則", theme:"切換淺色／深色", language:"語言"},
  "zh-CN": {tabAll:"全部", tabWorks:"创作", tabPosts:"帖子", empty:"还没有帖子", loadError:"无法加载帖子", otherLink:"作品页面", play:"播放", next:"下一条（还有 {n} 条）", back:"回到第一条", theme:"切换浅色／深色", language:"语言"},
};
const TABS = [["all","tabAll",null],["works","tabWorks","work"],["posts","tabPosts","post"]];
const LINK_COLS = [["youtube","YouTube"],["bilibili","Bilibili"],["nico","nico"],["x","X"],["pixiv","Pixiv"]];
const SHOPS = {"booth.pm":"BOOTH","dlsite.com":"DLsite","melonbooks.co.jp":"メロンブックス","toranoana.jp":"とらのあな","fanbox.cc":"FANBOX"};

const root = document.documentElement;
const tabsEl = document.getElementById("tabs"), daysEl = document.getElementById("days");
const langEl = document.getElementById("lang"), themeEl = document.getElementById("theme"), snsEl = document.getElementById("sns");
// localStorage はプライベートモード等で例外になるので、使えなければ保存しないだけにする
const store = {
  get: k => { try { return localStorage.getItem(k); } catch(e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch(e) {} },
};
let lang = CONFIG.defaultLang, rows = null, failed = false;
const t = k => I18N[lang][k];
const siteName = n => n === "nico" ? (lang === "ja" ? "ニコニコ" : "Niconico") : n;

function parseCsv(src){
  src = src.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const table = [[]];
  let cell = "", quoted = false;
  for (let i = 0; i < src.length; i++){
    const c = src[i];
    if (quoted){
      if (c === '"' && src[i + 1] === '"'){ cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    }
    else if (c === '"') quoted = true;
    else if (c === ","){ table.at(-1).push(cell); cell = ""; }
    else if (c === "\n"){ table.at(-1).push(cell); cell = ""; table.push([]); }
    else cell += c;
  }
  table.at(-1).push(cell);
  const [head, ...body] = table;
  const keys = head.map(h => h.trim());
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
}

async function load(){
  const cached = store.get(CONFIG.cacheKey);
  if (cached) show(cached);
  try {
    const res = await fetch(CONFIG.csvUrl);
    if (!res.ok) throw new Error(res.status);
    const text = await res.text();
    if (text === cached) return;
    store.set(CONFIG.cacheKey, text);
    show(text);
  } catch(e) {
    if (!cached){ failed = true; render(); }
  }
}
function show(text){ rows = parseCsv(text).filter(r => r.date); render(); }

const ytId = r => (r.youtube || "").match(/(?:[?&]v=|youtu\.be\/|\/shorts\/)([\w-]+)/)?.[1];
function thumbOf(r){
  if (r.image) return r.image;
  const id = ytId(r);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}
// 埋め込むプレイヤー。YouTube → Bilibili → ニコニコの順で最初にあるもの（中国語表示のときは Bilibili を先に）
function videoOf(r){
  const yt = ytId(r), bv = (r.bilibili || "").match(/\/video\/(BV\w+)/)?.[1];
  const nico = (r.nico || "").match(/(?:\/watch\/|nico\.ms\/)((?:sm|nm|so)?\d+)/)?.[1];
  const list = [
    yt && {site: "YouTube", url: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&enablejsapi=1`, pause: true},
    bv && {site: "Bilibili", url: `https://player.bilibili.com/player.html?bvid=${bv}&autoplay=1`},
    nico && {site: siteName("nico"), url: `https://embed.nicovideo.jp/watch/${nico}?autoplay=1`},
  ];
  if (lang.startsWith("zh")) [list[0], list[1]] = [list[1], list[0]];
  return list.find(Boolean);
}
function shopName(url){
  let host = "";
  try { host = new URL(url).hostname; } catch(e) {}
  const hit = Object.keys(SHOPS).find(d => host === d || host.endsWith("." + d));
  return hit ? SHOPS[hit] : t("otherLink");
}
// other 列は1行1リンク。「表示名 URL」は最後の半角スペース以降を URL とみなす
function otherLinks(cell){
  return cell.split("\n").map(s => s.trim()).flatMap(line => {
    const i = line.lastIndexOf(" "), url = line.slice(i + 1), name = i < 0 ? "" : line.slice(0, i).trim();
    return url.startsWith("http") ? [[name || shopName(url), url]] : [];
  });
}
function linksOf(r){
  const fixed = LINK_COLS.filter(([k]) => (r[k] || "").startsWith("http")).map(([k, n]) => [siteName(n), r[k]]);
  return [...fixed, ...otherLinks(r.other || "")];
}

function el(tag, cls, text){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
// 外部リンクは別タブで開き、ホバーで URL を出す
function linkEl(text, url){
  const a = el("a", null, text);
  a.href = url; a.title = url; a.target = "_blank"; a.rel = "noopener noreferrer";
  return a;
}
function postEl(r){
  const work = r.type === "work";
  const card = el("article", "post" + (work ? " work" : ""));
  card.append(el("span", "kind", t(work ? "tabWorks" : "tabPosts")), el("p", "text", r.text));
  const src = thumbOf(r), video = videoOf(r);
  if (video) card.append(mediaEl(video, src, !!r.image));
  else if (src){ const img = el("img", "thumb"); img.src = src; img.alt = ""; img.loading = "lazy"; card.append(img); }
  const links = linksOf(r);
  if (links.length){
    const out = el("div", "out");
    links.forEach(([n, u]) => out.append(linkEl(n, u)));
    card.append(out);
  }
  return card;
}
// 最初はサムネイルだけ出し、押されたらその場でプレイヤーに差し替える（読み込みを軽くし、ホイールの横送りも邪魔しない）
function mediaEl(video, src, fit){
  const btn = el("button", "media");
  btn.type = "button";
  btn.setAttribute("aria-label", `${t("play")} (${video.site})`);
  if (src){
    const img = el("img", "thumb" + (fit ? " fit" : ""));
    img.src = src; img.alt = ""; img.loading = "lazy"; img.onerror = () => img.remove();
    btn.append(img);
  }
  btn.append(el("span", "play"), el("span", "site", video.site));
  btn.addEventListener("click", () => {
    const f = el("iframe", "media");
    f.src = video.url; f.title = video.site;
    f.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture"; f.allowFullscreen = true;
    f.onPause = video.pause
      ? () => f.contentWindow?.postMessage(JSON.stringify({event: "command", func: "pauseVideo", args: []}), "*")
      : () => { offscreen.unobserve(f); f.replaceWith(btn); };
    btn.replaceWith(f);
    offscreen.observe(f);
  });
  return btn;
}
// 再生中の動画が画面（縦・横どちらでも）から外れたら止める。YouTube は一時停止、一時停止の手段がないサイトはサムネイルに戻す
const offscreen = new IntersectionObserver(es => es.forEach(e => {
  if (!e.target.isConnected) offscreen.unobserve(e.target); // タブ切り替えなどで消えたもの
  else if (!e.isIntersecting) e.target.onPause();
}));
function dayEl(date, posts){
  const li = el("li", "day" + (posts.some(p => p.type === "work") ? " has-work" : ""));
  const wrap = el("div", "rowwrap"), row = el("div", "row");
  row.append(...posts.map(postEl));
  wrap.append(row);
  if (posts.length > 1){
    row.classList.add("multi");
    row.tabIndex = 0;
    row.setAttribute("aria-label", `${date} (${posts.length})`);
    const more = el("button", "more");
    more.type = "button";
    wrap.append(more);
  }
  li.append(el("span", "date", date.replaceAll("-", ".")), wrap);
  return li;
}
function render(){
  const tab = TABS.find(x => x[0] === location.hash.slice(1)) || TABS[0];
  tabsEl.innerHTML = TABS.map(([k, l]) => `<button class="tab" role="tab" id="tab-${k}" data-k="${k}" aria-selected="${k === tab[0]}">${t(l)}</button>`).join("");
  if (!rows && !failed) return;
  const byDay = {};
  (rows || []).filter(r => !tab[2] || r.type === tab[2]).forEach(r => (byDay[r.date] ||= []).unshift(r)); // 同じ日の中は行の逆順＝新しい投稿が左
  const dates = Object.keys(byDay).sort().reverse();
  daysEl.replaceChildren(...(dates.length ? dates.map(d => dayEl(d, byDay[d])) : [el("li", "empty", t(failed ? "loadError" : "empty"))]));
  daysEl.classList.toggle("is-empty", !dates.length);
  daysEl.querySelectorAll(".row.multi").forEach(setupRow);
}

// 横並びの日：今いる位置・右の+N・ホイールでの送り
const pos = row => {
  if (row.scrollLeft >= row.scrollWidth - row.clientWidth - 1) return row.children.length - 1;
  return Math.round(row.scrollLeft / (row.firstElementChild.offsetWidth + 10));
};
// scrollTo の smooth は環境（OSのアニメーション設定など）で一瞬になるので自前で動かす。動かす間だけ snap を外す
const anim = new WeakMap();
function goTo(row, i){
  cancelAnimationFrame(anim.get(row));
  const from = row.scrollLeft;
  const to = Math.min(row.children[i].offsetLeft - row.firstElementChild.offsetLeft, row.scrollWidth - row.clientWidth);
  const t0 = performance.now(), dur = 380;
  row.style.scrollSnapType = "none";
  const step = now => {
    const t = Math.min((now - t0) / dur, 1);
    row.scrollLeft = from + (to - from) * (1 - Math.pow(1 - t, 3));
    if (t < 1) anim.set(row, requestAnimationFrame(step));
    else row.style.scrollSnapType = "";
  };
  anim.set(row, requestAnimationFrame(step));
}
function updateBadge(row){
  const btn = row.nextElementSibling, left = row.children.length - 1 - pos(row);
  btn.classList.toggle("back", left === 0);
  btn.textContent = left ? `+${left}` : "↩";
  btn.setAttribute("aria-label", left ? t("next").replace("{n}", left) : t("back"));
}
function setupRow(row){
  const btn = row.nextElementSibling;
  let lock = false;
  updateBadge(row);
  row.addEventListener("scroll", () => updateBadge(row), {passive: true});
  btn.addEventListener("click", () => { const i = pos(row) + 1; goTo(row, i < row.children.length ? i : 0); });
  // 縦ホイールを横送りに変える。端まで来たらページのスクロールに戻す
  row.addEventListener("wheel", e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const next = pos(row) + Math.sign(e.deltaY);
    if (next < 0 || next >= row.children.length) return;
    e.preventDefault();
    if (lock) return;
    lock = true; setTimeout(() => lock = false, 450);
    goTo(row, next);
  }, {passive: false});
}
tabsEl.addEventListener("click", e => {
  const k = e.target.closest(".tab")?.dataset.k;
  if (!k) return;
  if (k === "all") history.replaceState(null, "", location.pathname + location.search);
  else location.hash = k;
  render();
});
window.addEventListener("hashchange",render);

// 言語：ブラウザの言語 → 保存した選択 → URL 指定の順で優先度が上がる
function matchLang(tag){
  const l = (tag || "").toLowerCase();
  if (l.startsWith("zh")) return /tw|hk|mo|hant/.test(l) ? "zh-TW" : "zh-CN";
  return LANGS.find(([k]) => k === l.split("-")[0])?.[0] || null;
}
function pickLang(){
  const candidates = [new URLSearchParams(location.search).get("lang"), store.get("lang"), ...(navigator.languages || [])];
  return candidates.map(matchLang).find(Boolean) || CONFIG.defaultLang;
}
function applyLang(l){
  lang = l;
  root.lang = l;
  langEl.value = l;
  langEl.setAttribute("aria-label", t("language"));
  themeEl.setAttribute("aria-label", t("theme"));
  snsEl.replaceChildren(...CONFIG.sns.map(([n, u]) => linkEl(siteName(n), u)));
  render();
}
langEl.append(...LANGS.map(([k, n]) => { const o = el("option", null, n); o.value = k; return o; }));
langEl.addEventListener("change", () => {
  store.set("lang", langEl.value);
  const q = new URLSearchParams(location.search);
  if (q.has("lang")){ q.set("lang", langEl.value); history.replaceState(null, "", `${location.pathname}?${q}${location.hash}`); }
  applyLang(langEl.value);
});

const savedTheme = store.get("theme");
root.dataset.theme = savedTheme === "light" || savedTheme === "dark" ? savedTheme
  : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
themeEl.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  store.set("theme", root.dataset.theme);
});

applyLang(pickLang());
load();
