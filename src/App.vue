<template>
  <div class="app-layout">
    <!-- TOP HEADER -->
    <header class="app-header">
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3" stroke="#38bdf8" fill="rgba(56, 189, 248, 0.2)" />
            <circle cx="6" cy="12" r="3" stroke="#a855f7" fill="rgba(168, 85, 247, 0.2)" />
            <circle cx="18" cy="19" r="3" stroke="#10b981" fill="rgba(16, 185, 129, 0.2)" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="#64748b" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="#64748b" />
          </svg>
        </div>
        <div>
          <h1 class="brand-title">Visualizzatore di Reti a Nodi</h1>
          <p class="brand-sub">Vue 3 + D3.js · Approccio Ibrido</p>
        </div>
      </div>

      <!-- Dataset Selector -->
      <div class="dataset-picker">
        <label class="picker-label">Grafo:</label>
        <select v-model="selectedDataset" @change="onDatasetChange" class="dataset-select">
          <option value="/rete_interna.json">Rete Interna (rete_interna.json)</option>
          <option value="/graphData.json">Infrastruttura Web (data.json)</option>
        </select>
      </div>

      <!-- Search Input -->
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cerca nodo, servizio, id..."
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''" title="Cancella ricerca">✕</button>
      </div>

      <!-- Quick Metrics & Actions -->
      <div class="header-actions">
        <div class="stat-badge" title="Elementi presenti nel grafo">
          <span class="stat-num">{{ graphData.nodes?.length || 0 }}</span> nodi
          <span class="stat-divider">·</span>
          <span class="stat-num">{{ graphData.links?.length || 0 }}</span> archi
        </div>

        <button class="action-btn" @click="fetchData(selectedDataset)" :disabled="loading" title="Ricarica file JSON">
          <svg class="btn-icon" :class="{ 'spin': loading }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          <span>Ricarica</span>
        </button>

        <label class="action-btn upload-btn" title="Carica un file JSON personalizzato">
          <input type="file" accept=".json" @change="onCustomJsonUpload" style="display:none;" />
          <svg class="btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Carica JSON</span>
        </label>
      </div>
    </header>

    <!-- MAIN GRAPH AREA -->
    <main class="canvas-area">
      <!-- LEFT GROUPS SIDEBAR -->
      <aside class="groups-sidebar">
        <div class="sidebar-header">
          <span class="filters-label">Gruppi / Sottoreti</span>
          <span class="sidebar-total">{{ availableGroups.length }}</span>
        </div>

        <div class="sidebar-list">
          <button
            class="group-pill"
            :class="{ 'active': selectedGroups.length === 0 }"
            @click="selectedGroups = []"
          >
            <span class="group-pill-left">
              <span class="group-dot group-dot--all"></span>
              <span class="group-name">Tutti</span>
            </span>
            <span class="group-count">{{ graphData.nodes?.length || 0 }}</span>
          </button>

          <button
            v-for="grp in availableGroups"
            :key="grp"
            class="group-pill"
            :class="{ 'active': selectedGroups.includes(grp) }"
            @click="toggleGroupFilter(grp)"
          >
            <span class="group-pill-left">
              <span class="group-dot" :style="{ backgroundColor: getGroupColor(grp) }"></span>
              <span class="group-name">{{ grp }}</span>
            </span>
            <span class="group-count">{{ getGroupCount(grp) }}</span>
          </button>
        </div>
      </aside>

      <!-- GRAPH STAGE -->
      <div class="graph-stage">
        <!-- Loading / Error overlay -->
        <div v-if="loading" class="overlay-state">
          <div class="spinner"></div>
          <p>Caricamento dati in corso...</p>
        </div>
        <div v-else-if="errorMessage" class="overlay-state error">
          <p>⚠️ {{ errorMessage }}</p>
          <button class="action-btn" @click="fetchData(selectedDataset)">Riprova</button>
        </div>

        <!-- The D3 + Vue Hybrid Graph Component -->
        <NetworkGraph
          v-if="graphData.nodes?.length"
          ref="graphRef"
          :data="graphData"
          :selected-node-id="selectedNode?.id || null"
          :active-groups="selectedGroups"
          :search-query="searchQuery"
          :show-labels="showLabels"
          :show-subnets="showSubnets"
          :is-simulation-running="isPhysicsRunning"
          :size-by-connections="sizeByConnections"
          @select-node="handleSelectNode"
        />

        <!-- FLOATING TOOLBAR (ZOOM & CONTROLS) -->
        <div class="controls-toolbar">
        <!-- Size by Connections Toggle -->
        <button
          class="tool-btn"
          :class="{ 'tool-btn--active': sizeByConnections }"
          @click="sizeByConnections = !sizeByConnections"
          :title="sizeByConnections ? 'Dimensioni nodi in base alle connessioni: ATTIVO' : 'Dimensioni uniformi fisse: ATTIVO'"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="6" cy="18" r="3"/>
            <circle cx="16" cy="9" r="6"/>
            <line x1="8.5" y1="16" x2="11.5" y2="13.5"/>
          </svg>
        </button>

        <div class="toolbar-divider"></div>

        <button class="tool-btn" @click="graphRef?.zoomIn()" title="Ingrandisci (Zoom In)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>

        <button class="tool-btn" @click="graphRef?.zoomOut()" title="Rimpicciolisci (Zoom Out)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>

        <button class="tool-btn" @click="graphRef?.fitGraph()" title="Adatta e centra la vista">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        </button>

        <button class="tool-btn" @click="graphRef?.resetZoom()" title="Ripristina scala 1:1">
          <span style="font-size: 11px; font-weight: 700;">1:1</span>
        </button>

        <div class="toolbar-divider"></div>

        <button
          class="tool-btn"
          :class="{ 'tool-btn--active': isPhysicsRunning }"
          @click="isPhysicsRunning = !isPhysicsRunning"
          :title="isPhysicsRunning ? 'Pausa fisica del grafo' : 'Attiva fisica del grafo'"
        >
          <svg v-if="isPhysicsRunning" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>

        <button class="tool-btn" @click="graphRef?.reheat()" title="Riscalda / Rimescola simulazione">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </button>

        <button class="tool-btn" @click="unlockAllNodes" title="Sblocca posizione fissa di tutti i nodi">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
          </svg>
        </button>

        <button
          class="tool-btn"
          :class="{ 'tool-btn--active': showLabels }"
          @click="showLabels = !showLabels"
          title="Mostra / nascondi etichette delle relazioni"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        </button>

        <button
          class="tool-btn"
          :class="{ 'tool-btn--active': showSubnets }"
          @click="showSubnets = !showSubnets"
          title="Raggruppa e mostra aree delle sottoreti"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="4" stroke-dasharray="4 3"/>
            <circle cx="9" cy="10" r="2"/>
            <circle cx="15" cy="14" r="2"/>
          </svg>
        </button>
      </div>

      <!-- RIGHT DETAILS DRAWER -->
      <transition name="slide-panel">
        <aside v-if="selectedNode" class="details-drawer">
          <!-- Drawer Header -->
          <div class="drawer-header">
            <div class="drawer-title-group">
              <span class="drawer-badge" :style="{ backgroundColor: getGroupColor(selectedNode.group) }">
                {{ selectedNode.group }}
              </span>
              <h2 class="drawer-title">{{ selectedNode.label }}</h2>
              <code class="drawer-id">id: {{ selectedNode.id }}</code>
            </div>
            <button class="drawer-close" @click="selectedNode = null" title="Chiudi pannello">✕</button>
          </div>

          <!-- Drawer Body -->
          <div class="drawer-content">
            <!-- Connection Degree Metric Card -->
            <div class="metrics-card">
              <div class="metric-item main-metric">
                <span class="metric-val">{{ totalSelectedNodeConnections }}</span>
                <span class="metric-lbl">Connessioni Totali</span>
              </div>
              <div class="metric-sub">
                <div class="metric-pill in">
                  <span>↓ {{ incomingLinks.length }}</span>
                  <small>Entrata</small>
                </div>
                <div class="metric-pill out">
                  <span>↑ {{ outgoingLinks.length }}</span>
                  <small>Uscita</small>
                </div>
              </div>
            </div>

            <!-- Structured Network / Hardware Details -->
            <div v-if="selectedNodeSpecs.length" class="detail-section">
              <label class="section-title">Dettagli Rete &amp; Cablaggio</label>
              <div class="specs-grid">
                <div v-for="spec in selectedNodeSpecs" :key="spec.label" class="spec-item">
                  <span class="spec-label">{{ spec.label }}</span>
                  <span class="spec-value" :class="{ 'spec-value--mono': spec.mono }">{{ spec.value }}</span>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="detail-section">
              <label class="section-title">Descrizione</label>
              <p class="description-text">
                {{ selectedNode.description || 'Nessuna descrizione specificata per questo componente.' }}
              </p>
            </div>

            <!-- Actions on Selected Node -->
            <div class="detail-section button-grid">
              <button
                class="node-action-btn"
                @click="graphRef?.centerOnNode(selectedNode.id)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Centra vista
              </button>

              <button
                class="node-action-btn"
                :class="{ 'node-action-btn--active': isSelectedNodePinned }"
                @click="togglePinSelected"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="17" x2="12" y2="22"/>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
                </svg>
                {{ isSelectedNodePinned ? 'Sblocca posizione' : 'Fissa posizione' }}
              </button>
            </div>

            <!-- Connected Incoming Links -->
            <div class="detail-section">
              <label class="section-title">
                Connessioni in Entrata ({{ incomingLinks.length }})
              </label>
              <div v-if="incomingLinks.length === 0" class="empty-hint">Nessun collegamento in entrata</div>
              <ul v-else class="connections-list">
                <li
                  v-for="link in incomingLinks"
                  :key="`${getLinkIdStr(link.source)}->${selectedNode.id}`"
                  class="connection-item"
                  @click="jumpToNode(getLinkIdStr(link.source))"
                >
                  <span class="direction-arrow incoming">←</span>
                  <div class="conn-info">
                    <span class="conn-name">{{ getNodeLabel(getLinkIdStr(link.source)) }}</span>
                    <span class="conn-relation">{{ link.relation || 'connesso' }}</span>
                  </div>
                  <span class="jump-icon">↗</span>
                </li>
              </ul>
            </div>

            <!-- Connected Outgoing Links -->
            <div class="detail-section">
              <label class="section-title">
                Connessioni in Uscita ({{ outgoingLinks.length }})
              </label>
              <div v-if="outgoingLinks.length === 0" class="empty-hint">Nessun collegamento in uscita</div>
              <ul v-else class="connections-list">
                <li
                  v-for="link in outgoingLinks"
                  :key="`${selectedNode.id}->${getLinkIdStr(link.target)}`"
                  class="connection-item"
                  @click="jumpToNode(getLinkIdStr(link.target))"
                >
                  <span class="direction-arrow outgoing">→</span>
                  <div class="conn-info">
                    <span class="conn-name">{{ getNodeLabel(getLinkIdStr(link.target)) }}</span>
                    <span class="conn-relation">{{ link.relation || 'connesso' }}</span>
                  </div>
                  <span class="jump-icon">↗</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </transition>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NetworkGraph from './components/NetworkGraph.vue'
