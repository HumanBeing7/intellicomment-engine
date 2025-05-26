# IntelliComment Engine

**IntelliComment Engine** is a smart static analysis and documentation tool for JavaScript functions. It automatically generates JSDoc comments, detects unreachable code, infinite loops, unused variables, and visualizes control flow graphs—all within Visual Studio Code.

---

## Features

- 📝 **Automatic JSDoc Generation:**  
  Instantly generate JSDoc comments for your JavaScript functions with a single command.

- 🧠 **Static Code Analysis:**  
  Detects unreachable code, infinite loops, and unused variables in your functions.

- 🔍 **Control Flow Graph Visualization:**  
  Visualize the control flow graph (CFG) of any selected function in an interactive webview.

- 🚫 **No Duplicate Comments:**  
  Skips functions that already have JSDoc comments to keep your code clean.

---

## Usage

1. **Select a JavaScript function** in your editor.
2. Press `Ctrl+Alt+J` (or run the command from the Command Palette) to generate a JSDoc comment above the function.
3. To visualize a function's control flow graph, select the function and press `Ctrl+Alt+G` (or run the command from the Command Palette).

---

## Commands

| Command                                       | Description                                      | Shortcut         |
|-----------------------------------------------|--------------------------------------------------|------------------|
| `intellicomment-engine.analyzeFile`           | Generate JSDoc for the selected function(s)      | `Ctrl+Alt+J`     |
| `intellicomment-engine.showCFG`               | Show Control Flow Graph for the selected function| `Ctrl+Alt+G`     |

You can also access these commands via the Command Palette (`Ctrl+Shift+P`).

---

## Requirements

- Visual Studio Code v1.80.0 or higher
- JavaScript files (`.js`)

---

## Extension Settings

This extension does not contribute any custom settings at this time.

---

## Known Issues

- Only works with JavaScript files.
- JSDoc generation is based on static analysis and may not infer all types perfectly.

---

## Release Notes

### 1.0.0

- Initial release with JSDoc generation, static analysis, and CFG visualization.

---

## License

[MIT](LICENSE)

---

**Enjoy using IntelliComment Engine!**