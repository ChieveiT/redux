import expect from 'expect'
import { createStore, combineReducers } from '../src/index'
import { addTodo, dispatchInMiddle, throwError, unknownAction } from './helpers/actionCreators'
import * as reducers from './helpers/reducers'
import * as Rx from 'rxjs'
import $$observable from 'symbol-observable'

describe('createStore', () => {
  it('exposes the public API', () => {
    const store = createStore(combineReducers(reducers))
    const methods = Object.keys(store)

    expect(methods.length).toBe(5)
    expect(methods).toContain('subscribe')
    expect(methods).toContain('dispatch')
    expect(methods).toContain('initState')
    expect(methods).toContain('getState')
    expect(methods).toContain('replaceReducer')
  })

  it('throws if reducer is not a function or a plain object', () => {
    expect(() =>
      createStore()
    ).toThrow()

    expect(() =>
      createStore('test')
    ).toThrow()

    expect(() =>
      createStore(() => {})
    ).toNotThrow()
  })

  it('automatically call combineReducers when receive a plain object as reducer', () => {
    const store = createStore({
      tree: {
        nodeOne: (state = 'one') => state, 
        children: {
          nodeTwo: (state = 'two') => state,
          nodeThree: (state = 'three') => state
        }
      }
    })

    return store.initState().then(() => {
      expect(store.getState()).toEqual({
        tree: {
          nodeOne: 'one',
          children: {
            nodeTwo: 'two',
            nodeThree: 'three'
          }
        }
      })
    })
  })

  it('automatically call combineSubscribers when receive a plain object as subscriber', () => {
    var traceOne = []
    var traceTwo = []
    var traceThree = []

    const one = expect.createSpy((one) => {
      traceOne.push(one)
    }).andCallThrough()
    const two = expect.createSpy((two) => {
      traceTwo.push(two)
    }).andCallThrough()
    const three = expect.createSpy((three) => {
      traceThree.push(three)
    }).andCallThrough()

    const store = createStore((state) => ({
      ...state
    }), {
      tree: {
        one: 1,
        children: {
          two: 2,
          three: 3
        }
      }
    })

    store.subscribe({
      tree: {
        one, 
        children: {
          two,
          three
        }
      }
    })

    return store.initState().then(() => {
      expect(one.calls.length).toEqual(1)
      expect(two.calls.length).toEqual(1)
      expect(three.calls.length).toEqual(1)
      expect(traceOne).toEqual([ 1 ])
      expect(traceTwo).toEqual([ 2 ])
      expect(traceThree).toEqual([ 3 ])
    })
  })

  it('passes the initial action and the initial state', () => {
    const store1 = createStore(reducers.todos)
    const store2 = createStore(reducers.todos, [
      {
        id: 1,
        text: 'Hello'
      }
    ])

    return Promise.all([
      store1.initState().then(() => {
        expect(store1.getState()).toEqual([ ])
      }),
      store2.initState().then(() => {
        expect(store2.getState()).toEqual([
          {
            id: 1,
            text: 'Hello'
          }
        ])
      })
    ])
  })

  it('support promise in a reducer', () => {
    const store = createStore(reducers.todosAsync)

    return store.initState().then(() => {
      expect(store.getState()).toEqual([ ])

      return store.dispatch(addTodo('Hello'))
    }).then(() => {
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        }
      ])
    })
  })

  it('applies the reducer to the previous state', () => {
    const store = createStore(reducers.todos)

    return store.initState().then(() => {
      expect(store.getState()).toEqual([])

      return store.dispatch(unknownAction())
    }).then(() => {
      expect(store.getState()).toEqual([])

      return store.dispatch(addTodo('Hello'))
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
        }, {
          id: 2,
          text: 'World'
        }
      ])
    })
  })

  it('applies the reducer to the initial state', () => {
    const store = createStore(reducers.todos, [
      {
        id: 1,
        text: 'Hello'
      }
    ])

    return store.initState().then(() => {
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        }
      ])

      return store.dispatch(unknownAction())
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
        }, {
          id: 2,
          text: 'World'
        }
      ])
    })
  })

  it('preserves the state when replacing a reducer', () => {
    const store = createStore(reducers.todos)

    return store.initState().then(() => {
      return store.dispatch(addTodo('Hello'))
    }).then(() => {
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

      store.replaceReducer(reducers.todosReverse)

      return store.initState()
    }).then(() => {
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        }, {
          id: 2,
          text: 'World'
        }
      ])

      return store.dispatch(addTodo('Perhaps'))
    }).then(() => {
      expect(store.getState()).toEqual([
        {
          id: 3,
          text: 'Perhaps'
        },
        {
          id: 1,
          text: 'Hello'
        },
        {
          id: 2,
          text: 'World'
        }
      ])

      store.replaceReducer(reducers.todos)

      return store.initState()
    }).then(() => {
      expect(store.getState()).toEqual([
        {
          id: 3,
          text: 'Perhaps'
        },
        {
          id: 1,
          text: 'Hello'
        },
        {
          id: 2,
          text: 'World'
        }
      ])

      return store.dispatch(addTodo('Surely'))
    }).then(() => {
      expect(store.getState()).toEqual([
        {
          id: 3,
          text: 'Perhaps'
        },
        {
          id: 1,
          text: 'Hello'
        },
        {
          id: 2,
          text: 'World'
        },
        {
          id: 4,
          text: 'Surely'
        }
      ])
    })
  })

  it('supports multiple subscriptions', () => {
    const store = createStore(reducers.todos)
    let listenerA
    let listenerB

    let unsubscribeA
    let unsubscribeB

    return store.initState().then(() => {
      listenerA = expect.createSpy(() => {})
      listenerB = expect.createSpy(() => {})

      unsubscribeA = store.subscribe(listenerA)

      return store.dispatch(addTodo('1'))
    }).then(() => {
      expect(listenerA.calls.length).toBe(1)
      expect(listenerB.calls.length).toBe(0)

      return store.dispatch(addTodo('2'))
    }).then(() => {
      expect(listenerA.calls.length).toBe(2)
      expect(listenerB.calls.length).toBe(0)

      unsubscribeB = store.subscribe(listenerB)
      expect(listenerA.calls.length).toBe(2)
      expect(listenerB.calls.length).toBe(0)

      return store.dispatch(addTodo('3'))
    }).then(() => {
      expect(listenerA.calls.length).toBe(3)
      expect(listenerB.calls.length).toBe(1)

      unsubscribeA()
      expect(listenerA.calls.length).toBe(3)
      expect(listenerB.calls.length).toBe(1)

      return store.dispatch(addTodo('4'))
    }).then(() => {
      expect(listenerA.calls.length).toBe(3)
      expect(listenerB.calls.length).toBe(2)

      unsubscribeB()
      expect(listenerA.calls.length).toBe(3)
      expect(listenerB.calls.length).toBe(2)

      return store.dispatch(addTodo('5'))
    }).then(() => {
      expect(listenerA.calls.length).toBe(3)
      expect(listenerB.calls.length).toBe(2)

      unsubscribeA = store.subscribe(listenerA)
      expect(listenerA.calls.length).toBe(3)
      expect(listenerB.calls.length).toBe(2)

      return store.dispatch(addTodo('6'))
    }).then(() => {
      expect(listenerA.calls.length).toBe(4)
      expect(listenerB.calls.length).toBe(2)
    })
  })

  it('only removes listener once when unsubscribe is called', () => {
    const store = createStore(reducers.todos)
    let listenerA
    let listenerB
    let unsubscribeA

    return store.initState().then(() => {
      listenerA = expect.createSpy(() => {})
      listenerB = expect.createSpy(() => {})

      unsubscribeA = store.subscribe(listenerA)
      store.subscribe(listenerB)

      unsubscribeA()
      unsubscribeA()

      return store.dispatch(addTodo('1'))
    }).then(() => {
      expect(listenerA.calls.length).toBe(0)
      expect(listenerB.calls.length).toBe(1)
    })
  })

  it('only removes relevant listener when unsubscribe is called', () => {
    const store = createStore(reducers.todos)
    let listener

    return store.initState().then(() => {
      listener = expect.createSpy(() => {})

      store.subscribe(listener)
      const unsubscribeSecond = store.subscribe(listener)

      unsubscribeSecond()
      unsubscribeSecond()

      return store.dispatch(addTodo('1'))
    }).then(() => {
      expect(listener.calls.length).toBe(1)
    })
  })

  it('supports removing a subscription within a subscription', () => {
    const store = createStore(reducers.todos)
    const listenerA = expect.createSpy(() => {})
    const listenerB = expect.createSpy(() => {})
    const listenerC = expect.createSpy(() => {})
    let unSubB

    return store.initState().then(() => {
      store.subscribe(listenerA)
      unSubB = store.subscribe(() => {
        listenerB()
        unSubB()
      })
      store.subscribe(listenerC)

      return store.dispatch(addTodo('1'))
    }).then(() => {
      return store.dispatch(addTodo('2'))
    }).then(() => {
      expect(listenerA.calls.length).toBe(2)
      expect(listenerB.calls.length).toBe(1)
      expect(listenerC.calls.length).toBe(2)
    })
  })

  it('delays unsubscribe until the end of current dispatch', () => {
    const store = createStore(reducers.todos)

    const unsubscribeHandles = []
    const doUnsubscribeAll = () => unsubscribeHandles.forEach(
      unsubscribe => unsubscribe()
    )

    const listener1 = expect.createSpy(() => {})
    const listener2 = expect.createSpy(() => {})
    const listener3 = expect.createSpy(() => {})

    return store.initState().then(() => {
      unsubscribeHandles.push(store.subscribe(() => listener1()))
      unsubscribeHandles.push(store.subscribe(() => {
        listener2()
        doUnsubscribeAll()
      }))
      unsubscribeHandles.push(store.subscribe(() => listener3()))

      return store.dispatch(addTodo('1'))
    }).then(() => {
      expect(listener1.calls.length).toBe(1)
      expect(listener2.calls.length).toBe(1)
      expect(listener3.calls.length).toBe(1)

      return store.dispatch(addTodo('2'))
    }).then(() => {
      expect(listener1.calls.length).toBe(1)
      expect(listener2.calls.length).toBe(1)
      expect(listener3.calls.length).toBe(1)
    })
  })

  it('delays subscribe until the end of current dispatch', () => {
    const store = createStore(reducers.todos)

    const listener1 = expect.createSpy(() => {})
    const listener2 = expect.createSpy(() => {})
    const listener3 = expect.createSpy(() => {})

    let listener3Added = false
    const maybeAddThirdListener = () => {
      if (!listener3Added) {
        listener3Added = true
        store.subscribe(() => listener3())
      }
    }

    return store.initState().then(() => {
      store.subscribe(() => listener1())
      store.subscribe(() => {
        listener2()
        maybeAddThirdListener()
      })

      return store.dispatch(addTodo('1'))
    }).then(() => {
      expect(listener1.calls.length).toBe(1)
      expect(listener2.calls.length).toBe(1)
      expect(listener3.calls.length).toBe(0)

      return store.dispatch(addTodo('2'))
    }).then(() => {
      expect(listener1.calls.length).toBe(2)
      expect(listener2.calls.length).toBe(2)
      expect(listener3.calls.length).toBe(1)
    })
  })

  // This test case looks weird, especially when we support promise in reducers
  // and subscribers. Once we dispatch an action, it's always ok to
  // dispatch another action in a subscriber, but should never expect
  // subscribers work in the order in which they are subscribed.
  //
  // The subscribers should be independent with each other and they 
  // should only dependent on the state of store.  

  /*it('uses the last snapshot of subscribers during nested dispatch', () => {
    const store = createStore(reducers.todos)

    const listener1 = expect.createSpy(() => {})
    const listener2 = expect.createSpy(() => {})
    const listener3 = expect.createSpy(() => {})
    const listener4 = expect.createSpy(() => {})

    let unsubscribe4
    let unsubscribe1

    return store.initState().then(() => {
      unsubscribe1 = store.subscribe(() => {
        listener1()
        expect(listener1.calls.length).toBe(1)
        expect(listener2.calls.length).toBe(0)
        expect(listener3.calls.length).toBe(0)
        expect(listener4.calls.length).toBe(0)

        unsubscribe1()
        unsubscribe4 = store.subscribe(listener4)

        return store.dispatch(unknownAction()).then(() => {
          expect(listener1.calls.length).toBe(1)
          expect(listener2.calls.length).toBe(1)
          expect(listener3.calls.length).toBe(1)
          expect(listener4.calls.length).toBe(1)
        })
      })
      store.subscribe(listener2)
      store.subscribe(listener3)

      return store.dispatch(unknownAction())
    }).then(() => {
      expect(listener1.calls.length).toBe(1)
      expect(listener2.calls.length).toBe(2)
      expect(listener3.calls.length).toBe(2)
      expect(listener4.calls.length).toBe(1)

      unsubscribe4()
      return store.dispatch(unknownAction())
    }).then(() => {
      expect(listener1.calls.length).toBe(1)
      expect(listener2.calls.length).toBe(3)
      expect(listener3.calls.length).toBe(3)
      expect(listener4.calls.length).toBe(1)
    })
  })*/

  it('guarantees the sequence of state when using dispatch in a subscriber', () => {
    const store = createStore(reducers.todos)

    let unsub
    return store.initState().then(() => {
      unsub = store.subscribe(() => {
        expect(store.getState()).toEqual([
          {
            id: 1,
            text: 'Hello'
          }
        ])

        unsub()

        return store.dispatch(addTodo('World')).then(() => {
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

          return store.dispatch(addTodo('Redux'))
        })
      })

      return store.dispatch(addTodo('Hello'))
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
          text: 'Redux'
        }
      ])
    })
  })

  it('provides an up-to-date state when a subscriber is notified', () => {
    const store = createStore(reducers.todos)
    return store.initState().then(() => {
      store.subscribe(() => {
        expect(store.getState()).toEqual([
          {
            id: 1,
            text: 'Hello'
          }
        ])
      })

      return store.dispatch(addTodo('Hello'))
    })
  })

  it('only accepts plain object actions', () => {
    const store = createStore(reducers.todos)

    return store.initState().then(() => {
      return store.dispatch(unknownAction()).catch((e) => {
        expect(() => {throw e}).toNotThrow()
      })
    }).then(() => {
      var promises = []

      function AwesomeMap() { }
      [ null, undefined, 42, 'hey', new AwesomeMap() ].forEach(nonObject =>
        promises.push(
          store.dispatch(nonObject).catch((e) => {
            expect(() => {throw e}).toThrow(/plain/)
          })
        )
      )

      return Promise.all(promises)
    })
  })

  it('handles nested dispatches gracefully', () => {
    function foo(state = 0, action) {
      return action.type === 'foo' ? 1 : state
    }

    function bar(state = 0, action) {
      return action.type === 'bar' ? 2 : state
    }

    const store = createStore(combineReducers({ foo, bar }))
    return store.initState().then(() => {
      store.subscribe(function kindaComponentDidUpdate() {
        const state = store.getState()
        if (state.bar === 0) {
          return store.dispatch({ type: 'bar' })
        }
      })

      return store.dispatch({ type: 'foo' })
    }).then(() => {
      expect(store.getState()).toEqual({
        foo: 1,
        bar: 2
      })
    })
  })

  it('does not allow dispatch() from within a reducer', () => {
    const store = createStore(reducers.dispatchInTheMiddleOfReducer)

    return store.initState().then(() => {
      return store.dispatch(dispatchInMiddle(store.dispatch.bind(store, unknownAction())))
    }).catch((e) => {
      expect(() => {throw e}).toThrow(/may not dispatch/)
    })
  })

  it('recovers from an error within a reducer', () => {
    const store = createStore(reducers.errorThrowingReducer)

    return store.initState().then(() => {
      return store.dispatch(throwError()).catch((e) => {
        expect(() => {throw e}).toThrow()
      })
    }).then(() => {
      return store.dispatch(unknownAction()).catch((e) => {
        expect(() => {throw e}).toNotThrow()
      })
    })
  })

  it('throws if action type is missing', () => {
    const store = createStore(reducers.todos)
    
    return store.initState().then(() => {
      return store.dispatch({}).catch((e) => {
        expect(() => {throw e}).toThrow(/Actions may not have an undefined "type" property/)
      })
    })
  })

  it('throws if action type is undefined', () => {
    const store = createStore(reducers.todos)

    return store.initState().then(() => {
      return store.dispatch({ type: undefined }).catch((e) => {
        expect(() => {throw e}).toThrow(/Actions may not have an undefined "type" property/)
      })
    })
  })

  it('does not throw if action type is falsy', () => {
    const store = createStore(reducers.todos)

    return store.initState().then(() => {
      return store.dispatch({ type: false }).catch((e) => {
        expect(() => {throw e}).toNotThrow()
      })
    }).then(() => {
      return store.dispatch({ type: 0 }).catch((e) => {
        expect(() => {throw e}).toNotThrow()
      })
    }).then(() => {
      return store.dispatch({ type: null }).catch((e) => {
        expect(() => {throw e}).toNotThrow()
      })
    }).then(() => {
      return store.dispatch({ type: '' }).catch((e) => {
        expect(() => {throw e}).toNotThrow()
      })
    })
  })

  it('accepts enhancer as the third argument', () => {
    const emptyArray = []
    const spyEnhancer = vanillaCreateStore => (...args) => {
      expect(args[0]).toBe(reducers.todos)
      expect(args[1]).toBe(emptyArray)
      expect(args.length).toBe(2)
      const vanillaStore = vanillaCreateStore(...args)
      return {
        ...vanillaStore,
        dispatch: expect.createSpy(vanillaStore.dispatch).andCallThrough()
      }
    }

    const store = createStore(reducers.todos, emptyArray, spyEnhancer)
    const action = addTodo('Hello')

    return store.initState().then(() => {
      return store.dispatch(action)
    }).then(() => {
      expect(store.dispatch).toHaveBeenCalledWith(action)
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        }
      ])
    })
  })

  it('accepts enhancer as the second argument if initial state is missing', () => {
    const spyEnhancer = vanillaCreateStore => (...args) => {
      expect(args[0]).toBe(reducers.todos)
      expect(args[1]).toBe(undefined)
      expect(args.length).toBe(2)
      const vanillaStore = vanillaCreateStore(...args)
      return {
        ...vanillaStore,
        dispatch: expect.createSpy(vanillaStore.dispatch).andCallThrough()
      }
    }

    const store = createStore(reducers.todos, spyEnhancer)
    const action = addTodo('Hello')

    return store.initState().then(() => {
      return store.dispatch(action)
    }).then(() => {
      expect(store.dispatch).toHaveBeenCalledWith(action)
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        }
      ])
    })
  })

  it('throws if enhancer is neither undefined nor a function', () => {
    expect(() =>
      createStore(reducers.todos, undefined, {})
    ).toThrow()

    expect(() =>
      createStore(reducers.todos, undefined, [])
    ).toThrow()

    expect(() =>
      createStore(reducers.todos, undefined, null)
    ).toThrow()

    expect(() =>
      createStore(reducers.todos, undefined, false)
    ).toThrow()

    expect(() =>
      createStore(reducers.todos, undefined, undefined)
    ).toNotThrow()

    expect(() =>
      createStore(reducers.todos, undefined, x => x)
    ).toNotThrow()

    expect(() =>
      createStore(reducers.todos, x => x)
    ).toNotThrow()

    expect(() =>
      createStore(reducers.todos, [])
    ).toNotThrow()

    expect(() =>
      createStore(reducers.todos, {})
    ).toNotThrow()
  })

  it('throws if nextReducer is not a function or a plain object', () => {
    const store = createStore(reducers.todos)

    expect(() =>
      store.replaceReducer()
    ).toThrow('Expected the nextReducer to be a function or a plain object.')

    expect(() =>
      store.replaceReducer(() => {})
    ).toNotThrow()
  })

  it('throws if listener is not a function or a plain object', () => {
    const store = createStore(reducers.todos)

    expect(() =>
      store.subscribe()
    ).toThrow()

    expect(() =>
      store.subscribe('')
    ).toThrow()

    expect(() =>
      store.subscribe(null)
    ).toThrow()

    expect(() =>
      store.subscribe(undefined)
    ).toThrow()
  })

  describe('Symbol.observable interop point', () => {
    it('should exist', () => {
      const store = createStore(() => {})
      expect(typeof store[$$observable]).toBe('function')
    })

    describe('returned value', () => {
      it('should be subscribable', () => {
        const store = createStore(() => {})
        const obs = store[$$observable]()
        expect(typeof obs.subscribe).toBe('function')
      })

      it('should throw a TypeError if an observer object is not supplied to subscribe', () => {
        const store = createStore(() => {})
        const obs = store[$$observable]()

        expect(function () {
          obs.subscribe()
        }).toThrow()

        expect(function () {
          obs.subscribe(() => {})
        }).toThrow()

        expect(function () {
          obs.subscribe({})
        }).toNotThrow()
      })

      it('should return a subscription object when subscribed', () => {
        const store = createStore(() => {})
        const obs = store[$$observable]()
        const sub = obs.subscribe({})
        expect(typeof sub.unsubscribe).toBe('function')
      })
    })

    it('should pass an integration test with no unsubscribe', () => {
      function foo(state = 0, action) {
        return action.type === 'foo' ? 1 : state
      }

      function bar(state = 0, action) {
        return action.type === 'bar' ? 2 : state
      }

      const store = createStore(combineReducers({ foo, bar }))
      const observable = store[$$observable]()
      const results = []

      return store.initState().then(() => {
        observable.subscribe({
          next(state) {
            results.push(state)
          }
        })
      
        return store.dispatch({ type: 'foo' })
      }).then(() => {
        return store.dispatch({ type: 'bar' })
      }).then(() => {
        expect(results).toEqual([ { foo: 0, bar: 0 }, { foo: 1, bar: 0 }, { foo: 1, bar: 2 } ])
      })
    })

    it('should pass an integration test with an unsubscribe', () => {
      function foo(state = 0, action) {
        return action.type === 'foo' ? 1 : state
      }

      function bar(state = 0, action) {
        return action.type === 'bar' ? 2 : state
      }

      const store = createStore(combineReducers({ foo, bar }))
      const observable = store[$$observable]()
      const results = []

      let sub
      return store.initState().then(() => {
        sub = observable.subscribe({
          next(state) {
            results.push(state)
          }
        })

        return store.dispatch({ type: 'foo' })
      }).then(() => {
        sub.unsubscribe()
        return store.dispatch({ type: 'bar' })
      }).then(() => {
        expect(results).toEqual([ { foo: 0, bar: 0 }, { foo: 1, bar: 0 } ])
      })
    })

    it('should pass an integration test with a common library (RxJS)', () => {
      function foo(state = 0, action) {
        return action.type === 'foo' ? 1 : state
      }

      function bar(state = 0, action) {
        return action.type === 'bar' ? 2 : state
      }

      const store = createStore(combineReducers({ foo, bar }))
      const observable = Rx.Observable.from(store)
      const results = []

      let sub
      return store.initState().then(() => {
        sub = observable
          .map(state => ({ fromRx: true, ...state }))
          .subscribe(state => results.push(state))
      
        return store.dispatch({ type: 'foo' })
      }).then(() => {
        sub.unsubscribe()
        return store.dispatch({ type: 'bar' })
      }).then(() => {
        expect(results).toEqual([ { foo: 0, bar: 0, fromRx: true }, { foo: 1, bar: 0, fromRx: true } ])
      })
    })
  })
})
