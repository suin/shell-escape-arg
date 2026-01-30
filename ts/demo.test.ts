import { describe, expect, test } from "bun:test";
import shellEscapeArg from "@suin/shell-escape-arg";

describe("shellEscapeArg demo", () => {
  test("Safe strings pass through unchanged", () => {
    expect(shellEscapeArg("abc")).toBe("abc");
    expect(shellEscapeArg("日本語")).toBe("日本語");
  });

  test("Strings with spaces or special chars are quoted", () => {
    expect(shellEscapeArg("a b")).toBe("'a b'");
    expect(shellEscapeArg("$HOME")).toBe("'$HOME'");
    expect(shellEscapeArg("*.txt")).toBe("'*.txt'");
  });

  test("Single quotes are escaped with '\\''", () => {
    expect(shellEscapeArg("O'Reilly")).toBe("'O'\\''Reilly'");
  });

  test("Empty string becomes ''", () => {
    expect(shellEscapeArg("")).toBe("''");
  });

  test("Leading tilde is quoted to prevent expansion", () => {
    expect(shellEscapeArg("~user")).toBe("'~user'");
  });
});
