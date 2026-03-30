---
description: Write a new custom OpenFeed connector
---

# Write a New Connector

This skill helps you build a custom OpenFeed connector. Connectors implement the `BackendFeedPlugin` interface, use a `canHandle()` function to match URLs, and return structured feed items via `listItems()`. They can be kept local or published to npm with the `openfeed-connector-` prefix.

## Instructions

Read the documentation at `docs/connectors/custom.md` for full details on the connector interface, supported render types, error handling, local testing, and publishing to npm.
