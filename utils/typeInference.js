export function inferParamType(paramName, body) {
    if (!body || !body.body) return 'any';
    let type = 'any';

    function traverse(nodes) {
        for (const node of nodes) {
            // Array methods or .length
            if (
                (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' &&
                    node.expression.callee.type === 'MemberExpression' &&
                    node.expression.callee.object.name === paramName &&
                    ['map', 'filter', 'reduce', 'forEach', 'push', 'pop'].includes(node.expression.callee.property.name)
                ) ||
                (node.type === 'ExpressionStatement' && node.expression.type === 'MemberExpression' &&
                    node.expression.object.name === paramName && node.expression.property.name === 'length')
            ) {
                return 'array';
            }
            // String methods
            if (
                node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' &&
                node.expression.callee.type === 'MemberExpression' &&
                node.expression.callee.object.name === paramName &&
                ['toUpperCase', 'toLowerCase', 'split', 'substring', 'substr', 'trim'].includes(node.expression.callee.property.name)
            ) {
                return 'string';
            }
            // Used as fetch argument
            if (
                node.type === 'VariableDeclaration'
                && node.declarations.some(decl =>
                    decl.init && decl.init.type === 'AwaitExpression'
                    && decl.init.argument.type === 'CallExpression'
                    && decl.init.argument.arguments.length > 0
                    && decl.init.argument.arguments[0].name === paramName
                )
            ) {
                return 'string';
            }
            // Used in math
            if (
                (node.type === 'ReturnStatement' && node.argument && node.argument.type === 'BinaryExpression' &&
                    ((node.argument.left.type === 'Identifier' && node.argument.left.name === paramName) ||
                        (node.argument.right.type === 'Identifier' && node.argument.right.name === paramName)))
            ) {
                type = 'number';
            }
            // Used in condition
            if (
                (node.type === 'IfStatement' && node.test.type === 'Identifier' && node.test.name === paramName)
            ) {
                type = 'boolean';
            }
            // Used as object (property access)
            if (
                node.type === 'ExpressionStatement' && node.expression.type === 'MemberExpression' &&
                node.expression.object.name === paramName
            ) {
                type = 'object';
            }
            // Recursively check nested blocks
            if (node.body && Array.isArray(node.body)) {
                const nested = traverse(node.body);
                if (nested && nested !== 'any') return nested;
            }
        }
        return type;
    }

    return traverse(body.body) || 'any';
}

export function inferReturnType(body) {
    if (!body || !body.body) return 'void';

    for (const node of body.body) {
        if (node.type === 'ReturnStatement' && node.argument) {
            const returnExpr = node.argument;

            if (returnExpr.type === 'BinaryExpression') {
                return 'number';
            }
            if (returnExpr.type === 'Literal') {
                return typeof returnExpr.value;
            }
            if (returnExpr.type === 'CallExpression' && returnExpr.callee.type === 'MemberExpression') {
                const method = returnExpr.callee.property.name;
                if (['map', 'filter', 'reduce'].includes(method)) return 'array';
                if (['toUpperCase', 'toLowerCase', 'split', 'substring', 'substr', 'trim'].includes(method)) return 'string';
            }
            if (returnExpr.type === 'ObjectExpression') {
                return 'object';
            }
            if (returnExpr.type === 'ArrayExpression') {
                return 'array';
            }
            if (returnExpr.type === 'Identifier' && (returnExpr.name === 'true' || returnExpr.name === 'false')) {
                return 'boolean';
            }
        }
    }

    return 'void';
}