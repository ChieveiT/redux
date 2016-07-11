import { ActionTypes } from './createStore'
import isPlainObject from 'lodash/isPlainObject'
import isEqual from 'lodash/isEqual'
import warning from './utils/warning'

function getUndefinedStateErrorMessage(key, action) {
  var actionType = action && action.type
  var actionName = actionType && `"${actionType.toString()}"` || 'an action'

  return (
    `Given action ${actionName}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state.`
  )
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action) {
  var reducerKeys = Object.keys(reducers)
  var argumentName = action && action.type === ActionTypes.INIT ?
    'preloadedState argument passed to createStore' :
    'previous state received by the reducer'

  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }

  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      ({}).toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    )
  }
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */
export default function combineReducers(reducers) {
  if (!isPlainObject(reducers)) {
    throw new Error(`Expected a plain object`)
  }

  var reducerKeys = Object.keys(reducers)
  var finalReducerKeys = []
  var finalReducers = {}
  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i]
    
    if (typeof reducers[key] === 'function') {
      finalReducerKeys.push(key)
      finalReducers[key] = reducers[key]
    } else if (isPlainObject(reducers[key])) {
      // support recursive
      finalReducerKeys.push(key)
      finalReducers[key] = combineReducers(reducers[key])
    }
  }

  return function combination(states = {}, action) {
    return new Promise(function (resolve, reject) {
      if (process.env.NODE_ENV !== 'production') {
        var warningMessage = getUnexpectedStateShapeWarningMessage(states, finalReducers, action)
        if (warningMessage) {
          warning(warningMessage)
        }
      }

      var hasChanged = false
      var nextStates = {}
      var promises = []

      // to support dynamic reducers
      if (!isEqual(Object.keys(states), finalReducerKeys)) {
        hasChanged = true
      }

      for (var i = 0; i < finalReducerKeys.length; i++) {
        let key = finalReducerKeys[i]
        let reducer = finalReducers[key]
        let previousStateForKey = states[key]

        let p = Promise.all([
          reducer(previousStateForKey, action)
        ]).then(function ([ state ]) {
          if (typeof state === 'undefined') {
            var errorMessage = getUndefinedStateErrorMessage(key, action)
            throw new Error(errorMessage)
          }

          nextStates[key] = state
          hasChanged = hasChanged || state !== previousStateForKey
        })

        promises.push(p)
      }

      Promise.all(promises).then(function () {
        resolve(hasChanged ? nextStates : states)
      }, function (e) {
        reject(e)
      })
    })
  }
}
