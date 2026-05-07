class PlugramError extends Error {
  constructor(message, line) {
    super(message);
    this.line = line;
  }
}

class Interpreter {
  constructor(ast, context) {
    this.ast = ast;
    this.context = context;
    this.variables = new Map();
    this.functions = new Map();
    this.hooks = new Map();
    this.result = null;
  }

  execute() {
    this.runNode(this.ast);
    return this.result;
  }

  runNode(node) {
    if (!node) return null;

    switch (node.type) {
      case 'Program': return this.runProgram(node);
      case 'Block': return this.runBlock(node);
      case 'Hook': return this.runHook(node);
      case 'Function': return this.runFunction(node);
      case 'Variable': return this.runVariable(node);
      case 'If': return this.runIf(node);
      case 'For': return this.runFor(node);
      case 'While': return this.runWhile(node);
      case 'Return': return this.runReturn(node);
      case 'ExpressionStatement': return this.runNode(node.expression);
      case 'BinaryOp': return this.runBinaryOp(node);
      case 'UnaryOp': return this.runUnaryOp(node);
      case 'Call': return this.runCall(node);
      case 'MemberAccess': return this.runMemberAccess(node);
      case 'IndexAccess': return this.runIndexAccess(node);
      case 'Assign': return this.runAssign(node);
      case 'Identifier': return this.variables.get(node.name) ?? null;
      case 'Number': return node.value;
      case 'String': return node.value;
      case 'Boolean': return node.value;
      case 'Null': return null;
      case 'Array': return node.elements.map(e => this.runNode(e));
      case 'Object': {
        const obj = {};
        for (const [key, val] of Object.entries(node.properties)) {
          obj[key] = this.runNode(val);
        }
        return obj;
      }
      default: return null;
    }
  }

  runProgram(node) {
    for (const stmt of node.statements) {
      const result = this.runNode(stmt);
      if (result !== undefined && result !== null && stmt.type === 'Return') return result;
    }
  }

  runBlock(node) {
    const prevVars = new Map(this.variables);
    let result;
    for (const stmt of node.statements) {
      result = this.runNode(stmt);
    }
    this.variables = prevVars;
    return result;
  }

  runHook(node) {
    this.hooks.set(node.name, { params: node.params, body: node.body });
  }

  runFunction(node) {
    this.functions.set(node.name, { params: node.params, body: node.body });
  }

  runVariable(node) {
    const value = node.init ? this.runNode(node.init) : null;
    this.variables.set(node.name, value);
    return value;
  }

  runIf(node) {
    const test = this.runNode(node.test);
    if (test) {
      return this.runNode(node.consequent);
    } else if (node.alternate) {
      return this.runNode(node.alternate);
    }
  }

  runFor(node) {
    this.runNode(node.init);
    while (this.runNode(node.test)) {
      this.runNode(node.body);
      this.runNode(node.update);
    }
  }

  runWhile(node) {
    while (this.runNode(node.test)) {
      this.runNode(node.body);
    }
  }

  runReturn(node) {
    if (node.value) {
      this.result = this.runNode(node.value);
      return this.result;
    }
    this.result = null;
    return null;
  }

  runBinaryOp(node) {
    const left = this.runNode(node.left);
    const right = this.runNode(node.right);

    switch (node.op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '==': return left == right;
      case '!=': return left != right;
      case '>': return left > right;
      case '<': return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
      case 'and': return left && right;
      case 'or': return left || right;
      default: return null;
    }
  }

  runUnaryOp(node) {
    const arg = this.runNode(node.arg);
    switch (node.op) {
      case '-': return -arg;
      case '+': return +arg;
      default: return arg;
    }
  }

  runCall(node) {
    const callee = node.callee;
    const args = node.args.map(a => this.runNode(a));

    if (callee.type === 'Identifier') {
      const name = callee.name;
      if (this.functions.has(name)) {
        const fn = this.functions.get(name);
        const prevVars = new Map(this.variables);
        fn.params.forEach((p, i) => this.variables.set(p, args[i]));
        const result = this.runNode(fn.body);
        this.variables = prevVars;
        return this.result !== null ? this.result : result;
      }
      if (this.context[name]) {
        if (typeof this.context[name] === 'function') {
          return this.context[name](...args);
        }
        return this.context[name];
      }
      throw new PlugramError(`Undefined function: ${name}`, callee.line);
    }

    if (callee.type === 'MemberAccess') {
      const obj = this.runNode(callee.object);
      if (typeof obj[callee.property] === 'function') {
        return obj[callee.property](...args);
      }
      return obj[callee.property];
    }

    return null;
  }

  runMemberAccess(node) {
    const obj = this.runNode(node.object);
    if (obj && typeof obj === 'object') {
      return obj[node.property];
    }
    return null;
  }

  runIndexAccess(node) {
    const obj = this.runNode(node.object);
    const index = this.runNode(node.index);
    if (Array.isArray(obj) || typeof obj === 'string') {
      return obj[index];
    }
    if (obj && typeof obj === 'object') {
      return obj[index];
    }
    return null;
  }

  runAssign(node) {
    const value = this.runNode(node.right);
    if (node.left.type === 'MemberAccess') {
      const obj = this.runNode(node.left.object);
      if (obj) obj[node.left.property] = value;
    } else if (node.left.type === 'Identifier') {
      this.variables.set(node.left.name, value);
    }
    return value;
  }

  getHooks() {
    return this.hooks;
  }
}

module.exports = { Interpreter, PlugramError };
