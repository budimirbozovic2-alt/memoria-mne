import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

const ICON_OPTIONS = [
  { value: "scale", label: "Sud", emoji: "⚖️" },
  { value: "building", label: "Organ", emoji: "🏢" },
  { value: "document", label: "Odluka", emoji: "📄" },
  { value: "person", label: "Stranka", emoji: "👤" },
  { value: "clock", label: "Rok", emoji: "🕒" },
];

const COLOR_OPTIONS = [
  { value: "default", bg: "bg-card", border: "border-border" },
  { value: "blue", bg: "bg-blue-500/15", border: "border-blue-500/40" },
  { value: "green", bg: "bg-green-500/15", border: "border-green-500/40" },
  { value: "amber", bg: "bg-amber-500/15", border: "border-amber-500/40" },
  { value: "red", bg: "bg-red-500/15", border: "border-red-500/40" },
  { value: "purple", bg: "bg-purple-500/15", border: "border-purple-500/40" },
];

const SHAPE_OPTIONS = [
  { value: "rectangle", className: "rounded-lg" },
  { value: "rounded", className: "rounded-full" },
];

export type MindMapNodeData = {
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  shape?: string;
  onUpdate?: (id: string, data: Partial<MindMapNodeData>) => void;
};

function MindMapNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as MindMapNodeData;
  const [editing, setEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const colorOpt = COLOR_OPTIONS.find(c => c.value === (nodeData.color || "default")) || COLOR_OPTIONS[0];
  const shapeOpt = SHAPE_OPTIONS.find(s => s.value === (nodeData.shape || "rectangle")) || SHAPE_OPTIONS[0];
  const iconObj = ICON_OPTIONS.find(i => i.value === (nodeData.icon || "document"));

  const updateField = (field: string, value: string) => {
    nodeData.onUpdate?.(id, { [field]: value });
  };

  return (
    <div
      className={cn(
        "min-w-[140px] max-w-[220px] border-2 shadow-md transition-shadow",
        colorOpt.bg, colorOpt.border, shapeOpt.className,
        selected && "ring-2 ring-primary shadow-lg",
        nodeData.shape === "rounded" ? "px-5 py-4" : "px-4 py-3"
      )}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2.5 !h-2.5" />

      {/* Icon + Title */}
      <div className="flex items-center gap-2 mb-1">
        {iconObj && <span className="text-lg">{iconObj.emoji}</span>}
        {editing ? (
          <input
            autoFocus
            className="bg-transparent border-b border-primary text-sm font-semibold w-full outline-none text-foreground"
            defaultValue={nodeData.label}
            onBlur={(e) => {
              updateField("label", e.target.value);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        ) : (
          <span className="text-sm font-semibold text-foreground truncate">{nodeData.label}</span>
        )}
      </div>

      {/* Description */}
      {nodeData.description && !editing && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{nodeData.description}</p>
      )}
      {editing && (
        <textarea
          className="bg-transparent border border-border rounded text-xs w-full outline-none text-foreground mt-1 p-1 resize-none"
          rows={2}
          defaultValue={nodeData.description || ""}
          placeholder="Opis..."
          onBlur={(e) => updateField("description", e.target.value)}
        />
      )}

      {/* Settings toggle */}
      {selected && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-[10px] text-muted-foreground hover:text-foreground mt-1.5 underline"
        >
          {showSettings ? "Zatvori" : "Podešavanja"}
        </button>
      )}

      {/* Settings panel */}
      {showSettings && selected && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          {/* Icon picker */}
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ikonica</span>
            <div className="flex gap-1 mt-1 flex-wrap">
              {ICON_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateField("icon", opt.value)}
                  className={cn(
                    "text-base p-1 rounded hover:bg-muted",
                    nodeData.icon === opt.value && "ring-1 ring-primary bg-muted"
                  )}
                  title={opt.label}
                >
                  {opt.emoji}
                </button>
              ))}
            </div>
          </div>
          {/* Color picker */}
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Boja</span>
            <div className="flex gap-1.5 mt-1">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateField("color", opt.value)}
                  className={cn(
                    "w-5 h-5 rounded-full border-2",
                    opt.bg, opt.border,
                    nodeData.color === opt.value && "ring-2 ring-primary"
                  )}
                />
              ))}
            </div>
          </div>
          {/* Shape picker */}
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Oblik</span>
            <div className="flex gap-1.5 mt-1">
              <button
                onClick={() => updateField("shape", "rectangle")}
                className={cn("w-7 h-5 rounded border-2 border-border", nodeData.shape !== "rounded" && "ring-1 ring-primary")}
              />
              <button
                onClick={() => updateField("shape", "rounded")}
                className={cn("w-7 h-5 rounded-full border-2 border-border", nodeData.shape === "rounded" && "ring-1 ring-primary")}
              />
            </div>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2.5 !h-2.5" />
    </div>
  );
}

export default memo(MindMapNodeComponent);
