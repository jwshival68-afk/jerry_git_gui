(function (root) {
  function buildBranchTree(branches) {
    var local = {};
    var origin = {};

    for (var i = 0; i < branches.length; i++) {
      var b = branches[i];
      var target = b.is_remote ? origin : local;
      var baseName = b.name;

      if (b.is_remote) {
        baseName = b.name.replace(/^remotes\/[^/]+\//, '');
      }

      var slashIdx = baseName.indexOf('/');
      var prefix = slashIdx === -1 ? '' : baseName.slice(0, slashIdx);
      var leaf = slashIdx === -1 ? baseName : baseName.slice(slashIdx + 1);

      if (!target[prefix]) target[prefix] = [];
      target[prefix].push(Object.assign({}, b, { leaf: leaf, baseName: baseName }));
    }

    return { local: local, origin: origin };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildBranchTree: buildBranchTree };
  } else {
    root.branchTree = { buildBranchTree: buildBranchTree };
  }
})(this);
