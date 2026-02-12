/**
 * Tests for StationSelector component
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StationSelector from "../../components/StationSelector";

// Mock config
const mockConfig = {
  provinces: [
    { id: 1, name_th: "Bangkok" },
    { id: 2, name_th: "Chiang Mai" },
  ],
  constituencies: [
    { id: 1, province_id: 1, khet_number: 1 },
    { id: 2, province_id: 1, khet_number: 2 },
    { id: 3, province_id: 2, khet_number: 1 },
  ],
  subdistricts: [
    { constituency_id: 1, subdistrict_id: 1, subdistrict_name: "Bang Kho Laem" },
    { constituency_id: 1, subdistrict_id: 2, subdistrict_name: "Bang Khen" },
    { constituency_id: 2, subdistrict_id: 3, subdistrict_name: "Huai Khwang" },
  ],
  stations: [
    { id: "s1", constituency_id: 1, subdistrict_id: 1, subdistrict_name: "Bang Kho Laem", station_number: 1, location_name: "School A", is_verified_exist: true },
    { id: "s2", constituency_id: 1, subdistrict_id: 1, subdistrict_name: "Bang Kho Laem", station_number: 2, location_name: "School B", is_verified_exist: true },
    { id: "s3", constituency_id: 1, subdistrict_id: 2, subdistrict_name: "Bang Khen", station_number: 1, location_name: "School C", is_verified_exist: true },
    { id: "s4", constituency_id: 2, subdistrict_id: 3, subdistrict_name: "Huai Khwang", station_number: 1, location_name: "School D", is_verified_exist: true },
  ],
};

describe("StationSelector", () => {
  it("should render province dropdown", () => {
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={() => {}}
      />
    );

    // Check for the ellipsis character that's in the Select option
    expect(screen.getByText("Bangkok")).toBeInTheDocument();
    expect(screen.getByText("Chiang Mai")).toBeInTheDocument();
  });

  it("should render constituency dropdown when province selected", () => {
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={() => {}}
      />
    );

    const provinceSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(provinceSelect, { target: { value: "1" } });

    expect(screen.getByText("Khet 1")).toBeInTheDocument();
    expect(screen.getByText("Khet 2")).toBeInTheDocument();
  });

  it("should render subdistrict dropdown when constituency selected", () => {
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={() => {}}
      />
    );

    const provinceSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(provinceSelect, { target: { value: "1" } });

    const constituencySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(constituencySelect, { target: { value: "1" } });

    expect(screen.getByText("Bang Kho Laem")).toBeInTheDocument();
    expect(screen.getByText("Bang Khen")).toBeInTheDocument();
  });

  it("should render station list when subdistrict selected", () => {
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={() => {}}
      />
    );

    const provinceSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(provinceSelect, { target: { value: "1" } });

    const constituencySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(constituencySelect, { target: { value: "1" } });

    const subdistrictSelect = screen.getAllByRole("combobox")[2];
    fireEvent.change(subdistrictSelect, { target: { value: "1" } });

    // Thai text "หน่วย" and number "1/2" are in separate text nodes, use regex
    // There are multiple stations, use getAllByText
    const stations = screen.getAllByText(/หน่วย/);
    expect(stations).toHaveLength(2);
  });

  it("should call onChange when station selected", () => {
    const handleChange = vi.fn();
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={handleChange}
      />
    );

    const provinceSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(provinceSelect, { target: { value: "1" } });

    const constituencySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(constituencySelect, { target: { value: "1" } });

    const subdistrictSelect = screen.getAllByRole("combobox")[2];
    fireEvent.change(subdistrictSelect, { target: { value: "1" } });

    const stationSelect = screen.getAllByRole("combobox")[3];
    fireEvent.change(stationSelect, { target: { value: "s1" } });

    expect(handleChange).toHaveBeenCalledWith(mockConfig.stations[0]);
  });

  it("should clear downstream selects when province changes", () => {
    const handleChange = vi.fn();
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={handleChange}
      />
    );

    // Select all the way to stations
    const provinceSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(provinceSelect, { target: { value: "1" } });

    const constituencySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(constituencySelect, { target: { value: "1" } });

    const subdistrictSelect = screen.getAllByRole("combobox")[2];
    fireEvent.change(subdistrictSelect, { target: { value: "1" } });

    // Change province - should clear everything
    fireEvent.change(provinceSelect, { target: { value: "2" } });

    // Constituency should be empty now - it's the second combobox
    expect(screen.getAllByRole("combobox")[1]).toHaveValue("");
  });

  it("should show unlisted station button when constituency selected", () => {
    const handleUnlisted = vi.fn();
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={() => {}}
        onNeedUnlisted={handleUnlisted}
      />
    );

    const provinceSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(provinceSelect, { target: { value: "1" } });

    // Need to select constituency for the button to appear
    const constituencySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(constituencySelect, { target: { value: "1" } });

    expect(screen.getByRole("button", { name: /Unlisted/ })).toBeInTheDocument();
  });

  it("should call onNeedUnlisted when button clicked", () => {
    const handleUnlisted = vi.fn();
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={() => {}}
        onNeedUnlisted={handleUnlisted}
      />
    );

    const provinceSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(provinceSelect, { target: { value: "1" } });

    // Select constituency first to enable the button
    const constituencySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(constituencySelect, { target: { value: "1" } });

    const unlistedBtn = screen.getByRole("button", { name: /Unlisted/ });
    fireEvent.click(unlistedBtn);

    expect(handleUnlisted).toHaveBeenCalledWith({
      constituency_id: 1,
      subdistrict_id: 1,
      subdistrict_name: "Bang Kho Laem",
      station_number: 0,
    });
  });

  it("should support station search by number", () => {
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={() => {}}
      />
    );

    const provinceSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(provinceSelect, { target: { value: "1" } });

    const constituencySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(constituencySelect, { target: { value: "1" } });

    const subdistrictSelect = screen.getAllByRole("combobox")[2];
    fireEvent.change(subdistrictSelect, { target: { value: "1" } });

    const searchInput = screen.getByPlaceholderText("Search by station number or location...");
    fireEvent.change(searchInput, { target: { value: "2" } });

    // Thai text "หน่วย" and number "1/2" are in separate text nodes, use regex
    expect(screen.getByText(/หน่วย 2/)).toBeInTheDocument();
    expect(screen.queryByText(/หน่วย 1/)).not.toBeInTheDocument();
  });

  it("should support station search by location", () => {
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={() => {}}
      />
    );

    const provinceSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(provinceSelect, { target: { value: "1" } });

    const constituencySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(constituencySelect, { target: { value: "1" } });

    const subdistrictSelect = screen.getAllByRole("combobox")[2];
    fireEvent.change(subdistrictSelect, { target: { value: "1" } });

    const searchInput = screen.getByPlaceholderText("Search by station number or location...");
    fireEvent.change(searchInput, { target: { value: "School A" } });

    // Thai text "หน่วย" and number "1" are in separate text nodes, use regex
    expect(screen.getByText(/หน่วย 1/)).toBeInTheDocument();
  });

  it("should pass onSearchStation callback when search changes", () => {
    const handleSearch = vi.fn();
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={() => {}}
        onSearchStation={handleSearch}
      />
    );

    const provinceSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(provinceSelect, { target: { value: "1" } });

    const constituencySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(constituencySelect, { target: { value: "1" } });

    const searchInput = screen.getByPlaceholderText("Search by station number or location...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    expect(handleSearch).toHaveBeenCalledWith("test");
  });

  it("should render disabled state when constituency not selected", () => {
    render(
      <StationSelector
        cfg={mockConfig}
        value={null}
        onChange={() => {}}
      />
    );

    // Before province is selected, all downstream selects should be disabled
    // The second combobox (constituency) is disabled before province is selected
    const constituencySelect = screen.getAllByRole("combobox")[1];
    expect(constituencySelect).toBeDisabled();
  });
});