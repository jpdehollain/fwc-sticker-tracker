// =============================================
// CONFIG — replace with your Supabase details
// =============================================
const SUPABASE_URL = 'https://dobsznpcrlarzcygvdbh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gquvjA8nfob7KbUwKDGqFQ_kP72qgC-'

// =============================================
// DATA
// =============================================
const GROUPS = [
  { id: 'A', teams: [['MEX','🇲🇽','Mexico'],['RSA','🇿🇦','South Africa'],['KOR','🇰🇷','Korea Republic'],['CZE','🇨🇿','Czechia']] },
  { id: 'B', teams: [['CAN','🇨🇦','Canada'],['BIH','🇧🇦','Bosnia-Herzegovina'],['QAT','🇶🇦','Qatar'],['SUI','🇨🇭','Switzerland']] },
  { id: 'C', teams: [['BRA','🇧🇷','Brazil'],['MAR','🇲🇦','Morocco'],['HAI','🇭🇹','Haiti'],['SCO','🏴󠁧󠁢󠁳󠁣󠁴󠁿','Scotland']] },
  { id: 'D', teams: [['USA','🇺🇸','United States'],['PAR','🇵🇾','Paraguay'],['AUS','🇦🇺','Australia'],['TUR','🇹🇷','Türkiye']] },
  { id: 'E', teams: [['GER','🇩🇪','Germany'],['CUW','🇨🇼','Curaçao'],['CIV','🇨🇮','Ivory Coast'],['ECU','🇪🇨','Ecuador']] },
  { id: 'F', teams: [['NED','🇳🇱','Netherlands'],['JPN','🇯🇵','Japan'],['SWE','🇸🇪','Sweden'],['TUN','🇹🇳','Tunisia']] },
  { id: 'G', teams: [['BEL','🇧🇪','Belgium'],['EGY','🇪🇬','Egypt'],['IRN','🇮🇷','Iran'],['NZL','🇳🇿','New Zealand']] },
  { id: 'H', teams: [['ESP','🇪🇸','Spain'],['CPV','🇨🇻','Cape Verde'],['KSA','🇸🇦','Saudi Arabia'],['URU','🇺🇾','Uruguay']] },
  { id: 'I', teams: [['FRA','🇫🇷','France'],['SEN','🇸🇳','Senegal'],['IRQ','🇮🇶','Iraq'],['NOR','🇳🇴','Norway']] },
  { id: 'J', teams: [['ARG','🇦🇷','Argentina'],['ALG','🇩🇿','Algeria'],['AUT','🇦🇹','Austria'],['JOR','🇯🇴','Jordan']] },
  { id: 'K', teams: [['POR','🇵🇹','Portugal'],['COD','🇨🇩','DR Congo'],['UZB','🇺🇿','Uzbekistan'],['COL','🇨🇴','Colombia']] },
  { id: 'L', teams: [['ENG','🏴󠁧󠁢󠁥󠁮󠁧󠁿','England'],['CRO','🇭🇷','Croatia'],['GHA','🇬🇭','Ghana'],['PAN','🇵🇦','Panama']] },
]
const FWC_COUNT = 19
const COUNTRY_COUNT = 20

// Build flat team lookup
const TEAM_MAP = {}
GROUPS.forEach(g => g.teams.forEach(([code, flag, name]) => { TEAM_MAP[code] = { flag, name, group: g.id } }))

// =============================================
// STATE
// =============================================
let sb, currentUser, currentProfile, stickerCache = {}, authMode = 'signin'
let tpGive = [], tpGet = [], tpTab = 'give', listsTab = 'missing'

// =============================================
// INIT
// =============================================
sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true
  }
})

sb.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, 'user:', session?.user?.id)
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
    setTimeout(async () => {
      await initUser(session)
    }, 0)
  } else if (event === 'INITIAL_SESSION' && !session) {
    showScreen('auth-screen')
  } else if (event === 'SIGNED_OUT') {
    showScreen('auth-screen')
  }
})

