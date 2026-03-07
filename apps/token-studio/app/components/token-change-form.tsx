"use client";

import { FormEvent, useMemo, useState } from "react";

type TokenOperation = "update" | "create";
type TokenLayer = "semantic" | "component" | "reference";
type ComponentTemplateFamily = "form-control" | "overlay" | "navigation" | "feedback";

interface DraftResult {
  ok: boolean;
  prUrl?: string;
  branch?: string;
  mode?: "auto-pr" | "compare-url";
  operation?: TokenOperation;
  tokenCount?: number;
  mappingCount?: number;
  message?: string;
  errors?: Array<{ tokenId: string; code: string; message: string }>;
}

interface TokenBuilderState {
  layer: TokenLayer;
  category: string;
  intent: string;
  variant: string;
  state: string;
  component: string;
  slot: string;
}

interface DraftTokenInput {
  id: string;
  $type: string;
  $value: string;
  description: string;
  state: string;
  category: string;
  tags: string[];
}

interface DraftMappingInput {
  component: string;
  variant: string;
  slot: string;
  state: string;
  platformProperty: string;
  tokenRef: string;
  fallbackRef: string;
}

interface TemplateMappingDiffItem {
  key: string;
  next: DraftMappingInput;
  previous: DraftMappingInput | null;
  status: "create" | "update" | "unchanged";
}

interface MappingPrecheckResult {
  errors: string[];
  warnings: string[];
}

interface ComponentTemplateFamilyOption {
  id: ComponentTemplateFamily;
  label: string;
  description: string;
}

const TOKEN_TYPES = ["color", "dimension", "number", "duration", "typography", "shadow", "cubicBezier", "strokeStyle"];
const STATE_OPTIONS = ["base", "default", "hover", "active", "disabled", "focus"];
const LAYER_OPTIONS: TokenLayer[] = ["semantic", "component", "reference"];
const COMPONENT_TEMPLATE_STATES = ["default", "hover", "active", "disabled", "focus"] as const;
const REQUIRED_MAPPING_STATES = ["default", "hover", "active", "disabled", "focus"] as const;

type ComponentTemplateState = (typeof COMPONENT_TEMPLATE_STATES)[number];
type TokenType = (typeof TOKEN_TYPES)[number];

interface ComponentTemplateSlotBlueprint {
  slot: string;
  type: TokenType;
  description: string;
  values: Partial<Record<ComponentTemplateState, string>>;
}

const COMPONENT_TEMPLATE_FAMILY_OPTIONS: ComponentTemplateFamilyOption[] = [
  {
    id: "form-control",
    label: "Form Control",
    description: "Input-like components with focus treatment and muted disabled states."
  },
  {
    id: "overlay",
    label: "Overlay",
    description: "Popover, modal, tray, and floating surfaces with stronger panel treatment."
  },
  {
    id: "navigation",
    label: "Navigation",
    description: "Menu, tabs, side-nav style items with active indicator emphasis."
  },
  {
    id: "feedback",
    label: "Feedback",
    description: "Alert, toast, badge style blocks with accent foreground support."
  }
];

const COMPONENT_TEMPLATE_FAMILY_LABEL = Object.fromEntries(
  COMPONENT_TEMPLATE_FAMILY_OPTIONS.map((entry) => [entry.id, entry.label])
) as Record<ComponentTemplateFamily, string>;

