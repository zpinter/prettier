"use strict";

const createError = require("../common/parser-create-error");

function parse(text, parsers, opts) {
  // Inline the require to avoid loading all the JS if we don't use it
  const babylon = require("babylon");

  const babylonOptions = {
    sourceType: "module",
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    plugins: [
      "jsx",
      "flow",
      "doExpressions",
      "objectRestSpread",
      "decorators",
      "classProperties",
      "exportDefaultFrom",
      "exportNamespaceFrom",
      "asyncGenerators",
      "functionBind",
      "functionSent",
      "dynamicImport",
      "numericSeparator",
      "importMeta",
      "optionalCatchBinding",
      "optionalChaining",
      "classPrivateProperties",
      "pipelineOperator",
      "nullishCoalescingOperator"
    ]
  };

  const parseMethod =
    opts && opts.parser === "json" ? "parseExpression" : "parse";

  let ast;
  try {
    ast = babylon[parseMethod](text, babylonOptions);
  } catch (originalError) {
    if (!opts.fromRetry && originalError.message) {
      const match = originalError.message.match(
        /^Unexpected token, expected "," \((\d+):(\d+)\)$/
      );
      if (match) {
        const lineno = parseInt(match[1]);
        const colno = parseInt(match[2]);
        const lines = text.split("\n");
        let line = lines[lineno - 1];
        line = line.slice(0, colno - 1) + "," + line.slice(colno - 1);
        lines[lineno - 1] = line;
        const updated = lines.join("\n");

        try {
          return parse(
            updated,
            parsers,
            Object.assign({}, opts, { fromRetry: true })
          );
        } catch (error) {
          //do nothing
        }
      }
    }

    try {
      ast = babylon[parseMethod](
        text,
        Object.assign({}, babylonOptions, { strictMode: false })
      );
    } catch (nonStrictError) {
      throw createError(
        // babel error prints (l:c) with cols that are zero indexed
        // so we need our custom error
        originalError.message.replace(/ \(.*\)/, ""),
        {
          start: {
            line: originalError.loc.line,
            column: originalError.loc.column + 1
          }
        }
      );
    }
  }
  delete ast.tokens;
  return ast;
}

module.exports = parse;
