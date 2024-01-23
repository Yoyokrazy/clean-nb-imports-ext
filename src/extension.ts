/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import path = require('path');
import * as fs from 'fs';
import * as vscode from 'vscode';
import { CodeActionKind, Disposable, Uri, env } from 'vscode';
import { EXTENSION_ROOT_DIR } from './constants';


export function openIssueReporter() {
	const template = getTemplate();
	const data = getData();

	// TODO: add a command to open the issue reporter
	vscode.commands.executeCommand('workbench.action.openIssueReporter', {
		extensionId: 'ms-python.python',
		issueTitle: 'title here',
		command: {
			template: template,
			// data: data,
			uri: Uri.parse('https://github.com/microsoft/vscode-copilot-release').toString(),
		}
	});
}

function getTemplate(): string {
	const templatePath = path.join(EXTENSION_ROOT_DIR, 'resources', 'report_issue_template.md');
	try {
		const data = fs.readFileSync(templatePath, 'utf-8');
		return data;
	} catch (err) {
		throw new Error(`Error reading the file: ${err}`);
	}
}
function getData(): string {
	return 'temp data here: add some data stuff, fill in with more stuff, whoooohooo';
}


export async function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.openIssueReporter', openIssueReporter));

	// Custom Code Action with new ranges property
	class RangedCodeAction extends vscode.CodeAction {
		// Would most likely be provided by extension, by its code action edits or diagnostics
		override readonly ranges = [new vscode.Range(4, 0, 4, 10), new vscode.Range(1, 0, 1, 10)];
	}

	// Code Action Provider
	class OpenIssueReporterActionProvider implements vscode.CodeActionProvider {
		static readonly providedCodeActionKinds = [
			vscode.CodeActionKind.Refactor
		];

		provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeAction[]> {
			const action = new RangedCodeAction('Open Issue Reporter', OpenIssueReporterActionProvider.providedCodeActionKinds[0]);
			action.command = {
				command: 'extension.openIssueReporter',
				title: 'Demo: Open Issue Reporter',
			};
			return [action];
		}
	}

	context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, new OpenIssueReporterActionProvider(), {
		providedCodeActionKinds: OpenIssueReporterActionProvider.providedCodeActionKinds
	}));

	const filePath = path.join(EXTENSION_ROOT_DIR, 'resources', 'foo.txt');

	const notebookSelector: vscode.DocumentSelector = {
		notebookType: 'jupyter-notebook',
	};

	// context.subscriptions.push(registerIssueUriRequestHandler());
	// context.subscriptions.push(registerIssueDataProvider());

	// Notebook Level Code Action Provider
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(notebookSelector, new CleanImportProvider(), {
			providedCodeActionKinds: CleanImportProvider.providedCodeActionKinds,
		})
	);

	// Cell Level Code Action Provider
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			notebookSelector,
			new SampleCodeActionProvider(),
			{
				providedCodeActionKinds: SampleCodeActionProvider.providedCodeActionKinds,
			}
		)
	);
}

/**
 * Notebook Level Code Action Provider
 * Takes all mentions of import "xx" and extracts them to a new top code cell.
 */
export class CleanImportProvider implements vscode.CodeActionProvider {
	static readonly cleanImportKind = CodeActionKind.Notebook.append(
		CodeActionKind.Source.append('cleanImports').value
	);

	public static readonly providedCodeActionKinds = [CleanImportProvider.cleanImportKind];

	constructor() {
		console.log('CREATED -- CleanImportProvider');
	}

	public provideCodeActions(
		document: vscode.TextDocument,
		_range: vscode.Range | vscode.Selection,
		_context: vscode.CodeActionContext,
		_token: vscode.CancellationToken
	): vscode.CodeAction[] | undefined {
		// console.log(`PROVIDED -- ${document.uri}`);

		const notebookDocument = this.getNotebookDocument(document);
		if (!notebookDocument) {
			return;
		}

		const edits = this.extractImportsAndCreateCellEdits(notebookDocument);
		if (!edits) {
			return;
		}

		const fix = new vscode.CodeAction(
			'Extract imports to new cell.',
			CleanImportProvider.cleanImportKind
		);
		fix.edit = new vscode.WorkspaceEdit();
		fix.edit.set(notebookDocument.uri, edits);
		return [fix];
	}

