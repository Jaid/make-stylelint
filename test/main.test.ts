import type {Config} from 'stylelint'

import {expect, test} from 'bun:test'

import stylelint from 'stylelint'

import makeStylelint from '#src/main.ts'

type PluginList = NonNullable<Extract<Config['plugins'], Array<unknown>>>
type ConfigOverride = NonNullable<Config['overrides']>[number]

const toPluginList = (plugins?: Config['plugins']): PluginList => {
  if (!plugins) {
    return []
  }
  if (Array.isArray(plugins)) {
    return plugins
  }
  return [plugins]
}
const toOverrides = (overrides?: Config['overrides']): Array<ConfigOverride> => {
  if (!overrides) {
    return []
  }
  return [...overrides]
}
test('should merge user config, generated rules and plugins', async () => {
  const result: Config = await makeStylelint({
    config: {
      ignoreFiles: ['vendor/**/*.css'],
      plugins: ['custom-plugin-a'],
      rules: {
        'color-no-invalid-hex': true,
      },
    },
    extensions: 'scss',
    off: ['color-no-invalid-hex'],
    errors: ['block-no-empty'],
    pluginErrors: {
      scss: ['at-else-closing-brace-newline-after'],
    },
    plugins: ['custom-plugin-b'],
  })
  const plugins = toPluginList(result.plugins)
  expect(result.ignoreFiles).toEqual(['vendor/**/*.css'])
  expect(result.customSyntax).toBe('postcss-scss')
  expect(plugins).toContain('custom-plugin-a')
  expect(plugins).toContain('custom-plugin-b')
  expect(plugins).toContain('stylelint-scss')
  expect(result.rules).toMatchObject({
    'color-no-invalid-hex': null,
    'block-no-empty': true,
    'scss/at-else-closing-brace-newline-after': true,
  })
})
test('should distinguish warnings from errors', async () => {
  const config: Config = await makeStylelint({
    extensions: 'css',
    errors: ['color-no-invalid-hex'],
    warnings: ['block-no-empty'],
    warningsCustomized: {
      'color-hex-length': 'short',
    },
  })
  const result = await stylelint.lint({
    code: '.foo { color: #ggg; }\n.bar {}\n.baz { color: #ffffff; }',
    config,
  })
  const [lintResult] = result.results
  expect(lintResult).toBeDefined()
  const severitiesByRule = Object.fromEntries(lintResult.warnings.map(warning => [warning.rule, warning.severity]))
  expect(result.errored).toBe(true)
  expect(severitiesByRule).toMatchObject({
    'block-no-empty': 'warning',
    'color-hex-length': 'warning',
    'color-no-invalid-hex': 'error',
  })
})
test('should use overrides when both sass and scss are enabled', async () => {
  const result: Config = await makeStylelint({
    extensions: ['sass', 'scss'],
  })
  const overrides = toOverrides(result.overrides)
  const plugins = toPluginList(result.plugins)
  expect(result.customSyntax).toBeUndefined()
  expect(overrides.some(override => override.files === '**/*.sass' && override.customSyntax === 'postcss-sass')).toBe(true)
  expect(overrides.some(override => override.files === '**/*.scss' && override.customSyntax === 'postcss-scss')).toBe(true)
  expect(plugins).toContain('stylelint-scss')
})
