{
  "targets": [
    {
      "target_name": "darwin_sandbox",
      "conditions": [
        ["OS=='mac'", {
          "sources": ["darwin_sandbox.c"],
          "cflags": ["-Wall", "-Wextra"],
          "xcode_settings": {
            "OTHER_CFLAGS": ["-Wall", "-Wextra"]
          }
        }]
      ]
    },
    {
      "target_name": "linux_landlock",
      "conditions": [
        ["OS=='linux'", {
          "sources": ["linux_landlock.c"],
          "cflags": ["-Wall", "-Wextra"],
          "libraries": []
        }]
      ]
    }
  ]
}
