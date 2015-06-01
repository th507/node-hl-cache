module.exports = HLCache;

var CURRENT = 0;
var NEXT = 1;

var has = Function.call.bind(Object.prototype.hasOwnProperty);

function HLCache(args) {
  if (!(this instanceof HLCache)) {
    return new HLCache(args);
  }

  this.max = args.max || 1000;
  // time to generate an other copy
  this.lifespan = args.lifespan || 5000;

  this.gap = args.gap || 2;
  // time to destroy the inactive copy of the cache
  // we actually schedule the destruction a little sooner
  // than the theoretical time limit
  // in case there is some delay in setTimeout queue
  this.halflife = (this.lifespan / 2) - this.gap;

  this.reset();
}

/**
 * Setter with a time pointer
 **/
HLCache.prototype.set = function(key, value, now) {
  if (typeof now === "undefined") now = Date.now();

  // if the pool is full, do nothing
  if (this.size >= this.max) return false;

  // create new entry if necessary
  if (!(key in this.pool)) {
    this.pool[key] = new Entry(now);
    this.size++;
  }

  var entry = this.pool[key];

  var current = this.current;
  var lifespan = this.lifespan;

  // setting value 
  // and a scheduled eviction
  if (!entry.has(current)) {
    unset(this, key, current, lifespan);
    
    entry[current] = value;
  }

  // mark for GC
  entry = null;

  return true;
};

/**
 * Getter with a time pointer
 **/
HLCache.prototype.get = function(key, now) {
  if (typeof now === "undefined") now = Date.now();

  var entry = (key in this.pool) && this.pool[key];

  if (!(entry instanceof Entry)) return Entry.void;

  var current = this.current;
  var next = this.next;

  // if a request comes from the last cache cycle
  // yields corresponding (previous) cache
  if (
      now < entry.baseline &&
      entry.has(next)
  ) {
    return entry[next];
  }

  if (now >= entry.baseline + this.halflife) {
    entry.baseline = now;

    // swapping indices
    var tmp = current;
    this.current = current = next;
    this.next = next = tmp;
  }

  switch (true) {
    case entry.has(current):
      return entry[current];
    case entry.has(next):
      return entry[next];
    default:
      return Entry.void;
  }
};

/**
 * Check if key exists in cache pool
 **/
HLCache.prototype.has = function(key) {
  if (!(key in this.pool)) return false;

  var entry = this.pool[key];

  if (!(entry instanceof Entry)) {
    delete this.pool[key];
    entry = null;
    return false;
  }

  return (
    entry.has(this.current) || 
    entry.has(this.next)
  );
}


/**
 * Delete cache at key
 **/
HLCache.prototype.del = function(key) {
  del(this, key, this.current);
  del(this, key, this.next);
};

/**
 * Reset cache pool to its pristine condition
 **/
HLCache.prototype.reset = function() {
  // reset cache version indices
  this.current = CURRENT;
  this.next = NEXT;

  for (var i in this.pool) {
    if (has(this.pool, i)) {
      // stop all timers
      this.pool[i].clearTimer();
      this.pool[i] = null;
    }
  }

  // pool storing cache for all datasources
  this.pool = Object.create(null);

  // cached objects in the cache pool 
  this.size = 0;
};

/**
 * just make it a bit more compatible w/ LRU Cache test :-P
 **/
Object.defineProperty(HLCache.prototype, "length", {
  get: function() {
    return this.size;
  }
});

/**
 * @private
 * scheduled value eviction
 **/
function unset(self, key, index, timeout) {
  if (!key || !self.pool) return;
  if (!(key in self.pool)) return;

  self.pool[key].timer = setTimeout(del, timeout, self, key, index);
};
/**
 * @private
 * delete cache at key/pointer
 **/
function del(self, key, index) {
  if (!key || !self.pool) return;
  if (!(key in self.pool)) return;

  var entry = self.pool[key];

  if (!(entry instanceof Entry)) {
    return delete self.pool[key];
  }

  entry.clearTimer();
  entry.reset(index);

  var current = self.current;
  var next = self.next;

  // delete pool[key] and free 'key' string
  // if both pointer is gone
  if ( !entry.has(current) &&
       !entry.has(next)
  ) {
    entry = null;
    delete self.pool[key];

    // mark for GC
    key = null;

    // reduce pool size
    if (self.size > 0) self.size--;
  }
}

/**
 * individual cache entry
 **/
function Entry(now) {
  if (typeof now === "undefined") now = Date.now();
  // create baseline for timeline comparison  
  this.baseline = now;

  // avoid unnecessary object mutation
  // by using Entry as a struct
  this[CURRENT] = Entry.void;
  this[NEXT] = Entry.void;

  this.timer = Entry.void;
}

Entry.prototype.has = function(index) {
  return this[index] !== Entry.void;
};

Entry.prototype.reset = function(name) {
  // delete cache/prop
  if (this.has(name)) {
    this[name] = Entry.void;
  }
};

Entry.prototype.clearTimer = function() {
  if (!this.has("timer")) return;

  clearTimeout(this.timer);
  this.timer = Entry.void;
}

Object.defineProperty(Entry, "void", {
  enumerable: false,
  configurable: false,
  writable: false,
  value: void 0
});
