type MaybePromise<T> = T | Promise<T>

export interface SpecConfig<Setup extends object, Result extends object> {
  given: () => MaybePromise<Setup | void>
  perform?: (input: Setup) => MaybePromise<Result | void>
  expect: (input: Setup & Result) => MaybePromise<void>
  teardown?: (input: Setup & Partial<Result>) => MaybePromise<void>
}

/**
 * Test case factory
 *
 * This util makes test cases adhere to the prepare/run/check pattern and lowers
 * the cognitive load needed when reading complex specs as dependencies between the phases
 * are explicitly listed and it promotes more systematic thinking about the test format
 * that always places assertions at the end of the test case.
 *
 * @example Simple prepare/run/check test case
 * ```typescript
 * spec({
 *   given() {
 *     return { service: new Service() }
 *   },
 *   async perform({ service }) {
 *     return { response: await service.run() }
 *   },
 *   expect({ response }) {
 *     assert.equal(response.code, 200)
 *   }
 * })
 * ```
 *
 * @example Complex prepare/run/check test case
 * ```typescript
 * spec({
 *   async given() {
 *     const port = 1234
 *     const reqResPairs = [] as Array<{ req: Request, res: Response }>
 *
 *     const server = createServer((req, res) => {
 *       reqResPairs.push({ req, res })
 *     })
 *     await server.listen(port)
 *
 *     return { server, reqResPairs }
 *   },
 *   perform({ server }) {
 *     server.request('abc')
 *   },
 *   expect({ reqResPairs }) {
 *     assert.equal(reqResPairs.length, 1)
 *     assert.equal(reqResPairs[0].req.target, 'abc')
 *   },
 *   async teardown({ server }) {
 *     await server.close()
 *   },
 * })
 * ```
 */
export async function spec<Setup extends object, Result extends object>(
  config: SpecConfig<Setup, Result>
): Promise<void> {
  const setup = (await config.given()) ?? ({} as Setup)

  let result: Result | null = null
  try {
    result = (await config.perform?.(setup)) ?? ({} as Result)
    await config.expect({ ...setup, ...result })
  } finally {
    await config.teardown?.({ ...setup, ...result })
  }
}
