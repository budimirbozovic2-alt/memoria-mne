import { db, MindMapDoc } from "./db";

export async function loadMindMaps(): Promise<MindMapDoc[]> {
  return db.mindMaps.orderBy("updatedAt").reverse().toArray();
}

export async function saveMindMap(doc: MindMapDoc): Promise<void> {
  await db.mindMaps.put(doc);
}

export async function deleteMindMap(id: string): Promise<void> {
  await db.mindMaps.delete(id);
}

export async function getMindMap(id: string): Promise<MindMapDoc | undefined> {
  return db.mindMaps.get(id);
}
