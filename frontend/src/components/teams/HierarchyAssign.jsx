import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import toast from 'react-hot-toast';
import teamService from '../../services/teamService';
import { GitBranch, RefreshCw, Sparkles } from 'lucide-react';

const ROW_GAP = 210;
const COL_GAP = 270;

function layoutNodes(apiNodes) {
  if (!apiNodes.length) return [];
  const tiers = [...new Set(apiNodes.map((n) => n.hierarchyTier))].sort((a, b) => a - b);
  const maxT = Math.max(...tiers);
  const out = [];
  tiers.forEach((tier, tierIdx) => {
    const row = apiNodes
      .filter((n) => n.hierarchyTier === tier)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));
    
    // Reverse the index so highest tier is at the top (y=0)
    const reversedIdx = tiers.length - 1 - tierIdx;
    
    row.forEach((n, i) => {
      const x = (i - (row.length - 1) / 2) * COL_GAP;
      const y = reversedIdx * ROW_GAP;
      out.push({
        id: String(n.id),
        type: 'person',
        position: { x, y },
        data: n,
      });
    });
  });
  return out;
}

function buildEdges(links) {
  return (links || []).map((l) => ({
    id: l.id || `e-${l.subordinateId}-${l.supervisorId}`,
    source: String(l.subordinateId),
    target: String(l.supervisorId),
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#64748b', strokeWidth: 2 },
    data: { dbId: l.dbId },
  }));
}

const roleTone = {
  admin: 'from-violet-500/15 to-violet-600/10 border-violet-300/60 text-violet-900',
  manager: 'from-amber-500/12 to-amber-600/8 border-amber-300/50 text-amber-950',
  employee: 'from-sky-500/12 to-sky-600/8 border-sky-300/50 text-sky-950',
};

