# Exact text source to copy into a new project

This folder mirrors the text source needed for Zenpho. It is arranged as a project root: `copyable/frontend/src/App.tsx` goes to `your-new-project/frontend/src/App.tsx`. The [manifest](SNAPSHOT-MANIFEST.md) lists every included file and its SHA-256 checksum. The [file atlas](../file-atlas.md) explains what each file is for, and the [lessons](../README.md) explain how the code works.

Copy only the files you have reached in the lessons. Never copy this folder's own README or manifest into the application. `.env.example` is included as a template; create your own `.env.local` with your project values. Do not paste a database password or service-role key into it.

The catalog's private cases are in `judge-data/`; keep them outside `frontend/` and do not serve them from a static host. Media binaries and large public animation data are not mirrored; see [lesson 6](../06-visuals-and-assets.md) and the original asset notices.