setTimeout(() => {
  const btn = document.getElementById('loading-fallback-btn')
  if (btn && document.getElementById('loading-screen').classList.contains('active')) {
    btn.style.display = 'block'
  }
}, 5000)

async function initUser(session) {
  currentUser = session.user
  console.log('Session at fetch time:', session?.access_token?.substring(0, 30) ?? 'NULL')
  try {
    const { data, error } = await sb.from('profiles').select('*').eq('id', currentUser.id).single()
    console.log('Profile result — data:', !!data, 'error:', error?.message, 'code:', error?.code, 'status:', error?.status)
    if (!data) { showScreen('auth-screen'); toast('Sign in failed — please try again'); return }
    currentProfile = data
    document.getElementById('home-username').textContent = data.username
    await loadStickerCache()
    await checkPendingTrades()
    showScreen('home-screen')
  } catch(e) {
    console.log('initUser crash:', e.message, e)
    showScreen('auth-screen')
  }
}

// =============================================
// AUTH
// =============================================
function toggleAuthMode() {
  authMode = authMode === 'signin' ? 'signup' : 'signin'
  const isSignup = authMode === 'signup'
  document.getElementById('auth-title').textContent = isSignup ? 'Create Account' : 'WC 2026 Stickers'
  document.getElementById('username-group').style.display = isSignup ? 'block' : 'none'
  document.querySelector('#auth-form .btn-primary').textContent = isSignup ? 'Sign Up' : 'Sign In'
  document.getElementById('auth-switch-link').textContent = isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"
}

async function submitAuth() {
  const email = document.getElementById('auth-email').value.trim()
  const password = document.getElementById('auth-password').value
  if (!email || !password) return toast('Please fill in all fields')
  if (authMode === 'signup') {
    const username = document.getElementById('auth-username').value.trim()
    if (!username) return toast('Please choose a username')
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username } } })
    if (error) return toast(error.message)
    if (data.session) await initUser(data.session)
  } else {
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) return toast(error.message)
    if (data.session) await initUser(data.session)
  }
}

async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  })
  if (error) toast(error.message)
}

async function logout() {
  await sb.auth.signOut()
  currentUser = null; currentProfile = null; stickerCache = {}
  showScreen('auth-screen')
}

// =============================================
// STICKER CACHE
// =============================================
async function loadStickerCache() {
  const { data } = await sb.from('stickers').select('*').eq('user_id', currentUser.id)
  stickerCache = {}
  data?.forEach(s => { stickerCache[`${s.section}-${s.sticker_number}`] = s.count })
}

function getCount(section, num) { return stickerCache[`${section}-${num}`] || 0 }

async function setCount(section, num, count) {
  const key = `${section}-${num}`
  stickerCache[key] = count
  await sb.from('stickers').upsert({
    user_id: currentUser.id, section, sticker_number: num, count
  }, { onConflict: 'user_id,section,sticker_number' })
}

function statusLabel(count) {
  if (count === 0) return { label: 'Missing', cls: 'badge-missing' }
  if (count === 1) return { label: 'Collected', cls: 'badge-collected' }
  return { label: `Collected + ${count - 1} double${count > 2 ? 's' : ''}`, cls: 'badge-doubles' }
}

// =============================================
// SCREEN NAV
// =============================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById(id).classList.add('active')
  window.scrollTo(0, 0)
}

// =============================================
// CHECK / MY STICKER LIST
// =============================================
let activeGroups = new Set([...GROUPS.map(g => g.id), 'FWC'])
let allSections = []
let currentSectionIdx = 0
let overlaySection = null, overlayNum = null

function buildSectionList() {
  allSections = []
  GROUPS.forEach(g => g.teams.forEach(([code, flag, name]) => allSections.push({ code, flag, name, max: COUNTRY_COUNT, group: g.id })))
  allSections.push({ code: 'FWC', flag: '🌍', name: 'FWC', max: FWC_COUNT, group: 'FWC' })
}

