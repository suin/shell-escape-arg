/**
 * Convert a string into a POSIX sh-safe single argument literal.
 *
 * Escapes a JavaScript string so it can be safely used as a single argument
 * in POSIX-compatible shells (sh, bash, zsh, dash, etc.). The result, when
 * parsed by the shell, produces exactly one argument with the original content.
 *
 * ## Escaping Strategy
 *
 * - **Safe strings are returned as-is**: Plain alphanumeric, Japanese, emoji,
 *   and other "harmless" Unicode characters pass through unchanged.
 * - **Unsafe strings are single-quoted**: Wraps in `'...'` with internal `'`
 *   escaped as `'\''` (close, escaped quote, reopen).
 *
 * ## When Quoting is Required
 *
 * - Empty string (would disappear without quotes)
 * - Contains Unicode whitespace (space, tab, newline, NBSP, ideographic space, etc.)
 * - Contains ASCII control characters (U+0001–U+001F, U+007F)
 * - Contains shell meta-characters: `' " \ $ \` | & ; < > ( ) * ? [ ] { } ! #`
 * - Starts with `~` (prevents tilde expansion)
 *
 * ## Limitations
 *
 * - **Single argument only**: Does not build or format entire command lines.
 * - **POSIX shells only**: Not for Windows cmd.exe or PowerShell.
 * - **Shell parsing safety only**: Does not protect against program-level
 *   option interpretation (e.g., `--dangerous-flag`).
 *
 * @param arg - The string to escape for shell use.
 * @returns The escaped string, safe to use as a single shell argument.
 * @throws {TypeError} If `arg` is not a string.
 * @throws {Error} If `arg` contains NUL (`\u0000`), which POSIX arguments cannot include.
 *
 * @example
 * // Safe strings pass through unchanged
 * shellEscapeArg("abc")       // "abc"
 * shellEscapeArg("日本語")     // "日本語"
 *
 * @example
 * // Strings with spaces or special chars are quoted
 * shellEscapeArg("a b")       // "'a b'"
 * shellEscapeArg("$HOME")     // "'$HOME'"
 * shellEscapeArg("*.txt")     // "'*.txt'"
 *
 * @example
 * // Single quotes are escaped with '\''
 * shellEscapeArg("O'Reilly")  // "'O'\\''Reilly'"
 *
 * @example
 * // Empty string becomes ''
 * shellEscapeArg("")          // "''"
 *
 * @example
 * // Leading tilde is quoted to prevent expansion
 * shellEscapeArg("~user")     // "'~user'"
 */
export default function shellEscapeArg(arg: string): string {
  if (typeof arg !== "string") {
    throw new TypeError("escape: arg must be a string");
  }

  // POSIX process arguments cannot contain NUL.
  if (arg.includes("\u0000")) {
    throw new Error("escape: arg must not include NUL (\\u0000)");
  }

  // Unquoted fast-path when safe.
  if (!needsQuoting(arg)) {
    return arg;
  }

  // POSIX sh single-quote escaping: ' -> '\'' (close, escaped quote, reopen)
  return `'${arg.replaceAll("'", "'\\''")}'`;
}

/**
 * Check if string needs quoting for safe shell interpretation.
 * Empty strings, whitespace, control chars, meta-chars, and leading tilde all require quoting.
 */
function needsQuoting(s: string): boolean {
  return (
    s.length === 0 ||
    startsWithTilde(s) ||
    hasUnicodeWhitespace(s) ||
    hasAsciiControlChars(s) ||
    hasShellMetaChars(s)
  );
}

/**
 * Check if string contains ASCII control characters (U+0001–U+001F or U+007F).
 *
 * ASCII control characters are non-printable characters originally designed
 * to control devices like printers and terminals. They include:
 *
 * - **U+0001–U+001F (codes 1–31)**: SOH, STX, ETX, EOT, ENQ, ACK, BEL (bell sound),
 *   BS (backspace), HT (tab `\t`), LF (line feed `\n`), VT (vertical tab),
 *   FF (form feed), CR (carriage return `\r`), and others.
 * - **U+007F (code 127)**: DEL (delete), historically used to mark deleted characters
 *   on paper tape.
 *
 * These characters can cause unexpected behavior in terminals and shells, so they
 * must be quoted when used in shell arguments.
 *
 * Note: NUL (U+0000) is excluded here because it's handled separately as an error
 * case—POSIX process arguments cannot contain NUL bytes.
 */
function hasAsciiControlChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if ((code >= 0x01 && code <= 0x1f) || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Check if string contains shell meta-characters that require quoting.
 *
 * Shell meta-characters are characters that have special meaning to the shell
 * and would be interpreted rather than passed literally to commands. They include:
 *
 * **Quotes and Escapes:**
 * - `'` (single quote): Begins/ends literal quoting
 * - `"` (double quote): Begins/ends quoted string (allows `$` expansion inside)
 * - `\` (backslash): Escapes the next character
 * - `` ` `` (backtick): Command substitution (legacy syntax for `$(...)`)
 * - `$`: Variable expansion (`$VAR`) or command substitution (`$(cmd)`)
 *
 * **Operators and Redirections:**
 * - `|`: Pipe output to another command
 * - `&`: Run command in background, or logical AND (`&&`)
 * - `;`: Command separator
 * - `<` `>`: Input/output redirection
 * - `(` `)`: Subshell grouping
 *
 * **Glob Patterns and Brace Expansion:**
 * - `*`: Matches any characters (glob wildcard)
 * - `?`: Matches single character (glob wildcard)
 * - `[` `]`: Character class in glob patterns (e.g., `[a-z]`)
 * - `{` `}`: Brace expansion (e.g., `{a,b,c}` or `{1..10}`)
 *
 * **History and Comments:**
 * - `!`: History expansion in bash/zsh (e.g., `!!`, `!$`)
 * - `#`: Begins a comment (everything after is ignored)
 */
function hasShellMetaChars(s: string): boolean {
  return /['"\\$`|&;<>()*?[\]{}!#]/.test(s);
}

/**
 * Check if string contains Unicode whitespace (space, newline, NBSP, ideographic space, etc.).
 *
 * Uses the regex pattern `/[\p{White_Space}]/u` which leverages Unicode property escapes
 * (requires the `u` flag for Unicode mode). The `\p{White_Space}` property matches all
 * characters defined as whitespace in the Unicode standard, including:
 *
 * **ASCII Whitespace:**
 * - U+0009 HT (horizontal tab, `\t`)
 * - U+000A LF (line feed, `\n`)
 * - U+000B VT (vertical tab)
 * - U+000C FF (form feed)
 * - U+000D CR (carriage return, `\r`)
 * - U+0020 SPACE (regular space)
 *
 * **Non-ASCII Whitespace:**
 * - U+0085 NEL (next line)
 * - U+00A0 NBSP (non-breaking space)
 * - U+1680 Ogham space mark
 * - U+2000–U+200A Various typographic spaces (en space, em space, thin space, etc.)
 * - U+2028 Line separator
 * - U+2029 Paragraph separator
 * - U+202F Narrow no-break space
 * - U+205F Medium mathematical space
 * - U+3000 Ideographic space (fullwidth space used in CJK text)
 *
 * All whitespace characters cause word splitting in shells, so they must be quoted.
 */
function hasUnicodeWhitespace(s: string): boolean {
  return /[\p{White_Space}]/u.test(s);
}

/**
 * Check if string starts with tilde (would trigger tilde expansion).
 *
 * In POSIX shells, a tilde (`~`) at the beginning of a word triggers "tilde expansion":
 *
 * - `~` alone expands to the current user's home directory (`$HOME`)
 * - `~username` expands to that user's home directory (e.g., `~root` → `/root`)
 * - `~/path` expands to a path under the home directory (e.g., `~/docs` → `/home/user/docs`)
 *
 * This expansion happens before the argument reaches the command, which means:
 *
 * - Input `~admin` intended as a literal string would become `/home/admin`
 * - Input `~/../../etc/passwd` could resolve to an unintended path
 *
 * To prevent this, strings starting with `~` must be quoted so the shell treats the
 * tilde as a literal character rather than triggering expansion.
 *
 * Note: A tilde appearing anywhere other than the start of the string (e.g., `a~b`)
 * does not trigger expansion and does not require quoting for this reason.
 */
function startsWithTilde(s: string): boolean {
  return s.startsWith("~");
}
