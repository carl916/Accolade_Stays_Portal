import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BedroomsSection } from "@/components/admin/BedroomsSection";
import type { BedroomFormBedroom } from "@/components/admin/BedroomSetupForm";

const propertyActionMocks = vi.hoisted(() => ({
  updateBedroomCurrentSetup: vi.fn()
}));

vi.mock("@/lib/admin/property-actions", () => ({
  createBedroom: vi.fn(),
  updateBedroom: vi.fn(),
  updateBedroomCurrentSetup: propertyActionMocks.updateBedroomCurrentSetup
}));

function buildBedroom(overrides: Partial<BedroomFormBedroom>): BedroomFormBedroom {
  return {
    id: "bedroom-1",
    name: "Bedroom 1",
    physical_bed_type: "zip_and_link",
    default_configuration: "king",
    current_configuration: "king",
    current_configuration_confirmed_at: null,
    is_active: true,
    bedroom_permitted_configurations: [],
    ...overrides
  };
}

describe("BedroomsSection", () => {
  it("shows one active segmented option and updates the current setup optimistically", async () => {
    propertyActionMocks.updateBedroomCurrentSetup.mockResolvedValue({});

    render(
      <BedroomsSection
        propertyId="11111111-1111-4111-8111-111111111111"
        bedrooms={[buildBedroom({ id: "bedroom-1", name: "Main bedroom" })]}
      />
    );

    const setupGroup = screen.getByRole("radiogroup", { name: "Main bedroom current setup" });
    const kingOption = within(setupGroup).getByRole("radio", { name: "King" });
    const twinOption = within(setupGroup).getByRole("radio", { name: "Twin" });

    expect(kingOption).toHaveAttribute("aria-checked", "true");
    expect(twinOption).toHaveAttribute("aria-checked", "false");

    fireEvent.click(twinOption);

    expect(kingOption).toHaveAttribute("aria-checked", "false");
    expect(twinOption).toHaveAttribute("aria-checked", "true");
    await waitFor(() => {
      expect(propertyActionMocks.updateBedroomCurrentSetup).toHaveBeenCalledWith({
        propertyId: "11111111-1111-4111-8111-111111111111",
        bedroomId: "bedroom-1",
        currentConfiguration: "two_singles"
      });
    });
  });

  it("renders fixed double setup as a non-interactive badge and uses an edit button", () => {
    render(
      <BedroomsSection
        propertyId="11111111-1111-4111-8111-111111111111"
        bedrooms={[
          buildBedroom({
            id: "bedroom-2",
            name: "Second bedroom",
            physical_bed_type: "fixed_double",
            default_configuration: "double",
            current_configuration: "double"
          })
        ]}
      />
    );

    expect(screen.getByText("Double")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Double" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit bedroom: Second bedroom" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Settings/i })).not.toBeInTheDocument();
  });

  it("restores the previous setup and shows an error when saving fails", async () => {
    propertyActionMocks.updateBedroomCurrentSetup.mockResolvedValue({
      error: "Could not update setup."
    });

    render(
      <BedroomsSection
        propertyId="11111111-1111-4111-8111-111111111111"
        bedrooms={[buildBedroom({ id: "bedroom-1", name: "Main bedroom" })]}
      />
    );

    const setupGroup = screen.getByRole("radiogroup", { name: "Main bedroom current setup" });
    const kingOption = within(setupGroup).getByRole("radio", { name: "King" });
    const twinOption = within(setupGroup).getByRole("radio", { name: "Twin" });

    fireEvent.click(twinOption);

    await waitFor(() => {
      expect(screen.getByText("Could not update setup.")).toBeInTheDocument();
    });
    expect(kingOption).toHaveAttribute("aria-checked", "true");
    expect(twinOption).toHaveAttribute("aria-checked", "false");
  });
});
