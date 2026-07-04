import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AppStateProvider } from './AppStateContext'
import { useAppState } from './useAppState'
import { createTestDatabase } from '../test/testDb'
import type { AppDatabase } from '../storage/db'

let testDb: AppDatabase

vi.mock('../storage/db', () => ({
  getDatabase: () => Promise.resolve(testDb),
}))

function renderAppState() {
  return renderHook(() => useAppState(), { wrapper: AppStateProvider })
}

async function readyAppState() {
  const rendered = renderAppState()
  await waitFor(() => expect(rendered.result.current.ready).toBe(true))
  // Bootstrap runs after ready; wait until it has settled (at least one
  // dashboard exists in every scenario this suite creates).
  await waitFor(() => expect(rendered.result.current.dashboards.length).toBeGreaterThan(0))
  return rendered
}

beforeEach(async () => {
  localStorage.clear()
  testDb = await createTestDatabase()
})

afterEach(async () => {
  await testDb.remove()
})

describe('bootstrap', () => {
  it('creates a Default dashboard on first load', async () => {
    const { result } = await readyAppState()
    expect(result.current.dashboards).toHaveLength(1)
    expect(result.current.dashboards[0].name).toBe('Default')
    expect(localStorage.getItem('launch-tabs:activeDashboardId')).toBe(
      result.current.dashboards[0].id,
    )
  })

  it('does not create a second dashboard when one already exists', async () => {
    await testDb.dashboards.insert({ id: 'd1', name: 'Existing', order: 0, createdAt: 1 })

    const { result } = await readyAppState()

    expect(result.current.dashboards).toHaveLength(1)
    expect(result.current.dashboards[0].id).toBe('d1')
  })

  it('auto-imports legacy localStorage state into an "Imported" dashboard', async () => {
    localStorage.setItem(
      'state',
      JSON.stringify({
        backgroundUrl: 'https://example.com/bg.jpg',
        links: [{ label: 'GitHub', url: 'github.com', image: 'https://example.com/gh.png' }],
      }),
    )

    const { result } = await readyAppState()

    await waitFor(() => expect(result.current.links).toHaveLength(1))

    expect(result.current.dashboards).toHaveLength(1)
    const dashboard = result.current.dashboards[0]
    expect(dashboard.name).toBe('Imported')
    expect(dashboard.backgroundImageUrl).toBe('https://example.com/bg.jpg')

    const link = result.current.links[0]
    expect(link.title).toBe('GitHub')
    expect(link.url).toBe('https://github.com')

    expect(localStorage.getItem('state')).toBeNull()
    expect(result.current.activeDashboardId).toBe(dashboard.id)
  })

  it('imports legacy state even when dashboards already exist', async () => {
    await testDb.dashboards.insert({ id: 'd1', name: 'Existing', order: 3, createdAt: 1 })
    localStorage.setItem(
      'state',
      JSON.stringify({
        backgroundUrl: '',
        links: [{ label: 'Example', url: 'example.com' }],
      }),
    )

    const { result } = await readyAppState()

    await waitFor(() => expect(result.current.dashboards).toHaveLength(2))

    const imported = result.current.dashboards.find((d) => d.name === 'Imported')
    expect(imported).toBeDefined()
    expect(imported?.order).toBe(4)
  })

  it('discards malformed legacy state and still creates Default', async () => {
    localStorage.setItem('state', 'not json')

    const { result } = await readyAppState()

    expect(localStorage.getItem('state')).toBeNull()
    expect(result.current.dashboards).toHaveLength(1)
    expect(result.current.dashboards[0].name).toBe('Default')
  })
})