function initCheckScreen() {
  buildSectionList()
  const grid = document.getElementById('filter-group-grid')
  grid.innerHTML = ''
  GROUPS.forEach(g => {
    const btn = document.createElement('div')
    btn.className = `filter-group-btn${activeGroups.has(g.id) ? ' active' : ''}`
    btn.textContent = `Group ${g.id}`
    btn.onclick = () => { btn.classList.toggle('active'); activeGroups.has(g.id) ? activeGroups.delete(g.id) : activeGroups.add(g.id); updateFilterBtn() }
    grid.appendChild(btn)
  })
  const fwcBtn = document.createElement('div')
  fwcBtn.className = `filter-group-btn${activeGroups.has('FWC') ? ' active' : ''}`
  fwcBtn.textContent = 'FWC'
  fwcBtn.onclick = () => { fwcBtn.classList.toggle('active'); activeGroups.has('FWC') ? activeGroups.delete('FWC') : activeGroups.add('FWC'); updateFilterBtn() }
  grid.appendChild(fwcBtn)
  document.getElementById('check-step1').style.display = 'block'
  document.getElementById('check-step2').style.display = 'none'
  document.getElementById('country-search').value = ''
  renderCountryList()
}

function updateFilterBtn() {
  const allOn = activeGroups.size === GROUPS.length + 1
  document.getElementById('filter-btn').classList.toggle('active', !allOn)
}

function toggleAllGroups() {
  const allOn = activeGroups.size === GROUPS.length + 1
  if (allOn) {
    activeGroups.clear()
  } else {
    GROUPS.forEach(g => activeGroups.add(g.id))
    activeGroups.add('FWC')
  }
  // Update button label
  document.getElementById('filter-all-btn').textContent = activeGroups.size === GROUPS.length + 1 ? 'Clear All' : 'Select All'
  // Update group button states
  document.querySelectorAll('.filter-group-btn').forEach((btn, i) => {
    const id = i < GROUPS.length ? GROUPS[i].id : 'FWC'
    btn.classList.toggle('active', activeGroups.has(id))
  })
  updateFilterBtn()
}

function renderCountryList() {
  const search = document.getElementById('country-search').value.toLowerCase()
  const el = document.getElementById('check-country-list')
  el.innerHTML = ''
  let lastGroup = null
  allSections.forEach((sec, idx) => {
    if (!activeGroups.has(sec.group)) return
    if (search && !sec.name.toLowerCase().includes(search) && !sec.code.toLowerCase().includes(search)) return
    if (sec.group !== lastGroup) {
      lastGroup = sec.group
      const hdr = document.createElement('div')
      hdr.style.cssText = 'font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;padding:10px 0 4px;font-weight:700'
      hdr.textContent = sec.group === 'FWC' ? 'FWC Special' : `Group ${sec.group}`
      el.appendChild(hdr)
    }
    let collected = 0
    for (let n = 1; n <= sec.max; n++) { if (getCount(sec.code, n) >= 1) collected++ }
    const pct = Math.round((collected / sec.max) * 100)
    const item = document.createElement('div')
    item.className = 'country-list-item'
    item.innerHTML = `
      <div class="country-flag">${sec.flag}</div>
      <div class="country-info">
        <div class="country-name">${sec.name}</div>
        <div class="country-group">${sec.group === 'FWC' ? 'Special stickers' : `Group ${sec.group}`}</div>
      </div>
      <div class="country-progress">
        <div class="country-progress-num" style="color:${collected===sec.max?'var(--green)':'var(--text)'}">${collected}/${sec.max}</div>
        <div class="country-progress-bar"><div class="country-progress-fill" style="width:${pct}%"></div></div>
      </div>
    `
    item.onclick = () => openStickerGrid(idx)
    el.appendChild(item)
  })
  if (!el.children.length) el.innerHTML = '<div class="empty-state">No countries match</div>'
}

function openStickerGrid(idx) {
  currentSectionIdx = idx
  renderStickerGrid()
  document.getElementById('check-step1').style.display = 'none'
  document.getElementById('check-step2').style.display = 'block'
}

