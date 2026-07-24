const {
  DataProgram,
  Operations,
  formatBalance,
  main,
} = require('./index');

function createOutputCollector() {
  let text = '';

  return {
    write: jest.fn((chunk) => {
      text += String(chunk);
      return true;
    }),
    text: () => text,
  };
}

function createMockReadline(answers, outputCollector) {
  let cursor = 0;

  return {
    question: jest.fn(async (promptText) => {
      outputCollector.write(promptText);
      if (cursor >= answers.length) {
        return '';
      }

      const value = answers[cursor];
      cursor += 1;
      outputCollector.write(`${value}\n`);
      return value;
    }),
    close: jest.fn(),
  };
}

describe('Accounting app test plan coverage', () => {
  test('TC-001: startup shows menu options and prompt', async () => {
    const output = createOutputCollector();
    const rl = createMockReadline(['4'], output);

    await main({
      rl,
      inputStream: { isTTY: true },
      outputStream: output,
    });

    expect(output.text()).toContain('Account Management System');
    expect(output.text()).toContain('1. View Balance');
    expect(output.text()).toContain('2. Credit Account');
    expect(output.text()).toContain('3. Debit Account');
    expect(output.text()).toContain('4. Exit');
    expect(output.text()).toContain('Enter your choice (1-4):');
  });

  test('TC-002: default opening balance is 1000.00', () => {
    const dataProgram = new DataProgram();

    expect(dataProgram.execute('READ', 0)).toBe(1000);
    expect(formatBalance(dataProgram.execute('READ', 0))).toBe('001000.00');
  });

  test('TC-003: balance inquiry does not change balance', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline([], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('TOTAL ');
    await operations.execute('TOTAL ');

    expect(dataProgram.execute('READ', 0)).toBe(1000);
    expect(output.text().match(/Current balance:/g).length).toBe(2);
  });

  test('TC-004: credit increases balance', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['250.50'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('CREDIT');

    expect(dataProgram.execute('READ', 0)).toBe(1250.5);
    expect(output.text()).toContain('Amount credited. New balance: 001250.50');
  });

  test('TC-005: debit decreases balance when sufficient funds', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['200.00'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('DEBIT ');

    expect(dataProgram.execute('READ', 0)).toBe(800);
    expect(output.text()).toContain('Amount debited. New balance: 000800.00');
  });

  test('TC-006: debit is blocked when funds are insufficient', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['1000.01'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('DEBIT ');

    expect(dataProgram.execute('READ', 0)).toBe(1000);
    expect(output.text()).toContain('Insufficient funds for this debit.');
  });

  test('TC-007: exact-balance debit is allowed', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['1000.00'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('DEBIT ');

    expect(dataProgram.execute('READ', 0)).toBe(0);
    expect(output.text()).toContain('Amount debited. New balance: 000000.00');
  });

  test('TC-008: invalid menu choice displays guidance and keeps loop', async () => {
    const output = createOutputCollector();
    const rl = createMockReadline(['9', '4'], output);

    await main({
      rl,
      inputStream: { isTTY: true },
      outputStream: output,
    });

    expect(output.text()).toContain('Invalid choice, please select 1-4.');
    expect(output.text()).toContain('Exiting the program. Goodbye!');
  });

  test('TC-009: exit choice terminates program', async () => {
    const output = createOutputCollector();
    const rl = createMockReadline(['4'], output);

    await main({
      rl,
      inputStream: { isTTY: true },
      outputStream: output,
    });

    expect(output.text()).toContain('Exiting the program. Goodbye!');
    expect(rl.close).toHaveBeenCalledTimes(1);
  });

  test('TC-010: balance state persists across operations in same session', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['300.00', '50.00'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('CREDIT');
    await operations.execute('DEBIT ');
    await operations.execute('TOTAL ');

    expect(dataProgram.execute('READ', 0)).toBe(1250);
    expect(output.text()).toContain('Current balance: 001250.00');
  });

  test('TC-011: restart resets in-memory storage to default', () => {
    const sessionA = new DataProgram();
    sessionA.execute('WRITE', 1500);

    const sessionB = new DataProgram();

    expect(sessionA.execute('READ', 0)).toBe(1500);
    expect(sessionB.execute('READ', 0)).toBe(1000);
  });

  test('TC-012: zero-value credit keeps balance unchanged', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['0.00'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('CREDIT');

    expect(dataProgram.execute('READ', 0)).toBe(1000);
  });

  test('TC-013: zero-value debit keeps balance unchanged', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['0.00'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('DEBIT ');

    expect(dataProgram.execute('READ', 0)).toBe(1000);
  });

  test('TC-014: negative credit amount is accepted as current behavior', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['-100.00'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('CREDIT');

    expect(dataProgram.execute('READ', 0)).toBe(900);
  });

  test('TC-015: negative debit amount increases balance as current behavior', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['-100.00'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('DEBIT ');

    expect(dataProgram.execute('READ', 0)).toBe(1100);
  });

  test('TC-016: decimal precision is preserved to two decimal places', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['10.25', '0.10'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('CREDIT');
    await operations.execute('DEBIT ');

    expect(dataProgram.execute('READ', 0)).toBe(1010.15);
    expect(formatBalance(dataProgram.execute('READ', 0))).toBe('001010.15');
  });

  test('TC-017: large values near COBOL field limit have no overflow guard in current app', async () => {
    const dataProgram = new DataProgram();
    const output = createOutputCollector();
    const rl = createMockReadline(['999999.99'], output);
    const operations = new Operations(dataProgram, rl, {
      input: { isTTY: true },
      output,
    });

    await operations.execute('CREDIT');

    expect(dataProgram.execute('READ', 0)).toBe(1000999.99);
    expect(output.text()).toContain('Amount credited. New balance: 1000999.99');
  });
});
