<template>
  <div class="network-container" ref="containerRef">
    <svg ref="svgRef" class="graph-svg" @click="onSvgClick">
      <defs>
        <!-- Background Grid Pattern -->
        <pattern id="dot-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="rgba(148, 163, 184, 0.12)" />
        </pattern>

        <!-- Drop Shadows & Glow Filters -->
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.45" />
        </filter>

        <!-- Arrow Markers for Links -->
        <marker id="arrow-default" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7"
          orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
        </marker>

        <marker id="arrow-active" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="8" markerHeight="8"
          orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#818cf8" />
        </marker>

        <marker id="arrow-selected" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="8" markerHeight="8"
          orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
        </marker>
      </defs>

      <!-- Interactive Background with Grid -->
      <rect width="100%" height="100%" fill="url(#dot-grid)" />

      <!-- Main Graph Group with D3 Zoom/Pan Transform -->
      <g :transform="`translate(${zoomTransform.x}, ${zoomTransform.y}) scale(${zoomTransform.k})`">

        <!-- SUBNETS / GROUP HULLS LAYER -->
        <g v-if="showSubnets" class="subnets-layer">
          <g v-for="hull in subnetHulls" :key="hull.group" class="subnet-group"
            :class="{ 'subnet--dimmed': isSubnetDimmed(hull.group) }">
            <path :d="hull.path" class="subnet-hull" :style="{
              fill: hull.color,
              stroke: hull.color
            }" />
            <g :transform="`translate(${hull.labelX}, ${hull.labelY})`" class="subnet-label-group">
              <rect :x="-calcTextWidth(hull.label) / 2 - 10" y="-11" :width="calcTextWidth(hull.label) + 20" height="22"
                rx="11" class="subnet-label-bg" :style="{ stroke: hull.color }" />
              <circle :cx="-calcTextWidth(hull.label) / 2 - 1" cy="0" r="3.5" :fill="hull.color" />
              <text x="4" y="3.5" text-anchor="middle" class="subnet-label-text">
                {{ hull.label }}
              </text>
            </g>
          </g>
        </g>

        <!-- LINKS LAYER -->
        <g class="links-layer">
          <g v-for="link in renderedLinks" :key="`${getLinkId(link)}`" class="link-group" :class="{
            'link--highlighted': isLinkHighlighted(link),
            'link--dimmed': isLinkDimmed(link)
          }">
            <!-- Background invisible thick stroke for easier click/hover -->
            <line :x1="link.coords.x1" :y1="link.coords.y1" :x2="link.coords.x2" :y2="link.coords.y2"
              stroke="transparent" stroke-width="14" />

            <!-- Visible Link Line -->
            <line :x1="link.coords.x1" :y1="link.coords.y1" :x2="link.coords.x2" :y2="link.coords.y2" class="link-line"
              :marker-end="getMarkerEnd(link)" />

            <!-- Relation Badge on Link -->
            <g v-if="showLabels && link.relation && link.coords"
              :transform="`translate(${link.coords.badgeX}, ${link.coords.badgeY})`" class="relation-badge">
              <rect :x="-calcTextWidth(getRelationText(link)) / 2 - 6" y="-10"
                :width="calcTextWidth(getRelationText(link)) + 12" height="20" rx="10" class="relation-badge-bg" />
              <text y="3.5" text-anchor="middle" class="relation-text">
                {{ getRelationText(link) }}
              </text>
            </g>
          </g>
        </g>

        <!-- NODES LAYER -->
        <g class="nodes-layer">
          <g v-for="node in renderedNodes" :key="node.id" :transform="`translate(${node.x || 0}, ${node.y || 0})`"
            class="node-group" :class="{
              'node--selected': selectedNodeId === node.id,
              'node--hovered': hoveredNodeId === node.id,
              'node--connected': isNodeConnectedToActive(node.id),
              'node--dimmed': isNodeDimmed(node.id),
              'node--matched': searchMatch(node),
              'node--pinned': node.pinned
            }" @pointerdown.stop="startDrag(node, $event)" @click.stop="selectNode(node)"
            @mouseenter="onNodeHover(node.id)" @mouseleave="onNodeLeave()">
            <!-- Selection / Pulsing Outer Ring -->
            <circle v-if="selectedNodeId === node.id || searchMatch(node)" :r="getNodeRadius(node) + 12"
              class="node-pulse-ring" />

            <!-- Hover / Focus Ring -->
            <circle :r="getNodeRadius(node) + 6" class="node-halo"
              :style="{ fill: getNodeColor(node.group), fillOpacity: 0.15 }" />

            <!-- Main Node Circle with Dynamic Radius -->
            <circle :r="getNodeRadius(node)" class="node-circle" :style="{
              fill: getNodeColor(node.group),
              stroke: selectedNodeId === node.id ? '#ffffff' : getNodeBorderColor(node.group)
            }" filter="url(#shadow)" />

            <!-- Node Icon / Initial Letter -->
            <text class="node-icon" text-anchor="middle" :y="getNodeRadius(node) <= 20 ? 4 : 5"
              :style="{ fontSize: `${Math.max(10, Math.min(19, Math.round(getNodeRadius(node) * 0.58)))}px` }">
              {{ getNodeIconText(node) }}
            </text>

            <!-- Degree Badge (number of connections on node) -->
            <g v-if="sizeByConnections && getNodeDegree(node.id) > 1"
              :transform="`translate(${-Math.round(getNodeRadius(node) * 0.72)}, ${-Math.round(getNodeRadius(node) * 0.72)})`"
              class="degree-badge">
              <circle r="7.5" class="degree-badge-bg" />
              <text text-anchor="middle" y="3" class="degree-badge-text">
                {{ getNodeDegree(node.id) }}
              </text>
            </g>

            <!-- Pinned Indicator Badge -->
            <g v-if="node.pinned"
              :transform="`translate(${Math.round(getNodeRadius(node) * 0.72)}, ${-Math.round(getNodeRadius(node) * 0.72)})`"
              class="pin-badge">
              <circle r="6" fill="#38bdf8" />
              <path d="M-2.5 -2.5 L2.5 2.5 M2.5 -2.5 L-2.5 2.5" stroke="#0f172a" stroke-width="1.5" />
            </g>

            <!-- Node Label below circle -->
            <g :transform="`translate(0, ${getNodeRadius(node) + 14})`" class="node-label-group">
              <rect :x="-calcTextWidth(node.label) / 2 - 8" y="-10" :width="calcTextWidth(node.label) + 16" height="20"
                rx="6" class="node-label-bg" />
              <text text-anchor="middle" y="4" class="node-label-text">
                {{ node.label }}
              </text>
            </g>

            <!-- Node Subtitle / Group Badge -->
            <text :y="getNodeRadius(node) + 28" text-anchor="middle" class="node-sublabel">
              {{ node.group }}
            </text>
          </g>
        </g>
      </g>
    </svg>

    <!-- Floating Graph Info / Hint -->
    <div class="canvas-hints">
      <span>Trascina i nodi · Rotella per zoom · Clic per dettagli</span>
      <span v-if="sizeByConnections" class="size-hint">· Nodi grandi = più connessioni</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { getGroupColor } from '../utils/groupColors'

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({ nodes: [], links: [] })
  },
  selectedNodeId: {
    type: String,
    default: null
  },
  activeGroups: {
    type: Array,
    default: () => []
  },
  searchQuery: {
    type: String,
    default: ''
  },
  showLabels: {
    type: Boolean,
    default: true
  },
  showSubnets: {
    type: Boolean,
    default: true
  },
  isSimulationRunning: {
    type: Boolean,
    default: true
  },
  sizeByConnections: {
    type: Boolean,
    default: true
  },
  scaleFactor: {
    type: Number,
    default: 1.0
  }
})

