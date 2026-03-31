

# WebWorker za ZIP Kompresiju/Dekompresiju

## Rezime
Prebacujemo JSZip operacije (kompresija i dekompresija) sa main thread-a u Web Worker po istom obrascu kao `docx-worker.ts`. UI ostaje responsivan tokom exporta velikih baza.

---

## Novi fajl: `src/workers/zip-worker.ts`

Worker prima dvije vrste poruka:
1. **compress**: `{ action: "compress", filename: string, data: ArrayBuffer }` → vraća `{ success: true, blob: ArrayBuffer }`
2. **decompress**: `{ action: "decompress", data: ArrayBuffer }` → vraća `{ success: true, json: string }`

Worker importuje `jszip` direktno (Vite bundluje za worker kontekst).

```ts
import JSZip from "jszip";

self.onmessage = async (e) => {
  const { action, filename, data } = e.data;
  try {
    if (action === "compress") {
      const zip = new JSZip();
      zip.file(filename, data);
      const result = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE", compressionOptions: { level: 5 } });
      self.postMessage({ success: true, result }, [result]); // transfer ownership
    } else if (action === "decompress") {
      const zip = await JSZip.loadAsync(data);
      const jsonFile = Object.keys(zip.files).find(n => n.endsWith(".json") && !n.startsWith("__MACOSX"));
      if (!jsonFile) throw new Error("ZIP ne sadrži JSON fajl.");
      const json = await zip.files[jsonFile].async("string");
      self.postMessage({ success: true, result: json });
    }
  } catch (err: any) {
    self.postMessage({ success: false, error: err?.message || "ZIP operation failed" });
  }
};
```

Key: koristi `ArrayBuffer` + `Transferable` za zero-copy slanje blob-ova između worker-a i main thread-a.

---

## Ažuriranje: `src/lib/zip-service.ts`

Obje funkcije (`compressToZip`, `decompressJsonFromZip`) prelaze na worker-first pristup sa fallback-om na main thread (isti obrazac kao `docx-parser.ts`):

```ts
export async function compressToZip(filename: string, blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  try {
    const result = await runInWorker("compress", { filename, data: arrayBuffer });
    return new Blob([result], { type: "application/zip" });
  } catch {
    return fallbackCompress(filename, blob);
  }
}

export async function decompressJsonFromZip(file: Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    return await runInWorker("decompress", { data: arrayBuffer });
  } catch {
    return fallbackDecompress(file);
  }
}
```

`runInWorker` — helper koji kreira worker, šalje poruku, čeka odgovor, timeout 60s, terminira. Transfer `arrayBuffer` vlasništva radi zero-copy.

Fallback funkcije koriste stari JSZip-na-main-thread pristup.

---

## Bez promjena u potrošačima

`useCardExport.ts`, `useCardImport.ts`, `ExportImportDialog.tsx` — svi već koriste `import("@/lib/zip-service")` → automatski dobijaju worker verziju bez ikakvih izmjena.

---

## Fajlovi

| Fajl | Promjena |
|------|----------|
| `src/workers/zip-worker.ts` | **NOVO** — JSZip u worker kontekstu |
| `src/lib/zip-service.ts` | Worker-first sa fallback |

## Scope
- 2 fajla (1 nov, 1 ažuriran), ~80 linija
- Nema novih zavisnosti (jszip već postoji)
- Svi potrošači ostaju nepromijenjeni
- Timeout: 60s (vs 30s za DOCX — ZIP može biti veći)

