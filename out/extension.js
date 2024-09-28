"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function activate(context) {
    // Register the WebviewViewProvider
    const provider = new CauldronWithEmployeeProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(CauldronWithEmployeeProvider.viewType, provider));
    // Update error and warning count when the user modifies the document
    vscode.languages.onDidChangeDiagnostics(() => {
        const [numErrors, numWarnings] = getNumErrors();
        console.log(`Errors: ${numErrors}, Warnings: ${numWarnings}`);
        // Update the webview with the new counts if it's active
        provider.updateDiagnosticsChangeText(numErrors, numWarnings);
    });
    // Update error and warning count when the user saves a file
    vscode.workspace.onDidSaveTextDocument(() => {
        const [numErrors, numWarnings] = getNumErrors();
        console.log(`Errors: ${numErrors}, Warnings: ${numWarnings}`);
        // Update the webview with the new counts if it's active
        provider.updateDiagnostics(numErrors, numWarnings);
    });
    // Note: URIs for onDidOpenTextDocument() can contain schemes other than file:// (such as git://)
    vscode.workspace.onDidOpenTextDocument((textDocument) => {
        if ((textDocument.uri.scheme !== "file")) {
            return;
        }
        const [numErrors, numWarnings] = getNumErrors();
        provider.updateDiagnosticsChangeText(numErrors, numWarnings);
    }, null, context.subscriptions);
    // Update on editor switch.
    vscode.window.onDidChangeActiveTextEditor((textEditor) => {
        if (textEditor === undefined) {
            return;
        }
        const [numErrors, numWarnings] = getNumErrors();
        provider.updateDiagnosticsChangeText(numErrors, numWarnings);
    }, null, context.subscriptions);
}
class CauldronWithEmployeeProvider {
    _extensionUri;
    static viewType = 'CauldronWithEmployeeView';
    _view;
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        // Allow scripts in the webview
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        // Set the HTML content
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Log diagnostics for all files
        const [numErrors, numWarnings] = getNumErrors();
        // Display the initial error and warning count in the webview
        this.updateDiagnostics(numErrors, numWarnings);
    }
    updateDiagnostics(numErrors, numWarnings) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateDiagnostics',
                numErrors: numErrors,
                numWarnings: numWarnings
            });
        }
    }
    updateDiagnosticsChangeText(numErrors, numWarnings) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateDiagnosticsChangeText',
                numErrors: numErrors,
                numWarnings: numWarnings
            });
        }
    }
    _getHtmlForWebview(webview) {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'tailwind.css'));
        const nothingUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'nothing.GIF'));
        const explosionUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'explosion.GIF'));
        const errorUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'error.GIF'));
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="${styleUri}">
            </head>
            <body class="bg-transparent p-0 m-0">
            <div class="absolute bottom-0">
            <div class="text-center">
                <h1 class="text-xl">Compound medicine</h1>
                <p id="diagnostics" class="text-red-500">Errors: 0 Warnings: 0</p>
            </div>
                <img src="${nothingUri}" id="mc" alt="Example Image" class="pt-32" />
                </div>
                <script>
                const delay = ms => new Promise(res => setTimeout(res, ms));
                    window.addEventListener('message',async event => {
                        const message = event.data;
                        if (message.command === 'updateDiagnostics') {
                            if (message.numErrors !== 0) {
                                document.getElementById('mc').src = "${explosionUri}";
                                 await delay(600);
                                 document.getElementById('mc').src = "${errorUri}";
                            } else {
                                document.getElementById('mc').src = "${nothingUri}";
                                 
                            }
                        }
                        if (message.command === 'updateDiagnosticsChangeText') {
                            document.getElementById('diagnostics').textContent = 
                                'Errors: ' + message.numErrors + ' Warnings: ' + message.numWarnings;
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}
// Function to get the number of errors and warnings
function getNumErrors() {
    const diagnostics = vscode.languages.getDiagnostics();
    let numErrors = 0;
    let numWarnings = 0;
    diagnostics.forEach(([uri, diagnosticList]) => {
        diagnosticList.forEach(diagnostic => {
            if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                numErrors++;
            }
            else if (diagnostic.severity === vscode.DiagnosticSeverity.Warning) {
                numWarnings++;
            }
        });
    });
    return [numErrors, numWarnings];
}
function deactivate() { }
//# sourceMappingURL=extension.js.map