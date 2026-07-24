const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');

class DataProgram {
  constructor() {
    this.storageBalance = 1000.0;
  }

  execute(operationType, balance) {
    if (operationType === 'READ') {
      return this.storageBalance;
    }

    if (operationType === 'WRITE') {
      this.storageBalance = this.toMoney(balance);
      return this.storageBalance;
    }

    return this.storageBalance;
  }

  toMoney(value) {
    return Math.round(Number(value) * 100) / 100;
  }
}

class Operations {
  constructor(dataProgram, rl, io = { input, output }) {
    this.dataProgram = dataProgram;
    this.rl = rl;
    this.input = io.input;
    this.output = io.output;
    this.finalBalance = 1000.0;
  }

  async execute(passedOperation) {
    const operationType = passedOperation;

    if (operationType === 'TOTAL ') {
      this.finalBalance = this.dataProgram.execute('READ', this.finalBalance);
      this.output.write(`Current balance: ${formatBalance(this.finalBalance)}\n`);
      return;
    }

    if (operationType === 'CREDIT') {
      const amount = await this.askAmount('Enter credit amount: ');
      this.finalBalance = this.dataProgram.execute('READ', this.finalBalance);
      this.finalBalance = toMoney(this.finalBalance + amount);
      this.dataProgram.execute('WRITE', this.finalBalance);
      this.output.write(`Amount credited. New balance: ${formatBalance(this.finalBalance)}\n`);
      return;
    }

    if (operationType === 'DEBIT ') {
      const amount = await this.askAmount('Enter debit amount: ');
      this.finalBalance = this.dataProgram.execute('READ', this.finalBalance);

      if (this.finalBalance >= amount) {
        this.finalBalance = toMoney(this.finalBalance - amount);
        this.dataProgram.execute('WRITE', this.finalBalance);
        this.output.write(`Amount debited. New balance: ${formatBalance(this.finalBalance)}\n`);
      } else {
        this.output.write('Insufficient funds for this debit.\n');
      }
    }
  }

  async askAmount(promptText) {
    const raw = await safeQuestion(this.rl, promptText);
    if (raw === null || (raw.trim() === '' && !this.input.isTTY)) {
      this.output.write('No amount entered. Defaulting to 0.00\n');
      return 0;
    }

    const amount = Number(raw.trim());

    if (Number.isNaN(amount)) {
      this.output.write('Invalid amount entered. Defaulting to 0.00\n');
      return 0;
    }

    return toMoney(amount);
  }
}

function toMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function formatBalance(value) {
  const numeric = Number.isFinite(value) ? value : 0;
  const [wholePart, decimalPart] = toMoney(numeric).toFixed(2).split('.');
  const paddedWholePart = wholePart.padStart(6, '0');
  return `${paddedWholePart}.${decimalPart}`;
}

async function main(options = {}) {
  const runtimeInput = options.inputStream || input;
  const runtimeOutput = options.outputStream || output;
  const rl = options.rl || readline.createInterface({ input: runtimeInput, output: runtimeOutput });
  const dataProgram = new DataProgram();
  const operations = new Operations(dataProgram, rl, { input: runtimeInput, output: runtimeOutput });

  let continueFlag = 'YES';

  while (continueFlag !== 'NO') {
    runtimeOutput.write('--------------------------------\n');
    runtimeOutput.write('Account Management System\n');
    runtimeOutput.write('1. View Balance\n');
    runtimeOutput.write('2. Credit Account\n');
    runtimeOutput.write('3. Debit Account\n');
    runtimeOutput.write('4. Exit\n');
    runtimeOutput.write('--------------------------------\n');

    const choice = await safeQuestion(rl, 'Enter your choice (1-4): ');
    if (choice === null || (choice.trim() === '' && !runtimeInput.isTTY)) {
      continueFlag = 'NO';
      break;
    }

    const userChoice = Number.parseInt(choice.trim(), 10);

    switch (userChoice) {
      case 1:
        await operations.execute('TOTAL ');
        break;
      case 2:
        await operations.execute('CREDIT');
        break;
      case 3:
        await operations.execute('DEBIT ');
        break;
      case 4:
        continueFlag = 'NO';
        break;
      default:
        runtimeOutput.write('Invalid choice, please select 1-4.\n');
    }
  }

  runtimeOutput.write('Exiting the program. Goodbye!\n');
  rl.close();
}

async function safeQuestion(rl, promptText) {
  try {
    return await rl.question(promptText);
  } catch {
    return null;
  }
}

module.exports = {
  DataProgram,
  Operations,
  toMoney,
  formatBalance,
  safeQuestion,
  main,
};

if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error while running the accounting app:', error);
    process.exitCode = 1;
  });
}
