import {expect, test} from 'bun:test'

const {default: makeStylelint} = await import('#src/main.ts')

test('should run', () => {
  const result = makeStylelint()
  expect(result).toBe('make-stylelint') // TODO Test actual functionality
})
