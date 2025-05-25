export function generateJSDoc(funcMeta) {
    const { name, params, returns, patterns, unreachableNodes, hasInfiniteLoop, unusedVariables } = funcMeta;

    const description = ` * The ${name} function${patterns && patterns.length ? ' uses ' + patterns.join(', ') : ''}.`;
    const paramTags = params.map(param =>
        ` * @param {${param.type}} ${param.name} - ${param.description || 'The value of ' + param.name + '.'}`
    );
    const returnTag = returns
        ? [` * @returns {${returns.type}} ${returns.description || 'The result of the ' + name + ' function.'}`]
        : [];

    const unreachableTag = (unreachableNodes && unreachableNodes.length)
        ? [
            ' *',
            ' * @warning Unreachable code detected:',
            ...unreachableNodes.map(node =>
                ` *   - ${node.label}${node.astNode && node.astNode.loc ? ` (line ${node.astNode.loc.start.line})` : ''}`
            )
        ]
        : [];

    const infiniteLoopTag = hasInfiniteLoop
        ? [
            ' *',
            ' * @warning Potential infinite loop detected in this function.'
        ]
        : [];

    const unusedVarTag = (unusedVariables && unusedVariables.length)
        ? [
            ' *',
            ' * @warning Unused variable(s) detected:',
            ...unusedVariables.map(varName => ` *   - ${varName}`)
        ]
        : [];

    return [
        '/**',
        description,
        ' *',
        ...paramTags,
        ...returnTag,
        ...unreachableTag,
        ...infiniteLoopTag,
        ...unusedVarTag,
        ' */'
    ].join('\n');
}