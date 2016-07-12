# <a href='http://redux.js.org'><img src='https://camo.githubusercontent.com/f28b5bc7822f1b7bb28a96d8d09e7d79169248fc/687474703a2f2f692e696d6775722e636f6d2f4a65567164514d2e706e67' height='60'></a>

Fork from [redux](https://github.com/reactjs/redux) to support promise in reducers and subscribers.

[![Build Status](https://travis-ci.org/ChieveiT/redux.svg?branch=coeus-redux)](https://travis-ci.org/ChieveiT/redux)
[![npm version](https://img.shields.io/npm/v/coeus-redux.svg?style=flat-square)](https://www.npmjs.com/package/coeus-redux)
[![npm downloads](https://img.shields.io/npm/dm/coeus-redux.svg?style=flat-square)](https://www.npmjs.com/package/coeus-redux)

### Version

* 1.0.0: A simple version contains the 1-2 diff points to support promise in reducers and subscribers. Fork from redux v3.5.2. Recommended for new users from redux.

* 1.1.0: A further version contains all the diff points below.

### Diff

1. Rewrite 'dispatch' in createStore.js and 'combineReducers' in combineReducers.js, which makes store.dispatch() and reducers generated from combineReducers() always return a promise. In addition, subscribers can return a promise now because they has been wrapped by promise.all() in store.dispatch(). If you want to guarantee the sequence of actions, use promise.then() to chain every dispatching carefully. As all exceptions will be catched in promise, feel free to call promise.catch() rather than wrap store.dispatch() in a 'try catch' block. 

2. Seperate 'dispatch({ type: ActionTypes.INIT })' from 'createStore' and 'replaceReducer' in createStore.js to make it a new function named 'initState' for the store object. Everything will be fine as long as you add it right behind 'createStore' and 'replaceReducer'.

3. Add combineSubscribers to provide a stronger subscribe mechanism. Using combineSubscribers now subscribers can listen to a sub-state instead of the whole state in store and they will only be notified when the sub-state they listened has been changed. Correspondingly, store.dispatch() will skip all subscribers if the whole state hasn't been changed. (Thanks to immutable objects, the comparison between states is not a hard work.)

4. Internal recursive call in combineReducers and combineSubscribers, which means combineReducers and combineSubscribers can also receive a 'tree' of functions not only a 'map'.

5. Automatically call combineReducers in createStore() and store.replaceReducer() while automatically call combineSubscribers in store.subscribe(). Both combineReducers and combineSubscribers are still exposed to module object but using them explicitly is not recommended now.

6. As achieving the 3rd point above, subscriber will receive the state to which it listens as its first argument. It is considered a necessary contract which always makes the subscriber combined by combineSubscribers receive the current state to internally compare with the previous state in order to determine whether to notify sub-subscribers or not. 

7. Due to the 3rd point, pass initial state to createStore is not recommended now. Once you do so, the initial state is usually equal to itself after reducing and all subscribers will lose the chance to be notified for init action. Most of the time I don't think that is what you want. So try to init state in reducer instead of passing it to createStore.

### Examples

promise in createStore's reducer and store.replaceReducer()
```javascript
const store = createStore((state = [], action) => {
  switch (action.type) {
    case 'ADD_TODO':
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve([
            ...state, 
            {
              id: id(state),
              text: action.text
            }
          ])
        })
      })
    default:
      return state
  }
})

return store.initState().then(() => {
  expect(store.getState()).toEqual([ ])

  return store.dispatch({ type: 'ADD_TODO', text: 'Hello' })
}).then(() => {
  expect(store.getState()).toEqual([
    {
      id: 1,
      text: 'Hello'
    }
  ])
  
  store.replaceReducer((state = [], action) => {
    return state
  })
  
  return store.initState()
}).then(() => {
  expect(store.getState()).toEqual([
    {
      id: 1,
      text: 'Hello'
    }
  ])
  
  return store.dispatch({ type: 'ADD_TODO', text: 'World' })
}).then(() => {
  expect(store.getState()).toEqual([
    {
      id: 1,
      text: 'Hello'
    }
  ])
})
```

promise in subscriber
```javascript
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
```

promise in combineReducers
```javascript
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
```

combineSubscribers
```javascript
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
```

automatically call combineReducers
```javascript
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
```

automatically call combineSubscribers
```javascript
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
```

More examples? It might be helpful to look at the [test cases](https://github.com/ChieveiT/redux/tree/coeus-redux/test).

### License

MIT
