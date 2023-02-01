import EventEmitter from 'events';

export async function waitForEvent(emitter: EventEmitter, event: string): Promise<unknown> {
  return await new Promise((resolve) => {
    emitter.on(event, (...args) => {
      resolve(args);
    });
  });
}
