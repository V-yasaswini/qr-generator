import { describe, it, expect } from 'vitest'
import { validate, buildPayload, defaultValues, contrastRatio, getWarnings, normalizeUrl } from './qr.js'

const v = (o) => ({ ...defaultValues(), ...o })

describe('URL', () => {
  it('adds https when missing', () => expect(normalizeUrl('example.com')).toBe('https://example.com'))
  it('accepts a valid url', () => expect(validate('url', v({ url: 'example.com' }))).toEqual({}))
  it('rejects empty', () => expect(validate('url', v({ url: '' })).url).toBeTruthy())
  it('rejects nonsense', () => expect(validate('url', v({ url: 'hello world' })).url).toBeTruthy())
  it('rejects javascript:', () => expect(validate('url', v({ url: 'javascript:alert(1)' })).url).toBeTruthy())
})

describe('Text', () => {
  it('requires text', () => expect(validate('text', v({ text: '  ' })).text).toBeTruthy())
  it('limits length', () => expect(validate('text', v({ text: 'a'.repeat(1001) })).text).toBeTruthy())
  it('builds payload', () => expect(buildPayload('text', v({ text: 'Hi' }))).toBe('Hi'))
})

describe('Email', () => {
  it('rejects bad email', () => expect(validate('email', v({ to: 'abc' })).to).toBeTruthy())
  it('builds mailto', () =>
    expect(buildPayload('email', v({ to: 'a@b.com', subject: 'Hi there' }))).toBe('mailto:a@b.com?subject=Hi%20there'))
})

describe('Phone', () => {
  it('rejects letters', () => expect(validate('phone', v({ phone: 'abc' })).phone).toBeTruthy())
  it('cleans and builds tel', () => expect(buildPayload('phone', v({ phone: '+91 98765-43210' }))).toBe('tel:+919876543210'))
})

describe('Wi-Fi', () => {
  it('needs ssid', () => expect(validate('wifi', v({ password: '12345678' })).ssid).toBeTruthy())
  it('WPA password min 8', () => expect(validate('wifi', v({ ssid: 'Home', password: '123' })).password).toBeTruthy())
  it('open network needs no password', () => expect(validate('wifi', v({ ssid: 'Cafe', security: 'nopass' }))).toEqual({}))
  it('builds payload and escapes', () =>
    expect(buildPayload('wifi', v({ ssid: 'My;Net', password: 'pass:word1', hidden: true }))).toBe(
      'WIFI:T:WPA;S:My\\;Net;P:pass\\:word1;H:true;;'
    ))
})

describe('Scan reliability', () => {
  it('black on white has high contrast', () => expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0))
  it('warns on similar colors', () => {
    const w = getWarnings({ fg: '#777777', bg: '#808080', ecc: 'M', margin: 4, size: 300 }, 'x', false)
    expect(w.some((x) => x.level === 'danger')).toBe(true)
  })
  it('warns when logo used without ECC H', () => {
    const w = getWarnings({ fg: '#000000', bg: '#ffffff', ecc: 'L', margin: 4, size: 300 }, 'x', true)
    expect(w.some((x) => x.text.includes('logo'))).toBe(true)
  })
  it('no warnings for good settings', () =>
    expect(getWarnings({ fg: '#000000', bg: '#ffffff', ecc: 'M', margin: 4, size: 300 }, 'x', false)).toEqual([]))
})