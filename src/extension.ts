"use strict";
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register the WebviewViewProvider
    const provider = new CauldronWithEmployeeProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            CauldronWithEmployeeProvider.viewType,
            provider
        )
    );

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
  vscode.workspace.onDidOpenTextDocument(
    (textDocument) => {
        if ((textDocument.uri.scheme !== "file")) {
            return;
          }
        const [numErrors, numWarnings] = getNumErrors();
        provider.updateDiagnosticsChangeText(numErrors, numWarnings);
    },
    null,
    context.subscriptions
  );

  // Update on editor switch.
    vscode.window.onDidChangeActiveTextEditor(
    (textEditor) => {
      if (textEditor === undefined) {
        return;
      }
      const [numErrors, numWarnings] = getNumErrors();
        provider.updateDiagnosticsChangeText(numErrors, numWarnings);
    },
    null,
    context.subscriptions
  );
}

class CauldronWithEmployeeProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'CauldronWithEmployeeView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
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
        console.log(`Errors: ${numErrors}, Warnings: ${numWarnings}`);

        // Display the initial error and warning count in the webview
        this.updateDiagnostics(numErrors, numWarnings);
    }
    public updateDiagnostics(numErrors: number, numWarnings: number) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateDiagnostics',
                numErrors: numErrors,
                numWarnings: numWarnings
            });
        }
    }

    public updateDiagnosticsChangeText(numErrors: number, numWarnings: number) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateDiagnosticsChangeText',
                numErrors: numErrors,
                numWarnings: numWarnings
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'out', 'tailwind.css')
        );
        const nothingUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'nothing.PNG') 
        );
        const explosionUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'explosion.PNG') 
        );
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="${styleUri}">
            </head>
            <body class="bg-black text-red-500">
                <h1>Diagnostics</h1>
                <p id="diagnostics">Errors: 0, Warnings: 0</p>
                <img src="${nothingUri}" id="mc" alt="Example Image" />

                <script>
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateDiagnostics') {
                            if (message.numErrors !== 0) {
                                document.getElementById('mc').src = "${explosionUri}";
                            } else {
                                document.getElementById('mc').src = "${nothingUri}";
                            }
                        }
                        if (message.command === 'updateDiagnosticsChangeText') {
                            document.getElementById('diagnostics').textContent = 
                                'Errors: ' + message.numErrors + ', Warnings: ' + message.numWarnings;
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}

// Function to get the number of errors and warnings
function getNumErrors(): [number, number] {
    const diagnostics = vscode.languages.getDiagnostics();
    let numErrors = 0;
    let numWarnings = 0;

    diagnostics.forEach(([uri, diagnosticList]) => {
        diagnosticList.forEach(diagnostic => {
            if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                numErrors++;
            } else if (diagnostic.severity === vscode.DiagnosticSeverity.Warning) {
                numWarnings++;
            }
        });
    });

    return [numErrors, numWarnings];
}

export function deactivate() {}