import { getGroupColor } from './utils/groupColors'

const FALLBACK_DATA = {
  nodes: [
    { id: "proxy", label: "Reverse Proxy", group: "infra", description: "Gestisce il traffico HTTPS e il routing verso i servizi interni." },
    { id: "api", label: "Core API", group: "backend", description: "Servizio principale REST/JSON." },
    { id: "worker", label: "Worker", group: "backend", description: "Elabora task asincroni in background." },
    { id: "db", label: "Database", group: "infra", description: "Archivio relazionale persistente." },
    { id: "docs", label: "Documentazione", group: "docs", description: "Specifiche tecniche e runbook operativi." }
  ],
  links: [
    { source: "proxy", target: "api", relation: "HTTPS" },
    { source: "api", target: "db", relation: "SQL" },
    { source: "api", target: "worker", relation: "Queue" },
    { source: "worker", target: "db", relation: "Write" },
    { source: "docs", target: "api", relation: "Documenta" }
  ]
}

const graphRef = ref(null)
const graphData = ref({ nodes: [], links: [] })
const loading = ref(false)
const errorMessage = ref(null)

const selectedDataset = ref('/rete_interna.json')
const selectedNode = ref(null)
const searchQuery = ref('')
const selectedGroups = ref([])
const showLabels = ref(true)
const showSubnets = ref(true)
const isPhysicsRunning = ref(true)
const sizeByConnections = ref(true)