const emit = defineEmits(['select-node', 'node-drag-start'])

const containerRef = ref(null)
const svgRef = ref(null)

// Simulation references and states
const simNodes = ref([])
const simLinks = ref([])
let simulation = null
let zoomBehavior = null

const tickCount = ref(0)
const zoomTransform = ref({ x: 0, y: 0, k: 1 })
const hoveredNodeId = ref(null)

// Connection Degree Map calculation (counts total edges connected to each node)
const nodeDegreeMap = computed(() => {
  const map = new Map()
  if (props.data && props.data.nodes) {
    for (const node of props.data.nodes) {
      map.set(node.id, 0)
    }
  }
  if (props.data && props.data.links) {
    for (const link of props.data.links) {
      const sId = typeof link.source === 'object' ? link.source.id : link.source
      const tId = typeof link.target === 'object' ? link.target.id : link.target
      if (sId && map.has(sId)) map.set(sId, map.get(sId) + 1)
      if (tId && map.has(tId)) map.set(tId, map.get(tId) + 1)
    }
  }
  return map
})

const maxDegree = computed(() => {
  let max = 1
  for (const count of nodeDegreeMap.value.values()) {
    if (count > max) max = count
  }
  return max
})

function getNodeDegree(nodeId) {
  return nodeDegreeMap.value.get(nodeId) || 0
}

/**
 * Calcola il raggio del nodo:
 * - Se sizeByConnections è false: raggio uniforme (22px * scaleFactor).
 * - Se sizeByConnections è true: raggio proporzionale alla radice quadrata
 *   del numero di connessioni (area-proportional), variando da 16px (leaf) a 40px (hub).
 */
function getNodeRadius(node) {
  if (!node) return 22
  const baseUniform = 22 * props.scaleFactor
  if (!props.sizeByConnections) {
    return baseUniform
  }
  const degree = getNodeDegree(node.id)
  const maxD = maxDegree.value
  if (maxD <= 1) return baseUniform

  const minR = 16 * props.scaleFactor
  const maxR = 40 * props.scaleFactor
  const ratio = Math.sqrt(degree) / Math.sqrt(maxD)
  return Math.round(minR + ratio * (maxR - minR))
}