function renderStickerGrid() {
  const sec = allSections[currentSectionIdx]
  document.getElementById('sticker-page-flag').textContent = sec.flag
  document.getElementById('sticker-page-name').textContent = sec.name
  let collected = 0
  for (let n = 1; n <= sec.max; n++) { if (getCount(sec.code, n) >= 1) collected++ }
  document.getElementById('sticker-page-progress').textContent = `${collected} / ${sec.max} collected`
  const grid = document.getElementById('check-number-grid')
  grid.innerHTML = ''
  for (let n = 1; n <= sec.max; n++) {
    const c = getCount(sec.code, n)
    const btn = document.createElement('div')
    btn.className = `num-btn ${c === 0 ? 'missing' : c === 1 ? 'collected' : 'doubles'}`
    btn.id = `nb-${sec.code}-${n}`
    btn.innerHTML = `${n}${c > 1 ? `<span class="num-dot">×${c-1}</span>` : ''}`
    btn.onclick = () => openOverlay(sec.code, n)
    grid.appendChild(btn)
  }
}

function navigateCountry(dir) {
  const total = allSections.length
  currentSectionIdx = (currentSectionIdx + dir + total) % total
  renderStickerGrid()
  window.scrollTo(0, 0)
}

function showScreen2Back() {
  document.getElementById('check-step2').style.display = 'none'
  document.getElementById('check-step1').style.display = 'block'
  renderCountryList()
}

function toggleFilterSheet() { document.getElementById('filter-sheet').style.display = 'flex' }
function closeFilterSheet() { document.getElementById('filter-sheet').style.display = 'none'; renderCountryList() }

function openOverlay(section, num) {
  overlaySection = section; overlayNum = num
  updateOverlayDisplay()
  document.getElementById('sticker-overlay').style.display = 'flex'
}

function updateOverlayDisplay() {
  const sec = allSections.find(s => s.code === overlaySection)
  const c = getCount(overlaySection, overlayNum)
  const { label, cls } = statusLabel(c)
  document.getElementById('overlay-title').textContent = `${sec.flag} ${sec.name}`
  document.getElementById('overlay-sticker').textContent = `${overlaySection}-${overlayNum}`
  document.getElementById('overlay-count').textContent = c
  document.getElementById('overlay-count').style.color = c === 0 ? 'var(--red)' : c === 1 ? 'var(--green)' : 'var(--accent)'
  document.getElementById('overlay-status').innerHTML = `<span class="status-badge ${cls}">${label}</span>`
}

async function overlayAdjust(delta) {
  const cur = getCount(overlaySection, overlayNum)
  const next = Math.max(0, cur + delta)
  await setCount(overlaySection, overlayNum, next)
  if (overlaySection === 'ARG' && overlayNum === 17 && cur === 0 && next === 1) showArgSplash() // Easter egg
  updateOverlayDisplay()
  const btn = document.getElementById(`nb-${overlaySection}-${overlayNum}`)
  if (btn) {
    btn.className = `num-btn ${next === 0 ? 'missing' : next === 1 ? 'collected' : 'doubles'}`
    btn.innerHTML = `${overlayNum}${next > 1 ? `<span class="num-dot">×${next-1}</span>` : ''}`
  }
  const sec = allSections[currentSectionIdx]
  let collected = 0
  for (let n = 1; n <= sec.max; n++) { if (getCount(sec.code, n) >= 1) collected++ }
  document.getElementById('sticker-page-progress').textContent = `${collected} / ${sec.max} collected`
}

function closeOverlay() {
  document.getElementById('sticker-overlay').style.display = 'none'
  overlaySection = null; overlayNum = null
}

