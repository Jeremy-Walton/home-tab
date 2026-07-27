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
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: null,
        setActiveDashboardId,
      }),
    )

    fireEvent.keyDown(document, { key: '2', code: 'Digit2', keyCode: 50, altKey: true })

    expect(setActiveDashboardId).toHaveBeenCalledWith('dash-2')
  })

  it('does not fire on a bare digit without alt', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: null,
        setActiveDashboardId,
      }),
    )

    fireEvent.keyDown(document, { key: '2', code: 'Digit2', keyCode: 50 })

    expect(setActiveDashboardId).not.toHaveBeenCalled()
  })

  it('does not fire when alt+cmd are both held (exact chord match)', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: null,
        setActiveDashboardId,
      }),
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
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: null,
        setActiveDashboardId,
      }),
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

  it('alt+0 switches to the 10th dashboard', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(10),
        activeDashboardId: null,
        setActiveDashboardId,
      }),
    )

    fireEvent.keyDown(document, { key: '0', code: 'Digit0', keyCode: 48, altKey: true })

    expect(setActiveDashboardId).toHaveBeenCalledWith('dash-10')
  })

  it('alt+0 does not fire with fewer than 10 dashboards', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: null,
        setActiveDashboardId,
      }),
    )

    fireEvent.keyDown(document, { key: '0', code: 'Digit0', keyCode: 48, altKey: true })

    expect(setActiveDashboardId).not.toHaveBeenCalled()
  })

  it('does not fire when the event target is an input', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: null,
        setActiveDashboardId,
      }),
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
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: null,
        setActiveDashboardId,
      }),
    )

    fireEvent.keyDown(document, { key: '1', code: 'Digit1', keyCode: 49, altKey: true })

    expect(setActiveDashboardId).not.toHaveBeenCalled()
  })

  it('does not fire on an auto-repeated key', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: null,
        setActiveDashboardId,
      }),
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

describe('useKeyboardShortcuts — cycling', () => {
  it('alt+right from the last dashboard wraps to the first', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: 'dash-3',
        setActiveDashboardId,
      }),
    )

    fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, altKey: true })

    expect(setActiveDashboardId).toHaveBeenCalledWith('dash-1')
  })

  it('alt+left from the first dashboard wraps to the last', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: 'dash-1',
        setActiveDashboardId,
      }),
    )

    fireEvent.keyDown(document, { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, altKey: true })

    expect(setActiveDashboardId).toHaveBeenCalledWith('dash-3')
  })

  it('alt+] behaves the same as alt+right', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: 'dash-2',
        setActiveDashboardId,
      }),
    )

    fireEvent.keyDown(document, { key: ']', code: 'BracketRight', keyCode: 221, altKey: true })

    expect(setActiveDashboardId).toHaveBeenCalledWith('dash-3')
  })

  it('alt+[ behaves the same as alt+left', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: 'dash-2',
        setActiveDashboardId,
      }),
    )

    fireEvent.keyDown(document, { key: '[', code: 'BracketLeft', keyCode: 219, altKey: true })

    expect(setActiveDashboardId).toHaveBeenCalledWith('dash-1')
  })

  it('is a no-op with a single dashboard', () => {
    const setActiveDashboardId = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(1),
        activeDashboardId: 'dash-1',
        setActiveDashboardId,
      }),
    )

    fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, altKey: true })

    expect(setActiveDashboardId).not.toHaveBeenCalled()
  })
})

describe('useKeyboardShortcuts — add link', () => {
  it('alt+n calls onAddLink', () => {
    const setActiveDashboardId = vi.fn()
    const onAddLink = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: 'dash-1',
        setActiveDashboardId,
        onAddLink,
      }),
    )

    fireEvent.keyDown(document, { key: 'n', code: 'KeyN', keyCode: 78, altKey: true })

    expect(onAddLink).toHaveBeenCalledOnce()
  })

  it('plain n does not call onAddLink', () => {
    const setActiveDashboardId = vi.fn()
    const onAddLink = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: 'dash-1',
        setActiveDashboardId,
        onAddLink,
      }),
    )

    fireEvent.keyDown(document, { key: 'n', code: 'KeyN', keyCode: 78 })

    expect(onAddLink).not.toHaveBeenCalled()
  })

  it('alt+n with a dialog open does not call onAddLink', () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.appendChild(dialog)
    const setActiveDashboardId = vi.fn()
    const onAddLink = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        dashboards: makeDashboards(3),
        activeDashboardId: 'dash-1',
        setActiveDashboardId,
        onAddLink,
      }),
    )

    fireEvent.keyDown(document, { key: 'n', code: 'KeyN', keyCode: 78, altKey: true })

    expect(onAddLink).not.toHaveBeenCalled()
  })
})
