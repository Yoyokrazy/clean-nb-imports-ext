/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/ 

/**
 * Todo:
 * - [ ] turn off if first code cell = top cell of document
 */

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const notebookSelector: vscode.DocumentSelector = {
		scheme: 'vscode-notebook-cell',
		language: 'python',
	};


	// Notebook Level Code Action Provider
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(notebookSelector, new CleanImportProvider(), {
			providedCodeActionKinds: CleanImportProvider.providedCodeActionKinds,
		})
	);

	// Cell Level Code Action Provider
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(notebookSelector, new SampleCodeActionProvider(), {
			providedCodeActionKinds: SampleCodeActionProvider.providedCodeActionKinds
		})
	);
	
}
/**

/**

 * Notebook Level Code Action Provider
 * Takes all mentions of import "xx" and duplicates them to a new top code cell.
 * todo: actually remove the imports from each cell...
 */
export class CleanImportProvider implements vscode.CodeActionProvider {
	static readonly notebookKind = new vscode.CodeActionKind('notebook.cleanImports');

	public static readonly providedCodeActionKinds = [
		CleanImportProvider.notebookKind
	];

	public provideCodeActions(
		document: vscode.TextDocument,
		_range: vscode.Range | vscode.Selection,
		_context: vscode.CodeActionContext,
		_token: vscode.CancellationToken
	): vscode.CodeAction[] | undefined {		

		const notebookDocument = this.getNotebookDocument(document);
		if (!notebookDocument) {
			return;
		}
		if(!this.isFirstCodeCell(document, notebookDocument)){
			return;
		}
		
		

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

		const fix = new vscode.CodeAction('Extract imports to new cell.', CleanImportProvider.notebookKind);
		fix.edit = new vscode.WorkspaceEdit();
		fix.edit.set(notebookDocument.uri, [nbEdit]);
		return [fix];
	}

	private isFirstCodeCell(cellDocument: vscode.TextDocument, notebookDocument: vscode.NotebookDocument): boolean {
		for(const iter of notebookDocument.getCells()){
			// skip md cells
			if(iter.kind !== vscode.NotebookCellKind.Code){
				continue;
			}

			// check if parameter TextDocument represents the first code cell of the notebook
			if(cellDocument.uri !== iter.document.uri){
				return false;
			} else {
				break;
			}
		}
		return true;
	}

	private getNotebookDocument(document: vscode.TextDocument): vscode.NotebookDocument | undefined {
		for (const nb of vscode.workspace.notebookDocuments) {
			if (nb.uri.path === document.uri.path) {
				return nb;
			}
		}
		return undefined;
	}

	private extractImportsAndCreateCellEdits(notebookDocument: vscode.NotebookDocument) {
		const cellEdits:vscode.NotebookEdit[] = [];
		const importStatements:vscode.TextLine[] = [];
		
		let importText = '';
		let firstImport = true;
		for(const cell of notebookDocument.getCells()){
			if(cell.kind !== vscode.NotebookCellKind.Code){
				continue;
			}

			let i = 0;
			let f = true;
			let line = cell.document.lineAt(i);
			let nonImportText = '';
			while(i < cell.document.lineCount){
				if(line.text.startsWith('import ')){
					if(importStatements.includes(line)){
						continue;
					}

					importStatements.push(line);
					if(firstImport){
						importText += `${line.text}`;
						firstImport = false;
					} else{
						importText += `\n${line.text}`;
					}
				} else {
					if(f){
						nonImportText += `${line.text}`;
						f = false;
					} else {
						nonImportText += `\n${line.text}`;
					}
				}

				try {
					line = cell.document.lineAt(++i);
				} catch {
					break;
				}
			} // cell line iterator close

			const newCell = [new vscode.NotebookCellData(
				vscode.NotebookCellKind.Code,
				nonImportText,
				'python'
			)];
			const cellEdit = new vscode.NotebookEdit(new vscode.NotebookRange(cell.index,cell.index), newCell);
			cellEdits.push(cellEdit);
		} // notebook cell iterator close

		return {
			importStatements: importStatements,
			cellEdits: cellEdits,
			importText: importText,
		};
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
				kind: vscode.CodeActionKind.SourceFixAll,
			},
		];
	}
}
