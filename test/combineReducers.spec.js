import expect from 'expect'
import { combineReducers } from '../src'
import createStore from '../src/createStore'

describe('Utils', () => {
  describe('combineReducers', () => {
    it('returns a composite reducer that maps the state keys to given reducers', () => {
      const reducer = combineReducers({
        counter: (state = 0, action) =>
        action.type === 'increment' ? state + 1 : state,
        stack: (state = [], action) =>
        action.type === 'push' ? [ ...state, action.value ] : state
      })

      return reducer({}, { type: 'increment' }).then((s1) => {
        expect(s1).toEqual({ counter: 1, stack: [] })

        return reducer(s1, { type: 'push', value: 'a' })
      }).then((s2) => {
        expect(s2).toEqual({ counter: 1, stack: [ 'a' ] })
      })
    })

    it('support promise in reducers', () => {
      const reducer = combineReducers({
        counter: (state = 0, action) => new Promise(function (resolve) {
          setTimeout(function () {
            resolve(action.type === 'increment' ? state + 1 : state)
          })
        }),
        stack: (state = [], action) => new Promise(function (resolve) {
          setTimeout(function () {
            resolve(action.type === 'push' ? [ ...state, action.value ] : state)
          })
        })
      })

      return reducer({}, { type: 'increment' }).then((s1) => {
        expect(s1).toEqual({ counter: 1, stack: [] })

        return reducer(s1, { type: 'push', value: 'a' })
      }).then((s2) => {
        expect(s2).toEqual({ counter: 1, stack: [ 'a' ] })
      })
    })

    it('ignores all props which are not a function', () => {
      const reducer = combineReducers({
        fake: true,
        broken: 'string',
        another: { nested: 'object' },
        stack: (state = []) => state
      })

      return reducer({ }, { type: 'push' }).then((state) => {
        expect(
          Object.keys(state)
        ).toEqual([ 'stack' ])
      })
    })

    it('throws an error if a reducer returns undefined handling an action', () => {
      const reducer = combineReducers({
        counter(state = 0, action) {
          switch (action && action.type) {
            case 'increment':
              return state + 1
            case 'decrement':
              return state - 1
            case 'whatever':
            case null:
            case undefined:
              return undefined
            default:
              return state
          }
        }
      })

      return Promise.all([
        reducer({ counter: 0 }, { type: 'whatever' }).catch((e) => {
          expect(() => {throw e}).toThrow(/"whatever".*"counter"/)
        }),
        reducer({ counter: 0 }, null).catch((e) => {
          expect(() => {throw e}).toThrow(/"counter".*an action/)
        }),
        reducer({ counter: 0 }, { }).catch((e) => {
          expect(() => {throw e}).toThrow(/"counter".*an action/)
        })
      ])
    })

    it('throws an error on first call if a reducer returns undefined initializing', () => {
      const reducer = combineReducers({
        counter(state, action) {
          switch (action && action.type) {
            case 'increment':
              return state + 1
            case 'decrement':
              return state - 1
            default:
              return state
          }
        }
      })
      return reducer({ }).catch((e) => {
        expect(() => {throw e}).toThrow(/"counter".*an action/)
      })
    })

    it('catches error thrown in reducer when initializing and re-throw', () => {
      const reducer = combineReducers({
        throwingReducer() {
          throw new Error('Error thrown in reducer')
        }
      })
      return reducer({ }).catch((e) => {
        expect(() => {throw e}).toThrow(/Error thrown in reducer/)
      })
    })

    it('allows a symbol to be used as an action type', () => {
      const increment = Symbol('INCREMENT')

      const reducer = combineReducers({
        counter(state = 0, action) {
          switch (action.type) {
            case increment:
              return state + 1
            default:
              return state
          }
        }
      })

      return reducer({ counter: 0 }, { type: increment }).then((state) => {
        expect(state.counter).toEqual(1)
      })
    })

    it('maintains referential equality if the reducers it is combining do', () => {
      const reducer = combineReducers({
        child1(state = { a: 1 }) {
          return state
        },
        child2(state = { b: 2 }) {
          return state
        },
        child3(state = { c: 3 }) {
          return state
        }
      })

      var initialState
      return reducer(undefined, '@@INIT').then((state) => {
        initialState = state
        return reducer(initialState, { type: 'FOO' })
      }).then((state) => {
        expect(state).toBe(initialState)
      })
    })

    it('does not have referential equality if one of the reducers changes something', () => {
      const reducer = combineReducers({
        child1(state = { }) {
          return state
        },
        child2(state = { count: 0 }, action) {
          switch (action.type) {
            case 'increment':
              return { count: state.count + 1 }
            default:
              return state
          }
        },
        child3(state = { }) {
          return state
        }
      })

      var initialState
      return reducer(undefined, '@@INIT').then((state) => {
        initialState = state
        return reducer(initialState, { type: 'increment' })
      }).then((state) => {
        expect(state).toNotBe(initialState)
      })
    })

    // Due to deleting assertReducerSanity in combineReducer.js, this test case can never be run
    // correctly. However, it might not be a problem because reducer should not care about whether 
    // an action is private or not, but make sure to return current state for a unknown action and 
    // never to return an undefined state.
    
    /*it('throws an error on first call if a reducer attempts to handle a private action', () => {
      const reducer = combineReducers({
        counter(state, action) {
          switch (action.type) {
            case 'increment':
              return state + 1
            case 'decrement':
              return state - 1
            // Never do this in your code:
            case ActionTypes.INIT:
              return 0
            default:
              return undefined
          }
        }
      })
      expect(() => reducer()).toThrow(
        /"counter".*private/
      )
    })*/

    it('warns if no reducers are passed to combineReducers', () => {
      const spy = expect.spyOn(console, 'error')
      const reducer = combineReducers({ })
      return reducer({ }).then(() => {
        expect(spy.calls[0].arguments[0]).toMatch(
          /Store does not have a valid reducer/
        )
        spy.restore()
      })
    })

    /*it('warns if input state does not match reducer shape', () => {
      const spy = expect.spyOn(console, 'error')
      const reducer = combineReducers({
        foo(state = { bar: 1 }) {
          return state
        },
        baz(state = { qux: 3 }) {
          return state
        }
      })

      return reducer().then(() => {
        expect(spy.calls.length).toBe(0)

        return reducer({ foo: { bar: 2 } })
      }).then(() => {
        expect(spy.calls.length).toBe(0)

        return reducer({
          foo: { bar: 2 },
          baz: { qux: 4 }
        })
      }).then(() => {
        expect(spy.calls.length).toBe(0)

        return createStore(reducer, { bar: 2 }).initState()
      }).then(() => {
        expect(spy.calls[0].arguments[0]).toMatch(
          /Unexpected key "bar".*createStore.*instead: "foo", "baz"/
        )

        return createStore(reducer, { bar: 2, qux: 4 }).initState()
      }).then(() => {
        expect(spy.calls[1].arguments[0]).toMatch(
          /Unexpected keys "bar", "qux".*createStore.*instead: "foo", "baz"/
        )

        return createStore(reducer, 1).initState()
      }).then(() => {
        expect(spy.calls[2].arguments[0]).toMatch(
          /createStore has unexpected type of "Number".*keys: "foo", "baz"/
        )

        return reducer({ bar: 2 })
      }).then(() => {
        expect(spy.calls[3].arguments[0]).toMatch(
          /Unexpected key "bar".*reducer.*instead: "foo", "baz"/
        )

        return reducer({ bar: 2, qux: 4 })
      }).then(() => {
        expect(spy.calls[4].arguments[0]).toMatch(
          /Unexpected keys "bar", "qux".*reducer.*instead: "foo", "baz"/
        )

        return reducer(1)
      }).then(() => {
        expect(spy.calls[5].arguments[0]).toMatch(
          /reducer has unexpected type of "Number".*keys: "foo", "baz"/
        )

        spy.restore()
      })      
    })*/

    it('filter state on reducer shape to support dynamic reducers', () => {
      const spy = expect.spyOn(console, 'error')
      const reducer = combineReducers({
        foo(state = { bar: 1 }) {
          return state
        },
        baz(state = { qux: 3 }) {
          return state
        }
      })

      var store

      return reducer().then(() => {
        expect(spy.calls.length).toBe(0)

        return reducer({ foo: { bar: 2 } })
      }).then((state) => {
        expect(state).toEqual({
          foo: { bar: 2 },
          baz: { qux: 3 }
        })

        return reducer({
          foo: { bar: 2 },
          baz: { qux: 4 }
        })
      }).then((state) => {
        expect(state).toEqual({
          foo: { bar: 2 },
          baz: { qux: 4 }
        })

        store = createStore(reducer, { bar: 2 })
        return store.initState()
      }).then(() => {
        expect(store.getState()).toEqual({
          foo: { bar: 1 },
          baz: { qux: 3 }
        })

        store = createStore(reducer, { bar: 2, qux: 4 })
        return store.initState()
      }).then(() => {
        expect(store.getState()).toEqual({
          foo: { bar: 1 },
          baz: { qux: 3 }
        })

        return createStore(reducer, 1).initState()
      }).then(() => {
        expect(spy.calls[0].arguments[0]).toMatch(
          /createStore has unexpected type of "Number".*keys: "foo", "baz"/
        )

        return reducer({ bar: 2 })
      }).then((state) => {
        expect(state).toEqual({
          foo: { bar: 1 },
          baz: { qux: 3 }
        })

        return reducer({ bar: 2, qux: 4 })
      }).then((state) => {
        expect(state).toEqual({
          foo: { bar: 1 },
          baz: { qux: 3 }
        })

        return reducer(1)
      }).then(() => {
        expect(spy.calls[1].arguments[0]).toMatch(
          /reducer has unexpected type of "Number".*keys: "foo", "baz"/
        )

        spy.restore()
      })      
    })
  })
})
