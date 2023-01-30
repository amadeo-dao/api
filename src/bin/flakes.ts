import chalk from 'chalk';
import yargs from 'yargs/yargs';
import { CLIResult, error } from '../lib/cli';
import { addVault } from './_add-vault';

const argv = yargs(process.argv.slice(2))
  .parserConfiguration({
    'parse-positional-numbers': false
  })
  .command('add-vault <address>', 'Add a new vault to scan event logs', (yargs) => {
    yargs.positional('address', {
      describe: 'EVM address of the vault',
      type: 'string'
    });
  }).argv as any;

/*  .command('scan-vault <address>', 'Scan event log of a vault and extract new data', (yargs) => {
    yargs.positional('address', {
      describe: 'EVM address of the vault',
      type: 'string'
    });
  })*/

const command = argv['_'][0];

async function main() {
  let result: CLIResult | CLIResult[];
  try {
    switch (command) {
      case 'add-vault':
        result = await addVault(argv.address);
        break;
      default:
        result = error('Unknown command: ' + command, 1);
    }
  } catch (e) {
    console.log(chalk.red('Unknown Error:\n') + e?.toString());
    process.exit(-1);
  }
  if (result instanceof CLIResult) {
    result = [result];
  }
  const exitCode = result.reduce((exitCode, r) => {
    console.log(r.errorCode ? chalk.red('ERROR: ') + r.message : chalk.green('SUCCESS: ') + r.message);
    return exitCode || r.errorCode;
  }, 0);
  process.exit(exitCode);
}

main();
