export type CLIResult = {
  message: string;
  errorCode: number;
};

export function success(message: string): CLIResult {
  return { message, errorCode: 0 };
}

export function error(message: string, errorCode: number): CLIResult {
  return { message, errorCode };
}
