import { RULESET_VERSION } from '../study';
import type { AuditEvent, AuditEventType } from './types';

/**
 * Append-only audit log.
 *
 * There is deliberately no `delete`, `update`, `splice`, or `clear` method on
 * this class, and no code path anywhere in the application that removes an
 * event. `events()` returns a defensive copy so a consumer cannot mutate the
 * record it was handed. That is the whole design: 21 CFR Part 11 expects an
 * audit trail that cannot be altered by the operator, and the cheapest way to
 * be able to say that truthfully is to never write the method.
 */
export class AuditLog {
  private readonly log: AuditEvent[] = [];
  private sequence = 0;

  constructor(
    private readonly actor: string = 'system',
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  append(event: {
    eventType: AuditEventType;
    detail: string;
    actor?: string;
    timestamp?: string;
  }): AuditEvent {
    const record: AuditEvent = Object.freeze({
      id: `AE-${String(++this.sequence).padStart(5, '0')}`,
      timestamp: event.timestamp ?? this.clock(),
      actor: event.actor ?? this.actor,
      eventType: event.eventType,
      detail: event.detail,
      rulesetVersion: RULESET_VERSION,
    });
    this.log.push(record);
    return record;
  }

  /** Chronological. Returns a copy — the caller cannot reach the record. */
  events(): AuditEvent[] {
    return [...this.log];
  }

  get length(): number {
    return this.log.length;
  }
}

export function toCsv(events: AuditEvent[]): string {
  const header = ['id', 'timestamp', 'actor', 'eventType', 'rulesetVersion', 'detail'];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = events.map((e) =>
    [e.id, e.timestamp, e.actor, e.eventType, e.rulesetVersion, e.detail].map(escape).join(','),
  );
  return [header.join(','), ...rows].join('\n');
}