describe('mutations', () => {
  it('addLink appends with the next order', async () => {
    await testDb.dashboards.insert({ id: 'd1', name: 'D1', order: 0, createdAt: 1 })
    await testDb.links.insert({ id: 'l1', dashboardId: 'd1', order: 0, title: 'A', url: 'https://a.com' })
    await testDb.links.insert({ id: 'l2', dashboardId: 'd1', order: 1, title: 'B', url: 'https://b.com' })

    const { result } = await readyAppState()
    await waitFor(() => expect(result.current.links).toHaveLength(2))

    await result.current.addLink('d1')

    await waitFor(() => expect(result.current.links).toHaveLength(3))
    const newLink = result.current.links.find((l) => l.order === 2)
    expect(newLink).toMatchObject({
      order: 2,
      title: 'New link',
      url: 'https://example.com',
    })
  })

  it('reorderLinks persists the new order', async () => {
    await testDb.dashboards.insert({ id: 'd1', name: 'D1', order: 0, createdAt: 1 })
    await testDb.links.insert({ id: 'l1', dashboardId: 'd1', order: 0, title: 'A', url: 'https://a.com' })
    await testDb.links.insert({ id: 'l2', dashboardId: 'd1', order: 1, title: 'B', url: 'https://b.com' })
    await testDb.links.insert({ id: 'l3', dashboardId: 'd1', order: 2, title: 'C', url: 'https://c.com' })

    const { result } = await readyAppState()
    await waitFor(() => expect(result.current.links).toHaveLength(3))

    await result.current.reorderLinks('d1', ['l3', 'l1', 'l2'])

    await waitFor(() => {
      const byId = new Map(result.current.links.map((l) => [l.id, l]))
      expect(byId.get('l3')?.order).toBe(0)
      expect(byId.get('l1')?.order).toBe(1)
      expect(byId.get('l2')?.order).toBe(2)
    })

    const persisted = await testDb.links.find().exec()
    const persistedById = new Map(persisted.map((d) => [d.id, d.toJSON()]))
    expect(persistedById.get('l3')?.order).toBe(0)
    expect(persistedById.get('l1')?.order).toBe(1)
    expect(persistedById.get('l2')?.order).toBe(2)
  })

  it("reorderLinks leaves other dashboards' links untouched", async () => {
    await testDb.dashboards.insert({ id: 'd1', name: 'D1', order: 0, createdAt: 1 })
    await testDb.dashboards.insert({ id: 'd2', name: 'D2', order: 1, createdAt: 2 })
    await testDb.links.insert({ id: 'l1', dashboardId: 'd1', order: 0, title: 'A', url: 'https://a.com' })
    await testDb.links.insert({ id: 'l2', dashboardId: 'd1', order: 1, title: 'B', url: 'https://b.com' })
    await testDb.links.insert({ id: 'l9', dashboardId: 'd2', order: 0, title: 'Z', url: 'https://z.com' })

    const { result } = await readyAppState()
    await waitFor(() => expect(result.current.links).toHaveLength(3))

    await result.current.reorderLinks('d1', ['l2', 'l1'])

    await waitFor(() => {
      const byId = new Map(result.current.links.map((l) => [l.id, l]))
      expect(byId.get('l1')?.order).toBe(1)
    })

    const persisted = await testDb.links.findOne('l9').exec()
    expect(persisted?.toJSON().order).toBe(0)
  })

  it('moveLinkToDashboard appends to the end of the target dashboard', async () => {
    await testDb.dashboards.insert({ id: 'd1', name: 'D1', order: 0, createdAt: 1 })
    await testDb.dashboards.insert({ id: 'd2', name: 'D2', order: 1, createdAt: 2 })
    await testDb.links.insert({ id: 'l1', dashboardId: 'd1', order: 0, title: 'A', url: 'https://a.com' })
    await testDb.links.insert({ id: 'l2', dashboardId: 'd2', order: 0, title: 'B', url: 'https://b.com' })

    const { result } = await readyAppState()
    await waitFor(() => expect(result.current.links).toHaveLength(2))

    await result.current.moveLinkToDashboard('l1', 'd2')

    await waitFor(() => {
      const moved = result.current.links.find((l) => l.id === 'l1')
      expect(moved?.dashboardId).toBe('d2')
      expect(moved?.order).toBe(1)
    })

    const persisted = await testDb.links.findOne('l1').exec()
    expect(persisted?.toJSON()).toMatchObject({ dashboardId: 'd2', order: 1 })
  })

  it('deleteDashboard cascades link deletion', async () => {
    await testDb.dashboards.insert({ id: 'd1', name: 'D1', order: 0, createdAt: 1 })
    await testDb.dashboards.insert({ id: 'd2', name: 'D2', order: 1, createdAt: 2 })
    await testDb.links.insert({ id: 'l1', dashboardId: 'd1', order: 0, title: 'A', url: 'https://a.com' })
    await testDb.links.insert({ id: 'l2', dashboardId: 'd1', order: 1, title: 'B', url: 'https://b.com' })

    const { result } = await readyAppState()
    await waitFor(() => expect(result.current.dashboards).toHaveLength(2))

    await result.current.deleteDashboard('d1')

    await waitFor(() => expect(result.current.dashboards).toHaveLength(1))

    const remainingLinks = await testDb.links.find({ selector: { dashboardId: 'd1' } }).exec()
    expect(remainingLinks).toHaveLength(0)
  })

  it('deleteDashboard is a no-op for the last remaining dashboard', async () => {
    await testDb.dashboards.insert({ id: 'd1', name: 'Only', order: 0, createdAt: 1 })

    const { result } = await readyAppState()
    await waitFor(() => expect(result.current.dashboards).toHaveLength(1))

    await result.current.deleteDashboard('d1')

    const doc = await testDb.dashboards.findOne('d1').exec()
    expect(doc).not.toBeNull()
    expect(result.current.dashboards).toHaveLength(1)
  })

  it('updateLink normalizes scheme-less URLs', async () => {
    await testDb.dashboards.insert({ id: 'd1', name: 'D1', order: 0, createdAt: 1 })
    await testDb.links.insert({ id: 'l1', dashboardId: 'd1', order: 0, title: 'A', url: 'https://a.com' })

    const { result } = await readyAppState()
    await waitFor(() => expect(result.current.links).toHaveLength(1))

    await result.current.updateLink('l1', { url: 'github.com' })

    await waitFor(() => {
      const updated = result.current.links.find((l) => l.id === 'l1')
      expect(updated?.url).toBe('https://github.com')
    })

    const persisted = await testDb.links.findOne('l1').exec()
    expect(persisted?.toJSON().url).toBe('https://github.com')
  })
})

