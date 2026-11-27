/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { syncEngine } from '../lib/sync.ts';
import { supabase } from '../lib/supabase.ts';
import { db } from '../lib/db.ts';
import { readFilesConcat } from './helpers/sourceReader.ts';

describe('SyncEngine reconciliation & Demo seed isolation', () => {
  it('does not overwrite local Dexie data in pullRemoteData when no Supabase session is active', async (t) => {
    const origNav = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });

    const sessionStub = t.mock.method(supabase.auth, 'getSession', async () => ({
      data: { session: null },
      error: null,
    }));
    const fromStub = t.mock.method(supabase, 'from', () => {
      throw new Error('Should not query Supabase tables without authenticated session');
    });

    try {
      await syncEngine.pullRemoteData();
      assert.equal(fromStub.mock.callCount(), 0);
    } finally {
      sessionStub.mock.restore();
      fromStub.mock.restore();
      Object.defineProperty(globalThis, 'navigator', {
        value: origNav,
        configurable: true,
      });
    }
  });

  it('clears stale local chantiers, affectations and synced pointages when Supabase returns empty arrays', async (t) => {
    const origNav = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });

    const deletedChantiers: string[][] = [];
    const deletedAffectations: string[][] = [];
    const deletedPointages: string[][] = [];
    const deletedProfiles: string[][] = [];

    const sessionStub = t.mock.method(supabase.auth, 'getSession', async () => ({
      data: { session: { user: { id: 'real-user-1' } } },
      error: null,
    }));

    const fromStub = t.mock.method(supabase, 'from', (tableName: string) => {
      if (tableName === 'pointages') {
        return {
          select: () => ({
            order: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        select: async () => ({ data: [], error: null }),
      };
    });

    const chColStub = t.mock.method(db.chantiers, 'toCollection', () => ({
      primaryKeys: async () => ['demo-c1', 'demo-c2'],
    }));
    const chDelStub = t.mock.method(db.chantiers, 'bulkDelete', async (ids: string[]) => {
      deletedChantiers.push(ids);
    });

    const prColStub = t.mock.method(db.profiles, 'toCollection', () => ({
      primaryKeys: async () => ['real-user-1', 'demo-p1'],
    }));
    const prDelStub = t.mock.method(db.profiles, 'bulkDelete', async (ids: string[]) => {
      deletedProfiles.push(ids);
    });

    const affColStub = t.mock.method(db.affectations, 'toCollection', () => ({
      primaryKeys: async () => ['demo-a1'],
    }));
    const affDelStub = t.mock.method(db.affectations, 'bulkDelete', async (ids: string[]) => {
      deletedAffectations.push(ids);
    });

    const ptArrStub = t.mock.method(db.pointages, 'toArray', async () => [
      { id: 'synced-pt', synced: true },
      { id: 'draft-pt', synced: false },
    ]);
    const ptDelStub = t.mock.method(db.pointages, 'bulkDelete', async (ids: string[]) => {
      deletedPointages.push(ids);
    });

    try {
      await syncEngine.pullRemoteData();
      assert.deepEqual(deletedChantiers, [['demo-c1', 'demo-c2']]);
      assert.deepEqual(deletedProfiles, [['demo-p1']]);
      assert.deepEqual(deletedAffectations, [['demo-a1']]);
      assert.deepEqual(deletedPointages, [['synced-pt']]);
    } finally {
      sessionStub.mock.restore();
      fromStub.mock.restore();
      chColStub.mock.restore();
      chDelStub.mock.restore();
      prColStub.mock.restore();
      prDelStub.mock.restore();
      affColStub.mock.restore();
      affDelStub.mock.restore();
      ptArrStub.mock.restore();
      ptDelStub.mock.restore();
      Object.defineProperty(globalThis, 'navigator', {
        value: origNav,
        configurable: true,
      });
    }
  });

  it('never runs ensureSeedData unconditionally at startup in sync.ts or AuthContext.tsx', () => {
    const syncSource = readFilesConcat(['src/lib/sync.ts']);
    const authSource = readFilesConcat(['src/context/AuthContext.tsx']);

    assert.doesNotMatch(syncSource, /ensureSeedData/);
    assert.match(authSource, /if\s*\(wasDemo\)\s*\{\s*await ensureSeedData\(\);/);
  });

  it('provides explicit Compte Supabase vs Démo locale choice on Login without silent fallback', () => {
    const loginSource = readFilesConcat([
      'src/pages/Login.tsx',
      'src/components/auth/DemoAccountsPanel.tsx',
    ]);
    assert.match(loginSource, /Compte Supabase/);
    assert.match(loginSource, /Démo locale/);
    assert.match(loginSource, /Continuer en Démo locale/);
    assert.match(loginSource, /if\s*\(quickAuthMode\s*===\s*['"]demo['"]\)/);
  });

  it('configures same-origin Vite dev proxy for Supabase without affecting production or Node tests', () => {
    const viteConfigSource = readFilesConcat(['vite.config.ts']);
    const supabaseSource = readFilesConcat(['src/lib/supabase.ts']);

    assert.match(viteConfigSource, /supabase-proxy/);
    assert.match(supabaseSource, /Boolean\(env\?\.DEV\)/);
    assert.match(supabaseSource, /storageKey:\s*`sb-\$\{projectRef\}-auth-token`/);
  });
});
