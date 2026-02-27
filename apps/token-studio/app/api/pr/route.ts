import { NextResponse } from "next/server";
import { resolveAliases, validateTokens } from "../../../../../packages/token-schema/src/index.js";
import { loadTokenSource } from "../../../../../packages/token-source/src/index.js";

function parseValue(rawValue: string, type: string): unknown {
  if (type === "number") {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : rawValue;
  }
  if (type === "typography" || type === "shadow" || type === "cubicBezier") {
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }
  return rawValue;
}

function buildPrUrl(branch: string, tokenId: string, tokenPayload: unknown) {
  const repository = process.env.GITHUB_REPOSITORY ?? "prismforge/prismforge";
  const title = encodeURIComponent(`token: propose ${tokenId}`);
  const body = encodeURIComponent(
    `Generated from Token Studio.\n\nProposed token:\n\n\`\`\`json\n${JSON.stringify(
      tokenPayload,
      null,
      2
    )}\n\`\`\``
  );
  return `https://github.com/${repository}/compare/main...${branch}?expand=1&title=${title}&body=${body}`;
}

export async function POST(request: Request) {
  const payload = await request.json();
  const draftToken = {
    ...payload,
    $value: parseValue(payload.$value, payload.$type)
  };

  const validation = validateTokens([draftToken]);
  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        errors: validation.errors
      },
      { status: 400 }
    );
  }

  const currentSet = loadTokenSource({ brand: payload.brand, mode: payload.mode });
  const resolution = resolveAliases({
    brand: payload.brand,
    mode: payload.mode,
    tokens: [...currentSet.tokens, draftToken]
  });

  if (resolution.errors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        errors: resolution.errors
      },
      { status: 400 }
    );
  }

  const branch = `token-update-${Date.now()}`;
  const prUrl = buildPrUrl(branch, payload.id, draftToken);
  return NextResponse.json({
    ok: true,
    branch,
    prUrl
  });
}


