// ─── Domain types (SQLite SSOT) ───────────────────────────────────────────
//
// Type-only module for UI/business-layer records. Adding a new domain
// interface? Put it here.

import type { CSSProperties, ReactNode } from "react";
import type { EditorDoc } from "./editor-v4/types";

// ─── Taxonomy ────────────────────────────────────────────────────────────

export interface ChapterNode {
  id: string;
  name: string;
  sortOrder: number;
}

export interface SubcategoryNode {
  id: string;
  name: string;
  chapters: ChapterNode[];
  sortOrder: number;
}

export type ExaminerDifficulty = "tezak" | "lak";
export type PreferredAnswerType = "esej" | "definicija" | "potpitanja";

export interface ExaminerProfile {
  difficulty?: ExaminerDifficulty;
  preferredAnswerType?: PreferredAnswerType;
  expectedAnswerElements?: string[];
  notes?: string;
  updatedAt?: number;
}

export interface CategoryRecord {
  id: string;
  name: string;
  sortOrder: number;
  subcategories: SubcategoryNode[];
  color?: string;
  examinerProfile?: ExaminerProfile;
}

// ─── Sources ─────────────────────────────────────────────────────────────

interface SourceArticle {
  id: string;
  number: number;
  title: string;
  text: string;
}

export type SourceKind = "propis" | "skripta";

export interface ExamQuestion {
  id: string;
  text: string;
  done: boolean;
  moduleCount?: number;
}

export interface Source {
  id: string;
  categoryId: string;
  title: string;
  date: string;
  /** Canonical V4 AST — sole body SSOT. Derive HTML/plain text via `@/lib/editor-v4/derived`. */
  contentDoc: EditorDoc;
  outline: { id: string; text: string; level: number }[];
  articles: SourceArticle[];
  version: number;
  createdAt: number;
  updatedAt: number;
  officialGazetteInfo?: string;
  slMarkings?: string;
  isExclusive?: boolean;
  sourceKind?: SourceKind;
  examQuestions?: ExamQuestion[];
}

// ─── Mind maps ───────────────────────────────────────────────────────────

export type MindMapMode = "hierarchy" | "procedure";

interface MindMapNodeData {
  label?: string;
  shape?: string;
  colorTheme?: string;
  [key: string]: unknown;
}

export interface MindMapNodeRecord {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: MindMapNodeData;
  style?: CSSProperties;
  [key: string]: unknown;
}

export interface MindMapEdgeRecord {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: ReactNode;
  style?: CSSProperties;
  animated?: boolean;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MindMapDoc {
  id: string;
  categoryId?: string;
  title: string;
  mode: MindMapMode;
  nodes: MindMapNodeRecord[];
  edges: MindMapEdgeRecord[];
  createdAt: number;
  updatedAt: number;
}

// ─── Zettelkasten knowledge base ─────────────────────────────────────────

/**
 * Reference-only link from an article to a propis excerpt — no copy of the
 * excerpt text is stored. `anchor` is the same opaque `createTextAnchor`
 * string used by card↔source links; resolving it means opening the source
 * (`sourceId`) and letting the reader locate the passage manually, same as
 * the existing "Provjeri uz izvor" flow.
 */
export interface LinkedProvision {
  id: string;
  sourceId: string;
  anchor: string;
  /** Short label derived from the excerpt at link time, for display only. */
  label: string;
  createdAt: number;
}

export interface KnowledgeBaseArticle {
  id: string;
  subjectId: string;
  title: string;
  contentDoc: EditorDoc;
  linkedSourceIds: string[];
  linkedProvisions?: LinkedProvision[];
  rootSubcategoryId?: string;
  isIndex?: boolean;
  tags?: string[];
  aliases?: string[];
  createdAt: number;
  updatedAt: number;
}

// ─── Draft autosave ──────────────────────────────────────────────────────

export interface DraftRecord {
  key: string;
  source: string;
  payload: unknown;
  updatedAt: number;
}
