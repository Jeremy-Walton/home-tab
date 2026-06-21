import type { RxJsonSchema } from 'rxdb'
import type { Dashboard, Link } from '../types'

export const dashboardSchema: RxJsonSchema<Dashboard> = {
  title: 'dashboard schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    name: { type: 'string' },
    backgroundImageUrl: { type: 'string' },
    createdAt: { type: 'number' },
  },
  required: ['id', 'name', 'createdAt'],
}

export const linkSchema: RxJsonSchema<Link> = {
  title: 'link schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    dashboardId: { type: 'string', maxLength: 64 },
    order: { type: 'number' },
    title: { type: 'string' },
    url: { type: 'string' },
    backgroundImageUrl: { type: 'string' },
    backgroundColor: { type: 'string' },
  },
  required: ['id', 'dashboardId', 'order', 'title', 'url'],
  indexes: ['dashboardId'],
}
