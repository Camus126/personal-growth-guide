/* ============================================================
   公共脚本 - 所有页面共享
   包含：主题切换、侧边目录、搜索、返回顶部、移动端菜单、代码复制
   ============================================================ */

/* [JS-01] 主题切换（亮色/暗色） */
(function initTheme() {
  var themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  var themeIcon = document.getElementById('themeIcon');
  var themeText = document.getElementById('themeText');
  var savedTheme = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (themeIcon) themeIcon.textContent = dark ? '☀️' : '🌙';
    if (themeText) themeText.textContent = dark ? '亮色' : '暗色';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }
  applyTheme(isDark);
  themeToggle.addEventListener('click', function() {
    var current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? false : true);
  });
})();

/* [JS-02] 侧边目录自动生成 + 滚动高亮 */
(function initTOC() {
  var tocList = document.getElementById('tocList');
  if (!tocList) return;
  var mainContent = document.getElementById('mainContent');
  var sections = [];
  var headings = mainContent.querySelectorAll('h2[id], h3[id], h4[id]');

  headings.forEach(function(heading) {
    var level = heading.tagName.toLowerCase();
    var id = heading.id;
    var text = heading.textContent.trim();
    sections.push({ id: id, text: text, level: level, element: heading });
    var li = document.createElement('li');
    if (level === 'h3') li.className = 'toc-h3';
    if (level === 'h4') li.className = 'toc-h4';
    var a = document.createElement('a');
    a.href = '#' + id; a.textContent = text; a.dataset.target = id;
    li.appendChild(a); tocList.appendChild(li);
  });

  var tocLinks = tocList.querySelectorAll('a');
  var headerOffset = 80;
  function updateActiveTOC() {
    var scrollPos = window.scrollY + headerOffset + 20;
    var activeIndex = 0;
    for (var i = 0; i < sections.length; i++) { if (sections[i].element.offsetTop <= scrollPos) activeIndex = i; }
    tocLinks.forEach(function(link, idx) { link.classList.toggle('active', idx === activeIndex); });
  }
  var scrollTimeout;
  window.addEventListener('scroll', function() {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(function() { scrollTimeout = null; updateActiveTOC(); }, 100);
  });
  updateActiveTOC();
  tocLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      var sidebar = document.getElementById('sidebarToc');
      if (sidebar) sidebar.classList.remove('open');
    });
  });
})();

