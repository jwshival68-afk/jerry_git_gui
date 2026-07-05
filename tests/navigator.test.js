const nav = require('../src/navigator');

function makeEl(hidden = true) {
  const el = document.createElement('div');
  if (hidden) el.classList.add('hidden');
  return el;
}

beforeEach(() => {
  nav.reset();
});

test('navigate shows target screen', () => {
  const welcome = makeEl(false);
  const app = makeEl(true);
  nav.registerScreen('welcome', welcome);
  nav.registerScreen('app', app);

  nav.navigate('welcome');

  expect(welcome.classList.contains('hidden')).toBe(false);
  expect(app.classList.contains('hidden')).toBe(true);
});

test('navigate hides all other screens', () => {
  const a = makeEl(false);
  const b = makeEl(false);
  const c = makeEl(false);
  nav.registerScreen('a', a);
  nav.registerScreen('b', b);
  nav.registerScreen('c', c);

  nav.navigate('b');

  expect(a.classList.contains('hidden')).toBe(true);
  expect(b.classList.contains('hidden')).toBe(false);
  expect(c.classList.contains('hidden')).toBe(true);
});

test('navigate calls onEnter with params', () => {
  const el = makeEl();
  const onEnter = jest.fn();
  nav.registerScreen('app', el, onEnter);

  nav.navigate('app', { path: '/repos/my-repo' });

  expect(onEnter).toHaveBeenCalledWith({ path: '/repos/my-repo' });
});

test('navigate with no params passes empty object to onEnter', () => {
  const el = makeEl();
  const onEnter = jest.fn();
  nav.registerScreen('app', el, onEnter);

  nav.navigate('app');

  expect(onEnter).toHaveBeenCalledWith({});
});

test('navigate throws for unknown screen name', () => {
  expect(() => nav.navigate('nonexistent')).toThrow('Unknown screen: nonexistent');
});

test('currentScreen returns name of visible screen', () => {
  const welcome = makeEl(false);
  const app = makeEl(true);
  nav.registerScreen('welcome', welcome);
  nav.registerScreen('app', app);

  nav.navigate('app');

  expect(nav.currentScreen()).toBe('app');
});

test('currentScreen returns null when no screens registered', () => {
  expect(nav.currentScreen()).toBeNull();
});

test('reset clears all registered screens', () => {
  const el = makeEl();
  nav.registerScreen('welcome', el);
  nav.reset();

  expect(() => nav.navigate('welcome')).toThrow('Unknown screen: welcome');
});
