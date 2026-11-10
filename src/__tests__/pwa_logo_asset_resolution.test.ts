import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PWA & Subpath Logo Asset Resolution', () => {
  const projectRoot = resolve(import.meta.dirname, '../..');
  const loginPath = resolve(projectRoot, 'src/pages/Login.tsx');
  const plusPath = resolve(projectRoot, 'src/pages/Plus.tsx');
  const viteConfigPath = resolve(projectRoot, 'vite.config.ts');
  const srcLogoPath = resolve(projectRoot, 'src/assets/logo.png');
  const publicLogoPath = resolve(projectRoot, 'public/logo.png');

  const loginContent = readFileSync(loginPath, 'utf-8');
  const plusContent = readFileSync(plusPath, 'utf-8');
  const viteConfigContent = readFileSync(viteConfigPath, 'utf-8');

  it('ensures src/assets/logo.png and public/logo.png both exist for bundling and PWA caching', () => {
    assert.ok(existsSync(srcLogoPath), 'src/assets/logo.png must exist for Vite asset bundling');
    assert.ok(existsSync(publicLogoPath), 'public/logo.png must exist for PWA offline precaching');
  });

  it('verifies Login.tsx imports logoUrl and binds src={logoUrl} instead of hardcoded /logo.png', () => {
    assert.match(
      loginContent,
      /import\s+logoUrl\s+from\s+['"]\.\.\/assets\/logo\.png['"]/,
      'Login.tsx must import logoUrl from ../assets/logo.png'
    );
    assert.match(
      loginContent,
      /<img[\s\S]*?src=\{logoUrl\}[\s\S]*?alt="Paysage Concept"/,
      'Login.tsx img tag must use dynamic src={logoUrl}'
    );
    assert.doesNotMatch(
      loginContent,
      /src=["']\/logo\.png["']/,
      'Login.tsx must not contain hardcoded domain-absolute src="/logo.png"'
    );
  });

  it('verifies Plus.tsx imports logoUrl and binds src={logoUrl} instead of hardcoded /logo.png', () => {
    assert.match(
      plusContent,
      /import\s+logoUrl\s+from\s+['"]\.\.\/assets\/logo\.png['"]/,
      'Plus.tsx must import logoUrl from ../assets/logo.png'
    );
    assert.match(
      plusContent,
      /<img[\s\S]*?src=\{logoUrl\}[\s\S]*?alt="Paysage Concept"/,
      'Plus.tsx img tag must use dynamic src={logoUrl}'
    );
    assert.doesNotMatch(
      plusContent,
      /src=["']\/logo\.png["']/,
      'Plus.tsx must not contain hardcoded domain-absolute src="/logo.png"'
    );
  });

  it('verifies vite.config.ts includes logo.png in PWA includeAssets and supports base-scoped manifest ID', () => {
    assert.match(
      viteConfigContent,
      /includeAssets:[\s\S]*?logo\.png/,
      'vite.config.ts must include logo.png in includeAssets'
    );
    assert.match(
      viteConfigContent,
      /id:\s*process\.env\.VITE_BASE_PATH\s*\|\|\s*['"]\/['"]/,
      'vite.config.ts manifest must scope id using process.env.VITE_BASE_PATH'
    );
  });
});

