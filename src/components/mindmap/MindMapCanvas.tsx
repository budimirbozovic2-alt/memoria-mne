import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Connection,
  Edge,
  BackgroundVariant,
  MarkerType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import MindMapNodeComponent, { type MindMapNodeData } from "./MindMapNode";
import { MindMapDoc } from "@/lib/db";
import { saveMindMap } from "@/lib/mindmap-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, ArrowLeft } from "lucide-react";

const nodeTypes = { mindMapNode: MindMapNodeComponent };

let nodeId = 0;
const getId = () => `node_${Date.now()}_${++nodeId}`;

interface Props {
  doc: MindMapDoc;
  onBack: () => void;
}

function MindMapCanvasInner({ doc, onBack }: Props) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [title, setTitle] = useState(doc.title);

  const makeOnUpdate = useCallback(() => {
    return (id: string, updates: Partial<MindMapNodeData>) => {
      setNodes(nds =>
        nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)
      );
    };
  }, []);

  const initialNodes = doc.nodes.map((n: any) => ({
    ...n,
    type: "mindMapNode",
    data: { ...n.data, onUpdate: makeOnUpdate() },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(doc.edges || []);
  const [editingEdge, setEditingEdge] = useState<string | null>(null);

  // Keep onUpdate reference current
  useEffect(() => {
    setNodes(nds =>
      nds.map(n => ({ ...n, data: { ...n.data, onUpdate: makeOnUpdate() } }))
    );
  }, [makeOnUpdate, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges(eds =>
        addEdge(
          {
            ...params,
            type: "default",
            markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
            label: "",
            labelStyle: { fill: "hsl(var(--foreground))", fontSize: 11 },
            labelBgStyle: { fill: "hsl(var(--card))", fillOpacity: 0.9 },
            labelBgPadding: [4, 2] as [number, number],
            labelBgBorderRadius: 4,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const addNode = useCallback(() => {
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
    const newNode = {
      id: getId(),
      type: "mindMapNode",
      position,
      data: {
        label: "Novi čvor",
        description: "",
        icon: "document",
        color: "default",
        shape: "rectangle",
        onUpdate: makeOnUpdate(),
      } as MindMapNodeData,
    };
    setNodes(nds => [...nds, newNode]);
  }, [screenToFlowPosition, setNodes, makeOnUpdate]);

  const handleSave = useCallback(async () => {
    const cleanNodes = nodes.map(({ data, ...rest }) => {
      const { onUpdate, ...cleanData } = data as any;
      return { ...rest, data: cleanData };
    });
    const updated: MindMapDoc = {
      ...doc,
      title,
      nodes: cleanNodes,
      edges,
      updatedAt: Date.now(),
    };
    await saveMindMap(updated);
  }, [doc, title, nodes, edges]);

  const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setEditingEdge(edge.id);
  }, []);

  const updateEdgeLabel = useCallback((edgeId: string, label: string) => {
    setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, label } : e));
    setEditingEdge(null);
  }, [setEdges]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Nazad
        </Button>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="max-w-[280px] h-8 text-sm font-semibold"
          placeholder="Naziv mape..."
        />
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={addNode}>
          <Plus className="h-4 w-4 mr-1" /> Dodaj čvor
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" /> Sačuvaj
        </Button>
      </div>

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={onEdgeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
          className="bg-background"
        >
          <Controls className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted" />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor="hsl(var(--primary))"
            maskColor="hsl(var(--background) / 0.7)"
          />
          {/* Edge label editor */}
          {editingEdge && (
            <Panel position="top-center">
              <div className="bg-card border border-border rounded-lg shadow-lg p-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Tekst strelice:</span>
                <input
                  autoFocus
                  className="bg-transparent border-b border-primary text-sm outline-none text-foreground w-40"
                  defaultValue={(edges.find(e => e.id === editingEdge)?.label as string) || ""}
                  onBlur={(e) => updateEdgeLabel(editingEdge, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingEdge(null);
                  }}
                />
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export default function MindMapCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
