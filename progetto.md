# Visualizzatore di Reti a Nodi (Vue 3 + D3.js — Approccio Ibrido)

Progetto frontend basato su **Vue 3** e **D3.js** per visualizzare grafi interattivi caricando nodi e collegamenti da un file JSON esterno.

## Architettura: Approccio Ibrido
* **D3.js (`d3-force`, `d3-zoom`):** Calcola la fisica del grafo (repulsione, tensione degli archi, centraggio) e gestisce zoom/pan.
* **Vue 3:** Renderizza l'SVG in modo dichiarativo nel `<template>` (`v-for`, classi dinamiche, eventi `@click`) e gestisce lo stato dell'interfaccia (pannello dettagli, filtri).

---

## Struttura del progetto

```text
grafi/
├── public/
│   └── graphData.json          # File JSON modificabile senza ricompilare
├── src/
│   ├── components/
│   │   └── NetworkGraph.vue    # Componente grafo (Vue + D3)
│   ├── App.vue                 # Layout principale
│   └── main.js
└── package.json