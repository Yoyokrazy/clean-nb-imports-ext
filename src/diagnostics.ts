/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

/** To demonstrate code actions associated with Diagnostics problems, this file provides a mock diagnostics entries. */


// ! IGNORE THIS FILE, NOT IMPLEMENTED YET -- AT ALL

import * as vscode from 'vscode';

/** Code that is used to associate diagnostic entries with code actions. */
export const IMPORT_MENTION = 'import_mention';

/** String to detect in the text document. */
const IMPORT = 'import';

/**
 * Analyzes the text document for problems.
 * This demo diagnostic problem provider finds all mentions of 'import'.
 * @param doc text document to analyze
 * @param importDiagnostics diagnostic collection
 */
export function refreshDiagnostics(
	doc: vscode.TextDocument,
	importDiagnostics: vscode.DiagnosticCollection
): void {
	const diagnostics: vscode.Diagnostic[] = [];

	for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
		const lineOfText = doc.lineAt(lineIndex);
		if (lineOfText.text.startsWith(IMPORT)) {
			diagnostics.push(createDiagnostic(doc, lineOfText, lineIndex));
		}
	}

	importDiagnostics.set(doc.uri, diagnostics);
}

function createDiagnostic(
    doc: vscode.TextDocument,
    lineOfText: vscode.TextLine,
    lineIndex: number
): vscode.Diagnostic {
    // find where in the line of that the 'emoji' is mentioned
    const index = lineOfText.text.indexOf(IMPORT);

    // create range that represents, where in the document the word is
    const range = new vscode.Range(lineIndex, 0, lineIndex, lineOfText.range.end.character);

    const diagnostic = new vscode.Diagnostic(
        range,
        "CodeAction 'Clean Imports' is available.",
        vscode.DiagnosticSeverity.Hint
    );
    diagnostic.code = IMPORT_MENTION;
    return diagnostic;
}

export function subscribeToDocumentChanges(
	context: vscode.ExtensionContext,
	importDiagnostics: vscode.DiagnosticCollection
): void {
	if (vscode.window.activeTextEditor) {
		refreshDiagnostics(vscode.window.activeTextEditor.document, importDiagnostics);
	}
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (editor) {
				refreshDiagnostics(editor.document, importDiagnostics);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((e) =>
			refreshDiagnostics(e.document, importDiagnostics)
		)
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument((doc) => importDiagnostics.delete(doc.uri))
	);
}
