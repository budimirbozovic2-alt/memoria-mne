## Final type-safety lockdown

Two-line change in `eslint.config.js`, then verification.

### 1. Add test override block

Insert a new config block after the critical-paths block (after line 70), allowing `any` in tests for partial mock construction:

```js
// Tests: partial mocks legitimately need `any`
{
  files: ["src/test/**/*.{ts,tsx}"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
},
```

### 2. Flip global rule to error

In `eslint.config.js` line 34:
```diff
- "@typescript-eslint/no-explicit-any": "warn",
+ "@typescript-eslint/no-explicit-any": "error",
```

Update the comment on lines 31-33 to reflect the new posture (zero-any enforced globally; tests exempted via override).

### 3. Verification

Run lint and `tsc --noEmit` to confirm:
- No `no-explicit-any` errors outside `src/test/**`
- No new TS compile errors
- Test files unaffected

A grep already confirms zero `: any | <any> | as any | any[]` outside `src/test/**`, so the flip should pass cleanly.

### Out of scope
No source-code edits expected. If lint surfaces a stray `any` we missed, fix it inline and re-run.