function getNodeColor(group) {
  return getGroupColor(group)
}

function getNodeBorderColor() {
  return 'rgba(255, 255, 255, 0.4)'
}

function getNodeIconText(node) {
  if (node.id === 'db') return '🗄'
  if (node.id === 'proxy') return '🌐'
  if (node.id === 'api') return '⚡'
  if (node.id === 'worker') return '⚙'
  if (node.id === 'docs') return '📄'
  return (node.label || node.id || '?').charAt(0).toUpperCase()
}

function calcTextWidth(str) {
  if (!str) return 20
  return Math.max(30, str.length * 7.5)
}

function getLinkId(link) {
  const s = typeof link.source === 'object' ? link.source.id : link.source
  const t = typeof link.target === 'object' ? link.target.id : link.target
  return `${s}->${t}`
}

// Compute set of connected node IDs to currently active (hovered or selected)
const activeNodeId = computed(() => hoveredNodeId.value || props.selectedNodeId)

const connectedNodeIds = computed(() => {
  if (!activeNodeId.value) return new Set()
  const set = new Set([activeNodeId.value])
  for (const link of simLinks.value) {
    const sId = typeof link.source === 'object' ? link.source.id : link.source
    const tId = typeof link.target === 'object' ? link.target.id : link.target
    if (sId === activeNodeId.value) set.add(tId)
    if (tId === activeNodeId.value) set.add(sId)
  }
  return set
})

const connectedLinkIds = computed(() => {
  if (!activeNodeId.value) return new Set()
  const set = new Set()
  for (const link of simLinks.value) {
    const sId = typeof link.source === 'object' ? link.source.id : link.source
    const tId = typeof link.target === 'object' ? link.target.id : link.target
    if (sId === activeNodeId.value || tId === activeNodeId.value) {
      set.add(getLinkId(link))
    }
  }
  return set
})

function getNodeInfoValue(node, key) {
  if (!node) return null
  if (node[key] !== undefined && node[key] !== null) return node[key]
  if (Array.isArray(node.info)) {
    for (const item of node.info) {
      if (item && typeof item === 'object' && item[key] !== undefined && item[key] !== null) {
        return item[key]
      }
    }
  }
  return null
}

function searchMatch(node) {
  if (!props.searchQuery) return false
  const q = props.searchQuery.toLowerCase().trim()
  const fields = [
    node.label,
    node.id,
    node.group,
    node.description,
    node.ip,
    node.subnet,
    node.vlan,
    node.vlanTag,
    node.lan,
    node.ufficio,
    node.switch,
    node.porta,
    node.patch,
    node.cavo
  ]
  if (Array.isArray(node.info)) {
    for (const item of node.info) {
      if (item && typeof item === 'object') {
        fields.push(...Object.values(item))
      }
    }
  }
  return fields.some(val => val && String(val).toLowerCase().includes(q))
}

function isNodeConnectedToActive(nodeId) {
  return connectedNodeIds.value.has(nodeId)
}

function isNodeDimmed(nodeId) {
  if (props.activeGroups.length > 0) {
    const node = simNodes.value.find(n => n.id === nodeId)
    if (node && !props.activeGroups.includes(node.group)) return true
  }
  if (!activeNodeId.value) return false
  return !connectedNodeIds.value.has(nodeId)
}

function isLinkHighlighted(link) {
  return connectedLinkIds.value.has(getLinkId(link))
}

function isLinkDimmed(link) {
  if (props.activeGroups.length > 0) {
    const sId = typeof link.source === 'object' ? link.source.id : link.source
    const tId = typeof link.target === 'object' ? link.target.id : link.target
    const sNode = simNodes.value.find(n => n.id === sId)
    const tNode = simNodes.value.find(n => n.id === tId)
    if ((sNode && !props.activeGroups.includes(sNode.group)) || (tNode && !props.activeGroups.includes(tNode.group))) {
      return true
    }
  }
  if (!activeNodeId.value) return false
  return !connectedLinkIds.value.has(getLinkId(link))
}

function getMarkerEnd(link) {
  if (isLinkHighlighted(link)) {
    return props.selectedNodeId ? 'url(#arrow-selected)' : 'url(#arrow-active)'
  }
  return 'url(#arrow-default)'
}

function getRelationText(link) {
  if (!link.relation) return ''
  if (isLinkHighlighted(link)) return link.relation
  const dotIdx = link.relation.indexOf('·')
  return dotIdx > 0 ? link.relation.slice(0, dotIdx).trim() : link.relation
}

