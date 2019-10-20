import * as vscode from 'vscode';
import * as js2flowchart from "js2flowchart";

const flowcharts = {
	'JS Flowchart': 'null',
};

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('ShowJSFlowchart.start', () => {
			FlowchartPanel.createOrShow(context.extensionPath);

		vscode.window.onDidChangeTextEditorSelection(
			(caught: vscode.TextEditorSelectionChangeEvent) => {
			  if (caught.textEditor === vscode.window.activeTextEditor) {
				if (FlowchartPanel.currentPanel) {
					FlowchartPanel.currentPanel._update();
				}                  
			  }
			}
		  );

		})
	);

	// if (vscode.window.registerWebviewPanelSerializer) {
	// 	// Make sure we register a serializer in activation event
	// 	vscode.window.registerWebviewPanelSerializer(FlowchartPanel.viewType, {
	// 		async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
	// 			console.log(`Got state: ${state}`);
	// 			FlowchartPanel.revive(webviewPanel, context.extensionPath);
	// 		}
	// 	});
	// }
}

/**
 * Manages cat coding webview panels
 */
class FlowchartPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: FlowchartPanel | undefined;
	public static readonly viewType = 'JS Flowchart';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (FlowchartPanel.currentPanel) {
			FlowchartPanel.currentPanel._panel.reveal(column);
			//FlowchartPanel.currentPanel._panel.dispose();//dispose, then create.//TODO, how to update??

			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			FlowchartPanel.viewType,
			'JS Flowchart',
			vscode.ViewColumn.Beside,  //column || vscode.ViewColumn.Two, 
			{
				// Enable javascript in the webview
				enableScripts: true,
				// And restrict the webview to only loading content from our extension's `media` directory.
				//localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
				//localResourceRoots: [vscode.Uri.parse("flowmaker://authority/flowmaker")]
			}
		);

		FlowchartPanel.currentPanel = new FlowchartPanel(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		FlowchartPanel.currentPanel = new FlowchartPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		FlowchartPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	public _update() {
		const webview = this._panel.webview;
		this._updateForFC(webview, 'JS Flowchart');
		return;
	}

	private _updateForFC(webview: vscode.Webview, FCName: keyof typeof flowcharts) {
		this._panel.title = FCName;
		this._panel.webview.html = this._getHtmlForWebview();
	}

	private _getHtmlForWebview() {
		// Use a nonce to whitelist which scripts can be run
		const svg1 = getNonce();
		const SelectedText = getSelectedText();
		
		return `
			<html lang="en">
			<body style="background-color:white;">
				<div>${svg1}</div>
				<!--
				<h1 id="lines-of-code-counter">0</h1>
				<div>${SelectedText}</div>-->
			</body>
            </html>`;
	}
}

var text = '';
var svg1 = " "; 
function getNonce() {
	if(vscode.window.activeTextEditor===undefined){
		//doesn't give text null if nothing activated.
		return svg1;
	}
	else if(vscode.window.activeTextEditor!=null){
		let WindowP = vscode.window.activeTextEditor;
		// if (!(WindowP.document.languageId === "javascript")) {
		// var  svg1 = "Only .js file is supported";
		//   return "Only .js file is supported";
		// }
		//get selected range text
		let wordRange = new vscode.Range(WindowP.selection.start, WindowP.selection.end);
		text = WindowP.document.getText(wordRange);
		
		//get whole text
		// text = WindowP.document.getText();
	}
	//	var svg1 = js2flowchart.convertCodeToSvg(text);
	const {createSVGRender, convertCodeToFlowTree} = js2flowchart;
	const flowTree = convertCodeToFlowTree(text),
	svgRender = createSVGRender();
	//applying another theme for render
	svgRender.applyLightTheme();
	svg1 = svgRender.buildShapesTree(flowTree).print();
		
	return svg1;
}

function getSelectedText() {
	let text = '';

	if(vscode.window.activeTextEditor!=null){
		let WindowP = vscode.window.activeTextEditor;
		// if (!(WindowP.document.languageId === "javascript")) {
		// var  svg1 = "Only .js file is supported";
		//   return "Only .js file is supported";
		// }
		
	//get selected range text
	let wordRange = new vscode.Range(WindowP.selection.start, WindowP.selection.end);
	text = WindowP.document.getText(wordRange);

	return text;
}
}