const availableGroups = computed(() => {
  if (!graphData.value.nodes) return []
  const set = new Set()
  graphData.value.nodes.forEach(n => {
    if (n.group) set.add(n.group)
  })
  return Array.from(set)
})

function getGroupCount(grp) {
  return graphData.value.nodes?.filter(n => n.group === grp).length || 0
}

function toggleGroupFilter(grp) {
  const idx = selectedGroups.value.indexOf(grp)
  if (idx >= 0) {
    selectedGroups.value.splice(idx, 1)
  } else {
    selectedGroups.value.push(grp)
  }
}

async function fetchData(url = selectedDataset.value) {
  loading.value = true
  errorMessage.value = null
  selectedNode.value = null
  selectedGroups.value = []
  try {
    let res = await fetch(url)
    if (!res.ok && url === '/rete_interna.json') {
      res = await fetch('/graphData.json')
    }
    if (!res.ok) {
      res = await fetch('/data.json')
    }
    if (!res.ok) {
      throw new Error(`Impossibile caricare il file JSON (${res.status})`)
    }
    const data = await res.json()
    graphData.value = data
  } catch (err) {
    console.warn('Fetch fallito, uso dati di default:', err)
    graphData.value = JSON.parse(JSON.stringify(FALLBACK_DATA))
  } finally {
    loading.value = false
  }
}