// Coordinate calculation for links: dynamic offset based on each node's exact radius
const renderedLinks = computed(() => {
  const _ = tickCount.value
  const result = []

  for (const link of simLinks.value) {
    const s = link.source
    const t = link.target
    if (!s || !t || typeof s.x !== 'number' || typeof t.x !== 'number') continue

    const dx = t.x - s.x
    const dy = t.y - s.y
    const dist = Math.hypot(dx, dy) || 1

    const sRadius = getNodeRadius(s)
    const tRadius = getNodeRadius(t)

    // Offset line start and end using respective node radii + arrow clearance
    const x1 = s.x + (dx / dist) * sRadius
    const y1 = s.y + (dy / dist) * sRadius
    const x2 = t.x - (dx / dist) * (tRadius + 6)
    const y2 = t.y - (dy / dist) * (tRadius + 6)

    const midX = (s.x + t.x) / 2
    const midY = (s.y + t.y) / 2

    // Place relation badge closer to the lower-degree (leaf) node to avoid hub crowding
    const sDeg = getNodeDegree(s.id)
    const tDeg = getNodeDegree(t.id)
    const ratio = sDeg <= tDeg ? 0.34 : 0.66
    const badgeX = x1 + (x2 - x1) * ratio
    const badgeY = y1 + (y2 - y1) * ratio

    result.push({
      ...link,
      coords: { x1, y1, x2, y2, midX, midY, badgeX, badgeY }
    })
  }

  return result
})

const renderedNodes = computed(() => {
  const _ = tickCount.value
  return simNodes.value
})

function isSubnetDimmed(group) {
  if (props.activeGroups.length > 0) {
    return !props.activeGroups.includes(group)
  }
  if (!activeNodeId.value) return false
  const activeNode = simNodes.value.find(n => n.id === activeNodeId.value)
  return activeNode ? activeNode.group !== group : false
}

const hullLineGenerator = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5))

const subnetHulls = computed(() => {
  const _ = tickCount.value
  if (!props.showSubnets || simNodes.value.length === 0) return []

  const groupsMap = new Map()
  for (const node of simNodes.value) {
    if (!node.group || typeof node.x !== 'number' || typeof node.y !== 'number') continue
    if (!groupsMap.has(node.group)) {
      groupsMap.set(node.group, [])
    }
    groupsMap.get(node.group).push(node)
  }

  const hulls = []
  for (const [group, nodes] of groupsMap.entries()) {
    const padPoints = []
    let minY = Infinity
    let sumX = 0

    for (const n of nodes) {
      const r = getNodeRadius(n)
      const pad = r + 32
      const bottomPad = r + 44
      const steps = 8
      for (let i = 0; i < steps; i++) {
        const angle = (2 * Math.PI * i) / steps
        const px = n.x + Math.cos(angle) * pad
        const py = n.y + Math.sin(angle) * (Math.sin(angle) > 0 ? bottomPad : pad)
        padPoints.push([px, py])
        if (py < minY) minY = py
      }
      sumX += n.x
    }

    const polygon = d3.polygonHull(padPoints)
    if (!polygon) continue

    const path = hullLineGenerator(polygon)
    const labelX = sumX / nodes.length
    const labelY = minY - 6
    const subnetCidr = nodes.map(n => getNodeInfoValue(n, 'subnet')).find(Boolean)
    const hullLabel = subnetCidr
      ? `${group} · ${subnetCidr} (${nodes.length})`
      : `${group} (${nodes.length})`

    hulls.push({
      group,
      label: hullLabel,
      color: getNodeColor(group),
      path,
      labelX,
      labelY
    })
  }

  return hulls
})

function computeGroupAnchors(nodes, links, centerX, centerY) {
  const groupCounts = new Map()
  const groupMaxDegree = new Map()
  const nodeGroup = new Map()

  for (const n of nodes) {
    const g = n.group || '_default'
    nodeGroup.set(n.id, g)
    groupCounts.set(g, (groupCounts.get(g) || 0) + 1)
    const deg = getNodeDegree(n.id)
    groupMaxDegree.set(g, Math.max(groupMaxDegree.get(g) || 0, deg))
  }

  // Track primary hub neighbor for each group so connected groups sit next to each other
  const groupPrimaryHub = new Map()
  for (const l of links) {
    const sId = typeof l.source === 'object' ? l.source.id : l.source
    const tId = typeof l.target === 'object' ? l.target.id : l.target
    const sDeg = getNodeDegree(sId)
    const tDeg = getNodeDegree(tId)
    if (sDeg < tDeg) {
      const g = nodeGroup.get(sId)
      if (g && !groupPrimaryHub.has(g)) groupPrimaryHub.set(g, tId)
    } else if (tDeg < sDeg) {
      const g = nodeGroup.get(tId)
      if (g && !groupPrimaryHub.has(g)) groupPrimaryHub.set(g, sId)
    }
  }

  const anchors = new Map()
  const hubGroups = []
  const peripheralGroups = []

  for (const g of groupCounts.keys()) {
    if ((groupMaxDegree.get(g) || 0) >= 5) {
      hubGroups.push(g)
    } else {
      peripheralGroups.push(g)
    }
  }

  for (const g of hubGroups) {
    anchors.set(g, { x: centerX, y: centerY })
  }

  peripheralGroups.sort((a, b) => {
    const hubA = groupPrimaryHub.get(a) || ''
    const hubB = groupPrimaryHub.get(b) || ''
    if (hubA !== hubB) return hubA.localeCompare(hubB)
    return a.localeCompare(b)
  })

  const ringRadius = Math.max(660, peripheralGroups.length * 56)
  peripheralGroups.forEach((g, idx) => {
    const angle = (2 * Math.PI * idx) / Math.max(1, peripheralGroups.length) - Math.PI / 2
    anchors.set(g, {
      x: centerX + Math.cos(angle) * ringRadius,
      y: centerY + Math.sin(angle) * ringRadius
    })
  })

  return anchors
}

