# HLCache (Half-life cache)
This is a variant of Clock cache algorithm that keeps a ghost copy for an extended period of time. It could be useful for implementing session-level cache.

# Clock cache algorithm

# Half-life cache algorithm
1. Store `cache` and  current timestamp as `baseline` if `key` is not set and `length` is less than `max`
2. Mark `cache` as `expired` at time `ba
