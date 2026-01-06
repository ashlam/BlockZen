const { DEFAULT_WEIGHTS, LEVEL_CONFIG } = require('./levels');

const CHALLENGES = [
  {
    id: 1,
    name: '入门试炼',
    levelId: 1,
    board: { occupied: [[3,3],[4,3],[5,3],[3,4],[5,4],[3,5],[4,5],[5,5]] },
    tasks: [
      { type: 'score_at_least', target: 300 },
      { type: 'clear_areas_total', target: 5 },
      { type: 'combo_total', target: 2 },
      { type: 'combo_consecutive', target: 2 }
    ],
    restrictions: [
      { type: 'steps_limit', steps: 20 },
      { type: 'count_only_pieces', allowed: [1,11] }
    ]
  },
  {
    id: 2,
    name: '障碍工坊',
    levelId: 2,
    board: { occupied: [[0,8],[1,8],[2,8],[6,0],[7,0],[8,0],[4,4]] },
    tasks: [
      { type: 'score_at_least', target: 500 },
      { type: 'clear_areas_total', target: 8 },
      { type: 'combo_consecutive', target: 3 }
    ],
    restrictions: [
      { type: 'steps_limit', steps: 25 }
    ]
  }
];

module.exports = { CHALLENGES };
