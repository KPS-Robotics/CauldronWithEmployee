import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register the WebviewViewProvider
    const provider = new CauldronWithEmployeeProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(CauldronWithEmployeeProvider.viewType, provider)
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
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
		const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'out', 'tailwind.css')
        );
        const imageUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'mc.gif') 
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
                <h1>test!</h1>
                <p>This is a simple webview showing a "Hello World" message.</p>
                  <img src="${imageUri}" alt="Example Image" />
            </body>
            </html>`;
    }
}

export function deactivate() {}
