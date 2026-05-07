const { TOKEN_TYPES } = require('./lexer');

class ASTNode {
  constructor(type, ...args) {
    this.type = type;
    Object.assign(this, ...args);
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset] || { type: TOKEN_TYPES.EOF };
  }

  advance() {
    return this.tokens[this.pos++];
  }

  expect(type) {
    const token = this.advance();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} (${token.value}) at line ${token.line}`);
    }
    return token;
  }

  parse() {
    const statements = [];
    while (this.peek().type !== TOKEN_TYPES.EOF) {
      statements.push(this.parseStatement());
    }
    return new ASTNode('Program', { statements });
  }

  parseStatement() {
    const token = this.peek();

    if (token.type === 'HOOK' || (token.type === 'ON')) {
      return this.parseHook();
    }

    if (token.type === 'FUNCTION') {
      return this.parseFunction();
    }

    if (token.type === 'LET' || token.type === 'CONST') {
      return this.parseVariable();
    }

    if (token.type === 'IF') {
      return this.parseIf();
    }

    if (token.type === 'FOR' || token.type === 'WHILE') {
      return this.parseLoop();
    }

    if (token.type === 'RETURN') {
      return this.parseReturn();
    }

    if (token.type === 'LBRACE') {
      return this.parseBlock();
    }

    return this.parseExpressionStatement();
  }

  parseBlock() {
    this.expect('LBRACE');
    const statements = [];
    while (this.peek().type !== 'RBRACE' && this.peek().type !== TOKEN_TYPES.EOF) {
      statements.push(this.parseStatement());
    }
    this.expect('RBRACE');
    return new ASTNode('Block', { statements });
  }

  parseHook() {
    const line = this.peek().line;
    if (this.peek().type === 'HOOK') {
      this.advance();
    }
    const name = this.expect(TOKEN_TYPES.IDENTIFIER);
    const params = [];
    if (this.peek().type === TOKEN_TYPES.LPAREN) {
      this.advance();
      if (this.peek().type !== TOKEN_TYPES.RPAREN) {
        params.push(this.expect(TOKEN_TYPES.IDENTIFIER).value);
        while (this.peek().type === TOKEN_TYPES.COMMA) {
          this.advance();
          params.push(this.expect(TOKEN_TYPES.IDENTIFIER).value);
        }
      }
      this.expect(TOKEN_TYPES.RPAREN);
    }
    if (this.peek().type === TOKEN_TYPES.ARROW) {
      this.advance();
      const body = this.parseStatement();
      return new ASTNode('Hook', { name: name.value, params, body, line });
    }
    if (this.peek().type === TOKEN_TYPES.LBRACE) {
      const body = this.parseBlock();
      return new ASTNode('Hook', { name: name.value, params, body, line });
    }
    throw new Error(`Expected => or { after hook name at line ${line}`);
  }

  parseFunction() {
    this.expect('FUNCTION');
    const name = this.peek().type === TOKEN_TYPES.IDENTIFIER ? this.advance().value : null;
    this.expect(TOKEN_TYPES.LPAREN);
    const params = [];
    if (this.peek().type !== TOKEN_TYPES.RPAREN) {
      params.push(this.expect(TOKEN_TYPES.IDENTIFIER).value);
      while (this.peek().type === TOKEN_TYPES.COMMA) {
        this.advance();
        params.push(this.expect(TOKEN_TYPES.IDENTIFIER).value);
      }
    }
    this.expect(TOKEN_TYPES.RPAREN);
    const body = this.parseBlock();
    return new ASTNode('Function', { name, params, body });
  }

  parseVariable() {
    const kind = this.advance().value;
    const name = this.expect(TOKEN_TYPES.IDENTIFIER).value;
    let init = null;
    if (this.peek().type === TOKEN_TYPES.EQ) {
      this.advance();
      init = this.parseExpression();
    }
    return new ASTNode('Variable', { kind, name, init });
  }

  parseIf() {
    this.expect('IF');
    this.expect(TOKEN_TYPES.LPAREN);
    const test = this.parseExpression();
    this.expect(TOKEN_TYPES.RPAREN);
    const consequent = this.parseStatement();
    let alternate = null;
    if (this.peek().type === 'ELSE') {
      this.advance();
      alternate = this.parseStatement();
    }
    return new ASTNode('If', { test, consequent, alternate });
  }

  parseLoop() {
    if (this.peek().type === 'FOR') {
      this.advance();
      this.expect(TOKEN_TYPES.LPAREN);
      const init = this.parseVariable();
      const test = this.parseExpression();
      this.expect(TOKEN_TYPES.SEMICOLON);
      const update = this.parseExpression();
      this.expect(TOKEN_TYPES.RPAREN);
      const body = this.parseStatement();
      return new ASTNode('For', { init, test, update, body });
    }
    this.advance();
    this.expect(TOKEN_TYPES.LPAREN);
    const test = this.parseExpression();
    this.expect(TOKEN_TYPES.RPAREN);
    const body = this.parseStatement();
    return new ASTNode('While', { test, body });
  }

  parseReturn() {
    this.advance();
    const value = this.peek().type !== 'RBRACE' && this.peek().type !== 'SEMICOLON' ? this.parseExpression() : null;
    return new ASTNode('Return', { value });
  }

  parseExpressionStatement() {
    const expr = this.parseExpression();
    return new ASTNode('ExpressionStatement', { expression: expr });
  }

  parseExpression() {
    return this.parseAssign();
  }

  parseAssign() {
    let left = this.parseOr();
    if (this.peek().type === TOKEN_TYPES.EQ) {
      this.advance();
      const right = this.parseExpression();
      return new ASTNode('Assign', { left, right });
    }
    return left;
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.peek().type === TOKEN_TYPES.IDENTIFIER && this.peek().value === 'or') {
      this.advance();
      const right = this.parseAnd();
      left = new ASTNode('BinaryOp', { op: 'or', left, right });
    }
    return left;
  }

  parseAnd() {
    let left = this.parseCompare();
    while (this.peek().type === TOKEN_TYPES.IDENTIFIER && this.peek().value === 'and') {
      this.advance();
      const right = this.parseCompare();
      left = new ASTNode('BinaryOp', { op: 'and', left, right });
    }
    return left;
  }

  parseCompare() {
    let left = this.parseAdd();
    while (this.peek().type === TOKEN_TYPES.EQEQ || this.peek().type === TOKEN_TYPES.NEQ ||
           this.peek().type === TOKEN_TYPES.GT || this.peek().type === TOKEN_TYPES.LT ||
           this.peek().type === TOKEN_TYPES.GTE || this.peek().type === TOKEN_TYPES.LTE) {
      const op = this.advance().value;
      const right = this.parseAdd();
      left = new ASTNode('BinaryOp', { op, left, right });
    }
    return left;
  }

  parseAdd() {
    let left = this.parseMult();
    while (this.peek().type === TOKEN_TYPES.PLUS || this.peek().type === TOKEN_TYPES.MINUS) {
      const op = this.advance().value;
      const right = this.parseMult();
      left = new ASTNode('BinaryOp', { op, left, right });
    }
    return left;
  }

  parseMult() {
    let left = this.parseUnary();
    while (this.peek().type === TOKEN_TYPES.STAR || this.peek().type === TOKEN_TYPES.SLASH) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = new ASTNode('BinaryOp', { op, left, right });
    }
    return left;
  }

  parseUnary() {
    if (this.peek().type === TOKEN_TYPES.MINUS || this.peek().type === TOKEN_TYPES.PLUS) {
      const op = this.advance().value;
      const arg = this.parseUnary();
      return new ASTNode('UnaryOp', { op, arg });
    }
    return this.parseCall();
  }

  parseCall() {
    let callee = this.parsePrimary();
    while (this.peek().type === TOKEN_TYPES.LPAREN || this.peek().type === TOKEN_TYPES.DOT ||
           this.peek().type === TOKEN_TYPES.LBRACKET) {
      if (this.peek().type === TOKEN_TYPES.LPAREN) {
        this.advance();
        const args = [];
        if (this.peek().type !== TOKEN_TYPES.RPAREN) {
          args.push(this.parseExpression());
          while (this.peek().type === TOKEN_TYPES.COMMA) {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        this.expect(TOKEN_TYPES.RPAREN);
        callee = new ASTNode('Call', { callee, args });
      } else if (this.peek().type === TOKEN_TYPES.DOT) {
        this.advance();
        const prop = this.expect(TOKEN_TYPES.IDENTIFIER);
        callee = new ASTNode('MemberAccess', { object: callee, property: prop.value });
      } else {
        this.advance();
        const index = this.parseExpression();
        this.expect(TOKEN_TYPES.RBRACKET);
        callee = new ASTNode('IndexAccess', { object: callee, index });
      }
    }
    return callee;
  }

  parsePrimary() {
    const token = this.peek();

    if (token.type === TOKEN_TYPES.NUMBER) {
      this.advance();
      return new ASTNode('Number', { value: parseFloat(token.value) });
    }

    if (token.type === TOKEN_TYPES.STRING) {
      this.advance();
      return new ASTNode('String', { value: token.value });
    }

    if (token.type === TOKEN_TYPES.BOOLEAN) {
      this.advance();
      return new ASTNode('Boolean', { value: token.value === 'true' });
    }

    if (token.type === 'NULL') {
      this.advance();
      return new ASTNode('Null');
    }

    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      this.advance();
      return new ASTNode('Identifier', { name: token.value });
    }

    if (token.type === TOKEN_TYPES.LPAREN) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TOKEN_TYPES.RPAREN);
      return expr;
    }

    if (token.type === TOKEN_TYPES.LBRACKET) {
      this.advance();
      const elements = [];
      if (this.peek().type !== TOKEN_TYPES.RBRACKET) {
        elements.push(this.parseExpression());
        while (this.peek().type === TOKEN_TYPES.COMMA) {
          this.advance();
          elements.push(this.parseExpression());
        }
      }
      this.expect(TOKEN_TYPES.RBRACKET);
      return new ASTNode('Array', { elements });
    }

    if (token.type === TOKEN_TYPES.LBRACE) {
      this.advance();
      const properties = {};
      if (this.peek().type !== TOKEN_TYPES.RBRACE) {
        const key = this.expect(TOKEN_TYPES.IDENTIFIER).value;
        this.expect(TOKEN_TYPES.COLON);
        properties[key] = this.parseExpression();
        while (this.peek().type === TOKEN_TYPES.COMMA) {
          this.advance();
          const k = this.expect(TOKEN_TYPES.IDENTIFIER).value;
          this.expect(TOKEN_TYPES.COLON);
          properties[k] = this.parseExpression();
        }
      }
      this.expect(TOKEN_TYPES.RBRACE);
      return new ASTNode('Object', { properties });
    }

    throw new Error(`Unexpected token: ${token.type} (${token.value}) at line ${token.line}`);
  }
}

module.exports = { Parser, ASTNode };