const COMPONENT_TEMPLATE_BLUEPRINTS: Record<ComponentTemplateFamily, ComponentTemplateSlotBlueprint[]> = {
  "form-control": [
    {
      slot: "bg",
      type: "color",
      description: "Background",
      values: {
        default: "{dk.color.surface.default.base}",
        hover: "{dk.color.surface.raised.base}",
        active: "{dk.color.surface.raised.base}",
        disabled: "{dk.color.surface.default.base}"
      }
    },
    {
      slot: "border",
      type: "color",
      description: "Border",
      values: {
        default: "{dk.color.border.subtle.base}",
        hover: "{dk.color.accent.primary.base}",
        active: "{dk.color.accent.primary.hover}",
        disabled: "{dk.color.border.subtle.base}",
        focus: "{dk.color.border.focus.focus}"
      }
    },
    {
      slot: "label",
      type: "color",
      description: "Label",
      values: {
        default: "{dk.color.text.default.base}",
        disabled: "{dk.color.text.muted.base}"
      }
    },
    {
      slot: "icon",
      type: "color",
      description: "Icon",
      values: {
        default: "{dk.color.text.default.base}",
        disabled: "{dk.color.text.muted.base}"
      }
    },
    {
      slot: "shadow",
      type: "shadow",
      description: "Focus shadow",
      values: {
        focus: "{dk.shadow.control.default.base}"
      }
    },
    {
      slot: "opacity",
      type: "number",
      description: "Disabled opacity",
      values: {
        disabled: "{dk.opacity.disabled.default.base}"
      }
    },
    {
      slot: "motion",
      type: "duration",
      description: "Motion duration",
      values: {
        default: "{dk.motion.duration.control.base}"
      }
    }
  ],
  overlay: [
    {
      slot: "panel",
      type: "color",
      description: "Panel background",
      values: {
        default: "{dk.color.surface.raised.base}",
        hover: "{dk.color.surface.default.base}",
        active: "{dk.color.surface.default.base}",
        disabled: "{dk.color.surface.raised.base}"
      }
    },
    {
      slot: "header",
      type: "color",
      description: "Header background",
      values: {
        default: "{dk.color.surface.default.base}",
        hover: "{dk.color.surface.raised.base}",
        active: "{dk.color.surface.default.base}",
        disabled: "{dk.color.surface.default.base}"
      }
    },
    {
      slot: "border",
      type: "color",
      description: "Container border",
      values: {
        default: "{dk.color.border.subtle.base}",
        hover: "{dk.color.accent.primary.base}",
        active: "{dk.color.accent.primary.hover}",
        disabled: "{dk.color.border.subtle.base}",
        focus: "{dk.color.border.focus.focus}"
      }
    },
    {
      slot: "label",
      type: "color",
      description: "Text",
      values: {
        default: "{dk.color.text.default.base}",
        disabled: "{dk.color.text.muted.base}"
      }
    },
    {
      slot: "icon",
      type: "color",
      description: "Action icon",
      values: {
        default: "{dk.color.text.default.base}",
        disabled: "{dk.color.text.muted.base}"
      }
    },
    {
      slot: "shadow",
      type: "shadow",
      description: "Panel shadow",
      values: {
        default: "{dk.shadow.control.default.base}",
        focus: "{dk.shadow.control.default.base}"
      }
    },
    {
      slot: "motion",
      type: "duration",
      description: "Enter/exit duration",
      values: {
        default: "{dk.motion.duration.control.base}"
      }
    }
  ],
  navigation: [
    {
      slot: "item",
      type: "color",
      description: "Item background",
      values: {
        default: "{dk.color.surface.default.base}",
        hover: "{dk.color.surface.raised.base}",
        active: "{dk.color.accent.primary.base}",
        disabled: "{dk.color.surface.default.base}"
      }
    },
    {
      slot: "border",
      type: "color",
      description: "Item border",
      values: {
        default: "{dk.color.border.subtle.base}",
        hover: "{dk.color.accent.primary.base}",
        active: "{dk.color.accent.primary.hover}",
        disabled: "{dk.color.border.subtle.base}",
        focus: "{dk.color.border.focus.focus}"
      }
    },
    {
      slot: "label",
      type: "color",
      description: "Item label",
      values: {
        default: "{dk.color.text.muted.base}",
        hover: "{dk.color.text.default.base}",
        active: "{dk.color.gray.0.base}",
        disabled: "{dk.color.text.muted.base}"
      }
    },
    {
      slot: "icon",
      type: "color",
      description: "Item icon",
      values: {
        default: "{dk.color.text.muted.base}",
        hover: "{dk.color.text.default.base}",
        active: "{dk.color.gray.0.base}",
        disabled: "{dk.color.text.muted.base}"
      }
    },
    {
      slot: "indicator",
      type: "color",
      description: "Active indicator",
      values: {
        default: "{dk.color.border.subtle.base}",
        active: "{dk.color.accent.primary.base}",
        focus: "{dk.color.border.focus.focus}"
      }
    },
    {
      slot: "opacity",
      type: "number",
      description: "Disabled opacity",
      values: {
        disabled: "{dk.opacity.disabled.default.base}"
      }
    },
    {
      slot: "motion",
      type: "duration",
      description: "Transition duration",
      values: {
        default: "{dk.motion.duration.control.base}"
      }
    }
  ],
  feedback: [
    {
      slot: "container",
      type: "color",
      description: "Container background",
      values: {
        default: "{dk.color.surface.raised.base}",
        hover: "{dk.color.surface.default.base}",
        active: "{dk.color.surface.default.base}",
        disabled: "{dk.color.surface.raised.base}"
      }
    },
    {
      slot: "border",
      type: "color",
      description: "Container border",
      values: {
        default: "{dk.color.border.subtle.base}",
        hover: "{dk.color.accent.primary.base}",
        active: "{dk.color.accent.primary.hover}",
        disabled: "{dk.color.border.subtle.base}",
        focus: "{dk.color.border.focus.focus}"
      }
    },
    {
      slot: "label",
      type: "color",
      description: "Text label",
      values: {
        default: "{dk.color.text.default.base}",
        disabled: "{dk.color.text.muted.base}"
      }
    },
    {
      slot: "icon",
      type: "color",
      description: "Status icon",
      values: {
        default: "{dk.color.text.default.base}",
        disabled: "{dk.color.text.muted.base}"
      }
    },
    {
      slot: "accent",
      type: "color",
      description: "Emphasis accent",
      values: {
        default: "{dk.color.accent.primary.base}",
        hover: "{dk.color.accent.primary.hover}",
        active: "{dk.color.accent.primary.hover}"
      }
    },
    {
      slot: "opacity",
      type: "number",
      description: "Disabled opacity",
      values: {
        disabled: "{dk.opacity.disabled.default.base}"
      }
    },
    {
      slot: "motion",
      type: "duration",
      description: "Transition duration",
      values: {
        default: "{dk.motion.duration.control.base}"
      }
    }
  ]
};

const DEFAULT_FORM = {
  id: "dk.color.surface.panel.default",
  type: "color",
  value: "#E2E8F0",
  description: "Panel surface color token.",
  state: "base",
  category: "color",
  tags: "draft,studio"
};

const DEFAULT_BUILDER: TokenBuilderState = {
  layer: "semantic",
  category: "color",
  intent: "surface-panel",
  variant: "default",
  state: "base",
  component: "button",
  slot: "bg"
};

