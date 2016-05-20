"use strict"

var CURRENT = "current"
var NEXT = "next"


if (typeof global.Map !== "function") {
  throw "Current Node.js does not support Map"
}

module.exports = HLCache


function has(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k)
}

function HLCache(args) {
  if (!(this instanceof HLCache)) {
    return new HLCache(args)
  }

  this.max = parseInt(args.max || 1000, 10)

  // time to generate an other copy
  this.lifespan = parseInt(args.lifespan || 5000, 10)

  // time to destroy the inactive copy of the cache
  // we actually schedule the destruction a little sooner
  // than the theoretical time limit
  // in case there is some delay in setTimeout queue

  var gap
  if ("gap" in args) gap = args.gap
  else gap = this.lifespan / 100

  if (gap > 200) gap = 200
  else if (gap < 2) gap = 2

  this.halflife = parseInt(this.lifespan / 2 - gap, 10)

  this.pool = new Map()
}

/**
 * Setter with a time pointer
 **/
HLCache.prototype.set = function(key, value, now) {
  // if the pool is full, do nothing
  if (this.pool.size >= this.max) return false

  // create new entry if necessary
  if (!this.pool.has(key)) {
    this.pool.set(key, new Entry(now))
  }

  var entry = this.pool.get(key)

  var current = entry.current
  var lifespan = this.lifespan

  // setting value
  // and a scheduled eviction
  if (!entry.has(CURRENT)) {
    unset(this, key, CURRENT, lifespan)

    entry[entry.current] = value
  }

  // mark for GC
  entry = null

  return true
}

/**
 * Getter with a time pointer
 **/
HLCache.prototype.get = function(key, now) {
  if (typeof now === "undefined") now = Date.now()

  var entry = this.pool.has(key) && this.pool.get(key)

  if (!(entry instanceof Entry)) return Entry.void

  // if a request comes from the last cache cycle
  // yields corresponding (previous) cache
  if (now < entry.baseline) return entry.get(NEXT)

  if (now >= entry.baseline + this.halflife) {
    //console.log("--flipped", now, entry.baseline, this.halflife)
    entry.baseline = now

    // swapping indices
    var tmp = entry.current
    entry.current = entry.next
    entry.next = tmp
  }

  return entry.get(CURRENT)
}

/**
 * Check if key exists in cache pool
 **/
HLCache.prototype.has = function(key) {
  if (!key) return false
  if (!this.pool.has(key)) return false

  var entry = this.pool.get(key)

  if (!(entry instanceof Entry)) {
    this.pool.delete(key)
    entry = null
    return false
  }

  return entry.has(CURRENT)
}


/**
 * Delete cache at key
 **/
HLCache.prototype.del = function(key) {
  if (!key) return
  if (!this.pool.has(key)) return

  del(this, key, CURRENT)
  del(this, key, NEXT)
}

/**
 * Reset cache pool to its pristine condition
 **/
HLCache.prototype.reset = function() {
  if (!this.pool) {
    // pool storing cache for all datasources
    this.pool = new Map()

    return this
  }

  this.pool.forEach(function(entry) {
    entry.timer = Entry.void
    entry = null
  })

  this.pool.clear()
}

Object.defineProperty(HLCache.prototype, "length", {
  get: function() {
    return this.pool.size
  }
})


HLCache.prototype.forEach = function(fn) {
  this.pool.forEach(function(entry, key, map) {
    fn.call(this, entry.get(CURRENT), key)
  }, this)
}


/**
 * @private
 * scheduled value eviction
 **/
function unset(self, key, name, timeout) {
  var entry = self.pool.get(key)
  entry.timer = setTimeout(del, timeout, self, key, name)
}
/**
 * @private
 * delete cache at key/pointer
 **/
function del(self, key, name) {
  var entry = self.pool.get(key)

  if (!(entry instanceof Entry)) {
    self.pool.delete(key)
    return true
  }

  entry.timer = Entry.void
  entry.reset(name)

  // delete pool[key] and free 'key' string
  // if both pointer is gone
  if ( !entry.has(CURRENT) &&
       !entry.has(NEXT)
  ) {
    entry = null
    self.pool.delete(key)

    // mark for GC
    key = null
  }
}

var _current = 0
var _next = 1
/**
 * individual cache entry
 **/
function Entry(now) {
  if (typeof now === "undefined") now = Date.now()
  // create baseline for timeline comparison
  this.baseline = now

  // avoid unnecessary object mutation
  // by using Entry as a struct
  this[CURRENT] = _current
  this[NEXT] = _next

  this[_current] = Entry.void
  this[_next] = Entry.void



  var timer = Entry.void
  Object.defineProperty(this, "timer", {
    enumerable: false,
    configurable: true,
    get: function() {
      return timer
    },
    set: function(newValue) {
      if (timer !== Entry.void && newValue === Entry.void) {
        clearTimeout(timer)
      }
      timer = newValue
    }
  })
}

Entry.prototype.get = function(name) {
  var index = this[name]
  return this[index]
}

Entry.prototype.has = function(name) {
  var index = this[name]
  return this[index] !== Entry.void
}

Entry.prototype.reset = function(name) {
  // delete cache/prop
  this[this[name]] = Entry.void
}


Object.defineProperty(Entry, "void", {
  enumerable: false,
  configurable: false,
  writable: false,
  value: undefined
})
