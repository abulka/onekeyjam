# Scale-analysis referee harness

Status: built, run, and re-pointed at the shipped engine. Captured output in
`results.md`; machine-readable aggregates in `results.json`. The gate results
decided the `Scale changes` synthesis.

This is the maintained copy of the referee. The full three-model comparison,
the synthesis plan and the first-pass harnesses are preserved on the
`scale-analysis` branch under `analysis/`; this directory is what stays with
the main codebase.

The run covers the expanded classic library: 84 projects made of 46 exercises
(the ii-V drills, turnarounds, blues forms and tutorials) and 38 pieces of
repertoire, 362 unique chord roots and 500 triggers. Section 0 reports the
repertoire-only numbers so the exercise skew stays visible.

After the synthesis landed, the harness was switched from its local prototypes
to the shipped code: `steady` and `tension` come from `POLICY_PRESETS` and the
preferPrimary term and tension palette are resolved inside
`src/lib/autoScale.js`. The gate numbers reproduced the prototype run exactly,
which is the post-implementation verification the plan asked for. Presets
deleted from the engine (`progression`, `lyrical`, `melodic`, `colourful`) are
kept here only as comparison baselines.

## Base

* Engine path: the full-engine approach from the first-pass Qwen harness -
  `chooseScaleForChord`'s building blocks, `recordSoloNote`, `chordShapeFor`,
  history hand-off and a mirrored `applyScalePolicy` state machine - with
  `POLICY_PRESETS` imported from the engine rather than copied.
* Safety gate: `checkScaleAgainstChord` on every pick, as in the first-pass
  DeepSeek harness.
* Musical probes: per-group change rates, the So What return, doo-wop and
  secondary-dominant traces, and a held colour-note scenario, following Muse.
* Counting: 500 triggers in song order; shuffle over 20 seeds. Percentages are
  returns on new chord symbols, with same-symbol rows tracked separately.

An important bug fix over the original Qwen supplement: `Tonal.Note.name(4)`
returns an empty string, not a note, so Qwen's held-note scenarios silently
passed no note into the engine. This harness names pitch classes from a table,
so the phrase measurements are real.

## Sections and how to run

```sh
sh research/scale-analysis/run.sh            # all sections and gates
sh research/scale-analysis/run.sh steady     # one section
SEEDS=50 sh research/scale-analysis/run.sh follow
```

Sections: `corpus`, `follow`, `shuffle`, `repeat`, `safe`, `steady`,
`dominant`, `phrase`, `options`, `gates`.

0. **Corpus.** Project counts and the style metrics restricted to the 38 real
   pieces, so exercise-driven results can be spotted.
1. **Follow regression.** Fourteen shipped and candidate styles with the
   repeat hold on and off.
2. **Shuffle regression.** Subtle, Varied and Wild over 20 seeds.
3. **Repeat hold.** Stabbing the same chord config four times, raw versus the
   planned hold, plus song-row churn (which the hold does not affect because
   those are distinct chord ids).
4. **Safe styles.** Manual and follow under the diatonic and jazz colours,
   with the clash gate.
5. **Steady.** `preferPrimary` at strengths 0.25, 0.5, 1 and 2 on the diatonic
   colour, plus a jazz variant, with the So What, doo-wop and secondary-
   dominant traces.
6. **Dominant tension versus Bold leap.** Both candidates head to head.
7. **Phrase reality check.** Held third, held root, a distinguishing colour
   note and an outside note, with phrase off versus on.
8. **Option matrix.** One-at-a-time sweeps of every low-level option.

## What the expanded-corpus run settled

* **G1 Steady: PASS.** Diatonic colour plus `preferPrimary: 1` returns to
  D dorian on the So What vamp, differs from the plain safe follow on 7.0
  percent of triggers (14.2 percent is the safe colour's own difference from
  jazz), has zero clash failures, keeps the diatonic-pop change rate at 10.3
  percent, and picks A mixolydian for the A7 on the secondary dominants chart.
* **G2 Melody backing: PASS.** Resolve keeps the held colour note at 79.0
  percent, better than melodic's 74.4 percent, at a normal change rate of 55.4
  percent against melodic's forced 100. `Follow the melody` should be re-backed
  on Resolve.
* **G3 dominant tension: WINS over Bold leap.** Gated colour only on dominant
  chords differs from Simple on 18.2 percent of triggers (leap: 76.2), places
  57.4 percent of its changes on dominants (leap: 48.2), has zero clashes and
  zero stab churn after the hold.
* **G4 phrase bias: KEEP hidden.** It changes 0.8 percent of picks at a held
  chord third (inert, because every stored slot contains it) but 64.4 percent
  at a distinguishing colour note.
* **G5 manual safe: PASS.** 64 of 362 unique chord roots change their first
  scale between the diatonic and jazz colours, across 51 of 84 projects
  (55 m7, 5 m7b5, 4 maj7), zero clash failures.
* **Repeat hold.** Without the fix, melodic and leap stab
  `C major -> C lydian -> C major -> C lydian`; with the hold they stay on
  `C major`. A repeated G7 under tension alternates with lydian dominant raw
  and holds with the fix.
* **Repertoire-only check.** The same direction holds on the 38 real pieces:
  Simple 60.2 percent, follow-safe 59.7 percent with a 16.6 percent diff,
  steady 60.6 percent with a 20.9 percent diff, tension 87.6 percent with a
  15.2 percent diff, leap 100 percent with an 80.1 percent diff.
* **Option matrix.** `contextChords` moves 0.0 percent of picks;
  `deferWhilePlaying` cuts the change rate by 20.0 percent and removes 493
  same-row flips while notes are held; spread moves 3.4 percent and 0.66
  notes per change; dwell moves 228 same-row flips; variety 3.4 percent;
  pool 1.9 percent; changeChance 0.8 percent.

## Ship gates

* **G1 Steady.** So What return picks D dorian; at most 15 percent library diff
  against the plain safe follow; no clash failures; no rise in diatonic-pop
  change rate; idiomatic mixolydian survives on secondary dominants. Passed.
* **G2 Melody backing.** Keeps a held colour note at least 70 percent of
  changes at a normal change rate at or below 60 percent and no worse than the
  melodic palette. Passed.
* **G3 Leap versus dominant tension.** Zero clashes, zero stab churn after the
  hold, changes concentrated on dominants. Dominant tension passed; Bold leap
  did not ship.
* **G4 Phrase.** Phrase bias must change more than two percent of picks under
  at least one realistic scenario. It does. Kept.
* **G5 Manual safe.** 64 of 362 with zero clashes. Passed.

## Files

* `harness.mjs` - sections 0 to 7 plus gate evaluation. Relative imports from
  `../../../src/lib/*`.
* `run.sh` - esbuild bundle to `$TMPDIR`, section argument and `SEEDS=`.
* `results.md` - the captured run the plan quotes.
* `results.json` - per-section aggregates and gate verdicts.
* `README.md` - this file.

## Known limits

* The `steady` and `tension` behaviour now lives in the engine and is what
  this harness drives; the legacy preset keys it still lists exist only as
  comparison baselines for the synthesis.
* The shuffle model mirrors the dwell, hold, change-chance and closest-fit
  rules; the held-note closest branch is exercised through the option matrix
  rather than the main regression.
* The 24 new song excerpts are first-eight-bar simplifications, pending an ear
  or chart check. They broaden the sample but are not full arrangements.
* Wild carries one measured clash in 10,000 seeded draws; that is its stated
  adventurous job, not a gate failure.
