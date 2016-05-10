"use strict"

var test = require('tap').test
var HLCache = require('../')

test('forEach', function (t) {
  var l = new HLCache({ max: 5, lifespan: 200})
  var i
  for (i = 0; i < 10; i ++) {
    l.set(i.toString(), i.toString(2))
  }

  i = 0
  l.forEach(function(val, key) {
    t.equal(key, (i++).toString())
    t.equal(val, (key | 0).toString(2))
  })

  t.equal(i, 5)

  t.end()
})
