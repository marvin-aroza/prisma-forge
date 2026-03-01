import { resolveAliases, validateTokens } from "../../../../../packages/token-schema/src/index.js";
import { validateMappings } from "../../../../../packages/token-mappings/src/index.js";
import { loadTokenSource } from "../../../../../packages/token-source/src/index.js";
import {
  findTokenFilePath,
  loadMappingsFromFile,
  parseMappingsJsonText,
  resolveCreateTargetFilePath,
  resolveMappingFilePath,
  toRepoRelativePath,
  upsertMappingsJsonText,
  upsertManyTokensJsonText
} from "./helpers.mjs";

const DEFAULT_REPOSITORY = "prismforge/prismforge";
const DEFAULT_BASE_BRANCH = "main";
const GITHUB_API_BASE = "https://api.github.com";

interface DraftPayload {
  tokens: DraftTokenPayload[];
  mappings: DraftMappingPayload[];
  brand: string;
  mode: string;
  deprecated: boolean;
  since: string;
  operation: "update" | "create";
  layer: "semantic" | "component" | "reference";
  includeMappings: boolean;
}

interface DraftTokenPayload {
  id: string;
  $type: string;
  $value: string;
  description: string;
  state: string;
  category: string;
  tags: string[];
}

interface DraftMappingPayload {
  component: string;
  variant: string;
  slot: string;
  state: string;
  platformProperty: string;
  tokenRef: string;
  fallbackRef: string;
}

interface DraftResultError {
  tokenId: string;
  code: string;
  message: string;
}

interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
  baseBranch: string;
}

interface GitHubRefResponse {
  object: {
    sha: string;
  };
}

interface GitHubContentResponse {
  content: string;
  encoding: string;
  sha?: string;
}

interface GitHubPrResponse {
  html_url: string;
}

interface MappingValidationIssue {
  code: string;
  message: string;
}

function normalizeTokenPayload(input: Record<string, unknown>): DraftTokenPayload {
  return {
    id: String(input.id ?? ""),
    $type: String(input.$type ?? ""),
    $value: String(input.$value ?? ""),
    description: String(input.description ?? ""),
    state: String(input.state ?? ""),
    category: String(input.category ?? ""),
    tags: Array.isArray(input.tags) ? input.tags.map((entry) => String(entry)) : []
  };
}

function normalizeMappingPayload(input: Record<string, unknown>): DraftMappingPayload {
  return {
    component: String(input.component ?? ""),
    variant: String(input.variant ?? ""),
    slot: String(input.slot ?? ""),
    state: String(input.state ?? ""),
    platformProperty: String(input.platformProperty ?? ""),
    tokenRef: String(input.tokenRef ?? ""),
    fallbackRef: String(input.fallbackRef ?? "")
  };
}

function normalizePayload(input: unknown): DraftPayload {
  const payload = (input ?? {}) as Record<string, unknown>;
  const operation = payload.operation === "create" ? "create" : "update";
  const layer =
    payload.layer === "component" || payload.layer === "reference" ? payload.layer : "semantic";
  const incomingTokens = Array.isArray(payload.tokens)
    ? payload.tokens.filter((entry) => Boolean(entry) && typeof entry === "object")
    : [];

  const fallbackToken = normalizeTokenPayload(payload);
  const tokens =
    incomingTokens.length > 0
      ? incomingTokens.map((entry) => normalizeTokenPayload(entry as Record<string, unknown>))
      : [fallbackToken];
  const incomingMappings = Array.isArray(payload.mappings)
    ? payload.mappings.filter((entry) => Boolean(entry) && typeof entry === "object")
    : [];

  return {
    tokens,
    mappings: incomingMappings.map((entry) => normalizeMappingPayload(entry as Record<string, unknown>)),
    brand: String(payload.brand ?? ""),
    mode: String(payload.mode ?? ""),
    deprecated: Boolean(payload.deprecated),
    since: String(payload.since ?? "0.1.0"),
    operation,
    layer,
    includeMappings: Boolean(payload.includeMappings)
  };
}

function asError(tokenId: string, code: string, message: string): DraftResultError[] {
  return [{ tokenId, code, message }];
}

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

function asMappingValidationError(tokenId: string, issue: MappingValidationIssue) {
  return asError(tokenId, "mapping_contract_invalid", `${issue.code}: ${issue.message}`);
}