	private extractImportsAndCreateCellEdits(notebookDocument: vscode.NotebookDocument) {
		const nbEdits: vscode.NotebookEdit[] = [];
		const importStatements: vscode.TextLine[] = [];

		for (const cell of notebookDocument.getCells()) {
			if (cell.kind !== vscode.NotebookCellKind.Code) {
				continue;
			}

			let i = 0;
			let nonImportText = '';
			while (i < cell.document.lineCount) {
				const l = cell.document.lineAt(i);
				if (l) {
					if (l.text.startsWith('import') || l.text.startsWith('from')) {
						if (!importStatements.includes(l)) {
							importStatements.push(l);
						}
					} else {
						nonImportText += l.text + '\n';
					}
				}
				i++;
			}

			// create the edit to remove the imports from the cell
			const newCell = new vscode.NotebookCellData(
				vscode.NotebookCellKind.Code,
				nonImportText,
				'python'
			);
			nbEdits.push(
				vscode.NotebookEdit.replaceCells(
					new vscode.NotebookRange(cell.index, cell.index + 1),
					[newCell]
				)
			);
		}

		if (!importStatements.length) {
			return;
		}

		// create the edit to create a new top cell containing all imports
		const newCell = new vscode.NotebookCellData(
			vscode.NotebookCellKind.Code,
			importStatements.map((l) => l.text).join('\n') + '\n',
			'python'
		);
		nbEdits.push(new vscode.NotebookEdit(new vscode.NotebookRange(0, 0), [newCell]));
		return nbEdits;
	}

	private getNotebookDocument(
		document: vscode.TextDocument
	): vscode.NotebookDocument | undefined {
		for (const nb of vscode.workspace.notebookDocuments) {
			if (nb.uri.path === document.uri.path) {
				return nb;
			}
		}
		return undefined;
	}
}

/**
 * Cell Level Code Action Provider
 * Provides code actions adding import pandas at beginning of cell(s)
 * Just a test platform, no good functionality
 */
export class SampleCodeActionProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [vscode.CodeActionKind.SourceFixAll];

	provideCodeActions(
		document: vscode.TextDocument,
		_range: vscode.Range | vscode.Selection,
		_context: vscode.CodeActionContext,
		_token: vscode.CancellationToken
	): vscode.CodeAction[] {
		const edit = new vscode.WorkspaceEdit();
		edit.insert(document.uri, new vscode.Position(0, 0), 'import pandas as pd\n');

		return [
			{
				title: 'Fix Cell',
				edit: edit,
				kind: vscode.CodeActionKind.SourceFixAll,
			},
		];
	}
}

let stringMD = 'did not properly get markdown file';
const templatePath = path.join(EXTENSION_ROOT_DIR, 'resources', 'report_issue_template.md');

fs.readFile(templatePath, 'utf-8', (err, data) => {
	if (err) {
		console.error(`Error reading the file: ${err}`);
	} else {
		// The file content is now in the 'data' variable
		stringMD = data;
	}
});

// function registerIssueUriRequestHandler(): Disposable {
// 	return env.registerIssueUriRequestHandler({
// 		handleIssueUrlRequest: () => Uri.parse('https://github.com/microsoft/vscode-copilot-release'),
// 	});
// }

// function registerIssueDataProvider(): Disposable {
// 	return env.registerIssueDataProvider({
// 		provideIssueTemplate: () => {
// 			return stringMD;
// 			;
// 		},
// 		provideIssueData: async () => {
// 			// You can change the timeout here to see the loading/error state.
// 			await new Promise((resolve) => setTimeout(resolve, 2000));
// 			return 'temp data here: add some data stuff, fill in with more stuff, whoooohooo';
// 		},

// 	});
// }