function createClusterForce(anchors, strength = 0.14) {
  let nodes = []
  function force(alpha) {
    const groupCounts = new Map()
    for (const n of nodes) {
      if (!n.group) continue
      groupCounts.set(n.group, (groupCounts.get(n.group) || 0) + 1)
    }

    const k = strength * alpha
    for (const n of nodes) {
      if (!n.group || n.pinned) continue
      const anchor = anchors.get(n.group)
      if (!anchor) continue
      const count = groupCounts.get(n.group) || 1
      const dx = anchor.x - n.x
      const dy = anchor.y - n.y
      const dist = Math.hypot(dx, dy) || 1
      const minRadius = count <= 1 ? 20 : Math.sqrt(count) * 75
      if (dist > minRadius) {
        const pull = ((dist - minRadius) / dist) * k
        n.vx += dx * pull
        n.vy += dy * pull
      }
    }
  }
  force.initialize = (initNodes) => {
    nodes = initNodes
  }
  return force
}

function createBoxCollisionForce(iterations = 4) {
  let nodes = []
  function force() {
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        const rA = getNodeRadius(a)
        const hwA = Math.max(rA + 18, calcTextWidth(a.label) / 2 + 16)
        const topA = rA + 14
        const botA = rA + 48

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const rB = getNodeRadius(b)
          const diffGroupGap = a.group !== b.group ? 24 : 0
          const hwB = Math.max(rB + 18, calcTextWidth(b.label) / 2 + 16) + diffGroupGap
          const topB = rB + 14 + diffGroupGap
          const botB = rB + 48 + diffGroupGap

          const dx = b.x - a.x
          const overlapX = hwA + hwB - Math.abs(dx)
          if (overlapX <= 0) continue

          // Asymmetric vertical bounds because labels sit below each node circle
          const overlapY = dx >= 0
            ? Math.min(a.y + botA - (b.y - topB), b.y + botB - (a.y - topA))
            : Math.min(a.y + botA - (b.y - topB), b.y + botB - (a.y - topA))
          if (overlapY <= 0) continue

          if (overlapX < overlapY) {
            const push = (overlapX / 2) * (dx >= 0 ? 1 : -1)
            if (!a.pinned) a.x -= push
            if (!b.pinned) b.x += push
          } else {
            const dy = b.y - a.y
            const push = (overlapY / 2) * (dy >= 0 ? 1 : -1)
            if (!a.pinned) a.y -= push
            if (!b.pinned) b.y += push
          }
        }
      }
    }
  }
  force.initialize = (initNodes) => {
    nodes = initNodes
  }
  return force
}

function createGroupSeparationForce(iterations = 2, gap = 24) {
  let nodes = []
  function force() {
    for (let iter = 0; iter < iterations; iter++) {
      const groups = new Map()
      for (const n of nodes) {
        if (!n.group || typeof n.x !== 'number' || typeof n.y !== 'number') continue
        const r = getNodeRadius(n)
        const pad = r + 32
        const bottomPad = r + 44
        let g = groups.get(n.group)
        if (!g) {
          g = {
            name: n.group,
            nodes: [],
            minX: Infinity,
            maxX: -Infinity,
            minY: Infinity,
            maxY: -Infinity,
            sumX: 0
          }
          groups.set(n.group, g)
        }
        g.nodes.push(n)
        g.sumX += n.x
        if (n.x - pad < g.minX) g.minX = n.x - pad
        if (n.x + pad > g.maxX) g.maxX = n.x + pad
        if (n.y - pad - 28 < g.minY) g.minY = n.y - pad - 28
        if (n.y + bottomPad > g.maxY) g.maxY = n.y + bottomPad
      }

      const list = Array.from(groups.values())
      for (const g of list) {
        const labelHalfW = calcTextWidth(`${g.name} (${g.nodes.length})`) / 2 + 24
        const cx = g.sumX / g.nodes.length
        if (cx - labelHalfW < g.minX) g.minX = cx - labelHalfW
        if (cx + labelHalfW > g.maxX) g.maxX = cx + labelHalfW
      }

      for (let i = 0; i < list.length; i++) {
        const a = list[i]
        const aCx = (a.minX + a.maxX) / 2
        const aCy = (a.minY + a.maxY) / 2
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j]
          const bCx = (b.minX + b.maxX) / 2
          const bCy = (b.minY + b.maxY) / 2

          const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) + gap
          if (overlapX <= 0) continue
          const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) + gap
          if (overlapY <= 0) continue

          if (overlapX < overlapY) {
            const dir = bCx >= aCx ? 1 : -1
            const push = overlapX * 0.5 * dir
            for (const n of a.nodes) if (!n.pinned) n.x -= push
            for (const n of b.nodes) if (!n.pinned) n.x += push
          } else {
            const dir = bCy >= aCy ? 1 : -1
            const push = overlapY * 0.5 * dir
            for (const n of a.nodes) if (!n.pinned) n.y -= push
            for (const n of b.nodes) if (!n.pinned) n.y += push
          }
        }
      }
    }
  }
  force.initialize = (initNodes) => {
    nodes = initNodes
  }
  return force
}

