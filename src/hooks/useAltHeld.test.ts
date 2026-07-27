import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'
import hotkeys from 'hotkeys-js'
import { afterEach, describe, expect, it } from 'vitest'
import { useAltHeld } from './useAltHeld'

afterEach(() => {
  hotkeys.unbind()
  document.body.innerHTML = ''
})

describe('useAltHeld', () => {
  it('becomes true on an alt keydown', () => {
    const { result } = renderHook(() => useAltHeld())

    fireEvent.keyDown(document, { key: 'Alt', code: 'AltLeft', keyCode: 18, altKey: true })

    expect(result.current).toBe(true)
  })

  it('becomes false on keyup once alt is released', () => {
    const { result } = renderHook(() => useAltHeld())

    fireEvent.keyDown(document, { key: 'Alt', code: 'AltLeft', keyCode: 18, altKey: true })
    expect(result.current).toBe(true)

    fireEvent.keyUp(document, { key: 'Alt', code: 'AltLeft', keyCode: 18, altKey: false })

    expect(result.current).toBe(false)
  })

  it('resets to false on window blur while held', () => {
    const { result } = renderHook(() => useAltHeld())

    fireEvent.keyDown(document, { key: 'Alt', code: 'AltLeft', keyCode: 18, altKey: true })
    expect(result.current).toBe(true)

    fireEvent(window, new Event('blur'))

    expect(result.current).toBe(false)
  })

  it('stays false when the keydown target is an input', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const { result } = renderHook(() => useAltHeld())

    fireEvent.keyDown(input, { key: 'Alt', code: 'AltLeft', keyCode: 18, altKey: true })

    expect(result.current).toBe(false)
  })
})
