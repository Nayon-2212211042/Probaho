// A scope: a table of variables plus a link to the enclosing scope.
export class Environment {
  constructor(parent = null, { readonly = false } = {}) {
    this.vars = new Map();
    this.parent = parent;
    this.readonly = readonly;
  }
  has(name) { return this.vars.has(name); }
  define(name, value) { this.vars.set(name, value); }
  set(name, value) { this.vars.set(name, value); }
  // find the scope that owns this name, or null
  lookup(name) {
    for (let e = this; e; e = e.parent) if (e.vars.has(name)) return e;
    return null;
  }
  get(name) {
    const owner = this.lookup(name);
    return owner ? owner.vars.get(name) : undefined;
  }
}
