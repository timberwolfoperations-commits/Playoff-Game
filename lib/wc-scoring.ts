import { WcMatchStage } from '@/types';

export const WC_SCORING = {
  GROUP_WIN: 3,
  GROUP_DRAW: 1,
  ADVANCE_FROM_GROUP: 5,
  R32_WIN: 6,
  R16_WIN: 10,
  QF_WIN: 15,
  SF_WIN: 20,
  CHAMPION: 35,
} as const;

export const WC_SCORING_LABELS: Record<string, string> = {
  GROUP_WIN: 'Group stage win',
  GROUP_DRAW: 'Group stage draw',
  ADVANCE_FROM_GROUP: 'Advance from group',
  R32_WIN: 'Round of 32 win',
  R16_WIN: 'Round of 16 win',
  QF_WIN: 'Quarterfinal win',
  SF_WIN: 'Semifinal win',
  CHAMPION: 'Champion 🏆',
};

export const STAGE_ORDER: WcMatchStage[] = ['group', 'r32', 'r16', 'qf', 'sf', 'final'];

export const STAGE_LABELS: Record<WcMatchStage, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarterfinals',
  sf: 'Semifinals',
  final: 'Final',
};

export function knockoutStagePoints(stage: WcMatchStage): number {
  switch (stage) {
    case 'r32': return WC_SCORING.R32_WIN;
    case 'r16': return WC_SCORING.R16_WIN;
    case 'qf': return WC_SCORING.QF_WIN;
    case 'sf': return WC_SCORING.SF_WIN;
    case 'final': return WC_SCORING.CHAMPION;
    default: return 0;
  }
}

export const KNOCKOUT_STAGES: WcMatchStage[] = ['r32', 'r16', 'qf', 'sf', 'final'];
