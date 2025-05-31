import { buildCreateApi, coreModule } from '@reduxjs/toolkit/query';
import { reactHooksModule } from '@reduxjs/toolkit/query/react';

const createApi = buildCreateApi(
  coreModule(),
  reactHooksModule({ unstable__sideEffectsInRender: false })
);

export default createApi;
