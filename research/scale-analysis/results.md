# Scale-analysis referee: captured run

Captured from the project root with `sh research/scale-analysis/run.sh all` (SEEDS=20, sections 0-7 plus gates) over the 84-project classic library (60 original + 24 real-song excerpts).

The harness drives the shipped engine: `steady` and `tension` come from `POLICY_PRESETS` and the preferPrimary term and tension palette are resolved inside `src/lib/autoScale.js`. Machine-readable aggregates: `results.json`. See `README.md`.

```
DeepSeek harness2 - section: all

=== 0. Corpus composition and repertoire-only check ===
projects: 84, exercises: 46 (ii-V drills, turnarounds, blues forms, tutorials), repertoire: 38
style          repertoire changeRate  repertoire diffVsSimple  full changeRate
simple                        60.2%                   0.0%           55.4%
follow-safe                   59.7%                  16.6%           54.5%
steady-100                    60.6%                  20.9%           55.4%
resolve                       60.2%                   0.0%           55.4%
melodic                      100.0%                  29.5%          100.0%
leap                         100.0%                  80.1%          100.0%
tension                       87.6%                  15.2%           84.0%

=== 1a. Follow styles: library regression, repeat hold on/off ===
projects: 84, style count: 15
style           colour     triggers changeRate sameChord(off/on) useful cosmetic harmful clashes auto avgNew diffVsSimple(hold-on)
simple          jazz       500         55.4%        0/0      5      194       2       0    0   1.80    0.0%
progression     jazz       500         55.4%        0/0      5      194       2       0    0   1.80    0.0%
lyrical         jazz       500         55.4%        0/0      5      194       2       0    0   1.80    0.0%
melodic         jazz       500        100.0%      53/53      5      356       2       0    0   1.31   29.8%
resolve         jazz       500         55.4%        0/0      5      194       2       0    0   1.80    0.0%
colourful       jazz       500        100.0%      53/53      5      356       2       0    0   1.31   29.8%
leap            jazz       500        100.0%      53/53      5      356       2       0    0   2.53   76.2%
follow-safe     diatonic   500         54.5%        0/0      5      191       2       0    0   1.58   14.2%
safe-melodic    diatonic   500        100.0%      53/53      5      356       2       0    0   1.19   39.2%
steady-25       diatonic   500         54.5%        0/0      5      191       2       0    0   1.58   14.2%
steady-50       diatonic   500         54.5%        1/1      5      191       2       0    0   1.44   17.8%
steady-100      diatonic   500         55.4%        0/0      5      194       2       0    0   1.58   19.6%
steady-200      diatonic   500         55.4%        0/0      5      194       2       0    0   1.64   19.8%
steady-jazz-50  jazz       500         64.5%        4/4      5      227       2       0    0   1.56    8.0%
tension         jazz       500         84.0%      20/20      5      298       2       0    0   1.49   18.2%

=== 1b. Shuffle styles: library regression ===
seeded passes per project: 20
style  triggers changeRate sameChord useful cosmetic harmful clashes auto% avgNew
subtle 10000        73.1%        59    100     5165      40       0   0.0%   1.76
varied 10000        81.2%       503     99     5757      40       0   7.9%   1.27
wild   10000        84.8%       577    100     6015      38       1  10.0%   1.93

=== 2. Follow repeat hold before and after ===
same-chord churn on consecutive song rows (distinct chord ids; the stab hold does not apply):
  simple       without hold:    0   with the planned hold:    0
  melodic      without hold:   53   with the planned hold:   53
  colourful    without hold:   53   with the planned hold:   53
  leap         without hold:   53   with the planned hold:   53
  tension      without hold:   20   with the planned hold:   20
  follow-safe  without hold:    0   with the planned hold:    0

stabbing the same Cmaj7 config four times on ii-V-I in C major.json:
  simple    raw: C major -> C major -> C major -> C major                     with hold: C major -> C major -> C major -> C major
  melodic   raw: C major -> C lydian -> C major -> C lydian                   with hold: C major -> C major -> C major -> C major
  leap      raw: C major -> C lydian -> C harmonic major -> C lydian          with hold: C major -> C major -> C major -> C major

stabbing the same G7 config four times (tension gating; raw colour alternates):
  tension   raw: G mixolydian -> G lydian dominant -> G mixolydian -> G lydian dominant with hold: G mixolydian -> G mixolydian -> G mixolydian -> G mixolydian
  leap      raw: G mixolydian -> G lydian dominant -> G mixolydian b6 -> G lydian dominant with hold: G mixolydian -> G mixolydian -> G mixolydian -> G mixolydian

=== 3. Safe styles cross-check (full path) ===
projects: 84, unique chords: 362
manual: diatonic vs jazz first scale differs on 64 chords in 51 projects
  by chord quality: m7 55, m7b5 5, maj7 4
clash failures: diatonic 0, jazz 0, adventurous 0
first scales with an unlicensed out-of-key note: diatonic 69, jazz 112, adventurous 216

first 12 safe-vs-jazz differences:
  50s doo-wop in C.json: Am7 safe=A aeolian jazz=A dorian
  50s doo-wop in D.json: Bm7 safe=B aeolian jazz=B dorian
  50s doo-wop in F.json: Dm7 safe=D aeolian jazz=D dorian
  50s doo-wop in G.json: Em7 safe=E aeolian jazz=E dorian
  All the Things You Are in Ab.json: Fm7 safe=F aeolian jazz=F dorian
  All the Things You Are in Ab.json: Dm7 safe=D aeolian jazz=D dorian
  Alone Together in D minor.json: Dm7 safe=D aeolian jazz=D dorian
  Autumn Leaves in G minor.json: Gm7 safe=G aeolian jazz=G dorian
  Beautiful Love in D minor.json: Dm7 safe=D aeolian jazz=D dorian
  Blue Bossa in C minor.json: Cm7 safe=C aeolian jazz=C dorian
  Blue Moon in C.json: Am7 safe=A aeolian jazz=A dorian
  Blues for Alice in F.json: Em7b5 safe=E locrian jazz=E locrian #2

follow: diatonic colour differs from jazz on 71/500 triggers (14.2%)
follow melodic: diatonic colour differs from jazz on 109/500 triggers (21.8%)
clash failures follow-safe 0, follow-simple 0, safe-melodic 0

=== 4. Steady prototype (preferPrimary) ===
variant           colour     diffVsFollowSafe  changeRate  sameChord  clashes  diatonicPopRate
steady-25         diatonic        0.0%        54.5%          0        0           10.3%
steady-50         diatonic        3.6%        54.5%          1        0           10.3%
steady-100        diatonic        7.0%        55.4%          0        0           10.3%
steady-200        diatonic        8.8%        55.4%          0        0           10.3%
steady-jazz-50    jazz           22.2%        64.5%          4        0           56.9%
reference: follow-safe changeRate 54.5%, diatonicPop 10.3%
reference: simple changeRate 55.4%, diatonicPop 12.1%

So What in D minor (Dm7 Dm7 Ebm7 Ebm7 Dm7 Dm7) picks:
  simple       D dorian | D dorian | Eb dorian | Eb dorian | D aeolian | D aeolian
  follow-safe  D dorian | D dorian | Eb dorian | Eb dorian | D aeolian | D aeolian
  steady-25    D dorian | D dorian | Eb dorian | Eb dorian | D aeolian | D aeolian
  steady-50    D dorian | D dorian | Eb dorian | Eb dorian | D aeolian | D dorian
  steady-100   D dorian | D dorian | Eb dorian | Eb dorian | D dorian | D dorian
  steady-200   D dorian | D dorian | Eb dorian | Eb dorian | D dorian | D dorian

50s doo-wop in C (Am7 pick; stored A dorian):
  simple       A aeolian
  follow-safe  A aeolian
  steady-25    A aeolian
  steady-50    A aeolian
  steady-100   A aeolian
  steady-200   A aeolian

Secondary dominants in C (A7 pick):
  simple       A mixolydian b6
  follow-safe  A mixolydian b6
  steady-25    A mixolydian b6
  steady-50    A mixolydian b6
  steady-100   A mixolydian
  steady-200   A mixolydian

=== 5. Dominant-only tension versus Bold leap ===
style      diffVsSimple  changesOnDominant%  sameChord(hold)  clashes  auto
tension           18.2%              57.4%               20        0     0
leap              76.2%              48.2%               53        0     0
melodic           29.8%              48.2%               53        0     0

traces (simple | tension | leap):
  Fly Me to the Moon in C.json
    Am7       simple: A dorian             tension: A dorian             leap: A dorian
    Dm7       simple: D dorian             tension: D dorian             leap: D minor pentatonic
    G7        simple: G mixolydian         tension: G lydian dominant    leap: G lydian dominant
    Cmaj7     simple: C major              tension: C major              leap: C lydian
    Fmaj7     simple: F lydian             tension: F lydian             leap: F harmonic major
    Bm7b5     simple: B locrian            tension: B locrian            leap: B minor blues
    E7        simple: E mixolydian b6      tension: E mixolydian b6      leap: E lydian dominant
    Am7       simple: A dorian             tension: A dorian             leap: A minor pentatonic
  Blues for Alice in F.json
    Fmaj7     simple: F major              tension: F major              leap: F major
    Em7b5     simple: E locrian            tension: E locrian            leap: E minor blues
    A7        simple: A mixolydian b6      tension: A mixolydian b6      leap: A lydian dominant
    Dm7       simple: D dorian             tension: D dorian             leap: D minor pentatonic
    G7        simple: G mixolydian         tension: G lydian dominant    leap: G lydian dominant
    Cm7       simple: C dorian             tension: C dorian             leap: C minor pentatonic
    F7        simple: F mixolydian         tension: F lydian dominant    leap: F lydian dominant
    Bbmaj7    simple: Bb major             tension: Bb major             leap: Bb lydian
  Secondary dominants in C.json
    Cmaj7     simple: C major              tension: C major              leap: C major
    A7        simple: A mixolydian b6      tension: A mixolydian b6      leap: A lydian dominant
    Dm7       simple: D dorian             tension: D dorian             leap: D minor pentatonic
    B7        simple: B mixolydian b6      tension: B mixolydian b6      leap: B mixolydian
    Em7       simple: E dorian             tension: E dorian             leap: E minor pentatonic
    E7        simple: E mixolydian         tension: E mixolydian         leap: E lydian dominant
    Am7       simple: A dorian             tension: A dorian             leap: A minor pentatonic
    G7        simple: G mixolydian         tension: G mixolydian         leap: G lydian dominant

=== 6. Phrase reality check ===
pick changes with phraseBias on versus off (same solo note scenario):
preset   scenario  diffPicks  diff%  changeRate  heldNoteKept%
simple   none             0   0.0%       55.4%              -
simple   third            4   0.8%       55.4%          80.5%
simple   root             3   0.6%       55.1%          93.5%
simple   colour         261  52.2%       82.4%          61.2%
simple   outer          220  44.0%       78.5%          50.0%
lyrical  none             0   0.0%       55.4%              -
lyrical  third            4   0.8%       55.4%          80.5%
lyrical  root             3   0.6%       55.1%          93.5%
lyrical  colour         261  52.2%       82.4%          61.2%
lyrical  outer          220  44.0%       78.5%          50.0%
resolve  none             0   0.0%       55.4%              -
resolve  third            4   0.8%       55.4%          80.5%
resolve  root             4   0.8%       55.1%          93.8%
resolve  colour         322  64.4%       88.4%          79.0%
resolve  outer          213  42.6%       80.7%          54.2%

G2 reference: resolve, held colour note: kept 79.0% at changeRate 88.4%
G2 reference: melodic, held colour note: kept 74.4% at changeRate 100.0%

=== 7. Option marginal-effect matrix ===
option            style    base -> variant          dChangeRate  dSameChord  dClash  dAvgNew
contextChords     simple   {"contextChords":1}      -> {"contextChords":2}            0.0%          0       0     0.00
phraseBias        resolve  {"phraseBias":false}     -> {"phraseBias":true}           33.1%          0       0     0.28
phraseStrength    lyrical  {"phraseStrength":1}     -> {"phraseStrength":2}           6.1%        -10       0     0.54
palette           simple   {"palette":"primary"}    -> {"palette":"colour"}          44.6%         53       0    -0.49
palette           simple   {"palette":"primary"}    -> {"palette":"bold"}            44.6%         53       0     0.73
poolSize          subtle   {"poolSize":3}           -> {"poolSize":5}                 1.9%         24       0     0.02
dwell             subtle   {"dwell":2}              -> {"dwell":1}                    1.9%        228       0    -0.38
changeChance      subtle   {"changeChance":1}       -> {"changeChance":0.5}           0.8%        -32       0     0.07
maxNewNotes       varied   {"maxNewNotes":1}        -> {"maxNewNotes":7}              3.4%         42       0     0.66
deferWhilePlaying varied   {"deferWhilePlaying":false,"notesHeld":true} -> {"deferWhilePlaying":true,"notesHeld":true}     -20.0%       -493       0     0.18
variety           subtle   {"variety":"gentle"}     -> {"variety":"lively"}           3.4%         18       0     0.07

=== SHIP GATES ===
G1 Steady (preferPrimary): PASS
  best variant steady-100: So What return D dorian, diff 7.0%, clashes 0, diatonicPop 10.3% vs safe 10.3%
  doo-wop Am7: A aeolian; secondary-dominant A7: A mixolydian
G2 Melody backing (Resolve, held colour note): PASS (kept 79.0% vs melodic 74.4%, normal changeRate 55.4%)
G3 dominant tension vs Bold leap: tension WINS
  tension: diff vs simple 18.2%, changes on dominants 57.4%, clashes 0, stab churn after hold 0, song-row flips 20
  leap:    diff vs simple 76.2%, changes on dominants 48.2%, clashes 0, stab churn after hold 0, song-row flips 53
G4 phrase bias: KEEP hidden
  held chord tones (third/root): largest pick change 0.8% at simple/third (inert, as every stored slot contains them)
  distinguishing colour notes: largest pick change 64.4% at resolve/colour
G5 manual safe cross-check: PASS (64 of 362 unique chords, clashes {"diatonic":0,"jazz":0,"adventurous":0})

Gate results written to research/scale-analysis/results.json

Harness2 complete. See research/scale-analysis/README.md.
```
