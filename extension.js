const vscode = require('vscode');
const { extractFunctions } = require('./extractors/functionExtractor');
const { generateJSDoc } = require('./generators/jsdocGenerator');
const { cfgToDot } = require('./analyzer/cfgGenerator');
const Viz = require('viz.js');
const { Module, render } = require('viz.js/full.render.js');

function activate(context) {
    let disposable = vscode.commands.registerCommand('intellicomment-engine.analyzeFile', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const code = editor.document.getText();
        const selection = editor.selection;

        // Only proceed if there is a selection
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Please select a function to generate a JSDoc comment.');
            return;
        }

        // Run your analysis
        const functions = extractFunctions(code);

        // Find all functions overlapping with the selection
        const selStart = editor.document.offsetAt(selection.start);
        const selEnd = editor.document.offsetAt(selection.end);
        const targetFunctions = functions.filter(
            func => func.end > selStart && func.start < selEnd
        );
        if (targetFunctions.length === 0) {
            vscode.window.showWarningMessage('No function found at selection.');
            return;
        }

        // Prepare edits
        const edit = new vscode.WorkspaceEdit();
        const uri = editor.document.uri;

        // Sort by start descending to avoid offset issues
        const sortedFunctions = [...targetFunctions].sort((a, b) => b.start - a.start);

        for (const func of sortedFunctions) {
            const jsdoc = generateJSDoc(func) + '\n';
            const pos = editor.document.positionAt(func.start);
            edit.insert(uri, pos, jsdoc);
        }

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage('JSDoc comment(s) injected!');
    });

    context.subscriptions.push(disposable);

    let disposableCFG = vscode.commands.registerCommand('intellicomment-engine.showCFG', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const code = editor.document.getText();
        const selection = editor.selection;

        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Please select a function to visualize its CFG.');
            return;
        }

        const functions = extractFunctions(code);
        const selStart = editor.document.offsetAt(selection.start);
        const selEnd = editor.document.offsetAt(selection.end);
        // Find all functions overlapping with the selection
        const targetFunctions = functions.filter(
            func => func.end > selStart && func.start < selEnd
        );
        if (targetFunctions.length === 0) {
            vscode.window.showWarningMessage('No function found at selection.');
            return;
        }

        for (const func of targetFunctions) {
            // Generate DOT for the selected function's CFG
            const dot = cfgToDot(func.cfg, func.name);

            const vizInstance = new Viz({ Module, render });
            let svg;
            try {
                svg = await vizInstance.renderString(dot);
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to render CFG for ${func.name}: ${err.message}`);
                continue;
            }

            // Show SVG in a webview
            const panel = vscode.window.createWebviewPanel(
                'cfgView',
                `CFG: ${func.name}`,
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );
            panel.webview.html = `
        <html>
        <body>
            <h2>Control Flow Graph: ${func.name}</h2>
            <div>${svg}</div>
        </body>
        </html>
    `;
        }
    });

    context.subscriptions.push(disposableCFG);
}

exports.activate = activate;