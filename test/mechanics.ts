// Mechanics checks, run with `npm test` after the smoke test. Each one is a
// short, seeded, deterministic run (a few hundred frames at most). No long
// fuzzing: if a check needs more than a second, shrink it.
//
// The suite lives in numbered section files (each under 300 lines) that share
// their imports, seed, and helpers through ./harness. Import order is the
// original single-file order, so the seeded RNG stream is unchanged.

import './11-deaths';
import './13-font-casts';
import './16-pets';
import './15-gale-stream';
import './14-tail';
import './19-skill-matrix';
