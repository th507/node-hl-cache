"use strict";

module.exports = HLCache;

var CURRENT = "current";
var NEXT = "next";

var UNDEFINED = "undefined";

function has(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k);
}

function HLCache(args) {
  if (!(this instanceof HLCache)) {
    return new HLCache(args);
  }

  this.max = parseInt(args.max || 1000, 10);

  // time to generate an other copy
  this.lifespan = parseInt(args.lifespan || 5000, 10);

  // time to destroy the inactive copy of the cache
  // we actually schedule the destruction a little sooner
  // than the theoretical time limit
  // in case there is some delay in setTimeout queue

  var gap;
  if ("gap" in args) gap = args.gap;
  else gap = this.lifespan / 100;
  gap = gap | 0;
  if (gap > 200) gap = 200;
  else if (gap < 2) gap = 2;

  this.halflife = parseInt(this.lifespan / 2 - gap, 10);

  this.reset();
}

/**
 * Setter with a time pointer
 **/
HLCache.prototype.set = function(key, value, now) {
  // if the pool is full, do nothing
  if (this.length >= this.max) return false;

  // create new entry if necessary
  if (!(key in this.pool)) {
    this.pool[key] = new Entry(now);
    this.length++;
  }

  var entry = this.pool[key];

  var current = entry.current;
  var lifespan = this.lifespan;

  // setting value 
  // and a scheduled eviction
  if (!entry.has(CURRENT)) {
    unset(this, key, CURRENT, lifespan);
    
    entry[entry.current] = value;
  }

  // mark for GC
  entry = null;

  return true;
};

/**
 * Getter with a time pointer
 **/
HLCache.prototype.get = function(key, now) {
  if (typeof now === UNDEFINED) now = Date.now();

  var entry = (key in this.pool) && this.pool[key];

  if (!(entry instanceof Entry)) return Entry.void;

  // if a request comes from the last cache cycle
  // yields corresponding (previous) cache
  if (now < entry.baseline) return entry.get(NEXT);

  if (now >= entry.baseline + this.halflife) {
    //console.log("--flipped", now, entry.baseline, this.halflife);
    entry.baseline = now;

    // swapping indices
    var tmp = entry.current;
    entry.current = entry.next;
    entry.next = tmp;
  }

  return entry.get(CURRENT);
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

  return entry.has(CURRENT);
}


/**
 * Delete cache at key
 **/
HLCache.prototype.del = function(key) {
  del(this, key, CURRENT);
  del(this, key, NEXT);
};

/**
 * Reset cache pool to its pristine condition
 **/
HLCache.prototype.reset = function() {
  for (var i in this.pool) {
    if (has(this.pool, i)) {
      // stop all timers
      this.pool[i].timer = Entry.void;
      this.pool[i] = null;
    }
  }

  // pool storing cache for all datasources
  this.pool = Object.create(null);

  // cached objects in the cache pool 
  this.length = 0;
};

// ES6 flavored iterator
// similar to Array::entries
if (typeof Symbol !== UNDEFINED && "iterator" in Symbol) {
  HLCache.prototype.entries = function() {
    return Object.keys(this.pool).map(function(key) {
      return [key, this.pool[key].get(CURRENT)];
    }, this)[Symbol.iterator]();
  };
}


/**
 * @private
 * scheduled value eviction
 **/
function unset(self, key, name, timeout) {
  if (!key || !self.pool) return;
  if (!(key in self.pool)) return;

  self.pool[key].timer = setTimeout(del, timeout, self, key, name);
};
/**
 * @private
 * delete cache at key/pointer
 **/
function del(self, key, name) {
  if (!self.pool || !(key in self.pool)) return;

  var entry = self.pool[key];

  if (!(entry instanceof Entry)) {
    return delete self.pool[key];
  }

  entry.timer = Entry.void;
  entry.reset(name);

  // delete pool[key] and free 'key' string
  // if both pointer is gone
  if ( !entry.has(CURRENT) &&
       !entry.has(NEXT)
  ) {
    entry = null;
    delete self.pool[key];

    // mark for GC
    key = null;

    // reduce pool length
    if (self.length > 0) self.length--;
  }
}

var _current = 0;
var _next = 1;
/**
 * individual cache entry
 **/
function Entry(now) {
  if (typeof now === UNDEFINED) now = Date.now();
  // create baseline for timeline comparison  
  this.baseline = now;

  // avoid unnecessary object mutation
  // by using Entry as a struct
  this[CURRENT] = _current;
  this[NEXT] = _next;

  this[_current] = Entry.void;
  this[_next] = Entry.void;



  var timer = Entry.void;
  Object.defineProperty(this, "timer", {
    enumerable: false,
    configurable: true,
    get: function() {
      return timer;
    },
    set: function(newValue) {
      if (timer !== Entry.void && newValue === Entry.void) {
        clearTimeout(timer);
      }
      timer = newValue;
    }
  });
}

Entry.prototype.get = function(name) {
  var index = this[name];
  return this[index];
}

Entry.prototype.has = function(name) {
  var index = this[name];
  return this[index] !== Entry.void;
};

Entry.prototype.reset = function(name) {
  // delete cache/prop
  this[this[name]] = Entry.void;
};


Object.defineProperty(Entry, "void", {
  enumerable: false,
  configurable: false,
  writable: false,
  value: void 0
});
