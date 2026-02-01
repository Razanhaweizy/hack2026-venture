# Ideograph

Startup Idea Evaluation: a 3D knowledge graph that turns founder brain dumps into a structured graph (problems, solutions, customers, technologies). Includes a local extraction pipeline, diff/review panel, follow-up questions, and version history.

## Tech stack

- **React 18** + **TypeScript** + **Vite 5**
- **Three.js** via `@react-three/fiber` and `@react-three/drei` for the 3D graph
- **Zustand** for state (graph, diff, follow-up, version)
- **CSV** for data (nodes/edges in `public/data/`, optional export/import)

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 (Vite default). The app loads graph data from CSV or falls back to the built-in skeleton.

## Scripts

| Script    | Command        | Description              |
|-----------|----------------|--------------------------|
| dev       | `npm run dev`   | Start dev server         |
| build     | `npm run build` | Production build         |
| preview   | `npm run preview` | Preview production build |
| lint      | `npm run lint`  | Run ESLint               |

## Features

- **3D graph**: Framework, claim, fact, and evidence nodes; drag to rotate, scroll to zoom, Shift+drag to pan.
- **Pipeline**: Paste text; local parser extracts statements/entities and proposes graph changes.
- **Diff panel**: Review and apply or reject proposed changes before updating the graph.
- **Follow-up questions**: Generate and answer clarifying questions; answers feed back into the pipeline.
- **Version history**: Snapshots, timeline, and time-travel view of past graph state.
- **AI claim critic**: Select a claim node and click "Critique claim (AI)" to get feedback from Gemini 2.5 Flash against the Sequoia product framework (strengths, gaps, suggestions). Requires `VITE_GEMINI_API_KEY` in `.env` (get a key from [Google AI Studio](https://aistudio.google.com/apikey)).
- **Data**: Auto-save to browser storage; export/import via CSV (`public/data/nodes.csv`, `edges.csv`).

## Project structure

- `src/App.tsx` – Main app and side panel
- `src/components/graph/` – 3D visualization (IdeographVisualization, GraphNode, GraphEdge)
- `src/components/diff/` – Diff/review panel
- `src/components/followup/` – Follow-up questions UI
- `src/components/version/` – Timeline, node history, version compare
- `src/store/` – Zustand stores (graph, diff, CSV persistence)
- `src/version/` – Versioned graph and time-travel logic
- `src/pipeline/` – Parser, matcher, change detector, framework detector (local)
- `src/followup/` – Question generator and templates
- `src/data/skeleton.ts` – Default evaluation framework skeleton
- `public/data/` – CSV nodes and edges