function getLinkDistance(link) {
  const sR = getNodeRadius(link.source)
  const tR = getNodeRadius(link.target)
  const sameGroup = link.source?.group && link.source.group === link.target?.group
  return Math.max(sameGroup ? 200 : 290, (sameGroup ? 190 : 270) + sR + tR)
}

let currentAnchors = new Map()

// D3 Force Simulation Setup
function initSimulation() {
  if (!props.data || !props.data.nodes) return

  const container = containerRef.value
  const width = container ? container.clientWidth : 1000
  const height = container ? container.clientHeight : 700
  const centerX = width / 2
  const centerY = height / 2

  currentAnchors = computeGroupAnchors(props.data.nodes, props.data.links || [], centerX, centerY)

  // Preserve previous positions if re-initializing
  const prevMap = new Map()
  simNodes.value.forEach(n => {
    prevMap.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy, fx: n.fx, fy: n.fy, pinned: n.pinned })
  })

  // Track index within group for clean initial spiral placement
  const groupSeenCount = new Map()

  simNodes.value = props.data.nodes.map(n => {
    const prev = prevMap.get(n.id)
    const anchor = currentAnchors.get(n.group) || { x: centerX, y: centerY }
    const gIdx = groupSeenCount.get(n.group) || 0
    groupSeenCount.set(n.group, gIdx + 1)
    const angle = gIdx * 2.39996 // golden angle spiral
    const spread = 45 + Math.sqrt(gIdx) * 55

    return {
      ...n,
      x: prev ? prev.x : anchor.x + Math.cos(angle) * spread,
      y: prev ? prev.y : anchor.y + Math.sin(angle) * spread,
      vx: prev ? prev.vx : 0,
      vy: prev ? prev.vy : 0,
      fx: prev && prev.pinned ? prev.fx : null,
      fy: prev && prev.pinned ? prev.fy : null,
      pinned: prev ? prev.pinned : false
    }
  })

  simLinks.value = props.data.links.map(l => ({ ...l }))

  if (simulation) {
    simulation.stop()
  }

  simulation = d3.forceSimulation(simNodes.value)
    .force(
      'link',
      d3.forceLink(simLinks.value)
        .id(d => d.id)
        .distance(getLinkDistance)
        .strength(0.55)
    )
    .force('charge', d3.forceManyBody().strength(-900))
    .force('center', d3.forceCenter(centerX, centerY).strength(0.04))
    .force('boxCollide', createBoxCollisionForce(4))
    .force('groupSeparate', props.showSubnets ? createGroupSeparationForce(2, 24) : null)
    .force('cluster', props.showSubnets ? createClusterForce(currentAnchors, 0.16) : null)
    .on('tick', () => {
      tickCount.value++
    })

  // Pre-settle initial outward sector layout synchronously, then release anchor/center pull
  // so nodes expand freely outward and never snap back to their initial positions
  simulation.tick(240)
  simulation.force('cluster', null)
  simulation.force('center', null)
  simulation.force('link')?.strength(0.25)
  simulation.alpha(0.05)
  tickCount.value++

  if (!props.isSimulationRunning) {
    simulation.stop()
  }

  requestAnimationFrame(() => fitGraph(false))
}

// D3 Zoom Setup
function setupZoom() {
  if (!svgRef.value) return

  zoomBehavior = d3.zoom()
    .scaleExtent([0.15, 4])
    .filter(event => {
      return !event.target.closest('.node-group') || event.type === 'wheel'
    })
    .on('zoom', event => {
      zoomTransform.value = event.transform
    })

  d3.select(svgRef.value)
    .call(zoomBehavior)
    .on('dblclick.zoom', null)
}

// Drag Behavior
let dragActive = false
let draggedNode = null

