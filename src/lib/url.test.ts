import { describe, expect, it } from 'vitest'
import { normalizeUrl } from './url'

describe('normalizeUrl', () => {
  it('prepends https:// when no scheme is present', () => {
    expect(normalizeUrl('github.com')).toBe('https://github.com')
  })

  it('leaves an existing https:// scheme untouched', () => {
    expect(normalizeUrl('https://github.com')).toBe('https://github.com')
  })

  it('leaves an existing http:// scheme untouched', () => {
    expect(normalizeUrl('http://github.com')).toBe('http://github.com')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeUrl('  github.com  ')).toBe('https://github.com')
  })

  it('returns an empty string unchanged', () => {
    expect(normalizeUrl('')).toBe('')
  })
})