// =============================================
// TRADES
// =============================================
async function loadTrades() {
  const el = document.getElementById('trades-list')
  el.innerHTML = '<p style="color:var(--muted);font-size:.9rem">Loading...</p>'

  // Load all other users' stickers
  const { data: allProfiles } = await sb.from('profiles').select('*').neq('id', currentUser.id)
  if (!allProfiles?.length) { el.innerHTML = '<div class="empty-state">No other users yet</div>'; return }

  const { data: allStickers } = await sb.from('stickers').select('*').in('user_id', allProfiles.map(p => p.id))

  // Build per-user sticker maps
  const userMaps = {}
  allStickers?.forEach(s => {
    if (!userMaps[s.user_id]) userMaps[s.user_id] = {}
    userMaps[s.user_id][`${s.section}-${s.sticker_number}`] = s.count
  })

  // My missing and doubles
  const myMissing = [], myDoubles = []
  getAllStickerKeys().forEach(k => {
    const c = getCount(...k)
    if (c === 0) myMissing.push(k)
    if (c >= 2) myDoubles.push(k)
  })

  // Compute trades per user
  const trades = allProfiles.map(profile => {
    const theirMap = userMaps[profile.id] || {}
    const getTheirCount = (sec, num) => theirMap[`${sec}-${num}`] || 0

    const iGive = myDoubles.filter(([s,n]) => getTheirCount(s,n) === 0)  // I have doubles, they're missing
    const iGet  = myMissing.filter(([s,n]) => getTheirCount(s,n) >= 2)    // I'm missing, they have doubles
    return { profile, iGive, iGet, total: iGive.length + iGet.length }
  }).filter(t => t.total > 0).sort((a, b) => b.total - a.total)

  if (!trades.length) { el.innerHTML = '<div class="empty-state">No trades available with current users</div>'; return }

  el.innerHTML = ''
  trades.forEach(({ profile, iGive, iGet, total }) => {
    const card = document.createElement('div')
    card.className = 'user-trade-card'
    card.innerHTML = `
      <div class="user-trade-header">
        <span class="user-trade-name">👤 ${profile.username}</span>
        <span class="trade-count">${total} card${total !== 1 ? 's' : ''}</span>
      </div>
      <div class="trade-detail" id="trade-detail-${profile.id}">
        <div class="trade-col">
          <h4>You give → ${profile.username}</h4>
          <div class="sticker-chips" id="give-chips-${profile.id}">
            ${iGive.map(([s,n]) => `<span class="chip chip-give selectable-chip" data-section="${s}" data-num="${n}" onclick="toggleChip(this,'give','${profile.id}')">${s === 'FWC' ? `FWC-${n}` : `${TEAM_MAP[s]?.flag}${s}-${n}`}</span>`).join('') || '<span style="color:var(--muted);font-size:.8rem">None</span>'}
          </div>
        </div>
        <div class="trade-col">
          <h4>${profile.username} gives → You</h4>
          <div class="sticker-chips" id="get-chips-${profile.id}">
            ${iGet.map(([s,n]) => `<span class="chip chip-get selectable-chip" data-section="${s}" data-num="${n}" onclick="toggleChip(this,'get','${profile.id}')">${s === 'FWC' ? `FWC-${n}` : `${TEAM_MAP[s]?.flag}${s}-${n}`}</span>`).join('') || '<span style="color:var(--muted);font-size:.8rem">None</span>'}
          </div>
        </div>
        <div class="trade-actions">
          <button class="btn btn-green btn-sm" onclick="executeTradeSelected('${profile.id}','${profile.username}')">Execute Trade</button>
          <button class="btn btn-secondary btn-sm" onclick="toggleTradeDetail('${profile.id}')">Close</button>
        </div>
      </div>
    `
    card.querySelector('.user-trade-header').onclick = () => toggleTradeDetail(profile.id)
    el.appendChild(card)
  })
}

function chipHtml(section, num, type) {
  const label = section === 'FWC' ? `FWC-${num}` : `${TEAM_MAP[section]?.flag}${section}-${num}`
  return `<span class="chip chip-${type}">${label}</span>`
}

function toggleTradeDetail(uid) {
  const el = document.getElementById(`trade-detail-${uid}`)
  el.classList.toggle('open')
}

function toggleChip(el, type, profileId) {
  el.classList.toggle('deselected')
}

