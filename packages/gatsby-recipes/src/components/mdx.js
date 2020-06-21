import React from "react"
import { transform } from "@babel/standalone"
import mdx from "@mdx-js/mdx"
import { mdx as createElement, MDXProvider } from "@mdx-js/react"
import babelPluginTransformReactJsx from "@babel/plugin-transform-react-jsx"
import babelPluginRemoveExportKeywords from "babel-plugin-remove-export-keywords"
const babelPluginCopyKeyProp = require(`../renderer/babel-plugin-copy-key-prop`)
const babelPluginMoveExportKeywords = require(`../renderer/babel-plugin-move-export-keywords`)
const { useInputByKey } = require(`../renderer/input-provider`)
const { useResourceByKey } = require(`../renderer/resource-provider`)

const transformJsx = jsx => {
  const { code } = transform(jsx, {
    plugins: [
      // babelPluginRemoveExportKeywords,
      babelPluginCopyKeyProp,
      babelPluginMoveExportKeywords,
      [babelPluginTransformReactJsx, { useBuiltIns: true }],
    ],
  })

  return code
}

const transformCodeForEval = jsx => `${jsx}

  return React.createElement(MDXProvider, { components },
    React.createElement(MDXContent, props)
  );`

const mdxCache = new Map()
const jsxCache = new Map()

export default ({ children: mdxSrc, scope, components, ...props }) => {
  const fullScope = {
    mdx: createElement,
    MDXProvider,
    React,
    components,
    props,
    useInputByKey,
    useResourceByKey,
    ...scope,
  }
  const scopeKeys = Object.keys(fullScope)
  const scopeValues = Object.values(fullScope)

  let jsxFromMdx
  if (mdxCache.has(mdxSrc)) {
    jsxFromMdx = mdxCache.get(mdxSrc)
  } else {
    jsxFromMdx = mdx.sync(mdxSrc, { skipExport: true })
    mdxCache.set(mdxSrc, jsxFromMdx)
  }

  let srcCode
  if (jsxCache.has(jsxFromMdx)) {
    srcCode = jsxCache.get(jsxFromMdx)
  } else {
    srcCode = transformJsx(jsxFromMdx)
    jsxCache.set(jsxFromMdx, srcCode)
  }

  const fn = new Function(...scopeKeys, transformCodeForEval(srcCode))

  return fn(...scopeValues)
}