import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_TOOLS } from './index';

const ADMIN_DIR = join(process.cwd(), 'src', 'app', 'admin');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/** Vrai si la première instruction du fichier est la directive 'use server' (commentaires ignorés). */
export function isUseServerFile(src: string): boolean {
  const body = src.replace(/^﻿/, '').replace(/^(?:\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*/, '');
  return /^(['"])use server\1/.test(body);
}

/** Noms de tous les exports de VALEUR (les `export type` / `interface` sont ignorés). */
export function exportedValueNames(src: string): string[] {
  const names: string[] = [];
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s*\*?\s*(\w+)/g)) names.push(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var|class|enum)\s+(\w+)/g)) names.push(m[1]);
  for (const m of src.matchAll(/export\s+default\b/g)) names.push(`default@${m.index}`);
  if (/export\s*\*/.test(src)) names.push('*');
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const spec = part.trim();
      if (!spec || /^type\s/.test(spec)) continue;
      const alias = /\bas\s+(\w+)\s*$/.exec(spec);
      names.push(alias ? alias[1] : spec);
    }
  }
  return names;
}

// Exclusions MOTIVÉES uniquement. Ajouter une action admin sans outil MCP casse ce test.
// Phase B vide cette liste domaine par domaine.
const EXCLUDED: Record<string, string> = {
  adminInvoiceDownloadAction: 'phase B : à migrer',
  issueCreditNoteAction: 'phase B : à migrer',
  issuePeriodInvoiceAction: 'phase B : à migrer',
  loadInvoiceDataAction: 'phase B : à migrer',
  previewCreditNoteAction: 'phase B : à migrer',
  previewPeriodInvoiceAction: 'phase B : à migrer',
  verifyInvoiceHashAction: 'phase B : à migrer',
};

describe('MCP tool registry', () => {
  it('has unique snake_case tool names', () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n, n).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});

describe('scan helpers', () => {
  it('detects the use server directive after comments, not later or elsewhere', () => {
    expect(isUseServerFile("'use server';\nexport async function a() {}")).toBe(true);
    expect(isUseServerFile("// c\n/* b */\n\"use server\"\n")).toBe(true);
    expect(isUseServerFile("import x from 'y';\n'use server';")).toBe(false);
    expect(isUseServerFile("export const a = 1;")).toBe(false);
  });
  it('extracts function, const, braces with aliases, default and star; ignores types', () => {
    const src = [
      'export async function aAction() {}',
      'export function bAction() {}',
      'export const cAction = async () => {};',
      'export { x as dAction, eAction, type T };',
      'export type { U } from "./u";',
      'export type Foo = string;',
      'export interface Bar {}',
      'export default function () {}',
    ].join('\n');
    const names = exportedValueNames(src);
    expect(names).toEqual(expect.arrayContaining(['aAction', 'bAction', 'cAction', 'dAction', 'eAction']));
    expect(names.some((n) => n.startsWith('default@'))).toBe(true);
    expect(names).not.toContain('T');
    expect(names).not.toContain('U');
    expect(names).not.toContain('Foo');
    expect(names).not.toContain('Bar');
    expect(names).not.toContain('x');
  });
});

describe('MCP couvre toutes les server actions admin', () => {
  const serverFiles = sourceFiles(ADMIN_DIR).filter((f) => isUseServerFile(readFileSync(f, 'utf8')));
  const exportsByFile = serverFiles.map((f) => ({ f, names: exportedValueNames(readFileSync(f, 'utf8')) }));
  const exported = [...new Set(exportsByFile.flatMap((x) => x.names))];
  const covered = new Set(ALL_TOOLS.flatMap((t) => t.covers));

  it('trouve des fichiers use server (le scan ne doit pas être vide)', () => {
    expect(serverFiles.length).toBeGreaterThanOrEqual(9);
  });
  it('trouve toutes les actions connues (plancher exact : une baisse signale un scan cassé)', () => {
    expect(exported.length).toBeGreaterThanOrEqual(43);
  });
  it('tout export de valeur d\'un fichier use server se termine par Action', () => {
    const bad = exportsByFile.flatMap(({ f, names }) => names.filter((n) => !/Action$/.test(n)).map((n) => `${f} : ${n}`));
    expect(bad, 'exports non conformes (renommer en *Action ou sortir du fichier use server)').toEqual([]);
  });
  it.each(exported)('%s a un outil MCP ou une exclusion motivée', (name) => {
    expect(covered.has(name) || name in EXCLUDED, `${name} : ajouter un outil dans src/lib/server/mcp/tools/ ou une exclusion motivée`).toBe(true);
  });
  it('les exclusions et `covers` ne référencent que des actions existantes', () => {
    for (const n of [...covered, ...Object.keys(EXCLUDED)]) expect(exported, n).toContain(n);
  });
  it('une action couverte n\'est pas aussi exclue', () => {
    for (const n of Object.keys(EXCLUDED)) expect(covered.has(n), n).toBe(false);
  });
});
