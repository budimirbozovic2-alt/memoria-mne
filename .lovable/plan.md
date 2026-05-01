## Plan: Essay Wizard layout identical to editor

Refactor `SmartSplitSummaryDialog` so it follows the same mental model as `CardForm` / `EditorSection`: large editor-first content area, question type at the top, module sections in stacked cards, and metadata after the editor. The goal is to make the wizard feel like the existing editor, while preserving the source-selection creation flow.

## UX changes

1. **Remove the current two-column wizard structure**
   - Remove the left module rail that consumes horizontal space.
   - Remove the compact top taxonomy block that appears before editing.
   - Replace the cramped `grid-cols-[220px_1fr]` layout with an editor-like single-column flow.

2. **Make the wizard visually match `CardForm` + `EditorSection`**
   - Use the same stacked layout pattern:
     - top header/action row,
     - question-type toggle row,
     - question editor,
     - module/section cards,
     - metadata panel,
     - full-width create button/footer actions.
   - Dialog will be widened (`max-w-5xl` or `max-w-6xl`) so the primary editing area has room comparable to editor width.

3. **Question type placement like the editor**
   - Add an editor-style type toggle at the top.
   - Since this wizard creates essays from sources, the toggle will show `Esejsko pitanje` as active and `Blic pitanje` disabled or omitted depending on cleanest UI fit. The visible placement will match the editor’s logic, without introducing new flash-card creation behavior.

4. **Module sections behave like editor sections**
   - Each wizard module becomes a card visually matching `EditorSection` essay section cards:
     - optional move up/down buttons,
     - module title input,
     - scissors button,
     - delete button when more than one module exists,
     - content textarea or cutting view.
   - The current “Pitanje (kako će biti zapamćeno)” field will be presented as the module title/question field in the same position as `Naziv cjeline...` in the editor.
   - The content editor gets most of the vertical space. Increase rows/min-height so splitting/editing is the dominant part of the wizard.

5. **Manual split remains identical to editor scissors**
   - Keep the existing manual paragraph scissors behavior.
   - Move the scissors button into each module card header, same as `EditorSection`.
   - Cutting view will keep the same semantics:
     - click scissors line between paragraphs,
     - text before cut stays in current module,
     - first paragraph after cut becomes the new module title,
     - remaining paragraphs become new module content.

6. **Metadata placement like editor**
   - Move subcategory and chapter selectors below the module editor, in a bordered `Metapodaci` panel similar to `MetadataSection`.
   - Keep them scoped to the current source category and still apply globally to the created essay.
   - Keep the parent essay title near the editor header as the main card question/name, because it is the parent essay name.

7. **Navigation without wasting space**
   - Since the rail is removed, use stacked module cards as the primary navigation.
   - Keep module order visible by numbering cards and allowing direct editing in-place.
   - Footer no longer needs previous/next navigation for normal use; it can focus on `Otkaži` and `Kreiraj esej`.

## Technical scope

Primary file:
- `src/components/source-reader/SmartSplitSummaryDialog.tsx`

Likely changes:
- Remove imports no longer needed for rail navigation (`ChevronLeft`, `ChevronRight`, `SkipForward`, possibly `Badge` usages tied only to the rail).
- Add editor-style icons if needed (`FileText`, `ChevronUp`, `ChevronDown`, maybe `Zap` if a disabled type toggle is shown).
- Replace the current JSX body from the top taxonomy block through the rail/right-pane editor with a `form`/single-column editor layout.
- Reuse existing state and store setters:
  - `splitParentName` as the parent essay title.
  - `splitModules` / `splitEdits` as the module section list.
  - `wizardSubcategoryId` / `wizardChapterId` for metadata.
- Add small helpers mirroring editor section actions:
  - `moveModule(from, to)` to reorder `splitModules` and `splitEdits` together.
  - `setCuttingIndex(number | null)` instead of a single boolean if multiple stacked module cards are visible.
- Keep the existing `performManualCut` logic, adapted to accept `moduleIndex` and `paragraphIndex` so each visible module card can be split directly.
- Keep `plainTextToHtml`, sanitization path, DirtyConfirmBar, and `onSmartSplitConfirm` unchanged.

## What will not be changed

- No changes to persistence, card creation, source linking, taxonomy data model, or `useSourceReaderActions` creation logic.
- No automatic splitting reintroduced.
- No preview panel reintroduced.
- No backend/database changes.
- No unrelated refactors outside the wizard unless a type/import cleanup is required.

## Verification

After implementation:
- Ensure TypeScript compiles under the existing zero-any policy.
- Smoke-test expected flow mentally/code-wise:
  - select source text,
  - open essay wizard,
  - see editor-like layout,
  - edit parent essay title,
  - edit module question/title and content in large module card,
  - activate scissors in a module,
  - split at chosen paragraph,
  - new module appears directly below with first paragraph after split as title,
  - set subcategory/chapter in metadata,
  - create essay.