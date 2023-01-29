export class CLIResult {
  constructor(public message: string, public errorCode: number, public cause?: any) {}
}

export function success(message: string): CLIResult {
  return new CLIResult(message, 0);
}

export function error(message: string, errorCode: number, cause?: any): CLIResult {
  return new CLIResult(message, errorCode, cause);
}
