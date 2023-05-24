/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
// import { subscribeToDocumentChanges, IMPORT_MENTION } from './diagnostics';

export function activate(context: vscode.ExtensionContext) {
	const notebookSelector: vscode.DocumentSelector = {
		scheme: 'vscode-notebook-cell',
		language: 'python',
	};

	// const importDiagnostics = vscode.languages.createDiagnosticCollection('import');
	// context.subscriptions.push(importDiagnostics);
	// subscribeToDocumentChanges(context, importDiagnostics);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(notebookSelector, new CleanImportProvider(), {
			providedCodeActionKinds: CleanImportProvider.providedCodeActionKinds,
		})
	);

	
	// context.subscriptions.push(
	// 	vscode.languages.registerCodeActionsProvider(notebookSelector, new SampleCodeActionProvider(), {
	// 		providedCodeActionKinds: SampleCodeActionProvider.providedCodeActionKinds
	// 	})
	// );
	
}

export class CleanImportProvider implements vscode.CodeActionProvider {
	static readonly notebookKind = new vscode.CodeActionKind('notebook.cleanImports');

	public static readonly providedCodeActionKinds = [
		CleanImportProvider.notebookKind
	];

	public provideCodeActions(
		document: vscode.TextDocument,
		_range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		_token: vscode.CancellationToken
	): vscode.CodeAction[] | undefined {
		// if(context.triggerKind !== vscode.CodeActionTriggerKind.Invoke){
		// 	return;
		// }		

		let notebookDocument;
		for (const nb of vscode.workspace.notebookDocuments) {
			if (nb.uri.path === document.uri.path) {
				notebookDocument = nb;
			}
		}
		if (!notebookDocument) {
			return;
		}

		const fix = new vscode.CodeAction('Extract imports to new cell.', CleanImportProvider.notebookKind);
		fix.edit = new vscode.WorkspaceEdit();

		const importStatements:vscode.TextLine[] = [];
		for(const cell of notebookDocument.getCells()){
			if(cell.kind !== vscode.NotebookCellKind.Code){
				continue;
			}
			let i = 0;
			let line = cell.document.lineAt(i);
			while(i < cell.document.lineCount){
				if(line.text.startsWith('import ')){
					importStatements.push(line);
				}
				try {
					line = cell.document.lineAt(++i);

				} catch {
					break;
				}
			}
		}
		if(!importStatements){
			return;
		}

		let importText = '';
		let first = true;
		for(const imp of importStatements){
			if(first){
				importText += `${imp.text}`;
				first = false;
			} else {
				importText += `\n${imp.text}`;
			}
		}
		const importCell = [new vscode.NotebookCellData(
			vscode.NotebookCellKind.Code,
			importText,
			'python'
		)];
		const nbEdit = new vscode.NotebookEdit(new vscode.NotebookRange(0,0), importCell);
		fix.edit.set(notebookDocument.uri, [nbEdit]);
		return [fix];
	}
}

/**
 * Provides code actions adding panda import at beginning of cell(s)
 * Just a test platform, no good functionality
 */
export class SampleCodeActionProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [vscode.CodeActionKind.SourceFixAll];

	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): vscode.CodeAction[] {
		const edit = new vscode.WorkspaceEdit();
		edit.insert(document.uri, new vscode.Position(0, 0), 'import pandas as pd\n');

		return [
			{
				title: 'Fix Cell',
				edit: edit,
				kind: vscode.NotebookCodeActionKind.Notebook,
			},
		];
	}
}
