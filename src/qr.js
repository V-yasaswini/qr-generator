// ---------- QR types and their input fields ----------
export const TYPES = [
  {
    id: 'url',
    label: 'URL',
    fields: [{ key: 'url', label: 'Website address', placeholder: 'https://example.com' }],
  },
  {
    id: 'text',
    label: 'Plain Text',
    fields: [{ key: 'text', label: 'Your text', placeholder: 'Type anything...', multiline: true }],
  },
  {
    id: 'email',
    label: 'Email',
    fields: [
      { key: 'to', label: 'Email address', placeholder: 'name@example.com' },
      { key: 'subject', label: 'Subject (optional)', placeholder: 'Hello!' },
      { key: 'body', label: 'Message (optional)', placeholder: 'Write a message...', multiline: true },
    ],
  },
  {
    id: 'phone',
    label: 'Phone',
    fields: [{ key: 'phone', label: 'Phone number', placeholder: '+91 98765 43210' }],
  },
  {
    id: 'wifi',
    label: 'Wi-Fi',
    fields: [
      { key: 'ssid', label: 'Network name (SSID)', placeholder: 'MyHomeWiFi' },
      {
        key: 'security',
        label: 'Security',
        options: [
          ['WPA', 'WPA / WPA2 / WPA3'],
          ['WEP', 'WEP'],
          ['nopass', 'No password'],
        ],
      },
      { key: 'password', label: 'Password', placeholder: 'At least 8 characters' },
      { key: 'hidden', label: 'This is a hidden network', checkbox: true },
    ],
  },
]

export const defaultValues = () => ({
  url: '', text: '', to: '', subject: '', body: '', phone: '',
  ssid: '', security: 'WPA', password: '', hidden: false,
})

// ---------- Helpers ----------
export function normalizeUrl(input) {
  const s = input.trim()
  if (!s) return ''
  return /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : 'https://' + s
}

const escapeWifi = (s) => s.replace(/([\\;,:"])/g, '\\$1')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const cleanPhone = (s) => s.replace(/[\s\-().]/g, '')

// ---------- Validation: returns { fieldKey: "error message" } ----------
export function validate(type, v) {
  const e = {}
  if (type === 'url') {
    if (!v.url.trim()) e.url = 'Please enter a website address.'
    else {
      try {
        const u = new URL(normalizeUrl(v.url))
        const okProto = u.protocol === 'http:' || u.protocol === 'https:'
        const okHost = u.hostname.includes('.') || u.hostname === 'localhost'
        if (!okProto || !okHost) e.url = 'That does not look like a valid web address (try example.com).'
      } catch {
        e.url = 'That does not look like a valid web address.'
      }
    }
  }
  if (type === 'text') {
    if (!v.text.trim()) e.text = 'Please type some text.'
    else if (v.text.length > 1000) e.text = 'Text is too long (max 1000 characters).'
  }
  if (type === 'email') {
    if (!v.to.trim()) e.to = 'Please enter an email address.'
    else if (!EMAIL_RE.test(v.to.trim())) e.to = 'That email address looks wrong.'
    if (v.subject.length > 200) e.subject = 'Subject is too long (max 200).'
    if (v.body.length > 500) e.body = 'Message is too long (max 500).'
  }
  if (type === 'phone') {
    if (!v.phone.trim()) e.phone = 'Please enter a phone number.'
    else if (!/^\+?\d{6,15}$/.test(cleanPhone(v.phone)))
      e.phone = 'Use 6–15 digits. You may start with + (example: +919876543210).'
  }
  if (type === 'wifi') {
    if (!v.ssid.trim()) e.ssid = 'Please enter the network name.'
    else if (v.ssid.length > 32) e.ssid = 'Network name can be at most 32 characters.'
    if (v.security !== 'nopass') {
      if (!v.password) e.password = 'Please enter the password (or choose "No password").'
      else if (v.security === 'WPA' && (v.password.length < 8 || v.password.length > 63))
        e.password = 'WPA passwords must be 8–63 characters.'
    }
  }
  return e
}

// ---------- Build the text that goes inside the QR ----------
export function buildPayload(type, v) {
  switch (type) {
    case 'url':
      return normalizeUrl(v.url)
    case 'text':
      return v.text
    case 'email': {
      const params = []
      if (v.subject.trim()) params.push('subject=' + encodeURIComponent(v.subject.trim()))
      if (v.body.trim()) params.push('body=' + encodeURIComponent(v.body.trim()))
      return 'mailto:' + v.to.trim() + (params.length ? '?' + params.join('&') : '')
    }
    case 'phone':
      return 'tel:' + cleanPhone(v.phone)
    case 'wifi': {
      const pass = v.security === 'nopass' ? '' : escapeWifi(v.password)
      return `WIFI:T:${v.security};S:${escapeWifi(v.ssid)};P:${pass};H:${v.hidden ? 'true' : 'false'};;`
    }
    default:
      return ''
  }
}

// ---------- Scan reliability ----------
function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a, b) {
  const l1 = luminance(a)
  const l2 = luminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

export function getWarnings(settings, payload, hasLogo) {
  const w = []
  const ratio = contrastRatio(settings.fg, settings.bg)
  if (ratio < 3) w.push({ level: 'danger', text: 'Colors are too similar. Most phones will NOT be able to scan this.' })
  else if (ratio < 4.5) w.push({ level: 'warn', text: 'Contrast is low. Some scanners may struggle. Use darker dots on a lighter background.' })
  if (luminance(settings.fg) > luminance(settings.bg))
    w.push({ level: 'warn', text: 'Light dots on a dark background (inverted). Some scanner apps cannot read these.' })
  if (settings.margin < 4)
    w.push({ level: 'warn', text: 'Margin is under 4 modules. Scanners need a quiet border to find the code.' })
  if (settings.size < 200)
    w.push({ level: 'warn', text: 'Small size. Printing it small can make it hard to scan.' })
  if (payload && payload.length > 400)
    w.push({ level: 'warn', text: 'Lots of data makes a dense code. Keep it short or print it larger.' })
  if (hasLogo && settings.ecc !== 'H')
    w.push({ level: 'warn', text: 'A logo hides part of the code. Set error correction to H (High).' })
  return w
}