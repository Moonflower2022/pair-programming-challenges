// lib/challenges/index.ts
import type { ChallengeContext } from './base';
import type { Challenge } from './base';

// Re-export base types
export * from './base';

// Import challenge classes
import { NoForLoops } from './NoForLoops';
import { ActivityTimer } from './ActivityTimer';
import { AlternatingLines } from './AlternatingLines';
import { BlindCoding } from './BlindCoding';

// Re-export individual challenges
export { NoForLoops, ActivityTimer, AlternatingLines, BlindCoding };

// Registry for dynamic instantiation
type ChallengeConstructor = new (context: ChallengeContext, ...args: any[]) => Challenge;

export const CHALLENGES: Record<string, ChallengeConstructor> = {
    'no-for-loops': NoForLoops,
    'activity-timer': ActivityTimer,
    'alternating-lines': AlternatingLines,
    'blind-coding': BlindCoding,
};