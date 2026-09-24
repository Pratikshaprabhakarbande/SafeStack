declare module 'unzipper' {
  export function Extract(options: { path: string }): any;
  export function Parse(): any;
  export const Open: {
    file: (path: string) => Promise<{
      files: Array<{
        path: string;
        type: string;
        buffer: () => Promise<Buffer>;
      }>;
    }>;
  };
}

declare module 'dockerode' {
  export default class Docker {
    constructor(options?: any);
    ping(): Promise<any>;
    listContainers(options?: any): Promise<any>;
    run(image: string, cmd: string[], outputStream: any, createOptions?: any, startOptions?: any): Promise<any>;
  }
}
