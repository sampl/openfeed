# default plugin

Fallback plugin that matches any URL not handled by the other plugins.

When a source URL is not recognised by any plugin, this plugin is used. It logs a warning to the console and returns no items. The source is recorded in the fetch run as `skipped`.

To add support for a new source type, implement a new plugin in `plugins/` and register it in `server/pluginRegistry.ts` before the default plugin.
