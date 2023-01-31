import path from 'path';
import winston from 'winston';

const service = path.basename(process.argv[1]);

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service },
  transports: [new winston.transports.Console()]
});

// if (process.env.NODE_ENV === 'test') logger.transports[0].silent = true;
