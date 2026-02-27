"use client";

import { FormEvent, useState } from "react";

interface DraftResult {
  ok: boolean;
  prUrl?: string;
  branch?: string;
  errors?: Array<{ tokenId: string; code: string; message: string }>;
}

const DEFAULT_FORM = {
  id: "dk.color.surface.panel.default",
  type: "color",
  value: "#E2E8F0",
  description: "Panel surface color token.",
  state: "base",
  category: "color",
  tags: "draft,studio"
};

export function TokenChangeForm({
  brand,
  mode,
  sectionId
}: {
  brand: string;
  mode: string;
  sectionId?: string;
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState<DraftResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    const payload = {
      id: form.id,
      $type: form.type,
      $value: form.value,
      description: form.description,
      brand,
      mode,
      state: form.state,
      category: form.category,
      deprecated: false,
      since: "0.1.0",
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
    setResult(null);
  }

  return (
    <section id={sectionId} className="panel">
      <div className="section-heading">
        <h2>4. Propose Token Edit</h2>
        <p className="muted">
          Submit one change request at a time. The Studio validates schema and alias safety, then returns a pull-request draft.
        </p>
      </div>

      <div className="form-context" aria-label="Selected token context">
        <span>{`Brand: ${brand}`}</span>
        <span>{`Mode: ${mode}`}</span>
        <span>Target: Draft PR</span>
      </div>

      <ol className="editor-steps">
        <li>Enter token metadata and a value matching the selected type.</li>
        <li>Submit to run validation checks and safety guards.</li>
        <li>Open the generated draft PR URL and continue review in Git.</li>
      </ol>

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
            <option value="color">color</option>
            <option value="dimension">dimension</option>
            <option value="number">number</option>
            <option value="duration">duration</option>
            <option value="typography">typography</option>
            <option value="shadow">shadow</option>
            <option value="cubicBezier">cubicBezier</option>
            <option value="strokeStyle">strokeStyle</option>
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
          <input
            value={form.state}
            onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
            required
          />
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
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Validating..." : "Validate and Create Draft PR"}
          </button>
          <button className="btn btn-quiet" type="button" onClick={onReset} disabled={submitting}>
            Reset Form
          </button>
        </div>
      </form>

      {result?.ok && result.prUrl ? (
        <div className="success-box" role="status">
          <p>PR draft URL generated successfully.</p>
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
        </div>
      ) : null}
    </section>
  );
}