async function executeTradeSelected(recipientId, recipientName) {
  // Collect only selected (non-deselected) chips
  const giveChips = [...document.querySelectorAll(`#give-chips-${recipientId} .selectable-chip:not(.deselected)`)]
  const getChips  = [...document.querySelectorAll(`#get-chips-${recipientId} .selectable-chip:not(.deselected)`)]

  if (!giveChips.length && !getChips.length) {
    toast('No stickers selected'); return
  }

  const iGive = giveChips.map(el => [el.dataset.section, parseInt(el.dataset.num)])
  const iGet  = getChips.map(el => [el.dataset.section, parseInt(el.dataset.num)])

  const givingText  = iGive.map(([s,n]) => `${s}-${n}`).join(', ') || 'none'
  const gettingText = iGet.map(([s,n])  => `${s}-${n}`).join(', ') || 'none'

  const confirmed = confirm(
    `This trade will:\n\n` +
    `ADD to your collection: ${gettingText}\n\n` +
    `REMOVE from your doubles: ${givingText}\n\n` +
    `Tap OK if you have physically traded these cards with ${recipientName}.`
  )
  if (!confirmed) return

  for (const [s, n] of iGive) await setCount(s, n, Math.max(0, getCount(s, n) - 1))
  for (const [s, n] of iGet)  await setCount(s, n, getCount(s, n) + 1)

  await sb.from('trades').insert({
    initiator_id: currentUser.id,
    recipient_id: recipientId,
    initiator_gives: iGive.map(([section, sticker_number]) => ({ section, sticker_number })),
    recipient_gives: iGet.map(([section, sticker_number]) => ({ section, sticker_number })),
    status: 'pending'
  })

  toast('Trade recorded!')
  setTimeout(() => loadTrades(), 800)
}

// =============================================
// THIRD-PARTY TRADE
// =============================================
function loadTpTrade() {
  tpGive = []; tpGet = []; tpTab = 'give'
  document.getElementById('tp-tab-give').classList.add('active')
  document.getElementById('tp-tab-get').classList.remove('active')
  renderTpList()
  updateTpSummary()
}

function tpSetTab(tab) {
  tpTab = tab
  document.getElementById('tp-tab-give').classList.toggle('active', tab === 'give')
  document.getElementById('tp-tab-get').classList.toggle('active', tab === 'get')
  renderTpList()
}

function renderTpList() {
  const el = document.getElementById('tp-list')
  el.innerHTML = ''
  const items = tpTab === 'give'
    ? getAllStickerKeys().filter(([s,n]) => getCount(s,n) >= 2)
    : getAllStickerKeys().filter(([s,n]) => getCount(s,n) === 0)

  if (!items.length) { el.innerHTML = `<div class="empty-state">No ${tpTab === 'give' ? 'doubles' : 'missing stickers'}</div>`; return }

  items.forEach(([s, n]) => {
    const label = s === 'FWC' ? `FWC-${n}` : `${TEAM_MAP[s]?.flag} ${TEAM_MAP[s]?.name} #${n}`
    const isSelected = tpTab === 'give'
      ? tpGive.some(x => x[0]===s && x[1]===n)
      : tpGet.some(x => x[0]===s && x[1]===n)
    const div = document.createElement('div')
    div.className = `tp-sticker${isSelected ? (tpTab==='give' ? ' selected-give' : ' selected-get') : ''}`
    div.innerHTML = `<span style="font-size:.9rem">${label}</span><span style="font-size:.8rem;color:var(--muted)">${tpTab==='give'?`×${getCount(s,n)-1} doubles`:'missing'}</span>`
    div.onclick = () => tpToggle(s, n)
    el.appendChild(div)
  })
}

function tpToggle(s, n) {
  const arr = tpTab === 'give' ? tpGive : tpGet
  const idx = arr.findIndex(x => x[0]===s && x[1]===n)
  if (idx >= 0) arr.splice(idx, 1); else arr.push([s, n])
  renderTpList()
  updateTpSummary()
}