function onDatasetChange() {
  fetchData(selectedDataset.value)
}

function onCustomJsonUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result)
      if (!parsed.nodes || !parsed.links) {
        alert('Il file JSON deve contenere le chiavi "nodes" e "links"')
        return
      }
      graphData.value = parsed
      selectedNode.value = null
      selectedGroups.value = []
    } catch (err) {
      alert('File JSON non valido: ' + err.message)
    }
  }
  reader.readAsText(file)
}

function handleSelectNode(node) {
  selectedNode.value = node
}

function getLinkIdStr(endpoint) {
  return typeof endpoint === 'object' ? endpoint.id : endpoint
}

function getNodeLabel(nodeId) {
  const n = graphData.value.nodes?.find(item => item.id === nodeId)
  return n ? n.label : nodeId
}

const incomingLinks = computed(() => {
  if (!selectedNode.value || !graphData.value.links) return []
  return graphData.value.links.filter(l => getLinkIdStr(l.target) === selectedNode.value.id)
})

const outgoingLinks = computed(() => {
  if (!selectedNode.value || !graphData.value.links) return []
  return graphData.value.links.filter(l => getLinkIdStr(l.source) === selectedNode.value.id)
})

const totalSelectedNodeConnections = computed(() => {
  return incomingLinks.value.length + outgoingLinks.value.length
})

const isSelectedNodePinned = computed(() => {
  return !!selectedNode.value?.pinned
})

const KNOWN_SPEC_META = {
  ip: { label: 'IP', mono: true, order: 1 },
  subnet: { label: 'Subnet', mono: true, order: 2 },
  vlan: { label: 'VLAN', mono: true, order: 3 },
  vlanTag: { label: 'VLAN Tag', mono: true, order: 4 },
  lan: { label: 'LAN', mono: true, order: 5 },
  ufficio: { label: 'Ufficio', mono: false, order: 6 },
  switch: { label: 'Switch', mono: true, order: 7 },
  porta: { label: 'Porta', mono: true, order: 8 },
  patch: { label: 'Patch', mono: true, order: 9 },
  cavo: { label: 'Cavo', mono: false, order: 10 }
}

const EXCLUDED_SPEC_KEYS = new Set([
  'id', 'label', 'group', 'description', 'info',
  'index', 'x', 'y', 'vx', 'vy', 'fx', 'fy', 'pinned'
])

const selectedNodeSpecs = computed(() => {
  const n = selectedNode.value
  if (!n) return []
  const rawNode = graphData.value.nodes?.find(item => item.id === n.id) || n

  const entries = Object.entries(rawNode)
    .filter(([key, val]) => !EXCLUDED_SPEC_KEYS.has(key) && val !== undefined && val !== null)

  if (Array.isArray(rawNode.info)) {
    for (const item of rawNode.info) {
      if (item && typeof item === 'object') {
        for (const [k, v] of Object.entries(item)) {
          if (v !== undefined && v !== null) entries.push([k, v])
        }
      }
    }
  }

  return entries
    .sort(([a], [b]) => {
      const orderA = KNOWN_SPEC_META[a]?.order ?? 999
      const orderB = KNOWN_SPEC_META[b]?.order ?? 999
      return orderA !== orderB ? orderA - orderB : a.localeCompare(b)
    })
    .map(([key, val]) => {
      const meta = KNOWN_SPEC_META[key]
      const formattedVal = typeof val === 'object'
        ? JSON.stringify(val)
        : (String(val).trim() === '' ? '—' : String(val))
      return {
        key,
        label: meta?.label || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
        value: formattedVal,
        mono: meta?.mono ?? (typeof val === 'number' || /^[\d./:a-fA-F-]+$/.test(formattedVal))
      }
    })
})

function togglePinSelected() {
  if (!selectedNode.value || !graphRef.value) return
  graphRef.value.togglePinNode(selectedNode.value.id)
}

function unlockAllNodes() {
  graphRef.value?.unpinAllNodes()
  if (selectedNode.value) {
    selectedNode.value.pinned = false
  }
}

function jumpToNode(nodeId) {
  const n = graphData.value.nodes?.find(item => item.id === nodeId)
  if (n) {
    selectedNode.value = n
    graphRef.value?.centerOnNode(nodeId)
  }
}