/* [JS-03] 全局关键词搜索（仅搜索当前页面内容） */
(function initSearch() {
  var searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  var searchResults = document.getElementById('searchResults');
  var searchResultsHeader = document.getElementById('searchResultsHeader');
  var searchResultsBody = document.getElementById('searchResultsBody');
  var searchOverlay = document.getElementById('searchOverlay');

  function getSearchableContent() {
    var content = document.getElementById('mainContent');
    if (!content) return [];
    var results = [];
    var sectionEls = content.querySelectorAll('.section');
    sectionEls.forEach(function(section) {
      var sectionTitle = '';
      var h2 = section.querySelector('h2.section-title');
      if (h2) sectionTitle = h2.textContent;
      var textElements = section.querySelectorAll('p, li, td, .timeline-item, .plan-card-body, .callout');
      textElements.forEach(function(el) {
        var text = el.textContent.trim();
        if (text.length > 5) results.push({ text: text, section: sectionTitle, element: el, sectionId: section.id });
      });
    });
    return results;
  }

  var searchCache = getSearchableContent();
  var searchTimeout;
  searchInput.addEventListener('input', function() { clearTimeout(searchTimeout); searchTimeout = setTimeout(doSearch, 200); });
  searchInput.addEventListener('focus', function() { if (searchInput.value.trim().length > 0) doSearch(); });

  function doSearch() {
    var query = searchInput.value.trim().toLowerCase();
    clearHighlights();
    if (query.length === 0) { searchResults.classList.remove('active'); searchOverlay.classList.remove('active'); return; }
    var matches = [];
    searchCache.forEach(function(item) { if (item.text.toLowerCase().indexOf(query) !== -1) matches.push(item); });

    searchResultsHeader.textContent = '找到 ' + matches.length + ' 个结果';
    searchResultsBody.innerHTML = '';
    if (matches.length === 0) {
      searchResultsBody.innerHTML = '<div class="search-no-result">没有找到匹配的内容</div>';
    } else {
      matches.slice(0, 20).forEach(function(match, index) {
        var div = document.createElement('a');
        div.className = 'search-result-item'; div.href = '#' + match.sectionId; div.dataset.index = index;
        var idx = match.text.toLowerCase().indexOf(query);
        var start = Math.max(0, idx - 30), end = Math.min(match.text.length, idx + query.length + 50);
        var preview = (start > 0 ? '...' : '') + match.text.substring(start, idx) + '<mark>' + match.text.substring(idx, idx + query.length) + '</mark>' + match.text.substring(idx + query.length, end) + (end < match.text.length ? '...' : '');
        div.innerHTML = '<div class="section-label">' + match.section + '</div><div class="match-text">' + preview + '</div>';
        div.addEventListener('click', function() {
          searchResults.classList.remove('active'); searchOverlay.classList.remove('active');
          searchInput.value = ''; clearHighlights();
          setTimeout(function() { highlightInElement(match.element, query); }, 300);
        });
        searchResultsBody.appendChild(div);
      });
    }
    searchResults.classList.add('active'); searchOverlay.classList.add('active'); currentResultIndex = -1;
  }

  function clearHighlights() {
    document.querySelectorAll('.search-highlight').forEach(function(h) { var p = h.parentNode; p.replaceChild(document.createTextNode(h.textContent), h); p.normalize(); });
  }
  function highlightInElement(el, query) {
    clearHighlights();
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(node) {
      var text = node.textContent, idx = text.toLowerCase().indexOf(query);
      if (idx === -1) return;
      var before = document.createTextNode(text.substring(0, idx));
      var mark = document.createElement('mark'); mark.className = 'search-highlight current'; mark.textContent = text.substring(idx, idx + query.length);
      var after = document.createTextNode(text.substring(idx + query.length));
      var p = node.parentNode; p.insertBefore(before, node); p.insertBefore(mark, node); p.insertBefore(after, node); p.removeChild(node);
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  var currentResultIndex = -1;
  searchInput.addEventListener('keydown', function(e) {
    var items = searchResultsBody.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); currentResultIndex = Math.min(currentResultIndex + 1, items.length - 1); updateResultHighlight(items); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); currentResultIndex = Math.max(currentResultIndex - 1, 0); updateResultHighlight(items); }
    else if (e.key === 'Enter' && currentResultIndex >= 0) { e.preventDefault(); items[currentResultIndex].click(); }
    else if (e.key === 'Escape') { searchResults.classList.remove('active'); searchOverlay.classList.remove('active'); searchInput.blur(); }
  });
  function updateResultHighlight(items) {
    items.forEach(function(item, i) { item.classList.toggle('active', i === currentResultIndex); });
    if (items[currentResultIndex]) items[currentResultIndex].scrollIntoView({ block: 'nearest' });
  }
  searchOverlay.addEventListener('click', function() { searchResults.classList.remove('active'); searchOverlay.classList.remove('active'); searchInput.value = ''; clearHighlights(); });
})();

/* [JS-04] 返回顶部 */
(function initBackToTop() {
  var btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', function() { btn.classList.toggle('visible', window.scrollY > 400); });
  btn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
})();

/* [JS-05] 移动端汉堡菜单 */
(function initMobileMenu() {
  var menuToggle = document.getElementById('menuToggle');
  var sidebar = document.getElementById('sidebarToc');
  if (!menuToggle || !sidebar) return;
  menuToggle.addEventListener('click', function() { sidebar.classList.toggle('open'); });
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuToggle) sidebar.classList.remove('open');
  });
})();

/* [JS-06] 代码块复制 */
function copyCode(btn) {
  var codeBlock = btn.closest('.code-block');
  var codeEl = codeBlock.querySelector('code');
  var text = codeEl.textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() { btn.textContent = '已复制 ✓'; setTimeout(function() { btn.textContent = '复制'; }, 2000); });
  } else {
    var textarea = document.createElement('textarea'); textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0';
    document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); document.body.removeChild(textarea);
    btn.textContent = '已复制 ✓'; setTimeout(function() { btn.textContent = '复制'; }, 2000);
  }
}
