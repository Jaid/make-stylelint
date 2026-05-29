import type {Dict} from 'more-types'
import type {Config} from 'stylelint'
import type {Arrayable} from 'type-fest'

import {castArray} from 'es-toolkit/compat'
import optis from 'optis'

type Extension = 'css' | 'sass' | 'scss'
type RuleSecondaryOptions = Dict
type RulePrimary = Array<unknown> | Dict | RegExp | boolean | number | string
type RuleSetting = [RulePrimary, RuleSecondaryOptions] | [RulePrimary] | RulePrimary | null | undefined
type Rules = Dict<RuleSetting>
type RuleList = Arrayable<string>
type CustomizedRuleList = Dict<RuleSetting>
type PluginList = NonNullable<Extract<Config['plugins'], Array<unknown>>>
type PluginRuleList = Dict<RuleList>
type PluginCustomizedRuleList = Dict<CustomizedRuleList>
type ConfigOverride = NonNullable<Config['overrides']>[number]
type OptionsSchema = {
  process: (inputOptions?: MakeStylelintOptions) => ProcessedMakeStylelintOptions
}

const postcssSassPackageName = 'postcss-sass'
const postcssScssPackageName = 'postcss-scss'
const stylelintScssPackageName = 'stylelint-scss'
const warningSeverity = {severity: 'warning'} as const

export type MakeStylelintOptions = {
  config?: Partial<Config>
  errors?: RuleList
  errorsCustomized?: CustomizedRuleList
  extensions?: Arrayable<Extension>
  off?: RuleList
  pluginErrors?: PluginRuleList
  pluginErrorsCustomized?: PluginCustomizedRuleList
  pluginOff?: PluginRuleList
  plugins?: Config['plugins']
  pluginWarnings?: PluginRuleList
  pluginWarningsCustomized?: PluginCustomizedRuleList
  warnings?: RuleList
  warningsCustomized?: CustomizedRuleList
}

type ProcessedMakeStylelintOptions = Omit<MakeStylelintOptions, 'extensions'> & {
  extensions: Arrayable<Extension>
}

/**
 * Order of precedence:
 * - `pluginOff`
 * - `off`
 * - `pluginErrorsCustomized`
 * - `errorsCustomized`
 * - `pluginWarningsCustomized`
 * - `warningsCustomized`
 * - `pluginErrors`
 * - `errors`
 * - `pluginWarnings`
 * - `warnings`
 */
