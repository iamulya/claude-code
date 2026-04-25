/**
 * linux-landlock — Linux Landlock LSM N-API native addon.
 *
 * Uses the Landlock Linux Security Module (kernel ≥5.13) to restrict
 * filesystem access for the current process without requiring root
 * or any external binaries.
 *
 * This is a higher-priority alternative to bwrap on systems where
 * Landlock is available but bwrap is not installed.
 *
 * BUILD REQUIREMENTS:
 * - Linux only (uses linux/landlock.h)
 * - Kernel ≥5.13 (for Landlock ABI v1)
 * - node-gyp: `npm install node-gyp --save-dev`
 * - Linux headers: `apt install linux-headers-$(uname -r)` or equivalent
 *
 * BUILD COMMAND:
 * ```sh
 * node-gyp rebuild --directory=src/sandbox/os/native
 * ```
 */

#include <node_api.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/prctl.h>
#include <sys/syscall.h>

/* Landlock headers — define inline if not available in system headers */
#ifndef LANDLOCK_CREATE_RULESET_VERSION
#include <linux/landlock.h>
#endif

/* Syscall wrappers (Landlock has no glibc wrappers yet) */
#ifndef SYS_landlock_create_ruleset
#define SYS_landlock_create_ruleset 444
#endif
#ifndef SYS_landlock_add_rule
#define SYS_landlock_add_rule 445
#endif
#ifndef SYS_landlock_restrict_self
#define SYS_landlock_restrict_self 446
#endif

static int landlock_create_ruleset(
    const struct landlock_ruleset_attr *attr, size_t size, uint32_t flags) {
  return (int)syscall(SYS_landlock_create_ruleset, attr, size, flags);
}

static int landlock_add_rule(
    int ruleset_fd, enum landlock_rule_type type,
    const void *attr, uint32_t flags) {
  return (int)syscall(SYS_landlock_add_rule, ruleset_fd, type, attr, flags);
}

static int landlock_restrict_self(int ruleset_fd, uint32_t flags) {
  return (int)syscall(SYS_landlock_restrict_self, ruleset_fd, flags);
}

/**
 * Check if Landlock is available on the running kernel.
 *
 * JS signature: isAvailable(): boolean
 */
static napi_value IsAvailable(napi_env env, napi_callback_info info) {
  napi_value result;
  /* Try creating a minimal ruleset — if the syscall exists, Landlock is available */
  struct landlock_ruleset_attr attr = {
    .handled_access_fs =
        LANDLOCK_ACCESS_FS_READ_FILE |
        LANDLOCK_ACCESS_FS_WRITE_FILE,
  };
  int fd = landlock_create_ruleset(&attr, sizeof(attr), 0);
  if (fd >= 0) {
    close(fd);
    napi_get_boolean(env, true, &result);
  } else {
    napi_get_boolean(env, false, &result);
  }
  return result;
}

/**
 * Apply a Landlock filesystem restriction to the current process.
 *
 * JS signature:
 * restrictFilesystem(options: {
 *   readOnlyPaths: string[],   // paths allowed for reading
 *   readWritePaths: string[],  // paths allowed for reading AND writing
 * }): void
 *
 * ⚠️ WARNING: Landlock restrictions are irreversible. Once applied,
 * they cannot be removed or relaxed for the calling process.
 * This should only be called on a child/worker process.
 */
