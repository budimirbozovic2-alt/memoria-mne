import { useState } from "react";
import { MindMapDoc } from "@/lib/db";
import MindMapList from "@/components/mindmap/MindMapList";
import MindMapCanvas from "@/components/mindmap/MindMapCanvas";

export default function MindMapPage() {
  const [activeDoc, setActiveDoc] = useState<MindMapDoc | null>(null);

  if (activeDoc) {
    return (
      <div className="h-[calc(100vh-3rem)]">
        <MindMapCanvas doc={activeDoc} onBack={() => setActiveDoc(null)} />
      </div>
    );
  }

  return <MindMapList onOpen={setActiveDoc} />;
}
