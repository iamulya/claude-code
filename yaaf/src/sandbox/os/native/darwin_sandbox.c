/**
 * darwin-sandbox — macOS sandbox_init() N-API native addon.
 *
 * Calls the macOS `sandbox_init()` C API directly, which provides the
 * same kernel mechanism as `sandbox-exec` but without invoking a
 * deprecated CLI tool.
 *
 * This is the highest-priority macOS backend when compiled and available.
 * Falls back to SandboxExecBackend or DockerBackend when not compiled.
 *
 * BUILD REQUIREMENTS:
 * - macOS only (uses sandbox.h from the macOS SDK)
 * - node-gyp: `npm install node-gyp --save-dev`
 * - Xcode Command Line Tools: `xcode-select --install`
 *
 * BUILD COMMAND:
 * ```sh
 * node-gyp rebuild --directory=src/sandbox/os/native
 * ```
 *
 * The compiled .node file will be in:
 * `src/sandbox/os/native/build/Release/darwin_sandbox.node`
 */

#include <node_api.h>
#include <sandbox.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/**
 * Apply a Seatbelt sandbox profile to the current process.
 *
 * JS signature: applySandboxProfile(profileString: string): void
 *
 * Calls sandbox_init(profile, SANDBOX_NAMED_EXTERNAL, &errorbuf).
 * Throws a Node.js Error if sandbox_init fails.
 *
 * ⚠️ WARNING: sandbox_init() is irreversible for the calling process.
 * Once applied, the profile cannot be removed or relaxed.
 * This should only be called on a child process, never the main process.
 */
static napi_value ApplySandboxProfile(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_status status;

  status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  if (status != napi_ok || argc < 1) {
    napi_throw_error(env, NULL, "applySandboxProfile requires 1 argument: profile string");
    return NULL;
  }

  /* Extract the profile string from the JS argument */
  size_t profile_len;
  status = napi_get_value_string_utf8(env, args[0], NULL, 0, &profile_len);
  if (status != napi_ok) {
    napi_throw_type_error(env, NULL, "First argument must be a string");
    return NULL;
  }

  char *profile = (char *)malloc(profile_len + 1);
  if (!profile) {
    napi_throw_error(env, NULL, "Failed to allocate memory for profile");
    return NULL;
  }

  status = napi_get_value_string_utf8(env, args[0], profile, profile_len + 1, NULL);
  if (status != napi_ok) {
    free(profile);
    napi_throw_type_error(env, NULL, "Failed to read profile string");
    return NULL;
  }

  /* Apply the sandbox profile */
  char *errorbuf = NULL;
  int rc = sandbox_init(profile, SANDBOX_NAMED_EXTERNAL, &errorbuf);
  free(profile);

  if (rc != 0) {
    char msg[512];
    snprintf(msg, sizeof(msg),
             "sandbox_init() failed: %s",
             errorbuf ? errorbuf : "unknown error");
    if (errorbuf) sandbox_free_error(errorbuf);
    napi_throw_error(env, NULL, msg);
    return NULL;
  }

  return NULL; /* void */
}

/**
 * Check if sandbox_init() is available.
 * Always returns true on macOS (it's a system API).
 *
 * JS signature: isAvailable(): boolean
 */
static napi_value IsAvailable(napi_env env, napi_callback_info info) {
  napi_value result;
  napi_get_boolean(env, true, &result);
  return result;
}

/* Module initialization */
static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn_apply, fn_available;

  napi_create_function(env, "applySandboxProfile", NAPI_AUTO_LENGTH,
                       ApplySandboxProfile, NULL, &fn_apply);
  napi_set_named_property(env, exports, "applySandboxProfile", fn_apply);

  napi_create_function(env, "isAvailable", NAPI_AUTO_LENGTH,
                       IsAvailable, NULL, &fn_available);
  napi_set_named_property(env, exports, "isAvailable", fn_available);

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