function updateTpSummary() {
  const el = document.getElementById('tp-summary')
  const content = document.getElementById('tp-summary-content')
  if (!tpGive.length && !tpGet.length) { el.style.display = 'none'; return }
  el.style.display = 'block'
  content.innerHTML = `
    ${tpGive.length ? `<p style="font-size:.85rem"><strong>Giving away (doubles removed):</strong><br>${tpGive.map(([s,n])=>chipHtml(s,n,'give')).join(' ')}</p>` : ''}
    ${tpGet.length ? `<p style="font-size:.85rem;margin-top:8px"><strong>Receiving (added to collection):</strong><br>${tpGet.map(([s,n])=>chipHtml(s,n,'get')).join(' ')}</p>` : ''}
  `
}

async function executeTpTrade() {
  if (!confirm(`Confirm trade?\nGiving: ${tpGive.length} sticker(s)\nGetting: ${tpGet.length} sticker(s)`)) return
  for (const [s, n] of tpGive) await setCount(s, n, getCount(s, n) - 1)
  for (const [s, n] of tpGet)  await setCount(s, n, getCount(s, n) + 1)
  toast('Trade complete!')
  tpGive = []; tpGet = []
  renderTpList()
  updateTpSummary()
}

// =============================================
// SHOW LISTS
// =============================================
async function loadLists() {
  listsTab = 'missing'
  document.getElementById('list-tab-missing').classList.add('active')
  document.getElementById('list-tab-doubles').classList.remove('active')
  document.getElementById('list-tab-all').classList.remove('active')
  renderLists()
}

function listsSetTab(tab) {
  listsTab = tab
  document.getElementById('list-tab-missing').classList.toggle('active', tab==='missing')
  document.getElementById('list-tab-doubles').classList.toggle('active', tab==='doubles')
  document.getElementById('list-tab-all').classList.toggle('active', tab==='all')
  renderLists()
}

function renderLists() {
  const el = document.getElementById('lists-content')
  el.innerHTML = ''
  const sections = [
    ...GROUPS.flatMap(g => g.teams.map(([code, flag, name]) => ({ code, flag, name, max: COUNTRY_COUNT }))),
    { code: 'FWC', flag: '🌍', name: 'FWC', max: FWC_COUNT }
  ]
  let anyShown = false
  sections.forEach(({ code, flag, name, max }) => {
    const stickers = []
    for (let n = 1; n <= max; n++) {
      const c = getCount(code, n)
      if (listsTab === 'missing' && c > 0) continue
      if (listsTab === 'doubles' && c < 2) continue
      stickers.push({ n, c })
    }
    if (!stickers.length) return
    anyShown = true
    const row = document.createElement('div')
    row.className = 'lists-country-row'
    row.innerHTML = `<div class="lists-country-label">${flag} ${name}</div><div class="lists-chips" id="chips-${code}"></div>`
    el.appendChild(row)
    const chipsEl = row.querySelector(`#chips-${code}`)
    stickers.forEach(({ n, c }) => {
      const chip = document.createElement('span')
      chip.className = `chip ${listsTab === 'all' ? (c === 0 ? 'chip-missing' : c === 1 ? 'chip-collected' : 'chip-doubles') : listsTab === 'missing' ? 'chip-missing' : 'chip-doubles'}`
      chip.textContent = `${code}-${n}`
      chipsEl.appendChild(chip)
    })
  })
  if (!anyShown) el.innerHTML = '<div class="empty-state">Nothing to show here</div>'
}

// =============================================
// PENDING TRADES
// =============================================
async function checkPendingTrades() {
  const { data } = await sb.from('trades').select('*, initiator:profiles!initiator_id(username)')
    .eq('recipient_id', currentUser.id).eq('status', 'pending')

  const container = document.getElementById('pending-banners')
  container.innerHTML = ''
  const badge = document.getElementById('pending-count-badge')

  if (!data?.length) { badge.innerHTML = ''; return }
  badge.innerHTML = `<span class="pending-badge">${data.length}</span>`

  data.forEach(trade => {
    const banner = document.createElement('div')
    banner.className = 'pending-banner'
    banner.innerHTML = `
      <div>
        <p>🔄 Trade from ${trade.initiator.username}</p>
        <small>Tap to review</small>
      </div>
      <span style="color:var(--accent)">›</span>
    `
    banner.onclick = () => showPendingTrade(trade)
    container.appendChild(banner)
  })
}

