

# Edge-case testovi za FSRS algoritam

## Cilj
Dodati ~15 edge-case testova na kraj postojećeg `src/test/spaced-repetition.test.ts` koji pokrivaju granične vrijednosti koje trenutni testovi ne testiraju.

## Novi testovi

### Difficulty clamping (granice 1 i 10)
- Review + grade 4 sa difficulty=1 → difficulty ostaje 1 (ne ide ispod)
- Review + grade 1 sa difficulty=9 → difficulty=10 (ne prelazi 10)
- Review + grade 1 sa difficulty=10 → difficulty ostaje 10
- Višestruki grade 4 ne smanjuju difficulty ispod 1

### Stability blizu nule
- Review + grade 1 sa stability=0.1 → stability ostaje 0.1 (Math.max zaštita: 0.1 * 0.05 = 0.005 → clamped na 0.1)
- Review + grade 2 sa stability=0.1 → stability = max(0.2, 0.03) = 0.2
- Review + grade 1 sa stability=2 → stability = max(0.1, 0.1) = 0.1

### Interval overflow / extreme values
- Veoma visok stability (10000) → interval je finite i pozitivan
- targetRetention = 1.0 → interval = 0 (log(1)=0)
- targetRetention = 0.5 → interval značajno kraći od default 0.95
- stability = Number.MAX_SAFE_INTEGER → ne baca error, vraća finite broj

### Retrievability edge cases
- Section sa stability = 0.001 i lastReviewed 1 dan ranije → retrievability ≈ 0
- Section sa ogromnim stability (10000) → retrievability ≈ 100 čak i nakon mjeseci

### Score edge cases
- getSectionScore sa stability=30+ → score capped, ne prelazi 100
- getCardScore sa praznim sections nizom → 0

## Fajl
| Fajl | Promjena |
|------|----------|
| `src/test/spaced-repetition.test.ts` | Dodati ~15 testova na kraj fajla |

## Scope
- 1 fajl, ~80 linija dodano
- Čisto dodavanje, nema izmjena postojećih testova

