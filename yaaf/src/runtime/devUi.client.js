(function () {
  'use strict';

  /* ── Syntax highlighter ──────────────────────────────────────────────── */
  // Single-pass tokenizer using sticky regexes. Each pattern is tried at the
  // current position; first match wins. ~3.5KB minified.

  function highlight (code, lang) {
    const L = (lang || '').toLowerCase()
    const isJs   = /^(js|jsx|ts|tsx|javascript|typescript|mjs|cjs)$/.test(L)
    const isPy   = /^(py|python|python3)$/.test(L)
    const isJson = L === 'json'
    const isSh   = /^(sh|bash|shell|zsh|fish)$/.test(L)
    const isCss  = /^(css|scss|sass|less)$/.test(L)

    // [className, sticky-regex] — order = priority
    const rules = []

    if (isJs || isCss) {
      rules.push(['cmt', /\/\/[^\n\r]*/y])
      rules.push(['cmt', /\/\*[\s\S]*?\*\//y])
    }
    if (isPy || isSh) rules.push(['cmt', /#[^\n\r]*/y])

    if (isJs) rules.push(['str', /`(?:[^`\\]|\\.)*`/y])
    rules.push(['str', /"(?:[^"\\]|\\.)*"/y])
    rules.push(['str', /'(?:[^'\\]|\\.)*'/y])

    rules.push(['num', /\b(?:0x[\da-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b/y])

    if (isJs) {
      rules.push(['kw',   /\b(?:await|async|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|get|if|import|in|instanceof|let|new|of|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield|type|interface|enum|abstract|implements|declare|namespace|readonly|keyof|as|satisfies|infer|is)\b/y])
      rules.push(['bool', /\b(?:true|false|null|undefined)\b/y])
      rules.push(['type', /\b(?:string|number|boolean|any|never|unknown|bigint|symbol|object|void|Array|Promise|Record|Partial|Required|Readonly|Pick|Omit|Object|Function|RegExp|Map|Set|Error|Date|Math|JSON|console|window|document|process|Buffer)\b/y])
      rules.push(['fn',   /\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()/y])
    }

    if (isPy) {
      rules.push(['kw',   /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/y])
      rules.push(['bool', /\b(?:True|False|None)\b/y])
      rules.push(['type', /\b(?:int|str|float|bool|list|dict|tuple|set|bytes|type|object|self|cls|print|len|range|enumerate|zip|map|filter|sorted|open|isinstance|isinstance|super)\b/y])
      rules.push(['fn',   /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/y])
    }

    if (isJson) {
      rules.push(['key',  /"(?:[^"\\]|\\.)*"(?=\s*:)/y])
      rules.push(['bool', /\b(?:true|false|null)\b/y])
    }

    if (isSh) {
      rules.push(['kw', /\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|exit|break|continue|local|export|source|read|echo|cd|ls|mkdir|rm|cp|mv|grep|sed|awk|cat|chmod|sudo|npm|yarn|git|docker|kubectl|curl|wget)\b/y])
      rules.push(['type', /\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?/y])
    }

    if (isCss) {
      rules.push(['key',  /[a-zA-Z-]+(?=\s*:)/y])
      rules.push(['num',  /\b\d+\.?\d*(?:px|em|rem|%|vh|vw|s|ms|deg)?\b/y])
      rules.push(['type', /#[\da-fA-F]{3,8}\b/y])
      rules.push(['fn',   /[a-zA-Z-]+(?=\s*\()/y])
    }

    // Generic punctuation (all languages)
    rules.push(['punct', /[{}[\]()]/y])

    // Run the tokenizer
    let result = ''
    let pos = 0
    const len = code.length

    while (pos < len) {
      let matched = false
      for (const [cls, re] of rules) {
        re.lastIndex = pos
        const m = re.exec(code)
        if (m) {
          result += '<span class="tok-' + cls + '">' + escHtml(m[0]) + '</span>'
          pos += m[0].length
          matched = true
          break
        }
      }
      if (!matched) {
        result += escHtml(code[pos])
        pos++
      }
    }
    return result
  }

  /* ── Markdown renderer ───────────────────────────────────────────────── */

  function renderMd (raw) {
    let html = ''
    const lines = raw.split('\n')
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      // Fenced code block
      const fence = line.match(/^```(\w*)/)
      if (fence) {
        const lang = fence[1] || ''
        const codeLines = []
        i++
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i])
          i++
        }
        i++ // skip closing fence
        const codeRaw = codeLines.join('\n')
        const codeHtml = highlight(codeRaw, lang)
        const id = 'cb-' + Math.random().toString(36).slice(2, 8)
        html +=
          '<div class="code-block">' +
            '<div class="code-block-header">' +
              '<span class="code-lang">' + escHtml(lang || 'code') + '</span>' +
              '<button class="copy-btn" onclick="copyCode(\'' + id + '\',this)">Copy</button>' +
            '</div>' +
            '<pre id="' + id + '"><code>' + codeHtml + '</code></pre>' +
          '</div>'
        continue
      }

      // HR
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        html += '<hr>'
        i++
        continue
      }

      // Headings h1–h6
      const hm = line.match(/^(#{1,6})\s+(.+)/)
      if (hm) {
        const lvl = Math.min(hm[1].length, 6)
        html += '<h' + lvl + '>' + inlineMd(hm[2]) + '</h' + lvl + '>'
        i++
        continue
      }

      // Unordered list (with nesting support)
      if (/^\s*[-*+]\s/.test(line)) {
        var ulResult = parseList(lines, 'ul', i)
        html += ulResult.html
        i = ulResult.i
        continue
      }

      // Ordered list (with nesting support)
      if (/^\s*\d+\.\s/.test(line)) {
        var olResult = parseList(lines, 'ol', i)
        html += olResult.html
        i = olResult.i
        continue
      }

      // Table (pipe-delimited rows)
      if (/^\|.+\|/.test(line)) {
        var tableRows = []
        while (i < lines.length && /^\|.+\|/.test(lines[i].trim())) {
          tableRows.push(lines[i].trim())
          i++
        }
        // Need at least header + separator + 1 data row, or just header + data
        if (tableRows.length >= 2) {
          var headerCells = tableRows[0].split('|').filter(function(c) { return c.trim() !== '' })
          // Check if second row is separator (---, :--:, etc.)
          var sepIdx = 1
          var isSep = /^\|[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)*\|?$/.test(tableRows[1])
          html += '<table>'
          // Header
          html += '<thead><tr>'
          for (var ci = 0; ci < headerCells.length; ci++) {
            html += '<th>' + inlineMd(headerCells[ci].trim()) + '</th>'
          }
          html += '</tr></thead>'
          // Body rows (skip separator if present)
          var startRow = isSep ? 2 : 1
          if (startRow < tableRows.length) {
            html += '<tbody>'
            for (var ri = startRow; ri < tableRows.length; ri++) {
              var cells = tableRows[ri].split('|').filter(function(c) { return c.trim() !== '' })
              html += '<tr>'
              for (var ci2 = 0; ci2 < cells.length; ci2++) {
                html += '<td>' + inlineMd(cells[ci2].trim()) + '</td>'
              }
              html += '</tr>'
            }
            html += '</tbody>'
          }
          html += '</table>'
        } else {
          // Single pipe line — treat as paragraph
          html += '<p>' + inlineMd(tableRows[0]) + '</p>'
        }
        continue
      }

      // Blockquote
      if (/^>\s?/.test(line)) {
        var quoteLines = []
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''))
          i++
        }
        html += '<blockquote>' + renderMd(quoteLines.join('\n')) + '</blockquote>'
        continue
      }

      // Blank line
      if (!line.trim()) { i++; continue }

      // Paragraph accumulator
      const para = []
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].match(/^(#{1,3}\s|[-*+]\s|\d+\.\s|```|\|.+\||>\s?)/) &&
        !lines[i].match(/^(-{3,}|\*{3,}|_{3,})$/)
      ) {
        para.push(lines[i])
        i++
      }
      if (para.length) html += '<p>' + inlineMd(para.join('\n')) + '</p>'
    }
    return html
  }

  /**
   * Parse a list block (ul or ol) with nesting and task-list support.
   * Mutates `i` (the outer renderMd index) as it consumes lines.
   */
  function parseList (lines, defaultTag, startI) {
    var i = startI
    // Detect the base indentation of the first list line
    var baseIndent = (lines[i].match(/^(\s*)/) || ['',''])[1].length
    var tag = defaultTag
    var out = '<' + tag + '>'

    while (i < lines.length) {
      var ln = lines[i]
      // How indented is this line?
      var indentMatch = ln.match(/^(\s*)/)
      var indent = indentMatch ? indentMatch[1].length : 0

      // If the line is less indented than our base, we're done with this list level
      if (indent < baseIndent) break

      // If the line is MORE indented, recurse for a nested sub-list
      if (indent > baseIndent) {
        // Detect nested list type
        var stripped = ln.trimStart()
        var nestedTag = /^\d+\.\s/.test(stripped) ? 'ol' : 'ul'
        var nested = parseList(lines, nestedTag, i)
        out += nested.html
        i = nested.i
        continue
      }

      // Same indentation — is it a list item?
      var stripped2 = ln.trimStart()
      var isUl = /^[-*+]\s/.test(stripped2)
      var isOl = /^\d+\.\s/.test(stripped2)
      if (!isUl && !isOl) break  // Non-list line at same indent = end of list

      // Strip the bullet/number prefix
      var content = isUl
        ? stripped2.replace(/^[-*+]\s+/, '')
        : stripped2.replace(/^\d+\.\s+/, '')

      // Task list checkbox: - [ ] or - [x]
      var taskMatch = content.match(/^\[([ xX])\]\s*(.*)/)
      if (taskMatch) {
        var checked = taskMatch[1] !== ' '
        var taskText = taskMatch[2]
        out += '<li class="task-item">' +
          '<span class="task-check ' + (checked ? 'checked' : '') + '">' +
          (checked ? '✓' : '') + '</span>' +
          inlineMd(taskText) + '</li>'
      } else {
        out += '<li>' + inlineMd(content) + '</li>'
      }
      i++
    }

    out += '</' + tag + '>'
    return { html: out, i: i }
  }

  function inlineMd (text) {
    return escHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  }

  window.copyCode = function (id, btn) {
    const el = document.getElementById(id)
    if (!el) return
    navigator.clipboard.writeText(el.textContent ?? '').then(() => {
      const prev = btn.textContent
      btn.textContent = 'Copied!'
      btn.classList.add('copied')
      setTimeout(() => { btn.textContent = prev; btn.classList.remove('copied') }, 1800)
    }).catch(() => {
      btn.textContent = 'Error'
      setTimeout(() => { btn.textContent = 'Copy' }, 1500)
    })
  }

  /* ── State ───────────────────────────────────────────────────────────── */
  let isStreaming    = false
  let abortCtrl     = null
  let currentBodyEl = null
  let currentPillsEl = null
  let toolTimers    = {}
  let inspectorRows = {}
  let currentTurnEl = null
  let autoScroll    = true
  let lastMessage   = ''
  let turnStart     = 0
  let ttft          = 0
  let accText       = ''

  let persistHistory = loadPref('persistHistory', true)
  let showInspector  = loadPref('showInspector', true)
  let multiTurnActive = loadPref('multiTurn', INIT_MULTI_TURN)
  let darkMode = loadPref('darkMode', false)

  /* ── DOM refs ────────────────────────────────────────────────────────── */
  const messagesEl    = $('messages')
  const inputEl       = $('input')
  const sendBtn       = $('send-btn')
  const stopBtn       = $('stop-btn')
  const clearBtn      = $('clear-btn')
  const jumpBtn       = $('jump-btn')
  const statusDot     = $('status-dot')
  const statusLabel   = $('status-label')
  const modelChip     = $('model-chip')
  const emptyState    = $('empty-state')
  const reqMethod     = $('req-method')
  const reqBody       = $('req-body')
  const toolList      = $('tool-list')
  const toolsEmpty    = $('tools-empty')
  const turnList      = $('turn-list')
  const turnsEmpty    = $('turns-empty')
  const tokGrid       = $('token-stats')
  const tokBarWrap    = $('token-bar-wrap')
  const tokFill       = $('tok-bar-fill')
  const tokPrompt     = $('tok-prompt')
  const tokCompl      = $('tok-completion')
  const tokCache      = $('tok-cache')
  const tokensEmpty   = $('tokens-empty')
  const latGrid       = $('latency-grid')
  const latEmpty      = $('latency-empty')
  const latTtft       = $('lat-ttft')
  const latTotal      = $('lat-total')
  const infoModel     = $('info-model')
  const layoutEl      = $('layout')
  const settingsBtn   = $('settings-btn')
  const settingsOvl   = $('settings-overlay')
  const settingsDrawer= $('settings-drawer')
  const settingsClose = $('settings-close')
  const toggleHistory = $('toggle-history')
  const toggleMultiTurn = $('toggle-multiturn')
  const toggleDark    = $('toggle-dark')
  const toggleInsp    = $('toggle-inspector')
  const clearHistBtn  = $('clear-history-btn')
  const exportBtn     = $('export-btn')
  const inspToggleBtn = $('inspector-toggle-btn')
  const mobileInspBtn = $('mobile-inspector-btn')
  const mobileInspOvl = $('mobile-inspector-overlay')
  const inspMobileClose = $('inspector-mobile-close')
  const inspectorEl   = $('inspector')
  const emptyChips    = document.querySelectorAll('.chip')

  function $ (id) { return document.getElementById(id) }

  /* ── Startup ─────────────────────────────────────────────────────────── */
  applyPrefs()
  restoreHistory()
  loadInfo()
  startHealthPolling()
  updateEmptyState()
  inputEl.focus()

  /* ── Settings ────────────────────────────────────────────────────────── */
  settingsBtn.addEventListener('click', () => {
    settingsDrawer.classList.replace('settings-closed', 'settings-open')
    settingsOvl.classList.remove('hidden')
  })
  function closeSettings () {
    settingsDrawer.classList.replace('settings-open', 'settings-closed')
    settingsOvl.classList.add('hidden')
  }
  settingsClose.addEventListener('click', closeSettings)
  settingsOvl.addEventListener('click', closeSettings)

  toggleHistory.addEventListener('click', () => {
    persistHistory = !persistHistory
    toggleHistory.setAttribute('aria-checked', String(persistHistory))
    savePref('persistHistory', persistHistory)
    if (!persistHistory) clearStoredHistory()
  })

  if (toggleMultiTurn) {
    toggleMultiTurn.addEventListener('click', () => {
      multiTurnActive = !multiTurnActive
      toggleMultiTurn.setAttribute('aria-checked', String(multiTurnActive))
      savePref('multiTurn', multiTurnActive)
    })
  }

  if (toggleDark) {
    toggleDark.addEventListener('click', () => {
      darkMode = !darkMode
      toggleDark.setAttribute('aria-checked', String(darkMode))
      savePref('darkMode', darkMode)
      document.body.classList.toggle('dark', darkMode)
    })
  }

  toggleInsp.addEventListener('click', () => {
    showInspector = !showInspector
    toggleInsp.setAttribute('aria-checked', String(showInspector))
    savePref('showInspector', showInspector)
    applyPrefs()
  })

  inspToggleBtn.addEventListener('click', () => {
    showInspector = !showInspector
    savePref('showInspector', showInspector)
    applyPrefs()
    toggleInsp.setAttribute('aria-checked', String(showInspector))
  })

  clearHistBtn.addEventListener('click', () => {
    clearStoredHistory()
    messagesEl.innerHTML = ''
    resetInspector('')
    updateEmptyState()
  })

  exportBtn.addEventListener('click', exportConversation)

  function applyPrefs () {
    toggleHistory.setAttribute('aria-checked', String(persistHistory))
    toggleInsp.setAttribute('aria-checked', String(showInspector))
    if (toggleMultiTurn) toggleMultiTurn.setAttribute('aria-checked', String(multiTurnActive))
    if (toggleDark)      toggleDark.setAttribute('aria-checked', String(darkMode))
    layoutEl.classList.toggle('inspector-hidden', !showInspector)
    document.body.classList.toggle('dark', darkMode)
  }

  /* ── Mobile inspector ────────────────────────────────────────────────── */
  function openMobileInspector () {
    inspectorEl.classList.add('mobile-open')
    mobileInspOvl.classList.remove('hidden')
    inspMobileClose.classList.remove('hidden')
  }
  function closeMobileInspector () {
    inspectorEl.classList.remove('mobile-open')
    mobileInspOvl.classList.add('hidden')
  }
  mobileInspBtn.addEventListener('click', openMobileInspector)
  mobileInspOvl.addEventListener('click', closeMobileInspector)
  inspMobileClose.addEventListener('click', closeMobileInspector)

  /* ── localStorage history ────────────────────────────────────────────── */
  function loadHistory () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
    catch { return [] }
  }
  function saveHistory (entries) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-100))) }
    catch { /* storage full */ }
  }
  function clearStoredHistory () {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ok */ }
  }

  function restoreHistory () {
    if (!persistHistory) return
    const entries = loadHistory()
    if (!entries.length) return
    const badge = document.createElement('div')
    badge.className = 'restore-badge'
    badge.textContent = 'Restored ' + entries.length + ' message' + (entries.length !== 1 ? 's' : '')
    messagesEl.appendChild(badge)
    for (const e of entries) {
      if (e.role === 'user') appendUserBubble(e.content, e.time, false)
      else appendAssistantFinal(e.content, e.time)
    }
    scrollBottom(true)
  }

  function pushHistory (role, content, time) {
    if (!persistHistory) return
    const entries = loadHistory()
    entries.push({ role, content, time })
    saveHistory(entries)
  }

  /* ── Export ──────────────────────────────────────────────────────────── */
  function exportConversation () {
    const entries = loadHistory()
    if (!entries.length) { alert('No conversation to export.'); return }
    let md = '# YAAF Dev UI — Conversation Export\n'
    md += '> Exported ' + new Date().toLocaleString() + '\n\n'
    for (const e of entries) {
      const role = e.role === 'user' ? '**You**' : '**Assistant**'
      md += role + ' · ' + (e.time || '') + '\n\n' + e.content + '\n\n---\n\n'
    }
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'yaaf-conversation-' + new Date().toISOString().slice(0, 10) + '.md'
    a.click()
    URL.revokeObjectURL(url)
    closeSettings()
  }

  /* ── /info fetch ─────────────────────────────────────────────────────── */
  async function loadInfo () {
    try {
      const res = await fetch('/info')
      if (!res.ok) return
      const data = await res.json()
      if (data.model) {
        infoModel.textContent = data.model
        modelChip.textContent = data.model
      }
      const mtEl = $('info-multiturn')
      if (mtEl) {
        const on = data.multiTurn ?? false
        mtEl.innerHTML = on
          ? '<span class="val-success">enabled</span>'
          : '<span class="val-muted">disabled</span>'
      }
    } catch { /* non-fatal */ }
  }

  /* ── Health polling ──────────────────────────────────────────────────── */
  function startHealthPolling () { checkHealth(); setInterval(checkHealth, 15_000) }
  async function checkHealth () {
    try {
      const t0 = Date.now()
      const res = await fetch('/health')
      if (!res.ok) { setStatus('error', 'Error'); return }
      setStatus(Date.now() - t0 > 5000 ? 'slow' : 'online',
                Date.now() - t0 > 5000 ? 'Slow' : 'Online')
    } catch { setStatus('error', 'Offline') }
  }
  function setStatus (cls, label) {
    statusDot.className = 'status-dot ' + cls
    statusLabel.textContent = label
  }

  /* ── Empty state ─────────────────────────────────────────────────────── */
  function updateEmptyState () {
    const hasMessages = messagesEl.children.length > 0
    emptyState.classList.toggle('hidden', hasMessages)
  }

  // Prompt chips
  emptyChips.forEach(chip => {
    chip.addEventListener('click', () => {
      inputEl.value = chip.dataset.prompt || ''
      autoResize()
      inputEl.focus()
    })
  })

  /* ── Send ────────────────────────────────────────────────────────────── */
  async function send () {
    const message = inputEl.value.trim()
    if (!message || isStreaming) return
    lastMessage = message
    inputEl.value = ''
    autoResize()
    startStreamingState()

    const time = nowTime()
    appendUserBubble(message, time, true)
    resetInspector(message)
    updateEmptyState()

    const { bodyEl, pillsEl } = createAssistantBubble(time)
    currentBodyEl  = bodyEl
    currentPillsEl = pillsEl
    accText = ''

    const cursor = document.createElement('span')
    cursor.className = 'cursor'
    cursor.setAttribute('aria-hidden', 'true')
    bodyEl.appendChild(cursor)

    abortCtrl = new AbortController()
    turnStart  = Date.now()
    ttft       = 0

    try {
      const history = multiTurnActive ? loadHistory().map(e => ({ role: e.role, content: e.content })) : undefined
      const body = history?.length
        ? JSON.stringify({ message, history })
        : JSON.stringify({ message })

      const res = await fetch('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: abortCtrl.signal,
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Request failed.' }))
        cursor.remove()
        bodyEl.textContent = data.error || 'Request failed.'
        bodyEl.closest('.msg')?.classList.add('msg-error')
        stopStreamingState()
        return
      }

      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let buf      = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n')
        buf = parts.pop() ?? ''
        for (const line of parts) {
          if (!line.startsWith('data: ')) continue
          try { handleEvent(JSON.parse(line.slice(6)), bodyEl, cursor, pillsEl) }
          catch { /* skip */ }
        }
      }
      if (buf.startsWith('data: ')) {
        try { handleEvent(JSON.parse(buf.slice(6)), bodyEl, cursor, pillsEl) }
        catch { /* ignore */ }
      }

    } catch (err) {
      cursor.remove()
      if (err.name === 'AbortError') {
        const note = document.createElement('span')
        note.style.cssText = 'opacity:.5;font-size:12px;'
        note.textContent = ' [stopped]'
        bodyEl.appendChild(note)
      } else {
        bodyEl.textContent = 'Connection error: ' + err.message
        bodyEl.closest('.msg')?.classList.add('msg-error')
      }
    } finally {
      cursor.remove()
      // Resolve any pills still showing as 'running' (e.g. tool calls that
      // started but whose result event was never received before stream ended)
      if (currentPillsEl) {
        currentPillsEl.querySelectorAll('.tool-pill.running').forEach(function(p) {
          p.className = 'tool-pill done'
          p.innerHTML = p.innerHTML.replace(/<span class="spin">[^<]*<\/span>/, '')
        })
      }
      if (accText) {
        bodyEl.innerHTML = renderMd(accText)
        pushHistory('assistant', accText, time)
      }
      stopStreamingState()
      scrollBottom(true)
    }
  }

  /* ── SSE event handler ───────────────────────────────────────────────── */
  let pendingUsage = null    // stash usage data from llm_response/usage events

  function updateTokenDisplay (u) {
    if (!u) return
    const prompt = u.promptTokens ?? u.totalPromptTokens ?? u.prompt_tokens
    const compl  = u.completionTokens ?? u.totalCompletionTokens ?? u.completion_tokens
    const cache  = u.cacheReadTokens ?? u.cache_read_tokens ?? 0
    if (prompt !== undefined && compl !== undefined) {
      tokPrompt.textContent = fmt(prompt)
      tokCompl.textContent  = fmt(compl)
      tokCache.textContent  = fmt(cache)
      tokGrid.classList.remove('hidden')
      tokBarWrap.classList.remove('hidden')
      tokensEmpty.classList.add('hidden')
      const total = prompt + compl + cache
      tokFill.style.width = (total > 0 ? Math.round(prompt / total * 100) : 0) + '%'
    }
  }

  function handleEvent (event, bodyEl, cursor, pillsEl) {
    switch (event.type) {

      case 'text_delta': {
        const chunk = event.text || event.content
        if (!chunk) break
        if (!ttft) {
          ttft = Date.now() - turnStart
          latTtft.textContent = fmtMs(ttft)
        }
        accText += chunk
        bodyEl.insertBefore(document.createTextNode(chunk), cursor)
        if (autoScroll) scrollBottom(false)
        break
      }

      case 'tool_call_start': {
        const name   = event.toolName || event.name || '?'
        const callId = event.callId || (name + '-' + Date.now())
        const pill   = document.createElement('span')
        pill.className      = 'tool-pill running'
        pill.dataset.tool   = name
        pill.dataset.callId = callId
        pill.innerHTML = '⚙ ' + escHtml(name) + ' <span class="spin">↻</span>'
        pillsEl.appendChild(pill)
        addInspectorToolRow(name, 'running', null)
        break
      }

      case 'tool_call_result':
      case 'tool_call_end': {
        const name   = event.toolName || event.name || '?'
        const callId = event.callId
        // Use server-computed durationMs; fall back to label without ms
        const ms  = event.durationMs ?? null
        const msLabel = ms === null ? '' : ms === 0 ? ' <1ms' : ' ' + ms + 'ms'
        // Find by callId first (unique), fall back to first running pill for this tool
        const pill = callId
          ? pillsEl.querySelector('[data-call-id="' + callId + '"]')
          : pillsEl.querySelector('[data-tool="' + name + '"].running')
        if (pill) {
          const ok = !event.error
          pill.className = 'tool-pill ' + (ok ? 'done' : 'error')
          pill.innerHTML = (ok ? '✓ ' : '✗ ') + escHtml(name) + msLabel
        }
        addInspectorToolRow(name, event.error ? 'error' : 'done', ms)
        break
      }

      // ── Agentic loop events (iteration / llm_request / llm_response) ────
      case 'iteration': {
        turnsEmpty.classList.add('hidden')
        var turnEl = document.createElement('div')
        turnEl.className = 'turn-row'
        turnEl.dataset.turn = event.count
        // Header row
        var header = document.createElement('div')
        header.className = 'turn-header'
        var label = document.createElement('span')
        label.className = 'turn-label'
        label.textContent = 'Turn ' + event.count + '/' + event.maxIterations
        var detail = document.createElement('span')
        detail.className = 'turn-detail'
        detail.textContent = '…'
        header.appendChild(label)
        header.appendChild(detail)
        turnEl.appendChild(header)
        turnList.appendChild(turnEl)
        currentTurnEl = turnEl
        break
      }

      case 'llm_request': {
        if (currentTurnEl) {
          var det = currentTurnEl.querySelector('.turn-detail')
          if (det) det.textContent = event.messageCount + ' msgs → LLM'
          // Collapsible input section
          var inputDetails = document.createElement('details')
          inputDetails.className = 'turn-section'
          var inputSummary = document.createElement('summary')
          inputSummary.className = 'turn-section-label turn-input-label'
          inputSummary.textContent = '↑ Input — ' + event.messageCount + ' messages · ' + event.toolCount + ' tools'
          inputDetails.appendChild(inputSummary)
          if (event.messages && event.messages.length) {
            var msgsWrap = document.createElement('div')
            msgsWrap.className = 'turn-messages'
            for (var mi = 0; mi < event.messages.length; mi++) {
              var msg = event.messages[mi]
              var msgEl = document.createElement('div')
              msgEl.className = 'turn-msg'
              var roleEl = document.createElement('span')
              roleEl.className = 'turn-msg-role turn-role-' + msg.role
              roleEl.textContent = msg.role
              var contentEl = document.createElement('pre')
              contentEl.className = 'turn-msg-content'
              // Truncate very long messages for readability
              var text = msg.content || ''
              contentEl.textContent = text.length > 2000 ? text.slice(0, 2000) + '\n… (' + fmt(text.length) + ' chars total)' : text
              msgEl.appendChild(roleEl)
              msgEl.appendChild(contentEl)
              msgsWrap.appendChild(msgEl)
            }
            inputDetails.appendChild(msgsWrap)
          }
          currentTurnEl.appendChild(inputDetails)
        }
        break
      }

      // The runner emits 'llm_response' with per-call usage and 'usage' with
      // session-level aggregates. Both pass through the SSE stream. We stash
      // whichever arrives so it's available when 'done' fires (even if the
      // server's done event doesn't carry usage due to a ServerAgent adapter
      // that strips it).
      case 'llm_response': {
        if (event.usage) pendingUsage = event.usage
        if (currentTurnEl) {
          var det2 = currentTurnEl.querySelector('.turn-detail')
          var u2 = event.usage || {}
          var prompt2 = u2.promptTokens || 0
          var compl2 = u2.completionTokens || 0
          var dur = event.durationMs
          if (det2) det2.textContent = dur ? fmtMs(dur) : ''

          // Collapsible output section
          var outputDetails = document.createElement('details')
          outputDetails.className = 'turn-section'
          var outputSummary = document.createElement('summary')
          outputSummary.className = 'turn-section-label turn-output-label'
          var sumParts = ['↓ Output — ' + fmt(prompt2) + ' → ' + fmt(compl2) + ' tok']
          if (dur) sumParts.push(fmtMs(dur))
          if (event.hasToolCalls) sumParts.push('⚙ tool calls')
          else sumParts.push('💬 text')
          outputSummary.textContent = sumParts.join(' · ')
          outputDetails.appendChild(outputSummary)

           var outputWrap = document.createElement('div')
          outputWrap.className = 'turn-messages'

          // Show text response if present
          if (event.content) {
            var textEl = document.createElement('div')
            textEl.className = 'turn-msg'
            var textRole = document.createElement('span')
            textRole.className = 'turn-msg-role turn-role-assistant'
            textRole.textContent = '💬 LLM Response'
            var textPre = document.createElement('pre')
            textPre.className = 'turn-msg-content'
            textPre.textContent = event.content.length > 2000 ? event.content.slice(0, 2000) + '\n… (' + fmt(event.content.length) + ' chars total)' : event.content
            textEl.appendChild(textRole)
            textEl.appendChild(textPre)
            outputWrap.appendChild(textEl)
          }

          // Show tool calls if present
          if (event.toolCalls && event.toolCalls.length) {
            // Add a heading to make intent crystal clear
            var tcHeading = document.createElement('div')
            tcHeading.className = 'turn-tc-heading'
            tcHeading.textContent = '⚙ LLM requested ' + event.toolCalls.length + ' tool call' + (event.toolCalls.length > 1 ? 's' : '') + ':'
            outputWrap.appendChild(tcHeading)

            for (var ti = 0; ti < event.toolCalls.length; ti++) {
              var tc = event.toolCalls[ti]
              var tcEl = document.createElement('div')
              tcEl.className = 'turn-msg turn-tool-call'
              var tcRole = document.createElement('span')
              tcRole.className = 'turn-msg-role turn-role-tool'
              tcRole.textContent = 'TOOL CALL: ' + tc.name
              tcEl.appendChild(tcRole)
              // Strip internal __yaaf_sig__ (Gemini thought signature, not user-facing)
              var displayArgs = Object.assign({}, tc.arguments)
              delete displayArgs.__yaaf_sig__
              var argKeys = Object.keys(displayArgs)
              if (argKeys.length) {
                var tcPre = document.createElement('pre')
                tcPre.className = 'turn-msg-content'
                tcPre.textContent = JSON.stringify(displayArgs, null, 2)
                tcEl.appendChild(tcPre)
              } else {
                var noArgs = document.createElement('span')
                noArgs.className = 'turn-no-args'
                noArgs.textContent = '(no arguments)'
                tcEl.appendChild(noArgs)
              }
              outputWrap.appendChild(tcEl)
            }
          }

          if (outputWrap.children.length) outputDetails.appendChild(outputWrap)
          currentTurnEl.appendChild(outputDetails)
        }
        break
      }
      case 'usage': {
        if (event.usage) pendingUsage = event.usage
        break
      }

      case 'done': {
        const totalMs = Date.now() - turnStart
        latGrid.classList.remove('hidden')
        latEmpty.classList.add('hidden')
        if (!ttft) latTtft.textContent = '—'
        latTotal.textContent = fmtMs(totalMs)

        // Render markdown immediately when the agent signals completion.
        // This is the primary render path; the finally block is a safety net.
        if (accText && currentBodyEl) {
          const cur = currentBodyEl.querySelector('.cursor')
          if (cur) cur.remove()
          currentBodyEl.innerHTML = renderMd(accText)
        }

        // Try to get usage from the done event itself, then fall back to
        // any usage stashed from earlier llm_response/usage events.
        const u = event.usage || pendingUsage
        updateTokenDisplay(u)
        pendingUsage = null
        break
      }
    }
  }

  /* ── Inspector helpers ───────────────────────────────────────────────── */
  function resetInspector (message) {
    reqMethod.classList.remove('hidden')
    reqBody.classList.remove('hidden')
    reqBody.textContent = message ? JSON.stringify({ message }, null, 2) : ''
    document.querySelector('#card-request .card-empty')?.classList.add('hidden')

    toolList.innerHTML = ''
    inspectorRows = {}
    toolTimers = {}
    toolsEmpty.classList.remove('hidden')

    tokGrid.classList.add('hidden')
    tokBarWrap.classList.add('hidden')
    tokensEmpty.classList.remove('hidden')
    tokFill.style.width = '0%'

    latGrid.classList.add('hidden')
    latEmpty.classList.remove('hidden')
    latTtft.textContent = '—'
    latTotal.textContent = '—'

    turnList.innerHTML = ''
    turnsEmpty.classList.remove('hidden')
    currentTurnEl = null
  }

  function addInspectorToolRow (name, status, ms) {
    if (inspectorRows[name]) {
      const { statusEl } = inspectorRows[name]
      statusEl.className = 'tool-row-status ' + status
      statusEl.textContent =
        status === 'running' ? '↻ running' :
        status === 'error'   ? '✗ error'   :
                               '✓ ' + (ms !== null ? ms + 'ms' : 'done')
      return
    }
    toolsEmpty.classList.add('hidden')
    const row = document.createElement('div')
    row.className = 'tool-row'
    const nameEl = document.createElement('span')
    nameEl.className = 'tool-row-name'
    nameEl.textContent = name
    const statusEl = document.createElement('span')
    statusEl.className = 'tool-row-status ' + status
    statusEl.textContent = status === 'running' ? '↻ running' : '✓ done'
    row.appendChild(nameEl)
    row.appendChild(statusEl)
    toolList.appendChild(row)
    inspectorRows[name] = { row, statusEl }
  }

  /* ── Bubble factories ────────────────────────────────────────────────── */
  function appendUserBubble (text, time, save) {
    if (save) pushHistory('user', text, time)
    const outer = document.createElement('div')
    outer.className = 'msg msg-user'
    outer.innerHTML =
      '<div class="bubble">' +
        '<div class="msg-header">' +
          '<span class="msg-role">You</span>' +
          '<span class="msg-time">' + escHtml(time) + '</span>' +
        '</div>' +
        '<div class="msg-body">' + escHtml(text) + '</div>' +
      '</div>'
    messagesEl.appendChild(outer)
    scrollBottom(false)
  }

  function createAssistantBubble (time) {
    const outer = document.createElement('div')
    outer.className = 'msg msg-assistant'
    const bubble = document.createElement('div')
    bubble.className = 'bubble'
    const header = document.createElement('div')
    header.className = 'msg-header'
    header.innerHTML =
      '<span class="msg-role">✦ Assistant</span>' +
      '<span class="msg-time">' + escHtml(time) + '</span>'
    const body  = document.createElement('div')
    body.className = 'msg-body'
    const pills = document.createElement('div')
    pills.className = 'tool-pills'
    bubble.appendChild(header)
    bubble.appendChild(body)
    bubble.appendChild(pills)
    outer.appendChild(bubble)
    messagesEl.appendChild(outer)
    scrollBottom(false)
    return { bodyEl: body, pillsEl: pills }
  }

  function appendAssistantFinal (markdown, time) {
    const { bodyEl } = createAssistantBubble(time)
    bodyEl.innerHTML = renderMd(markdown)
  }

  /* ── Streaming state ─────────────────────────────────────────────────── */
  function startStreamingState () {
    isStreaming = true
    sendBtn.disabled = true
    stopBtn.classList.remove('hidden')
    setStatus('connecting', 'Generating…')
  }
  function stopStreamingState () {
    isStreaming = false
    sendBtn.disabled = false
    stopBtn.classList.add('hidden')
    abortCtrl = null
    currentBodyEl = currentPillsEl = null
    setStatus('online', 'Online')
  }

  /* ── Events ──────────────────────────────────────────────────────────── */
  sendBtn.addEventListener('click', send)

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return }
    if (e.key === 'Escape') { abortCtrl?.abort(); return }
    if (e.key === 'ArrowUp' && !inputEl.value.trim() && lastMessage) {
      e.preventDefault()
      inputEl.value = lastMessage
      autoResize()
    }
  })

  inputEl.addEventListener('input', autoResize)

  stopBtn.addEventListener('click', () => abortCtrl?.abort())

  clearBtn.addEventListener('click', () => {
    if (isStreaming) abortCtrl?.abort()
    messagesEl.innerHTML = ''
    clearStoredHistory()
    resetInspector('')
    reqMethod.classList.add('hidden')
    reqBody.classList.add('hidden')
    document.querySelector('#card-request .card-empty')?.classList.remove('hidden')
    autoScroll = true
    updateEmptyState()
  })

  messagesEl.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = messagesEl
    autoScroll = (scrollHeight - scrollTop - clientHeight) < 60
    jumpBtn.classList.toggle('hidden', autoScroll)
  })

  jumpBtn.addEventListener('click', () => { autoScroll = true; scrollBottom(true) })

  /* ── Utilities ───────────────────────────────────────────────────────── */
  function scrollBottom (force) {
    if (!force && !autoScroll) return
    messagesEl.scrollTop = messagesEl.scrollHeight
  }
  function autoResize () {
    inputEl.style.height = 'auto'
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px'
  }
  function nowTime () {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  function fmt (n) {
    return typeof n === 'number' ? n.toLocaleString() : String(n)
  }
  function fmtMs (ms) {
    return ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's'
  }
  function escHtml (s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }
  function loadPref (key, def) {
    try {
      const v = localStorage.getItem('yaaf-devui:' + key)
      return v === null ? def : JSON.parse(v)
    } catch { return def }
  }
  function savePref (key, val) {
    try { localStorage.setItem('yaaf-devui:' + key, JSON.stringify(val)) }
    catch { /* ok */ }
  }

})();