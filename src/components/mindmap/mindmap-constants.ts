import type { NodeShape } from "./MindMapNode";

let nodeIdCounter = 0;
export const getId = () => `node_${Date.now()}_${++nodeIdCounter}`;

export interface NodeTemplate {
  label: string;
  icon: string;
  color: string;
  desc: string;
  shape: NodeShape;
}

export const HIERARCHY_TEMPLATES: NodeTemplate[] = [
  { label: "Sud", icon: "scale", color: "blue", desc: "Sudska institucija", shape: "rectangle" },
  { label: "Organ", icon: "building", color: "green", desc: "Upravni organ", shape: "rectangle" },
  { label: "Odluka", icon: "file-text", color: "default", desc: "Akt ili odluka", shape: "rectangle" },
  { label: "Lice", icon: "user", color: "purple", desc: "Službeno lice ili stranka", shape: "rectangle" },
];

export const PROCEDURE_TEMPLATES: NodeTemplate[] = [
  { label: "Korak", icon: "arrow-right", color: "blue", desc: "Faza postupka", shape: "rounded" },
  { label: "Odluka", icon: "question", color: "amber", desc: "Tačka odlučivanja", shape: "diamond" },
  { label: "Rok", icon: "calendar", color: "red", desc: "Rokovi i ograničenja", shape: "rectangle" },
  { label: "Završetak", icon: "check", color: "green", desc: "Završna faza", shape: "rounded" },
  { label: "Dokument", icon: "file-text", color: "default", desc: "Podnesak ili akt", shape: "rectangle" },
  { label: "Žalba", icon: "refresh", color: "purple", desc: "Pravni lijek", shape: "rounded" },
];

export const SPECIAL_TEMPLATES: NodeTemplate[] = [
  { label: "Uslovni čvor", icon: "question", color: "amber", desc: "If/else odluka", shape: "diamond" },
  { label: "Grupa (faza)", icon: "file-text", color: "blue", desc: "Kontejner za pod-korake", shape: "group" },
];

export const EDGE_STYLES = [
  { value: "solid", label: "Puna", dashArray: undefined },
  { value: "dashed", label: "Isprekidana", dashArray: "8 4" },
  { value: "dotted", label: "Tačkasta", dashArray: "3 3" },
] as const;

export const EDGE_COLORS = [
  { value: "primary", label: "Primarna", css: "hsl(var(--primary))" },
  { value: "muted", label: "Prigušena", css: "hsl(var(--muted-foreground))" },
  { value: "blue", label: "Plava", css: "hsl(210 80% 55%)" },
  { value: "green", label: "Zelena", css: "hsl(150 60% 45%)" },
  { value: "amber", label: "Žuta", css: "hsl(38 92% 50%)" },
  { value: "red", label: "Crvena", css: "hsl(0 72% 51%)" },
  { value: "purple", label: "Ljubičasta", css: "hsl(270 60% 55%)" },
] as const;

export const EDGE_TYPES = [
  { value: "smoothstep", label: "Glatka" },
  { value: "straight", label: "Ravna" },
  { value: "default", label: "Bezier" },
] as const;
