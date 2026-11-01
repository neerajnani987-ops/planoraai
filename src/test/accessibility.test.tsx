import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/Badge";

describe("Accessibility (a11y) Verification Suite", () => {
  it("renders Button with proper type, loading state, and accessible busy flags", () => {
    const { rerender } = render(<Button>Save Plan</Button>);
    const button = screen.getByRole("button", { name: "Save Plan" }) as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute("type")).toBe("button");

    rerender(<Button isLoading>Save Plan</Button>);
    const busyButton = screen.getByRole("button") as HTMLButtonElement;
    expect(busyButton.getAttribute("aria-busy")).toBe("true");
    expect(busyButton.disabled).toBe(true);
  });

  it("renders Input with connected label and accessible error role", () => {
    render(
      <Input
        label="Event Name"
        required
        error="Event name must be at least 2 characters"
      />
    );

    const input = screen.getByRole("textbox", { name: /event name/i });
    expect(input).not.toBeNull();
    expect(input.getAttribute("aria-invalid")).toBe("true");

    const errorAlert = screen.getByRole("alert");
    expect(errorAlert.textContent).toContain("Event name must be at least 2 characters");
  });

  it("renders Textarea with connected label, aria-invalid, and accessible error message", () => {
    render(
      <Textarea
        label="Special Requirements"
        required
        error="Please provide at least 10 characters of detail"
      />
    );

    const textarea = screen.getByRole("textbox", { name: /special requirements/i });
    expect(textarea).not.toBeNull();
    expect(textarea.getAttribute("aria-invalid")).toBe("true");

    const errorAlert = screen.getByRole("alert");
    expect(errorAlert.textContent).toContain("Please provide at least 10 characters of detail");
  });

  it("renders Alert with role='alert' and aria-live='polite'", () => {
    render(<Alert variant="success" title="Success">AI Plan Revision applied successfully!</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).not.toBeNull();
    expect(alert.getAttribute("aria-live")).toBe("polite");
    expect(alert.textContent).toContain("AI Plan Revision applied successfully!");
  });

  it("renders ProgressBar with valid WAI-ARIA role and value attributes", () => {
    render(<ProgressBar value={75} max={100} showLabel />);
    const progress = screen.getByRole("progressbar");
    expect(progress).not.toBeNull();
    expect(progress.getAttribute("aria-valuenow")).toBe("75");
    expect(progress.getAttribute("aria-valuemin")).toBe("0");
    expect(progress.getAttribute("aria-valuemax")).toBe("100");
  });

  it("renders Modal dialog with aria-modal, aria-labelledby, and accessible close button", () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Edit Line Item"
        description="Deterministic calculation will recalculate totals."
      >
        <p>Modal body content</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("modal-dialog-title");

    const closeButton = screen.getByRole("button", { name: /close dialog/i });
    expect(closeButton).not.toBeNull();
    expect(closeButton.getAttribute("type")).toBe("button");
  });

  it("renders LoadingState with role='status' and polite live region", () => {
    render(<LoadingState title="Generating Plan" />);
    const status = screen.getByRole("status");
    expect(status).not.toBeNull();
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain("Generating Plan");
  });

  it("handles Modal Escape key press to trigger onClose callback", () => {
    let closed = false;
    render(
      <Modal isOpen={true} onClose={() => { closed = true; }} title="Confirm Action">
        <p>Details</p>
      </Modal>
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(closed).toBe(true);
  });

  it("renders Badges with high-contrast styles across semantic variants", () => {
    const { rerender } = render(<Badge variant="amber">Pending</Badge>);
    let badge = screen.getByText("Pending");
    expect(badge.className).toContain("text-amber-800");

    rerender(<Badge variant="teal">Confirmed</Badge>);
    badge = screen.getByText("Confirmed");
    expect(badge.className).toContain("text-teal-800");
  });
});
