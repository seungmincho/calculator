'use client'
import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type GraphState,
  addNode, removeNode, addEdge, removeEdge, updateNodePosition,
  toggleDirected, toggleWeighted, updateEdgeWeight,
  toAdjacencyMatrix, toAdjacencyList,
  createSampleGraph, createCompleteGraph, createEmptyGraph, getGraphStats,
} from '@/utils/algorithm/graphRepr'
import GraphReprCanvas2D from './GraphReprCanvas2D'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'matrix' | 'list' | 'code' | 'guide'

const ADJ_MATRIX_CODE = `// 인접 행렬 (Adjacency Matrix)
// 공간: O(V^2), 간선 조회: O(1)
const matrix = Array(V).fill(null)
  .map(() => Array(V).fill(0));

function addEdge(u, v, weight = 1) {
  matrix[u][v] = weight;
  matrix[v][u] = weight;  // 무방향
}

function hasEdge(u, v) {
  return matrix[u][v] !== 0;
}`

const ADJ_LIST_CODE = `// 인접 리스트 (Adjacency List)
// 공간: O(V+E), 간선 조회: O(degree)
const adjList = Array(V).fill(null)
  .map(() => []);

function addEdge(u, v, weight = 1) {
  adjList[u].push({ node: v, weight });
  adjList[v].push({ node: u, weight });  // 무방향
}

function neighbors(u) {
  return adjList[u];
}`

