"use client";

import { useActionState } from "react";

import {
  createProject,
  createWorkspace,
  linkApiKey,
  linkOidcSub,
  type FormState,
} from "./actions";

const initial: FormState = {};

function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p className="mt-2 text-sm text-rose-700" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className="mt-2 text-sm text-emerald-800" role="status">
        {state.ok}
      </p>
    );
  }
  return null;
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400";
const labelClass = "block text-xs font-medium uppercase tracking-wide text-zinc-600";
const btnClass =
  "inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50";
const dangerBtnClass =
  "inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 shadow-sm hover:bg-rose-50";

type WorkspaceRow = { id: string; name: string; slug: string };

type ProjectRow = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  vercelProjectId: string | null;
};

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState(createWorkspace, initial);
  return (
    <form action={formAction} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Add workspace</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Name
          <input className={fieldClass} name="name" required placeholder="Production" />
        </label>
        <label className={labelClass}>
          Slug
          <input className={fieldClass} name="slug" placeholder="production (optional)" />
        </label>
      </div>
      <button className={`${btnClass} mt-4`} disabled={pending} type="submit">
        {pending ? "Saving…" : "Create workspace"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function CreateProjectForm({ workspaces }: { workspaces: WorkspaceRow[] }) {
  const [state, formAction, pending] = useActionState(createProject, initial);
  if (workspaces.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        Create a workspace before adding projects.
      </p>
    );
  }
  const firstWs = workspaces[0]!;
  return (
    <form action={formAction} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Add project</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Workspace
          <select className={fieldClass} name="workspaceId" required defaultValue={firstWs.id}>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.slug})
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Project name
          <input className={fieldClass} name="name" required placeholder="Marketing site" />
        </label>
        <label className={labelClass}>
          Slug
          <input className={fieldClass} name="slug" placeholder="marketing (optional)" />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Vercel project ID (optional)
          <input className={fieldClass} name="vercelProjectId" placeholder="prj_…" />
        </label>
      </div>
      <button className={`${btnClass} mt-4`} disabled={pending} type="submit">
        {pending ? "Saving…" : "Create project"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

function projectCompoundOptions(
  workspaces: WorkspaceRow[],
  projects: ProjectRow[],
): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (const ws of workspaces) {
    for (const p of projects) {
      if (p.workspaceId !== ws.id) {
        continue;
      }
      out.push({
        value: `${ws.id}::${p.id}`,
        label: `${ws.slug} / ${p.slug} — ${p.name}`,
      });
    }
  }
  return out;
}

export function LinkApiKeyForm({
  workspaces,
  projects,
}: {
  workspaces: WorkspaceRow[];
  projects: ProjectRow[];
}) {
  const [state, formAction, pending] = useActionState(linkApiKey, initial);
  const opts = projectCompoundOptions(workspaces, projects);
  if (opts.length === 0) {
    return null;
  }
  const firstOpt = opts[0]!;
  return (
    <form action={formAction} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Link API key → project</h3>
      <p className="mt-1 text-xs text-zinc-500">
        The raw key is hashed (SHA-256) at rest; only prefix + hash are stored.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Project
          <select className={fieldClass} name="workspaceProject" required defaultValue={firstOpt.value}>
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Provider
          <select className={fieldClass} name="provider" required defaultValue="openai">
            <option value="openai">openai</option>
            <option value="vercel">vercel</option>
            <option value="anthropic">anthropic</option>
            <option value="aws">aws</option>
          </select>
        </label>
        <label className={labelClass}>
          Label (optional)
          <input className={fieldClass} name="label" placeholder="CI token" />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          API key
          <input className={fieldClass} name="apiKey" required type="password" autoComplete="off" />
        </label>
      </div>
      <button className={`${btnClass} mt-4`} disabled={pending} type="submit">
        {pending ? "Saving…" : "Save mapping"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function LinkOidcForm({
  workspaces,
  projects,
}: {
  workspaces: WorkspaceRow[];
  projects: ProjectRow[];
}) {
  const [state, formAction, pending] = useActionState(linkOidcSub, initial);
  const opts = projectCompoundOptions(workspaces, projects);
  if (opts.length === 0) {
    return null;
  }
  const firstOpt = opts[0]!;
  return (
    <form action={formAction} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Link OIDC subject → project</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Project
          <select className={fieldClass} name="workspaceProject" required defaultValue={firstOpt.value}>
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          OIDC <code className="normal-case">sub</code>
          <input className={fieldClass} name="oidcSub" required placeholder="user|deployment|…" />
        </label>
      </div>
      <button className={`${btnClass} mt-4`} disabled={pending} type="submit">
        {pending ? "Saving…" : "Save mapping"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function DeleteButton({
  label,
  action,
  id,
}: {
  label: string;
  action: (formData: FormData) => Promise<void>;
  id: string;
}) {
  return (
    <form action={action}>
      <input name="id" type="hidden" value={id} />
      <button className={dangerBtnClass} type="submit">
        {label}
      </button>
    </form>
  );
}
