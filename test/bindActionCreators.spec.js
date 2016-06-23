import expect from 'expect'
import { bindActionCreators, createStore } from '../src'
import { todos } from './helpers/reducers'
import * as actionCreators from './helpers/actionCreators'

describe('bindActionCreators', () => {
  let store
  let actionCreatorFunctions

  beforeEach(() => {
    store = createStore(todos)
    actionCreatorFunctions = { ...actionCreators }
    Object.keys(actionCreatorFunctions).forEach(key => {
      if (typeof actionCreatorFunctions[key] !== 'function') {
        delete actionCreatorFunctions[key]
      }
    })
  })

  it('wraps the action creators with the dispatch function', () => {
    return store.initState().then(() => {
      const boundActionCreators = bindActionCreators(actionCreators, store.dispatch)
      expect(
        Object.keys(boundActionCreators)
      ).toEqual(
        Object.keys(actionCreatorFunctions)
      )

      return Promise.all([
        boundActionCreators.addTodo('Hello'),
        actionCreators.addTodo('Hello')
      ])
    }).then(([ action1, action2 ]) => {
      expect(action1).toEqual(action2)

      expect(store.getState()).toEqual([
        { id: 1, text: 'Hello' }
      ])
    })
  })

  it('skips non-function values in the passed object', () => {
    const boundActionCreators = bindActionCreators({
      ...actionCreators,
      foo: 42,
      bar: 'baz',
      wow: undefined,
      much: {},
      test: null
    }, store.dispatch)
    expect(
      Object.keys(boundActionCreators)
    ).toEqual(
      Object.keys(actionCreatorFunctions)
    )
  })

  it('supports wrapping a single function only', () => {
    return store.initState().then(() => {
      const actionCreator = actionCreators.addTodo
      const boundActionCreator = bindActionCreators(actionCreator, store.dispatch)

      return Promise.all([
        boundActionCreator('Hello'),
        actionCreator('Hello')
      ])
    }).then(([ action1, action2 ]) => {
      expect(action1).toEqual(action2)
      expect(store.getState()).toEqual([
        { id: 1, text: 'Hello' }
      ])
    })
  })

  it('throws for an undefined actionCreator', () => {
    expect(() => {
      bindActionCreators(undefined, store.dispatch)
    }).toThrow(
      'bindActionCreators expected an object or a function, instead received undefined. ' +
      'Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?'
    )
  })

  it('throws for a null actionCreator', () => {
    expect(() => {
      bindActionCreators(null, store.dispatch)
    }).toThrow(
      'bindActionCreators expected an object or a function, instead received null. ' +
      'Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?'
    )
  })

  it('throws for a primitive actionCreator', () => {
    expect(() => {
      bindActionCreators('string', store.dispatch)
    }).toThrow(
      'bindActionCreators expected an object or a function, instead received string. ' +
      'Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?'
    )
  })
})
