import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppStateProvider } from "../context/AppStateContext";
import type { AppDatabase } from "../storage/db";
import { createTestDatabase } from "../test/testDb";
import type { Link } from "../types";
import { LinkEditModal } from "./LinkEditModal";

let testDb: AppDatabase;

vi.mock("../storage/db", () => ({
  getDatabase: () => Promise.resolve(testDb),
}));

const seededLink: Link = {
  id: "l1",
  dashboardId: "d1",
  order: 0,
  title: "Example",
  url: "https://example.com",
  backgroundImageUrl: "https://example.com/bg.png",
};

async function renderModal(onClose: () => void) {
  render(
    <AppStateProvider>
      <LinkEditModal link={seededLink} onClose={onClose} />
    </AppStateProvider>,
  );
  // Wait for the seeded fields to render so the provider/db is ready.
  await screen.findByDisplayValue(seededLink.url);
}

beforeEach(async () => {
  localStorage.clear();
  testDb = await createTestDatabase();
  await testDb.dashboards.insert({ id: "d1", name: "D1", order: 0, createdAt: 1 });
  await testDb.links.insert({ ...seededLink });
});

afterEach(async () => {
  await testDb.remove();
});

describe("LinkEditModal", () => {
  it("rejects an invalid URL and keeps the dialog open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    await renderModal(onClose);

    const urlInput = screen.getByLabelText("URL");
    await user.clear(urlInput);
    await user.type(urlInput, "ht tp://broken");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter a valid URL (http or https).")).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();

    const persisted = await testDb.links.findOne("l1").exec();
    expect(persisted?.toJSON().url).toBe(seededLink.url);
  });

  it("accepts a scheme-less URL", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    await renderModal(onClose);

    const urlInput = screen.getByLabelText("URL");
    await user.clear(urlInput);
    await user.type(urlInput, "github.com");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const persisted = await testDb.links.findOne("l1").exec();
    expect(persisted?.toJSON().url).toBe("https://github.com");
  });

  it("treats an empty background field as valid", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    await renderModal(onClose);

    const backgroundInput = screen.getByLabelText("Background image URL");
    await user.clear(backgroundInput);
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByText("Enter a valid image URL, or leave this empty.")).toBeNull();

    const persisted = await testDb.links.findOne("l1").exec();
    expect(persisted?.toJSON().backgroundImageUrl).toBeUndefined();
  });
});
