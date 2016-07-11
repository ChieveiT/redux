import expect from 'expect'
import { combineSubscribers } from '../src'

describe('Utils', () => {
  describe('combineSubscribers', () => {
    it('returns a composite subscriber that maps the state keys to given subscribers', () => {
      var traceFoo = []
      var traceBar = []
      const foo = expect.createSpy((foo) => {
        traceFoo.push(foo)
      }).andCallThrough()
      const bar = expect.createSpy((bar) => {
        traceBar.push(bar)
      }).andCallThrough()

      const subscriber = combineSubscribers({
        foo,
        bar
      })

      return subscriber({ foo: 4, bar: 5 }).then(() => {
        expect(foo.calls.length).toEqual(1)
        expect(bar.calls.length).toEqual(1)
        expect(traceFoo).toEqual([ 4 ])
        expect(traceBar).toEqual([ 5 ])

        return subscriber({ foo: 2, bar: 2 })
      }).then(() => {
        expect(foo.calls.length).toEqual(2)
        expect(bar.calls.length).toEqual(2)
        expect(traceFoo).toEqual([ 4, 2 ])
        expect(traceBar).toEqual([ 5, 2 ])
      })
    })

    it('notify subscriber only has state been changed', () => {
      var traceFoo = []
      var traceBar = []
      const foo = expect.createSpy((foo) => {
        traceFoo.push(foo)
      }).andCallThrough()
      const bar = expect.createSpy((bar) => {
        traceBar.push(bar)
      }).andCallThrough()

      const subscriber = combineSubscribers({
        foo,
        bar
      })

      return subscriber({ foo: 4, bar: 5 }).then(() => {
        expect(foo.calls.length).toEqual(1)
        expect(bar.calls.length).toEqual(1)
        expect(traceFoo).toEqual([ 4 ])
        expect(traceBar).toEqual([ 5 ])

        return subscriber({ foo: 4, bar: 2 })
      }).then(() => {
        expect(foo.calls.length).toEqual(1)
        expect(bar.calls.length).toEqual(2)
        expect(traceFoo).toEqual([ 4 ])
        expect(traceBar).toEqual([ 5, 2 ])
      })
    })

    it('support promise in subscribers', () => {
      var traceFoo = []
      var traceBar = []
      const foo = expect.createSpy((foo) => {
        return new Promise((resolve) => {
          traceFoo.push(foo)
          resolve()
        })
      }).andCallThrough()
      const bar = expect.createSpy((bar) => {
        return new Promise((resolve) => {
          traceBar.push(bar)
          resolve()
        })
      }).andCallThrough()

      const subscriber = combineSubscribers({
        foo,
        bar
      })

      return subscriber({ foo: 4, bar: 5 }).then(() => {
        expect(foo.calls.length).toEqual(1)
        expect(bar.calls.length).toEqual(1)
        expect(traceFoo).toEqual([ 4 ])
        expect(traceBar).toEqual([ 5 ])

        return subscriber({ foo: 4, bar: 2 })
      }).then(() => {
        expect(foo.calls.length).toEqual(1)
        expect(bar.calls.length).toEqual(2)
        expect(traceFoo).toEqual([ 4 ])
        expect(traceBar).toEqual([ 5, 2 ])
      })
    })

    it('support recursive combination', () => {
      var traceOne = []
      var traceTwo = []
      var traceThree = []
      var traceStack = []

      const one = expect.createSpy((one) => {
        traceOne.push(one)
      }).andCallThrough()
      const two = expect.createSpy((two) => {
        traceTwo.push(two)
      }).andCallThrough()
      const three = expect.createSpy((three) => {
        traceThree.push(three)
      }).andCallThrough()
      const stack = expect.createSpy((stack) => {
        traceStack.push(stack)
      }).andCallThrough()

      const subscriber = combineSubscribers({
        tree: {
          one, 
          children: {
            two,
            three
          }
        },
        stack
      })

      return subscriber({
        tree: {
          one: 1,
          children: {
            two: 2,
            three: 3
          }
        },
        stack: 4
      }).then(() => {
        expect(one.calls.length).toEqual(1)
        expect(two.calls.length).toEqual(1)
        expect(three.calls.length).toEqual(1)
        expect(stack.calls.length).toEqual(1)
        expect(traceOne).toEqual([ 1 ])
        expect(traceTwo).toEqual([ 2 ])
        expect(traceThree).toEqual([ 3 ])
        expect(traceStack).toEqual([ 4 ])

        return subscriber({
          tree: {
            one: 1,
            children: {
              two: 20,
              three: 3
            }
          },
          stack: 40
        })
      }).then(() => {
        expect(one.calls.length).toEqual(1)
        expect(two.calls.length).toEqual(2)
        expect(three.calls.length).toEqual(1)
        expect(stack.calls.length).toEqual(2)
        expect(traceOne).toEqual([ 1 ])
        expect(traceTwo).toEqual([ 2, 20 ])
        expect(traceThree).toEqual([ 3 ])
        expect(traceStack).toEqual([ 4, 40 ])
      })
    })

    it('ignores all props which are not a function or a plain object', () => {
      var stack = []
      const subscriber = combineSubscribers({
        fake: true,
        broken: 'string',
        stack: (e) => stack.push(e)
      })

      return subscriber({ fake: 1, broken: 1, stack: 1 }).then(() => {
        expect(stack).toEqual([ 1 ])
      })
    })

    it('warns if no subscribers are passed to combineSubscribers', () => {
      const spy = expect.spyOn(console, 'error')
      const subscriber = combineSubscribers({ })
      return subscriber({ }).then(() => {
        expect(spy.calls[0].arguments[0]).toMatch(
          /Store does not have a valid subscriber/
        )
        spy.restore()
      })
    })
  })
})