const internalOptionsSchema = optis({
  defaults: {
    extensions: ['sass', 'css'] as Arrayable<Extension>,
  },
}).extendTyped<{
  optional: {
    config: MakeStylelintOptions['config']
    errors: MakeStylelintOptions['errors']
    errorsCustomized: MakeStylelintOptions['errorsCustomized']
    off: MakeStylelintOptions['off']
    pluginErrors: MakeStylelintOptions['pluginErrors']
    pluginErrorsCustomized: MakeStylelintOptions['pluginErrorsCustomized']
    pluginOff: MakeStylelintOptions['pluginOff']
    plugins: MakeStylelintOptions['plugins']
    pluginWarnings: MakeStylelintOptions['pluginWarnings']
    pluginWarningsCustomized: MakeStylelintOptions['pluginWarningsCustomized']
    warnings: MakeStylelintOptions['warnings']
    warningsCustomized: MakeStylelintOptions['warningsCustomized']
  }
}>()
export const optionsSchema = internalOptionsSchema as unknown as OptionsSchema
const addRule = (rules: Rules, rule: string, ruleSetting: RuleSetting) => {
  if (ruleSetting === undefined || Object.hasOwn(rules, rule)) {
    return
  }
  rules[rule] = ruleSetting
}
const addRules = (rules: Rules, ruleList?: RuleList, ruleSetting: RuleSetting = true) => {
  if (!ruleList) {
    return
  }
  for (const rule of castArray(ruleList)) {
    addRule(rules, rule, ruleSetting)
  }
}
const addCustomizedRules = (rules: Rules, customizedRuleList?: CustomizedRuleList, transformRuleSetting: (ruleSetting: RuleSetting) => RuleSetting = ruleSetting => ruleSetting) => {
  if (!customizedRuleList) {
    return
  }
  for (const [rule, ruleSetting] of Object.entries(customizedRuleList)) {
    addRule(rules, rule, transformRuleSetting(ruleSetting))
  }
}
const addPluginRules = (rules: Rules, pluginRuleList?: PluginRuleList, ruleSetting: RuleSetting = true) => {
  if (!pluginRuleList) {
    return
  }
  for (const [plugin, currentRuleList] of Object.entries(pluginRuleList)) {
    for (const rule of castArray(currentRuleList)) {
      addRule(rules, `${plugin}/${rule}`, ruleSetting)
    }
  }
}
const addCustomizedPluginRules = (rules: Rules, pluginCustomizedRuleList?: PluginCustomizedRuleList, transformRuleSetting: (ruleSetting: RuleSetting) => RuleSetting = ruleSetting => ruleSetting) => {
  if (!pluginCustomizedRuleList) {
    return
  }
  for (const [plugin, currentCustomizedRuleList] of Object.entries(pluginCustomizedRuleList)) {
    for (const [rule, ruleSetting] of Object.entries(currentCustomizedRuleList)) {
      addRule(rules, `${plugin}/${rule}`, transformRuleSetting(ruleSetting))
    }
  }
}
const isRecord = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value)
const withWarningSeverity = (ruleSetting: RuleSetting): RuleSetting => {
  if (ruleSetting === null || ruleSetting === undefined) {
    return ruleSetting
  }
  if (Array.isArray(ruleSetting)) {
    if (ruleSetting.length === 1) {
      return [ruleSetting[0], warningSeverity]
    }
    if (ruleSetting.length === 2 && isRecord(ruleSetting[1])) {
      return [
        ruleSetting[0], {
          ...ruleSetting[1],
          ...warningSeverity,
        },
      ]
    }
    return [ruleSetting, warningSeverity]
  }
  return [ruleSetting, warningSeverity]
}
const normalizePlugins = (plugins?: Config['plugins']): PluginList => {
  if (!plugins) {
    return []
  }
  return [...castArray(plugins)] as PluginList
}
const appendPlugins = (target: PluginList, plugins?: Config['plugins']) => {
  for (const plugin of normalizePlugins(plugins)) {
    if (target.includes(plugin)) {
      continue
    }
    target.push(plugin)
  }
}
const getGeneratedCustomSyntax = (extensions: Set<Extension>): Config['customSyntax'] => {
  if (extensions.has('sass') && !extensions.has('scss')) {
    return postcssSassPackageName
  }
  if (extensions.has('scss') && !extensions.has('sass')) {
    return postcssScssPackageName
  }
}
const getGeneratedOverrides = (extensions: Set<Extension>): Array<ConfigOverride> => {
  if (!(extensions.has('sass') && extensions.has('scss'))) {
    return []
  }
  return [
    {
      files: '**/*.sass',
      customSyntax: postcssSassPackageName,
    },
    {
      files: '**/*.scss',
      customSyntax: postcssScssPackageName,
    },
  ]
}
const makeConfig = async (inputOptions?: MakeStylelintOptions) => {
  const options = internalOptionsSchema.process(inputOptions)
  const baseConfig = options.config ?? {}
  const extensions = new Set(castArray(options.extensions))
  const rules: Rules = {}
  addPluginRules(rules, options.pluginOff, null)
  addRules(rules, options.off, null)
  addCustomizedPluginRules(rules, options.pluginErrorsCustomized)
  addCustomizedRules(rules, options.errorsCustomized)
  addCustomizedPluginRules(rules, options.pluginWarningsCustomized, withWarningSeverity)
  addCustomizedRules(rules, options.warningsCustomized, withWarningSeverity)
  addPluginRules(rules, options.pluginErrors, true)
  addRules(rules, options.errors, true)
  addPluginRules(rules, options.pluginWarnings, withWarningSeverity(true))
  addRules(rules, options.warnings, withWarningSeverity(true))
  const plugins = normalizePlugins(baseConfig.plugins)
  appendPlugins(plugins, options.plugins)
  if (extensions.has('sass') || extensions.has('scss')) {
    appendPlugins(plugins, stylelintScssPackageName)
  }
  const customSyntax = getGeneratedCustomSyntax(extensions)
  const overrides = [...baseConfig.overrides ?? [], ...getGeneratedOverrides(extensions)]
  const mergedConfig: Config = {
    ...baseConfig,
    rules: {
      ...baseConfig.rules,
      ...rules,
    },
  }
  if (plugins.length > 0) {
    mergedConfig.plugins = plugins
  }
  if (customSyntax) {
    mergedConfig.customSyntax = customSyntax
  }
  if (overrides.length > 0) {
    mergedConfig.overrides = overrides
  }
  return mergedConfig
}

export default makeConfig
