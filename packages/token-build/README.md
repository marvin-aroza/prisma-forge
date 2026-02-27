# Token Build

`buildArtifacts` generates deterministic outputs for:

- `css` (`tokens.css`)
- `js` (`tokens.js`)
- `android` (`tokens.xml`)
- `ios` (`Tokens.swift`)

Example:

```js
import { buildArtifacts } from "@prismforge/token-build";

const result = buildArtifacts({
  brand: "acme",
  mode: "light",
  target: "all",
  outDir: "./artifacts/acme-light"
});
```


