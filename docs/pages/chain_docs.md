# Chain-specific docs

Aside from generic documentation for polkadot-api, we also provide generated documentation for well-known chains, based
on the metadata.  
With these, you can search for apis like `limited_teleport_assets`, their type parameters, and the docs that
metadata provide for them.

You can also generate the same documentation for any chain, using `papi-generate-docs` binary, provided by
`@polkadot-api/docgen` package:

```
npm install polkadot-api @polkadot-api/docgen
papi add <...>
papi-generate-docs --config <path-to-papi-config> --output <docs_directory>
```