function startDrag(node, event) {
  dragActive = true
  draggedNode = node

  if (simulation && props.isSimulationRunning) {
    simulation.alphaTarget(0.3).restart()
  }

  node.fx = node.x
  node.fy = node.y

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event) {
  if (!dragActive || !draggedNode || !svgRef.value) return

  const rect = svgRef.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const k = zoomTransform.value.k || 1
  const x = (mouseX - zoomTransform.value.x) / k
  const y = (mouseY - zoomTransform.value.y) / k

  draggedNode.fx = x
  draggedNode.fy = y
}

function onPointerUp() {
  if (!dragActive) return
  dragActive = false

  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)

  if (draggedNode) {
    // Keep the dragged node where the user placed it instead of snapping back
    draggedNode.fx = draggedNode.x
    draggedNode.fy = draggedNode.y
    draggedNode.pinned = true
    draggedNode = null
  }

  if (simulation && props.isSimulationRunning) {
    simulation.alphaTarget(0)
  }
}

function selectNode(node) {
  emit('select-node', node)
}

function onSvgClick(event) {
  if (!event.target.closest('.node-group')) {
    emit('select-node', null)
  }
}

function onNodeHover(nodeId) {
  hoveredNodeId.value = nodeId
}

function onNodeLeave() {
  hoveredNodeId.value = null
}

function zoomIn() {
  if (!svgRef.value || !zoomBehavior) return
  d3.select(svgRef.value)
    .transition()
    .duration(300)
    .call(zoomBehavior.scaleBy, 1.3)
}

function zoomOut() {
  if (!svgRef.value || !zoomBehavior) return
  d3.select(svgRef.value)
    .transition()
    .duration(300)
    .call(zoomBehavior.scaleBy, 1 / 1.3)
}

function resetZoom() {
  if (!svgRef.value || !zoomBehavior) return
  d3.select(svgRef.value)
    .transition()
    .duration(400)
    .call(zoomBehavior.transform, d3.zoomIdentity)
}

function fitGraph(animate = true) {
  if (!svgRef.value || !zoomBehavior || simNodes.value.length === 0) return

  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  if (!width || !height) return

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  simNodes.value.forEach(n => {
    const r = getNodeRadius(n)
    const hw = Math.max(r + 36, calcTextWidth(n.label) / 2 + 24)
    if (n.x - hw < minX) minX = n.x - hw
    if (n.x + hw > maxX) maxX = n.x + hw
    if (n.y - (r + 56) < minY) minY = n.y - (r + 56)
    if (n.y + (r + 56) > maxY) maxY = n.y + (r + 56)
  })

  const padding = 60
  const graphWidth = maxX - minX + padding * 2
  const graphHeight = maxY - minY + padding * 2

  const scale = Math.min(Math.max(0.18, Math.min(width / graphWidth, height / graphHeight)), 1.35)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const transform = d3.zoomIdentity
    .translate(width / 2 - centerX * scale, height / 2 - centerY * scale)
    .scale(scale)

  const sel = d3.select(svgRef.value)
  if (animate) {
    sel.transition().duration(600).call(zoomBehavior.transform, transform)
  } else {
    sel.call(zoomBehavior.transform, transform)
  }
}

function centerOnNode(nodeId) {
  const node = simNodes.value.find(n => n.id === nodeId)
  if (!node || !svgRef.value || !zoomBehavior) return

  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  const currentScale = zoomTransform.value.k || 1
  const targetScale = Math.max(currentScale, 1.2)

  const transform = d3.zoomIdentity
    .translate(width / 2 - node.x * targetScale, height / 2 - node.y * targetScale)
    .scale(targetScale)

  d3.select(svgRef.value)
    .transition()
    .duration(500)
    .call(zoomBehavior.transform, transform)
}

function togglePinNode(nodeId) {
  const node = simNodes.value.find(n => n.id === nodeId)
  if (!node) return
  node.pinned = !node.pinned
  if (node.pinned) {
    node.fx = node.x
    node.fy = node.y
  } else {
    node.fx = null
    node.fy = null
  }
}

function reheat() {
  if (simulation) {
    simulation.alpha(0.6).restart()
  }
}

// Watchers
watch(() => props.data, () => {
  initSimulation()
  setTimeout(fitGraph, 100)
}, { deep: true })

watch(() => props.isSimulationRunning, (running) => {
  if (!simulation) return
  if (running) {
    simulation.alpha(0.3).restart()
  } else {
    simulation.stop()
  }
})

watch(() => props.showSubnets, (enabled) => {
  if (!simulation) return
  simulation.force('groupSeparate', enabled ? createGroupSeparationForce(2, 24) : null)
  if (enabled && props.isSimulationRunning) {
    simulation.alpha(0.25).restart()
  }
})

