import { net, protocol } from 'electron';
import { normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const scheme = 'carlo-file';

export function registerLocalResourceScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

export function registerLocalResourceProtocol(): void {
  protocol.handle(scheme, (request) => {
    const url = new URL(request.url);
    const path = normalize(decodeURIComponent(url.pathname));
    return net.fetch(pathToFileURL(path).toString());
  });
}
