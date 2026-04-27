import * as migration_20260427_130537 from './20260427_130537';
import * as migration_20260427_141743 from './20260427_141743';

export const migrations = [
  {
    up: migration_20260427_130537.up,
    down: migration_20260427_130537.down,
    name: '20260427_130537',
  },
  {
    up: migration_20260427_141743.up,
    down: migration_20260427_141743.down,
    name: '20260427_141743'
  },
];
