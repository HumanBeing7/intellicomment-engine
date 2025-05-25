export function findUnusedVariablesCFG(functionNode, cfg) {
    // 1. Collect all declared variables
    const declared = new Set();
    function collectDeclarations(node) {
        if (!node || typeof node !== 'object') return;
        if (node.type === "VariableDeclarator" && node.id && node.id.name) {
            declared.add(node.id.name);
        }
        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                const child = node[key];
                if (Array.isArray(child)) child.forEach(collectDeclarations);
                else if (typeof child === 'object' && child !== null) collectDeclarations(child);
            }
        }
    }
    collectDeclarations(functionNode.body);

    // 2. Traverse CFG for usages (reachable nodes only)
    const used = new Set();
    const edgesFrom = {};
    cfg.nodes.forEach(node => { edgesFrom[node.id] = []; });
    cfg.edges.forEach(edge => { edgesFrom[edge.from].push(edge.to); });

    // Find reachable nodes
    const entryId = cfg.nodes[0].id;
    const visited = new Set();
    const stack = [entryId];
    while (stack.length) {
        const current = stack.pop();
        if (!visited.has(current)) {
            visited.add(current);
            for (const neighbor of edgesFrom[current]) stack.push(neighbor);
        }
    }

    // For each reachable node, collect used identifiers
    function collectUsages(node, parent = null) {
        if (!node || typeof node !== 'object') return;
        if (
            node.type === "Identifier" &&
            node.name &&
            !(parent && parent.type === "VariableDeclarator" && parent.id === node)
        ) {
            used.add(node.name);
        }
        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                const child = node[key];
                if (Array.isArray(child)) child.forEach(c => collectUsages(c, node));
                else if (typeof child === 'object' && child !== null) collectUsages(child, node);
            }
        }
    }
    cfg.nodes.forEach(cfgNode => {
        if (visited.has(cfgNode.id) && cfgNode.astNode) {
            collectUsages(cfgNode.astNode, null);
        }
    });

    // 3. Unused = declared but not used
    return Array.from(declared).filter(name => !used.has(name));
}
export function detectInfiniteLoops(cfg) {
    if (!cfg.nodes.length) return false;

    // Only flag obvious infinite loops
    for (const node of cfg.nodes) {
        // while (true)
        if (node.type === "WhileStatement") {
            if (
                node.astNode &&
                node.astNode.test &&
                node.astNode.test.type === "Literal" &&
                node.astNode.test.value === true
            ) {
                return true;
            }
        }
        // for(;;)
        if (node.type === "ForStatement") {
            if (node.astNode && node.astNode.test == null) {
                return true;
            }
        }
        // do {} while (true)
        if (node.type === "DoWhileStatement") {
            if (
                node.astNode &&
                node.astNode.test &&
                node.astNode.test.type === "Literal" &&
                node.astNode.test.value === true
            ) {
                return true;
            }
        }
    }
    return false;
}
export function generateCFG(functionNode) {
    let nodes = [];
    let edges = [];
    let nodeId = 0;

    function addNode(label, type = "block", astNode = null) {
        const id = ++nodeId;
        nodes.push({ id, label, type, astNode });
        return id;
    }

    // Traverse all statements, even after return, to ensure all code is represented
    function traverseStatements(statements, prevId = null, reachable = true) {
        let lastId = prevId;
        let stillReachable = reachable;
        for (const stmt of statements) {
            let nodeLabel = stmt.type;
            if (stmt.type === "IfStatement") {
                nodeLabel = `if (${stmt.test && (stmt.test.raw || stmt.test.name) ? (stmt.test.raw || stmt.test.name) : "..."})`;
            }
            if (stmt.type === "WhileStatement") {
                nodeLabel = `while (${stmt.test ? (stmt.test.raw || stmt.test.name || "...") : "..."})`;
            }
            if (stmt.type === "ForStatement") {
                nodeLabel = "for (...)";
            }
            if (stmt.type === "DoWhileStatement") {
                nodeLabel = "do...while";
            }
            const stmtId = addNode(nodeLabel, stmt.type, stmt);

            // Only connect edge if still reachable
            if (lastId && stillReachable) {
                edges.push({ from: lastId, to: stmtId, label: "" });
            }

            // Handle loops
            if (stmt.type === "WhileStatement" || stmt.type === "ForStatement" || stmt.type === "DoWhileStatement") {
                // Traverse loop body
                if (stmt.body && stmt.body.body) {
                    traverseStatements(stmt.body.body, stmtId, stillReachable);
                }
                // Add a back edge to itself to represent the loop
                edges.push({ from: stmtId, to: stmtId, label: "loop" });
                lastId = stmtId;
            }
            // For IfStatement, handle branches
            else if (stmt.type === "IfStatement") {
                // Consequent branch
                traverseStatements(
                    stmt.consequent.type === "BlockStatement" ? stmt.consequent.body : [stmt.consequent],
                    stmtId,
                    stillReachable
                );
                // Alternate branch
                if (stmt.alternate) {
                    traverseStatements(
                        stmt.alternate.type === "BlockStatement" ? stmt.alternate.body : [stmt.alternate],
                        stmtId,
                        stillReachable
                    );
                }
                lastId = stmtId;
            } else if (stmt.type === "ReturnStatement" || stmt.type === "ThrowStatement") {
                // After return/throw, code is unreachable
                stillReachable = false;
                lastId = stmtId;
            } else {
                lastId = stmtId;
            }
        }
    }

    traverseStatements(functionNode.body.body);

    return { nodes, edges };
}

// Add this function to export DOT format
export function cfgToDot(cfg, graphName = "CFG") {
    let dot = `digraph ${graphName} {\n`;
    for (const node of cfg.nodes) {
        dot += `  ${node.id} [label="${node.label}"];\n`;
    }
    for (const edge of cfg.edges) {
        dot += `  ${edge.from} -> ${edge.to}`;
        if (edge.label) dot += ` [label="${edge.label}"]`;
        dot += ';\n';
    }
    dot += '}';
    return dot;
}

export function findUnreachableNodes(cfg) {
    if (!cfg.nodes.length) return [];

    // Build adjacency list
    const edgesFrom = {};
    cfg.nodes.forEach(node => { edgesFrom[node.id] = []; });
    cfg.edges.forEach(edge => { edgesFrom[edge.from].push(edge.to); });

    // Traverse from entry node (assume first node is entry)
    const entryId = cfg.nodes[0].id;
    const visited = new Set();
    const stack = [entryId];

    while (stack.length) {
        const current = stack.pop();
        if (!visited.has(current)) {
            visited.add(current);
            for (const neighbor of edgesFrom[current]) {
                stack.push(neighbor);
            }
        }
    }

    // Nodes not visited are unreachable
    return cfg.nodes.filter(node => !visited.has(node.id));
}