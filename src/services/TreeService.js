let treeInstance = null;

export function updateTree(tree) {
  treeInstance = tree;
}

export function getParentName(systemId) {
  let system;
  bfsOverTree(treeInstance, (s) => {
    if (s.info.id === systemId) {
      system = s;
    }
  });
  return system?.wormholeParent?.origin?.info?.name;
}

export function bfsOverTree(system = treeInstance, callback) {
  const queue = [system];
  while (queue.length > 0) {
    const ele = queue.shift();
    callback(ele);
    for (let i = 0; i < ele.wormholes.length; i++) {
      queue.push(ele.wormholes[i].destination);
    }
  }
}
