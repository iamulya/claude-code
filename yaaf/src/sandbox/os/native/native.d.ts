/**
 * Type declarations for native N-API addons.
 *
 * These modules only exist after compilation via node-gyp.
 * The TypeScript compiler needs these declarations to type-check
 * the import statements in sandboxInit.ts and landlock.ts.
 */

declare module "*.node" {
  const value: Record<string, unknown>;
  export default value;
}