const PersonNode = memo(({ data }) => {
  const tone = roleTone[data.systemRole] || roleTone.employee;
  return (
    <div
      className={`relative rounded-2xl border bg-gradient-to-br px-5 py-4 min-w-[220px] max-w-[260px] shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] ${tone}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-500"
      />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">
        Tier {data.hierarchyTier}
      </p>
      <p className="font-semibold text-slate-900 leading-snug text-[15px]">{data.fullName}</p>
      <p className="text-xs text-slate-500 truncate mt-0.5">{data.email}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/70 border border-slate-200/80 text-slate-700">
          {data.systemRole}
        </span>
        {data.teamRoleName && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/50 text-slate-600 border border-slate-200/60">
            {data.teamRoleName}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-white !bg-primary"
      />
    </div>
  );
});
PersonNode.displayName = 'PersonNode';

const nodeTypes = { person: PersonNode };

function HierarchyFlowInner({ onRefresh }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [tierDraft, setTierDraft] = useState('');
  const [savingTier, setSavingTier] = useState(false);
  const { fitView } = useReactFlow();

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teamService.getHierarchy();
      setNodes(layoutNodes(data.nodes ?? []));
      setEdges(buildEdges(data.links ?? []));
      setTimeout(() => fitView({ padding: 0.2, duration: 280 }), 40);
    } catch (e) {
      toast.error(e.message || 'Could not load hierarchy.');
    } finally {
      setLoading(false);
    }
  }, [fitView, setEdges, setNodes]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId)?.data,
    [nodes, selectedId],
  );

  useEffect(() => {
    if (selectedNode) setTierDraft(String(selectedNode.hierarchyTier));
  }, [selectedNode]);

  const onConnect = useCallback(
    async (params) => {
      const subId = Number(params.source);
      const supId = Number(params.target);
      try {
        await teamService.createReportingLink(subId, supId);
        toast.success('Reporting line created (bottom → top).');
        await loadGraph();
        onRefresh?.();
      } catch (e) {
        toast.error(e.message || 'Could not create link.');
      }
    },
    [loadGraph, onRefresh],
  );

  const onEdgesDelete = useCallback(
    async (deleted) => {
      for (const edge of deleted) {
        try {
          await teamService.deleteReportingLink(Number(edge.source), Number(edge.target));
        } catch (e) {
          toast.error(e.message || 'Could not remove link.');
          await loadGraph();
          return;
        }
      }
      toast.success('Link removed.');
      await loadGraph();
      onRefresh?.();
    },
    [loadGraph, onRefresh],
  );

  const onNodeClick = useCallback((_, node) => {
    setSelectedId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  const applyTier = async () => {
    if (!selectedNode) return;
    const v = Number(tierDraft);
    if (!Number.isFinite(v) || v < 0 || v > 999) {
      toast.error('Tier must be between 0 and 999.');
      return;
    }
    setSavingTier(true);
    try {
      await teamService.updateUserHierarchyTier(selectedNode.id, v);
      toast.success('Hierarchy tier updated.');
      await loadGraph();
      onRefresh?.();
    } catch (e) {
      toast.error(e.message || 'Could not update tier.');
    } finally {
      setSavingTier(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 h-[min(72vh,760px)] min-h-[560px] rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 via-white to-slate-100/90 shadow-inner overflow-hidden">
        {loading && nodes.length === 0 ? (
          <div className="h-full min-h-[560px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.35}
            maxZoom={1.25}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            connectionLineStyle={{ stroke: '#0d9488', strokeWidth: 2 }}
            deleteKeyCode={['Backspace', 'Delete']}
            className="!bg-transparent h-full min-h-[560px]"
          >
            <Background gap={22} size={1} color="#cbd5e1" className="!bg-transparent" />
            <Controls className="!rounded-xl !border-slate-200 !shadow-lg" />
            <MiniMap
              className="!rounded-xl !border !border-slate-200 !bg-white/90"
              maskColor="rgba(15, 23, 42, 0.08)"
              nodeColor={() => '#94a3b8'}
            />
          </ReactFlow>
        )}
      </div>

      <aside className="w-full xl:w-[320px] shrink-0 space-y-5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <Sparkles size={18} className="text-primary" />
            How assignment works
          </div>
          <ul className="text-sm text-slate-600 space-y-2 leading-relaxed">
            <li>
              <strong className="text-slate-800">Bottom → top only:</strong> drag from the{' '}
              <span className="text-primary font-medium">green dot</span> under a report to the{' '}
              <span className="text-slate-600 font-medium">gray dot</span> on a manager above.
            </li>
            <li>
              One employee can report to <strong>several</strong> managers; managers can report to
              multiple leaders.
            </li>
            <li>
              <strong>Higher tier</strong> numbers sit on higher rows. Admins stay at the top tier.
            </li>
            <li>
              Select a link and press <kbd className="px-1 py-0.5 rounded bg-slate-100 text-xs">Delete</kbd>{' '}
              to remove it.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-2">
              <GitBranch size={18} className="text-slate-500" />
              Tier (layer)
            </span>
            <button
              type="button"
              onClick={() => loadGraph()}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title="Refresh layout"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Suggested bands: <strong>0</strong> ICs · <strong>10–40</strong> management layers ·{' '}
            <strong>100</strong> executives (admins fixed at 100).
          </p>
          {selectedNode && selectedNode.systemRole !== 'admin' ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-900">{selectedNode.fullName}</p>
              <label className="block text-xs font-medium text-slate-600">Hierarchy tier</label>
              <input
                type="number"
                min={0}
                max={999}
                value={tierDraft}
                onChange={(e) => setTierDraft(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
              <button
                type="button"
                disabled={savingTier}
                onClick={applyTier}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                {savingTier ? 'Saving…' : 'Apply tier'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {selectedNode?.systemRole === 'admin'
                ? 'Administrator tier is fixed.'
                : 'Click a person to adjust their tier row.'}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function HierarchyAssign({ onRefresh }) {
  return (
    <ReactFlowProvider>
      <HierarchyFlowInner onRefresh={onRefresh} />
    </ReactFlowProvider>
  );
}
