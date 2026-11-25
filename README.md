# Visualizzatore di Reti a Nodi (Vue 3 + D3.js)

Progetto interattivo basato sull'**approccio ibrido Vue 3 + D3.js**:
* **D3.js** gestisce il motore fisico (`d3-force`) e il controllo di zoom/pan (`d3-zoom`).
* **Vue 3** renderizza gli elementi SVG in modo reattivo e dichiarativo nel `<template>` (`v-for`, classi dinamiche, binding ed eventi) e gestisce l'interfaccia utente.

## Dati del Grafo
I dati sono caricati dinamicamente da:
* `public/rete_interna.json` (dataset predefinito)
* `public/graphData.json` / `public/data.json`
* `public/esempio.json` (file di esempio/template pronto all'uso)
* È possibile aggiornare i file senza dover ricompilare l'applicazione, oppure caricare un qualsiasi file JSON personalizzato dall'interfaccia tramite il pulsante **"Carica JSON"**.

### Formato JSON dei nodi
Ogni nodo può includere, oltre ai campi base (`id`, `label`, `group`, `description`), un array `info` con coppie chiave/valore personalizzate (es. `ip`, `subnet`, `vlan`, `vlanTag`, `lan`, `ufficio`, `switch`, `porta`, `patch`, `cavo`):

```json
{
  "id": "nas",
  "label": "QNAP Master",
  "group": "Server 2",
  "description": "Storage NAS principale.",
  "info": [
    { "ufficio": "Sala Server" },
    { "switch": "sw64" },
    { "porta": "2" },
    { "cavo": "blu" },
    { "vlan": "VLAN1" },
    { "vlanTag": "13" },
    { "subnet": "192.168.13.0/24" },
    { "lan": "LAN2" }
  ]
}
```

## Avvio del Progetto

### 1. Installazione dipendenze
```bash
npm install
```

### 2. Avvio ambiente di sviluppo (Dev Server)
```bash
npm run dev
```

### 3. Build di produzione
```bash
npm run build
```

### 4. Anteprima della build
```bash
npm run preview
```

## Funzionalità
- **Fisica interattiva senza sovrapposizioni**: Disposizione iniziale a settori per sottorete, collisione rettangolare su nodi ed etichette e separazione automatica tra aree di gruppi diversi.
- **Aree delle sottoreti**: Riquadri arrotondati/poligonali attorno a ciascun gruppo con visualizzazione automatica della subnet CIDR e pulsante dedicato nella toolbar per attivarli/disattivarli.
- **Sidebar Gruppi / Sottoreti**: Barra laterale sinistra con filtro per gruppo, colore identificativo e conteggio nodi.
- **Zoom & Pan**: Zoom con rotella o pulsanti, pan con trascinamento dello sfondo, pulsanti reset `1:1` e adatta vista.
- **Posizione persistente e Sblocco (Pin/Unpin)**: I nodi trascinati mantengono la posizione rilasciata; è possibile sbloccare un singolo nodo dal pannello dettagli oppure tutti i nodi insieme dal pulsante dedicato nella toolbar.
- **Evidenziazione intelligente**: Al passaggio del mouse su un nodo o alla sua selezione, vengono evidenziati il nodo, i nodi direttamente collegati, l'area della sottorete e i rispettivi archi.
- **Frecce direzionali e badge relazioni**: Le frecce indicano la direzione del flusso sul bordo del nodo con etichette sintetiche a riposo ed estese alla selezione.
- **Pannello dettagli strutturato**: Mostra metriche di connessione, descrizione, tutti i dati presenti nell'array `info` del JSON e la lista navigabile di connessioni in entrata e uscita.
- **Ricerca in tempo reale**: Cerca per `label`, `id`, `group`, `description` e su tutti i campi di `info` (IP, subnet, VLAN, ufficio, switch, porta, ecc.).
