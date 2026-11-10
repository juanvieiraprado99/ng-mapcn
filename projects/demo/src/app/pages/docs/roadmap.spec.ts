import { describe, expect, it } from 'vitest';

import {
  milestoneProgress,
  nextMilestones,
  shippedMilestones,
  stableMilestone,
} from './roadmap.data';
import { periodPt, ROADMAP_PT } from './roadmap.data.pt';

const milestones = [stableMilestone, ...nextMilestones, ...shippedMilestones];

describe('roadmap data', () => {
  it('computes progress from the deliverables', () => {
    const progress = milestoneProgress({
      id: 'x',
      title: 'X',
      status: 'ongoing',
      description: '',
      goals: [],
      deliverables: [
        { label: 'a', done: true },
        { label: 'b', done: false },
        { label: 'c', done: false },
      ],
    });
    expect(progress).toEqual({ done: 1, total: 3, percent: 33 });
  });

  it('reports 0% for a milestone without deliverables', () => {
    expect(
      milestoneProgress({
        id: 'x',
        title: 'X',
        status: 'planned',
        description: '',
        goals: [],
        deliverables: [],
      }).percent,
    ).toBe(0);
  });

  it('only lists completed milestones as shipped', () => {
    expect(shippedMilestones.every((m) => m.status === 'completed')).toBe(true);
  });

  it('marks every deliverable done on completed milestones', () => {
    for (const m of milestones.filter((m) => m.status === 'completed')) {
      expect(milestoneProgress(m).percent, m.id).toBe(100);
    }
  });

  it('has nothing done yet on planned milestones', () => {
    for (const m of milestones.filter((m) => m.status === 'planned')) {
      expect(milestoneProgress(m).done, m.id).toBe(0);
    }
  });

  it('uses unique anchor ids', () => {
    const ids = milestones.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a pt-BR translation for every milestone, with the same goals and deliverables', () => {
    expect(Object.keys(ROADMAP_PT).sort()).toEqual(milestones.map((m) => m.id).sort());
    for (const m of milestones) {
      const pt = ROADMAP_PT[m.id];
      expect(pt.goals.length, m.id).toBe(m.goals.length);
      expect(pt.deliverables.length, m.id).toBe(m.deliverables.length);
    }
  });

  it('writes the period month in Portuguese', () => {
    expect(periodPt('22.0.0-beta.7 · October 2026')).toBe('22.0.0-beta.7 · outubro de 2026');
    expect(periodPt('22.0.0')).toBe('22.0.0');
  });
});