function sanitizeSegment(value: string, { allowDot = false }: { allowDot?: boolean } = {}) {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/gu, "-")
    .replace(allowDot ? /[^a-z0-9.-]+/gu : /[^a-z0-9-]+/gu, "")
    .replace(/-{2,}/gu, "-")
    .replace(/\.{2,}/gu, ".")
    .replace(/(^[.-]+)|([.-]+$)/gu, "");

  return sanitized || "default";
}

function buildSuggestedTokenId(builder: TokenBuilderState) {
  const variant = sanitizeSegment(builder.variant);
  const state = sanitizeSegment(builder.state);

  if (builder.layer === "component") {
    const component = sanitizeSegment(builder.component);
    const slot = sanitizeSegment(builder.slot);
    return `dk.component.${component}-${slot}.${variant}.${state}`;
  }

  const category = sanitizeSegment(builder.category, { allowDot: true });
  const intent = sanitizeSegment(builder.intent, { allowDot: true });
  return `dk.${category}.${intent}.${variant}.${state}`;
}

function buildComponentTemplateTokens(
  builder: TokenBuilderState,
  family: ComponentTemplateFamily,
  states: readonly ComponentTemplateState[] = COMPONENT_TEMPLATE_STATES
): DraftTokenInput[] {
  const component = sanitizeSegment(builder.component);
  const variant = sanitizeSegment(builder.variant);
  const blueprints = COMPONENT_TEMPLATE_BLUEPRINTS[family] ?? [];

  const tokens: DraftTokenInput[] = [];
  for (const blueprint of blueprints) {
    for (const state of states) {
      const rawValue = blueprint.values[state];
      if (!rawValue) {
        continue;
      }

      const id = `dk.component.${component}-${blueprint.slot}.${variant}.${state}`;
      tokens.push({
        id,
        $type: blueprint.type,
        $value: rawValue,
        description: `${component}/${variant} ${blueprint.description} (${state}) [${family}].`,
        state,
        category: "component",
        tags: ["component", component, variant, family, "template"]
      });
    }
  }

  return tokens;
}

function extractAliasReference(rawValue: string) {
  const trimmed = rawValue.trim();
  const match = trimmed.match(/^\{(.+)\}$/u);
  return match ? match[1] : trimmed;
}

function normalizeMappingSlot(slot: string) {
  if (["bg", "border", "panel", "container", "item", "header", "shadow", "opacity", "motion", "accent"].includes(slot)) {
    return "root";
  }
  return slot;
}

function resolvePlatformProperty(slot: string, type: TokenType): string {
  if (["bg", "panel", "container", "item", "header", "accent"].includes(slot)) {
    return "background-color";
  }
  if (slot === "border" || slot === "indicator") {
    return "border-color";
  }
  if (slot === "shadow") {
    return "box-shadow";
  }
  if (slot === "opacity") {
    return "opacity";
  }
  if (slot === "motion") {
    return "transition-duration";
  }
  if (slot === "label" || slot === "icon") {
    return "color";
  }

  if (type === "duration") {
    return "transition-duration";
  }
  if (type === "shadow") {
    return "box-shadow";
  }
  if (type === "number") {
    return "opacity";
  }
  return "color";
}

function buildComponentTemplateMappings(
  builder: TokenBuilderState,
  family: ComponentTemplateFamily,
  states: readonly ComponentTemplateState[] = COMPONENT_TEMPLATE_STATES
): DraftMappingInput[] {
  const component = sanitizeSegment(builder.component);
  const variant = sanitizeSegment(builder.variant);
  const blueprints = COMPONENT_TEMPLATE_BLUEPRINTS[family] ?? [];
  const mappings: DraftMappingInput[] = [];

  for (const blueprint of blueprints) {
    for (const state of states) {
      const rawValue = blueprint.values[state];
      if (!rawValue) {
        continue;
      }

      mappings.push({
        component,
        variant,
        slot: normalizeMappingSlot(blueprint.slot),
        state,
        platformProperty: resolvePlatformProperty(blueprint.slot, blueprint.type),
        tokenRef: `dk.component.${component}-${blueprint.slot}.${variant}.${state}`,
        fallbackRef: extractAliasReference(rawValue)
      });
    }
  }

  return mappings;
}

function mappingIdentity(mapping: DraftMappingInput) {
  return [mapping.component, mapping.variant, mapping.slot, mapping.state, mapping.platformProperty].join("::");
}

function areMappingValuesEqual(left: DraftMappingInput, right: DraftMappingInput) {
  return left.tokenRef === right.tokenRef && left.fallbackRef === right.fallbackRef;
}

function isComponentTemplateState(value: string): value is ComponentTemplateState {
  return (COMPONENT_TEMPLATE_STATES as readonly string[]).includes(value);
}

