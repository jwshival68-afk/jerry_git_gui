(function (root) {
  var screens = {};

  function registerScreen(name, el, onEnter) {
    screens[name] = { el: el, onEnter: onEnter || null };
  }

  function navigate(name, params) {
    params = params || {};
    var target = screens[name];
    if (!target) throw new Error('Unknown screen: ' + name);
    Object.values(screens).forEach(function (s) {
      s.el.classList.add('hidden');
    });
    target.el.classList.remove('hidden');
    if (target.onEnter) target.onEnter(params);
  }

  function currentScreen() {
    var found = Object.entries(screens).find(function (entry) {
      return !entry[1].el.classList.contains('hidden');
    });
    return found ? found[0] : null;
  }

  function reset() {
    screens = {};
  }

  var nav = { registerScreen: registerScreen, navigate: navigate, currentScreen: currentScreen, reset: reset };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = nav;
  } else {
    root.nav = nav;
  }
})(this);