onMounted(() => {
  fetchData(selectedDataset.value)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

/* HEADER */
.app-header {
  height: 64px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  gap: 16px;
  z-index: 10;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: #ffffff;
}

.brand-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

/* DATASET SELECTOR */
.dataset-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 4px 10px;
  border-radius: 8px;
}

.picker-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
}

.dataset-select {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}

.dataset-select option {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* SEARCH */
.search-box {
  position: relative;
  width: 280px;
  max-width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 32px 8px 36px;
  font-size: 13px;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: var(--accent-light);
  box-shadow: 0 0 0 3px var(--accent-glow);
  outline: none;
}

.clear-search {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 12px;
}

.clear-search:hover {
  color: var(--text-primary);
}

/* ACTIONS */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-badge {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-num {
  font-weight: 700;
  color: #ffffff;
}

.stat-divider {
  margin: 0 4px;
  color: var(--text-muted);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
}

.upload-btn {
  cursor: pointer;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* MAIN CANVAS */
.canvas-area {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.graph-stage {
  flex: 1;
  position: relative;
  overflow: hidden;
  height: 100%;
}

.overlay-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.9);
  z-index: 20;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--accent-light);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* FLOATING CONTROLS TOOLBAR */
.controls-toolbar {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  padding: 6px;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  z-index: 15;
}

.tool-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: var(--bg-secondary);
  color: #ffffff;
}

.tool-btn--active {
  background: var(--accent);
  color: #ffffff;
}

.tool-btn--active:hover {
  background: var(--accent-light);
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 4px;
}

/* LEFT GROUPS SIDEBAR */
.groups-sidebar {
  width: 230px;
  flex-shrink: 0;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(12px);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  gap: 12px;
  z-index: 10;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.sidebar-total {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filters-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.group-pill {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid transparent;
  transition: all 0.2s ease;
  text-align: left;
}

.group-pill-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.group-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-pill:hover {
  background: var(--bg-tertiary);
  color: #ffffff;
}

.group-pill.active {
  background: rgba(99, 102, 241, 0.2);
  color: #ffffff;
  border-color: rgba(99, 102, 241, 0.5);
}

.group-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.group-dot--all {
  background: linear-gradient(135deg, #38bdf8, #a855f7);
}

.group-count {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  flex-shrink: 0;
}

/* DETAILS DRAWER */
.details-drawer {
  position: absolute;
  top: 16px;
  right: 16px;
  bottom: 16px;
  width: 360px;
  max-width: calc(100vw - 32px);
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  z-index: 20;
  overflow: hidden;
}

.drawer-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.drawer-title-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-badge {
  display: inline-block;
  align-self: flex-start;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #0f172a;
  letter-spacing: 0.5px;
}

.drawer-title {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
}

.drawer-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
}

.drawer-close {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 14px;
}

.drawer-close:hover {
  background: var(--bg-tertiary);
  color: #ffffff;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.spec-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.spec-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-muted);
}

.spec-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-word;
}

.spec-value--mono {
  font-family: 'JetBrains Mono', monospace;
}

/* METRICS CARD */
.metrics-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(56, 189, 248, 0.08));
  border: 1px solid rgba(99, 102, 241, 0.25);
  padding: 12px 16px;
  border-radius: 12px;
}

.main-metric {
  display: flex;
  flex-direction: column;
}

.metric-val {
  font-size: 26px;
  font-weight: 800;
  color: #38bdf8;
  line-height: 1.1;
}

.metric-lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-sub {
  display: flex;
  gap: 8px;
}

.metric-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 13px;
}

.metric-pill small {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.metric-pill.in {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.metric-pill.out {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.description-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.button-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.node-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.node-action-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
}

.node-action-btn--active {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
  color: #38bdf8;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
  padding: 8px 0;
}

.connections-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.connection-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.connection-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-light);
  transform: translateX(2px);
}

.direction-arrow {
  font-size: 14px;
  font-weight: 700;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.direction-arrow.incoming {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.direction-arrow.outgoing {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.conn-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.conn-name {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
}

.conn-relation {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
}

.jump-icon {
  font-size: 13px;
  color: var(--text-muted);
}

/* DRAWER ANIMATION */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .app-header {
    height: auto;
    padding: 12px 16px;
    flex-wrap: wrap;
  }
  .search-box {
    order: 3;
    width: 100%;
  }
  .dataset-picker {
    order: 2;
  }
  .details-drawer {
    left: 16px;
    width: auto;
  }
}
</style>
