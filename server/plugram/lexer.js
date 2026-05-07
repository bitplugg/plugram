const TOKEN_TYPES = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  LBRACKET: 'LBRACKET',
  RBRACKET: 'RBRACKET',
  COMMA: 'COMMA',
  DOT: 'DOT',
  COLON: 'COLON',
  SEMICOLON: 'SEMICOLON',
  EQ: 'EQ',
  EQEQ: 'EQEQ',
  NEQ: 'NEQ',
  GT: 'GT',
  LT: 'LT',
  GTE: 'GTE',
  LTE: 'LTE',
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  STAR: 'STAR',
  SLASH: 'SLASH',
  ARROW: 'ARROW',
  NEWLINE: 'NEWLINE',
  EOF: 'EOF',
};

const KEYWORDS = {
  if: 'IF',
  else: 'ELSE',
  for: 'FOR',
  while: 'WHILE',
  in: 'IN',
  true: 'BOOLEAN',
  false: 'BOOLEAN',
  null: 'NULL',
  let: 'LET',
  const: 'CONST',
  return: 'RETURN',
  function: 'FUNCTION',
  async: 'ASYNC',
  await: 'AWAIT',
  hook: 'HOOK',
  on: 'ON',
};

class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }
}

class Lexer {
  constructor(code) {
    this.code = code;
    this.pos = 0;
    this.line = 1;
    this.col = 0;
    this.tokens = [];
  }

  peek(offset = 0) {
    return this.code[this.pos + offset] || '';
  }

  advance() {
    const ch = this.code[this.pos];
    this.pos++;
    this.col++;
    if (ch === '\n') { this.line++; this.col = 0; }
    return ch;
  }

  skipWhitespace() {
    while (this.pos < this.code.length && /\s/.test(this.peek()) && this.peek() !== '\n') {
      if (this.peek() === '\r') { this.advance(); continue; }
      this.advance();
    }
  }

  readString(quote) {
    let str = '';
    this.advance();
    while (this.pos < this.code.length && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        const esc = this.advance();
        const escapes = { n: '\n', t: '\t', r: '\r', '"': '"', "'": "'", '\\': '\\' };
        str += escapes[esc] || esc;
      } else {
        str += this.advance();
      }
    }
    if (this.peek() === quote) this.advance();
    return str;
  }

  readNumber() {
    let num = '';
    while (this.pos < this.code.length && /[\d.]/.test(this.peek())) {
      num += this.advance();
    }
    return num;
  }

  readIdentifier() {
    let id = '';
    while (this.pos < this.code.length && /[\w$_]/.test(this.peek())) {
      id += this.advance();
    }
    return id;
  }

  readComment() {
    while (this.pos < this.code.length && this.peek() !== '\n') {
      this.advance();
    }
  }

  tokenize() {
    while (this.pos < this.code.length) {
      const ch = this.peek();

      if (ch === '/' && this.peek(1) === '/') {
        this.readComment();
        continue;
      }

      if (ch === '\n') {
        this.advance();
        continue;
      }

      this.skipWhitespace();
      if (this.pos >= this.code.length) break;

      const ch2 = this.peek();
      const startCol = this.col;

      if (ch2 === '"' || ch2 === "'") {
        this.tokens.push(new Token(TOKEN_TYPES.STRING, this.readString(ch2), this.line, startCol));
        continue;
      }

      if (/[\d]/.test(ch2)) {
        this.tokens.push(new Token(TOKEN_TYPES.NUMBER, this.readNumber(), this.line, startCol));
        continue;
      }

      if (/[\w$_]/.test(ch2)) {
        const id = this.readIdentifier();
        const type = KEYWORDS[id] || TOKEN_TYPES.IDENTIFIER;
        this.tokens.push(new Token(type, id, this.line, startCol));
        continue;
      }

      const twoChar = ch2 + this.peek(1);
      const twoCharMap = {
        '==': TOKEN_TYPES.EQEQ,
        '!=': TOKEN_TYPES.NEQ,
        '>=': TOKEN_TYPES.GTE,
        '<=': TOKEN_TYPES.LTE,
        '=>': TOKEN_TYPES.ARROW,
      };

      if (twoCharMap[twoChar]) {
        this.tokens.push(new Token(twoCharMap[twoChar], twoChar, this.line, startCol));
        this.advance(); this.advance();
        continue;
      }

      const singleMap = {
        '(': TOKEN_TYPES.LPAREN,
        ')': TOKEN_TYPES.RPAREN,
        '{': TOKEN_TYPES.LBRACE,
        '}': TOKEN_TYPES.RBRACE,
        '[': TOKEN_TYPES.LBRACKET,
        ']': TOKEN_TYPES.RBRACKET,
        ',': TOKEN_TYPES.COMMA,
        '.': TOKEN_TYPES.DOT,
        ':': TOKEN_TYPES.COLON,
        ';': TOKEN_TYPES.SEMICOLON,
        '=': TOKEN_TYPES.EQ,
        '+': TOKEN_TYPES.PLUS,
        '-': TOKEN_TYPES.MINUS,
        '*': TOKEN_TYPES.STAR,
        '/': TOKEN_TYPES.SLASH,
        '>': TOKEN_TYPES.GT,
        '<': TOKEN_TYPES.LT,
      };

      if (singleMap[ch2]) {
        this.tokens.push(new Token(singleMap[ch2], ch2, this.line, startCol));
        this.advance();
        continue;
      }

      this.advance();
    }

    this.tokens.push(new Token(TOKEN_TYPES.EOF, null, this.line, this.col));
    return this.tokens;
  }
}

module.exports = { Lexer, TOKEN_TYPES };