export default function GraphReprVisualizer() {
  const t = useTranslations('graphReprVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [graphState, setGraphState] = useState<GraphState>(() => createSampleGraph())
  const [selectedNode, setSelectedNode] = useState<number | null>(null)
  const [hoveredNode] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('matrix')
  const [edgeWeightInput, setEdgeWeightInput] = useState('1')

  const matrix = useMemo(() => toAdjacencyMatrix(graphState), [graphState])
  const adjList = useMemo(() => toAdjacencyList(graphState), [graphState])
  const stats = useMemo(() => getGraphStats(graphState), [graphState])

  const handleNodeClick = useCallback((nodeId: number | null) => {
    if (nodeId === null) {
      setSelectedNode(null)
      return
    }

    if (selectedNode === null) {
      setSelectedNode(nodeId)
    } else if (selectedNode === nodeId) {
      setSelectedNode(null)
    } else {
      // Add edge between selected and clicked
      const w = parseInt(edgeWeightInput, 10) || 1
      setGraphState(prev => addEdge(prev, selectedNode, nodeId, w))
      setSelectedNode(null)
    }
  }, [selectedNode, edgeWeightInput])

  const handleNodeDrag = useCallback((nodeId: number, x: number, y: number) => {
    setGraphState(prev => updateNodePosition(prev, nodeId, x, y))
  }, [])

  const handleAddNodeAt = useCallback((x: number, y: number) => {
    if (selectedNode !== null) {
      setSelectedNode(null)
      return
    }
    setGraphState(prev => addNode(prev, x, y))
  }, [selectedNode])

  const handleRemoveSelected = useCallback(() => {
    if (selectedNode !== null) {
      setGraphState(prev => removeNode(prev, selectedNode))
      setSelectedNode(null)
    }
  }, [selectedNode])

  const handleRemoveEdge = useCallback((from: number, to: number) => {
    setGraphState(prev => removeEdge(prev, from, to))
  }, [])

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'matrix', icon: '📊', label: t('tabs.matrix') },
    { key: 'list',   icon: '📋', label: t('tabs.list') },
    { key: 'code',   icon: '💻', label: t('tabs.code') },
    { key: 'guide',  icon: '📖', label: t('tabs.guide') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              {tHub('categories.dataStructure')}
            </span>
            <span className="text-xs text-gray-400">★☆☆</span>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          {/* Graph canvas */}
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            <div className="overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50">
              <GraphReprCanvas2D
                state={graphState}
                selectedNode={selectedNode}
                hoveredNode={hoveredNode}
                onNodeClick={handleNodeClick}
                onNodeDrag={handleNodeDrag}
                onAddNodeAt={handleAddNodeAt}
                width={660}
                height={380}
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.nodes')}: <strong className="text-blue-600 dark:text-blue-400">{stats.nodeCount}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.edges')}: <strong className="text-purple-600 dark:text-purple-400">{stats.edgeCount}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.density')}: <strong className="text-amber-600 dark:text-amber-400">{stats.density}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.avgDegree')}: <strong className="text-emerald-600 dark:text-emerald-400">{stats.avgDegree}</strong>
              </span>
            </div>

            {selectedNode !== null && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-400 text-center">
                {t('controls.selectedHint', { node: String(selectedNode) })}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            {/* Graph type toggles */}
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.direction')}</p>
                <button onClick={() => setGraphState(prev => toggleDirected(prev))}
                  className={`w-full px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    graphState.directed ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                  {graphState.directed ? t('controls.directed') : t('controls.undirected')}
                </button>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.weight')}</p>
                <button onClick={() => setGraphState(prev => toggleWeighted(prev))}
                  className={`w-full px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    graphState.weighted ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                  {graphState.weighted ? t('controls.weighted') : t('controls.unweighted')}
                </button>
              </div>
            </div>

            {graphState.weighted && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('controls.edgeWeight')}</label>
                  <input type="number" min={1} max={99} value={edgeWeightInput} onChange={e => setEdgeWeightInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {selectedNode !== null && (
                <button onClick={handleRemoveSelected}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-700/30 transition-colors">
                  🗑️ {t('controls.removeNode')}
                </button>
              )}
              <button onClick={() => setGraphState(createSampleGraph())}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/30 transition-colors">
                📐 {t('controls.sample')}
              </button>
              <button onClick={() => setGraphState(createCompleteGraph(5))}
                className="px-3 py-1.5 text-xs rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/50 dark:border-purple-700/30 transition-colors">
                🔗 {t('controls.complete')}
              </button>
              <button onClick={() => { setGraphState(createEmptyGraph()); setSelectedNode(null) }}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-700/30 transition-colors">
                🗑️ {t('controls.clear')}
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('controls.instructions')}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
              <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                      activeTab === tab.key ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-500 dark:text-gray-400'
                    }`}>{tab.icon} {tab.label}</button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'matrix' && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('matrix.title')}</p>
                    {graphState.nodes.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">{t('matrix.empty')}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="text-xs">
                          <thead>
                            <tr>
                              <th className="p-1 text-gray-500 dark:text-gray-400" />
                              {graphState.nodes.map(n => (
                                <th key={n.id} className="p-1 text-center text-blue-600 dark:text-blue-400 font-bold">{n.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {matrix.map((row, ri) => (
                              <tr key={ri}>
                                <td className="p-1 text-blue-600 dark:text-blue-400 font-bold">{graphState.nodes[ri]?.label}</td>
                                {row.map((cell, ci) => (
                                  <td key={ci}
                                    onClick={() => {
                                      if (cell !== null) handleRemoveEdge(graphState.nodes[ri].id, graphState.nodes[ci].id)
                                      else if (ri !== ci) setGraphState(prev => addEdge(prev, graphState.nodes[ri].id, graphState.nodes[ci].id, parseInt(edgeWeightInput) || 1))
                                    }}
                                    className={`p-1 text-center cursor-pointer border border-gray-200/30 dark:border-gray-700/30 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                                      cell !== null ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-400 dark:text-gray-600'
                                    }`}>
                                    {cell ?? 0}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400">{t('matrix.hint')}</p>
                  </div>
                )}

                {activeTab === 'list' && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('list.title')}</p>
                    {adjList.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">{t('list.empty')}</p>
                    ) : (
                      <div className="space-y-2">
                        {adjList.map(entry => (
                          <div key={entry.nodeId} className="flex items-start gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-bold min-w-[28px] text-center">
                              {entry.label}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">→</span>
                            <div className="flex flex-wrap gap-1">
                              {entry.neighbors.length === 0 ? (
                                <span className="text-xs text-gray-400 italic">empty</span>
                              ) : entry.neighbors.map((nb, i) => (
                                <span key={i}
                                  onClick={() => handleRemoveEdge(entry.nodeId, nb.nodeId)}
                                  className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                                  {nb.label}{graphState.weighted ? `(${nb.weight})` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="space-y-4">
                    <CodeViewer code={ADJ_MATRIX_CODE} language="javascript" highlightLines={[]} title="adj-matrix.js" />
                    <CodeViewer code={ADJ_LIST_CODE} language="javascript" highlightLines={[]} title="adj-list.js" />
                  </div>
                )}

                {activeTab === 'guide' && <GuideSection namespace="graphReprVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
