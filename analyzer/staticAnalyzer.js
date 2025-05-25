export function analyzeFunctionBody(body) {
    if (!body || !Array.isArray(body.body)) return [];

    const patterns = new Set();

    function traverseNodes(nodes) {
        for (const node of nodes) {
            switch (node.type) {
                // Iteration Patterns
                case 'ForStatement':
                case 'WhileStatement':
                case 'DoWhileStatement':
                    patterns.add('performs iteration');
                    if (node.body && node.body.body) {
                        traverseNodes(node.body.body); // Traverse loop body
                    }
                    break;

                // Conditional Logic
                case 'IfStatement':
                case 'SwitchStatement':
                    patterns.add('uses conditional logic');
                    if (node.consequent && node.consequent.body) {
                        traverseNodes(node.consequent.body); // Traverse if block
                    }
                    if (node.alternate) {
                        traverseNodes(node.alternate.body || [node.alternate]); // Handle else block or single statement
                    }
                    break;

                // Variable Declaration (Detect HTTP Requests)
                case 'VariableDeclaration':
                    for (const declaration of node.declarations) {
                        if (declaration.init) {
                            if (declaration.init.type === 'AwaitExpression' && declaration.init.argument.type === 'CallExpression') {
                                const callee = declaration.init.argument.callee;
                                if (callee.type === 'Identifier' && callee.name === 'fetch') {
                                    patterns.add('performs HTTP requests');
                                }
                            } else if (declaration.init.type === 'CallExpression') {
                                const callee = declaration.init.callee;
                                if (callee.type === 'Identifier' && callee.name === 'fetch') {
                                    patterns.add('performs HTTP requests');
                                }
                            }
                        }
                    }
                    break;

                // Return Statement
                case 'ReturnStatement':
                    if (node.argument) {

                        if (node.argument.type === 'BinaryExpression') {
                            patterns.add('performs mathematical operations');
                        } else if (node.argument.type === 'CallExpression') {
                            const callee = node.argument.callee;

                            if (callee && callee.type === 'MemberExpression') {
                                const objectName = callee.object.name; // Get the object name (e.g., 'array', 'string')
                                const methodName = callee.property.name; // Get the method name (e.g., 'map', 'split')

                                if (['map', 'filter', 'reduce'].includes(methodName)) {
                                    patterns.add('manipulates arrays');
                                } else if (['split', 'join', 'toUpperCase', 'toLowerCase'].includes(methodName)) {
                                    patterns.add('manipulates strings');
                                }
                            } else if (callee && callee.type === 'Identifier') {
                                // Handle standalone function calls like fetch()
                                if (callee.name === 'fetch') {
                                    patterns.add('performs HTTP requests');
                                }
                            }
                        }
                    }
                    break;

                // Expression Statement (Detect Logging)
                case 'ExpressionStatement':
                    if (node.expression.type === 'CallExpression') {
                        const callee = node.expression.callee;

                        if (callee && callee.type === 'MemberExpression') {
                            const objectName = callee.object.name; // Get the object name (e.g., 'console')
                            const methodName = callee.property.name; // Get the method name (e.g., 'log')

                            if (objectName === 'console' && methodName === 'log') {
                                patterns.add('logs output');
                            }
                        }
                    }
                    break;

                // Nested Blocks
                case 'BlockStatement':
                    if (Array.isArray(node.body)) {
                        traverseNodes(node.body); // Traverse nested blocks
                    }
                    break;

                default:
                    break;
            }
        }
    }

    traverseNodes(body.body);

    return Array.from(patterns); // Convert Set back to an array
}