import expect from 'expect'
import { createStore, applyMiddleware } from '../src/index'
import * as reducers from './helpers/reducers'
import { addTodo, addTodoAsync, addTodoIfEmpty } from './helpers/actionCreators'
import { thunk } from './helpers/middleware'

describe('applyMiddleware', () => {
  it('wraps dispatch method with middleware once', () => {
    function test(spyOnMethods) {
      return methods => {
        spyOnMethods(methods)
        return next => action => next(action)
      }
    }

    const spy = expect.createSpy(() => {})
    const store = applyMiddleware(test(spy), thunk)(createStore)(reducers.todos)

    return store.initState().then(() => {
      return store.dispatch(addTodo('Use Redux'))
    }).then(() => {
      return store.dispatch(addTodo('Flux FTW!'))
    }).then(() => {
      expect(spy.calls.length).toEqual(1)

      expect(Object.keys(spy.calls[0].arguments[0])).toEqual([
        'getState',
        'dispatch'
      ])

      expect(store.getState()).toEqual([ { id: 1, text: 'Use Redux' }, { id: 2, text: 'Flux FTW!' } ])
    })
  })

  it('passes recursive dispatches through the middleware chain', () => {
    function test(spyOnMethods) {
      return () => next => action => {
        spyOnMethods(action)
        return next(action)
      }
    }

    const spy = expect.createSpy(() => {})
    const store = applyMiddleware(test(spy), thunk)(createStore)(reducers.todos)

    return store.dispatch(addTodoAsync('Use Redux')).then(() => {
      expect(spy.calls.length).toEqual(2)
    })
  })

  it('works with thunk middleware', () => {
    const store = applyMiddleware(thunk)(createStore)(reducers.todos)

    return store.initState().then(() => {
      return store.dispatch(addTodoIfEmpty('Hello'))
    }).then(() => {
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        }
      ])

      return store.dispatch(addTodoIfEmpty('Hello'))
    }).then(() => {
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        }
      ])

      return store.dispatch(addTodo('World'))
    }).then(() => {
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        },
        {
          id: 2,
          text: 'World'
        }
      ])

      return store.dispatch(addTodoAsync('Maybe'))
    }).then(() => {
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        },
        {
          id: 2,
          text: 'World'
        },
        {
          id: 3,
          text: 'Maybe'
        }
      ])
    })
  })

  // Once to support promise in dispatch, it is dangerous to dispatch actions
  // regardless of the sequence. So forbid the test case below right now and we
  // don't need to wait for it until Redux 4.x.

  /*it('keeps unwrapped dispatch available while middleware is initializing', () => {
    // This is documenting the existing behavior in Redux 3.x.
    // We plan to forbid this in Redux 4.x.

    function earlyDispatch({ dispatch }) {
      dispatch(addTodo('Hello'))
      return () => action => action
    }

    const store = createStore(reducers.todos, applyMiddleware(earlyDispatch))

    store.initState().then(() => {
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        }
      ])
    })
  })*/
})
