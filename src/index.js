/* global console, module, window */

;(function() {
  'use strict'

  var instances = []
  var lastUsedColorIndex = 0
  // Solarized accent colors http://ethanschoonover.com/solarized
  var colors = [
    '#B58900',
    '#CB4B16',
    '#DC322F',
    '#D33682',
    '#6C71C4',
    '#268BD2',
    '#2AA198',
    '#859900'
  ]
  var filterRegExps = []

  function Logdown(opts) {
    // enforces new
    if (!(this instanceof Logdown)) {
      return new Logdown(opts)
    }

    opts = opts || {}

    var prefix = opts.prefix === undefined ? '' : opts.prefix
    prefix = sanitizeString(prefix)
    if (prefix && isPrefixAlreadyInUse(prefix, instances)) {
      return getInstanceByPrefix(prefix, instances)
    }

    //
    this.markdown = opts.markdown === undefined ? true : opts.markdown
    this.prefix = prefix

    //
    instances.push(this)

    this.prefixColor = colors[lastUsedColorIndex % colors.length]
    lastUsedColorIndex += 1

    return this
  }

  // Static
  // ------

  Logdown.enable = function() {
    Array.prototype.forEach.call(arguments, function(str) {
      if (str[0] === '-') {
        Logdown.disable(str.substr(1))
      }

      var regExp = prepareRegExpForPrefixSearch(str)

      if (str === '*') {
        filterRegExps = [{
          type: 'enable',
          regExp: regExp
        }]
      } else {
        filterRegExps.push({
          type: 'enable',
          regExp: regExp
        })
      }
    })
  }

  Logdown.disable = function() {
    Array.prototype.forEach.call(arguments, function(str) {
      if (str[0] === '-') {
        Logdown.enable(str.substr(1))
      }

      var regExp = prepareRegExpForPrefixSearch(str)

      if (str === '*') {
        filterRegExps = [{
          type: 'disable',
          regExp: regExp
        }]
      } else {
        filterRegExps.push({
          type: 'disable',
          regExp: regExp
        })
      }
    })
  }

  // Public
  // ------

  var methods = ['log', 'info', 'warn', 'error']
  methods.forEach(function(method) {
    Logdown.prototype[method] = function(text) {
      var preparedOutput

      if (isDisabled(this)) {
        return
      }

      text = sanitizeString(text)
      preparedOutput = prepareOutput(text, this)

      console[method].apply(
        console,
        [preparedOutput.parsedText].concat(preparedOutput.styles)
      )
    }
  })

  // Private
  // -------

  function parseMarkdown(text) {
    var styles = []
    var match = getNextMatch(text)

    while (match) {
      text = text.replace(match.rule.regexp, match.rule.replacer)
      styles.push(match.rule.style)
      styles.push('color:inherit;')

      match = getNextMatch(text)
    }

    return {text: text, styles: styles}
  }

  function getNextMatch(text) {
    var matches = []
    var rules = [
      {
        regexp: /\*([^\*]+)\*/,
        replacer: function(match, submatch1) {
          return '%c' + submatch1 + '%c'
        },
        style: 'font-weight:bold;'
      },
      {
        regexp: /\_([^\_]+)\_/,
        replacer: function(match, submatch1) {
          return '%c' + submatch1 + '%c'
        },
        style: 'font-style:italic;'
      },
      {
        regexp: /\`([^\`]+)\`/,
        replacer: function(match, submatch1) {
          return '%c' + submatch1 + '%c';
        },
        style:
          'background:#FDF6E3; ' +
          'color:#586E75; ' +
          'padding:1px 5px; ' +
          'border-radius:4px;'
      }
    ]

    //
    rules.forEach(function(rule) {
      var match = text.match(rule.regexp)
      if (match) {
        matches.push({
          rule: rule,
          match: match
        })
      }
    })
    if (matches.length === 0) {
      return null;
    }

    //
    matches.sort(function(a, b) {
      return a.match.index - b.match.index
    })

    return matches[0]
  }

  function prepareOutput(text, instance) {
    var parsedMarkdown
    var parsedText
    var styles

    if (instance.markdown) {
      parsedMarkdown = parseMarkdown(text)
      parsedText = parsedMarkdown.text
      styles = parsedMarkdown.styles
    }

    parsedText = parsedText || text
    styles = styles || []

    if (instance.prefix) {
      parsedText = '%c' + instance.prefix + '%c ' + parsedText
      styles.unshift(
        'color:' + instance.prefixColor + '; font-weight:bold;',
        'color:inherit;'
      )
    }

    return {
      parsedText: parsedText,
      styles: styles
    }
  }

  function isDisabled(instance) {
    var isDisabled_ = false

    filterRegExps.forEach(function(filter) {
      if (filter.type === 'enable' && filter.regExp.test(instance.prefix)) {
        isDisabled_ = false
      } else if (filter.type === 'disable' &&
                 filter.regExp.test(instance.prefix)) {
        isDisabled_ = true
      }
    })

    return isDisabled_
  }

  function prepareRegExpForPrefixSearch(str) {
    return new RegExp('^' + str.replace(/\*/g, '.*?') + '$')
  }

  function isPrefixAlreadyInUse(prefix, instances) {
    var isPrefixAlreadyInUse_ = false

    instances.forEach(function(instance) {
      if (instance.prefix === prefix) {
        isPrefixAlreadyInUse_ = true
        return
      }
    })

    return isPrefixAlreadyInUse_
  }

  function getInstanceByPrefix(prefix, instances) {
    var instance

    instances.forEach(function(instanceCur) {
      if (instanceCur.prefix === prefix) {
        instance = instanceCur
        return
      }
    })

    return instance
  }

  function sanitizeString(str) {
    return str.replace(/\%c/g, '')
  }

  // Export module
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Logdown
  } else {
    window.Logdown = Logdown
  }
}())
