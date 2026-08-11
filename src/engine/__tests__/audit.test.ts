import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AuditLog, toCsv } from '../audit';

describe('audit log', () => {
  it('appends in order with monotonic ids and a fixed ruleset version', () => {
    const log = new AuditLog('reviewer', () => '2025-06-02T09:15:00.000Z');
    log.append({ eventType: 'DOCUMENT_INGESTED', detail: 'first' });
    log.append({ eventType: 'COMPARISON_RUN', detail: 'second' });

    const events = log.events();
    expect(events.map((e) => e.id)).toEqual(['AE-00001', 'AE-00002']);
    expect(events.map((e) => e.detail)).toEqual(['first', 'second']);
    expect(new Set(events.map((e) => e.rulesetVersion)).size).toBe(1);
  });

  it('hands out a copy, so a caller cannot edit the record', () => {
    const log = new AuditLog();
    log.append({ eventType: 'REPORT_EXPORTED', detail: 'original' });

    const stolen = log.events();
    stolen.pop();
    stolen.push({
      id: 'AE-99999',
      timestamp: 'whenever',
      actor: 'nobody',
      eventType: 'QC_SIGNED_OFF',
      detail: 'forged',
      rulesetVersion: '0.0.0',
    });

    expect(log.events()).toHaveLength(1);
    expect(log.events()[0].detail).toBe('original');
  });

  it('freezes each event so an individual record cannot be rewritten', () => {
    const log = new AuditLog();
    const event = log.append({ eventType: 'FINDING_REVIEWED', detail: 'confirmed' });
    expect(() => {
      (event as { detail: string }).detail = 'dismissed';
    }).toThrow();
    expect(log.events()[0].detail).toBe('confirmed');
  });

  it('exports to CSV with quoting that survives commas and quotes in the detail', () => {
    const log = new AuditLog('qa', () => '2025-06-02T09:15:00.000Z');
    log.append({ eventType: 'FINDING_REVIEWED', detail: 'F-001 CONFIRMED — "450, not 445"' });
    const csv = toCsv(log.events());
    expect(csv.split('\n')[0]).toBe('id,timestamp,actor,eventType,rulesetVersion,detail');
    expect(csv).toContain('"F-001 CONFIRMED — ""450, not 445"""');
  });
});

describe('no deletion path exists in the codebase', () => {
  /**
   * A structural test rather than a behavioural one. The claim made to a
   * regulatory buyer is "there is no way to delete an audit event from this
   * application" — so the test reads the source and checks that no mutation of
   * the audit log was introduced later by someone who did not read this file.
   */
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return /\.(ts|tsx)$/.test(entry) && !full.includes('__tests__') ? [full] : [];
    });
  }

  it('never mutates an audit log outside of append()', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(join(process.cwd(), 'src'))) {
      const source = readFileSync(file, 'utf8');
      for (const [i, line] of source.split('\n').entries()) {
        if (/\b(events|auditLog|audit)\b[^\n]*\.(splice|shift|pop|length\s*=)/.test(line)) {
          offenders.push(`${file}:${i + 1} ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('exposes no delete or clear method on AuditLog', () => {
    const methods = Object.getOwnPropertyNames(AuditLog.prototype);
    expect(methods).not.toContain('delete');
    expect(methods).not.toContain('remove');
    expect(methods).not.toContain('clear');
    expect(methods).not.toContain('update');
  });
});