function buildPrUrl(branch: string, tokenId: string, tokenPayload: unknown) {
  const repository = process.env.GITHUB_REPOSITORY ?? DEFAULT_REPOSITORY;
  const baseBranch = process.env.GITHUB_BASE_BRANCH ?? DEFAULT_BASE_BRANCH;
  const title = encodeURIComponent(`token: propose ${tokenId}`);
  const body = encodeURIComponent(
    `Generated from Token Studio.\n\nProposed token:\n\n\`\`\`json\n${JSON.stringify(
      tokenPayload,
      null,
      2
    )}\n\`\`\``
  );
  return `https://github.com/${repository}/compare/${baseBranch}...${branch}?expand=1&title=${title}&body=${body}`;
}

function parseRepository(repository: string): { owner: string; repo: string } | null {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo };
}

function getGitHubConfig(): GitHubConfig | null {
  const repository = process.env.GITHUB_REPOSITORY ?? DEFAULT_REPOSITORY;
  const parsed = parseRepository(repository);
  const token = process.env.GITHUB_TOKEN;
  if (!parsed || !token) {
    return null;
  }

  return {
    owner: parsed.owner,
    repo: parsed.repo,
    token,
    baseBranch: process.env.GITHUB_BASE_BRANCH ?? DEFAULT_BASE_BRANCH
  };
}

function encodeRepoPath(repoPath: string) {
  return repoPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toGitHubError(status: number, text: string) {
  return new Error(`GitHub API ${status}: ${text || "Request failed."}`);
}

async function githubRequest<T>(
  config: GitHubConfig,
  endpoint: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${config.token}`);
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...init,
    headers
  });
  const text = await response.text();

  if (!response.ok) {
    throw toGitHubError(response.status, text);
  }

  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

async function getBaseSha(config: GitHubConfig): Promise<string> {
  const data = await githubRequest<GitHubRefResponse>(
    config,
    `/repos/${config.owner}/${config.repo}/git/ref/heads/${encodeURIComponent(config.baseBranch)}`
  );
  return data.object.sha;
}

async function createBranch(config: GitHubConfig, branch: string, sha: string) {
  await githubRequest(
    config,
    `/repos/${config.owner}/${config.repo}/git/refs`,
    {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha
      })
    }
  );
}

async function getFileAtRef(config: GitHubConfig, repoPath: string, ref: string) {
  const encodedPath = encodeRepoPath(repoPath);
  return githubRequest<GitHubContentResponse>(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`
  );
}

async function getOptionalFileAtRef(config: GitHubConfig, repoPath: string, ref: string) {
  const encodedPath = encodeRepoPath(repoPath);
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    }
  );

  if (response.status === 404) {
    return null;
  }

  const text = await response.text();
  if (!response.ok) {
    throw toGitHubError(response.status, text);
  }

  return JSON.parse(text) as GitHubContentResponse;
}

function decodeGitHubContent(remoteFile: GitHubContentResponse) {
  return Buffer.from(remoteFile.content.replace(/\n/gu, ""), remoteFile.encoding as BufferEncoding).toString("utf8");
}

async function commitFileUpdate(
  config: GitHubConfig,
  params: { repoPath: string; branch: string; message: string; content: string; sha?: string }
) {
  const encodedPath = encodeRepoPath(params.repoPath);
  const payload: Record<string, string> = {
    message: params.message,
    content: Buffer.from(params.content, "utf8").toString("base64"),
    branch: params.branch
  };

  if (params.sha) {
    payload.sha = params.sha;
  }

  await githubRequest(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodedPath}`,
    {
      method: "PUT",
      body: JSON.stringify(payload)
    }
  );
}

async function createPullRequest(
  config: GitHubConfig,
  params: { branch: string; title: string; body: string }
): Promise<GitHubPrResponse> {
  return githubRequest<GitHubPrResponse>(
    config,
    `/repos/${config.owner}/${config.repo}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title: params.title,
        head: params.branch,
        base: config.baseBranch,
        body: params.body,
        draft: true
      })
    }
  );
}

