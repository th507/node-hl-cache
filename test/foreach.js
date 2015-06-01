var test = require('tap').test
var HLCache = require('../')

run()

function run() {
"use strict";
if (typeof HLCache.prototype.entries !== "function") return;

test('forEach', function (t) {
  var l = new HLCache({ max: 5, lifespan: 200})
  var i;
  for (i = 0; i < 10; i ++) {
    l.set(i.toString(), i.toString(2))
  }

  i = 0
  for (let item of l.entries()) {
    let key = item[0]
    let val = item[1]
    t.equal(key, (i++).toString())
    t.equal(val, (key | 0).toString(2))
  }

  t.equal(i, 5)

  t.end()
})

/*
  // get in order of most recently used
  l.get(6)
  l.get(8)

  var order = [ 8, 6, 9, 7, 5 ]
  var i = 0

  l.forEach(function (val, key, cache) {
    var j = order[i ++]
    t.equal(cache, l)
    t.equal(key, j.toString())
    t.equal(val, j.toString(2))
  })
  t.equal(i, order.length);

  t.end()
})

test('keys() and values()', function (t) {
  var l = new HLCache(5)
  for (var i = 0; i < 10; i ++) {
    l.set(i.toString(), i.toString(2))
  }

  t.similar(l.keys(), ['9', '8', '7', '6', '5'])
  t.similar(l.values(), ['1001', '1000', '111', '110', '101'])

  // get in order of most recently used
  l.get(6)
  l.get(8)

  t.similar(l.keys(), ['8', '6', '9', '7', '5'])
  t.similar(l.values(), ['1000', '110', '1001', '111', '101'])

  t.end()
})

test('all entries are iterated over', function(t) {
  var l = new HLCache(5)
  for (var i = 0; i < 10; i ++) {
    l.set(i.toString(), i.toString(2))
  }

  var i = 0
  l.forEach(function (val, key, cache) {
    if (i > 0) {
      cache.del(key)
    }
    i += 1
  })

  t.equal(i, 5)
  t.equal(l.keys().length, 1)

  t.end()
})

test('all stale entries are removed', function(t) {
  var l = new HLCache({ max: 5, maxAge: -5, stale: true })
  for (var i = 0; i < 10; i ++) {
    l.set(i.toString(), i.toString(2))
  }

  var i = 0
  l.forEach(function () {
    i += 1
  })

  t.equal(i, 5)
  t.equal(l.keys().length, 0)

  t.end()
})

test('expires', function (t) {
  var l = new HLCache({
    max: 10,
    maxAge: 50
  })
  for (var i = 0; i < 10; i++) {
    l.set(i.toString(), i.toString(2), ((i % 2) ? 25 : undefined))
  }

  var i = 0
  var order = [ 8, 6, 4, 2, 0 ]
  setTimeout(function () {
    l.forEach(function (val, key, cache) {
      var j = order[i++]
      t.equal(cache, l)
      t.equal(key, j.toString())
      t.equal(val, j.toString(2))
    })
    t.equal(i, order.length);
    t.end()

    setTimeout(function () {
      var count = 0;
      l.forEach(function (val, key, cache) { count++; })
      t.equal(0, count);
      t.end()
    }, 25)

  }, 26)
})
*/

}
