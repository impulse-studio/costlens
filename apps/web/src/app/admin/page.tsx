import { desc } from "drizzle-orm";

import {
  apiKeyProjectMapping,
  oidcProjectMapping,
  project,
  workspace,
} from "@costlens/database";

import {
  CreateProjectForm,
  CreateWorkspaceForm,
  DeleteButton,
  LinkApiKeyForm,
  LinkOidcForm,
} from "./admin-forms";
import {
  deleteApiKeyMappingAction,
  deleteOidcMappingAction,
  deleteProjectAction,
} from "./actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const db = getDb();
  const workspaces = await db.select().from(workspace).orderBy(workspace.slug);
  const projects = await db.select().from(project).orderBy(project.slug);
  const apiKeys = await db
    .select()
    .from(apiKeyProjectMapping)
    .orderBy(desc(apiKeyProjectMapping.createdAt));
  const oidcs = await db
    .select()
    .from(oidcProjectMapping)
    .orderBy(desc(oidcProjectMapping.createdAt));

  const wsById = new Map(workspaces.map((w) => [w.id, w]));
  const projById = new Map(projects.map((p) => [p.id, p]));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="border-b border-zinc-200 pb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          CostLens
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
          Admin
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          Manage workspaces, projects, and cost attribution mappings. No auth gate in
          phase 1 — do not expose this deployment publicly.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <CreateWorkspaceForm />
        <CreateProjectForm workspaces={workspaces} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <LinkApiKeyForm workspaces={workspaces} projects={projects} />
        <LinkOidcForm workspaces={workspaces} projects={projects} />
      </div>

      <section className="mt-12">
        <h2 className="text-sm font-semibold text-zinc-900">Workspaces &amp; projects</h2>
        <div className="mt-4 space-y-6">
          {workspaces.length === 0 ? (
            <p className="text-sm text-zinc-500">No workspaces yet.</p>
          ) : (
            workspaces.map((ws) => {
              const wProjects = projects.filter((p) => p.workspaceId === ws.id);
              return (
                <div
                  key={ws.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900">{ws.name}</h3>
                      <p className="text-xs text-zinc-500">
                        slug <code className="rounded bg-zinc-100 px-1">{ws.slug}</code> · id{" "}
                        <code className="rounded bg-zinc-100 px-1">{ws.id}</code>
                      </p>
                    </div>
                  </div>
                  {wProjects.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">No projects in this workspace.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-zinc-100">
                      {wProjects.map((p) => (
                        <li className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between" key={p.id}>
                          <div>
                            <p className="font-medium text-zinc-900">{p.name}</p>
                            <p className="text-xs text-zinc-500">
                              <code className="rounded bg-zinc-100 px-1">{p.slug}</code>
                              {p.vercelProjectId ? (
                                <>
                                  {" "}
                                  · Vercel{" "}
                                  <code className="rounded bg-zinc-100 px-1">
                                    {p.vercelProjectId}
                                  </code>
                                </>
                              ) : null}
                            </p>
                          </div>
                          <DeleteButton action={deleteProjectAction} id={p.id} label="Delete project" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">API key mappings</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Project</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Prefix</th>
                  <th className="px-3 py-2 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-zinc-500" colSpan={4}>
                      No API key mappings.
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((row) => {
                    const p = projById.get(row.projectId);
                    const w = wsById.get(row.workspaceId);
                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-zinc-800">
                          {w?.slug}/{p?.slug ?? "?"}
                        </td>
                        <td className="px-3 py-2 text-zinc-600">{row.provider}</td>
                        <td className="px-3 py-2 font-mono text-xs text-zinc-600">
                          {row.apiKeyPrefix}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <DeleteButton
                            action={deleteApiKeyMappingAction}
                            id={row.id}
                            label="Remove"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-900">OIDC mappings</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Project</th>
                  <th className="px-3 py-2">OIDC sub</th>
                  <th className="px-3 py-2 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {oidcs.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-zinc-500" colSpan={3}>
                      No OIDC mappings.
                    </td>
                  </tr>
                ) : (
                  oidcs.map((row) => {
                    const p = projById.get(row.projectId);
                    const w = wsById.get(row.workspaceId);
                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-zinc-800">
                          {w?.slug}/{p?.slug ?? "?"}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 font-mono text-xs text-zinc-600">
                          {row.oidcSub}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <DeleteButton
                            action={deleteOidcMappingAction}
                            id={row.id}
                            label="Remove"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
