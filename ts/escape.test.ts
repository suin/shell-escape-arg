import { describe, expect, test } from "bun:test";
import escapeArg from "./index";

interface SuccessCase {
  name: string;
  input: string;
  expected: string;
}

interface ErrorCase {
  name: string;
  input: unknown;
  errorType: { new (): Error };
  errorMessage: string;
}

const successCases: Array<SuccessCase> = [
  // Unquoted
  { name: "plain ascii", input: "abc", expected: "abc" },
  { name: "japanese", input: "日本語", expected: "日本語" },
  { name: "emoji", input: "👍", expected: "👍" },
  { name: "hyphen", input: "foo-bar", expected: "foo-bar" },
  { name: "dots", input: "a.b.c", expected: "a.b.c" },
  { name: "slashes", input: "./path/to/file", expected: "./path/to/file" },
  { name: "colon", input: "gh:repo", expected: "gh:repo" },
  { name: "at", input: "user@host", expected: "user@host" },
  { name: "comma", input: "a,b,c", expected: "a,b,c" },
  { name: "plus", input: "a+b", expected: "a+b" },
  { name: "equals", input: "a=b", expected: "a=b" },
  { name: "percent", input: "100%_ok", expected: "100%_ok" },
  { name: "leading dash", input: "-n", expected: "-n" },
  { name: "leading digit", input: "123", expected: "123" },
  { name: "tilde not leading", input: "a~b", expected: "a~b" },

  // Empty
  { name: "empty", input: "", expected: "''" },

  // Unicode whitespace => quoted
  { name: "space", input: "a b", expected: "'a b'" },
  { name: "leading space", input: " a", expected: "' a'" },
  { name: "trailing space", input: "a ", expected: "'a '" },
  { name: "tab", input: "a\tb", expected: "'a\tb'" },
  { name: "newline", input: "a\nb", expected: "'a\nb'" },
  { name: "crlf", input: "a\r\nb", expected: "'a\r\nb'" },
  { name: "nbsp", input: "a\u00a0b", expected: "'a\u00a0b'" },
  { name: "ideographic space", input: "a\u3000b", expected: "'a\u3000b'" },

  // ASCII controls (except NUL) => quoted
  { name: "SOH", input: "a\u0001b", expected: "'a\u0001b'" },
  { name: "ESC", input: "a\u001bb", expected: "'a\u001bb'" },
  { name: "DEL", input: "a\u007fb", expected: "'a\u007fb'" },

  // Blacklist chars => quoted
  { name: "single quote", input: "O'Reilly", expected: "'O'\\''Reilly'" },
  { name: "double quote", input: 'a"b', expected: "'a\"b'" },
  { name: "backslash", input: "a\\b", expected: "'a\\b'" },
  { name: "dollar", input: "a$b", expected: "'a$b'" },
  { name: "backtick", input: "a`b", expected: "'a`b'" },
  { name: "pipe", input: "a|b", expected: "'a|b'" },
  { name: "ampersand", input: "a&b", expected: "'a&b'" },
  { name: "semicolon", input: "a;b", expected: "'a;b'" },
  { name: "lt", input: "a<b", expected: "'a<b'" },
  { name: "gt", input: "a>b", expected: "'a>b'" },
  { name: "lparen", input: "a(b", expected: "'a(b'" },
  { name: "rparen", input: "a)b", expected: "'a)b'" },
  { name: "asterisk", input: "a*b", expected: "'a*b'" },
  { name: "question", input: "a?b", expected: "'a?b'" },
  { name: "lbracket", input: "a[b", expected: "'a[b'" },
  { name: "rbracket", input: "a]b", expected: "'a]b'" },
  { name: "lbrace", input: "a{b", expected: "'a{b'" },
  { name: "rbrace", input: "a}b", expected: "'a}b'" },
  { name: "bang", input: "a!b", expected: "'a!b'" },
  { name: "hash", input: "a#b", expected: "'a#b'" },

  // Leading tilde => quoted
  { name: "leading tilde", input: "~user", expected: "'~user'" },
  { name: "leading tilde with path", input: "~/src", expected: "'~/src'" },

  // Multiple single quotes
  {
    name: "multiple single quotes",
    input: "a'b'c",
    expected: "'a'\\''b'\\''c'",
  },
  { name: "single quotes and spaces", input: "a ' b", expected: "'a '\\'' b'" },
];

const errorCases: Array<ErrorCase> = [
  {
    name: "nul",
    input: "a\u0000b",
    errorType: Error,
    errorMessage: "escape: arg must not include NUL (\\u0000)",
  },
  {
    name: "non-string",
    input: null,
    errorType: TypeError,
    errorMessage: "escape: arg must be a string",
  },
];

describe("escape", () => {
  test.each(successCases)("$name", ({ input, expected }) => {
    expect(escapeArg(input)).toBe(expected);
  });

  test.each(errorCases)("err: $name", ({ input, errorType, errorMessage }) => {
    expect(() => escapeArg(input as never)).toThrow(errorType);
    expect(() => escapeArg(input as never)).toThrow(errorMessage);
  });
});
