import isPlainObject from 'lodash/isPlainObject'
import warning from './utils/warning'

function getUnexpectedStateShapeWarningMessage(inputState, subscribers) {
  var subscriberKeys = Object.keys(subscribers)

  if (subscriberKeys.length === 0) {
    return (
      'Store does not have a valid subscriber. Make sure the argument passed ' +
      'to combineSubscribers is an object whose values are subscribers.'
    )
  }

  if (!isPlainObject(inputState)) {
    return (
      `The state received by the subscriber has unexpected type of "` +
      ({}).toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object.`
    )
  }
}

/**
 * Turns an object whose values are different subscriber functions, into a single
 * subscriber function. Every child subscriber listen to a sub-state and only the
 * sub-state has been changed, the subscriber will be notified.
 *
 * @param {Object} subscribers An object whose values correspond to different
 * subscriber functions that need to be combined into one.
 *
 * @returns {Function} A subscriber function that listen to a state tree.
 */
export default function combineSubscribers(subscribers) {
  if (!isPlainObject(subscribers)) {
    throw new Error(`Expected a plain object`)
  }

  var subscriberKeys = Object.keys(subscribers)
  var finalSubscriberKeys = []
  var finalSubscribers = {}
  for (var i = 0; i < subscriberKeys.length; i++) {
    var key = subscriberKeys[i]
    
    if (typeof subscribers[key] === 'function') {
      finalSubscriberKeys.push(key)
      finalSubscribers[key] = subscribers[key]
    } else if (isPlainObject(subscribers[key])) {
      // support recursive
      finalSubscriberKeys.push(key)
      finalSubscribers[key] = combineSubscribers(subscribers[key])
    }
  }

  // to store the previous state
  var previousState = {}

  return function combination(state = {}) {
    return new Promise(function (resolve, reject) {
      if (process.env.NODE_ENV !== 'production') {
        var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalSubscribers)
        if (warningMessage) {
          warning(warningMessage)
        }
      }

      var promises = []

      for (var i = 0; i < finalSubscriberKeys.length; i++) {
        let key = finalSubscriberKeys[i]
        let subscriber = finalSubscribers[key]

        // only has the sub-state been changed
        // we notify the sub-subscriber
        if (previousState[key] === state[key]) {
          continue
        } else {
          previousState[key] = state[key]
          promises.push(subscriber(state[key]))
        }
      }

      Promise.all(promises).then(function () {
        resolve()
      }, function (e) {
        reject(e)
      })
    })
  }
}