export async function POST(request: Request) {
  const payload = normalizePayload(await request.json());
  const draftTokens = payload.tokens.map((token) => ({
    ...token,
    brand: payload.brand,
    mode: payload.mode,
    deprecated: payload.deprecated,
    since: payload.since,
    tags: token.tags.length > 0 ? token.tags : ["draft", "studio"],
    $value: parseValue(token.$value, token.$type)
  }));
  const draftMappings = payload.includeMappings
    ? payload.mappings.map((mapping) => ({
        component: mapping.component.trim(),
        variant: mapping.variant.trim(),
        slot: mapping.slot.trim(),
        state: mapping.state.trim(),
        platformProperty: mapping.platformProperty.trim(),
        tokenRef: mapping.tokenRef.trim(),
        fallbackRef: mapping.fallbackRef.trim()
      }))
    : [];

  if (draftTokens.length === 0) {
    return Response.json(
      {
        ok: false,
        errors: asError("(empty)", "empty_payload", "At least one token is required.")
      },
      { status: 400 }
    );
  }

  if (payload.includeMappings && draftMappings.length === 0) {
    return Response.json(
      {
        ok: false,
        errors: asError(
          draftTokens[0]?.id ?? "(missing-id)",
          "mapping_payload_empty",
          "includeMappings is enabled but no mapping entries were provided."
        )
      },
      { status: 400 }
    );
  }

  if (draftMappings.length > 0) {
    const invalidMapping = draftMappings.find(
      (mapping) =>
        !mapping.component ||
        !mapping.variant ||
        !mapping.slot ||
        !mapping.state ||
        !mapping.platformProperty ||
        !mapping.tokenRef ||
        !mapping.fallbackRef
    );

    if (invalidMapping) {
      return Response.json(
        {
          ok: false,
          errors: asError(
            invalidMapping.tokenRef || draftTokens[0]?.id || "(missing-id)",
            "mapping_invalid",
            "Mapping payload is missing required fields."
          )
        },
        { status: 400 }
      );
    }

    const groups = new Set(draftMappings.map((mapping) => `${mapping.component}::${mapping.variant}`));
    if (groups.size !== 1) {
      return Response.json(
        {
          ok: false,
          errors: asError(
            draftMappings[0]?.tokenRef ?? draftTokens[0]?.id ?? "(missing-id)",
            "mapping_multiple_groups",
            "Batch mapping update can only target one component+variant group at a time."
          )
        },
        { status: 400 }
      );
    }
  }

  const duplicateIds = [...new Set(draftTokens.map((token) => token.id))].filter(
    (id) => draftTokens.filter((token) => token.id === id).length > 1
  );

  if (duplicateIds.length > 0) {
    return Response.json(
      {
        ok: false,
        errors: duplicateIds.map((tokenId) => ({
          tokenId,
          code: "duplicate_payload_id",
          message: `Duplicate token id "${tokenId}" was found in the submitted payload.`
        }))
      },
      { status: 400 }
    );
  }

  const validation = validateTokens(draftTokens);
  if (!validation.valid) {
    return Response.json(
      {
        ok: false,
        errors: validation.errors
      },
      { status: 400 }
    );
  }

  let currentSet: { tokens: Array<{ id: string }> };
  try {
    currentSet = loadTokenSource({ brand: payload.brand, mode: payload.mode });
  } catch (error) {
    const tokenId = draftTokens[0]?.id ?? "(missing-id)";
    const message = error instanceof Error ? error.message : "Unable to load token set.";
    return Response.json(
      {
        ok: false,
        errors: asError(tokenId, "token_source_error", message)
      },
      { status: 400 }
    );
  }

  const incomingIds = new Set(draftTokens.map((token) => token.id));
  const candidateTokens = [
    ...currentSet.tokens.filter((token) => !incomingIds.has(token.id)),
    ...draftTokens
  ];
  const candidateTokenIds = new Set(candidateTokens.map((token) => token.id));

  if (draftMappings.length > 0) {
    const missingTokenRef = draftMappings.find((mapping) => !candidateTokenIds.has(mapping.tokenRef));
    if (missingTokenRef) {
      return Response.json(
        {
          ok: false,
          errors: asError(
            missingTokenRef.tokenRef,
            "mapping_token_ref_missing",
            `Mapping tokenRef "${missingTokenRef.tokenRef}" does not resolve in the candidate token set.`
          )
        },
        { status: 400 }
      );
    }
  }

  const resolution = resolveAliases({
    brand: payload.brand,
    mode: payload.mode,
    tokens: candidateTokens
  });

  if (resolution.errors.length > 0) {
    return Response.json(
      {
        ok: false,
        errors: resolution.errors
      },
      { status: 400 }
    );
  }

  const branch = `token-update-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const github = getGitHubConfig();
  const primaryTokenId = draftTokens[0].id;
  const summaryPayload =
    draftTokens.length === 1 && draftMappings.length === 0
      ? draftTokens[0]
      : {
          tokens: draftTokens,
          mappings: draftMappings.length > 0 ? draftMappings : undefined
        };
  const prUrl = buildPrUrl(branch, primaryTokenId, summaryPayload);

  const tokenFilePaths = draftTokens.map((token) =>
    findTokenFilePath({
      tokenId: token.id,
      brand: payload.brand,
      mode: payload.mode
    })
  );
  const createTargetPath = resolveCreateTargetFilePath({
    layer: payload.layer,
    brand: payload.brand,
    mode: payload.mode
  });
  const isCreateRequest = payload.operation === "create";

  if (!isCreateRequest) {
    const missing = draftTokens.filter((_, index) => !tokenFilePaths[index]);
    if (missing.length > 0) {
      return Response.json(
        {
          ok: false,
          errors: missing.map((token) => ({
            tokenId: token.id,
            code: "token_not_found",
            message: "Token id was not found in local source files. Switch to create mode if this is a new token."
          }))
        },
        { status: 400 }
      );
    }
  }

  if (isCreateRequest && tokenFilePaths.some((entry) => Boolean(entry))) {
    const existing = draftTokens.filter((_, index) => Boolean(tokenFilePaths[index]));
    return Response.json(
      {
        ok: false,
        errors: existing.map((token) => ({
          tokenId: token.id,
          code: "token_exists",
          message: "Token id already exists. Use update mode to modify an existing token."
        }))
      },
      { status: 400 }
    );
  }

  let targetFilePath: string | null = null;
  if (isCreateRequest) {
    targetFilePath = createTargetPath;
  } else {
    const uniqueFilePaths = [...new Set(tokenFilePaths.filter((entry): entry is string => Boolean(entry)))];
    if (uniqueFilePaths.length !== 1) {
      return Response.json(
        {
          ok: false,
          errors: asError(
            primaryTokenId,
            "mixed_target_files",
            "Batch update can only target one source file at a time. Group tokens by layer and brand/mode."
          )
        },
        { status: 400 }
      );
    }
    targetFilePath = uniqueFilePaths[0];
  }

  if (!targetFilePath) {
    return Response.json(
      {
        ok: false,
        errors: asError(
          primaryTokenId,
          "target_file_not_found",
          `No valid source file found for layer "${payload.layer}" and theme "${payload.brand}/${payload.mode}".`
        )
      },
      { status: 400 }
    );
  }

  const mappingFilePath =
    draftMappings.length > 0
      ? resolveMappingFilePath({
          component: draftMappings[0].component,
          variant: draftMappings[0].variant
        })
      : null;

  if (draftMappings.length > 0 && !mappingFilePath) {
    return Response.json(
      {
        ok: false,
        errors: asError(
          primaryTokenId,
          "mapping_target_invalid",
          "Could not resolve a mapping target file from the submitted component and variant."
        )
      },
      { status: 400 }
    );
  }

  if (draftMappings.length > 0 && mappingFilePath) {
    try {
      const localMappings = loadMappingsFromFile(mappingFilePath);
      const localMerged = parseMappingsJsonText(upsertMappingsJsonText(JSON.stringify(localMappings), draftMappings).nextText);
      const localValidation = validateMappings(localMerged, candidateTokens);

      if (!localValidation.valid) {
        const issue = localValidation.errors[0] as MappingValidationIssue | undefined;
        return Response.json(
          {
            ok: false,
            errors: asMappingValidationError(
              primaryTokenId,
              issue ?? { code: "unknown_mapping_error", message: "Mapping validation failed." }
            )
          },
          { status: 400 }
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to validate mapping payload.";
      return Response.json(
        {
          ok: false,
          errors: asError(primaryTokenId, "mapping_validation_error", message)
        },
        { status: 400 }
      );
    }
  }

  if (!github) {
    return Response.json({
      ok: true,
      mode: "compare-url",
      operation: payload.operation,
      tokenCount: draftTokens.length,
      mappingCount: draftMappings.length,
      branch,
      prUrl,
      message: "GitHub autopilot is not configured. Set GITHUB_TOKEN to enable automatic branch and PR creation."
    });
  }

  const repoPath = toRepoRelativePath(targetFilePath);
  const actionLabel = isCreateRequest ? "create" : "update";
  const prTitle =
    draftTokens.length === 1
      ? `token: ${actionLabel} ${primaryTokenId}`
      : `token: ${actionLabel} ${draftTokens.length} tokens (${payload.layer})`;
  const prBody = [
    "Generated from PrismForge Token Studio.",
    "",
    `Operation: \`${payload.operation}\``,
    `Layer: \`${payload.layer}\``,
    `Token count: \`${draftTokens.length}\``,
    `Mapping count: \`${draftMappings.length}\``,
    `Primary token: \`${primaryTokenId}\``,
    `Brand/Mode: \`${payload.brand}/${payload.mode}\``,
    ...(mappingFilePath ? [`Mapping file: \`${toRepoRelativePath(mappingFilePath)}\``] : []),
    "",
    "```json",
    JSON.stringify(summaryPayload, null, 2),
    "```"
  ].join("\n");

  try {
    const baseSha = await getBaseSha(github);
    await createBranch(github, branch, baseSha);

    const remoteFile = await getFileAtRef(github, repoPath, github.baseBranch);
    const remoteText = decodeGitHubContent(remoteFile);
    const remoteUpdate = upsertManyTokensJsonText(remoteText, draftTokens, { createIfMissing: isCreateRequest });

    if (isCreateRequest && remoteUpdate.createdIds.length !== draftTokens.length) {
      const tokenId = remoteUpdate.existingIds[0] ?? primaryTokenId;
      return Response.json(
        {
          ok: false,
          errors: asError(
            tokenId,
            "remote_token_exists",
            `One or more tokens already exist in ${repoPath} at ${github.baseBranch}.`
          )
        },
        { status: 400 }
      );
    }

    if (!isCreateRequest && remoteUpdate.missingIds.length > 0) {
      const tokenId = remoteUpdate.missingIds[0] ?? primaryTokenId;
      return Response.json(
        {
          ok: false,
          errors: asError(
            tokenId,
            "remote_token_not_found",
            `One or more tokens were not found in ${repoPath} at ${github.baseBranch}.`
          )
        },
        { status: 400 }
      );
    }

    await commitFileUpdate(github, {
      repoPath,
      branch,
      message:
        draftTokens.length === 1
          ? `token: ${actionLabel} ${primaryTokenId}`
          : `token: ${actionLabel} ${draftTokens.length} tokens`,
      content: remoteUpdate.nextText,
      sha: remoteFile.sha
    });

    if (draftMappings.length > 0 && mappingFilePath) {
      const mappingRepoPath = toRepoRelativePath(mappingFilePath);
      const remoteMappingFile = await getOptionalFileAtRef(github, mappingRepoPath, github.baseBranch);
      const remoteMappingText = remoteMappingFile ? decodeGitHubContent(remoteMappingFile) : "[]\n";
      const mappingUpdate = upsertMappingsJsonText(remoteMappingText, draftMappings);
      const mergedMappings = parseMappingsJsonText(mappingUpdate.nextText);
      const mappingValidation = validateMappings(mergedMappings, candidateTokens);

      if (!mappingValidation.valid) {
        const issue = mappingValidation.errors[0] as MappingValidationIssue | undefined;
        return Response.json(
          {
            ok: false,
            errors: asMappingValidationError(
              primaryTokenId,
              issue ?? { code: "unknown_mapping_error", message: "Mapping validation failed." }
            )
          },
          { status: 400 }
        );
      }

      await commitFileUpdate(github, {
        repoPath: mappingRepoPath,
        branch,
        message: `mapping: upsert ${draftMappings[0].component}/${draftMappings[0].variant} (${draftMappings.length})`,
        content: mappingUpdate.nextText,
        sha: remoteMappingFile?.sha
      });
    }

    const pr = await createPullRequest(github, {
      branch,
      title: prTitle,
      body: prBody
    });

    return Response.json({
      ok: true,
      mode: "auto-pr",
      operation: payload.operation,
      tokenCount: draftTokens.length,
      mappingCount: draftMappings.length,
      branch,
      prUrl: pr.html_url,
      message: "Draft pull request created successfully."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create pull request.";
    return Response.json(
      {
        ok: false,
        errors: asError(primaryTokenId, "github_error", message),
        operation: payload.operation,
        tokenCount: draftTokens.length,
        mappingCount: draftMappings.length,
        branch,
        prUrl
      },
      { status: 502 }
    );
  }
}


