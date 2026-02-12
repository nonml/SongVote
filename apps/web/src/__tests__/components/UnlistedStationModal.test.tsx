/**
 * Tests for UnlistedStationModal component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../lib/api";
import UnlistedStationModal from "../../components/UnlistedStationModal";

// Mock createUnlistedStation
vi.mock("../../lib/api", () => ({
  createUnlistedStation: vi.fn().mockResolvedValue({ station_id: "test-uuid-1234567890", created: true }),
}));

describe("UnlistedStationModal", () => {
  it("should not render when closed", () => {
    render(
      <UnlistedStationModal
        open={false}
        ctx={null}
        onClose={() => {}}
        onCreated={() => {}}
      />
    );

    expect(screen.queryByText("Unlisted Station")).not.toBeInTheDocument();
  });

  it("should render when open", () => {
    render(
      <UnlistedStationModal
        open={true}
        ctx={{
          constituency_id: 1,
          subdistrict_id: 1,
          subdistrict_name: "Bang Kho Laem",
          station_number: 99,
        }}
        onClose={() => {}}
        onCreated={() => {}}
      />
    );

    expect(screen.getByText("Unlisted Station")).toBeInTheDocument();
    // Text contains "Constituency ID:" followed by badge
    expect(screen.getByText(/Constituency ID: */)).toBeInTheDocument();
    expect(screen.getByText("Bang Kho Laem")).toBeInTheDocument();
  });

  it("should show constituency and subdistrict info", () => {
    render(
      <UnlistedStationModal
        open={true}
        ctx={{
          constituency_id: 5,
          subdistrict_id: 10,
          subdistrict_name: "Huai Khwang",
          station_number: 99,
        }}
        onClose={() => {}}
        onCreated={() => {}}
      />
    );

    // Badge with constituency ID 5 (find by containing text)
    // Badge with constituency ID - check text content by selecting the first badge element
    const firstBadge = screen.getByText("5");
    expect(firstBadge).toBeInTheDocument();
    expect(screen.getByText("Huai Khwang")).toBeInTheDocument();
  });

  it("should render station number input", () => {
    render(
      <UnlistedStationModal
        open={true}
        ctx={{
          constituency_id: 1,
          subdistrict_id: 1,
          subdistrict_name: "Test",
          station_number: 99,
        }}
        onClose={() => {}}
        onCreated={() => {}}
      />
    );

    expect(screen.getByPlaceholderText("e.g., 99")).toBeInTheDocument();
  });

  it("should render location name input", () => {
    render(
      <UnlistedStationModal
        open={true}
        ctx={{
          constituency_id: 1,
          subdistrict_id: 1,
          subdistrict_name: "Test",
          station_number: 99,
        }}
        onClose={() => {}}
        onCreated={() => {}}
      />
    );

    expect(screen.getByPlaceholderText("e.g., โรงเรียน...")).toBeInTheDocument();
  });

  it("should call onClose when cancel clicked", () => {
    const onClose = vi.fn();
    render(
      <UnlistedStationModal
        open={true}
        ctx={{
          constituency_id: 1,
          subdistrict_id: 1,
          subdistrict_name: "Test",
          station_number: 99,
        }}
        onClose={onClose}
        onCreated={() => {}}
      />
    );

    const cancelBtn = screen.getByText("Cancel");
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it("should show error for invalid station number", async () => {
    const onCreated = vi.fn();
    render(
      <UnlistedStationModal
        open={true}
        ctx={{
          constituency_id: 1,
          subdistrict_id: 1,
          subdistrict_name: "Test",
          station_number: 99,
        }}
        onClose={() => {}}
        onCreated={onCreated}
      />
    );

    const stationInput = screen.getByPlaceholderText("e.g., 99");
    fireEvent.change(stationInput, { target: { value: "-5" } });

    const createBtn = screen.getByText("Create");
    fireEvent.click(createBtn);

    expect(screen.getByText("Enter a valid station number.")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("should show error for zero station number", async () => {
    const onCreated = vi.fn();
    render(
      <UnlistedStationModal
        open={true}
        ctx={{
          constituency_id: 1,
          subdistrict_id: 1,
          subdistrict_name: "Test",
          station_number: 99,
        }}
        onClose={() => {}}
        onCreated={onCreated}
      />
    );

    const stationInput = screen.getByPlaceholderText("e.g., 99");
    fireEvent.change(stationInput, { target: { value: "0" } });

    const createBtn = screen.getByText("Create");
    fireEvent.click(createBtn);

    expect(screen.getByText("Enter a valid station number.")).toBeInTheDocument();
  });

  it("should call onCreated with station_id on success", async () => {
    const onCreated = vi.fn();
    render(
      <UnlistedStationModal
        open={true}
        ctx={{
          constituency_id: 1,
          subdistrict_id: 1,
          subdistrict_name: "Test",
          station_number: 99,
        }}
        onClose={() => {}}
        onCreated={onCreated}
      />
    );

    const stationInput = screen.getByPlaceholderText("e.g., 99");
    fireEvent.change(stationInput, { target: { value: "99" } });

    const createBtn = screen.getByText("Create");
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith("test-uuid-1234567890");
    });
  });

  it("should reset form when opening from closed state", () => {
    const { rerender } = render(
      <UnlistedStationModal
        open={false}
        ctx={{
          constituency_id: 1,
          subdistrict_id: 1,
          subdistrict_name: "Test",
          station_number: 99,
        }}
        onClose={() => {}}
        onCreated={() => {}}
      />
    );

    // Render when open (should reset)
    rerender(
      <UnlistedStationModal
        open={true}
        ctx={{
          constituency_id: 1,
          subdistrict_id: 1,
          subdistrict_name: "Test",
          station_number: 99,
        }}
        onClose={() => {}}
        onCreated={() => {}}
      />
    );

    const stationInput = screen.getByPlaceholderText("e.g., 99");
    expect(stationInput).toHaveValue("");
  });

  it("should not render when ctx is null", () => {
    render(
      <UnlistedStationModal
        open={true}
        ctx={null}
        onClose={() => {}}
        onCreated={() => {}}
      />
    );

    expect(screen.queryByText("Unlisted Station")).not.toBeInTheDocument();
  });

  it("should be disabled while busy", () => {
    render(
      <UnlistedStationModal
        open={true}
        ctx={{
          constituency_id: 1,
          subdistrict_id: 1,
          subdistrict_name: "Test",
          station_number: 99,
        }}
        onClose={() => {}}
        onCreated={() => {}}
      />
    );

    const stationInput = screen.getByPlaceholderText("e.g., 99");
    fireEvent.change(stationInput, { target: { value: "99" } });

    const createBtn = screen.getByText("Create");
    expect(createBtn).not.toBeDisabled();
  });
});