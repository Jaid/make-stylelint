import type {Parameter} from 'optis'
import type {Config, CustomSyntax, Plugin} from 'stylelint'
import type {Arrayable, Merge} from 'type-fest'

import {castArray} from 'es-toolkit/compat'
import optis from 'optis'

/**
 * Order of precedence:
 * - `pluginOff`
 * - `off`
 * - `pluginErrorsCustomized`
 * - `errorsCustomized`
 * - `pluginWarningsCustomized`
 * - `warningsCustomized`
 * - `plugins`
 * - `errors`
 * - `pluginWarnings`
 * - `warnings`
 */
export const optionsSchema = optis({
  defaults: {
    extensions: ['sass', 'css'] as Arrayable<'css' | 'sass' | 'scss'>,
  },
}).extendTyped<{
  optional: {
    config: Partial<Config>
    errors: RuleList
    errorsCustomized: CustomizedRuleList
    off: RuleList
    pluginErrors: Dict<RuleList>
    pluginErrorsCustomized: Dict<CustomizedRuleList>
    pluginOff: Dict<RuleList>
    plugins: Config['plugins']
    pluginWarnings: Dict<RuleList>
    pluginWarningsCustomized: Dict<CustomizedRuleList>
    warnings: RuleList
    warningsCustomized: CustomizedRuleList
  }
}>()

type RuleList = Arrayable<string>
type CustomizedRuleList = Record<string, unknown>

const makeConfig = async (inputOptions: Parameter<typeof optionsSchema>) => {
  const options = optionsSchema.process(inputOptions)
  const rules: Record<string, unknown> = {}
  const addRule = (rule: string, customizationOptions?: unknown) => {
    if (Object.hasOwn(rules, rule)) {
      return
    }
    rules[rule] = customizationOptions
  }
  if (options.pluginOff) {
    for (const [plugin, pluginOff] of Object.entries(options.pluginOff)) {
      for (const rule of castArray(pluginOff)) {
        addRule(`${plugin}/${rule}`, null)
      }
    }
  }
  if (options.off) {
    for (const rule of castArray(options.off)) {
      addRule(rule, null)
    }
  }
  if (options.pluginErrorsCustomized) {
    for (const [plugin, pluginErrorsCustomized] of Object.entries(options.pluginErrorsCustomized)) {
      for (const [rule, customizationOptions] of Object.entries(pluginErrorsCustomized)) {
        addRule(`${plugin}/${rule}`, customizationOptions)
      }
    }
  }
  if (options.errorsCustomized) {
    for (const [rule, customizationOptions] of Object.entries(options.errorsCustomized)) {
      addRule(rule, customizationOptions)
    }
  }
  if (options.pluginWarningsCustomized) {
    for (const [plugin, pluginWarningsCustomized] of Object.entries(options.pluginWarningsCustomized)) {
      for (const [rule, customizationOptions] of Object.entries(pluginWarningsCustomized)) {
        addRule(`${plugin}/${rule}`, customizationOptions)
      }
    }
  }
  if (options.warningsCustomized) {
    for (const [rule, customizationOptions] of Object.entries(options.warningsCustomized)) {
      addRule(rule, customizationOptions)
    }
  }
  if (options.plugins) {
    for (const [plugin, pluginErrors] of Object.entries(options.pluginErrors)) {
      for (const rule of castArray(pluginErrors)) {
        addRule(`${plugin}/${rule}`, true)
      }
    }
  }
  if (options.errors) {
    for (const rule of castArray(options.errors)) {
      addRule(rule, true)
    }
  }
  if (options.pluginWarnings) {
    for (const [plugin, pluginWarnings] of Object.entries(options.pluginWarnings)) {
      for (const rule of castArray(pluginWarnings)) {
        addRule(`${plugin}/${rule}`, true)
      }
    }
  }
  if (options.warnings) {
    for (const rule of castArray(options.warnings)) {
      addRule(rule, true)
    }
  }
  const config: Merge<Config, {plugins: Array<Plugin | string>}> = {
    rules,
    plugins: [] as Array<Plugin | string>,
  }
  if (options.extensions.includes('scss') || options.extensions.includes('sass')) {
    const {default: plugin} = (await import('stylelint-scss')) as {default: Plugin}
    config.plugins.push(plugin)
  }
  if (options.extensions.includes('sass')) {
    const {default: plugin} = (await import('postcss-sass')) as {default: CustomSyntax}
    config.customSyntax = plugin
  }
  const mergedConfig: Config = {
    ...options.config,
    ...config,
  }
  return mergedConfig
}

export default makeConfig