// Update physics forces when sizing option changes
watch(() => [props.sizeByConnections, props.scaleFactor], () => {
  if (simulation) {
    simulation.force('boxCollide', createBoxCollisionForce(4))
    simulation.force(
      'link',
      d3.forceLink(simLinks.value)
        .id(d => d.id)
        .distance(getLinkDistance)
        .strength(0.25)
    )
    simulation.alpha(0.25).restart()
  }
})

function unpinAllNodes() {
  for (const node of simNodes.value) {
    node.pinned = false
    node.fx = null
    node.fy = null
  }
  tickCount.value++
  if (simulation && props.isSimulationRunning) {
    simulation.alpha(0.3).restart()
  }
}

let resizeObserver = null

onMounted(() => {
  setupZoom()
  initSimulation()

  resizeObserver = new ResizeObserver(() => {
    if (simulation && containerRef.value) {
      simulation.alpha(0.08).restart()
    }
  })

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (simulation) simulation.stop()
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})

defineExpose({
  zoomIn,
  zoomOut,
  resetZoom,
  fitGraph,
  centerOnNode,
  togglePinNode,
  unpinAllNodes,
  reheat,
  getNodeDegree,
  getNodeRadius
})
</script>

<style scoped>
.network-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%);
  user-select: none;
}

.graph-svg {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
}

.graph-svg:active {
  cursor: grabbing;
}

/* Subnets / Group Hulls */
.subnets-layer {
  pointer-events: none;
}

.subnet-group {
  transition: opacity 0.25s ease;
}

.subnet--dimmed {
  opacity: 0.12;
}

.subnet-hull {
  fill-opacity: 0.08;
  stroke-width: 1.6;
  stroke-opacity: 0.45;
  stroke-dasharray: 6 4;
}

.subnet-label-bg {
  fill: rgba(15, 23, 42, 0.9);
  stroke-width: 1.2;
  stroke-opacity: 0.7;
}

.subnet-label-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  fill: #e2e8f0;
  letter-spacing: 0.3px;
}

/* Links */
.link-line {
  stroke: #475569;
  stroke-width: 1.8;
  stroke-dasharray: none;
  transition: stroke 0.25s ease, stroke-width 0.25s ease, opacity 0.25s ease;
}

.link--highlighted .link-line {
  stroke: #818cf8;
  stroke-width: 2.8;
}

.link--dimmed {
  opacity: 0.12;
}

/* Relation Badge */
.relation-badge {
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.relation-badge-bg {
  fill: #1e293b;
  stroke: rgba(148, 163, 184, 0.25);
  stroke-width: 1;
}

.link--highlighted .relation-badge-bg {
  stroke: #818cf8;
  fill: #312e81;
}

.relation-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  fill: #cbd5e1;
}

.link--highlighted .relation-text {
  fill: #ffffff;
  font-weight: 600;
}

/* Nodes */
.node-group {
  cursor: pointer;
  transition: opacity 0.25s ease;
}

.node-circle {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), stroke-width 0.2s ease, filter 0.2s ease;
  stroke-width: 2.5;
}

.node-group:hover .node-circle {
  transform: scale(1.08);
  stroke-width: 3.5;
}

.node-halo {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.node-group:hover .node-halo {
  opacity: 1;
}

.node-pulse-ring {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 2.5;
  stroke-dasharray: 4 3;
  animation: pulse-ring 3s linear infinite;
}

@keyframes pulse-ring {
  0% {
    stroke-dashoffset: 0;
    transform: rotate(0deg);
  }

  100% {
    stroke-dashoffset: 28;
    transform: rotate(360deg);
  }
}

.node--selected .node-circle {
  stroke-width: 4;
  filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.7));
}

.node--dimmed {
  opacity: 0.15;
}

.node-icon {
  font-weight: 700;
  fill: #ffffff;
  pointer-events: none;
  user-select: none;
}

/* Degree badge */
.degree-badge {
  pointer-events: none;
}

.degree-badge-bg {
  fill: #0f172a;
  stroke: #38bdf8;
  stroke-width: 1.5;
}

.degree-badge-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5px;
  font-weight: 700;
  fill: #38bdf8;
}

/* Labels */
.node-label-group {
  pointer-events: none;
}

.node-label-bg {
  fill: rgba(15, 23, 42, 0.85);
  stroke: rgba(148, 163, 184, 0.25);
  stroke-width: 1;
  backdrop-filter: blur(4px);
}

.node-label-text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  fill: #f8fafc;
  pointer-events: none;
}

.node--selected .node-label-bg {
  fill: rgba(56, 189, 248, 0.2);
  stroke: #38bdf8;
}

.node--selected .node-label-text {
  fill: #ffffff;
  font-weight: 700;
}

.node-sublabel {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  fill: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  pointer-events: none;
}

/* Canvas Hints */
.canvas-hints {
  position: absolute;
  bottom: 16px;
  left: 20px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid var(--border-color);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 11px;
  color: var(--text-muted);
  backdrop-filter: blur(8px);
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

.size-hint {
  color: #38bdf8;
  font-weight: 500;
}
</style>
