import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'
import hotkeys from 'hotkeys-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import type { Dashboard } from '../types'

function makeDashboards(count: number): Dashboard[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `dash-${i + 1}`,
    name: `Dashboard ${i + 1}`,
    order: i,
    createdAt: 0,
  }))
}

afterEach(() => {
  hotkeys.unbind()
  document.body.innerHTML = ''
})

describe('useKeyboardShortcuts — dashboard switching', () => {
  it('alt+2 switches to the 2nd dashboard', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({ dashboards: makeDashboards(3), setActiveDashboardId }),
    )

    fireEvent.keyDown(document, { key: '2', code: 'Digit2', keyCode: 50, altKey: true })

    expect(setActiveDashboardId).toHaveBeenCalledWith('dash-2')
  })

  it('does not fire on a bare digit without alt', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({ dashboards: makeDashboards(3), setActiveDashboardId }),
    )

    fireEvent.keyDown(document, { key: '2', code: 'Digit2', keyCode: 50 })

    expect(setActiveDashboardId).not.toHaveBeenCalled()
  })

  it('does not fire when alt+cmd are both held (exact chord match)', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({ dashboards: makeDashboards(3), setActiveDashboardId }),
    )

    fireEvent.keyDown(document, {
      key: '2',
      code: 'Digit2',
      keyCode: 50,
      altKey: true,
      metaKey: true,
    })

    expect(setActiveDashboardId).not.toHaveBeenCalled()
  })

  it('does not fire past the last dashboard, and does not preventDefault', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({ dashboards: makeDashboards(3), setActiveDashboardId }),
    )

    const event = fireEvent.keyDown(document, {
      key: '9',
      code: 'Digit9',
      keyCode: 57,
      altKey: true,
    })

    expect(setActiveDashboardId).not.toHaveBeenCalled()
    expect(event).toBe(true)
  })

  it('does not fire when the event target is an input', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({ dashboards: makeDashboards(3), setActiveDashboardId }),
    )

    fireEvent.keyDown(input, { key: '2', code: 'Digit2', keyCode: 50, altKey: true })

    expect(setActiveDashboardId).not.toHaveBeenCalled()
  })

  it('does not fire while a dialog is open', () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.appendChild(dialog)
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({ dashboards: makeDashboards(3), setActiveDashboardId }),
    )

    fireEvent.keyDown(document, { key: '1', code: 'Digit1', keyCode: 49, altKey: true })

    expect(setActiveDashboardId).not.toHaveBeenCalled()
  })

  it('does not fire on an auto-repeated key', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({ dashboards: makeDashboards(3), setActiveDashboardId }),
    )

    fireEvent.keyDown(document, {
      key: '2',
      code: 'Digit2',
      keyCode: 50,
      altKey: true,
      repeat: true,
    })

    expect(setActiveDashboardId).not.toHaveBeenCalled()
  })
})