function showPendingTrade(trade) {
  const el = document.getElementById('pending-trade-content')
  const gives = trade.initiator_gives  // what initiator gives to me
  const gets  = trade.recipient_gives  // what I give to initiator

  el.innerHTML = `
    <p style="color:var(--muted);font-size:.85rem;margin-bottom:16px">
      <strong>${trade.initiator?.username || 'Someone'}</strong> has proposed a trade:
    </p>
    <div class="trade-col">
      <h4>You receive</h4>
      <div class="sticker-chips">${gives.map(({section:s,sticker_number:n})=>chipHtml(s,n,'get')).join('')}</div>
    </div>
    <div class="trade-col" style="margin-top:12px">
      <h4>You give</h4>
      <div class="sticker-chips">${gets.map(({section:s,sticker_number:n})=>chipHtml(s,n,'give')).join('')}</div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-green" onclick="respondTrade('${trade.id}','accepted',${JSON.stringify(gives)},${JSON.stringify(gets)})">Accept</button>
      <button class="btn btn-red" onclick="respondTrade('${trade.id}','declined',[],[])">Decline</button>
    </div>
  `
  showScreen('pending-trade-screen')
}

async function respondTrade(tradeId, status, iReceive, iGive) {
  if (status === 'accepted') {
    for (const {section: s, sticker_number: n} of iReceive) await setCount(s, n, getCount(s, n) + 1)
    for (const {section: s, sticker_number: n} of iGive)    await setCount(s, n, Math.max(0, getCount(s, n) - 1))
  }
  await sb.from('trades').update({ status }).eq('id', tradeId)
  toast(status === 'accepted' ? 'Trade accepted! Stickers updated.' : 'Trade declined.')
  await checkPendingTrades()
  showScreen('home-screen')
}

// =============================================
// HELPERS
// =============================================
function getAllStickerKeys() {
  const keys = []
  GROUPS.forEach(g => g.teams.forEach(([code]) => {
    for (let n = 1; n <= COUNTRY_COUNT; n++) keys.push([code, n])
  }))
  for (let n = 1; n <= FWC_COUNT; n++) keys.push(['FWC', n])
  return keys
}

function showArgSplash() {
  const heart = [
    ' 🇦🇷 🇦🇷   🇦🇷 🇦🇷 ',
    '🇦🇷 🇦🇷 🇦🇷 🇦🇷 🇦🇷',
    '🇦🇷 🇦🇷 🇦🇷 🇦🇷 🇦🇷',
    ' 🇦🇷 🇦🇷 🇦🇷 🇦🇷 ',
    '  🇦🇷 🇦🇷 🇦🇷  ',
    '    🇦🇷 🇦🇷    ',
    '      🇦🇷      ',
  ]
  document.getElementById('arg-heart').innerHTML = '<pre style="font-family:inherit;background:none;border:none;text-align:center;line-height:2rem">' + heart.join('\n') + '</pre>'
  const splash = document.getElementById('arg-splash')
  splash.style.display = 'flex'
  // Animate in
  splash.style.opacity = '0'
  splash.style.transition = 'opacity .4s'
  requestAnimationFrame(() => requestAnimationFrame(() => splash.style.opacity = '1'))
}

function closeArgSplash() {
  const splash = document.getElementById('arg-splash')
  splash.style.opacity = '0'
  setTimeout(() => splash.style.display = 'none', 400)
}

function toast(msg) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), 2500)
}

// Init check screen on first load
document.addEventListener('DOMContentLoaded', () => {
  buildSectionList()
})
