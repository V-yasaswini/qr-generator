const KEY = 'qr-studio-recent'
const THEME_KEY = 'qr-studio-theme'
const MAX = 10

export function loadRecent() {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveRecent(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* storage full or blocked: ignore */
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'light'
  } catch {
    return 'light'
  }
}

export function saveTheme(t) {
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {
    /* ignore */
  }
}