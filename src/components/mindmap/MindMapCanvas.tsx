import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Connection,
  ConnectionMode,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import MindMapNodeComponent, { type MindMapNodeData } from "./MindMapNode";
import { MindMapDoc, MindMapEdgeRecord } from "@/lib/db";
import { saveMindMap } from "@/lib/mindmap-storage";
import { toast } from "sonner";
import ExportToCategory from "./ExportToCategory";
import { getId, HIERARCHY_TEMPLATES, PROCEDURE_TEMPLATES, type NodeTemplate } from "./mindmap-constants";
import { SnapGuideLines, autoLayout } from "./mindmap-utils";
import EdgeSettingsPanel from "./EdgeSettingsPanel";
import { MindMapToolbar, PresentationBar } from "./MindMapToolbar";

const nodeTypes = { mindMapNode: MindMapNodeComponent };

function MindMapCanvasInner({ doc, onBack }: { doc: MindMapDoc; onBack: () => void }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [title, setTitle] = useState(doc.title);
  const [dirty, setDirty] = useState(false);
  const [deletedStack, setDeletedStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [presentationMode, setPresentationMode] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const mode = doc.mode || "hierarchy";
  const isProcedure = mode === "procedure";
  const templates = isProcedure ? PROCEDURE_TEMPLATES : HIERARCHY_TEMPLATES;

  // ── Stable callbacks via ref ──
  const onUpdateRef = useRef<(id: string, updates: Partial<MindMapNodeData>) => void>(() => {});
  const onDuplicateRef = useRef<(id: string) => void>(() => {});

  const stableOnUpdate = useCallback((id: string, updates: Partial<MindMapNodeData>) => {
    onUpdateRef.current(id, updates);
  }, []);
  const stableOnDuplicate = useCallback((id: string) => {
    onDuplicateRef.current(id);
  }, []);

  const initialNodes = useMemo(() => doc.nodes.map((n: any) => ({
    ...n,
    type: "mindMapNode",
    data: { ...n.data, onUpdate: stableOnUpdate, onDuplicate: stableOnDuplicate },
  })), [doc.nodes, stableOnUpdate, stableOnDuplicate]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(doc.edges || []);

  onUpdateRef.current = (id: string, updates: Partial<MindMapNodeData>) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n));
    setDirty(true);
  };

  onDuplicateRef.current = (id: string) => {
    setNodes(nds => {
      const source = nds.find(n => n.id === id);
      if (!source) return nds;
      const { onUpdate, onDuplicate, ...cleanData } = source.data as any;
      const newNode: Node = {
        ...source,
        id: getId(),
        position: { x: source.position.x + 40, y: source.position.y + 40 },
        selected: false,
        data: { ...cleanData, onUpdate: stableOnUpdate, onDuplicate: stableOnDuplicate },
      };
      return [...nds, newNode];
    });
    setDirty(true);
    toast.success("Čvor duplikovan");
  };

  // ── Delete with undo ──
  const handleNodesChange: typeof onNodesChange = useCallback((changes) => {
    if (presentationMode) return;
    const removeChanges = changes.filter(c => c.type === "remove");
    if (removeChanges.length > 0) {
      setNodes(currentNodes => {
        setEdges(currentEdges => {
          const removedIds = new Set(removeChanges.map((c: any) => c.id));
          const removedNodes = currentNodes.filter(n => removedIds.has(n.id));
          const removedEdges = currentEdges.filter(e => removedIds.has(e.source) || removedIds.has(e.target));
          if (removedNodes.length > 0) {
            setDeletedStack(prev => [...prev.slice(-9), { nodes: removedNodes, edges: removedEdges }]);
            toast("Obrisano " + removedNodes.length + " čvor(ova)", {
              action: {
                label: "Vrati",
                onClick: () => {
                  setNodes(nds => [...nds, ...removedNodes.map(n => ({
                    ...n,
                    data: { ...(n.data as any), onUpdate: stableOnUpdate, onDuplicate: stableOnDuplicate },
                  }))]);
                  setEdges(eds => [...eds, ...removedEdges]);
                  setDirty(true);
                },
              },
              duration: 5000,
            });
          }
          return currentEdges;
        });
        return currentNodes;
      });
    }
    onNodesChange(changes);
    if (changes.some(c => c.type !== "select")) setDirty(true);
  }, [onNodesChange, setNodes, setEdges, stableOnUpdate, stableOnDuplicate, presentationMode]);

  const handleEdgesChange: typeof onEdgesChange = useCallback((changes) => {
    if (presentationMode) return;
    onEdgesChange(changes);
    if (changes.some(c => c.type !== "select")) setDirty(true);
  }, [onEdgesChange, presentationMode]);

  // ── Snap guides ──
  const SNAP_THRESHOLD = 20;
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});

  const onNodeDrag = useCallback((_event: React.MouseEvent, draggedNode: Node) => {
    const others = nodes.filter(n => n.id !== draggedNode.id);
    const { x, y } = draggedNode.position;
    let snapX: number | undefined, snapY: number | undefined;
    for (const other of others) {
      if (snapX === undefined && Math.abs(other.position.x - x) <= SNAP_THRESHOLD) snapX = other.position.x;
      if (snapY === undefined && Math.abs(other.position.y - y) <= SNAP_THRESHOLD) snapY = other.position.y;
      if (snapX !== undefined && snapY !== undefined) break;
    }
    setSnapLines({ x: snapX, y: snapY });
  }, [nodes]);

  const onNodeDragStop = useCallback((_event: React.MouseEvent, draggedNode: Node) => {
    setSnapLines({});
    setNodes(nds => {
      const others = nds.filter(n => n.id !== draggedNode.id);
      let { x, y } = draggedNode.position;
      let sx = false, sy = false;
      for (const other of others) {
        if (!sx && Math.abs(other.position.x - x) <= SNAP_THRESHOLD) { x = other.position.x; sx = true; }
        if (!sy && Math.abs(other.position.y - y) <= SNAP_THRESHOLD) { y = other.position.y; sy = true; }
        if (sx && sy) break;
      }
      if (!sx && !sy) return nds;
      return nds.map(n => n.id === draggedNode.id ? { ...n, position: { x, y } } : n);
    });
  }, [setNodes]);

  // ── Edge defaults ──
  const edgeStroke = isProcedure ? "hsl(var(--chart-4))" : "hsl(var(--primary))";
  const edgeStyle = { stroke: edgeStroke, strokeWidth: 2.5 };

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds =>
      addEdge({
        ...params,
        type: "smoothstep",
        animated: isProcedure,
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeStroke, width: 20, height: 20 },
        markerStart: { type: MarkerType.ArrowClosed, color: edgeStroke, width: 20, height: 20 },
        style: edgeStyle,
        label: "",
        labelStyle: { fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 500 },
        labelBgStyle: { fill: "hsl(var(--card))", fillOpacity: 0.95 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 6,
      }, eds)
    );
    setDirty(true);
  }, [setEdges, isProcedure, edgeStroke]);

  // ── Edge update/delete ──
  const updateEdge = useCallback((edgeId: string, updates: Partial<Edge>) => {
    setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, ...updates } as MindMapEdgeRecord : e));
    setDirty(true);
  }, [setEdges]);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
    setSelectedEdgeId(null);
    setDirty(true);
    toast.success("Veza obrisana");
  }, [setEdges]);

  // ── Node helpers ──
  const addNodeFromTemplate = useCallback((template: NodeTemplate) => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 3 + (Math.random() - 0.5) * 100,
    });
    const newNode: Node = {
      id: getId(),
      type: "mindMapNode",
      position,
      data: {
        label: template.desc,
        description: "",
        icon: template.icon,
        color: template.color,
        shape: template.shape,
        onUpdate: stableOnUpdate,
        onDuplicate: stableOnDuplicate,
      } as MindMapNodeData,
      ...(template.shape === "group" ? { style: { width: 300, height: 200 } } : {}),
    };
    setNodes(nds => [...nds, newNode]);
    setDirty(true);
  }, [screenToFlowPosition, setNodes, stableOnUpdate, stableOnDuplicate]);

  const addBlankNode = useCallback(() => {
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
    const newNode: Node = {
      id: getId(),
      type: "mindMapNode",
      position,
      data: {
        label: "Novi čvor",
        description: "",
        icon: isProcedure ? "arrow-right" : "file-text",
        color: "default",
        shape: isProcedure ? "rounded" : "rectangle",
        onUpdate: stableOnUpdate,
        onDuplicate: stableOnDuplicate,
      } as MindMapNodeData,
    };
    setNodes(nds => [...nds, newNode]);
    setDirty(true);
  }, [screenToFlowPosition, setNodes, stableOnUpdate, stableOnDuplicate, isProcedure]);

  const handleAutoLayout = useCallback((direction: "TB" | "LR") => {
    setNodes(nds => autoLayout(nds, edges, direction).map(n => ({
      ...n,
      data: { ...(n.data as any), onUpdate: stableOnUpdate, onDuplicate: stableOnDuplicate },
    })));
    setDirty(true);
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
    toast.success("Automatski raspored primijenjen");
  }, [edges, setNodes, fitView, stableOnUpdate, stableOnDuplicate]);

  const handleSave = useCallback(async () => {
    const cleanNodes = nodes.map(({ data, ...rest }) => {
      const { onUpdate, onDuplicate, ...cleanData } = data as any;
      return { ...rest, data: cleanData };
    });
    const updated: MindMapDoc = { ...doc, title, nodes: cleanNodes, edges, updatedAt: Date.now() };
    await saveMindMap(updated);
    setDirty(false);
    toast.success("Mapa sačuvana");
  }, [doc, title, nodes, edges]);

  // Auto-save 30s
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => { handleSave(); }, 30000);
    return () => clearTimeout(timer);
  }, [dirty, handleSave]);

  // Edge click → open settings
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(prev => prev === edge.id ? null : edge.id);
  }, []);

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const selectedEdge = selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) : null;

  return (
    <div className="h-full flex flex-col">
      {!presentationMode && (
        <MindMapToolbar
          title={title}
          setTitle={setTitle}
          dirty={dirty}
          isProcedure={isProcedure}
          templates={templates}
          onBack={onBack}
          onSave={handleSave}
          onAddTemplate={addNodeFromTemplate}
          onAddBlank={addBlankNode}
          onAutoLayout={handleAutoLayout}
          onPresentation={() => {
            setPresentationMode(true);
            setSelectedEdgeId(null);
            setTimeout(() => fitView({ padding: 0.15, duration: 600 }), 50);
          }}
          onExport={() => setExportOpen(true)}
          onTitleDirty={() => setDirty(true)}
        />
      )}

      {presentationMode && (
        <PresentationBar title={title} onClose={() => setPresentationMode(false)} />
      )}

      {/* Empty hint */}
      {nodes.length === 0 && !presentationMode && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none" style={{ top: 48 }}>
          <div className="text-center space-y-3 pointer-events-auto">
            <p className="text-muted-foreground text-sm">
              Kliknite "<strong>{isProcedure ? "Dodaj korak" : "Dodaj čvor"}</strong>" da počnete.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Prevucite od handle-a do handle-a za konekcije · Dupli klik za uređivanje · Delete za brisanje
            </p>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={presentationMode ? undefined : onConnect}
          onEdgeClick={onEdgeClick}
          onNodeDrag={presentationMode ? undefined : onNodeDrag}
          onNodeDragStop={presentationMode ? undefined : onNodeDragStop}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          snapToGrid={!presentationMode}
          snapGrid={[15, 15]}
          fitView
          nodesDraggable={!presentationMode}
          nodesConnectable={!presentationMode}
          elementsSelectable={!presentationMode}
          deleteKeyCode={presentationMode ? [] : ["Backspace", "Delete"]}
          className="bg-background"
          connectionLineStyle={edgeStyle}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: isProcedure,
            style: edgeStyle,
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeStroke, width: 20, height: 20 },
            markerStart: { type: MarkerType.ArrowClosed, color: edgeStroke, width: 20, height: 20 },
          }}
          onPaneClick={() => setSelectedEdgeId(null)}
        >
          {!presentationMode && <SnapGuideLines snapLines={snapLines} />}
          <Controls className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted" />
          <Background
            variant={isProcedure ? BackgroundVariant.Lines : BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="hsl(var(--muted-foreground) / 0.1)"
          />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor="hsl(var(--primary))"
            maskColor="hsl(var(--background) / 0.7)"
          />

          {selectedEdge && !presentationMode && (
            <Panel position="top-center">
              <EdgeSettingsPanel
                edge={selectedEdge}
                onUpdate={updateEdge}
                onDelete={deleteEdge}
                onClose={() => setSelectedEdgeId(null)}
              />
            </Panel>
          )}
        </ReactFlow>
      </div>

      <ExportToCategory
        open={exportOpen}
        onOpenChange={setExportOpen}
        currentTitle={title}
        currentNodes={nodes}
        currentEdges={edges}
        mode={mode}
      />
    </div>
  );
}

export default function MindMapCanvas(props: { doc: MindMapDoc; onBack: () => void }) {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
