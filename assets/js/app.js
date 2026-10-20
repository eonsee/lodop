/* LODOP 技术文档 · 交互层 */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const HEADER = 60;

  /* ============ 工具 ============ */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function markText(text, q) {
    if (!q) return escapeHtml(text);
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q.toLowerCase());
    if (idx < 0) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, idx)) +
      '<mark>' + escapeHtml(text.slice(idx, idx + q.length)) + '</mark>' +
      escapeHtml(text.slice(idx + q.length))
    );
  }

  function tokenize(code, regex, classes) {
    let out = '';
    let last = 0;
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(code)) !== null) {
      out += escapeHtml(code.slice(last, m.index));
      let matched = false;
      for (let g = 1; g < m.length; g++) {
        if (m[g] !== undefined) {
          out += '<span class="' + classes[g - 1] + '">' + escapeHtml(m[g]) + '</span>';
          matched = true;
          break;
        }
      }
      if (!matched) out += escapeHtml(m[0]);
      last = regex.lastIndex;
      if (m[0] === '') regex.lastIndex++;
    }
    out += escapeHtml(code.slice(last));
    return out;
  }

  const JS_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:LODOP|document|window|navigator)\b)|(\b(?:var|let|const|function|return|if|else|for|while|new|true|false|null|undefined|typeof|alert|console)\b)|(\b[A-Z][A-Z0-9]*_[A-Z0-9_]+|\b[A-Z]{2,}\b)|(\b\d+(?:\.\d+)?\b)/g;
  const JS_CLASSES = ['tk-com', 'tk-str', 'tk-fn', 'tk-key', 'tk-fn', 'tk-num'];

  const HTML_RE = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z][\w:-]*)|(\s[a-zA-Z-]+(?==))|("[^"]*"|'[^']*')|(>)/g;
  const HTML_CLASSES = ['tk-com', 'tk-tag', 'tk-attr', 'tk-str', 'tk-punc'];

  function highlight(code, lang) {
    return lang === 'html'
      ? tokenize(code, HTML_RE, HTML_CLASSES)
      : tokenize(code, JS_RE, JS_CLASSES);
  }

  function highlightEl(el) {
    const lang = el.closest('[data-lang]')?.dataset.lang || 'javascript';
    const raw = el.textContent;
    el.dataset.raw = raw;
    el.innerHTML = highlight(raw, lang);
  }

  let toastTimer = null;
  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.innerHTML = '<svg class="icon"><use href="#i-check"/></svg><span>' + escapeHtml(message) + '</span>';
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast('已复制到剪贴板');
      return true;
    } catch (err) {
      toast('复制失败，请手动选择');
      return false;
    }
  }

  /* ============ 主题 ============ */
  function initTheme() {
    let theme = 'light';
    try {
      theme = localStorage.getItem('lodop-theme') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch (e) { /* ignore */ }
    document.documentElement.dataset.theme = theme;
    syncThemeAria();

    $('#themeBtn')?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('lodop-theme', next); } catch (e) { /* ignore */ }
      syncThemeAria();
    });
  }

  function syncThemeAria() {
    const btn = $('#themeBtn');
    if (!btn) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    btn.setAttribute('aria-label', dark ? '切换到浅色主题' : '切换到深色主题');
    btn.title = dark ? '切换到浅色主题' : '切换到深色主题';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f6f8fb');
  }

  /* ============ 高阶能力 ============ */
  function renderAdvanced() {
    const grid = $('#advGrid');
    if (!grid || typeof ADVANCED === 'undefined') return;

    grid.innerHTML = ADVANCED.map((adv) => {
      const api = apiIndex.find((a) => a.id === adv.api);
      const fn = api ? api.name : adv.api;
      return `<button class="adv-card" data-api="${adv.api}" data-tone="${adv.tone}" aria-label="查看函数 ${escapeHtml(fn)}">
        <span class="adv-icon"><svg class="icon"><use href="#i-${adv.icon}"/></svg></span>
        <span class="adv-kicker">${escapeHtml(adv.kicker)}</span>
        <span class="adv-title">${escapeHtml(adv.title)}</span>
        <span class="adv-desc">${escapeHtml(adv.desc)}</span>
        <span class="adv-tags">${adv.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</span>
        <span class="adv-foot"><code>${escapeHtml(fn)}</code><span>查看函数<svg class="icon"><use href="#i-arrow"/></svg></span></span>
      </button>`;
    }).join('');

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.adv-card');
      if (card) openApi(card.dataset.api);
    });

    $('#advFilterBtn')?.addEventListener('click', () => setFilter('enhanced'));
  }

  function openApi(id) {
    const search = $('#apiSearch');
    if (search) search.value = '';
    query = '';
    activeCat = 'all';
    $$('.filter-chip').forEach((b) => {
      const on = b.dataset.cat === 'all';
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    $$('.side-cat').forEach((b) => b.classList.remove('active'));
    applyFilter();

    const card = document.querySelector(`#apiList .api-card[data-id="${id}"]`);
    if (!card) return;
    card.classList.add('open', 'flash');
    card.querySelector('.api-head')?.setAttribute('aria-expanded', 'true');
    // 让函数行落在吸顶工具栏下方，避免被遮住
    const toolbarH = $('#apiToolbar')?.offsetHeight || 0;
    const top = card.getBoundingClientRect().top + window.scrollY - HEADER - toolbarH - 12;
    window.scrollTo({ top, behavior: 'smooth' });
    setTimeout(() => card.classList.remove('flash'), 1800);
    setTimeout(() => card.querySelector('.api-head')?.focus({ preventScroll: true }), 360);
    closeNav();
  }

  /* ============ 系统文件 ============ */
  function renderFiles() {
    const grid = $('#fileGrid');
    if (!grid || typeof SYSTEM_FILES === 'undefined') return;
    grid.innerHTML = SYSTEM_FILES.map((file) => `
      <article class="file-card">
        <span class="file-icon"><svg class="icon"><use href="#i-${file.icon}"/></svg></span>
        <div class="file-body">
          <div class="file-title">
            <code>${escapeHtml(file.name)}</code>
            <span class="file-tag">${escapeHtml(file.tag)}</span>
          </div>
          <p>${escapeHtml(file.desc)}</p>
        </div>
      </article>`).join('');
  }

  /* ============ API 渲染 ============ */
  let activeCat = 'all';
  let query = '';
  let apiIndex = [];

  function buildIndex() {
    apiIndex = (typeof APIS !== 'undefined' ? APIS : []).map((api) => {
      const paramText = (api.params || []).map((p) => p.n + ' ' + p.t + ' ' + p.d).join(' ');
      return Object.assign({}, api, {
        _search: [api.name, api.zh, api.sig, api.desc, api.note || '', paramText, api.example || ''].join(' ').toLowerCase()
      });
    });
  }

  function renderChips() {
    const wrap = $('#filterChips');
    if (!wrap) return;
    const enhCount = apiIndex.filter((a) => a.group === 'enhanced').length;
    const chips = CATS.map((cat) => {
      const count = cat.key === 'all'
        ? apiIndex.length
        : apiIndex.filter((a) => a.cat === cat.key).length;
      return `<button class="filter-chip${cat.key === 'all' ? ' active' : ''}" data-cat="${cat.key}" role="tab" aria-selected="${cat.key === 'all'}">
        ${cat.label}<span class="n">${count}</span>
      </button>`;
    });
    chips.push(`<button class="filter-chip enh-chip" data-cat="enhanced" role="tab" aria-selected="false">
      <svg class="icon"><use href="#i-spark"/></svg>增强型<span class="n">${enhCount}</span>
    </button>`);
    wrap.innerHTML = chips.join('');

    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-chip');
      if (!btn) return;
      setFilter(btn.dataset.cat);
    });

    // 同步侧栏数量
    $$('.side-cat').forEach((btn) => {
      const key = btn.dataset.filter;
      const count = key === 'all'
        ? apiIndex.length
        : key === 'enhanced'
          ? enhCount
          : apiIndex.filter((a) => a.cat === key).length;
      const span = btn.querySelector('span');
      if (span) span.textContent = count;
    });
  }

  function renderAPI() {
    const list = $('#apiList');
    if (!list) return;
    list.innerHTML = apiIndex.map((api) => {
      const params = api.params || [];
      const paramTable = params.length ? `
        <p class="api-section-title">参数</p>
        <table class="param-table">
          <thead><tr><th>参数</th><th>类型</th><th>说明</th></tr></thead>
          <tbody>${params.map((p) => `<tr>
            <td>${escapeHtml(p.n)}</td>
            <td>${escapeHtml(p.t)}</td>
            <td>${escapeHtml(p.d)}</td>
          </tr>`).join('')}</tbody>
        </table>` : '';
      const ret = api.ret ? `
        <p class="api-section-title">返回</p>
        <div class="ret-line"><span class="ret-tag">返回</span><span>${escapeHtml(api.ret)}</span></div>` : '';
      const example = api.example ? `
        <p class="api-section-title">示例</p>
        <div class="code-block" data-lang="javascript">
          <div class="code-head"><span>javascript</span><button class="copy-btn" data-copy>复制</button></div>
          <pre><code>${escapeHtml(api.example)}</code></pre>
        </div>` : '';
      const note = api.note ? `<div class="api-note">${escapeHtml(api.note)}</div>` : '';
      let snippet = '';
      if (query) {
        const ql = query.toLowerCase();
        let source = api.desc;
        let idx = source.toLowerCase().indexOf(ql);
        if (idx < 0) {
          for (const p of (api.params || [])) {
            const text = p.n + '：' + p.d;
            const i = text.toLowerCase().indexOf(ql);
            if (i >= 0) { source = text; idx = i; break; }
          }
        }
        if (idx >= 0) {
          const start = Math.max(0, idx - 16);
          const end = Math.min(source.length, idx + query.length + 36);
          snippet = `<span class="api-snippet">${start > 0 ? '…' : ''}${markText(source.slice(start, end), query)}${end < source.length ? '…' : ''}</span>`;
        }
      }

      return `<article class="api-card" data-id="${api.id}" data-cat="${api.cat}" data-group="${api.group}">
        <button class="api-head" aria-expanded="false" aria-controls="body-${api.id}">
          <span class="api-badge" data-cat="${api.cat}">${CAT_LABEL[api.cat] || ''}</span>
          <span class="api-main">
            <span class="api-name">
              <code>${markText(api.name, query)}</code>
              <span class="zh">${markText(api.zh, query)}</span>
              ${api.group === 'enhanced' ? '<span class="enh-tag"><svg class="icon"><use href="#i-spark"/></svg>增强</span>' : ''}
            </span>
            <span class="api-sig">${markText(api.sig, query)}</span>
            ${snippet}
          </span>
          <span class="api-chev"><svg class="icon"><use href="#i-chev"/></svg></span>
        </button>
        <div class="api-body" id="body-${api.id}">
          <div class="api-body-inner">
            <p class="api-desc">${markText(api.desc, query)}</p>
            ${paramTable}${ret}${example}${note}
          </div>
        </div>
      </article>`;
    }).join('');

    $$('#apiList pre code').forEach(highlightEl);
  }

  function setFilter(cat, opts = {}) {
    activeCat = cat;
    $$('.filter-chip').forEach((b) => {
      const on = b.dataset.cat === cat;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    $$('.side-cat').forEach((b) => b.classList.toggle('active', b.dataset.filter === cat));
    applyFilter();

    if (opts.scroll !== false) {
      const api = $('#api');
      if (api) window.scrollTo({ top: api.offsetTop - HEADER - 6, behavior: 'smooth' });
    }
  }

  function applyFilter() {
    const q = query.trim().toLowerCase();
    let visible = 0;
    let total = 0;
    $$('#apiList .api-card').forEach((card) => {
      const api = apiIndex.find((a) => a.id === card.dataset.id);
      total++;
      const matchCat = activeCat === 'all'
        || (activeCat === 'enhanced' ? card.dataset.group === 'enhanced' : card.dataset.cat === activeCat);
      const matchText = !q || api._search.indexOf(q) >= 0;
      const show = matchCat && matchText;
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });

    const countEl = $('#apiCount');
    if (countEl) {
      countEl.textContent = q || activeCat !== 'all'
        ? `显示 ${visible} / ${total} 个函数`
        : `共 ${total} 个函数`;
    }
    const empty = $('#apiEmpty');
    if (empty) empty.hidden = visible !== 0;

    const expandBtn = $('#expandAllBtn');
    if (expandBtn) {
      const anyOpen = $$('#apiList .api-card:not(.hidden).open').length > 0;
      expandBtn.textContent = anyOpen ? '全部收起' : '全部展开';
    }
    const clear = $('#searchClear');
    if (clear) clear.hidden = !query;
  }

  function bindAPI() {
    const search = $('#apiSearch');
    let timer = null;
    search?.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        query = search.value;
        rerenderForQuery();
      }, 90);
    });

    $('#searchClear')?.addEventListener('click', () => {
      if (!search) return;
      search.value = '';
      query = '';
      rerenderForQuery();
      search.focus();
    });

    $('#resetSearch')?.addEventListener('click', () => {
      if (search) search.value = '';
      query = '';
      activeCat = 'all';
      $$('.filter-chip').forEach((b) => {
        const on = b.dataset.cat === 'all';
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on);
      });
      $$('.side-cat').forEach((b) => b.classList.remove('active'));
      rerenderForQuery();
    });

    $('#apiList')?.addEventListener('click', (e) => {
      const head = e.target.closest('.api-head');
      if (!head) return;
      const card = head.closest('.api-card');
      const open = card.classList.toggle('open');
      head.setAttribute('aria-expanded', open);
      applyFilter();
    });

    $('#expandAllBtn')?.addEventListener('click', () => {
      const cards = $$('#apiList .api-card:not(.hidden)');
      const anyOpen = cards.some((c) => c.classList.contains('open'));
      cards.forEach((c) => {
        c.classList.toggle('open', !anyOpen);
        c.querySelector('.api-head')?.setAttribute('aria-expanded', String(!anyOpen));
      });
      $('#expandAllBtn').textContent = anyOpen ? '全部展开' : '全部收起';
    });
  }

  function rerenderForQuery() {
    renderAPI();
    applyFilter();
  }

  /* ============ 搜索快捷键 ============ */
  function focusSearch() {
    const section = $('#api');
    if (section) window.scrollTo({ top: section.offsetTop - HEADER - 6, behavior: 'smooth' });
    const search = $('#apiSearch');
    if (search) {
      setTimeout(() => {
        search.focus({ preventScroll: true });
        search.select();
      }, 340);
    }
    closeNav();
  }

  function bindGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        focusSearch();
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        focusSearch();
      } else if (e.key === 'Escape') {
        closeNav();
        const search = $('#apiSearch');
        if (document.activeElement === search && search.value) {
          search.value = '';
          query = '';
          rerenderForQuery();
        }
      }
    });
    $('#searchTrigger')?.addEventListener('click', focusSearch);
  }

  /* ============ 复制 ============ */
  function bindCopy() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;
      let text = '';
      const target = btn.dataset.copy;
      if (target && target.startsWith('#')) {
        text = $(target)?.textContent || '';
      } else if (target) {
        text = target;
      } else {
        const pre = btn.closest('.code-block')?.querySelector('pre code');
        text = pre?.dataset.raw || pre?.textContent || '';
      }
      if (!text) return;
      copyText(text).then((ok) => {
        if (!ok) return;
        btn.classList.add('copied');
        const old = btn.textContent;
        btn.textContent = '已复制';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.textContent = old;
        }, 1600);
      });
    });
  }

  /* ============ 侧边栏 / 移动端 ============ */
  function openNav() {
    document.body.classList.add('nav-open');
    const mask = $('#sidebarMask');
    if (mask) mask.hidden = false;
    $('#menuBtn')?.setAttribute('aria-expanded', 'true');
  }
  function closeNav() {
    document.body.classList.remove('nav-open');
    const mask = $('#sidebarMask');
    if (mask) mask.hidden = true;
    $('#menuBtn')?.setAttribute('aria-expanded', 'false');
  }
  function bindNav() {
    $('#menuBtn')?.addEventListener('click', () => {
      if (document.body.classList.contains('nav-open')) closeNav();
      else openNav();
    });
    $('#sidebarMask')?.addEventListener('click', closeNav);
    $$('.sidebar a, .sidebar .side-cat').forEach((el) => {
      el.addEventListener('click', () => {
        closeNav();
        const filter = el.dataset.filter;
        if (filter) {
          setTimeout(() => setFilter(filter, { scroll: true }), 80);
        }
      });
    });
  }

  /* ============ TOC / 滚动 ============ */
  const TOC = [
    { id: 'overview', label: '文档概览' },
    { id: 'start', label: '系统文件与安装' },
    { id: 'quick', label: '三步开始打印' },
    { id: 'params', label: '控件参数' },
    { id: 'advanced', label: '高阶能力' },
    { id: 'api', label: 'API 参考' },
    { id: 'sandbox', label: '排版沙盒' },
    { id: 'units', label: '计量单位' },
    { id: 'license', label: '注册与维护' }
  ];

  function buildTOC() {
    const nav = $('#tocNav');
    if (!nav) return;
    nav.innerHTML = TOC.map((item) =>
      `<a href="#${item.id}" data-section="${item.id}">${item.label}</a>`
    ).join('');
  }

  function initScroll() {
    const topbar = $('.topbar');
    const ids = ['overview', 'start', 'quick', 'params', 'advanced', 'api', 'sandbox', 'units', 'license'];
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    let ticking = false;

    function update() {
      ticking = false;
      const y = window.scrollY;
      if (topbar) topbar.classList.toggle('scrolled', y > 8);

      let current = sections[0]?.id;
      sections.forEach((sec) => {
        if (sec.getBoundingClientRect().top <= HEADER + 110) current = sec.id;
      });

      $$('.side-link[data-section]').forEach((link) => {
        link.classList.toggle('active', link.dataset.section === current);
      });
      $$('#tocNav a').forEach((link) => {
        link.classList.toggle('active', link.dataset.section === current);
      });

      const toolbar = $('#apiToolbar');
      if (toolbar) {
        toolbar.classList.toggle('stuck', toolbar.getBoundingClientRect().top <= HEADER + 1);
      }
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    $('#backTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ============ 沙盒 ============ */
  const SANDBOX_STATE = {};
  let sandboxPaper = 'a4';

  function renderToggles() {
    const wrap = $('#toggleList');
    if (!wrap || typeof SANDBOX_ITEMS === 'undefined') return;
    wrap.innerHTML = SANDBOX_ITEMS.map((item) => {
      SANDBOX_STATE[item.key] = item.on;
      return `<label class="toggle-row">
        <span>${escapeHtml(item.label)}</span>
        <input type="checkbox" data-key="${item.key}" ${item.on ? 'checked' : ''}>
        <span class="switch" aria-hidden="true"></span>
      </label>`;
    }).join('');

    wrap.addEventListener('change', (e) => {
      const input = e.target.closest('input[data-key]');
      if (!input) return;
      SANDBOX_STATE[input.dataset.key] = input.checked;
      updateSandbox();
    });
  }

  function bindPaperSwitch() {
    $('#paperSwitch')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      sandboxPaper = btn.dataset.paper;
      $$('#paperSwitch .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
      const paper = $('#paper');
      if (paper) paper.dataset.paper = sandboxPaper;
      const caption = $('#paperCaption');
      if (caption) {
        caption.textContent = sandboxPaper === 'a4'
          ? 'A4 · 210 × 297 mm · 纵向'
          : '小票 · 80 mm 宽 · 高度自适应';
      }
      updateSandbox();
    });
  }

  function updateSandbox() {
    if (typeof SANDBOX_ITEMS === 'undefined') return;

    SANDBOX_ITEMS.forEach((item) => {
      document.querySelectorAll(`#paper [data-el="${item.key}"]`).forEach((el) => {
        el.classList.toggle('is-off', !SANDBOX_STATE[item.key]);
      });
    });

    const lines = [
      '// 初始化与纸张',
      'LODOP.PRINT_INIT("文档排版示例");',
      sandboxPaper === 'a4'
        ? 'LODOP.SET_PRINT_PAGESIZE(1, 0, 0, "A4"); // A4 纵向'
        : 'LODOP.SET_PRINT_PAGESIZE(3, 800, 0, ""); // 80mm 宽，高度自适应',
      ''
    ];

    SANDBOX_ITEMS.forEach((item) => {
      if (!SANDBOX_STATE[item.key]) return;
      lines.push(`// ${item.label}`);
      lines.push(item.code);
      lines.push('');
    });

    lines.push('// 预览或直接打印');
    lines.push('LODOP.PREVIEW();');

    const codeEl = $('#sandboxCode');
    if (codeEl) {
      codeEl.textContent = lines.join('\n');
      highlightEl(codeEl);
    }
  }

  /* ============ 背景：深海鱼群 ============ */
  function initParticles() {
    const canvas = $('#particles');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const TAU = Math.PI * 2;
    const state = {
      w: 0, h: 0, dpr: 1, raf: 0, last: 0, dark: false,
      fish: [], schools: [], bubbles: [], plankton: []
    };

    const PALETTE = {
      light: {
        rayStrong: 'rgba(255, 255, 255, .26)',
        rayMid: 'rgba(255, 255, 255, .05)',
        rayNone: 'rgba(255, 255, 255, 0)',
        fish: ['13, 110, 145', '22, 119, 255', '10, 145, 134'],
        eye: 'rgba(247, 252, 255, .92)',
        bubble: '62, 152, 188',
        plankton: '22, 119, 255',
        fishAlpha: 0.38,
        bubbleAlpha: 0.42,
        planktonAlpha: 0.4
      },
      dark: {
        rayStrong: 'rgba(255, 255, 255, .045)',
        rayMid: 'rgba(255, 255, 255, .012)',
        rayNone: 'rgba(255, 255, 255, 0)',
        fish: ['94, 224, 255', '122, 170, 255', '94, 240, 210'],
        eye: 'rgba(6, 20, 36, .85)',
        bubble: '120, 220, 255',
        plankton: '94, 224, 255',
        fishAlpha: 0.52,
        bubbleAlpha: 0.48,
        planktonAlpha: 0.48
      }
    };

    const palette = () => PALETTE[state.dark ? 'dark' : 'light'];
    const readTheme = () => { state.dark = document.documentElement.dataset.theme === 'dark'; };

    function makeFish() {
      const near = Math.random();
      return {
        x: Math.random() * state.w,
        y: state.h * (0.12 + Math.random() * 0.76),
        dir: Math.random() < 0.5 ? -1 : 1,
        size: 8 + near * near * 24,
        speed: 9 + Math.random() * 24,
        bob: 4 + Math.random() * 11,
        bobSpeed: 0.35 + Math.random() * 0.5,
        phase: Math.random() * TAU,
        wagSpeed: 2.6 + Math.random() * 3,
        tone: Math.floor(Math.random() * 3),
        alpha: 0.55 + Math.random() * 0.45
      };
    }

    function seed() {
      const small = state.w < 760;
      state.fish = Array.from({ length: small ? 7 : 13 }, makeFish);

      state.schools = [];
      const groups = small ? 1 : 2;
      for (let g = 0; g < groups; g++) {
        const count = small ? 4 : 5;
        const members = [];
        for (let m = 0; m < count; m++) {
          members.push({
            dx: -(m * (10 + Math.random() * 5)),
            dy: (Math.random() - 0.5) * (9 + m * 3.5),
            size: 4.5 + Math.random() * 3.5,
            phase: Math.random() * TAU,
            tone: Math.floor(Math.random() * 3)
          });
        }
        state.schools.push({
          x: Math.random() * state.w,
          y: state.h * (0.2 + Math.random() * 0.5),
          dir: Math.random() < 0.5 ? -1 : 1,
          speed: 13 + Math.random() * 12,
          bobSpeed: 0.4 + Math.random() * 0.35,
          phase: Math.random() * TAU,
          members
        });
      }

      state.bubbles = Array.from({ length: small ? 13 : 22 }, () => ({
        x: Math.random() * state.w,
        y: Math.random() * state.h,
        r: 0.8 + Math.random() * 2.6,
        speed: 7 + Math.random() * 16,
        wobble: 2 + Math.random() * 8,
        phase: Math.random() * TAU,
        alpha: 0.5 + Math.random() * 0.5
      }));

      state.plankton = Array.from({ length: small ? 28 : 52 }, () => ({
        x: Math.random() * state.w,
        y: Math.random() * state.h,
        r: 0.4 + Math.random() * 0.9,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 3,
        phase: Math.random() * TAU,
        alpha: 0.4 + Math.random() * 0.6
      }));
    }

    function resize() {
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = window.innerWidth;
      state.h = window.innerHeight;
      canvas.width = Math.round(state.w * state.dpr);
      canvas.height = Math.round(state.h * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      seed();
    }

    function drawRays(p, t) {
      const n = state.w < 760 ? 2 : 4;
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.35) / n) * state.w + Math.sin(t * 0.07 + i * 1.9) * state.w * 0.035;
        const topW = state.w * 0.05;
        const shift = state.w * (0.1 + (i % 2) * 0.05);
        const bottomW = state.w * 0.22;
        const g = ctx.createLinearGradient(x, 0, x + shift, state.h);
        g.addColorStop(0, p.rayStrong);
        g.addColorStop(0.55, p.rayMid);
        g.addColorStop(1, p.rayNone);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + topW, 0);
        ctx.lineTo(x + shift + bottomW, state.h);
        ctx.lineTo(x + shift, state.h);
        ctx.closePath();
        ctx.fill();
      }
    }

    function drawPlankton(p, t, dt) {
      ctx.fillStyle = `rgb(${p.plankton})`;
      for (const q of state.plankton) {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (q.x < -6) q.x = state.w + 6;
        if (q.x > state.w + 6) q.x = -6;
        if (q.y < -6) q.y = state.h + 6;
        if (q.y > state.h + 6) q.y = -6;
        const twinkle = 0.55 + 0.45 * Math.sin(t * 1.3 + q.phase);
        ctx.globalAlpha = p.planktonAlpha * q.alpha * twinkle;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, TAU);
        ctx.fill();
      }
    }

    function drawBubbles(p, t, dt) {
      ctx.lineWidth = 0.7;
      for (const b of state.bubbles) {
        b.y -= b.speed * dt;
        if (b.y < -12) {
          b.y = state.h + 12;
          b.x = Math.random() * state.w;
        }
        const x = b.x + Math.sin(t * 0.9 + b.phase) * b.wobble;
        ctx.globalAlpha = p.bubbleAlpha * b.alpha;
        ctx.fillStyle = `rgba(${p.bubble}, .1)`;
        ctx.strokeStyle = `rgba(${p.bubble}, .8)`;
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, TAU);
        ctx.fill();
        ctx.stroke();
        if (b.r > 2) {
          ctx.globalAlpha = p.bubbleAlpha * b.alpha * 0.9;
          ctx.fillStyle = 'rgba(255, 255, 255, .75)';
          ctx.beginPath();
          ctx.arc(x - b.r * 0.32, b.y - b.r * 0.32, Math.max(0.4, b.r * 0.2), 0, TAU);
          ctx.fill();
        }
      }
    }

    function fishPath(s, wag) {
      ctx.beginPath();
      // 身体
      ctx.moveTo(s * 0.55, 0);
      ctx.bezierCurveTo(s * 0.28, -s * 0.26, -s * 0.1, -s * 0.32, -s * 0.38, -s * 0.1);
      ctx.quadraticCurveTo(-s * 0.46, 0, -s * 0.38, s * 0.1);
      ctx.bezierCurveTo(-s * 0.1, s * 0.32, s * 0.28, s * 0.26, s * 0.55, 0);
      ctx.closePath();
      // 尾鳍
      ctx.moveTo(-s * 0.36, 0);
      ctx.quadraticCurveTo(-s * 0.62, -s * 0.08 + wag * s * 0.12, -s * 0.82, -s * 0.3 + wag * s * 0.2);
      ctx.quadraticCurveTo(-s * 0.7, wag * s * 0.08, -s * 0.82, s * 0.3 + wag * s * 0.2);
      ctx.quadraticCurveTo(-s * 0.62, s * 0.08 + wag * s * 0.12, -s * 0.36, 0);
      ctx.closePath();
      // 背鳍
      ctx.moveTo(-s * 0.02, -s * 0.26);
      ctx.quadraticCurveTo(-s * 0.18, -s * 0.48, -s * 0.3, -s * 0.12);
      ctx.closePath();
      // 胸鳍
      ctx.moveTo(0, s * 0.06);
      ctx.quadraticCurveTo(-s * 0.16, s * 0.3, -s * 0.26, s * 0.06);
      ctx.closePath();
    }

    function drawFish(p, f, x, y, size, dir, t, alphaMul, phase) {
      const wag = Math.sin(t * f.wagSpeed + phase);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.cos(t * f.bobSpeed + phase) * 0.07);
      ctx.scale(dir, 1);

      ctx.globalAlpha = Math.min(0.85, p.fishAlpha * alphaMul);
      ctx.fillStyle = `rgb(${p.fish[f.tone]})`;
      fishPath(size, wag);
      ctx.fill();

      if (state.dark && size > 14) {
        ctx.globalAlpha *= 0.7;
        ctx.strokeStyle = `rgb(${p.fish[f.tone]})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      if (size >= 13) {
        ctx.globalAlpha = Math.min(0.9, p.fishAlpha * alphaMul * 1.9);
        ctx.fillStyle = p.eye;
        ctx.beginPath();
        ctx.arc(size * 0.4, -size * 0.05, Math.max(0.7, size * 0.045), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    function draw(p, t, dt) {
      ctx.clearRect(0, 0, state.w, state.h);
      ctx.globalAlpha = 1;
      drawRays(p, t);
      drawPlankton(p, t, dt);
      drawBubbles(p, t, dt);

      for (const f of state.fish) {
        f.x += f.dir * f.speed * dt;
        if (f.x < -90) f.x = state.w + 90;
        if (f.x > state.w + 90) f.x = -90;
        const y = f.y + Math.sin(t * f.bobSpeed + f.phase) * f.bob;
        drawFish(p, f, f.x, y, f.size, f.dir, t, f.alpha, f.phase);
      }

      for (const school of state.schools) {
        school.x += school.dir * school.speed * dt;
        if (school.x < -120) school.x = state.w + 120;
        if (school.x > state.w + 120) school.x = -120;
        const groupY = school.y + Math.sin(t * school.bobSpeed + school.phase) * 10;
        for (const m of school.members) {
          const x = school.x + m.dx;
          const y = groupY + m.dy + Math.sin(t * 1.1 + m.phase) * 2.5;
          drawFish(p, { tone: m.tone, wagSpeed: 4.6, bobSpeed: 0.8 }, x, y, m.size, school.dir, t, 0.9, m.phase);
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      state.raf = 0;
      if (document.hidden) return;
      if (!state.last) state.last = now;
      const dt = Math.min(0.05, (now - state.last) / 1000);
      state.last = now;
      draw(palette(), now / 1000, dt);
      state.raf = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
      state.last = 0;
      if (reduceQuery.matches) draw(palette(), 0, 0);
      else if (!document.hidden) state.raf = requestAnimationFrame(loop);
    }

    readTheme();
    resize();
    start();

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        start();
      }, 160);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(state.raf);
        state.raf = 0;
      } else {
        start();
      }
    });

    const onMotionChange = () => start();
    if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onMotionChange);
    else if (reduceQuery.addListener) reduceQuery.addListener(onMotionChange);

    new MutationObserver(() => {
      readTheme();
      if (reduceQuery.matches) draw(palette(), 0, 0);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ============ 初始化 ============ */
  function init() {
    initTheme();
    buildIndex();
    renderAdvanced();
    renderFiles();
    renderChips();
    renderAPI();
    bindAPI();
    bindCopy();
    bindNav();
    bindGlobalKeys();
    buildTOC();
    renderToggles();
    bindPaperSwitch();
    updateSandbox();
    applyFilter();
    initScroll();
    initParticles();

    $$('.code-block[data-lang] pre code').forEach(highlightEl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
