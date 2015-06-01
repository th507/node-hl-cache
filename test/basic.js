var test = require("tap").test
  , HLCache = require("../")

test("basic", function (t) {
  var cache = new HLCache({
    max: 10,
    lifespan: 20
  })
  cache.set("key", "value")
  t.equal(cache.get("key"), "value")
  t.equal(cache.get("nada"), undefined)
  t.equal(cache.length, 1)
  t.equal(cache.max, 10)
  t.end()
})

test("exceeds max", function (t) {
  var cache = new HLCache({
    max: 2,
    lifespan: 20
  })
  cache.set("a", "A")
  cache.set("b", "B")
  cache.set("c", "C")
  t.equal(cache.get("c"), undefined)
  t.equal(cache.get("b"), "B")
  t.equal(cache.get("a"), "A")
  t.end()
})

test("del", function (t) {
  var lifespan = 20
  var cache = new HLCache({
    max:2,
    lifespan: lifespan
  })
  cache.set("a", "A")
  cache.del("a")
  setTimeout(function(){
    t.equal(cache.get("a"), undefined)
    t.end()
  }, lifespan)
})


test("max", function (t) {
  var cache = new HLCache({
    max:3,
    lifespan: 20
  })

  // test changing the max, verify that the HLCache items get dropped.
  cache.max = 100
  for (var i = 0; i < 100; i ++) cache.set(i, i)
  t.equal(cache.length, 100)
  for (var i = 0; i < 100; i ++) {
    t.equal(cache.get(i), i)
  }

  t.end()
})


test("reset", function (t) {
  var cache = new HLCache({
    max: 10,
    lifespan: 20
  })
  cache.set("a", "A")
  cache.set("b", "B")
  cache.reset()
  t.equal(cache.length, 0)
  t.equal(cache.max, 10)
  t.equal(cache.get("a"), undefined)
  t.equal(cache.get("b"), undefined)
  t.end()
})


test("set returns proper booleans", function(t) {
  var cache = new HLCache({
    max: 5,
    lifespan: 20
    // length: function (item) { return item.length }
  })

  t.equal(cache.set("a", "A"), true)

  t.equal(cache.set("b", "B"), true)
  t.equal(cache.set("c", "C"), true)
  t.equal(cache.set("d", "D"), true)
  t.equal(cache.set("e", "E"), true)

  // should return false for max exceeded
  t.equal(cache.set("f", "F"), false)
  t.equal(cache.length, 5)
  t.end()
})


test("drop the old items", function(t) {
  var cache = new HLCache({
    max: 5,
    lifespan: 50
  })

  cache.set("a", "A")

  setTimeout(function () {
    cache.set("b", "b")
    t.equal(cache.get("a"), "A")
  }, 25)

  setTimeout(function () {
    cache.set("c", "C")
    // timed out
    t.notOk(cache.get("a"))
  }, 60 + 25)

  setTimeout(function () {
    t.notOk(cache.get("b"))
    t.equal(cache.get("c"), "C")
  }, 90)

  setTimeout(function () {
    t.notOk(cache.get("c"))
    t.end()
  }, 155)
})


// test("individual item can have it's own maxAge", function(t) {
//   var cache = new HLCache({
//     max: 5,
//     maxAge: 50
//   })
//
//   cache.set("a", "A", 20)
//   setTimeout(function () {
//     t.notOk(cache.get("a"))
//     t.end()
//   }, 25)
// })
//
// test("individual item can have it's own maxAge > cache's", function(t) {
//   var cache = new HLCache({
//     max: 5,
//     maxAge: 20
//   })
//
//   cache.set("a", "A", 50)
//   setTimeout(function () {
//     t.equal(cache.get("a"), "A")
//     t.end()
//   }, 25)
// })



test("has()", function(t) {
  var cache = new HLCache({
    max: 1,
    lifespan: 10
  })

  cache.set('foo', 'bar')
  t.equal(cache.has('foo'), true)
  cache.set('blu', 'baz')
  t.equal(cache.has('blu'), false)

  setTimeout(function() {
    t.equal(cache.has('foo'), true)
  }, 8)

  setTimeout(function() {
    t.equal(cache.has('foo'), false)
    t.end()
  }, 10)
})

test("update w/ time", function(t) {
  var cache = HLCache({
    max: 2,
    lifespan: 5
  });

  cache.set('foo', 1);
  cache.set('bar', 2);
  cache.del('bar');
  cache.set('baz', 3);
  cache.set('qux', 4);

  t.equal(cache.get('foo'), 1)
  t.equal(cache.get('bar'), undefined)
  t.equal(cache.get('baz'), 3)
  t.equal(cache.get('qux'), undefined)

  setTimeout(function() {
    cache.set('qux', 4)
    t.equal(cache.get('qux'), 4)
    t.equal(cache.length, 1)
  }, 6)

  setTimeout(function() {
    t.equal(cache.get('qux'), undefined)
    t.equal(cache.length, 0)
    t.end()
  }, 14)
})
