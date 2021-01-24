'use strict';

import * as vscode from 'vscode';

const diagnosticsCollection = vscode.languages.createDiagnosticCollection("linkcheckerhtml");

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('extension.validateBpmn', function () {
		const editor = vscode.window.activeTextEditor;

		const getNamespaces = function (xmlModel: string) {
			if (xmlModel.includes('<definitions')) {
				return '';
			}

			const matched = xmlModel.match(/<[a-z]*:definitions/gi);

			if (matched !== null && matched.length > 0) {
				let xmlns = matched[0];
				xmlns = xmlns.replace('<', '').replace(':definitions', '');
				return xmlns;
			}

			return '';
		}

		const checkBPMN = function (xmlModelStr: string, namespace: string) {
			const DOMParser = require('xmldom').DOMParser;
			const xmlModel = new DOMParser().parseFromString(xmlModelStr, 'text/xml');
			const processList = xmlModel.getElementsByTagName(namespace + 'process');

			const mistakes: { [index: string]: any } = {
				tasksWithMissingInputs: { total: 0, elements: [] },
				tasksWithMissingOutputs: { total: 0, elements: [] },
				tasksWithMultipleInputs: { total: 0, elements: [] },
				tasksWithMultipleOutputs: { total: 0, elements: [] },

				startEventsWithMultipleOutputs: { total: 0, elements: [] },
				startEventsWithMissingOutputs: { total: 0, elements: [] },
				endEventsWithMultipleInputs: { total: 0, elements: [] },
				endEventsWithMissingInputs: { total: 0, elements: [] },
				intermediateEventsWithMissingInputs: { total: 0, elements: [] },
				intermediateEventsWithMissingOutputs: { total: 0, elements: [] },
				intermediateEventsWithMultipleInputs: { total: 0, elements: [] },
				intermediateEventsWithMultipleOutputs: { total: 0, elements: [] },

				gatewaysWithMissingInputs: { total: 0, elements: [] },
				gatewaysWithMissingOutputs: { total: 0, elements: [] },
				gatewaysWithOneInputAndOutput: { total: 0, elements: [] },
				gatewaysWithMultipleInputsAndOutputs: { total: 0, elements: [] }
			}

			for (let k = 0; k < processList.length; k++) {
				const process = processList[k].childNodes;

				for (let i = 0; i < process.length; i++) {
					if (process[i].nodeName.toLowerCase().includes('task'.toLowerCase()) ||
						process[i].nodeName.toLowerCase().includes('subProcess'.toLowerCase())) {

						let element = process[i].getAttribute('name');
						element = element === undefined ? process[i].getAttribute('id') : element;
						element = element.length === 0 ? process[i].getAttribute('id') : element;

						let incoming = 0;
						let outgoing = 0;

						for (let j = 0; j < process[i].childNodes.length; j++) {
							if (process[i].childNodes[j].nodeName.toLowerCase().includes('incoming'.toLowerCase())) incoming++;
							if (process[i].childNodes[j].nodeName.toLowerCase().includes('outgoing'.toLowerCase())) outgoing++;
						}

						if (incoming === 0) {
							mistakes.tasksWithMissingInputs.total++;
							mistakes.tasksWithMissingInputs.elements.push(element);
						}

						if (outgoing === 0) {
							mistakes.tasksWithMissingOutputs.total++;
							mistakes.tasksWithMissingOutputs.elements.push(element);
						}

						if (incoming > 1) {
							mistakes.tasksWithMultipleInputs.total++;
							mistakes.tasksWithMultipleInputs.elements.push(element);
						}

						if (outgoing > 1) {
							mistakes.tasksWithMultipleOutputs.total++;
							mistakes.tasksWithMultipleOutputs.elements.push(element);
						}
					}

					if (process[i].nodeName.includes('Event')) {
						let element = process[i].getAttribute('name');
						element = element === undefined ? process[i].getAttribute('id') : element;
						element = element.length === 0 ? process[i].getAttribute('id') : element;

						let incoming = 0;
						let outgoing = 0;

						for (let j = 0; j < process[i].childNodes.length; j++) {
							if (process[i].childNodes[j].nodeName.toLowerCase().includes('incoming'.toLowerCase())) incoming++;
							if (process[i].childNodes[j].nodeName.toLowerCase().includes('outgoing'.toLowerCase())) outgoing++;
						}

						if (process[i].nodeName.toLowerCase().includes('startEvent'.toLowerCase())) {
							if (outgoing === 0) {
								mistakes.startEventsWithMissingOutputs.total++;
								mistakes.startEventsWithMissingOutputs.elements.push(element);
							}

							if (outgoing > 1) {
								mistakes.startEventsWithMultipleOutputs.total++;
								mistakes.startEventsWithMultipleOutputs.elements.push(element);
							}
						} else if (process[i].nodeName.toLowerCase().includes('endEvent'.toLowerCase())) {
							if (incoming === 0) {
								mistakes.endEventsWithMissingInputs.total++;
								mistakes.endEventsWithMissingInputs.elements.push(element);
							}

							if (incoming === 0) {
								mistakes.endEventsWithMultipleInputs.total++;
								mistakes.endEventsWithMultipleInputs.elements.push(element);
							}
						} else {
							if (incoming === 0) {
								mistakes.intermediateEventsWithMissingInputs.total++;
								mistakes.intermediateEventsWithMissingInputs.elements.push(element);
							}

							if (outgoing === 0) {
								mistakes.intermediateEventsWithMissingOutputs.total++;
								mistakes.intermediateEventsWithMissingOutputs.elements.push(element);
							}

							if (incoming > 1) {
								mistakes.intermediateEventsWithMultipleInputs.total++;
								mistakes.intermediateEventsWithMultipleInputs.elements.push(element);
							}

							if (outgoing > 1) {
								mistakes.intermediateEventsWithMultipleOutputs.total++;
								mistakes.intermediateEventsWithMultipleOutputs.elements.push(element);
							}
						}
					}

					if (process[i].nodeName.toLowerCase().includes('gateway'.toLowerCase())) {
						let element = process[i].getAttribute('name');
						element = element === undefined ? process[i].getAttribute('id') : element;
						element = element.length === 0 ? process[i].getAttribute('id') : element;

						let incoming = 0;
						let outgoing = 0;

						for (let j = 0; j < process[i].childNodes.length; j++) {
							if (process[i].childNodes[j].nodeName.toLowerCase().includes('incoming'.toLowerCase())) incoming++;
							if (process[i].childNodes[j].nodeName.toLowerCase().includes('outgoing'.toLowerCase())) outgoing++;
						}

						if (incoming === 0) {
							mistakes.gatewaysWithMissingInputs.total++;
							mistakes.gatewaysWithMissingInputs.elements.push(element);
						}

						if (outgoing === 0) {
							mistakes.gatewaysWithMissingOutputs.total++;
							mistakes.gatewaysWithMissingOutputs.elements.push(element);
						}

						if (incoming === 1 && outgoing === 1) {
							mistakes.gatewaysWithOneInputAndOutput.total++;
							mistakes.gatewaysWithOneInputAndOutput.elements.push(element);
						}

						if (incoming > 1 && outgoing > 1) {
							mistakes.gatewaysWithMultipleInputsAndOutputs.total++;
							mistakes.gatewaysWithMultipleInputsAndOutputs.elements.push(element);
						}
					}
				}
			}

			return mistakes;
		}

		const parse = function (xmlModel: string) {
			let namespace = getNamespaces(xmlModel);

			if (namespace.length > 1) {
				namespace = namespace + ':';
			}

			return checkBPMN(xmlModel, namespace);
		}

		const capitalize = function (str: string) {
			return str.charAt(0).toUpperCase() + str.slice(1);
		}

		if (editor) {
			const document = editor.document;
			const bpmnDoc = document.getText();

			const mistakes = parse(bpmnDoc);

			const diagnosticsArray = vscode.languages.getDiagnostics(document.uri);
			diagnosticsArray.length = 0;

			Object.keys(mistakes).forEach(mistake => {
				if (mistakes[mistake].total > 0) {
					let warningMessage = capitalize(mistake.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase());

					diagnosticsArray.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 0),
						warningMessage + " - Total: " + mistakes[mistake].total, vscode.DiagnosticSeverity.Information));

					for (const element in mistakes[mistake].elements) {
						diagnosticsArray.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 0),
							warningMessage + ": \"" + mistakes[mistake].elements[element] + "\"",
							vscode.DiagnosticSeverity.Warning));
					}
				}
			});

			diagnosticsCollection.clear();
			diagnosticsCollection.set(document.uri, diagnosticsArray);
		}
	});

	context.subscriptions.push(disposable);
}