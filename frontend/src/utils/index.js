import Errors from './errors'
import RequestStates from './requestStates'
import parseItem from './parseItem'
import parseCase from './parseCase'

const SeededRand = function(seed) {
  const mod1 = 7247
  const mod2 = 7823

  seed = (seed * seed) % (mod1 * mod2)
  return seed / (mod1 * mod2)
}

export { Errors, RequestStates, parseItem, parseCase, SeededRand }
