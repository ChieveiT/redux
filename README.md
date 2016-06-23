# <a href='http://redux.js.org'><img src='https://camo.githubusercontent.com/f28b5bc7822f1b7bb28a96d8d09e7d79169248fc/687474703a2f2f692e696d6775722e636f6d2f4a65567164514d2e706e67' height='60'></a>

Fork from [redux](https://github.com/reactjs/redux) to support promise in reducers and subscribers.

[![Build Status](https://travis-ci.org/ChieveiT/redux.svg?branch=coeus-redux)](https://travis-ci.org/ChieveiT/redux)
[![npm version](https://img.shields.io/npm/v/coeus-redux.svg?style=flat-square)](https://www.npmjs.com/package/coeus-redux)
[![npm downloads](https://img.shields.io/npm/dm/coeus-redux.svg?style=flat-square)](https://www.npmjs.com/package/coeus-redux)

### Diff

1. Rewrite 'dispatch' in createStore.js and 'combineReducers' in combineReducers.js, which makes store.dispatch() and reducers generated from combineReducers() always return a promise. In addition, subscribers can return a promise now because they has been wrapped by promise.all() in store.dispatch(). If you want to guarantee the sequence of actions, use promise.then() to chain every dispatching carefully. As all exceptions will be catched in promise, feel free to call promise.catch() rather than wrap store.dispatch() in a 'try catch' block. 

2. Seperate 'dispatch({ type: ActionTypes.INIT })' from 'createStore' and 'replaceReducer' in createStore.js to make it a new function named 'initState' for the store object. Everything will be fine as long as you add it right behind 'createStore' and 'replaceReducer'.

### Examples

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

More examples? It might be helpful to look at the [test cases](https://github.com/ChieveiT/redux/tree/coeus-redux/test) which have been rewritten.

### License

MIT