export function TokenChangeForm({
  brand,
  mode,
  sectionId,
  existingMappings = [],
  existingTokenIds = []
}: {
  brand: string;
  mode: string;
  sectionId?: string;
  existingMappings?: DraftMappingInput[];
  existingTokenIds?: string[];
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [operation, setOperation] = useState<TokenOperation>("update");
  const [builder, setBuilder] = useState<TokenBuilderState>(DEFAULT_BUILDER);
  const [useComponentTemplate, setUseComponentTemplate] = useState(true);
  const [includeTemplateMappings, setIncludeTemplateMappings] = useState(true);
  const [generateMissingStatesOnly, setGenerateMissingStatesOnly] = useState(false);
  const [submitMappingDeltasOnly, setSubmitMappingDeltasOnly] = useState(true);
  const [createNewTokensOnly, setCreateNewTokensOnly] = useState(true);
  const [componentTemplateFamily, setComponentTemplateFamily] =
    useState<ComponentTemplateFamily>("form-control");
  const [result, setResult] = useState<DraftResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const suggestedId = buildSuggestedTokenId(builder);
  const normalizedComponent = sanitizeSegment(builder.component);
  const normalizedVariant = sanitizeSegment(builder.variant);
  const targetMappingFile = `${normalizedComponent}-${normalizedVariant}.mappings.json`;

  const existingGroupMappings = useMemo(() => {
    return existingMappings.filter((mapping) => {
      const component = sanitizeSegment(mapping.component);
      const variant = sanitizeSegment(mapping.variant);
      return component === normalizedComponent && variant === normalizedVariant;
    });
  }, [existingMappings, normalizedComponent, normalizedVariant]);

  const existingMappingLookup = useMemo(() => {
    return new Map(existingGroupMappings.map((mapping) => [mappingIdentity(mapping), mapping]));
  }, [existingGroupMappings]);

  const existingStateCoverage = useMemo(() => {
    const states = new Set(existingGroupMappings.map((mapping) => mapping.state));
    const missing = REQUIRED_MAPPING_STATES.filter((state) => !states.has(state));
    return {
      present: REQUIRED_MAPPING_STATES.length - missing.length,
      total: REQUIRED_MAPPING_STATES.length,
      missing,
      states
    };
  }, [existingGroupMappings]);

  const existingCoverageClass =
    existingStateCoverage.missing.length === 0
      ? "mapping-coverage-status-ok"
      : existingStateCoverage.present >= 3
        ? "mapping-coverage-status-warn"
        : "mapping-coverage-status-bad";
  const templateGenerationStates = useMemo<readonly ComponentTemplateState[]>(() => {
    if (!generateMissingStatesOnly) {
      return COMPONENT_TEMPLATE_STATES;
    }

    return COMPONENT_TEMPLATE_STATES.filter((state) => existingStateCoverage.missing.includes(state));
  }, [existingStateCoverage.missing, generateMissingStatesOnly]);
  const selectedFamily = COMPONENT_TEMPLATE_FAMILY_OPTIONS.find((entry) => entry.id === componentTemplateFamily);
  const componentTemplateTokens = useMemo(
    () =>
      operation === "create" && builder.layer === "component" && useComponentTemplate
        ? buildComponentTemplateTokens(builder, componentTemplateFamily, templateGenerationStates)
        : [],
    [builder, componentTemplateFamily, operation, templateGenerationStates, useComponentTemplate]
  );
  const componentTemplateMappings = useMemo(
    () =>
      operation === "create" && builder.layer === "component" && useComponentTemplate && includeTemplateMappings
        ? buildComponentTemplateMappings(builder, componentTemplateFamily, templateGenerationStates)
        : [],
    [builder, componentTemplateFamily, includeTemplateMappings, operation, templateGenerationStates, useComponentTemplate]
  );

  const existingTokenIdSet = useMemo(() => new Set(existingTokenIds), [existingTokenIds]);
  const existingTemplateTokenIds = useMemo(
    () => componentTemplateTokens.filter((token) => existingTokenIdSet.has(token.id)).map((token) => token.id),
    [componentTemplateTokens, existingTokenIdSet]
  );
  const componentTemplateTokensForSubmission = useMemo(() => {
    if (!createNewTokensOnly) {
      return componentTemplateTokens;
    }

    return componentTemplateTokens.filter((token) => !existingTokenIdSet.has(token.id));
  }, [componentTemplateTokens, createNewTokensOnly, existingTokenIdSet]);


  const templateMappingDiff = useMemo<TemplateMappingDiffItem[]>(() => {
    const statusOrder = {
      create: 0,
      update: 1,
      unchanged: 2
    } as const;

    return componentTemplateMappings
      .map((mapping) => {
        const key = mappingIdentity(mapping);
        const previous = existingMappingLookup.get(key) ?? null;
        const status: TemplateMappingDiffItem["status"] = !previous
          ? "create"
          : areMappingValuesEqual(previous, mapping)
            ? "unchanged"
            : "update";
        return {
          key,
          next: mapping,
          previous,
          status
        };
      })
      .sort((left, right) => {
        const statusDelta = statusOrder[left.status] - statusOrder[right.status];
        if (statusDelta !== 0) {
          return statusDelta;
        }
        return left.key.localeCompare(right.key);
      });
  }, [componentTemplateMappings, existingMappingLookup]);

  const mappingDiffCounts = useMemo(() => {
    return templateMappingDiff.reduce(
      (accumulator, entry) => {
        accumulator[entry.status] += 1;
        return accumulator;
      },
      { create: 0, update: 0, unchanged: 0 }
    );
  }, [templateMappingDiff]);

  const componentTemplateMappingsForSubmission = useMemo(() => {
    if (!submitMappingDeltasOnly) {
      return componentTemplateMappings;
    }

    return templateMappingDiff
      .filter((entry) => entry.status !== "unchanged")
      .map((entry) => entry.next);
  }, [componentTemplateMappings, submitMappingDeltasOnly, templateMappingDiff]);

  const mappingCandidateTokenIds = useMemo(() => {
    const ids = new Set(existingTokenIdSet);
    for (const token of componentTemplateTokensForSubmission) {
      ids.add(token.id);
    }
    return ids;
  }, [componentTemplateTokensForSubmission, existingTokenIdSet]);

  const mergedTemplateMappings = useMemo(() => {
    const merged = new Map(existingMappingLookup);
    for (const mapping of componentTemplateMappingsForSubmission) {
      merged.set(mappingIdentity(mapping), mapping);
    }
    return [...merged.values()];
  }, [componentTemplateMappingsForSubmission, existingMappingLookup]);

  const mappingPrecheck = useMemo<MappingPrecheckResult>(() => {
    if (componentTemplateMappings.length === 0) {
      return { errors: [], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const stateSet = new Set(mergedTemplateMappings.map((mapping) => mapping.state));
    for (const state of REQUIRED_MAPPING_STATES) {
      if (!stateSet.has(state)) {
        errors.push(`missing_required_state: ${normalizedComponent}/${normalizedVariant} is missing "${state}" state.`);
      }
    }

    for (const mapping of mergedTemplateMappings) {
      if (!mappingCandidateTokenIds.has(mapping.tokenRef)) {
        errors.push(`missing_token_ref: "${mapping.tokenRef}" is not available in current token scope.`);
      }
      if (!mappingCandidateTokenIds.has(mapping.fallbackRef)) {
        warnings.push(`missing_fallback_ref: "${mapping.fallbackRef}" is not available in current token scope.`);
      }
    }

    return {
      errors: [...new Set(errors)],
      warnings: [...new Set(warnings)]
    };
  }, [
    componentTemplateMappings.length,
    mappingCandidateTokenIds,
    mergedTemplateMappings,
    normalizedComponent,
    normalizedVariant
  ]);

  const hasBlockingMappingPrecheckError = componentTemplateMappings.length > 0 && mappingPrecheck.errors.length > 0;
  const isComponentTemplateMode =
    operation === "create" && builder.layer === "component" && useComponentTemplate;
  const hasNoTemplateStatesToGenerate = isComponentTemplateMode && templateGenerationStates.length === 0;
  const hasNoTemplateTokensToSubmit = isComponentTemplateMode && componentTemplateTokensForSubmission.length === 0;
  const firstMissingState = existingStateCoverage.missing[0] ?? null;

  function applySuggestedId() {
    setForm((prev) => ({
      ...prev,
      id: suggestedId,
      state: builder.state,
      category: builder.layer === "component" ? "component" : builder.category
    }));
  }

  function onOperationChange(nextOperation: TokenOperation) {
    setOperation(nextOperation);
    if (nextOperation === "create") {
      applySuggestedId();
    }
  }

  function applyFirstMissingState() {
    if (!firstMissingState || !isComponentTemplateState(firstMissingState)) {
      return;
    }

    setBuilder((prev) => ({ ...prev, state: firstMissingState }));
    setForm((prev) => ({ ...prev, state: firstMissingState }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    if (hasNoTemplateStatesToGenerate) {
      setResult({
        ok: false,
        errors: [
          {
            tokenId: suggestedId,
            code: "no_missing_states",
            message: "No missing states to generate. Disable \"Generate missing states only\" or change component/variant."
          }
        ]
      });
      setSubmitting(false);
      return;
    }

    if (hasNoTemplateTokensToSubmit) {
      setResult({
        ok: false,
        errors: [
          {
            tokenId: suggestedId,
            code: "no_new_template_tokens",
            message:
              "No new template tokens to create. Disable \"Create new tokens only\" or switch to update mode."
          }
        ]
      });
      setSubmitting(false);
      return;
    }

    if (hasBlockingMappingPrecheckError) {
      setSubmitting(false);
      return;
    }

    const isComponentTemplateBatch = componentTemplateTokensForSubmission.length > 0;
    const includeMappings = isComponentTemplateBatch && componentTemplateMappingsForSubmission.length > 0;
    const tokenId = (operation === "create" ? suggestedId : form.id).trim();

    const payload = {
      id: tokenId,
      $type: form.type,
      $value: form.value,
      description: form.description,
      brand,
      mode,
      state: form.state,
      category: form.category,
      operation,
      layer: builder.layer,
      deprecated: false,
      since: "0.1.0",
      tokens: isComponentTemplateBatch ? componentTemplateTokensForSubmission : undefined,
      includeMappings,
      mappings: includeMappings ? componentTemplateMappingsForSubmission : undefined,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    };

    const response = await fetch("/api/pr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const body = (await response.json()) as DraftResult;
    setResult(body);
    setSubmitting(false);
  }

  function onReset() {
    setForm(DEFAULT_FORM);
    setOperation("update");
    setBuilder(DEFAULT_BUILDER);
    setUseComponentTemplate(true);
    setIncludeTemplateMappings(true);
    setGenerateMissingStatesOnly(false);
    setSubmitMappingDeltasOnly(true);
    setCreateNewTokensOnly(true);
    setComponentTemplateFamily("form-control");
    setResult(null);
  }

  return (
    <section id={sectionId} className="panel">
      <div className="section-heading">
        <h2>4. Propose Token Edit</h2>
        <p className="muted">
          Submit one change request at a time. Use update mode for existing IDs and create mode for guided token generation.
        </p>
      </div>

      <div className="form-context" aria-label="Selected token context">
        <span>{`Brand: ${brand}`}</span>
        <span>{`Mode: ${mode}`}</span>
        <span>Target: Draft PR</span>
        <span>{`Operation: ${operation}`}</span>
        {componentTemplateTokens.length > 0 ? <span>{`Template tokens: ${componentTemplateTokens.length}`}</span> : null}
        {componentTemplateTokens.length > 0 ? (
          <span>{`Template tokens to submit: ${componentTemplateTokensForSubmission.length}`}</span>
        ) : null}
        {componentTemplateTokens.length > 0 ? (
          <span>{`Family: ${COMPONENT_TEMPLATE_FAMILY_LABEL[componentTemplateFamily]}`}</span>
        ) : null}
        {isComponentTemplateMode ? (
          <span>{`Generation states: ${templateGenerationStates.length > 0 ? templateGenerationStates.join(", ") : "none"}`}</span>
        ) : null}
        {componentTemplateMappings.length > 0 ? <span>{`Template mappings: ${componentTemplateMappings.length}`}</span> : null}
        {componentTemplateMappings.length > 0 ? (
          <span>{`Mappings to submit: ${componentTemplateMappingsForSubmission.length}`}</span>
        ) : null}
      </div>

      <ol className="editor-steps">
        <li>Choose update or create. Create mode generates token IDs from a guided builder.</li>
        <li>For component templates, choose a family preset and optionally include mapping generation.</li>
        <li>Run mapping precheck and fix errors before submit.</li>
        <li>Open the generated draft PR URL and continue review in Git.</li>
      </ol>

      <div className="operation-toggle" role="tablist" aria-label="Token change mode">
        <button
          type="button"
          className={`operation-toggle-btn ${operation === "update" ? "is-active" : ""}`}
          onClick={() => onOperationChange("update")}
        >
          Update Existing Token
        </button>
        <button
          type="button"
          className={`operation-toggle-btn ${operation === "create" ? "is-active" : ""}`}
          onClick={() => onOperationChange("create")}
        >
          Create New Token
        </button>
      </div>

      {operation === "create" ? (
        <div className="token-builder">
          <div className="token-builder-head">
            <h3>Token Builder</h3>
            <p className="muted">Generate valid token IDs without manual pattern typing.</p>
          </div>

          <div className="token-builder-grid">
            <label>
              Layer
              <select
                value={builder.layer}
                onChange={(event) => {
                  const nextLayer = event.target.value as TokenLayer;
                  setBuilder((prev) => ({
                    ...prev,
                    layer: nextLayer,
                    category: nextLayer === "component" ? "component" : prev.category,
                    state: nextLayer === "reference" ? "base" : prev.state
                  }));
                }}
              >
                {LAYER_OPTIONS.map((layer) => (
                  <option key={layer} value={layer}>
                    {layer}
                  </option>
                ))}
              </select>
            </label>

            {builder.layer === "component" ? (
              <>
                <label>
                  Template Family
                  <select
                    value={componentTemplateFamily}
                    onChange={(event) => setComponentTemplateFamily(event.target.value as ComponentTemplateFamily)}
                  >
                    {COMPONENT_TEMPLATE_FAMILY_OPTIONS.map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.label}
                      </option>
                    ))}
                  </select>
                  <span className="field-help">{selectedFamily?.description}</span>
                </label>
                <label>
                  Component
                  <input
                    value={builder.component}
                    onChange={(event) => setBuilder((prev) => ({ ...prev, component: event.target.value }))}
                    placeholder="button"
                  />
                </label>
                <label>
                  Slot
                  <input
                    value={builder.slot}
                    onChange={(event) => setBuilder((prev) => ({ ...prev, slot: event.target.value }))}
                    placeholder="bg"
                  />
                </label>
              </>
            ) : (
              <label>
                Category
                <input
                  value={builder.category}
                  onChange={(event) => setBuilder((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="color"
                />
              </label>
            )}

            <label>
              Intent
              <input
                value={builder.intent}
                onChange={(event) => setBuilder((prev) => ({ ...prev, intent: event.target.value }))}
                placeholder="surface-panel"
              />
            </label>
            <label>
              Variant
              <input
                value={builder.variant}
                onChange={(event) => setBuilder((prev) => ({ ...prev, variant: event.target.value }))}
                placeholder="default"
              />
            </label>
            <label>
              State
              <select
                value={builder.state}
                onChange={(event) => setBuilder((prev) => ({ ...prev, state: event.target.value }))}
              >
                {STATE_OPTIONS.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="token-builder-preview">
            <p className="token-builder-preview-label">Generated token ID</p>
            <code>{suggestedId}</code>
          </div>
          {builder.layer === "component" ? (
            <div className="mapping-coverage-card">
              <p className="template-preview-title">{`Existing Mapping Coverage (${targetMappingFile})`}</p>
              <p className={`mapping-coverage-summary ${existingCoverageClass}`}>
                {`State coverage: ${existingStateCoverage.present}/${existingStateCoverage.total}`}
              </p>
              <p className="mapping-coverage-meta">{`Existing mapping entries: ${existingGroupMappings.length}`}</p>
              <div className="mapping-coverage-states">
                {REQUIRED_MAPPING_STATES.map((state) => {
                  const present = existingStateCoverage.states.has(state);
                  return (
                    <span
                      key={`mapping-coverage-${state}`}
                      className={`mapping-coverage-state ${present ? "mapping-coverage-state-present" : "mapping-coverage-state-missing"}`}
                    >
                      {state}
                    </span>
                  );
                })}
              </div>
              {existingStateCoverage.missing.length > 0 ? (
                <p className="mapping-coverage-meta">{`Missing states: ${existingStateCoverage.missing.join(", ")}`}</p>
              ) : null}
              <button
                className="btn btn-secondary btn-inline"
                type="button"
                onClick={applyFirstMissingState}
                disabled={!firstMissingState}
              >
                {firstMissingState ? `Use First Missing State (${firstMissingState})` : "No Missing State To Apply"}
              </button>
            </div>
          ) : null}

          {builder.layer === "component" ? (
            <div className="template-toggle-wrap">
              <label className="template-toggle">
                <input
                  type="checkbox"
                  checked={useComponentTemplate}
                  onChange={(event) => setUseComponentTemplate(event.target.checked)}
                />
                <span>Create full component template using the selected family preset</span>
              </label>
              {useComponentTemplate ? (
                <label className="template-toggle">
                  <input
                    type="checkbox"
                    checked={generateMissingStatesOnly}
                    onChange={(event) => setGenerateMissingStatesOnly(event.target.checked)}
                  />
                  <span>Generate missing states only (based on Existing Mapping Coverage)</span>
                </label>
              ) : null}
              {useComponentTemplate ? (
                <label className="template-toggle">
                  <input
                    type="checkbox"
                    checked={createNewTokensOnly}
                    onChange={(event) => setCreateNewTokensOnly(event.target.checked)}
                  />
                  <span>Create new tokens only (skip IDs already present in this brand/mode)</span>
                </label>
              ) : null}
              {useComponentTemplate && hasNoTemplateStatesToGenerate ? (
                <p className="mapping-coverage-meta">
                  All required states already exist for this component variant. Disable missing-only mode to regenerate full set.
                </p>
              ) : null}
              {useComponentTemplate && createNewTokensOnly && existingTemplateTokenIds.length > 0 ? (
                <p className="mapping-coverage-meta">{`Skipping ${existingTemplateTokenIds.length} existing token IDs.`}</p>
              ) : null}
              {useComponentTemplate ? (
                <div className="template-preview">
                  <p className="template-preview-title">{`${selectedFamily?.label ?? "Preset"} template will create ${componentTemplateTokensForSubmission.length} tokens`}</p>
                  <ul>
                    {componentTemplateTokensForSubmission.slice(0, 6).map((token) => (
                      <li key={token.id}>
                        <code>{token.id}</code>
                      </li>
                    ))}
                    {componentTemplateTokensForSubmission.length > 6 ? <li>...</li> : null}
                  </ul>
                </div>
              ) : null}
              {useComponentTemplate ? (
                <label className="template-toggle">
                  <input
                    type="checkbox"
                    checked={includeTemplateMappings}
                    onChange={(event) => setIncludeTemplateMappings(event.target.checked)}
                  />
                  <span>Also generate component mappings for this template batch</span>
                </label>
              ) : null}
              {useComponentTemplate && includeTemplateMappings ? (
                <label className="template-toggle">
                  <input
                    type="checkbox"
                    checked={submitMappingDeltasOnly}
                    onChange={(event) => setSubmitMappingDeltasOnly(event.target.checked)}
                  />
                  <span>Submit mapping deltas only (skip unchanged entries)</span>
                </label>
              ) : null}
              {componentTemplateMappings.length > 0 ? (
                <div className="template-preview">
                  <p className="template-preview-title">{`Mappings to upsert: ${componentTemplateMappings.length}`}</p>
                  <ul>
                    {componentTemplateMappings.slice(0, 6).map((mapping) => (
                      <li key={`${mapping.component}-${mapping.variant}-${mapping.slot}-${mapping.state}-${mapping.platformProperty}`}>
                        <code>{`${mapping.slot} / ${mapping.state} -> ${mapping.platformProperty}`}</code>
                      </li>
                    ))}
                    {componentTemplateMappings.length > 6 ? <li>...</li> : null}
                  </ul>
                </div>
              ) : null}
              {componentTemplateMappings.length > 0 && includeTemplateMappings ? (
                <p className="mapping-coverage-meta">
                  {`Submitting ${componentTemplateMappingsForSubmission.length} mapping entries${
                    submitMappingDeltasOnly ? " (delta mode)" : ""
                  }.`}
                </p>
              ) : null}
              {componentTemplateMappings.length > 0 ? (
                <div className="mapping-diff-preview">
                  <p className="template-preview-title">{`Mapping Preview Diff (${targetMappingFile})`}</p>
                  <div className="mapping-diff-pills">
                    <span className="mapping-diff-pill mapping-diff-pill-create">{`Create ${mappingDiffCounts.create}`}</span>
                    <span className="mapping-diff-pill mapping-diff-pill-update">{`Update ${mappingDiffCounts.update}`}</span>
                    <span className="mapping-diff-pill mapping-diff-pill-unchanged">{`Unchanged ${mappingDiffCounts.unchanged}`}</span>
                  </div>
                  <ul className="mapping-diff-list">
                    {templateMappingDiff.slice(0, 8).map((entry) => (
                      <li key={entry.key} className="mapping-diff-item">
                        <div className="mapping-diff-head">
                          <span className={`mapping-diff-status mapping-diff-status-${entry.status}`}>{entry.status}</span>
                          <code>{`${entry.next.slot}/${entry.next.state}`}</code>
                          <code>{entry.next.platformProperty}</code>
                        </div>
                        <p className="mapping-diff-line">
                          Token: <code>{entry.next.tokenRef}</code>
                        </p>
                        <p className="mapping-diff-line">
                          Fallback:
                          {entry.previous && entry.previous.fallbackRef !== entry.next.fallbackRef ? (
                            <>
                              {" "}
                              <code>{entry.previous.fallbackRef}</code>
                              {" -> "}
                              <code>{entry.next.fallbackRef}</code>
                            </>
                          ) : (
                            <>
                              {" "}
                              <code>{entry.next.fallbackRef}</code>
                            </>
                          )}
                        </p>
                      </li>
                    ))}
                    {templateMappingDiff.length > 8 ? (
                      <li className="mapping-diff-more">{`${templateMappingDiff.length - 8} more mapping entries`}</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
              {componentTemplateMappings.length > 0 ? (
                <div
                  className={`mapping-precheck ${hasBlockingMappingPrecheckError ? "mapping-precheck-error" : "mapping-precheck-ok"}`}
                  role="status"
                >
                  <p className="template-preview-title">Mapping Contract Precheck</p>
                  {mappingPrecheck.errors.length === 0 ? (
                    <p className="mapping-precheck-line">No blocking mapping contract errors detected.</p>
                  ) : (
                    <ul className="mapping-precheck-list">
                      {mappingPrecheck.errors.map((message) => (
                        <li key={`mapping-precheck-error-${message}`} className="mapping-precheck-item mapping-precheck-item-error">
                          {message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {mappingPrecheck.warnings.length > 0 ? (
                    <ul className="mapping-precheck-list">
                      {mappingPrecheck.warnings.slice(0, 4).map((message) => (
                        <li key={`mapping-precheck-warning-${message}`} className="mapping-precheck-item mapping-precheck-item-warning">
                          {message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <button className="btn btn-secondary btn-inline" type="button" onClick={applySuggestedId}>
            Use Generated ID and Metadata
          </button>
        </div>
      ) : null}

      <form className="token-form" onSubmit={onSubmit}>
        <label>
          Token ID
          <input
            value={form.id}
            onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
            placeholder="dk.color.surface.panel.default"
            required
          />
          <span className="field-help">Use `namespace.category.intent.variant.state` naming.</span>
        </label>
        <label>
          Type
          <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
            {TOKEN_TYPES.map((tokenType) => (
              <option key={tokenType} value={tokenType}>
                {tokenType}
              </option>
            ))}
          </select>
          <span className="field-help">Pick the primitive type before entering value syntax.</span>
        </label>
        <label>
          Value
          <input
            value={form.value}
            onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
            placeholder="#E2E8F0 or {dk.color.gray.100.base}"
            required
          />
          <span className="field-help">Use raw value or alias reference wrapped in braces.</span>
        </label>
        <label>
          Description
          <input
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            required
          />
          <span className="field-help">Describe semantic intent and where this token is consumed.</span>
        </label>
        <label>
          State
          <select
            value={form.state}
            onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
          >
            {STATE_OPTIONS.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <span className="field-help">Typical values: base, hover, active, disabled, focus.</span>
        </label>
        <label>
          Category
          <input
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            required
          />
          <span className="field-help">Examples: color, typography, spacing, motion.duration.</span>
        </label>
        <label>
          Tags
          <input
            value={form.tags}
            onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            placeholder="comma,separated"
          />
          <span className="field-help">Optional discoverability labels. Separate multiple tags with commas.</span>
        </label>
        <div className="token-form-actions">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={submitting || hasBlockingMappingPrecheckError || hasNoTemplateStatesToGenerate || hasNoTemplateTokensToSubmit}
          >
            {submitting
              ? "Validating..."
              : hasNoTemplateTokensToSubmit
                ? "No New Tokens To Create"
              : hasNoTemplateStatesToGenerate
                ? "No Missing States To Generate"
              : hasBlockingMappingPrecheckError
                ? "Fix Mapping Precheck Errors"
              : operation === "create"
                ? "Validate and Create New Token PR"
                : "Validate and Update Token PR"}
          </button>
          <button className="btn btn-quiet" type="button" onClick={onReset} disabled={submitting}>
            Reset Form
          </button>
        </div>
      </form>

      {result?.ok && result.prUrl ? (
        <div className="success-box" role="status">
          <p>
            {result.mode === "auto-pr"
              ? result.operation === "create"
                ? "Draft PR created automatically for a new token."
                : "Draft PR created automatically for token update."
              : "Draft compare URL generated. Configure GitHub autopilot to create PRs automatically."}
          </p>
          {typeof result.tokenCount === "number" && result.tokenCount > 1 ? (
            <p className="muted">{`Batch size: ${result.tokenCount} tokens`}</p>
          ) : null}
          {typeof result.mappingCount === "number" && result.mappingCount > 0 ? (
            <p className="muted">{`Mappings updated: ${result.mappingCount}`}</p>
          ) : null}
          {result.message ? <p className="muted">{result.message}</p> : null}
          <a className="btn btn-secondary btn-inline" href={result.prUrl} target="_blank" rel="noreferrer">
            Open Pull Request Draft
          </a>
        </div>
      ) : null}

      {result?.errors?.length ? (
        <div className="error-box" role="alert">
          <p>{`Validation errors (${result.errors.length}):`}</p>
          <ul className="error-list">
            {result.errors.map((error) => (
              <li className="error-item" key={`${error.code}-${error.message}`}>
                <code>{error.code}</code>
                <span>{error.message}</span>
              </li>
            ))}
          </ul>
          {result.prUrl ? (
            <a className="btn btn-secondary btn-inline" href={result.prUrl} target="_blank" rel="noreferrer">
              Open Compare URL Instead
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
