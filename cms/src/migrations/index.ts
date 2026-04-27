import * as migration_20260427_130537 from './20260427_130537';
import * as migration_20260427_141743 from './20260427_141743';
import * as migration_20260427_143354 from './20260427_143354';

export const migrations = [
  {
    up: migration_20260427_130537.up,
    down: migration_20260427_130537.down,
    name: '20260427_130537',
  },
  {
    up: migration_20260427_141743.up,
    down: migration_20260427_141743.down,
    name: '20260427_141743',
  },
  {
    up: migration_20260427_143354.up,
    down: migration_20260427_143354.down,
    name: '20260427_143354'
  },
];
