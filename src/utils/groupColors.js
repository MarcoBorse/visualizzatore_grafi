export const GROUP_COLORS = {
  infra: '#06b6d4',
  backend: '#a855f7',
  docs: '#10b981',
  frontend: '#f59e0b',
  database: '#ec4899',
  server: '#8b5cf6',
  'server 1': '#8b5cf6',
  'server 2': '#6366f1',
  'server 3': '#a855f7',
  'rete lan': '#ef4444',
  management: '#ef4444',
  telefonia: '#ec4899',
  centralino: '#ec4899',
  tlc: '#84cc16',
  'fornitura internet': '#3b82f6',
  'wifi guest': '#06b6d4',
  'lan-stampante': '#22c55e',
  stampante: '#22c55e',
  amministrazione: '#fb923c',
  'tecnico 1': '#f59e0b',
  'tecnico 2': '#14b8a6',
  'tecnico 3': '#38bdf8',
  laboratorio: '#a3e635',
  conferenza: '#e879f9',
  'lan-t1': '#f59e0b',
  'lan-t2': '#14b8a6',
  'lan-t3': '#38bdf8',
  'lan-s': '#e879f9',
  security: '#f97316'
}

export function getGroupColor(group) {
  if (!group) return '#6366f1'
  const key = group.toLowerCase().trim()
  if (GROUP_COLORS[key]) return GROUP_COLORS[key]
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 55%)`
}