describe('importState', () => {
  it('persists dashboards and links from a valid file and resolves with a summary', async () => {
    await testDb.dashboards.insert({ id: 'd0', name: 'Existing', order: 0, createdAt: 1 })

    const { result } = await readyAppState()
    await waitFor(() => expect(result.current.dashboards).toHaveLength(1))

    const summary = await result.current.importState({
      dashboards: [{ id: 'd1', name: 'Imported D', order: 1, createdAt: 2 }],
      links: [
        { id: 'l1', dashboardId: 'd1', order: 0, title: 'A', url: 'https://a.com' },
      ],
      activeDashboardId: 'd1',
    })

    expect(summary).toEqual({ dashboards: 1, links: 1 })

    await waitFor(() => expect(result.current.dashboards).toHaveLength(2))
    await waitFor(() => expect(result.current.links).toHaveLength(1))
    expect(result.current.activeDashboardId).toBe('d1')

    const persistedDashboard = await testDb.dashboards.findOne('d1').exec()
    expect(persistedDashboard).not.toBeNull()
    const persistedLink = await testDb.links.findOne('l1').exec()
    expect(persistedLink).not.toBeNull()
  })

  it('rejects an unrecognized file and writes nothing', async () => {
    await testDb.dashboards.insert({ id: 'd0', name: 'Existing', order: 0, createdAt: 1 })

    const { result } = await readyAppState()
    await waitFor(() => expect(result.current.dashboards).toHaveLength(1))

    await expect(
      result.current.importState({ dashboards: 'x', links: [] }),
    ).rejects.toThrow('Unrecognized import file format.')

    const dashboards = await testDb.dashboards.find().exec()
    expect(dashboards).toHaveLength(1)
    const links = await testDb.links.find().exec()
    expect(links).toHaveLength(0)
  })
})

describe('bootstrap under concurrent tabs', () => {
  // Minimal Web Locks shim: serializes callbacks per lock name, which is the
  // only property the bootstrap guard relies on.
  function installLocksShim() {
    let queue: Promise<unknown> = Promise.resolve()
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (_name: string, fn: () => Promise<unknown>) => {
          const run = queue.then(fn)
          queue = run.catch(() => undefined)
          return run
        },
      },
    })
    return () => {
      delete (navigator as { locks?: unknown }).locks
    }
  }

  let removeShim: () => void

  beforeEach(() => {
    removeShim = installLocksShim()
  })

  afterEach(() => {
    removeShim()
  })

  it('only one Default dashboard when two providers race', async () => {
    const first = renderAppState()
    const second = renderAppState()

    await waitFor(() => expect(first.result.current.ready).toBe(true))
    await waitFor(() => expect(second.result.current.ready).toBe(true))

    await waitFor(() => expect(first.result.current.dashboards.length).toBeGreaterThan(0))
    await waitFor(() => expect(second.result.current.dashboards.length).toBeGreaterThan(0))

    const persisted = await testDb.dashboards.find().exec()
    expect(persisted).toHaveLength(1)
  })

  it('legacy state is imported exactly once when two providers race', async () => {
    localStorage.setItem(
      'state',
      JSON.stringify({
        backgroundUrl: 'https://example.com/bg.jpg',
        links: [{ label: 'GitHub', url: 'github.com', image: 'https://example.com/gh.png' }],
      }),
    )

    const first = renderAppState()
    const second = renderAppState()

    await waitFor(() => expect(first.result.current.ready).toBe(true))
    await waitFor(() => expect(second.result.current.ready).toBe(true))

    await waitFor(() => expect(first.result.current.dashboards.length).toBeGreaterThan(0))
    await waitFor(() => expect(second.result.current.dashboards.length).toBeGreaterThan(0))

    const persistedDashboards = await testDb.dashboards.find().exec()
    const imported = persistedDashboards.filter((d) => d.toJSON().name === 'Imported')
    expect(imported).toHaveLength(1)

    const persistedLinks = await testDb.links.find().exec()
    expect(persistedLinks).toHaveLength(1)

    expect(localStorage.getItem('state')).toBeNull()
  })
})

describe('background clearing (audit finding #6)', () => {
  it('clearing a background image removes it from the stored document', async () => {
    await testDb.dashboards.insert({
      id: 'd1',
      name: 'D1',
      order: 0,
      createdAt: 1,
      backgroundImageUrl: 'https://example.com/bg.jpg',
    })

    const { result } = await readyAppState()
    await waitFor(() => expect(result.current.dashboards).toHaveLength(1))

    await result.current.updateDashboard('d1', { backgroundImageUrl: undefined })

    const doc = await testDb.dashboards.findOne('d1').exec()
    expect(doc?.toJSON().backgroundImageUrl).toBeUndefined()
  })
})
