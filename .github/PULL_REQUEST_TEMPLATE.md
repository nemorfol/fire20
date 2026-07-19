<!--
  Grazie per il contributo! Compila la descrizione e spunta la checklist.
  Ricorda: lingua italiana, conventional-commit, Svelte 5 runes. Vedi CONTRIBUTING.md.
-->

## Descrizione

<!-- Cosa cambia questa PR e perché. -->

## Issue collegata

<!-- Es. "Chiude #NN". Se non c'è una issue, spiega il contesto. -->

## Tipo di modifica

- [ ] Bug fix (`fix:`)
- [ ] Nuova funzionalità (`feat:`)
- [ ] Refactor / manutenzione (`refactor:` / `chore:`)
- [ ] Documentazione (`docs:`)

## Checklist

- [ ] `npm run check` verde (svelte-check + type check)
- [ ] `npm test` verde (Vitest); ho aggiunto/aggiornato i test se ho toccato il motore
- [ ] Se è una **feature utente**: ho aggiunto/aggiornato il capitolo nella guida
      (`src/lib/guida/steps.ts`)
- [ ] Ho considerato la **retrocompatibilità dei profili** salvati: nuovi campi `Profile`
      normalizzati in `loadProfileIntoState`, stato iniziale e default; migrazione Dexie
      testata se necessaria (`src/lib/db/migration.test.ts`)
- [ ] Se ho toccato **valori fiscali** (`assumptions.ts` o simili): ho citato la fonte
      normativa nel commento
- [ ] Ho aggiornato il [`CHANGELOG.md`](../CHANGELOG.md) (sezione «Non rilasciato»)
- [ ] Commit in italiano, conventional-commit; nessun dato personale nel diff

## Note per il review

<!-- Qualsiasi cosa il reviewer debba sapere: scelte di design, aree da verificare a mano, ecc. -->
