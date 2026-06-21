import { describe, expect, it } from 'vitest'
import { isExportedState, isLegacyState, mapLegacyState } from './importExport'
import type { LegacyState } from '../types'

describe('isLegacyState', () => {
  it('recognizes the old localStorage.state shape', () => {
    const legacy: LegacyState = { links: [], backgroundUrl: '' }
    expect(isLegacyState(legacy)).toBe(true)
  })

  it('does not classify the new exported shape as legacy', () => {
    expect(isLegacyState({ dashboards: [], links: [], activeDashboardId: null })).toBe(false)
  })
})

describe('isExportedState', () => {
  it('recognizes the new exported shape', () => {
    expect(isExportedState({ dashboards: [], links: [], activeDashboardId: null })).toBe(true)
  })

  it('rejects the legacy shape', () => {
    expect(isExportedState({ links: [], backgroundUrl: '' })).toBe(false)
  })
})

describe('mapLegacyState', () => {
  it('maps the legacy single-dashboard shape onto a new dashboard + links', () => {
    const legacy: LegacyState = {
      backgroundUrl: 'https://example.com/bg.jpg',
      links: [
        {
          key: 1,
          id: 0,
          label: 'GitHub',
          url: 'github.com',
          image: 'https://example.com/gh.png',
          color: '#fff',
          isDisabled: false,
        },
      ],
    }

    const { dashboard, links } = mapLegacyState(legacy)

    expect(dashboard.name).toBe('Imported')
    expect(dashboard.backgroundImageUrl).toBe('https://example.com/bg.jpg')

    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({
      dashboardId: dashboard.id,
      order: 0,
      title: 'GitHub',
      url: 'https://github.com',
      backgroundImageUrl: 'https://example.com/gh.png',
      backgroundColor: '#fff',
    })
  })
})
