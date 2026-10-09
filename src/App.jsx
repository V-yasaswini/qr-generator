import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { TYPES, defaultValues, buildPayload, validate, getWarnings } from './qr.js'
import { PRESETS } from './presets.js'
import { loadRecent, saveRecent, loadTheme, saveTheme } from './storage.js'

const ECC_LEVELS = [
  ['L', 'Low (7%)'],
  ['M', 'Medium (15%)'],
  ['Q', 'Quartile (25%)'],
  ['H', 'High (30%)'],
]

function confetti() {
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  for (let i = 0; i < 45; i++) {
    const p = document.createElement('i')
    p.className = 'confetti'
    p.style.left = Math.random() * 100 + 'vw'
    p.style.background = colors[i % colors.length]
    p.style.animationDelay = Math.random() * 0.3 + 's'
    p.style.setProperty('--drift', Math.random() * 200 - 100 + 'px')
    document.body.appendChild(p)
    setTimeout(() => p.remove(), 2500)
  }
}

export default function App() {
  const canvasRef = useRef(null)
  const [type, setType] = useState('url')
  const [values, setValues] = useState(defaultValues())
  const [touched, setTouched] = useState({})
  const [settings, setSettings] = useState({ ...PRESETS[0] })
  const [presetId, setPresetId] = useState('classic')
  const [logo, setLogo] = useState(null) // data URL
  const [recent, setRecent] = useState(loadRecent)
  const [theme, setTheme] = useState(loadTheme)
  const [message, setMessage] = useState('')
  const [renderError, setRenderError] = useState('')

  const typeDef = TYPES.find((t) => t.id === type)
  const errors = useMemo(() => validate(type, values), [type, values])
  const isValid = Object.keys(errors).length === 0
  const payload = useMemo(() => (isValid ? buildPayload(type, values) : ''), [isValid, type, values])
  const warnings = useMemo(() => getWarnings(settings, payload, !!logo), [settings, payload, logo])

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    saveTheme(theme)
  }, [theme])

  // Save recent list whenever it changes
  useEffect(() => saveRecent(recent), [recent])

  // Draw the QR code live
  useEffect(() => {
    if (!isValid || !canvasRef.current) return
    let cancelled = false
    setRenderError('')
    QRCode.toCanvas(canvasRef.current, payload, {
      width: settings.size,
      margin: settings.margin,
      errorCorrectionLevel: settings.ecc,
      color: { dark: settings.fg, light: settings.bg },
    })
      .then(() => {
        if (cancelled || !logo) return
        const img = new Image()
        img.onload = () => {
          if (cancelled) return
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')
          const box = Math.round(canvas.width * 0.22)
          const x = (canvas.width - box) / 2
          const y = (canvas.height - box) / 2
          ctx.fillStyle = settings.bg
          ctx.fillRect(x - 4, y - 4, box + 8, box + 8)
          ctx.drawImage(img, x, y, box, box)
        }
        img.src = logo
      })
      .catch(() => !cancelled && setRenderError('This data is too large for a QR code. Please shorten it.'))
    return () => {
      cancelled = true
    }
  }, [payload, isValid, settings, logo])

  const flash = (text) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 2500)
  }

  const setField = (key, val) => setValues((v) => ({ ...v, [key]: val }))
  const setSetting = (key, val) => {
    setSettings((s) => ({ ...s, [key]: val }))
    setPresetId(null) // user changed things by hand
  }
  const applyPreset = (p) => {
    setSettings({ fg: p.fg, bg: p.bg, ecc: p.ecc, margin: p.margin, size: p.size })
    setPresetId(p.id)
  }

  const canExport = isValid && !renderError

  const touchAll = () => {
    const all = {}
    typeDef.fields.forEach((f) => (all[f.key] = true))
    setTouched(all)
  }

  const rememberCurrent = () => {
    const item = { id: Date.now(), type, values, settings, presetId, logo, payload, createdAt: new Date().toISOString() }
    setRecent((list) => {
      const rest = list.filter((r) => !(r.payload === item.payload && JSON.stringify(r.settings) === JSON.stringify(item.settings)))
      return [item, ...rest].slice(0, 10)
    })
  }

  const downloadPng = () => {
    if (!canExport) return touchAll()
    const a = document.createElement('a')
    a.href = canvasRef.current.toDataURL('image/png')
    a.download = 'qr-code.png'
    a.click()
    rememberCurrent()
    flash('PNG downloaded!')
  }

  const downloadSvg = async () => {
    if (!canExport) return touchAll()
    const svg = await QRCode.toString(payload, {
      type: 'svg',
      width: settings.size,
      margin: settings.margin,
      errorCorrectionLevel: settings.ecc,
      color: { dark: settings.fg, light: settings.bg },
    })
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'qr-code.svg'
    a.click()
    URL.revokeObjectURL(url)
    rememberCurrent()
    flash(logo ? 'SVG downloaded (logo is only in PNG).' : 'SVG downloaded!')
  }

  const copyImage = () => {
    if (!canExport) return touchAll()
    canvasRef.current.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        rememberCurrent()
        flash('Copied to clipboard!')
      } catch {
        flash('Your browser blocked copying. Use Download instead.')
      }
    })
  }

  const onLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return flash('Please choose an image file.')
    if (file.size > 500 * 1024) return flash('Logo is too big (max 500 KB).')
    const reader = new FileReader()
    reader.onload = () => {
      setLogo(reader.result)
      if (settings.ecc !== 'H') setSetting('ecc', 'H')
    }
    reader.readAsDataURL(file)
  }

  const reuse = (r) => {
    setType(r.type)
    setValues({ ...defaultValues(), ...r.values })
    setSettings(r.settings)
    setPresetId(r.presetId || null)
    setLogo(r.logo || null)
    setTouched({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>▦ QR Studio</h1>
        <button className="btn ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </header>

      <main className="layout">
        {/* LEFT: controls */}
        <section className="panel">
          <h2>1. What is inside?</h2>
          <div className="tabs" role="tablist">
            {TYPES.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={type === t.id}
                className={'tab' + (type === t.id ? ' active' : '')}
                onClick={() => { setType(t.id); setTouched({}) }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {typeDef.fields.map((f) => {
            const err = touched[f.key] && errors[f.key]
            const hidden = f.key === 'password' && values.security === 'nopass'
            if (hidden) return null
            return (
              <div className="field" key={f.key}>
                {f.checkbox ? (
                  <label className="check">
                    <input type="checkbox" checked={values[f.key]} onChange={(e) => setField(f.key, e.target.checked)} />
                    {f.label}
                  </label>
                ) : (
                  <>
                    <label htmlFor={f.key}>{f.label}</label>
                    {f.options ? (
                      <select id={f.key} value={values[f.key]} onChange={(e) => setField(f.key, e.target.value)}>
                        {f.options.map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    ) : f.multiline ? (
                      <textarea
                        id={f.key}
                        rows={3}
                        placeholder={f.placeholder}
                        value={values[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))}
                        className={err ? 'invalid' : ''}
                      />
                    ) : (
                      <input
                        id={f.key}
                        type="text"
                        placeholder={f.placeholder}
                        value={values[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))}
                        className={err ? 'invalid' : ''}
                      />
                    )}
                  </>
                )}
                {err && <p className="error" role="alert">{err}</p>}
              </div>
            )
          })}

          <h2>2. Presets</h2>
          <div className="presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={'preset' + (presetId === p.id ? ' active' : '')}
                onClick={() => applyPreset(p)}
                title={p.name}
              >
                <span className="swatch" style={{ background: p.bg, color: p.fg }}>▦</span>
                {p.name}
              </button>
            ))}
          </div>

          <h2>3. Customize</h2>
          <div className="grid2">
            <div className="field">
              <label htmlFor="fg">Foreground color</label>
              <input id="fg" type="color" value={settings.fg} onChange={(e) => setSetting('fg', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="bg">Background color</label>
              <input id="bg" type="color" value={settings.bg} onChange={(e) => setSetting('bg', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="size">Size: {settings.size}px</label>
            <input id="size" type="range" min="128" max="1000" step="8" value={settings.size}
              onChange={(e) => setSetting('size', Number(e.target.value))} />
          </div>

          <div className="field">
            <label htmlFor="margin">Margin: {settings.margin} modules</label>
            <input id="margin" type="range" min="0" max="10" value={settings.margin}
              onChange={(e) => setSetting('margin', Number(e.target.value))} />
          </div>

          <div className="field">
            <label htmlFor="ecc">Error correction</label>
            <select id="ecc" value={settings.ecc} onChange={(e) => setSetting('ecc', e.target.value)}>
              {ECC_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="logo">Logo (optional)</label>
            <input id="logo" type="file" accept="image/*" onChange={onLogo} />
            {logo && <button className="btn small" onClick={() => setLogo(null)}>Remove logo</button>}
          </div>
        </section>

        {/* RIGHT: preview */}
        <section className="panel preview-panel">
          <h2>Live preview</h2>
          <div className="preview">
            <canvas ref={canvasRef} className={canExport ? 'qr' : 'qr hidden'} aria-label="QR code preview" />
            {!canExport && (
              <div className="placeholder">
                {renderError || 'Fill in the form and your QR code will appear here.'}
              </div>
            )}
          </div>

          {warnings.length > 0 && (
            <ul className="warnings">
              {warnings.map((w, i) => (
                <li key={i} className={w.level}>
                  {w.level === 'danger' ? '⛔' : '⚠️'} {w.text}
                </li>
              ))}
            </ul>
          )}
          {canExport && warnings.length === 0 && <p className="ok">✅ Looks easy to scan!</p>}

          <div className="actions">
            <button className="btn primary" onClick={downloadPng}>⬇ Download PNG</button>
            <button className="btn" onClick={downloadSvg}>⬇ SVG</button>
            <button className="btn" onClick={copyImage}>📋 Copy</button>
            <button className="btn" onClick={() => canExport ? (rememberCurrent(), flash('Saved to recent!')) : touchAll()}>
              💾 Save
            </button>
          </div>
          <p className="toast" aria-live="polite">{message}</p>
        </section>
      </main>

      {/* Recent */}
      <section className="panel recent">
        <div className="recent-head">
          <h2>Recent QR codes</h2>
          {recent.length > 0 && <button className="btn small" onClick={() => setRecent([])}>Clear all</button>}
        </div>
        {recent.length === 0 ? (
          <p className="muted">Nothing yet. Download, copy or save a QR code and it will show up here.</p>
        ) : (
          <ul className="recent-list">
            {recent.map((r) => (
              <li key={r.id}>
                <button className="recent-item" onClick={() => reuse(r)}>
                  <span className="swatch big" style={{ background: r.settings.bg, color: r.settings.fg }}>▦</span>
                  <span className="recent-text">
                    <strong>{TYPES.find((t) => t.id === r.type)?.label}</strong>
                    <small>{r.payload.length > 40 ? r.payload.slice(0, 40) + '…' : r.payload}</small>
                  </span>
                </button>
                <button className="x" aria-label="Delete" onClick={() => setRecent((l) => l.filter((i) => i.id !== r.id))}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="footer">Everything happens in your browser. Nothing is uploaded.</footer>
    </div>
  )
}
