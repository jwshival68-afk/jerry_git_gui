const { buildBranchTree } = require('../src/ui/branch-tree');

test('puts local branches with no slash under empty-string prefix', () => {
  const branches = [
    { name: 'main', is_current: true, is_remote: false },
    { name: 'develop', is_current: false, is_remote: false },
  ];
  const { local, origin } = buildBranchTree(branches);
  expect(local['']).toHaveLength(2);
  expect(local[''][0].leaf).toBe('main');
  expect(local[''][1].leaf).toBe('develop');
  expect(Object.keys(origin)).toHaveLength(0);
});

test('groups local branches by prefix', () => {
  const branches = [
    { name: 'main', is_current: false, is_remote: false },
    { name: 'feature/foo', is_current: false, is_remote: false },
    { name: 'feature/bar', is_current: false, is_remote: false },
    { name: 'bug_fix/baz', is_current: false, is_remote: false },
  ];
  const { local } = buildBranchTree(branches);
  expect(local[''][0].leaf).toBe('main');
  expect(local['feature']).toHaveLength(2);
  expect(local['feature'].map(b => b.leaf)).toEqual(['foo', 'bar']);
  expect(local['bug_fix'][0].leaf).toBe('baz');
});

test('groups remote branches under origin, strips remotes/<remote>/ prefix', () => {
  const branches = [
    { name: 'remotes/origin/main', is_current: false, is_remote: true },
    { name: 'remotes/origin/feature/foo', is_current: false, is_remote: true },
    { name: 'remotes/origin/bug_fix/baz', is_current: false, is_remote: true },
  ];
  const { local, origin } = buildBranchTree(branches);
  expect(Object.keys(local)).toHaveLength(0);
  expect(origin[''][0].leaf).toBe('main');
  expect(origin['feature'][0].leaf).toBe('foo');
  expect(origin['bug_fix'][0].leaf).toBe('baz');
});

test('mixed local and remote branches', () => {
  const branches = [
    { name: 'main', is_current: true, is_remote: false },
    { name: 'feature/x', is_current: false, is_remote: false },
    { name: 'remotes/origin/main', is_current: false, is_remote: true },
    { name: 'remotes/origin/feature/x', is_current: false, is_remote: true },
  ];
  const { local, origin } = buildBranchTree(branches);
  expect(local[''][0].name).toBe('main');
  expect(local['feature'][0].name).toBe('feature/x');
  expect(origin[''][0].leaf).toBe('main');
  expect(origin['feature'][0].leaf).toBe('x');
});

test('returns empty groups for empty input', () => {
  const { local, origin } = buildBranchTree([]);
  expect(Object.keys(local)).toHaveLength(0);
  expect(Object.keys(origin)).toHaveLength(0);
});