static napi_value RestrictFilesystem(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_status status;

  status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  if (status != napi_ok || argc < 1) {
    napi_throw_error(env, NULL, "restrictFilesystem requires 1 argument: options object");
    return NULL;
  }

  napi_value options = args[0];
  napi_value read_only_paths_val, read_write_paths_val;

  /* Get readOnlyPaths array */
  status = napi_get_named_property(env, options, "readOnlyPaths", &read_only_paths_val);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "options.readOnlyPaths is required");
    return NULL;
  }

  /* Get readWritePaths array */
  status = napi_get_named_property(env, options, "readWritePaths", &read_write_paths_val);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "options.readWritePaths is required");
    return NULL;
  }

  /* Create the Landlock ruleset */
  struct landlock_ruleset_attr ruleset_attr = {
    .handled_access_fs =
        LANDLOCK_ACCESS_FS_EXECUTE |
        LANDLOCK_ACCESS_FS_WRITE_FILE |
        LANDLOCK_ACCESS_FS_READ_FILE |
        LANDLOCK_ACCESS_FS_READ_DIR |
        LANDLOCK_ACCESS_FS_REMOVE_DIR |
        LANDLOCK_ACCESS_FS_REMOVE_FILE |
        LANDLOCK_ACCESS_FS_MAKE_CHAR |
        LANDLOCK_ACCESS_FS_MAKE_DIR |
        LANDLOCK_ACCESS_FS_MAKE_REG |
        LANDLOCK_ACCESS_FS_MAKE_SOCK |
        LANDLOCK_ACCESS_FS_MAKE_FIFO |
        LANDLOCK_ACCESS_FS_MAKE_BLOCK |
        LANDLOCK_ACCESS_FS_MAKE_SYM,
  };

  int ruleset_fd = landlock_create_ruleset(&ruleset_attr, sizeof(ruleset_attr), 0);
  if (ruleset_fd < 0) {
    char msg[256];
    snprintf(msg, sizeof(msg), "landlock_create_ruleset failed: %s", strerror(errno));
    napi_throw_error(env, NULL, msg);
    return NULL;
  }

  /* Helper: add a path rule with specified access rights */
  #define ADD_PATH_RULE(fd, path_str, access_bits) do { \
    int path_fd = open(path_str, O_PATH | O_CLOEXEC); \
    if (path_fd >= 0) { \
      struct landlock_path_beneath_attr path_attr = { \
        .allowed_access = (access_bits), \
        .parent_fd = path_fd, \
      }; \
      landlock_add_rule(fd, LANDLOCK_RULE_PATH_BENEATH, &path_attr, 0); \
      close(path_fd); \
    } \
  } while (0)

  /* Read-only access bits */
  const __u64 ro_access =
      LANDLOCK_ACCESS_FS_EXECUTE |
      LANDLOCK_ACCESS_FS_READ_FILE |
      LANDLOCK_ACCESS_FS_READ_DIR;

  /* Read-write access bits */
  const __u64 rw_access =
      LANDLOCK_ACCESS_FS_EXECUTE |
      LANDLOCK_ACCESS_FS_WRITE_FILE |
      LANDLOCK_ACCESS_FS_READ_FILE |
      LANDLOCK_ACCESS_FS_READ_DIR |
      LANDLOCK_ACCESS_FS_REMOVE_DIR |
      LANDLOCK_ACCESS_FS_REMOVE_FILE |
      LANDLOCK_ACCESS_FS_MAKE_DIR |
      LANDLOCK_ACCESS_FS_MAKE_REG |
      LANDLOCK_ACCESS_FS_MAKE_SYM;

  /* Process readOnlyPaths */
  uint32_t ro_length;
  napi_get_array_length(env, read_only_paths_val, &ro_length);
  for (uint32_t i = 0; i < ro_length; i++) {
    napi_value elem;
    napi_get_element(env, read_only_paths_val, i, &elem);
    char path[4096];
    size_t path_len;
    napi_get_value_string_utf8(env, elem, path, sizeof(path), &path_len);
    ADD_PATH_RULE(ruleset_fd, path, ro_access);
  }

  /* Process readWritePaths */
  uint32_t rw_length;
  napi_get_array_length(env, read_write_paths_val, &rw_length);
  for (uint32_t i = 0; i < rw_length; i++) {
    napi_value elem;
    napi_get_element(env, read_write_paths_val, i, &elem);
    char path[4096];
    size_t path_len;
    napi_get_value_string_utf8(env, elem, path, sizeof(path), &path_len);
    ADD_PATH_RULE(ruleset_fd, path, rw_access);
  }

  #undef ADD_PATH_RULE

  /* Prevent the process from gaining new privileges (required by Landlock) */
  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)) {
    close(ruleset_fd);
    napi_throw_error(env, NULL, "prctl(PR_SET_NO_NEW_PRIVS) failed");
    return NULL;
  }

  /* Enforce the ruleset */
  if (landlock_restrict_self(ruleset_fd, 0)) {
    close(ruleset_fd);
    char msg[256];
    snprintf(msg, sizeof(msg), "landlock_restrict_self failed: %s", strerror(errno));
    napi_throw_error(env, NULL, msg);
    return NULL;
  }

  close(ruleset_fd);
  return NULL; /* void */
}

/* Module initialization */
static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn_available, fn_restrict;

  napi_create_function(env, "isAvailable", NAPI_AUTO_LENGTH,
                       IsAvailable, NULL, &fn_available);
  napi_set_named_property(env, exports, "isAvailable", fn_available);

  napi_create_function(env, "restrictFilesystem", NAPI_AUTO_LENGTH,
                       RestrictFilesystem, NULL, &fn_restrict);
  napi_set_named_property(env, exports, "restrictFilesystem", fn_restrict);

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
