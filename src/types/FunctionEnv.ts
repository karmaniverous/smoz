/**
 * FunctionEnv: the type of `options.env` for one function, matching what the
 * runtime parses from `process.env` (the selected keys, each typed from the
 * global params when declared there, else from the stage params).
 *
 * @packageDocumentation
 */

/**
 * The env a function's handler receives.
 *
 * At runtime the wrapper parses the app's global `envKeys`, stage `envKeys`,
 * `functionDefaults.fnEnvKeys` and the function's own `fnEnvKeys`; a key the
 * global params declare is parsed with the global schema, otherwise with the
 * stage schema.
 *
 * @typeParam GlobalParams - the app's global params (`z.infer` of its schema)
 * @typeParam StageParams - the app's stage params (`z.infer` of its schema)
 * @typeParam Key - the union of env keys the function receives
 */
export type FunctionEnv<
  GlobalParams,
  StageParams,
  Key extends keyof GlobalParams | keyof StageParams,
> = {
  [K in Key]: K extends keyof GlobalParams
    ? GlobalParams[K]
    : K extends keyof StageParams
      ? StageParams[K]
      : never;
};
